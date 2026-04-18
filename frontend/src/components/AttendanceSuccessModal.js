import React, { useEffect, useState, useRef } from "react";
import api from "../api";

// ── Helpers ───────────────────────────────────────────────────────────────────
const STATUS_META = {
  present:  { icon: "✅", label: "Approved",  bg: "#ECFDF5", border: "#10B981", text: "#065F46" },
  pending:  { icon: "⏳", label: "Pending",   bg: "#FFFBEB", border: "#F59E0B", text: "#78350F" },
  absent:   { icon: "❌", label: "Rejected",  bg: "#FEF2F2", border: "#EF4444", text: "#7F1D1D" },
};

const fmtTime = (iso) => {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleString("en-IN", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
};

const fmtRelative = (iso) => {
  if (!iso) return "";
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1)  return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)  return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
};

// ── Modal Component ───────────────────────────────────────────────────────────
const AttendanceSuccessModal = ({ subjectName, confidence, onClose }) => {
  const [history,  setHistory]  = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [showTick, setShowTick] = useState(false);
  const overlayRef = useRef(null);

  // Animate the tick slightly after mount
  useEffect(() => {
    const t = setTimeout(() => setShowTick(true), 120);
    return () => clearTimeout(t);
  }, []);

  // Fetch recent attendance history
  useEffect(() => {
    api.get("/student/attendance-history")
      .then((r) => setHistory(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  // Close on overlay click
  const handleOverlay = (e) => {
    if (e.target === overlayRef.current) onClose();
  };

  // Close on Escape key
  useEffect(() => {
    const handler = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  const confidencePct = confidence != null
    ? Math.round((1 - confidence) * 100)
    : null;

  return (
    <>
      <style>{`
        @keyframes modalFadeIn {
          from { opacity: 0; transform: scale(0.93) translateY(16px); }
          to   { opacity: 1; transform: scale(1)    translateY(0);    }
        }
        @keyframes tickDraw {
          from { stroke-dashoffset: 80; opacity: 0; }
          to   { stroke-dashoffset: 0;  opacity: 1; }
        }
        @keyframes ringExpand {
          from { transform: scale(0.6); opacity: 0; }
          to   { transform: scale(1);   opacity: 1; }
        }
        @keyframes feedSlideIn {
          from { opacity: 0; transform: translateY(10px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .asm-overlay {
          position: fixed; inset: 0; z-index: 10000;
          background: rgba(15,23,42,0.65);
          backdrop-filter: blur(4px);
          display: flex; align-items: center; justify-content: center;
          padding: 16px;
        }
        .asm-modal {
          background: #fff;
          border-radius: 24px;
          width: 100%; max-width: 480px;
          max-height: 90vh;
          overflow: hidden;
          display: flex; flex-direction: column;
          box-shadow: 0 32px 80px rgba(0,0,0,0.22);
          animation: modalFadeIn 0.35s cubic-bezier(0.34,1.56,0.64,1) both;
        }
        .asm-header {
          background: linear-gradient(135deg, #0ea5e9 0%, #6366f1 100%);
          padding: 36px 28px 32px;
          text-align: center;
          position: relative;
          flex-shrink: 0;
        }
        .asm-close-btn {
          position: absolute; top: 14px; right: 16px;
          background: rgba(255,255,255,0.2);
          border: none; color: white;
          width: 32px; height: 32px; border-radius: 50%;
          cursor: pointer; font-size: 16px; line-height: 1;
          display: flex; align-items: center; justify-content: center;
          transition: background 0.2s;
        }
        .asm-close-btn:hover { background: rgba(255,255,255,0.35); }
        .asm-tick-ring {
          width: 84px; height: 84px;
          margin: 0 auto 18px;
          animation: ringExpand 0.4s 0.1s cubic-bezier(0.34,1.56,0.64,1) both;
        }
        .asm-tick-ring circle.bg  { fill: rgba(255,255,255,0.18); }
        .asm-tick-ring circle.rim { fill: none; stroke: rgba(255,255,255,0.5); stroke-width: 2; }
        .asm-tick-ring polyline   {
          fill: none; stroke: white; stroke-width: 5;
          stroke-linecap: round; stroke-linejoin: round;
          stroke-dasharray: 80;
          stroke-dashoffset: ${showTick ? 0 : 80};
          opacity: ${showTick ? 1 : 0};
          transition: stroke-dashoffset 0.5s 0.2s ease, opacity 0.3s 0.2s ease;
        }
        .asm-title   { color: #fff; font-size: 22px; font-weight: 800; margin: 0 0 6px; }
        .asm-subtitle { color: rgba(255,255,255,0.82); font-size: 14px; margin: 0; font-weight: 500; }
        .asm-meta-row {
          display: flex; gap: 12px; justify-content: center;
          margin-top: 20px; flex-wrap: wrap;
        }
        .asm-badge {
          background: rgba(255,255,255,0.18);
          color: white; border-radius: 30px;
          padding: 7px 16px; font-size: 13px; font-weight: 700;
          border: 1px solid rgba(255,255,255,0.3);
          display: flex; align-items: center; gap: 6px;
        }
        .asm-body {
          overflow-y: auto; flex: 1;
          padding: 24px 24px 28px;
        }
        .asm-section-label {
          font-size: 11px; font-weight: 800;
          letter-spacing: 1.2px; text-transform: uppercase;
          color: #94a3b8; margin: 0 0 14px;
        }
        .asm-feed-item {
          display: flex; align-items: flex-start; gap: 12px;
          padding: 12px 14px;
          border-radius: 12px;
          margin-bottom: 8px;
          border-left: 4px solid;
          font-size: 13.5px;
          animation: feedSlideIn 0.3s ease both;
        }
        .asm-feed-icon { font-size: 18px; flex-shrink: 0; margin-top: 1px; }
        .asm-feed-name { font-weight: 700; color: #1e293b; margin-bottom: 2px; }
        .asm-feed-time { font-size: 11.5px; color: #94a3b8; }
        .asm-feed-badge {
          margin-left: auto; flex-shrink: 0;
          padding: 3px 10px; border-radius: 20px;
          font-size: 11px; font-weight: 800; letter-spacing: 0.5px;
          align-self: center;
        }
        .asm-done-btn {
          width: 100%; padding: 15px;
          background: linear-gradient(135deg, #0ea5e9, #6366f1);
          color: white; border: none; border-radius: 12px;
          font-size: 16px; font-weight: 700; cursor: pointer;
          margin-top: 20px;
          transition: opacity 0.2s, transform 0.15s;
        }
        .asm-done-btn:hover { opacity: 0.9; transform: translateY(-1px); }
        .asm-done-btn:active { transform: translateY(0); }
        .asm-empty {
          text-align: center; padding: 28px 0;
          color: #94a3b8; font-size: 14px;
        }
      `}</style>

      <div className="asm-overlay" ref={overlayRef} onClick={handleOverlay}>
        <div className="asm-modal" role="dialog" aria-modal="true" aria-labelledby="asm-title">

          {/* ── Header ─────────────────────────────────────────────────────── */}
          <div className="asm-header">
            <button className="asm-close-btn" onClick={onClose} aria-label="Close">✕</button>

            {/* Animated tick */}
            <svg className="asm-tick-ring" viewBox="0 0 84 84">
              <circle className="bg"  cx="42" cy="42" r="40" />
              <circle className="rim" cx="42" cy="42" r="40" />
              <polyline points="22,44 36,58 62,28" />
            </svg>

            <h2 className="asm-title" id="asm-title">Attendance Submitted!</h2>
            <p className="asm-subtitle">
              {subjectName
                ? <>Your presence for <strong>{subjectName}</strong> is pending teacher approval.</>
                : "Your attendance is pending teacher approval."}
            </p>

            <div className="asm-meta-row">
              <div className="asm-badge">📋 Status: Pending Review</div>
              {confidencePct != null && (
                <div className="asm-badge">
                  🎯 Match: {confidencePct}%
                </div>
              )}
              <div className="asm-badge">🔒 Liveness Verified</div>
            </div>
          </div>

          {/* ── Body ───────────────────────────────────────────────────────── */}
          <div className="asm-body">
            <p className="asm-section-label">Recent Attendance Activity</p>

            {loading ? (
              <div className="asm-empty">
                <div style={{ fontSize: 28, marginBottom: 8, animation: "pulse 1.5s infinite" }}>⏳</div>
                Loading activity…
              </div>
            ) : history.length === 0 ? (
              <div className="asm-empty">
                <div style={{ fontSize: 28, marginBottom: 8 }}>📭</div>
                No attendance records yet.
              </div>
            ) : (
              history.map((item, idx) => {
                const meta = STATUS_META[item.status] || STATUS_META.pending;
                return (
                  <div
                    key={item._id}
                    className="asm-feed-item"
                    style={{
                      background: meta.bg,
                      borderLeftColor: meta.border,
                      animationDelay: `${idx * 45}ms`,
                    }}
                  >
                    <span className="asm-feed-icon">{meta.icon}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div className="asm-feed-name">{item.subjectName}</div>
                      <div className="asm-feed-time">
                        Submitted {fmtRelative(item.markedAt)} · {fmtTime(item.markedAt)}
                        {item.status === "present" && item.teacherReviewedAt && (
                          <span> · Approved {fmtRelative(item.teacherReviewedAt)}</span>
                        )}
                        {item.status === "absent" && item.teacherReviewedAt && (
                          <span> · Rejected {fmtRelative(item.teacherReviewedAt)}</span>
                        )}
                      </div>
                    </div>
                    <span
                      className="asm-feed-badge"
                      style={{ background: meta.border, color: "#fff" }}
                    >
                      {meta.label.toUpperCase()}
                    </span>
                  </div>
                );
              })
            )}

            <button className="asm-done-btn" onClick={onClose}>
              Done
            </button>
          </div>

        </div>
      </div>
    </>
  );
};

export default AttendanceSuccessModal;
