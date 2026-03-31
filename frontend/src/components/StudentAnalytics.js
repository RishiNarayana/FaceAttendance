import React, { useState, useEffect, useContext } from "react";
import { AuthContext } from "../context/AuthContext";
import Sidebar from "./Sidebar";
import { useToast } from "./Toast";
import api from "../api";

const StudentAnalytics = () => {
  const { user } = useContext(AuthContext);
  const toast = useToast();
  const [stats, setStats] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await api.get("/student/analytics");
        setStats(res.data);
      } catch (err) {
        toast.error(err.response?.data?.message || "Failed to load analytics");
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user.token]);

  const totalClasses  = stats.reduce((s, x) => s + x.totalSessions,   0);
  const totalAttended = stats.reduce((s, x) => s + x.attendedSessions, 0);
  const overallPct    = totalClasses > 0 ? ((totalAttended / totalClasses) * 100).toFixed(1) : 0;
  const overallHealthy = parseFloat(overallPct) >= 75;

  return (
    <div className="dashboard-container">
      <Sidebar />

      <header style={{ paddingLeft: "80px", marginBottom: "30px" }}>
        <h1>My Attendance Analytics</h1>
        <p style={{ color: "var(--text-muted)", margin: 0 }}>
          Track your performance across all subjects.
        </p>
      </header>

      <main style={{ paddingLeft: "80px" }}>
        {loading && (
          <div style={{ textAlign: "center", padding: "60px 0" }}>
            <div style={{
              width: "40px", height: "40px", border: "4px solid #E5E7EB",
              borderTop: "4px solid var(--primary)", borderRadius: "50%",
              animation: "spin 0.8s linear infinite", margin: "0 auto 16px",
            }} />
            <p style={{ color: "var(--text-muted)" }}>Loading your analytics...</p>
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          </div>
        )}

        {!loading && stats.length === 0 && (
          <div style={{
            textAlign: "center", padding: "60px 20px",
            background: "white", borderRadius: "16px",
            boxShadow: "0 4px 20px rgba(0,0,0,0.06)",
          }}>
            <div style={{ fontSize: "48px", marginBottom: "16px" }}>📊</div>
            <h3 style={{ margin: "0 0 8px 0", color: "var(--text-main)" }}>No data yet</h3>
            <p style={{ color: "var(--text-muted)", margin: 0 }}>
              You haven't attended any confirmed sessions yet. Stats appear once your teacher approves attendance.
            </p>
          </div>
        )}

        {!loading && stats.length > 0 && (
          <div style={{
            display: "flex", alignItems: "center", gap: "20px",
            background: overallHealthy
              ? "linear-gradient(135deg, #ECFDF5, #D1FAE5)"
              : "linear-gradient(135deg, #FEF2F2, #FEE2E2)",
            border: `1px solid ${overallHealthy ? "#10B981" : "#EF4444"}`,
            borderRadius: "14px", padding: "20px 28px", marginBottom: "28px",
            boxShadow: "0 4px 12px rgba(0,0,0,0.05)",
          }}>
            <div style={{
              width: "64px", height: "64px", borderRadius: "50%",
              background: overallHealthy ? "#10B981" : "#EF4444",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: "28px", flexShrink: 0,
            }}>
              {overallHealthy ? "🎯" : "⚠️"}
            </div>
            <div style={{ flex: 1 }}>
              <p style={{ margin: "0 0 4px 0", fontWeight: "700", fontSize: "18px", color: overallHealthy ? "#065F46" : "#7F1D1D" }}>
                Overall Attendance: {overallPct}%
              </p>
              <p style={{ margin: 0, fontSize: "13px", color: overallHealthy ? "#047857" : "#B91C1C" }}>
                {totalAttended} of {totalClasses} total classes across {stats.length} subject{stats.length !== 1 ? "s" : ""}.
                {overallHealthy ? " Keep it up!" : " You need ≥ 75% to stay on track."}
              </p>
            </div>
            <CircleProgress pct={parseFloat(overallPct)} healthy={overallHealthy} size={72} />
          </div>
        )}

        {!loading && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: "25px" }}>
            {stats.map((stat, index) => {
              const pct = parseFloat(stat.percentage);
              const healthy = pct >= 75;
              const color = healthy ? "var(--secondary)" : "var(--error)";
              const bgColor = healthy ? "rgba(16,185,129,0.08)" : "rgba(239,68,68,0.08)";
              return (
                <div key={index} className="auth-card"
                  style={{ padding: "25px", position: "relative", overflow: "hidden", borderTop: `4px solid ${color}` }}>
                  <h3 style={{ margin: "0 0 6px 0", color: "var(--primary)", paddingRight: "60px" }}>
                    {stat.subjectName}
                  </h3>
                  <div style={{
                    position: "absolute", top: "18px", right: "18px",
                    background: bgColor, color, borderRadius: "20px",
                    padding: "4px 12px", fontSize: "13px", fontWeight: "700",
                    border: `1px solid ${color}`,
                  }}>
                    {stat.percentage}%
                  </div>
                  <div style={{ display: "flex", gap: "16px", marginBottom: "18px", marginTop: "12px" }}>
                    <StatPill label="Total"    value={stat.totalSessions} />
                    <StatPill label="Attended" value={stat.attendedSessions} color={color} />
                    <StatPill label="Missed"   value={stat.totalSessions - stat.attendedSessions}
                      color={stat.totalSessions - stat.attendedSessions > 0 ? "var(--error)" : undefined} />
                  </div>
                  <div style={{ width: "100%", height: "10px", background: "#E5E7EB", borderRadius: "10px", overflow: "hidden" }}>
                    <div style={{
                      width: `${Math.min(pct, 100)}%`, height: "100%",
                      background: healthy
                        ? "linear-gradient(90deg, #10B981, #059669)"
                        : "linear-gradient(90deg, #EF4444, #DC2626)",
                      borderRadius: "10px", transition: "width 1s ease-in-out",
                    }} />
                  </div>
                  <div style={{ position: "relative", height: "18px" }}>
                    <div style={{ position: "absolute", left: "75%", top: 0, width: "1px", height: "8px", background: "#9CA3AF" }} />
                    <span style={{ position: "absolute", left: "calc(75% - 12px)", top: "8px", fontSize: "10px", color: "#9CA3AF" }}>75%</span>
                  </div>
                  <p style={{ fontSize: "12px", color, margin: "4px 0 0", fontWeight: "500" }}>
                    {healthy ? "✅ Good standing — keep attending!" : "⚠️ Attendance below 75% — attend more classes."}
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
};

const StatPill = ({ label, value, color }) => (
  <div style={{ flex: 1, textAlign: "center", background: "#F9FAFB", borderRadius: "8px", padding: "8px 4px" }}>
    <div style={{ fontSize: "18px", fontWeight: "700", color: color || "var(--text-main)" }}>{value}</div>
    <div style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "2px" }}>{label}</div>
  </div>
);

const CircleProgress = ({ pct, healthy, size }) => {
  const r = (size - 8) / 2;
  const circ = 2 * Math.PI * r;
  const dash = (Math.min(pct, 100) / 100) * circ;
  return (
    <svg width={size} height={size} style={{ transform: "rotate(-90deg)", flexShrink: 0 }}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#E5E7EB" strokeWidth={6} />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none"
        stroke={healthy ? "#10B981" : "#EF4444"} strokeWidth={6}
        strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"
        style={{ transition: "stroke-dasharray 1s ease" }} />
    </svg>
  );
};

export default StudentAnalytics;
