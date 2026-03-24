import React, { useContext } from "react";
import { AuthContext } from "../context/AuthContext";
import TeacherDashboard from "./TeacherDashboard";
import StudentDashboard from "./StudentDashboard";
import Sidebar from "./Sidebar";

const Dashboard = () => {
  const { user, logout } = useContext(AuthContext);

  return (
    <div className="dashboard-container">
      <Sidebar />
      <header style={{ paddingLeft: "80px", display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "30px" }}>
        <h1>{user.role === "teacher" ? "Teacher Panel" : "Student Portal"}</h1>
        <div style={{ color: "var(--text-muted)", fontSize: "14px" }}>
            Welcome back, <strong>{user.name}</strong>
        </div>
      </header>
      <main>
        {user.role === "teacher" ? <TeacherDashboard /> : <StudentDashboard />}
      </main>
    </div>
  );
};

export default Dashboard;
