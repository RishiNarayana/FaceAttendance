import React, { useState } from "react";
import axios from "axios";
import { useNavigate, Link } from "react-router-dom";

const Register = () => {
  const [formData, setFormData] = useState({ name: "", email: "", password: "", confirmPassword: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleRegisterProfile = async (e) => {
    e.preventDefault();
    setError("");
    
    if (formData.password !== formData.confirmPassword) {
      return setError("Passwords do not match");
    }

    setLoading(true);
    try {
      await axios.post("http://localhost:5000/api/auth/register", {
        name: formData.name,
        email: formData.email,
        password: formData.password,
        role: "teacher"
      });
      alert("Registration successful! You can now log in.");
      navigate("/login");
    } catch (err) {
      setError(err.response?.data?.message || "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modern-auth-container">
      <div className="auth-card teacher-card">
        <div className="auth-header">
          <h2>Teacher Registration</h2>
          <p>Join FaceAT to easily manage your classes</p>
        </div>
        
        {error && <div className="error-message">{error}</div>}

        <form onSubmit={handleRegisterProfile} className="auth-form">
          <div className="input-group">
            <label>Full Name</label>
            <input type="text" placeholder="Dr. Jane Doe" onChange={(e) => setFormData({...formData, name: e.target.value})} required />
          </div>
          <div className="input-group">
            <label>Email Address</label>
            <input type="email" placeholder="teacher@university.edu" onChange={(e) => setFormData({...formData, email: e.target.value})} required />
          </div>
          <div className="input-group">
            <label>Password</label>
            <input type="password" placeholder="••••••••" onChange={(e) => setFormData({...formData, password: e.target.value})} required minLength="6" />
          </div>
          <div className="input-group">
            <label>Confirm Password</label>
            <input type="password" placeholder="••••••••" onChange={(e) => setFormData({...formData, confirmPassword: e.target.value})} required minLength="6" />
          </div>
          <button type="submit" className="primary-btn pulse-btn" disabled={loading}>
            {loading ? "Registering..." : "Create Account"}
          </button>
        </form>
        
        <div className="auth-footer">
          <p>Already have an account? <Link to="/login">Sign In</Link></p>
        </div>
      </div>
    </div>
  );
};

export default Register;
