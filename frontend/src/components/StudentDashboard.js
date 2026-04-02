import React, { useState, useEffect, useContext } from "react";
import { AuthContext } from "../context/AuthContext";
import api from "../api";
import FaceRegistration from "./FaceRegistration";
import MarkAttendance from "./MarkAttendance";

// Icons
const Icons = {
  Scan: () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 1v4m0 0h-4m4 0l-5-5"/>
      <circle cx="12" cy="12" r="3"/>
    </svg>
  ),
  Check: () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12"/>
    </svg>
  )
};

const StudentDashboard = () => {
  const { user } = useContext(AuthContext);
  const [subjects, setSubjects] = useState([]);
  const [stats, setStats] = useState([]);
  const [loading, setLoading] = useState(true);

  const [activeRegSubject, setActiveRegSubject] = useState(null);
  const [activeVerSubject, setActiveVerSubject] = useState(null);

  const fetchData = async () => {
    try {
      const [subsRes, statsRes] = await Promise.all([
        api.get("/student/my-subjects"),
        api.get("/student/analytics")
      ]);
      setSubjects(subsRes.data.map((s) => ({ ...s, faceRegistered: s.faceRegistered || false })));
      setStats(statsRes.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000); // refresh every 30s
    return () => clearInterval(interval);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user.token]);

  // Compute stats
  const totalClasses = stats.reduce((s, x) => s + x.totalSessions, 0);
  const totalAttended = stats.reduce((s, x) => s + x.attendedSessions, 0);
  const overallPct = totalClasses > 0 ? Math.round((totalAttended / totalClasses) * 100) : 0;
  
  // Progress Ring logic
  const ringOffset = 125 - (125 * overallPct) / 100;
  const isAtRisk = overallPct < 75 && totalClasses > 0;

  return (
    <div style={{ paddingBottom: "40px" }}>
      {/* Overview Stats (Dynamic) */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "15px", marginBottom: "40px" }}>
        <div className="stat-card" style={{ padding: "20px", display: "flex", flexDirection: "column", justifyContent: "center" }}>
          <p style={{ margin: "0 0 8px 0", fontSize: "12px", fontWeight: "700", color: "var(--secondary)", letterSpacing: "1px", textTransform: "uppercase" }}>TOTAL PRESENT</p>
          <div style={{ display: "flex", alignItems: "baseline", gap: "5px" }}>
            <h2 style={{ margin: 0, fontSize: "42px", fontWeight: "700", color: "var(--primary)" }}>{loading ? "-" : totalAttended}</h2>
            <span style={{ fontSize: "14px", fontWeight: "600", color: "var(--text-muted)" }}>Sessions</span>
          </div>
        </div>
        
        <div className="stat-card" style={{ padding: "20px", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
          <div className={`progress-ring ${isAtRisk ? "danger" : "success"}`}>
            <svg width="48" height="48" viewBox="0 0 48 48">
              <circle className="ring-bg" cx="24" cy="24" r="20"></circle>
              {loading ? null : (
                <circle className="ring-fill" cx="24" cy="24" r="20" style={{ strokeDasharray: "125", strokeDashoffset: ringOffset }}></circle>
              )}
            </svg>
            <span className="ring-text" style={{ fontSize: "12px" }}>{loading ? "-" : `${overallPct}%`}</span>
          </div>
          <p style={{ margin: "10px 0 0 0", fontSize: "10px", fontWeight: "700", color: isAtRisk ? "var(--error)" : "var(--secondary)", letterSpacing: "1px", textTransform: "uppercase" }}>
            {isAtRisk ? "AT RISK" : "OVERALL %"}
          </p>
        </div>
      </div>

      {/* Main Subjects Section */}
      <div style={{ marginBottom: "20px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h2 style={{ color: "var(--primary)", margin: 0, fontSize: "24px", fontWeight: "700", letterSpacing: "-0.5px" }}>
          My Enrolled Classes
        </h2>
      </div>

      {loading ? (
        <div style={{ textAlign: "center", padding: "60px 20px", color: "var(--text-muted)", background: "white", borderRadius: "20px" }}>
          <div style={{ animation: "pulse 1.5s infinite", fontSize: "32px", marginBottom: "15px" }}>⏳</div>
          <span style={{ fontSize: "16px", fontWeight: "500" }}>Loading your subjects...</span>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          {subjects.length === 0 && (
            <div className="stat-card" style={{ textAlign: "center", padding: "50px 20px" }}>
              <p style={{ margin: 0, color: "var(--text-muted)", fontSize: "16px" }}>You are not enrolled in any subjects yet.</p>
            </div>
          )}

          {subjects.map((s) => (
            <div
              key={s._id}
              className="stat-card"
              style={{
                borderLeft: s.activeWindow ? "6px solid var(--success)" : "6px solid var(--primary)",
                padding: "24px",
                position: "relative",
              }}
            >
               {s.activeWindow && (
                  <div style={{ position: "absolute", top: "24px", right: "24px" }}>
                    <span style={{
                      backgroundColor: "rgba(16,185,129,0.15)", color: "var(--success)",
                      fontSize: "12px", padding: "6px 12px", borderRadius: "20px", fontWeight: "700",
                      letterSpacing: "1px", textTransform: "uppercase"
                    }}>
                      • Live Session
                    </span>
                  </div>
                )}
              <h3 style={{ margin: "0 0 8px 0", color: "var(--primary)", fontSize: "22px", fontWeight: "700", paddingRight: s.activeWindow ? "120px" : "0" }}>
                {s.name}
              </h3>
              <p style={{ margin: "0 0 20px 0", fontSize: "15px", color: "var(--text-muted)", fontWeight: "500" }}>
                Prof: {s.teacher?.name}
              </p>

              <div style={{ 
                padding: "16px 20px", 
                backgroundColor: s.activeWindow ? "rgba(16,185,129,0.05)" : "var(--card-bg)", 
                borderRadius: "14px", 
                marginBottom: "20px",
                border: s.activeWindow ? "1px solid rgba(16,185,129,0.2)" : "1px solid transparent"
              }}>
                <p style={{ margin: 0, fontSize: "14px", color: s.activeWindow ? "var(--success)" : "var(--text-muted)", fontWeight: s.activeWindow ? "600" : "500", lineHeight: "1.5" }}>
                  {s.activeWindow ? "An attendance window is currently open. Tap below to securely mark your presence." : "No active attendance session right now. Check back later."}
                </p>
              </div>

              {/* Face ID Registration */}
              {!s.faceRegistered && activeRegSubject !== s._id && (
                <button
                  className="primary-btn pulse-btn"
                  onClick={() => { setActiveRegSubject(s._id); setActiveVerSubject(null); }}
                  style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "10px", padding: "16px", backgroundColor: "var(--primary)" }}
                >
                  <Icons.Scan /> Setup Face ID Registration
                </button>
              )}

              {activeRegSubject === s._id && (
                <div style={{ marginTop: "15px", padding: "20px", background: "var(--card-bg)", borderRadius: "16px" }}>
                  <FaceRegistration onComplete={() => { setActiveRegSubject(null); fetchData(); }} />
                  <button onClick={() => setActiveRegSubject(null)}
                    style={{ marginTop: "15px", width: "100%", padding: "12px", fontSize: "14px", cursor: "pointer", background: "white", border: "1px solid rgba(0,0,0,0.1)", borderRadius: "10px", color: "var(--error)", fontWeight: "600" }}>
                    Cancel Setup
                  </button>
                </div>
              )}

              {/* Mark Attendance */}
              {activeVerSubject !== s._id && s.faceRegistered && (
                <button
                  className="primary-btn"
                  disabled={!s.activeWindow}
                  onClick={() => { setActiveVerSubject(s._id); setActiveRegSubject(null); }}
                  style={{ 
                    padding: "16px", 
                    backgroundColor: s.activeWindow ? "var(--success)" : "var(--secondary)",
                    opacity: s.activeWindow ? 1 : 0.5,
                    fontSize: "16px"
                  }}
                >
                  <Icons.Check />
                  {s.activeWindow ? "Check-In via Face ID" : "Session Closed"}
                </button>
              )}

              {activeVerSubject === s._id && s.activeWindow && (
                <div style={{ marginTop: "15px", padding: "20px", background: "var(--card-bg)", borderRadius: "16px" }}>
                  <MarkAttendance
                    subjectId={s._id}
                    windowId={s.windowId}
                    onComplete={() => { setActiveVerSubject(null); fetchData(); }}
                    onCancel={() => setActiveVerSubject(null)}
                  />
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default StudentDashboard;