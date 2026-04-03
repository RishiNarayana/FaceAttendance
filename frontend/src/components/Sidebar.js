import React, { useContext, useState, useEffect } from "react";
import { AuthContext } from "../context/AuthContext";
import { useNavigate, useLocation } from "react-router-dom";

const Icons = {
  Dashboard: () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" rx="1"/>
      <rect x="14" y="3" width="7" height="7" rx="1"/>
      <rect x="14" y="14" width="7" height="7" rx="1"/>
      <rect x="3" y="14" width="7" height="7" rx="1"/>
    </svg>
  ),
  Profile: () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
      <circle cx="12" cy="7" r="4"/>
    </svg>
  ),
  Logs: () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
    </svg>
  ),
  Settings: () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3"/>
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>
    </svg>
  ),
  LogOut: () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/>
      <polyline points="10 17 15 12 10 7"/>
      <line x1="15" y1="12" x2="3" y2="12"/>
    </svg>
  ),
  Menu: () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="3" y1="12" x2="21" y2="12"></line>
      <line x1="3" y1="6" x2="21" y2="6"></line>
      <line x1="3" y1="18" x2="21" y2="18"></line>
    </svg>
  )
};

const Sidebar = () => {
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();
  const location = useLocation();
  const [isCollapsed, setIsCollapsed] = useState(false);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth <= 900) {
        setIsCollapsed(true);
      } else {
        setIsCollapsed(false);
      }
    };
    window.addEventListener("resize", handleResize);
    handleResize();
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const isActive = (path) => location.pathname === path ? "active" : "";

  return (
    <>
      {/* DESKTOP SIDEBAR */}
      <aside className={`sidebar ${isCollapsed ? "collapsed" : ""}`}>
        <div style={{ marginBottom: "50px", display: "flex", alignItems: "center", gap: "10px", color: "var(--primary)" }}>
          <button className="sidebar-toggle-btn" onClick={() => setIsCollapsed(!isCollapsed)} style={{ margin: 0 }}>
            <Icons.Menu />
          </button>
          {!isCollapsed && (
            <>
              <div style={{ width: 40, height: 40, borderRadius: "50%", background: "rgba(58,31,43,0.1)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                 <Icons.Dashboard />
              </div>
              <h2 style={{ margin: 0, fontSize: "20px", fontWeight: "700", letterSpacing: "-0.5px" }}>FaceAT</h2>
            </>
          )}
        </div>
        
        <nav style={{ display: "flex", flexDirection: "column", gap: "10px", flex: 1 }}>
          <div 
            style={{ 
              padding: "16px", borderRadius: "16px", cursor: "pointer", 
              background: isActive("/dashboard") ? "var(--primary)" : "transparent",
              color: isActive("/dashboard") ? "white" : "var(--secondary)",
              fontWeight: "600", display: "flex", alignItems: "center", gap: "12px", transition: "0.2s",
              justifyContent: isCollapsed ? "center" : "flex-start"
            }} 
            onClick={() => navigate("/dashboard")}
          >
            <Icons.Dashboard /> {!isCollapsed && <span>Dashboard</span>}
          </div>
          
          {user?.role === "student" && (
            <div 
              style={{ 
                padding: "16px", borderRadius: "16px", cursor: "pointer", 
                background: isActive("/analytics") ? "var(--primary)" : "transparent",
                color: isActive("/analytics") ? "white" : "var(--secondary)",
                fontWeight: "600", display: "flex", alignItems: "center", gap: "12px", transition: "0.2s",
                justifyContent: isCollapsed ? "center" : "flex-start"
              }} 
              onClick={() => navigate("/analytics")}
            >
              <Icons.Logs /> {!isCollapsed && <span>Analytics</span>}
            </div>
          )}

          <div 
            style={{ 
              padding: "16px", borderRadius: "16px", cursor: "pointer", 
              background: isActive("/profile") ? "var(--primary)" : "transparent",
              color: isActive("/profile") ? "white" : "var(--secondary)",
              fontWeight: "600", display: "flex", alignItems: "center", gap: "12px", transition: "0.2s",
              justifyContent: isCollapsed ? "center" : "flex-start"
            }} 
            onClick={() => navigate("/profile")}
          >
            <Icons.Profile /> {!isCollapsed && <span>Profile</span>}
          </div>
        </nav>

        <div style={{ marginTop: "auto", borderTop: "1px solid rgba(0,0,0,0.05)", paddingTop: "20px" }}>
          <div 
            style={{ 
              padding: "16px", borderRadius: "16px", cursor: "pointer", 
              color: "var(--error)", fontWeight: "600", display: "flex", alignItems: "center", gap: "12px",
              justifyContent: isCollapsed ? "center" : "flex-start"
            }} 
            onClick={handleLogout}
          >
            <Icons.LogOut /> {!isCollapsed && <span>Logout</span>}
          </div>
        </div>
      </aside>

      {/* MOBILE BOTTOM NAV */}
      <nav className="bottom-nav">
        <div className={`bottom-nav-item ${isActive("/dashboard")}`} onClick={() => navigate("/dashboard")}>
          <Icons.Dashboard />
          <span>Dashboard</span>
        </div>
        
        {user?.role === "student" && (
          <div className={`bottom-nav-item ${isActive("/analytics")}`} onClick={() => navigate("/analytics")}>
            <Icons.Logs />
            <span>Logs</span>
          </div>
        )}

        <div className={`bottom-nav-item ${isActive("/profile")}`} onClick={() => navigate("/profile")}>
          <Icons.Profile />
          <span>Profile</span>
        </div>

        <div className="bottom-nav-item" onClick={handleLogout} style={{color: "var(--error)"}}>
          <Icons.LogOut />
          <span>Logout</span>
        </div>
      </nav>
    </>
  );
};

export default Sidebar;
