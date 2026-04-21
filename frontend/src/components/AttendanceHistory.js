import React, { useState, useEffect, useContext } from "react";
import { AuthContext } from "../context/AuthContext";
import Sidebar from "./Sidebar";
import { useToast } from "./Toast";
import api from "../api";

const AttendanceHistory = () => {
  const { user } = useContext(AuthContext);
  const toast = useToast();
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const res = await api.get("/student/attendance-history");
        setHistory(res.data);
      } catch (err) {
        toast.error(err.response?.data?.message || "Failed to load attendance history");
      } finally {
        setLoading(false);
      }
    };
    fetchHistory();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user.token]);

  const getStatusBadge = (status) => {
    switch (status) {
      case "present":
        return <span style={{ padding: "4px 10px", borderRadius: "12px", fontSize: "12px", fontWeight: "700", background: "rgba(16,185,129,0.15)", color: "#10B981" }}>✅ Present</span>;
      case "absent":
        return <span style={{ padding: "4px 10px", borderRadius: "12px", fontSize: "12px", fontWeight: "700", background: "rgba(239,68,68,0.15)", color: "#EF4444" }}>❌ Absent</span>;
      case "pending":
      default:
        return <span style={{ padding: "4px 10px", borderRadius: "12px", fontSize: "12px", fontWeight: "700", background: "rgba(245,158,11,0.15)", color: "#F59E0B" }}>⏳ Pending</span>;
    }
  };

  return (
    <div className="dashboard-layout with-bottom-nav">
      <Sidebar />

      <main className="main-content">
        <header style={{ marginBottom: "30px", borderBottom: "1px solid rgba(0,0,0,0.05)", paddingBottom: "20px" }}>
          <h1 style={{ margin: 0, color: "var(--primary)", fontSize: "28px", fontWeight: "700", letterSpacing: "-0.5px" }}>Attendance History</h1>
          <p style={{ color: "var(--secondary)", margin: "5px 0 0 0", fontSize: "14px" }}>
            View your recent attendance marks and their approval status.
          </p>
        </header>

        {loading ? (
          <div style={{ textAlign: "center", padding: "60px 0" }}>
            <div style={{
              width: "40px", height: "40px", border: "4px solid #E5E7EB",
              borderTop: "4px solid var(--primary)", borderRadius: "50%",
              animation: "spin 0.8s linear infinite", margin: "0 auto 16px",
            }} />
            <p style={{ color: "var(--text-muted)" }}>Loading history...</p>
          </div>
        ) : history.length === 0 ? (
          <div className="stat-card" style={{ textAlign: "center", padding: "60px 20px" }}>
            <div style={{ fontSize: "48px", marginBottom: "16px" }}>📝</div>
            <h3 style={{ margin: "0 0 8px 0", color: "var(--primary)", fontSize: "20px" }}>No History Found</h3>
            <p style={{ color: "var(--text-muted)", margin: 0 }}>
              You haven't marked attendance in any active windows yet.
            </p>
          </div>
        ) : (
          <div className="stat-card" style={{ padding: "0", overflow: "hidden" }}>
             <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", minWidth: "600px" }}>
                <thead>
                  <tr style={{ background: "rgba(0,0,0,0.03)", borderBottom: "2px solid rgba(0,0,0,0.05)" }}>
                    <th style={{ padding: "16px", textAlign: "left", fontSize: "13px", fontWeight: "700", color: "var(--secondary)", textTransform: "uppercase" }}>Date marked</th>
                    <th style={{ padding: "16px", textAlign: "left", fontSize: "13px", fontWeight: "700", color: "var(--secondary)", textTransform: "uppercase" }}>Subject</th>
                    <th style={{ padding: "16px", textAlign: "left", fontSize: "13px", fontWeight: "700", color: "var(--secondary)", textTransform: "uppercase" }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {history.map((record, idx) => (
                    <tr key={record._id} style={{ 
                      borderBottom: idx === history.length - 1 ? "none" : "1px solid rgba(0,0,0,0.05)",
                      transition: "background 0.2s",
                    }} onMouseEnter={e => e.currentTarget.style.background = "rgba(0,0,0,0.01)"} onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                      
                      <td style={{ padding: "16px", verticalAlign: "middle" }}>
                        <p style={{ margin: 0, fontWeight: "600", color: "var(--primary)", fontSize: "14px" }}>
                          {new Date(record.markedAt).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
                        </p>
                        <p style={{ margin: "2px 0 0 0", color: "var(--text-muted)", fontSize: "12px" }}>
                          {new Date(record.markedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </td>

                      <td style={{ padding: "16px", verticalAlign: "middle" }}>
                        <span style={{ fontWeight: "600", color: "var(--primary)", fontSize: "14px" }}>{record.subjectName}</span>
                      </td>

                      <td style={{ padding: "16px", verticalAlign: "middle" }}>
                        {getStatusBadge(record.status)}
                        {record.status !== "pending" && record.teacherReviewedAt && (
                          <div style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "4px" }}>
                            Reviewed on {new Date(record.teacherReviewedAt).toLocaleDateString()}
                          </div>
                        )}
                      </td>

                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>
      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default AttendanceHistory;
