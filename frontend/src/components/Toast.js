import React, { createContext, useContext, useState, useCallback } from "react";

// ── Context ──────────────────────────────────────────────────────────────────
const ToastContext = createContext(null);

export const useToast = () => useContext(ToastContext);

// ── Provider (wrap App with this) ────────────────────────────────────────────
export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((message, type = "info", duration = 3500) => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, duration);
  }, []);

  const removeToast = (id) => setToasts((prev) => prev.filter((t) => t.id !== id));

  const toast = {
    success: (msg) => addToast(msg, "success"),
    error:   (msg) => addToast(msg, "error"),
    info:    (msg) => addToast(msg, "info"),
    warn:    (msg) => addToast(msg, "warn"),
  };

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </ToastContext.Provider>
  );
};

// ── Individual Toast ──────────────────────────────────────────────────────────
const ICONS = { success: "✅", error: "❌", warn: "⚠️", info: "ℹ️" };
const COLORS = {
  success: { bg: "#ECFDF5", border: "#10B981", text: "#065F46" },
  error:   { bg: "#FEF2F2", border: "#EF4444", text: "#7F1D1D" },
  warn:    { bg: "#FFFBEB", border: "#F59E0B", text: "#78350F" },
  info:    { bg: "#EFF6FF", border: "#3B82F6", text: "#1E3A8A" },
};

const ToastItem = ({ toast, onRemove }) => {
  const c = COLORS[toast.type] || COLORS.info;
  return (
    <div
      onClick={() => onRemove(toast.id)}
      style={{
        display: "flex",
        alignItems: "flex-start",
        gap: "10px",
        background: c.bg,
        border: `1px solid ${c.border}`,
        borderLeft: `4px solid ${c.border}`,
        color: c.text,
        borderRadius: "10px",
        padding: "12px 16px",
        marginBottom: "10px",
        boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
        cursor: "pointer",
        animation: "toastSlideIn 0.3s ease",
        maxWidth: "360px",
        fontSize: "14px",
        fontWeight: "500",
        lineHeight: "1.4",
        fontFamily: "inherit",
      }}
    >
      <span style={{ fontSize: "16px", flexShrink: 0, marginTop: "1px" }}>
        {ICONS[toast.type]}
      </span>
      <span style={{ flex: 1 }}>{toast.message}</span>
      <span style={{ fontSize: "12px", opacity: 0.6, flexShrink: 0 }}>✕</span>
    </div>
  );
};

// ── Container ─────────────────────────────────────────────────────────────────
const ToastContainer = ({ toasts, onRemove }) => (
  <>
    <style>{`
      @keyframes toastSlideIn {
        from { opacity: 0; transform: translateX(40px); }
        to   { opacity: 1; transform: translateX(0); }
      }
    `}</style>
    <div
      style={{
        position: "fixed",
        top: "20px",
        right: "20px",
        zIndex: 9999,
        pointerEvents: "none",
      }}
    >
      {toasts.map((t) => (
        <div key={t.id} style={{ pointerEvents: "all" }}>
          <ToastItem toast={t} onRemove={onRemove} />
        </div>
      ))}
    </div>
  </>
);

export default ToastProvider;