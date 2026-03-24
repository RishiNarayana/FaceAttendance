import React, { useRef, useState, useContext, useEffect } from "react";
import { AuthContext } from "../context/AuthContext";
import axios from "axios";
import * as faceapi from "face-api.js";

const MarkAttendance = ({ subjectId, windowId, onComplete, onCancel }) => {
  const { user } = useContext(AuthContext);
  const videoRef = useRef(null);
  const [loadingMsg, setLoadingMsg] = useState("Loading AI models...");
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);

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
          setLoadingMsg("AI Models Loaded. Ready to verify.");
        }
      } catch (err) {
        console.error("Model error:", err);
        if (active) setLoadingMsg("Failed to load models. Check public/models folder.");
      }
    };
    loadModels();
    return () => { active = false; };
  }, []);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      alert("Please allow camera permissions");
    }
  };

  const markAttendance = async () => {
    if (!modelsLoaded) return alert("Models not loaded yet.");
    setIsVerifying(true);

    try {
      const detection = await faceapi.detectSingleFace(videoRef.current)
        .withFaceLandmarks()
        .withFaceDescriptor();

      if (!detection) {
        alert("No face detected! Please ensure your face is clearly visible.");
        setIsVerifying(false);
        return;
      }

      // Convert Float32Array to regular array for JSON transfer
      const embedding = Array.from(detection.descriptor);

      // Hit Member 3's backend endpoint for attendance matching
      const res = await axios.post("http://localhost:5000/api/face/mark-attendance", {
        subjectId,
        windowId,
        embedding
      }, {
        headers: { Authorization: `Bearer ${user.token}` }
      });

      alert(res.data?.msg || "Attendance marked successfully!");
      
      // stop camera
      if (videoRef.current && videoRef.current.srcObject) {
         videoRef.current.srcObject.getTracks().forEach(track => track.stop());
      }
      if (onComplete) onComplete();
    } catch (err) {
      console.error(err);
      alert("Verification failed: " + (err.response?.data?.msg || err.message));
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <div style={{ marginTop: "15px", padding: "15px", backgroundColor: "#F3F4F6", borderRadius: "8px" }}>
      <h4 style={{ marginTop: 0, marginBottom: "8px", color: "var(--text-main)" }}>Face Verification Setup</h4>
      <p style={{ fontSize: "13px", color: "var(--text-muted)", marginBottom: "10px" }}><i>{loadingMsg}</i></p>
      
      <video 
        ref={videoRef} 
        autoPlay 
        muted 
        playsInline 
        width="100%" 
        height="200" 
        style={{ backgroundColor: "#000", borderRadius: "8px", objectFit: "cover", marginBottom: "15px", display: "block" }} 
      />
      
      <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
        <button 
          onClick={startCamera} 
          style={{ padding: "8px 12px", backgroundColor: "white", color: "#374151", border: "1px solid #D1D5DB", borderRadius: "5px", cursor: "pointer", fontWeight: "500", flex: 1 }} 
          disabled={!modelsLoaded}
        >
          1. Start Camera
        </button>

        <button 
          onClick={markAttendance} 
          style={{ padding: "8px 12px", backgroundColor: "var(--primary, #3b82f6)", color: "white", border: "none", borderRadius: "5px", cursor: "pointer", fontWeight: "500", flex: 1 }} 
          disabled={!modelsLoaded || isVerifying}
        >
          {isVerifying ? "Verifying..." : "2. Capture & Mark Present"}
        </button>

        <button 
          onClick={() => {
            if (videoRef.current && videoRef.current.srcObject) {
               videoRef.current.srcObject.getTracks().forEach(track => track.stop());
            }
            if (onCancel) onCancel();
          }} 
          style={{ padding: "8px 12px", backgroundColor: "#EF4444", color: "white", border: "none", borderRadius: "5px", cursor: "pointer", fontWeight: "500" }}
        >
          Cancel
        </button>
      </div>
    </div>
  );
};

export default MarkAttendance;
