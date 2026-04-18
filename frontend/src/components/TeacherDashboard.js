import React, { useState, useEffect, useContext, useCallback, useRef } from "react";
import * as XLSX from "xlsx";
import { AuthContext } from "../context/AuthContext";
import { useToast } from "./Toast";
import api from "../api";
import TeacherDirectory from "./TeacherDirectory";

// ── Helpers ──────────────────────────────────────────────────────────────────

const confidenceLabel = (dist) => {
  if (dist == null) return { label: "N/A", color: "#9CA3AF", pct: 0 };
  const pct = Math.max(0, Math.round((1 - dist / 0.6) * 100));
  if (dist < 0.25) return { label: "Excellent", color: "#10B981", pct };
  if (dist < 0.40) return { label: "Good",      color: "#3B82F6", pct };
  if (dist < 0.55) return { label: "Fair",       color: "#F59E0B", pct };
  return               { label: "Low",           color: "#EF4444", pct };
};

/** Export full attendance report to an .xlsx file */
const exportToExcel = (report, subjectName) => {
  const wb = XLSX.utils.book_new();

  // ── Sheet 1: Summary ──
  const summaryData = [
    ["Subject", subjectName],
    ["Total Sessions", report.totalWindows],
    ["Exported At", new Date().toLocaleString()],
    [],
    ["Session #", "Start Time", "End Time", "Students Present"],
    ...report.report.map((w, i) => [
      `Session ${report.totalWindows - i}`,
      new Date(w.startTime).toLocaleString(),
      new Date(w.endTime).toLocaleString(),
      w.count,
    ]),
  ];
  const ws1 = XLSX.utils.aoa_to_sheet(summaryData);
  ws1["!cols"] = [{ wch: 18 }, { wch: 24 }, { wch: 24 }, { wch: 18 }];
  XLSX.utils.book_append_sheet(wb, ws1, "Summary");

  // ── Sheet 2: Detailed Attendance ──
  const detailRows = [["Session #", "Session Date", "Student Name", "Email", "Match Quality", "Match %", "Reviewed At"]];
  report.report.forEach((w, i) => {
    w.attendees.forEach((a) => {
      const c = confidenceLabel(a.confidence);
      detailRows.push([
        `Session ${report.totalWindows - i}`,
        new Date(w.startTime).toLocaleDateString(),
        a.name,
        a.email,
        c.label,
        `${c.pct}%`,
        a.reviewedAt ? new Date(a.reviewedAt).toLocaleString() : "—",
      ]);
    });
  });
  const ws2 = XLSX.utils.aoa_to_sheet(detailRows);
  ws2["!cols"] = [{ wch: 12 }, { wch: 16 }, { wch: 22 }, { wch: 28 }, { wch: 14 }, { wch: 10 }, { wch: 22 }];
  XLSX.utils.book_append_sheet(wb, ws2, "Detailed Attendance");

  XLSX.writeFile(wb, `${subjectName.replace(/\s+/g, "_")}_Attendance.xlsx`);
};

// ── Component ─────────────────────────────────────────────────────────────────

const TeacherDashboard = () => {
  const { user } = useContext(AuthContext);
  const toast = useToast();

  const [activeTab, setActiveTab] = useState("dashboard"); // 'dashboard' | 'directory'
  const [subjects, setSubjects] = useState([]);
  const [newSubject, setNewSubject] = useState("");
  const [windowSubject, setWindowSubject] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");

  const passSuffixRef = useRef(
    Math.random().toString(36).slice(-5).toUpperCase() + Math.floor(Math.random() * 99)
  );
  const [studentData, setStudentData] = useState({ name: "", email: "", password: "" });
  const [studentSubject, setStudentSubject] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [createdStudent, setCreatedStudent] = useState(null);

  // Report state
  const [reportSubjectId, setReportSubjectId] = useState("");
  const [report, setReport] = useState(null);
  const [reportLoading, setReportLoading] = useState(false);
  const [expandedWindow, setExpandedWindow] = useState(null);

  // Pending approval state
  const [pendingSubjectId, setPendingSubjectId] = useState("");
  const [pendingRecords, setPendingRecords] = useState([]);
  const [pendingLoading, setPendingLoading] = useState(false);
  const [reviewingId, setReviewingId] = useState(null);

  // ── Helpers ───────────────────────────────────────────────────────────────
  const handleStudentFieldChange = (field, value) => {
    let newPass = studentData.password;
    if (field === "name" && value.trim().length > 0) {
      const first = value.trim().split(" ")[0];
      const pretty = first.charAt(0).toUpperCase() + first.slice(1).toLowerCase();
      newPass = `${pretty}-${passSuffixRef.current}`;
    } else if (field === "name" && value.trim().length === 0) {
      newPass = "";
    }
    setStudentData({ ...studentData, [field]: value, password: newPass });
  };

  // ── Data fetching ─────────────────────────────────────────────────────────
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

  const fetchPending = useCallback(async (subjectId) => {
    if (!subjectId) return;
    setPendingLoading(true);
    try {
      const res = await api.get(`/teacher/pending-attendance/${subjectId}`);
      setPendingRecords(res.data);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to load pending records");
    } finally {
      setPendingLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user.token]);

  useEffect(() => {
    fetchPending(pendingSubjectId);
    const interval = setInterval(() => fetchPending(pendingSubjectId), 15000);
    return () => clearInterval(interval);
  }, [pendingSubjectId, fetchPending]);

  // ── Actions ───────────────────────────────────────────────────────────────
  const handleCreateSubject = async (e) => {
    e.preventDefault();
    try {
      await api.post("/teacher/create-subject", { name: newSubject });
      setNewSubject("");
      fetchSubjects();
      toast.success("Subject created!");
    } catch (err) {
      toast.error(err.response?.data?.message || "Error creating subject");
    }
  };

  const handleCreateStudent = async (e) => {
    e.preventDefault();
    try {
      await api.post("/teacher/create-student", studentData);
      if (studentSubject) {
        await api.post("/teacher/add-students", { subjectId: studentSubject, studentEmail: studentData.email });
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

  const handleSetWindow = async (e) => {
    e.preventDefault();
    try {
      await api.post("/teacher/set-window", { subjectId: windowSubject, startTime, endTime });
      toast.success("Attendance window activated! Students notified.");
      setWindowSubject("");
      setStartTime("");
      setEndTime("");
    } catch (err) {
      toast.error(err.response?.data?.message || "Error setting window");
    }
  };

  const handleFetchReport = async (subjectId) => {
    if (!subjectId) return toast.warn("Please select a subject first");
    setReportLoading(true);
    setReport(null);
    setExpandedWindow(null);
    try {
      const res = await api.get(`/teacher/attendance/${subjectId}`);
      setReport(res.data);
    } catch (err) {
      toast.error(err.response?.data?.message || "Error loading report");
    } finally {
      setReportLoading(false);
    }
  };

  const handleApprove = async (attendanceId) => {
    setReviewingId(attendanceId);
    try {
      await api.put(`/teacher/approve-attendance/${attendanceId}`);
      toast.success("✅ Attendance approved — student marked present!");
      fetchPending(pendingSubjectId);
    } catch (err) {
      toast.error(err.response?.data?.message || "Error approving attendance");
    } finally {
      setReviewingId(null);
    }
  };

  const handleReject = async (attendanceId) => {
    setReviewingId(attendanceId);
    try {
      await api.put(`/teacher/reject-attendance/${attendanceId}`);
      toast.warn("❌ Attendance rejected — student marked absent.");
      fetchPending(pendingSubjectId);
    } catch (err) {
      toast.error(err.response?.data?.message || "Error rejecting attendance");
    } finally {
      setReviewingId(null);
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div style={{ paddingBottom: "40px" }}>
      {/* ── HEADER & NAVIGATION TABS ── */}
      <div style={{ marginBottom: "30px" }}>
        <h2 style={{ color: "var(--primary)", margin: "0 0 5px 0", fontSize: "28px", fontWeight: "700", letterSpacing: "-0.5px" }}>
          Teacher Workspace
        </h2>
        <p style={{ color: "var(--secondary)", margin: 0, fontSize: "15px" }}>
          Manage your classes, approve pending attendance, and view comprehensive reports.
        </p>
      </div>

      <div style={{ display: "flex", gap: "10px", marginBottom: "30px", borderBottom: "1px solid rgba(0,0,0,0.1)", paddingBottom: "15px", overflowX: "auto" }}>
        <button 
          onClick={() => setActiveTab("dashboard")}
          style={{ 
            padding: "10px 24px", borderRadius: "12px", border: "none", cursor: "pointer", fontSize: "15px", fontWeight: "600",
            background: activeTab === "dashboard" ? "var(--primary)" : "transparent",
            color: activeTab === "dashboard" ? "white" : "var(--secondary)",
            transition: "0.2s", whiteSpace: "nowrap"
          }}
        >
          Control Panel
        </button>
        <button 
          onClick={() => setActiveTab("directory")}
          style={{ 
            padding: "10px 24px", borderRadius: "12px", border: "none", cursor: "pointer", fontSize: "15px", fontWeight: "600",
            background: activeTab === "directory" ? "var(--primary)" : "transparent",
            color: activeTab === "directory" ? "white" : "var(--secondary)",
            transition: "0.2s", whiteSpace: "nowrap"
          }}
        >
          📋 Student Directory & Logs
        </button>
        <button 
          onClick={() => setActiveTab("report")}
          style={{ 
            padding: "10px 24px", borderRadius: "12px", border: "none", cursor: "pointer", fontSize: "15px", fontWeight: "600",
            background: activeTab === "report" ? "var(--primary)" : "transparent",
            color: activeTab === "report" ? "white" : "var(--secondary)",
            transition: "0.2s", whiteSpace: "nowrap"
          }}
        >
          📊 Historical Attendance Report
        </button>
      </div>

      {/* ── SUCCESS MODAL ── */}
      {showModal && createdStudent && (
        <div style={{
          position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: "rgba(0,0,0,0.5)", display: "flex",
          justifyContent: "center", alignItems: "center",
          zIndex: 1000, backdropFilter: "blur(5px)",
        }}>
          <div className="stat-card" style={{ maxWidth: "400px", borderTop: "5px solid var(--secondary)", textAlign: "center" }}>
            <div style={{ fontSize: "50px", marginBottom: "10px" }}>✅</div>
            <h3 style={{ margin: "0 0 10px 0" }}>Student Created!</h3>
            <p style={{ fontSize: "14px", color: "var(--text-muted)", marginBottom: "20px" }}>
              Share these credentials with the student.
            </p>
            <div style={{ backgroundColor: "#F9FAFB", padding: "15px", borderRadius: "10px", textAlign: "left", marginBottom: "20px", border: "1px solid rgba(0,0,0,0.05)" }}>
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

      {/* ── CONDITIONAL RENDER: DIRECTORY ── */}
      {activeTab === "directory" && (
        <TeacherDirectory />
      )}

      {/* ── CONDITIONAL RENDER: CONTROL PANEL ── */}
      {activeTab === "dashboard" && (
        <>
          {/* ── PENDING APPROVALS ── */}
          <section className="stat-card" style={{
            marginBottom: "30px",
            borderLeft: "6px solid #F59E0B",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "6px" }}>
              <div style={{ width: 36, height: 36, borderRadius: "50%", background: "rgba(245,158,11,0.1)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <span style={{ fontSize: "18px" }}>🔍</span>
              </div>
              <h4 style={{ margin: 0, fontSize: "20px", fontWeight: "700" }}>Pending Attendance Approvals</h4>
              {pendingRecords.length > 0 && (
                <span style={{
                  backgroundColor: "#EF4444", color: "white",
                  borderRadius: "20px", padding: "2px 8px",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: "12px", fontWeight: "700",
                }}>
                  {pendingRecords.length}
                </span>
              )}
            </div>
            <p style={{ fontSize: "14px", color: "var(--text-muted)", marginTop: "4px", marginBottom: "12px" }}>
              Students have submitted face + liveness verified requests. Review and action them.
            </p>

            {/* 40% confidence gate info banner */}
            <div style={{
              display: "flex", alignItems: "flex-start", gap: "10px",
              padding: "12px 16px", marginBottom: "20px",
              background: "rgba(245,158,11,0.08)",
              border: "1px solid rgba(245,158,11,0.3)",
              borderRadius: "10px", fontSize: "13px", color: "#78350F",
            }}>
              <span style={{ fontSize: "16px", flexShrink: 0 }}>🔒</span>
              <span>
                <strong>Auto-filter active:</strong> Only submissions with a face-match confidence of{" "}
                <strong>≥ 40%</strong> reach this queue. Lower-confidence detections are automatically
                discarded and the student is asked to retry — so every record here has already passed
                the minimum quality bar.
              </span>
            </div>

            <div style={{ display: "flex", gap: "12px", marginBottom: "20px", flexWrap: "wrap", alignItems: "stretch" }}>
              <div style={{ flex: 1, minWidth: "180px", position: "relative" }}>
                 <select
                  value={pendingSubjectId}
                  onChange={(e) => setPendingSubjectId(e.target.value)}
                  className="custom-select"
                >
                  <option value="" disabled>Select subject to review...</option>
                  {subjects.map((s) => <option key={s._id} value={s._id}>{s.name}</option>)}
                </select>
              </div>
              <button
                onClick={() => fetchPending(pendingSubjectId)}
                disabled={!pendingSubjectId || pendingLoading}
                className="primary-btn"
                style={{ padding: "14px 20px", margin: 0, backgroundColor: "#F59E0B", width: "auto" }}
              >
                {pendingLoading ? "Refreshing…" : "↻ Refresh"}
              </button>
            </div>

            {pendingSubjectId && !pendingLoading && pendingRecords.length === 0 && (
              <div style={{
                textAlign: "center", padding: "40px", color: "var(--text-muted)",
                border: "2px dashed rgba(0,0,0,0.1)", borderRadius: "16px",
                background: "var(--card-bg)"
              }}>
                <div style={{ fontSize: "36px", marginBottom: "12px" }}>🎉</div>
                <p style={{ margin: 0, fontSize: "16px", fontWeight: "500" }}>No pending submissions for this subject. All caught up!</p>
              </div>
            )}

            {pendingRecords.length > 0 && (
              <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                {pendingRecords.map((rec) => {
                  const conf = confidenceLabel(rec.confidence);
                  const isProcessing = reviewingId === rec._id;
                  return (
                    <div key={rec._id} className="directory-item" style={{
                      padding: "20px", border: "1px solid rgba(0,0,0,0.05)",
                      borderLeft: `4px solid ${conf.color}`,
                      opacity: isProcessing ? 0.6 : 1, transition: "opacity 0.2s",
                      flexWrap: "wrap"
                    }}>
                      <div className="avatar-large" style={{ backgroundColor: conf.color + "22", color: conf.color }}>
                        {rec.student?.name ? rec.student.name.charAt(0).toUpperCase() : "👤"}
                      </div>

                      <div style={{ flex: 1, minWidth: "160px" }}>
                        <p style={{ margin: 0, fontWeight: "700", fontSize: "16px", color: "var(--primary)" }}>
                          {rec.student?.name || "Unknown"}
                        </p>
                        <p style={{ margin: "2px 0 0", fontSize: "13px", color: "var(--secondary)" }}>{rec.student?.email}</p>
                        <p style={{ margin: "4px 0 0", fontSize: "12px", color: "var(--text-muted)" }}>
                          Submitted: {new Date(rec.createdAt).toLocaleString()}
                        </p>
                      </div>

                      <div style={{ minWidth: "140px", fontSize: "13px", color: "var(--text-muted)" }}>
                        <p style={{ margin: 0, fontWeight: "600", color: "var(--primary)" }}>Session Window</p>
                        <p style={{ margin: "4px 0" }}>
                          {rec.window
                            ? `${new Date(rec.window.startTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} – ${new Date(rec.window.endTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`
                            : "—"}
                        </p>
                        {rec.livenessVerified && (
                          <span style={{ color: "#10B981", fontSize: "12px", fontWeight: "700", background: "rgba(16,185,129,0.1)", padding: "2px 8px", borderRadius: "12px" }}>
                            ✓ Liveness Verified
                          </span>
                        )}
                      </div>

                      <div style={{ textAlign: "center", minWidth: "100px" }}>
                        <div style={{
                          backgroundColor: conf.color + "18",
                          border: `1px solid ${conf.color}44`,
                          borderRadius: "12px", padding: "10px 16px",
                        }}>
                          <p style={{ margin: 0, fontSize: "22px", fontWeight: "700", color: conf.color }}>{conf.pct}%</p>
                          <p style={{ margin: 0, fontSize: "12px", fontWeight: "700", color: conf.color }}>{conf.label}</p>
                        </div>
                      </div>

                      <div style={{ display: "flex", gap: "10px", flexShrink: 0 }}>
                        <button onClick={() => handleApprove(rec._id)} disabled={isProcessing}
                          style={{ padding: "12px 20px", backgroundColor: "#10B981", color: "white", border: "none", borderRadius: "12px", cursor: "pointer", fontWeight: "600", fontSize: "14px" }}>
                          ✓ Approve
                        </button>
                        <button onClick={() => handleReject(rec._id)} disabled={isProcessing}
                          style={{ padding: "12px 20px", backgroundColor: "white", color: "#EF4444", border: "1px solid #EF4444", borderRadius: "12px", cursor: "pointer", fontWeight: "600", fontSize: "14px" }}>
                          ✕ Reject
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          {/* ── MAIN GRID ── */}
          <div className="dashboard-grid">
            {/* LEFT */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
              <section className="stat-card">
                <h4 style={{ margin: "0 0 6px 0", fontSize: "20px", fontWeight: "700", color: "var(--primary)" }}>📝 Create New Subject</h4>
                 <p style={{ fontSize: "13px", color: "var(--text-muted)", marginTop: "0", marginBottom: "20px" }}>
                  Establish a new class for attendance tracking.
                </p>
                <form onSubmit={handleCreateSubject} style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
                  <div className="input-group">
                    <label style={{ fontSize: "13px", fontWeight: "700", color: "var(--secondary)" }}>Subject Name</label>
                    <div className="input-icon-wrapper">
                      <input type="text" placeholder="e.g. Computer Science 101"
                        value={newSubject} onChange={(e) => setNewSubject(e.target.value)} required />
                    </div>
                  </div>
                  <button type="submit" className="primary-btn pulse-btn" style={{ padding: "16px", marginTop: "4px" }}>
                    Create Subject
                  </button>
                </form>
              </section>

              <section className="stat-card">
                <h4 style={{ margin: "0 0 6px 0", fontSize: "20px", fontWeight: "700", color: "var(--primary)" }}>👤 Register New Student</h4>
                <p style={{ fontSize: "13px", color: "var(--text-muted)", marginTop: "0", marginBottom: "24px" }}>
                  Credentials will be generated securely.
                </p>
                <form onSubmit={handleCreateStudent} style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
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
                        style={{ backgroundColor: "rgba(0,0,0,0.02)", color: "var(--secondary)", fontWeight: "600" }} value={studentData.password}
                        onChange={(e) => setStudentData({ ...studentData, password: e.target.value })} required />
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
            </div>

            {/* RIGHT */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
              <section className="stat-card" style={{ borderLeft: "6px solid var(--success)" }}>
                <h4 style={{ margin: "0 0 20px 0", fontSize: "20px", fontWeight: "700", color: "var(--primary)" }}>⏱ Open Attendance Window</h4>
                <form onSubmit={handleSetWindow} className="auth-form" style={{ gap: "20px" }}>
                  <div className="input-group">
                    <select value={windowSubject} onChange={(e) => setWindowSubject(e.target.value)} className="custom-select" required>
                      <option value="" disabled>Select Subject</option>
                      {subjects.map((s) => <option key={s._id} value={s._id}>{s.name}</option>)}
                    </select>
                  </div>
                  <div className="input-group">
                    <label style={{ fontSize: "13px" }}>Start Time</label>
                    <div className="input-icon-wrapper">
                       <input type="datetime-local" value={startTime} onChange={(e) => setStartTime(e.target.value)} required />
                    </div>
                  </div>
                  <div className="input-group">
                    <label style={{ fontSize: "13px" }}>End Time</label>
                    <div className="input-icon-wrapper">
                      <input type="datetime-local" value={endTime} onChange={(e) => setEndTime(e.target.value)} required />
                    </div>
                  </div>
                  <button type="submit" className="primary-btn pulse-btn" style={{ padding: "16px", marginTop: "10px", backgroundColor: "var(--success)" }}>
                    Activate Window Now
                  </button>
                </form>
              </section>

              <section className="stat-card">
                <h4 style={{ margin: "0 0 15px 0", fontSize: "20px", fontWeight: "700", color: "var(--primary)" }}>📚 My Subjects Overview</h4>
                <ul style={{ padding: "0", margin: "0", listStyle: "none" }}>
                  {subjects.length === 0 && (
                    <div style={{ padding: "30px", textAlign: "center", background: "var(--card-bg)", borderRadius: "12px" }}>
                      <p style={{ fontSize: "14px", color: "var(--text-muted)", margin: 0 }}>No subjects created yet.</p>
                    </div>
                  )}
                  {subjects.map((s) => (
                    <li key={s._id} style={{
                      padding: "16px 20px", backgroundColor: "var(--card-bg)",
                      borderRadius: "12px", marginBottom: "12px", border: "1px solid rgba(0,0,0,0.05)",
                      display: "flex", justifyContent: "space-between", alignItems: "center"
                    }}>
                      <strong style={{ display: "block", color: "var(--primary)", fontSize: "16px" }}>{s.name}</strong>
                      <span style={{ fontSize: "13px", color: "var(--secondary)", fontWeight: "600", background: "rgba(107,91,97,0.1)", padding: "4px 10px", borderRadius: "12px" }}>
                        {s.students.length} Enrolled
                      </span>
                    </li>
                  ))}
                </ul>
              </section>
            </div>
          </div>
        </>
      )}
          
      {/* ── CONDITIONAL RENDER: HISTORICAL ATTENDANCE REPORT ── */}
      {activeTab === "report" && (
        <section className="stat-card" style={{ borderLeft: "6px solid var(--primary)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px", flexWrap: "wrap", gap: "10px" }}>
              <h4 style={{ margin: 0, fontSize: "20px", fontWeight: "700", color: "var(--primary)" }}>📋 Historical Attendance Report</h4>
              {report && (
                <button
                  onClick={() => exportToExcel(report, report.subjectName)}
                  className="primary-btn"
                  style={{ display: "flex", alignItems: "center", gap: "6px", padding: "10px 16px", backgroundColor: "var(--success)", margin: 0, width: "auto" }}
                >
                  ⬇ Export to Excel
                </button>
              )}
            </div>
            <p style={{ fontSize: "14px", color: "var(--text-muted)", marginTop: 0, marginBottom: "20px" }}>
              Select a subject to see confirmed attendance records per session.
            </p>

            <div style={{ display: "flex", gap: "12px", marginBottom: "20px", flexWrap: "wrap" }}>
              <select value={reportSubjectId} onChange={(e) => setReportSubjectId(e.target.value)} className="custom-select" style={{ flex: 1 }}>
                <option value="" disabled>Select Subject</option>
                {subjects.map((s) => <option key={s._id} value={s._id}>{s.name}</option>)}
              </select>
              <button onClick={() => handleFetchReport(reportSubjectId)} disabled={reportLoading} className="primary-btn pulse-btn" style={{ padding: "14px 24px", margin: 0, width: "auto" }}>
                {reportLoading ? "Loading..." : "View Report"}
              </button>
            </div>

            {report && (
              <div>
                <p style={{ fontSize: "15px", marginBottom: "15px", fontWeight: "600", color: "var(--primary)" }}>
                  {report.subjectName} — {report.totalWindows} session(s) held
                </p>
                {report.report.length === 0 && (
                  <p style={{ fontSize: "14px", color: "var(--text-muted)" }}>No sessions recorded yet.</p>
                )}
                {report.report.map((w, i) => (
                  <div key={w.windowId} style={{ border: "1px solid rgba(0,0,0,0.05)", borderRadius: "12px", marginBottom: "12px", overflow: "hidden" }}>
                    <button
                      onClick={() => setExpandedWindow(expandedWindow === w.windowId ? null : w.windowId)}
                      style={{
                        width: "100%", display: "flex", justifyContent: "space-between",
                        alignItems: "center", padding: "16px 20px", background: "var(--card-bg)", border: "none", cursor: "pointer",
                        fontSize: "15px", fontWeight: "600", color: "var(--primary)",
                      }}
                    >
                      <span>
                        Session {report.totalWindows - i} &nbsp;·&nbsp;{" "}
                        {new Date(w.startTime).toLocaleString()} → {new Date(w.endTime).toLocaleTimeString()}
                      </span>
                      <span style={{ backgroundColor: w.count > 0 ? "rgba(16,185,129,0.15)" : "rgba(239,68,68,0.1)", color: w.count > 0 ? "var(--success)" : "var(--error)", borderRadius: "20px", padding: "4px 12px", fontSize: "12px", fontWeight: "700" }}>
                        {w.count} present &nbsp;{expandedWindow === w.windowId ? "▲" : "▼"}
                      </span>
                    </button>

                    {expandedWindow === w.windowId && (
                      <div style={{ padding: "16px 20px", borderTop: "1px solid rgba(0,0,0,0.05)", overflowX: "auto" }}>
                        {w.attendees.length === 0 ? (
                          <p style={{ margin: 0, fontSize: "14px", color: "var(--text-muted)" }}>No confirmed attendance for this session.</p>
                        ) : (
                          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "14px", minWidth: "500px" }}>
                            <thead>
                              <tr style={{ color: "var(--secondary)", textAlign: "left" }}>
                                <th style={{ paddingBottom: "12px", fontWeight: "600" }}>#</th>
                                <th style={{ paddingBottom: "12px", fontWeight: "600" }}>Name</th>
                                <th style={{ paddingBottom: "12px", fontWeight: "600" }}>Email</th>
                                <th style={{ paddingBottom: "12px", fontWeight: "600" }}>Match Conf.</th>
                                <th style={{ paddingBottom: "12px", fontWeight: "600" }}>Reviewed At</th>
                              </tr>
                            </thead>
                            <tbody>
                              {w.attendees.map((a, idx) => {
                                const c = confidenceLabel(a.confidence);
                                return (
                                  <tr key={idx} style={{ borderTop: "1px solid rgba(0,0,0,0.05)" }}>
                                    <td style={{ padding: "12px 0", color: "var(--text-muted)" }}>{idx + 1}</td>
                                    <td style={{ padding: "12px 0", fontWeight: "600", color: "var(--primary)" }}>{a.name}</td>
                                    <td style={{ padding: "12px 0", color: "var(--text-muted)" }}>{a.email}</td>
                                    <td style={{ padding: "12px 4px" }}>
                                      <span style={{ color: c.color, fontWeight: "700", fontSize: "12px", backgroundColor: c.color + "18", padding: "4px 10px", borderRadius: "12px" }}>
                                        {c.label} ({c.pct}%)
                                      </span>
                                    </td>
                                    <td style={{ padding: "12px 0", color: "var(--text-muted)" }}>{a.reviewedAt ? new Date(a.reviewedAt).toLocaleTimeString() : "—"}</td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </section>
      )}
    </div>
  );
};

export default TeacherDashboard;