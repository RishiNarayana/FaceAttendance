import React, { useState } from "react";
import axios from "axios";
import { useNavigate, Link } from "react-router-dom";

const TeacherRegister = () => {
  const [formData, setFormData] = useState({ name: "", email: "", password: "", role: "teacher" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleRegister = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      await axios.post("http://localhost:5000/api/auth/register", formData);
      alert("Registration successful! Please login.");
      navigate("/login");
    } catch (err) {
      setError(err.response?.data?.message || "Registration failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modern-auth-container">
      <div className="auth-card teacher-card">
        <div className="auth-header">
          <h2>Teacher Portal</h2>
          <p>Join FaceAT and manage your classes seamlessly</p>
        </div>
        
        {error && <div className="error-message">{error}</div>}

        <form onSubmit={handleRegister} className="auth-form">
          <div className="input-group">
            <label>Full Name</label>
            <input 
              type="text" 
              placeholder="Dr. John Doe" 
              onChange={(e) => setFormData({...formData, name: e.target.value})} 
              required 
            />
          </div>
          
          <div className="input-group">
            <label>Email Address</label>
            <input 
              type="email" 
              placeholder="teacher@university.edu" 
              onChange={(e) => setFormData({...formData, email: e.target.value})} 
              required 
            />
          </div>
          
          <div className="input-group">
            <label>Password</label>
            <input 
              type="password" 
              placeholder="••••••••" 
              onChange={(e) => setFormData({...formData, password: e.target.value})} 
              required 
            />
          </div>
          
          <button type="submit" className="primary-btn pulse-btn" disabled={loading}>
            {loading ? "Registering..." : "Create Teacher Account"}
          </button>
        </form>
        
        <div className="auth-footer">
          <p>Already have an account? <Link to="/login">Sign In</Link></p>
          <p className="small-text">Not a teacher? <Link to="/register">Student Registration</Link></p>
        </div>
      </div>
    </div>
  );
};

export default TeacherRegister;
