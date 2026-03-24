import React, { useContext, useEffect, useState } from "react";
import { AuthContext } from "../context/AuthContext";
import Sidebar from "./Sidebar";
import axios from "axios";

const Profile = () => {
  const { user } = useContext(AuthContext);
  const [subjectCount, setSubjectCount] = useState(0);

  useEffect(() => {
    const fetchStats = async () => {
      if (user.role === "teacher") {
        try {
          const res = await axios.get("http://localhost:5000/api/teacher/my-subjects", {
            headers: { Authorization: `Bearer ${user.token}` }
          });
          setSubjectCount(res.data.length);
        } catch (err) {
          console.error(err);
        }
      }
    };
    fetchStats();
  }, [user]);

  return (
    <div className="dashboard-container">
      <Sidebar />
      <header style={{ paddingLeft: "80px", marginBottom: "30px" }}>
        <h1>My Profile</h1>
      </header>
      
      <main style={{ paddingLeft: "80px" }}>
        <div className="auth-card" style={{ maxWidth: "600px", padding: "40px", borderTop: "5px solid var(--primary)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "25px", marginBottom: "30px" }}>
            <div style={{
              width: "80px",
              height: "80px",
              borderRadius: "50%",
              background: "var(--primary)",
              color: "white",
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              fontSize: "32px",
              fontWeight: "700"
            }}>
              {user.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <h2 style={{ margin: 0 }}>{user.name}</h2>
              <p style={{ margin: 0, color: "var(--text-muted)" }}>{user.role.charAt(0).toUpperCase() + user.role.slice(1)}</p>
            </div>
          </div>

          <div style={{ display: "grid", gap: "20px" }}>
            <div className="input-group">
              <label>Full Name</label>
              <div style={{ padding: "12px", background: "#f9fafb", borderRadius: "10px", border: "1px solid #eee" }}>
                {user.name}
              </div>
            </div>
            
            <div className="input-group">
              <label>Email Address</label>
              <div style={{ padding: "12px", background: "#f9fafb", borderRadius: "10px", border: "1px solid #eee" }}>
                {user.email}
              </div>
            </div>

            <div className="input-group">
                <label>Account ID</label>
                <code style={{ fontSize: "12px", color: "var(--text-muted)" }}>{user._id}</code>
            </div>

            {user.role === "teacher" && (
              <div style={{ marginTop: "10px", padding: "20px", background: "rgba(79, 70, 229, 0.05)", borderRadius: "15px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                    <h4 style={{ margin: 0, color: "var(--primary)" }}>Teaching Stats</h4>
                    <p style={{ margin: 0, fontSize: "14px", color: "var(--text-muted)" }}>Total subjects managed</p>
                </div>
                <div style={{ fontSize: "36px", fontWeight: "700", color: "var(--primary)" }}>
                    {subjectCount}
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default Profile;
