import React, { useContext, useEffect, useState } from "react";
import { AuthContext } from "../context/AuthContext";
import Sidebar from "./Sidebar";
import api from "../api";

const Profile = () => {
  const { user } = useContext(AuthContext);
  const [subjects, setSubjects] = useState([]);

  useEffect(() => {
    const fetchStats = async () => {
      if (user.role === "teacher") {
        try {
          const res = await api.get("/teacher/my-subjects");
          setSubjects(res.data);
        } catch (err) {
          console.error(err);
        }
      }
    };
    fetchStats();
  }, [user]);

  return (
    <div className="dashboard-layout with-bottom-nav">
      <Sidebar />
      <main className="main-content">
        <header style={{ marginBottom: "30px", borderBottom: "1px solid rgba(0,0,0,0.05)", paddingBottom: "20px" }}>
          <h1 style={{ margin: 0, color: "var(--primary)", fontSize: "28px", fontWeight: "700", letterSpacing: "-0.5px" }}>My Profile</h1>
          <p style={{ color: "var(--secondary)", margin: "5px 0 0 0", fontSize: "14px" }}>
            View your account details.
          </p>
        </header>

        <div className="stat-card" style={{ maxWidth: "600px", borderTop: "5px solid var(--primary)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "25px", marginBottom: "30px", flexWrap: "wrap" }}>
            <div style={{
              width: "80px", height: "80px", borderRadius: "50%",
              background: "rgba(58,31,43,0.1)", color: "var(--primary)",
              display: "flex", justifyContent: "center", alignItems: "center",
              fontSize: "32px", fontWeight: "700",
            }}>
              {user.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <h2 style={{ margin: "0 0 4px 0", color: "var(--primary)", fontSize: "24px" }}>{user.name}</h2>
              <p style={{ margin: 0, color: "var(--secondary)", fontWeight: "600", fontSize: "14px" }}>
                {user.role.charAt(0).toUpperCase() + user.role.slice(1)} Account
              </p>
            </div>
          </div>

          <div style={{ display: "grid", gap: "20px" }}>
            <div className="input-group">
              <label>Full Name</label>
              <div style={{ padding: "14px 16px", background: "var(--background)", borderRadius: "12px", border: "1px solid rgba(0,0,0,0.05)", fontSize: "14px", fontWeight: "500" }}>
                {user.name}
              </div>
            </div>
            <div className="input-group">
              <label>Email Address</label>
              <div style={{ padding: "14px 16px", background: "var(--background)", borderRadius: "12px", border: "1px solid rgba(0,0,0,0.05)", fontSize: "14px", fontWeight: "500" }}>
                {user.email}
              </div>
            </div>
            <div className="input-group">
              <label>Account ID</label>
              <code style={{ fontSize: "12px", color: "var(--text-muted)", background: "transparent", padding: 0 }}>{user._id}</code>
            </div>

            {user.role === "teacher" && (
              <div style={{
                marginTop: "10px", padding: "20px",
                background: "rgba(58,31,43,0.05)", borderRadius: "15px",
                display: "flex", flexDirection: "column", gap: "10px"
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <h4 style={{ margin: 0, color: "var(--primary)" }}>Teaching Stats</h4>
                    <p style={{ margin: 0, fontSize: "14px", color: "var(--secondary)" }}>Total subjects managed</p>
                  </div>
                  <div style={{ fontSize: "36px", fontWeight: "700", color: "var(--primary)" }}>
                    {subjects.length}
                  </div>
                </div>

                {subjects.length > 0 && (
                  <div style={{ marginTop: "10px", borderTop: "1px solid rgba(0,0,0,0.1)", paddingTop: "15px" }}>
                    <h5 style={{ margin: "0 0 10px 0", color: "var(--primary)", fontSize: "15px" }}>Assigned Subjects</h5>
                    <ul style={{ margin: 0, listStyle: "none", padding: 0 }}>
                      {subjects.map((sub, idx) => (
                        <li key={sub._id} style={{ 
                          marginBottom: "8px", 
                          padding: "10px 14px", 
                          background: "var(--background)", 
                          borderRadius: "8px",
                          border: "1px solid rgba(0,0,0,0.05)",
                          display: "flex", alignItems: "center", gap: "10px"
                        }}>
                          <span style={{ 
                            background: "var(--primary)", color: "white", 
                            width: "24px", height: "24px", borderRadius: "50%", 
                            display: "flex", justifyContent: "center", alignItems: "center", 
                            fontSize: "12px", fontWeight: "bold" 
                          }}>
                            {idx + 1}
                          </span>
                          <span style={{ color: "var(--primary)", fontWeight: "600", fontSize: "15px" }}>
                            {sub.name}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default Profile;
