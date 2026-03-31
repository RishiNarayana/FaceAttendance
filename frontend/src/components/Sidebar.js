import React, { useState, useContext } from "react";
import { AuthContext } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import { useToast } from "./Toast";

const Sidebar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();

  const toggleSidebar = () => setIsOpen(!isOpen);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <>
      {/* HAMBURGER ICON */}
      <div className={`hamburger ${isOpen ? "open" : ""}`} onClick={toggleSidebar} style={{ position: "fixed", top: "20px", left: "20px" }}>
        <span></span>
        <span></span>
        <span></span>
      </div>

      {/* OVERLAY */}
      <div className={`sidebar-overlay ${isOpen ? "visible" : ""}`} onClick={toggleSidebar}></div>

      {/* SIDEBAR CONTENT */}
      <div className={`sidebar ${isOpen ? "open" : ""}`}>
        <div className="sidebar-logo">FaceAT</div>
        
        <div className="nav-item active" onClick={() => { navigate("/dashboard"); toggleSidebar(); }}>
          Dashboard
        </div>
        
        <div className="nav-item" onClick={() => { navigate("/profile"); toggleSidebar(); }}>
          My Profile
        </div>

        {user.role === "teacher" && (
           <div className="nav-item" onClick={() => { navigate("/dashboard"); toggleSidebar(); }}>
             Manage Subjects
           </div>
        )}

        {user.role === "student" && (
           <div className="nav-item" onClick={() => { navigate("/analytics"); toggleSidebar(); }}>
             My Attendance Analytics
           </div>
        )}

        <div className="nav-item logout-nav" onClick={handleLogout}>
          Logout
        </div>

        <div style={{ marginTop: "20px", borderTop: "1px solid #eee", paddingTop: "20px" }}>
            <p style={{ fontSize: "12px", color: "var(--text-muted)", margin: 0 }}>Logged in as:</p>
            <p style={{ fontSize: "14px", fontWeight: "600", margin: 0 }}>{user.name}</p>
            <p style={{ fontSize: "12px", color: "var(--text-muted)", margin: 0 }}>{user.email}</p>
        </div>
      </div>
    </>
  );
};

export default Sidebar;
