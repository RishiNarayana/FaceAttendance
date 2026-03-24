import React, { useState, useEffect, useContext } from "react";
import axios from "axios";
import { AuthContext } from "../context/AuthContext";
import FaceRegistration from "./FaceRegistration"; 
import MarkAttendance from "./MarkAttendance"; 

const StudentDashboard = () => {
  const { user } = useContext(AuthContext);
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // State to track which subject is currently open for registration or verification
  const [activeRegSubject, setActiveRegSubject] = useState(null);
  const [activeVerSubject, setActiveVerSubject] = useState(null);

  const fetchSubjects = async () => {
    try {
      const res = await axios.get("http://localhost:5000/api/student/my-subjects", {
        headers: { Authorization: `Bearer ${user.token}` }
      });

      // Map subjects
      const subjectsWithFaceFlag = res.data.map(s => ({
        ...s,
        faceRegistered: s.faceRegistered || false 
      }));

      setSubjects(subjectsWithFaceFlag);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSubjects();
    const interval = setInterval(fetchSubjects, 30000);
    return () => clearInterval(interval);
  }, [user.token]);

  return (
    <div style={{ maxWidth: "1000px", margin: "0 auto", padding: "20px" }}>
      <h2 style={{ color: "var(--primary)" }}>Student Portal</h2>
      <p style={{ color: "var(--text-muted)", marginBottom: "30px" }}>
        View your enrolled subjects and mark attendance when a session is active.
      </p>

      {loading ? (
        <div style={{ textAlign: "center", padding: "40px" }}>Loading your subjects...</div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: "25px" }}>
          {subjects.length === 0 && (
            <p style={{ color: "var(--text-muted)" }}>You are not enrolled in any subjects yet.</p>
          )}

          {subjects.map((s) => (
            <div
              key={s._id}
              className="auth-card"
              style={{
                padding: "25px",
                borderLeft: `6px solid ${s.activeWindow ? "var(--secondary)" : "#E5E7EB"}`,
                transition: "transform 0.2s ease",
                backgroundColor: "white",
                boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)"
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "15px" }}>
                <div>
                  <h3 style={{ margin: "0 0 5px 0", color: "var(--text-main)" }}>{s.name}</h3>
                  <p style={{ margin: 0, fontSize: "14px", color: "var(--text-muted)" }}>Professor: {s.teacher?.name}</p>
                </div>
                {s.activeWindow && (
                  <span
                    style={{
                      backgroundColor: "rgba(16, 185, 129, 0.1)",
                      color: "var(--secondary)",
                      fontSize: "12px",
                      padding: "4px 10px",
                      borderRadius: "20px",
                      fontWeight: "600"
                    }}
                  >
                    LIVE
                  </span>
                )}
              </div>

              <div style={{ marginBottom: "20px" }}>
                <p
                  style={{
                    fontSize: "13px",
                    color: s.activeWindow ? "var(--secondary)" : "var(--text-muted)",
                    fontWeight: "500"
                  }}
                >
                  {s.activeWindow
                    ? "✨ Attendance window is currently open!"
                    : "⏳ No active session at the moment."}
                </p>
              </div>

              {/* Registration Flow */}
              {!s.faceRegistered && activeRegSubject !== s._id && (
                <button
                  onClick={() => { setActiveRegSubject(s._id); setActiveVerSubject(null); }}
                  style={{
                    marginBottom: "10px",
                    width: "100%",
                    backgroundColor: "white",
                    color: "var(--secondary)",
                    border: "2px solid var(--secondary)",
                    cursor: "pointer",
                    padding: "10px",
                    borderRadius: "5px",
                    fontWeight: "600"
                  }}
                >
                  Setup Face ID
                </button>
              )}

              {activeRegSubject === s._id && (
                <div style={{ marginBottom: "15px" }}>
                  <FaceRegistration onComplete={() => { setActiveRegSubject(null); fetchSubjects(); }} />
                  <button onClick={() => setActiveRegSubject(null)} style={{ marginTop: "10px", padding: "5px", fontSize: "12px", cursor: "pointer", background: "none", border: "none", color: "var(--text-muted)", textDecoration: "underline" }}>Cancel Setup</button>
                </div>
              )}

              {/* Mark Attendance Flow Frontend Capture */}
              {activeVerSubject !== s._id && (
                <button
                  className={s.activeWindow ? "primary-btn pulse-btn" : "primary-btn"}
                  disabled={!s.activeWindow}
                  onClick={() => { setActiveVerSubject(s._id); setActiveRegSubject(null); }}
                  style={{
                    margin: 0,
                    width: "100%",
                    backgroundColor: s.activeWindow ? "var(--primary)" : "#9CA3AF",
                    cursor: s.activeWindow ? "pointer" : "not-allowed",
                    padding: "10px",
                    color: "white",
                    border: "none",
                    borderRadius: "5px"
                  }}
                >
                  {s.activeWindow ? "Mark Attendance (Face ID)" : "Window Closed"}
                </button>
              )}
              
              {activeVerSubject === s._id && s.activeWindow && (
                <MarkAttendance 
                  subjectId={s._id} 
                  windowId={s.windowId} 
                  onComplete={() => { setActiveVerSubject(null); fetchSubjects(); }}
                  onCancel={() => setActiveVerSubject(null)}
                />
              )}
              
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default StudentDashboard;