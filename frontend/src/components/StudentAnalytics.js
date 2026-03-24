import React, { useState, useEffect, useContext } from "react";
import axios from "axios";
import { AuthContext } from "../context/AuthContext";
import Sidebar from "./Sidebar";

const StudentAnalytics = () => {
  const { user } = useContext(AuthContext);
  const [stats, setStats] = useState([]);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await axios.get("http://localhost:5000/api/student/analytics", {
          headers: { Authorization: `Bearer ${user.token}` }
        });
        setStats(res.data);
      } catch (err) {
        console.error(err);
      }
    };
    fetchStats();
  }, [user.token]);

  return (
    <div className="dashboard-container">
      <Sidebar />
      <header style={{ paddingLeft: "80px", marginBottom: "30px" }}>
        <h1>My Attendance Analytics</h1>
        <p style={{ color: "var(--text-muted)" }}>Track your performance across all subjects.</p>
      </header>

      <main style={{ paddingLeft: "80px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: "25px" }}>
          {stats.map((stat, index) => (
            <div key={index} className="auth-card" style={{ padding: "25px", position: "relative", overflow: "hidden" }}>
              <div style={{
                position: "absolute",
                top: "-10px",
                right: "-10px",
                width: "80px",
                height: "80px",
                background: parseFloat(stat.percentage) >= 75 ? "rgba(16, 185, 129, 0.1)" : "rgba(239, 68, 68, 0.1)",
                borderRadius: "50%",
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                fontSize: "12px",
                fontWeight: "700",
                color: parseFloat(stat.percentage) >= 75 ? "var(--secondary)" : "var(--error)"
              }}>
                {stat.percentage}%
              </div>
              
              <h3 style={{ margin: "0 0 15px 0", color: "var(--primary)" }}>{stat.subjectName}</h3>
              
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "10px", fontSize: "14px" }}>
                <span>Total Classes Held:</span>
                <strong>{stat.totalSessions}</strong>
              </div>
              
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "20px", fontSize: "14px" }}>
                <span>Classes Attended:</span>
                <strong>{stat.attendedSessions}</strong>
              </div>

              {/* Progress Bar */}
              <div style={{ width: "100%", height: "8px", background: "#E5E7EB", borderRadius: "10px", overflow: "hidden" }}>
                <div style={{ 
                  width: `${stat.percentage}%`, 
                  height: "100%", 
                  background: parseFloat(stat.percentage) >= 75 ? "var(--secondary)" : "var(--error)",
                  transition: "width 1s ease-in-out"
                }}></div>
              </div>
              
              <p style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "10px" }}>
                {parseFloat(stat.percentage) >= 75 ? "✅ Looking good! Stay consistent." : "⚠️ Warning: Attendance low."}
              </p>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
};

export default StudentAnalytics;
