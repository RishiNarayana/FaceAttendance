import React, { useRef, useState, useEffect } from "react";
import api from "../api";
import * as faceapi from "face-api.js";
import { useToast } from "./Toast";

// ─── Eye Aspect Ratio (liveness) ─────────────────────────────────────────────
// Six landmark points per eye (indices within the full 68-pt array)
const LEFT_EYE_IDX  = [36, 37, 38, 39, 40, 41];
const RIGHT_EYE_IDX = [42, 43, 44, 45, 46, 47];
const EAR_THRESHOLD = 0.24;   // below → eye is closed
const BLINK_CONSEC  = 2;      // consecutive closed frames to count as blink

const dist = (a, b) => Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);

const eyeAspectRatio = (pts, indices) => {
  const p = indices.map((i) => pts[i]);
  const vertical = dist(p[1], p[5]) + dist(p[2], p[4]);
  const horizontal = dist(p[0], p[3]);
  return vertical / (2.0 * horizontal);
};

// ─── Component ────────────────────────────────────────────────────────────────
const MarkAttendance = ({ subjectId, windowId, onComplete, onCancel }) => {
  const toast = useToast();
  const videoRef = useRef(null);
  const loopRef  = useRef(null);   // setInterval handle for blink loop
  const closedFramesRef = useRef(0);
  const blinkDetectedRef = useRef(false);

  const [phase, setPhase] = useState("loading"); // loading | ready | blinking | capturing | done
  const [loadingMsg, setLoadingMsg] = useState("Loading AI models…");
  const [blinkMsg, setBlinkMsg] = useState("👁  Please blink once to verify you're live");
  const [earValue, setEarValue] = useState(null);

  // ── 1. Load models ────────────────────────────────────────────────────────
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const MODEL_URL = process.env.PUBLIC_URL + "/models";
        await Promise.all([
          faceapi.nets.ssdMobilenetv1.loadFromUri(MODEL_URL),
          faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
          faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
        ]);
        if (active) {
          setPhase("ready");
          setLoadingMsg("AI Models Loaded. Start camera then blink to verify.");
        }
      } catch {
        if (active) setLoadingMsg("Failed to load models. Check public/models folder.");
      }
    })();
    return () => {
      active = false;
      stopLoop();
    };
  }, []);

  // ── Helpers ───────────────────────────────────────────────────────────────
  const stopLoop = () => {
    if (loopRef.current) { clearInterval(loopRef.current); loopRef.current = null; }
  };

  const stopCamera = () => {
    if (videoRef.current?.srcObject) {
      videoRef.current.srcObject.getTracks().forEach((t) => t.stop());
    }
  };

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      if (videoRef.current) videoRef.current.srcObject = stream;
    } catch {
      toast.error("Camera access denied. Please allow camera permissions.");
    }
  };

  // ── 2. Blink detection loop ────────────────────────────────────────────────
  const startBlinkDetection = () => {
    if (phase !== "ready") return;
    if (!videoRef.current?.srcObject) {
      toast.warn("Please start the camera first.");
      return;
    }
    setPhase("blinking");
    blinkDetectedRef.current = false;
    closedFramesRef.current = 0;

    loopRef.current = setInterval(async () => {
      if (blinkDetectedRef.current) return; // already caught a blink, wait for capture

      const detected = await faceapi
        .detectSingleFace(videoRef.current, new faceapi.SsdMobilenetv1Options())
        .withFaceLandmarks();

      if (!detected) {
        setBlinkMsg("⚠️ No face found — look straight at the camera");
        return;
      }

      const pts = detected.landmarks.positions;
      const leftEAR  = eyeAspectRatio(pts, LEFT_EYE_IDX);
      const rightEAR = eyeAspectRatio(pts, RIGHT_EYE_IDX);
      const avgEAR   = (leftEAR + rightEAR) / 2;
      setEarValue(avgEAR.toFixed(3));

      if (avgEAR < EAR_THRESHOLD) {
        closedFramesRef.current += 1;
        setBlinkMsg("👁 Eye closed detected…");
      } else {
        if (closedFramesRef.current >= BLINK_CONSEC) {
          // Blink confirmed!
          blinkDetectedRef.current = true;
          stopLoop();
          setBlinkMsg("✅ Blink detected! Capturing your face now…");
          setPhase("capturing");
          await captureAndSubmit();
        } else {
          closedFramesRef.current = 0;
          setBlinkMsg("👁  Please blink once to verify you're live");
        }
      }
    }, 150);
  };

  // ── 3. Capture embedding and POST ─────────────────────────────────────────
  const captureAndSubmit = async () => {
    try {
      const detection = await faceapi
        .detectSingleFace(videoRef.current)
        .withFaceLandmarks()
        .withFaceDescriptor();

      if (!detection) {
        toast.warn("Face lost during capture — please try again.");
        setPhase("ready");
        return;
      }

      const embedding = Array.from(detection.descriptor);

      const res = await api.post("/face/mark-attendance", {
        subjectId,
        windowId,
        embedding,
        livenessVerified: true,   // blink was actually verified above
      });

      stopCamera();
      setPhase("done");
      toast.success(res.data?.msg || "Attendance submitted for teacher approval!");
      if (onComplete) onComplete();
    } catch (err) {
      console.error(err);
      toast.error("Verification failed: " + (err.response?.data?.msg || err.message));
      setPhase("ready");
    }
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  if (phase === "done") {
    return (
      <div style={{
        marginTop: "15px", padding: "20px",
        backgroundColor: "rgba(16,185,129,0.08)",
        border: "1px solid rgba(16,185,129,0.3)",
        borderRadius: "10px", textAlign: "center",
      }}>
        <div style={{ fontSize: "36px", marginBottom: "8px" }}>⏳</div>
        <p style={{ margin: 0, fontWeight: "600", color: "var(--secondary)" }}>
          Submitted for Teacher Approval
        </p>
        <p style={{ margin: "6px 0 0", fontSize: "13px", color: "var(--text-muted)" }}>
          Your face and liveness were verified. Wait for your teacher to confirm attendance.
        </p>
      </div>
    );
  }

  return (
    <div style={{ marginTop: "15px", padding: "15px", backgroundColor: "#F3F4F6", borderRadius: "8px" }}>
      <h4 style={{ marginTop: 0, marginBottom: "4px", color: "var(--text-main)" }}>
        Face + Liveness Verification
      </h4>

      {/* Status message */}
      <p style={{ fontSize: "13px", color: "var(--text-muted)", marginBottom: "10px" }}>
        <i>{phase === "loading" ? loadingMsg : blinkMsg}</i>
      </p>

      {/* EAR debug badge (subtle) */}
      {earValue && phase === "blinking" && (
        <div style={{
          display: "inline-block", padding: "2px 8px", marginBottom: "8px",
          background: parseFloat(earValue) < EAR_THRESHOLD ? "#FEE2E2" : "#D1FAE5",
          color: parseFloat(earValue) < EAR_THRESHOLD ? "#991B1B" : "#065F46",
          borderRadius: "10px", fontSize: "11px", fontWeight: "600",
        }}>
          EAR: {earValue} {parseFloat(earValue) < EAR_THRESHOLD ? "👁 closed" : "👁 open"}
        </div>
      )}

      {/* Video */}
      <div style={{ position: "relative" }}>
        <video
          ref={videoRef} autoPlay muted playsInline width="100%" height="200"
          style={{
            backgroundColor: "#000", borderRadius: "8px",
            objectFit: "cover", marginBottom: "15px", display: "block",
            // Green border flash when blink detected
            border: phase === "capturing" ? "3px solid #10B981" : "3px solid transparent",
            transition: "border-color 0.3s",
          }}
        />
        {phase === "blinking" && (
          <div style={{
            position: "absolute", top: "8px", right: "8px",
            background: "rgba(0,0,0,0.6)", color: "white",
            padding: "3px 8px", borderRadius: "8px", fontSize: "11px", fontWeight: "600",
          }}>
            LIVENESS CHECK
          </div>
        )}
        {phase === "capturing" && (
          <div style={{
            position: "absolute", top: 0, left: 0, right: 0, bottom: 0,
            display: "flex", alignItems: "center", justifyContent: "center",
            background: "rgba(16,185,129,0.15)", borderRadius: "8px",
          }}>
            <span style={{ fontSize: "32px" }}>✅</span>
          </div>
        )}
      </div>

      {/* Buttons */}
      <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
        {/* Step 1 */}
        <button
          onClick={startCamera}
          disabled={phase === "loading" || phase === "blinking" || phase === "capturing"}
          style={{
            padding: "8px 12px", backgroundColor: "white", color: "#374151",
            border: "1px solid #D1D5DB", borderRadius: "5px",
            cursor: "pointer", fontWeight: "500", flex: 1,
          }}
        >
          1. Start Camera
        </button>

        {/* Step 2 */}
        <button
          onClick={startBlinkDetection}
          disabled={phase !== "ready"}
          style={{
            padding: "8px 12px",
            backgroundColor: phase === "ready" ? "var(--primary, #3b82f6)" : "#9CA3AF",
            color: "white", border: "none", borderRadius: "5px",
            cursor: phase === "ready" ? "pointer" : "not-allowed",
            fontWeight: "500", flex: 1,
          }}
        >
          {phase === "blinking"  ? "👁 Blink now…"   :
           phase === "capturing" ? "📸 Capturing…"   : "2. Verify & Submit"}
        </button>

        {/* Cancel */}
        <button
          onClick={() => { stopLoop(); stopCamera(); if (onCancel) onCancel(); }}
          style={{
            padding: "8px 12px", backgroundColor: "#EF4444", color: "white",
            border: "none", borderRadius: "5px", cursor: "pointer", fontWeight: "500",
          }}
        >
          Cancel
        </button>
      </div>

      {/* Instruction tip */}
      <p style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "10px", marginBottom: 0 }}>
        💡 After starting the camera, click <strong>Verify &amp; Submit</strong> then blink naturally. 
        The system will detect your blink and automatically capture your face.
      </p>
    </div>
  );
};

export default MarkAttendance;
