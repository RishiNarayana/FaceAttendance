import React, { useRef, useState, useContext, useEffect } from "react";
import { AuthContext } from "../context/AuthContext";
import api from "../api";
import * as faceapi from "face-api.js";
import { useToast } from "./Toast";

const FaceRegistration = ({ onComplete }) => {
  const { user } = useContext(AuthContext);
  const toast = useToast();
  const videoRef = useRef(null);

  const [loadingMsg, setLoadingMsg] = useState("Loading AI models...");
  const [modelsLoaded, setModelsLoaded] = useState(false);

  // Liveness / capture state
  const [isCapturing, setIsCapturing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [instruction, setInstruction] = useState("Look straight into the camera.");

  const embeddingsRef = useRef([]);
  const captureIntervalRef = useRef(null);

  useEffect(() => {
    let active = true;
    const loadModels = async () => {
      try {
        const MODEL_URL = process.env.PUBLIC_URL + "/models";
        await Promise.all([
          faceapi.nets.ssdMobilenetv1.loadFromUri(MODEL_URL),
          faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
          faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
        ]);
        if (active) {
          setModelsLoaded(true);
          setLoadingMsg("AI Models Loaded. Ready to start camera.");
        }
      } catch (err) {
        console.error("Model load error:", err);
        if (active) setLoadingMsg("Failed to load AI models. Make sure they are in public/models.");
      }
    };
    loadModels();
    return () => {
      active = false;
      if (captureIntervalRef.current) clearInterval(captureIntervalRef.current);
    };
  }, []);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      if (videoRef.current) videoRef.current.srcObject = stream;
    } catch {
      toast.error("Camera access denied. Please allow camera permissions.");
    }
  };

  const startRegistrationFlow = async () => {
    if (!modelsLoaded) return toast.warn("AI models not loaded yet. Please wait.");
    if (!videoRef.current?.srcObject) return toast.warn("Please start the camera first.");

    setIsCapturing(true);
    embeddingsRef.current = [];
    setProgress(0);
    setInstruction("Scanning... Please move your head slightly in circles.");

    captureIntervalRef.current = setInterval(async () => {
      if (embeddingsRef.current.length >= 5) {
        clearInterval(captureIntervalRef.current);
        finishRegistration();
        return;
      }

      const detection = await faceapi
        .detectSingleFace(videoRef.current)
        .withFaceLandmarks()
        .withFaceDescriptor();

      if (detection) {
        embeddingsRef.current.push(Array.from(detection.descriptor));
        const currentProg = (embeddingsRef.current.length / 5) * 100;
        setProgress(currentProg);
        if (embeddingsRef.current.length === 2) setInstruction("Good! Look slightly left...");
        if (embeddingsRef.current.length === 3) setInstruction("Great! Now slightly right...");
        if (embeddingsRef.current.length === 4) setInstruction("Almost done! Look straight again.");
      } else {
        setInstruction("Face lost! Please look clearly at the camera.");
      }
    }, 500);
  };

  const finishRegistration = async () => {
    setInstruction("Finalizing face data and securing...");

    // Average all 5 embeddings into one robust master vector
    const masterEmbedding = new Array(128).fill(0);
    embeddingsRef.current.forEach((emb) => {
      for (let i = 0; i < 128; i++) masterEmbedding[i] += emb[i];
    });
    for (let i = 0; i < 128; i++) masterEmbedding[i] /= 5;

    try {
      await api.post("/face/register", { embedding: masterEmbedding });
      setInstruction("✅ Face ID setup complete!");
      if (videoRef.current?.srcObject) {
        videoRef.current.srcObject.getTracks().forEach((t) => t.stop());
      }
      setTimeout(() => { if (onComplete) onComplete(); }, 1500);
    } catch (err) {
      console.error(err);
      setInstruction("❌ Failed to save secure parameters.");
      toast.error("Failed to register face: " + (err.response?.data?.msg || err.message));
      setIsCapturing(false);
      setProgress(0);
    }
  };

  return (
    <div style={{
      padding: "20px", border: "1px solid #E5E7EB", borderRadius: "10px",
      marginTop: "15px", backgroundColor: "white",
      boxShadow: "0 4px 6px -1px rgba(0,0,0,0.05)",
    }}>
      <h4 style={{ marginTop: 0, marginBottom: "5px", color: "var(--primary)" }}>Secure Face ID Setup</h4>
      <p style={{ fontSize: "14px", color: "var(--text-muted)", marginBottom: "15px" }}>
        {modelsLoaded ? "For best results, ensure you are in a well-lit area." : <i>{loadingMsg}</i>}
      </p>

      <div style={{ position: "relative", width: "100%", maxWidth: "320px", margin: "0 auto 20px auto" }}>
        <video
          ref={videoRef} autoPlay muted playsInline width="320" height="240"
          style={{ backgroundColor: "#000", borderRadius: "8px", objectFit: "cover", display: "block", width: "100%" }}
        />
        {isCapturing && (
          <div style={{
            position: "absolute", top: 0, left: 0, width: "100%", height: "100%",
            borderRadius: "8px",
            border: `4px solid ${progress === 100 ? "#10B981" : "var(--secondary)"}`,
            boxSizing: "border-box", transition: "border-color 0.3s ease",
            pointerEvents: "none",
          }}>
            <div style={{
              position: "absolute", bottom: "10px", left: "10%", width: "80%",
              backgroundColor: "rgba(0,0,0,0.6)", padding: "5px", borderRadius: "10px",
            }}>
              <div style={{ width: `${progress}%`, height: "6px", backgroundColor: "#10B981", borderRadius: "5px", transition: "width 0.4s ease" }} />
            </div>
            <div style={{
              position: "absolute", top: "10px", width: "100%", textAlign: "center",
              color: "white", textShadow: "1px 1px 4px black", fontWeight: "bold", fontSize: "14px",
            }}>
              {instruction}
            </div>
          </div>
        )}
      </div>

      {!isCapturing && (
        <div style={{ display: "flex", gap: "10px", justifyContent: "center" }}>
          <button
            onClick={startCamera}
            style={{
              padding: "10px 15px", cursor: "pointer", backgroundColor: "white",
              color: "#374151", border: "1px solid #D1D5DB", borderRadius: "5px",
              fontWeight: "600", flex: 1,
            }}
            disabled={!modelsLoaded}
          >
            1. Start Camera
          </button>
          <button
            onClick={startRegistrationFlow}
            style={{
              padding: "10px 15px", cursor: "pointer",
              backgroundColor: "var(--secondary, #8B5CF6)", color: "white",
              border: "none", borderRadius: "5px", fontWeight: "600", flex: 1,
            }}
            disabled={!modelsLoaded}
          >
            2. Begin Scan
          </button>
        </div>
      )}
    </div>
  );
};

export default FaceRegistration;