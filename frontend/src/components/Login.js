import React, { useState, useContext } from "react";
import { AuthContext } from "../context/AuthContext";
import { useNavigate, Link } from "react-router-dom";
import { useToast } from "./Toast";

// SVGs for Icons
const Icons = {
  Email: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
      <path d="M20 4H4C2.9 4 2.01 4.9 2.01 6L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/>
    </svg>
  ),
  Lock: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
      <path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z"/>
    </svg>
  ),
  Eye: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" opacity="0.6">
      <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/>
    </svg>
  ),
  FaceLogo: () => (
    <svg width="48" height="48" viewBox="0 0 24 24" fill="var(--primary)">
      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8 0-4.41 3.59-8 8-8s8 3.59 8 8-3.59 8-8 8zm-2.5-9c.83 0 1.5-.67 1.5-1.5S10.33 8 9.5 8 8 8.67 8 9.5 8.67 11 9.5 11zm5 0c.83 0 1.5-.67 1.5-1.5S15.33 8 14.5 8 13 8.67 13 9.5 13.67 11 14.5 11zm-2.5 5.5c2.33 0 4.31-1.46 5.11-3.5H6.89c.8 2.04 2.78 3.5 5.11 3.5z" />
    </svg>
  )
};

const Login = () => {
  const toast = useToast();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  
  const { login } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      await login(email.trim(), password);
      navigate("/dashboard");
    } catch (err) {
      setError(err.response?.data?.message || "Invalid email or password");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-layout">
      {/* BRAND SIDE (Desktop Only) */}
      <div className="auth-brand-side">
        <div className="auth-brand-content">
          <div style={{ marginBottom: '30px', display: 'flex', justifyContent: 'center' }}>
            <div style={{ width: 100, height: 100, borderRadius: '50%', background: 'rgba(255,255,255,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 20px 40px rgba(58,31,43,0.1)' }}>
              <Icons.FaceLogo />
            </div>
          </div>
          <h1>FaceAttendance</h1>
          <p>Secure, biometric-powered attendance management for the modern enterprise.</p>
        </div>
      </div>

      {/* FORM SIDE */}
      <div className="auth-form-side">
        <div className="auth-card">
          
          {/* Mobile Header (Hidden on Desktop natively via layout, but visible to keep it simple on mobile) */}
          <div className="auth-header">
            <h2>Welcome Back</h2>
            <p>Sign in to your account</p>
          </div>

          {error && <div className="error-message">{error}</div>}

          <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            
            <div className="input-group">
              <label>Email Address</label>
              <div className="input-icon-wrapper has-left-icon">
                <div className="field-icon"><Icons.Email /></div>
                <input 
                  type="email" 
                  placeholder="name@organization.edu" 
                  value={email} 
                  onChange={(e) => setEmail(e.target.value)} 
                  required 
                />
              </div>
            </div>

            <div className="input-group">
              <label>Password</label>
              <div className="input-icon-wrapper has-left-icon has-right-icon">
                <div className="field-icon"><Icons.Lock /></div>
                <input 
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••" 
                  value={password} 
                  onChange={(e) => setPassword(e.target.value)} 
                  required 
                />
                <div className="field-icon right" onClick={() => setShowPassword(!showPassword)} title="Toggle Password">
                  <Icons.Eye />
                </div>
              </div>
              
              <div style={{ textAlign: 'right', marginTop: '8px' }}>
                <a href="#" onClick={(e) => { e.preventDefault(); toast.info("Forgot Password coming soon"); }} style={{ fontSize: '12px', fontWeight: '600', color: 'var(--secondary)', textDecoration: 'none' }}>
                  Forgot Credentials?
                </a>
              </div>
            </div>

            <button type="submit" className="primary-btn" disabled={loading} style={{ marginTop: '10px' }}>
              {loading ? "Authenticating..." : "Secure Login"}
            </button>
          </form>

          <div style={{ marginTop: '40px', textAlign: 'center' }}>
            <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>
              Don't have an account? <Link to="/register" style={{ color: 'var(--primary)', fontWeight: '600', textDecoration: 'none' }}>Sign Up</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;

