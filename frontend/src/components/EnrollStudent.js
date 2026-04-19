import React, { useState, useEffect, useContext, useCallback, useRef } from "react";
import { AuthContext } from "../context/AuthContext";
import { useToast } from "./Toast";
import Sidebar from "./Sidebar";
import api from "../api";

// ── Icons ─────────────────────────────────────────────────────────────────────
const CheckIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12"/>
  </svg>
);

const SearchIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
  </svg>
);

// ── Component ─────────────────────────────────────────────────────────────────
const EnrollStudent = () => {
  const { user } = useContext(AuthContext);
  const toast    = useToast();

  // ── Shared data ─────────────────────────────────────────────────────────────
  const [subjects, setSubjects] = useState([]);

  // ── Register New Student state ───────────────────────────────────────────────
  const passSuffixRef = useRef(
    Math.random().toString(36).slice(-5).toUpperCase() + Math.floor(Math.random() * 99)
  );
  const [studentData, setStudentData]   = useState({ name: "", email: "", password: "" });
  const [studentSubject, setStudentSubject] = useState("");
  const [showModal, setShowModal]       = useState(false);
  const [createdStudent, setCreatedStudent] = useState(null);

  // ── Enroll Existing Student state ────────────────────────────────────────────
  const [enrollEmail, setEnrollEmail]   = useState("");
  const [enrollSubjectId, setEnrollSubjectId] = useState("");
  const [enrollLoading, setEnrollLoading]   = useState(false);
  const [enrollResult, setEnrollResult]     = useState(null);   // success payload
  const [enrollNotFound, setEnrollNotFound] = useState(null);   // email string when 404

  // ── Fetch subjects ────────────────────────────────────────────────────────────
  const fetchSubjects = useCallback(async () => {
    try {
      const res = await api.get("/teacher/my-subjects");
      setSubjects(res.data);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to load subjects");
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user.token]);

  useEffect(() => { fetchSubjects(); }, [fetchSubjects]);

  // Reset enroll result when inputs change
  useEffect(() => {
    setEnrollResult(null);
    setEnrollNotFound(null);
  }, [enrollEmail, enrollSubjectId]);

  // ── Register helpers ──────────────────────────────────────────────────────────
  const handleStudentFieldChange = (field, value) => {
    let newPass = studentData.password;
    if (field === "name" && value.trim().length > 0) {
      const first  = value.trim().split(" ")[0];
      const pretty = first.charAt(0).toUpperCase() + first.slice(1).toLowerCase();
      newPass = `${pretty}-${passSuffixRef.current}`;
    } else if (field === "name" && value.trim().length === 0) {
      newPass = "";
    }
    setStudentData({ ...studentData, [field]: value, password: newPass });
  };

  const handleCreateStudent = async (e) => {
    e.preventDefault();
    try {
      await api.post("/teacher/create-student", studentData);
      if (studentSubject) {
        await api.post("/teacher/add-students", {
          subjectId: studentSubject,
          studentEmail: studentData.email,
        });
      }
      setCreatedStudent({
        ...studentData,
        subject: subjects.find((s) => s._id === studentSubject)?.name || "Not Enrolled",
      });
      setShowModal(true);
      setStudentData({ name: "", email: "", password: "" });
      setStudentSubject("");
      passSuffixRef.current =
        Math.random().toString(36).slice(-5).toUpperCase() + Math.floor(Math.random() * 99);
      fetchSubjects();
    } catch (err) {
      toast.error(err.response?.data?.message || "Error creating student");
    }
  };

  // ── Enroll existing ───────────────────────────────────────────────────────────
  const handleEnroll = async (e) => {
    e.preventDefault();
    if (!enrollEmail.trim()) return toast.warn("Please enter the student's email address.");
    if (!enrollSubjectId)    return toast.warn("Please select a subject.");

    setEnrollLoading(true);
    setEnrollResult(null);
    setEnrollNotFound(null);

    try {
      const res = await api.post("/teacher/enroll-student", {
        studentEmail: enrollEmail.trim().toLowerCase(),
        subjectId:    enrollSubjectId,
      });
      setEnrollResult(res.data);
      toast.success(res.data.message);
      setEnrollEmail("");
      setEnrollSubjectId("");
      fetchSubjects();
    } catch (err) {
      const msg = err.response?.data?.message || "Enrollment failed";
      toast.error(msg);
      if (err.response?.status === 404) setEnrollNotFound(enrollEmail.trim());
    } finally {
      setEnrollLoading(false);
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────────
  return (
    <div className="dashboard-layout with-bottom-nav">
      <Sidebar />

      <main className="main-content">
        {/* ── Header ── */}
        <header style={{
          display: "flex", justifyContent: "space-between", alignItems: "center",
          marginBottom: "30px", paddingBottom: "20px",
          borderBottom: "1px solid rgba(0,0,0,0.05)",
        }}>
          <div>
            <h1 style={{ margin: 0, color: "var(--primary)", fontSize: "28px", fontWeight: "700", letterSpacing: "-0.5px" }}>
              Student Management
            </h1>
            <p style={{ margin: "5px 0 0 0", color: "var(--secondary)", fontSize: "14px" }}>
              Register new students or enroll existing accounts into your subjects.
            </p>
          </div>
          <div style={{
            width: 48, height: 48, borderRadius: "50%", background: "rgba(58,31,43,0.1)",
            display: "flex", alignItems: "center", justifyContent: "center",
            color: "var(--primary)", fontWeight: "bold", fontSize: "18px",
          }}>
            {user.name ? user.name.charAt(0).toUpperCase() : "T"}
          </div>
        </header>

        {/* ── Info banner ── */}
        <div style={{
          display: "flex", alignItems: "flex-start", gap: "12px",
          padding: "14px 18px", marginBottom: "28px",
          background: "rgba(59,130,246,0.07)",
          border: "1px solid rgba(59,130,246,0.25)",
          borderRadius: "12px", fontSize: "13px", color: "#1E3A5F",
        }}>
          <span style={{ fontSize: "18px", flexShrink: 0 }}>💡</span>
          <span>
            <strong>New student?</strong> Use the left panel to create an account and optionally enroll them immediately.{" "}
            <strong>Student already has an account?</strong> Use the right panel — just enter their email (primary key) and pick a subject.
          </span>
        </div>

        {/* ── Two-panel grid ── */}
        <div className="dashboard-grid">

          {/* ────── LEFT: Register New Student ────── */}
          <section className="stat-card" style={{ borderTop: "5px solid var(--primary)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "6px" }}>
              <div style={{
                width: 36, height: 36, borderRadius: "50%",
                background: "rgba(58,31,43,0.08)",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <span style={{ fontSize: "18px" }}>👤</span>
              </div>
              <h4 style={{ margin: 0, fontSize: "20px", fontWeight: "700", color: "var(--primary)" }}>
                Register New Student
              </h4>
            </div>
            <p style={{ fontSize: "13px", color: "var(--text-muted)", marginTop: "4px", marginBottom: "24px" }}>
              Creates a brand-new student account and optionally enrols them into a subject.
              Credentials are auto-generated.
            </p>

            <form onSubmit={handleCreateStudent} style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
              <div className="input-group">
                <label style={{ fontSize: "13px", fontWeight: "700", color: "var(--secondary)" }}>Full Name</label>
                <div className="input-icon-wrapper">
                  <input type="text" placeholder="e.g. Jane Smith" value={studentData.name}
                    onChange={(e) => handleStudentFieldChange("name", e.target.value)} required />
                </div>
              </div>

              <div className="input-group">
                <label style={{ fontSize: "13px", fontWeight: "700", color: "var(--secondary)" }}>Email Address</label>
                <div className="input-icon-wrapper">
                  <input type="email" placeholder="e.g. jane@student.edu" value={studentData.email}
                    onChange={(e) => handleStudentFieldChange("email", e.target.value)} required />
                </div>
              </div>

              <div className="input-group">
                <label style={{ fontSize: "13px", fontWeight: "700", color: "var(--secondary)" }}>Auto-Generated Password</label>
                <div className="input-icon-wrapper">
                  <input type="text" placeholder="Password"
                    style={{ backgroundColor: "rgba(0,0,0,0.02)", color: "var(--secondary)", fontWeight: "600" }}
                    value={studentData.password}
                    onChange={(e) => setStudentData({ ...studentData, password: e.target.value })}
                    required />
                </div>
              </div>

              <div className="input-group">
                <label style={{ fontSize: "13px", fontWeight: "700", color: "var(--secondary)" }}>Enroll in Subject (Optional)</label>
                <select value={studentSubject} onChange={(e) => setStudentSubject(e.target.value)} className="custom-select">
                  <option value="">-- Do not enroll yet --</option>
                  {subjects.map((s) => <option key={s._id} value={s._id}>{s.name}</option>)}
                </select>
              </div>

              <button type="submit" className="primary-btn pulse-btn" style={{ padding: "16px", marginTop: "8px" }}>
                Register Student
              </button>
            </form>
          </section>

          {/* ────── RIGHT: Enroll Existing Student ────── */}
          <section className="stat-card" style={{ borderTop: "5px solid #3B82F6" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "6px" }}>
              <div style={{
                width: 36, height: 36, borderRadius: "50%",
                background: "rgba(59,130,246,0.1)",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <span style={{ fontSize: "18px" }}>🎓</span>
              </div>
              <h4 style={{ margin: 0, fontSize: "20px", fontWeight: "700", color: "var(--primary)" }}>
                Enroll Existing Student
              </h4>
            </div>
            <p style={{ fontSize: "13px", color: "var(--text-muted)", marginTop: "4px", marginBottom: "24px" }}>
              Look up a registered student by <strong>email</strong> (primary key) and add them to one of your subjects.
            </p>

            <form onSubmit={handleEnroll} style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
              <div className="input-group">
                <label style={{ fontSize: "13px", fontWeight: "700", color: "var(--secondary)" }}>
                  Student Email Address <span style={{ color: "var(--error)" }}>*</span>
                </label>
                <div className="input-icon-wrapper" style={{ position: "relative" }}>
                  <span style={{
                    position: "absolute", left: "14px", top: "50%", transform: "translateY(-50%)",
                    color: "var(--secondary)", opacity: 0.45, pointerEvents: "none",
                    display: "flex", alignItems: "center",
                  }}>
                    <SearchIcon />
                  </span>
                  <input
                    id="enroll-email"
                    type="email"
                    placeholder="e.g. jane@student.edu"
                    value={enrollEmail}
                    onChange={(e) => setEnrollEmail(e.target.value)}
                    required
                    style={{ paddingLeft: "40px" }}
                  />
                </div>
                <p style={{ margin: "4px 0 0", fontSize: "12px", color: "var(--text-muted)" }}>
                  Must match the email on the student's existing account exactly.
                </p>
              </div>

              <div className="input-group">
                <label style={{ fontSize: "13px", fontWeight: "700", color: "var(--secondary)" }}>
                  Select Subject <span style={{ color: "var(--error)" }}>*</span>
                </label>
                {subjects.length === 0 ? (
                  <div style={{
                    padding: "16px", borderRadius: "10px", textAlign: "center",
                    background: "rgba(0,0,0,0.03)", border: "1px dashed rgba(0,0,0,0.1)",
                    fontSize: "14px", color: "var(--text-muted)",
                  }}>
                    No subjects yet — create one first from the Control Panel.
                  </div>
                ) : (
                  <select
                    id="enroll-subject"
                    value={enrollSubjectId}
                    onChange={(e) => setEnrollSubjectId(e.target.value)}
                    className="custom-select"
                    required
                  >
                    <option value="" disabled>-- Choose a subject --</option>
                    {subjects.map((s) => (
                      <option key={s._id} value={s._id}>
                        {s.name} ({s.students.length} enrolled)
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* Preview strip */}
              {enrollEmail && enrollSubjectId && (
                <div style={{
                  padding: "12px 16px",
                  background: "rgba(59,130,246,0.05)",
                  border: "1px solid rgba(59,130,246,0.15)",
                  borderRadius: "10px", fontSize: "13px",
                  display: "flex", gap: "16px", flexWrap: "wrap",
                }}>
                  <span>📧 <strong>{enrollEmail}</strong></span>
                  <span>📚 <strong>{subjects.find(s => s._id === enrollSubjectId)?.name}</strong></span>
                </div>
              )}

              <button
                id="enroll-submit-btn"
                type="submit"
                className="primary-btn pulse-btn"
                disabled={enrollLoading || subjects.length === 0}
                style={{
                  padding: "16px", marginTop: "8px",
                  background: "#3B82F6",
                  display: "flex", alignItems: "center", justifyContent: "center", gap: "8px",
                }}
              >
                {enrollLoading ? (
                  <>
                    <span style={{
                      width: "16px", height: "16px", borderRadius: "50%",
                      border: "2px solid rgba(255,255,255,0.4)",
                      borderTopColor: "white", display: "inline-block",
                      animation: "spin 0.7s linear infinite",
                    }} />
                    Enrolling…
                  </>
                ) : (
                  <><CheckIcon /> Enroll Student</>
                )}
              </button>
            </form>

            {/* ── Result cards (inside right panel) ── */}
            {enrollResult && (
              <div style={{
                marginTop: "20px",
                padding: "16px", borderRadius: "12px",
                background: "rgba(16,185,129,0.06)",
                border: "1px solid rgba(16,185,129,0.25)",
                animation: "fadeSlideIn 0.35s ease",
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "12px" }}>
                  <span style={{ fontSize: "22px" }}>✅</span>
                  <div>
                    <p style={{ margin: 0, fontWeight: "700", fontSize: "15px", color: "var(--primary)" }}>
                      Enrolled Successfully
                    </p>
                    <p style={{ margin: 0, fontSize: "12px", color: "var(--text-muted)" }}>
                      {enrollResult.message}
                    </p>
                  </div>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", fontSize: "13px" }}>
                  <div>
                    <p style={{ margin: "0 0 2px", fontSize: "11px", fontWeight: "700", color: "var(--secondary)", textTransform: "uppercase", letterSpacing: "0.5px" }}>Name</p>
                    <p style={{ margin: 0, fontWeight: "600", color: "var(--primary)" }}>{enrollResult.student.name}</p>
                  </div>
                  <div>
                    <p style={{ margin: "0 0 2px", fontSize: "11px", fontWeight: "700", color: "var(--secondary)", textTransform: "uppercase", letterSpacing: "0.5px" }}>Subject</p>
                    <p style={{ margin: 0, fontWeight: "600", color: "#10B981" }}>{enrollResult.subject.name}</p>
                  </div>
                </div>
              </div>
            )}

            {enrollNotFound && (
              <div style={{
                marginTop: "20px",
                padding: "14px 16px", borderRadius: "12px",
                background: "rgba(239,68,68,0.05)",
                border: "1px solid rgba(239,68,68,0.2)",
                animation: "fadeSlideIn 0.35s ease",
                display: "flex", alignItems: "flex-start", gap: "10px",
              }}>
                <span style={{ fontSize: "20px", flexShrink: 0 }}>🔍</span>
                <div style={{ fontSize: "13px" }}>
                  <p style={{ margin: "0 0 4px", fontWeight: "700", color: "var(--primary)" }}>No account found</p>
                  <p style={{ margin: 0, color: "var(--text-muted)" }}>
                    <code style={{ background: "rgba(0,0,0,0.06)", padding: "2px 6px", borderRadius: "4px" }}>
                      {enrollNotFound}
                    </code>{" "}
                    doesn't match any student. Check the email or use Register New Student.
                  </p>
                </div>
              </div>
            )}
          </section>
        </div>

        {/* ── SUCCESS MODAL (Register New Student) ── */}
        {showModal && createdStudent && (
          <div style={{
            position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: "rgba(0,0,0,0.5)", display: "flex",
            justifyContent: "center", alignItems: "center",
            zIndex: 1000, backdropFilter: "blur(5px)",
          }}>
            <div className="stat-card" style={{ maxWidth: "400px", width: "90%", borderTop: "5px solid var(--secondary)", textAlign: "center" }}>
              <div style={{ fontSize: "50px", marginBottom: "10px" }}>✅</div>
              <h3 style={{ margin: "0 0 10px 0" }}>Student Created!</h3>
              <p style={{ fontSize: "14px", color: "var(--text-muted)", marginBottom: "20px" }}>
                Share these credentials with the student.
              </p>
              <div style={{
                backgroundColor: "#F9FAFB", padding: "15px", borderRadius: "10px",
                textAlign: "left", marginBottom: "20px", border: "1px solid rgba(0,0,0,0.05)",
              }}>
                <p style={{ margin: "5px 0", fontSize: "14px" }}><strong>Name:</strong> {createdStudent.name}</p>
                <p style={{ margin: "5px 0", fontSize: "14px" }}><strong>Email:</strong> {createdStudent.email}</p>
                <p style={{ margin: "5px 0", fontSize: "14px" }}>
                  <strong>Password:</strong>{" "}
                  <code style={{ color: "var(--primary)", fontWeight: "bold" }}>{createdStudent.password}</code>
                </p>
                <p style={{ margin: "5px 0", fontSize: "14px" }}><strong>Subject:</strong> {createdStudent.subject}</p>
              </div>
              <button className="primary-btn pulse-btn" onClick={() => setShowModal(false)} style={{ width: "100%", margin: 0 }}>
                Got it, Dismiss
              </button>
            </div>
          </div>
        )}

        <style>{`
          @keyframes fadeSlideIn {
            from { opacity: 0; transform: translateY(10px); }
            to   { opacity: 1; transform: translateY(0); }
          }
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
      </main>
    </div>
  );
};

export default EnrollStudent;
