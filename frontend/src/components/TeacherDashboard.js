import React, { useState, useEffect, useContext, useCallback, useRef } from "react";
import axios from "axios";
import { AuthContext } from "../context/AuthContext";

const TeacherDashboard = () => {
  const { user } = useContext(AuthContext);
  const [subjects, setSubjects] = useState([]);
  
  // Forms state
  const [newSubject, setNewSubject] = useState("");
  const [windowSubject, setWindowSubject] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  
  // Unique Password Suffix
  const passSuffixRef = useRef(Math.random().toString(36).slice(-5).toUpperCase() + Math.floor(Math.random() * 99));

  // Create Student state
  const [studentData, setStudentData] = useState({ name: "", email: "", password: "" });
  const [studentSubject, setStudentSubject] = useState("");
  
  const handleStudentFieldChange = (field, value) => {
    let newPass = studentData.password;
    if (field === 'name' && value.trim().length > 0) {
      // Capitalize first letter of name, append a dash and our stable highly-secure random suffix
      const rawName = value.trim().split(' ')[0];
      const prettyName = rawName.charAt(0).toUpperCase() + rawName.slice(1).toLowerCase();
      newPass = `${prettyName}-${passSuffixRef.current}`;
    } else if (field === 'name' && value.trim().length === 0) {
      newPass = "";
    }
    setStudentData({ ...studentData, [field]: value, password: newPass });
  };
  
  // Success Modal state
  const [showModal, setShowModal] = useState(false);
  const [createdStudent, setCreatedStudent] = useState(null);

  const fetchSubjects = useCallback(async () => {
    try {
      const res = await axios.get("http://localhost:5000/api/teacher/my-subjects", {
        headers: { Authorization: `Bearer ${user.token}` }
      });
      setSubjects(res.data);
    } catch (err) {
      console.error(err);
    }
  }, [user.token]);

  useEffect(() => { 
    fetchSubjects(); 
  }, [fetchSubjects]);

  const handleCreateSubject = async (e) => {
    e.preventDefault();
    try {
      await axios.post("http://localhost:5000/api/teacher/create-subject", { name: newSubject }, {
        headers: { Authorization: `Bearer ${user.token}` }
      });
      setNewSubject("");
      fetchSubjects();
    } catch (err) {
      alert(err.response?.data?.message || "Error creating subject");
    }
  };

  const handleCreateStudent = async (e) => {
    e.preventDefault();
    try {
      // 1. Create the student login credentials
      const res = await axios.post("http://localhost:5000/api/teacher/create-student", studentData, {
        headers: { Authorization: `Bearer ${user.token}` }
      });
      
      // 2. Automatically assign them to the selected subject (if any)
      if (studentSubject) {
        await axios.post("http://localhost:5000/api/teacher/add-students", {
          subjectId: studentSubject,
          studentEmail: studentData.email
        }, {
          headers: { Authorization: `Bearer ${user.token}` }
        });
      }

      // 3. Show the success modal with credentials
      setCreatedStudent({
        ...studentData,
        subject: subjects.find(s => s._id === studentSubject)?.name || "Not Enrolled"
      });
      setShowModal(true);

      // Reset form and generate a new secure suffix for the next student
      setStudentData({ name: "", email: "", password: "" });
      setStudentSubject("");
      passSuffixRef.current = Math.random().toString(36).slice(-5).toUpperCase() + Math.floor(Math.random() * 99);
      fetchSubjects();
    } catch (err) {
      alert(err.response?.data?.message || "Error creating student");
    }
  };

  const handleSetWindow = async (e) => {
    e.preventDefault();
    try {
      await axios.post("http://localhost:5000/api/teacher/set-window", {
        subjectId: windowSubject,
        startTime,
        endTime
      }, {
        headers: { Authorization: `Bearer ${user.token}` }
      });
      alert("Attendance window set and students notified!");
    } catch (err) {
      alert(err.response?.data?.message || "Error setting window");
    }
  };

  return (
    <div style={{ maxWidth: "1000px", margin: "0 auto", padding: "20px" }}>
      <h2 style={{ color: "var(--primary)" }}>Teacher Dashboard</h2>
      <p style={{ color: "var(--text-muted)", marginBottom: "30px" }}>Manage your classes, create student accounts, and open attendance windows.</p>
      
      {/* SUCCESS MODAL */}
      {showModal && createdStudent && (
        <div style={{
          position: "fixed",
          top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: "rgba(0,0,0,0.5)",
          display: "flex", justifyContent: "center", alignItems: "center",
          zIndex: 1000,
          backdropFilter: "blur(5px)"
        }}>
          <div className="auth-card" style={{ maxWidth: "400px", borderTop: "5px solid var(--secondary)", textAlign: "center" }}>
            <div style={{ fontSize: "50px", marginBottom: "10px" }}>✅</div>
            <h3 style={{ margin: "0 0 10px 0" }}>Student Created!</h3>
            <p style={{ fontSize: "14px", color: "var(--text-muted)", marginBottom: "20px" }}>Please share these credentials with the student.</p>
            
            <div style={{ backgroundColor: "#F3F4F6", padding: "15px", borderRadius: "10px", textAlign: "left", marginBottom: "20px" }}>
              <p style={{ margin: "5px 0", fontSize: "14px" }}><strong>Name:</strong> {createdStudent.name}</p>
              <p style={{ margin: "5px 0", fontSize: "14px" }}><strong>Email:</strong> {createdStudent.email}</p>
              <p style={{ margin: "5px 0", fontSize: "14px" }}><strong>Password:</strong> <code style={{ color: "var(--primary)", fontWeight: "bold" }}>{createdStudent.password}</code></p>
              <p style={{ margin: "5px 0", fontSize: "14px" }}><strong>Subject:</strong> {createdStudent.subject}</p>
            </div>

            <button className="primary-btn" onClick={() => setShowModal(false)} style={{ width: "100%", margin: 0 }}>
              Got it, Dismiss
            </button>
          </div>
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "30px" }}>
        
        {/* Left Column */}
        <div>
          <section className="auth-card" style={{ padding: "25px", marginBottom: "30px", borderTop: "4px solid var(--secondary)" }}>
            <h4 style={{ margin: "0 0 15px 0", fontSize: "18px" }}>Create New Subject</h4>
            <form onSubmit={handleCreateSubject} className="auth-form" style={{ gap: "15px" }}>
              <div className="input-group">
                <input type="text" placeholder="e.g. Computer Science 101" value={newSubject} onChange={(e) => setNewSubject(e.target.value)} required />
              </div>
              <button type="submit" className="primary-btn" style={{ padding: "10px", marginTop: "0" }}>Create Subject</button>
            </form>
          </section>

          <section className="auth-card" style={{ padding: "25px", borderTop: "4px solid var(--primary)" }}>
            <h4 style={{ margin: "0 0 15px 0", fontSize: "18px" }}>Register New Student</h4>
            <p style={{ fontSize: "13px", color: "var(--text-muted)", marginTop: "0", marginBottom: "15px" }}>
              Credentials must be shared with the student so they can log in.
            </p>
            <form onSubmit={handleCreateStudent} className="auth-form" style={{ gap: "10px" }}>
              <div className="input-group">
                <input type="text" placeholder="Student Name" value={studentData.name} onChange={(e) => handleStudentFieldChange('name', e.target.value)} required />
              </div>
              <div className="input-group">
                <input type="email" placeholder="Student Email" value={studentData.email} onChange={(e) => handleStudentFieldChange('email', e.target.value)} required />
              </div>
              <div className="input-group">
                <input type="text" placeholder="Auto-Generated Password" style={{ backgroundColor: "#F3F4F6", cursor: "pointer" }} title="You can also manually edit this" value={studentData.password} onChange={(e) => setStudentData({...studentData, password: e.target.value})} required />
              </div>
              <div className="input-group">
                <label style={{ fontSize: "13px" }}>Enroll in Subject (Optional)</label>
                <select value={studentSubject} onChange={(e) => setStudentSubject(e.target.value)}>
                  <option value="">-- Do not enroll yet --</option>
                  {subjects.map(s => <option key={s._id} value={s._id}>{s.name}</option>)}
                </select>
              </div>
              <button type="submit" className="primary-btn" style={{ padding: "10px", marginTop: "5px" }}>Register Student</button>
            </form>
          </section>
        </div>

        {/* Right Column */}
        <div>
          <section className="auth-card" style={{ padding: "25px", marginBottom: "30px", borderTop: "4px solid #F59E0B" }}>
            <h4 style={{ margin: "0 0 15px 0", fontSize: "18px" }}>Open Attendance Window</h4>
            <form onSubmit={handleSetWindow} className="auth-form" style={{ gap: "15px" }}>
              <div className="input-group">
                <select value={windowSubject} onChange={(e) => setWindowSubject(e.target.value)} required>
                  <option value="">Select Subject</option>
                  {subjects.map(s => <option key={s._id} value={s._id}>{s.name}</option>)}
                </select>
              </div>
              <div className="input-group">
                <label style={{ fontSize: "13px" }}>Start Time</label>
                <input type="datetime-local" value={startTime} onChange={(e) => setStartTime(e.target.value)} required />
              </div>
              <div className="input-group">
                <label style={{ fontSize: "13px" }}>End Time</label>
                <input type="datetime-local" value={endTime} onChange={(e) => setEndTime(e.target.value)} required />
              </div>
              <button type="submit" className="primary-btn pulse-btn" style={{ padding: "10px", marginTop: "0" }}>Activate Window</button>
            </form>
          </section>

          <section className="auth-card" style={{ padding: "25px", backgroundColor: "white" }}>
            <h4 style={{ margin: "0 0 15px 0", fontSize: "18px" }}>My Subjects Overview</h4>
            <ul style={{ padding: "0", margin: "0", listStyle: "none" }}>
              {subjects.length === 0 ? <p style={{ fontSize: "14px", color: "var(--text-muted)" }}>No subjects created yet.</p> : null}
              {subjects.map(s => (
                <li key={s._id} style={{ 
                  padding: "15px", 
                  backgroundColor: "#F9FAFB", 
                  borderRadius: "8px",
                  marginBottom: "10px",
                  border: "1px solid #E5E7EB"
                }}>
                  <strong style={{ display: "block", color: "var(--text-main)" }}>{s.name}</strong>
                  <span style={{ fontSize: "13px", color: "var(--text-muted)" }}>Enrolled Students: {s.students.length}</span>
                </li>
              ))}
            </ul>
          </section>
        </div>

      </div>
    </div>
  );
};

export default TeacherDashboard;
