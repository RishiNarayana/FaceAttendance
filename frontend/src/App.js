import React from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import AuthProvider, { AuthContext } from "./context/AuthContext";
import ToastProvider from "./components/Toast";
import Login from "./components/Login";
import Register from "./components/Register";
import Dashboard from "./components/Dashboard";
import Profile from "./components/Profile";
import StudentAnalytics from "./components/StudentAnalytics";
import EnrollStudent from "./components/EnrollStudent";

// Protects any route that requires login.
// Optionally restrict to specific roles (e.g. roles={["teacher"]}).
const ProtectedRoute = ({ children, roles }) => {
  const { user } = React.useContext(AuthContext);
  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/dashboard" replace />;
  return children;
};

function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <Router>
          <Routes>
            {/* Public */}
            <Route path="/login"            element={<Login />} />
            <Route path="/register"         element={<Register />} />

            {/* Protected — role-based dashboard (teacher vs student) */}
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              }
            />

            {/* Protected — profile available to all logged-in users */}
            <Route
              path="/profile"
              element={
                <ProtectedRoute>
                  <Profile />
                </ProtectedRoute>
              }
            />

            {/* Protected — students only */}
            <Route
              path="/analytics"
              element={
                <ProtectedRoute roles={["student"]}>
                  <StudentAnalytics />
                </ProtectedRoute>
              }
            />

            {/* Protected — teachers only: enroll an existing student */}
            <Route
              path="/enroll-student"
              element={
                <ProtectedRoute roles={["teacher", "admin"]}>
                  <EnrollStudent />
                </ProtectedRoute>
              }
            />

            {/* Default: redirect root → dashboard (ProtectedRoute handles unauthenticated) */}
            <Route path="/" element={<Navigate to="/dashboard" replace />} />

            {/* Catch-all: send unknown URLs to login */}
            <Route path="*" element={<Navigate to="/login" replace />} />
          </Routes>
        </Router>
      </ToastProvider>
    </AuthProvider>
  );
}

export default App;