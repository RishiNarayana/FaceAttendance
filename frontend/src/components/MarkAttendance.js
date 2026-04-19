import React, { useRef, useState, useEffect } from "react";
import api from "../api";
import * as faceapi from "face-api.js";
import { useToast } from "./Toast";
import AttendanceSuccessModal from "./AttendanceSuccessModal";

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
const MarkAttendance = ({ subjectId, subjectName, windowId, onComplete, onCancel }) => {
  const toast = useToast();
  const videoRef = useRef(null);
  const loopRef  = useRef(null);   // setInterval handle for blink loop
  const closedFramesRef = useRef(0);
  const blinkDetectedRef = useRef(false);
  const submittingRef = useRef(false);
  const processingRef = useRef(false);

  const [phase, setPhase] = useState("loading"); // loading | ready | blinking | capturing | done | lowConfidence
  const [loadingMsg, setLoadingMsg] = useState("Loading AI models…");
  const [blinkMsg, setBlinkMsg] = useState("👁  Please blink once to verify you're live");
  const [earValue, setEarValue] = useState(null);
  const [successData, setSuccessData] = useState(null); // { confidence } after marking
  const [lowConfidenceData, setLowConfidenceData] = useState(null); // { msg, confidencePct } on soft fail

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
      if (blinkDetectedRef.current || processingRef.current) return;
      processingRef.current = true;

      try {
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
      } finally {
        processingRef.current = false;
      }
    }, 150);
  };

  // ── 3. Capture embedding and POST ─────────────────────────────────────────
  const captureAndSubmit = async () => {
    if (submittingRef.current) return;
    submittingRef.current = true;
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
      setSuccessData({ confidence: res.data?.confidence ?? null });
      setPhase("done");
      toast.success(res.data?.msg || "Attendance submitted for teacher approval!");
    } catch (err) {
      console.error(err);
      const errData = err.response?.data;

      if (errData?.lowConfidence) {
        // Soft fail — face detected but confidence < 40%. Let student retry.
        setLowConfidenceData({
          msg: errData.msg,
          confidencePct: errData.confidencePct ?? 0,
        });
        setPhase("lowConfidence");
      } else {
        // Hard fail — face didn't match at all, or server error
        toast.error("Verification failed: " + (errData?.msg || err.message));
        setPhase("ready");
      }
    } finally {
      submittingRef.current = false;
    }
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  // ── Low-confidence retry screen ───────────────────────────────────────────
  if (phase === "lowConfidence" && lowConfidenceData) {
    const pct = lowConfidenceData.confidencePct;
    return (
      <div
        style={{
          marginTop: "15px",
          padding: "24px",
          backgroundColor: "rgba(245,158,11,0.07)",
          border: "2px solid rgba(245,158,11,0.35)",
          borderRadius: "14px",
          textAlign: "center",
        }}
      >
        {/* Icon */}
        <div style={{ fontSize: "44px", marginBottom: "10px" }}>⚠️</div>

        <p style={{ margin: "0 0 6px", fontWeight: "700", fontSize: "17px", color: "#92400E" }}>
          Confidence Too Low
        </p>

        {/* Confidence bar */}
        <div style={{ margin: "14px auto", maxWidth: "260px" }}>
          <div style={{
            display: "flex", justifyContent: "space-between",
            fontSize: "12px", color: "#78350F", fontWeight: "700", marginBottom: "6px",
          }}>
            <span>Your score: {pct}%</span>
            <span>Required: ≥40%</span>
          </div>
          <div style={{
            height: "10px", borderRadius: "6px",
            background: "rgba(0,0,0,0.08)", overflow: "hidden",
          }}>
            <div style={{
              height: "100%", width: `${Math.min(pct, 100)}%`,
              background: pct < 20 ? "#EF4444" : "#F59E0B",
              borderRadius: "6px",
              transition: "width 0.6s ease",
            }} />
          </div>
          {/* 40% marker */}
          <div style={{ position: "relative", height: "14px" }}>
            <div style={{
              position: "absolute", left: "40%",
              top: "0", bottom: "0",
              borderLeft: "2px dashed #10B981",
              transform: "translateX(-50%)",
            }} />
            <span style={{
              position: "absolute", left: "40%",
              transform: "translateX(-50%)",
              fontSize: "9px", color: "#10B981", fontWeight: "800",
              whiteSpace: "nowrap", top: "2px",
            }}>40% min</span>
          </div>
        </div>

        <p style={{ margin: "0 0 18px", fontSize: "13px", color: "#78350F", lineHeight: 1.6 }}>
          {lowConfidenceData.msg}
        </p>

        <div style={{ display: "flex", gap: "10px", justifyContent: "center", flexWrap: "wrap" }}>
          <button
            onClick={() => {
              setLowConfidenceData(null);
              setPhase("ready");
              startCamera();
            }}
            style={{
              padding: "12px 28px",
              background: "#F59E0B", color: "white",
              border: "none", borderRadius: "10px",
              fontWeight: "700", fontSize: "14px", cursor: "pointer",
            }}
          >
            🔁 Try Again
          </button>
          <button
            onClick={() => {
              stopLoop(); stopCamera();
              if (onCancel) onCancel();
            }}
            style={{
              padding: "12px 24px",
              background: "white", color: "#EF4444",
              border: "1px solid #EF4444", borderRadius: "10px",
              fontWeight: "700", fontSize: "14px", cursor: "pointer",
            }}
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  if (phase === "done") {
    return (
      <>
        {/* Inline confirmation card (visible behind modal) */}
        <div
          style={{
            marginTop: "15px",
            padding: "20px",
            backgroundColor: "rgba(16,185,129,0.08)",
            border: "1px solid rgba(16,185,129,0.3)",
            borderRadius: "10px",
            textAlign: "center",
          }}
        >
          <div style={{ fontSize: "36px", marginBottom: "8px" }}>⏳</div>
          <p style={{ margin: 0, fontWeight: "600", color: "var(--secondary)" }}>
            Submitted for Teacher Approval
          </p>
          <p style={{ margin: "6px 0 0", fontSize: "13px", color: "var(--text-muted)" }}>
            Your face and liveness were verified. Wait for your teacher to confirm attendance.
          </p>
        </div>

        {/* Rich success modal with recent activity */}
        {successData && (
          <AttendanceSuccessModal
            subjectName={subjectName}
            confidence={successData.confidence}
            onClose={() => {
              setSuccessData(null);
              if (onComplete) onComplete();
            }}
          />
        )}
      </>
    );
  }

  return (
    <>
      <div
        style={{
          marginTop: "15px",
          padding: "16px",
          backgroundColor: "var(--background)",
          borderRadius: "12px",
          border: "1px solid rgba(0,0,0,0.05)",
        }}
      >
        <h4 style={{ marginTop: 0, marginBottom: "4px", color: "var(--primary)", fontSize: "16px" }}>
          Face + Liveness Verification
        </h4>

        {/* Status message */}
        <p style={{ fontSize: "13px", color: "var(--text-muted)", marginBottom: "15px" }}>
          <i>{phase === "loading" ? loadingMsg : blinkMsg}</i>
        </p>

        {/* EAR debug badge (subtle) */}
        {earValue && phase === "blinking" && (
          <div
            style={{
              display: "inline-block",
              padding: "4px 10px",
              marginBottom: "10px",
              background: parseFloat(earValue) < EAR_THRESHOLD ? "rgba(239,68,68,0.1)" : "rgba(16,185,129,0.1)",
              color: parseFloat(earValue) < EAR_THRESHOLD ? "var(--error)" : "var(--success)",
              borderRadius: "12px",
              fontSize: "11px",
              fontWeight: "700",
            }}
          >
            EAR: {earValue} {parseFloat(earValue) < EAR_THRESHOLD ? "👁 closed" : "👁 open"}
          </div>
        )}

        {/* Video */}
        <div style={{ position: "relative" }}>
          <video
            ref={videoRef}
            autoPlay
            muted
            playsInline
            width="100%"
            style={{
              aspectRatio: "1/1",
              maxHeight: "450px",
              backgroundColor: "#000",
              borderRadius: "12px",
              objectFit: "cover",
              marginBottom: "15px",
              display: "block",
              border: phase === "capturing" ? "4px solid var(--success)" : "4px solid transparent",
              transition: "border-color 0.3s",
            }}
          />
          {phase === "blinking" && (
            <div
              style={{
                position: "absolute",
                top: "10px",
                right: "10px",
                background: "rgba(0,0,0,0.6)",
                color: "white",
                padding: "4px 10px",
                borderRadius: "8px",
                fontSize: "11px",
                fontWeight: "700",
                letterSpacing: "0.5px",
              }}
            >
              LIVENESS CHECK
            </div>
          )}
          {phase === "capturing" && (
            <div
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: "rgba(16,185,129,0.15)",
                borderRadius: "12px",
              }}
            >
              <span style={{ fontSize: "40px" }}>✅</span>
            </div>
          )}
        </div>

        {/* Buttons */}
        <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", flexDirection: "column" }}>
          <div style={{ display: "flex", gap: "10px", width: "100%" }}>
            <button
              onClick={startCamera}
              disabled={phase === "loading" || phase === "blinking" || phase === "capturing"}
              style={{
                padding: "12px 12px",
                backgroundColor: "white",
                color: "var(--secondary)",
                border: "1px solid rgba(0,0,0,0.1)",
                borderRadius: "8px",
                cursor: "pointer",
                fontWeight: "600",
                flex: 1,
                fontSize: "13px",
              }}
            >
              1. Start Camera
            </button>

            <button
              onClick={startBlinkDetection}
              disabled={phase !== "ready"}
              style={{
                padding: "12px 12px",
                backgroundColor: phase === "ready" ? "var(--primary)" : "#9CA3AF",
                color: "white",
                border: "none",
                borderRadius: "8px",
                cursor: phase === "ready" ? "pointer" : "not-allowed",
                fontWeight: "600",
                flex: 1,
                fontSize: "13px",
              }}
            >
              {phase === "blinking" ? "👁 Blink now…" : phase === "capturing" ? "📸 Capturing…" : "2. Verify & Submit"}
            </button>
          </div>

          <button
            onClick={() => {
              stopLoop();
              stopCamera();
              if (onCancel) onCancel();
            }}
            style={{
              padding: "12px 12px",
              backgroundColor: "white",
              color: "var(--error)",
              border: "1px solid var(--error)",
              borderRadius: "8px",
              cursor: "pointer",
              fontWeight: "600",
              width: "100%",
              fontSize: "13px",
            }}
          >
            Cancel
          </button>
        </div>

        {/* Instruction tip */}
        <p
          style={{
            fontSize: "12px",
            color: "var(--text-muted)",
            marginTop: "15px",
            marginBottom: 0,
            padding: "10px",
            backgroundColor: "white",
            borderRadius: "8px",
            border: "1px solid rgba(0,0,0,0.05)",
          }}
        >
          💡 <strong>Tip:</strong> After starting the camera, click <strong>Verify &amp; Submit</strong> then blink
          naturally. The system will detect your blink and capture your face automatically.
        </p>
      </div>
    </>
  );
};

export default MarkAttendance;
