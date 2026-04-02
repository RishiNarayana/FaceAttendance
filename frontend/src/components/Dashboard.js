import React, { useContext } from "react";
import { AuthContext } from "../context/AuthContext";
import TeacherDashboard from "./TeacherDashboard";
import StudentDashboard from "./StudentDashboard";
import Sidebar from "./Sidebar";

const Dashboard = () => {
  const { user } = useContext(AuthContext);

  return (
    <div className="dashboard-layout with-bottom-nav">
      <Sidebar />
      <main className="main-content">
        <header style={{ 
          display: "flex", 
          justifyContent: "space-between", 
          alignItems: "center", 
          marginBottom: "30px", 
          paddingBottom: "20px", 
          borderBottom: "1px solid rgba(0,0,0,0.05)" 
        }}>
          <div>
             <h1 style={{ margin: 0, color: "var(--primary)", fontSize: "28px", fontWeight: "700", letterSpacing: "-0.5px" }}>
               {user.role === "teacher" ? "Teacher Portal" : "Student Dashboard"}
             </h1>
             <p style={{ margin: "5px 0 0 0", color: "var(--secondary)", fontSize: "14px" }}>
               Welcome back, <strong>{user.name}</strong>
             </p>
          </div>
          {/* Avatar Placeholder for Desktop Top Right */}
          <div style={{
            width: 48, height: 48, borderRadius: '50%', background: 'rgba(58,31,43,0.1)', 
            display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)',
            fontWeight: 'bold', fontSize: '18px'
          }}>
            {user.name ? user.name.charAt(0).toUpperCase() : "U"}
          </div>
        </header>
        
        {user.role === "teacher" ? <TeacherDashboard /> : <StudentDashboard />}
      </main>
    </div>
  );
};

export default Dashboard;
