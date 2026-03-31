import React, { useState, useEffect, useContext, useCallback, useRef } from "react";
import * as XLSX from "xlsx";
import { AuthContext } from "../context/AuthContext";
import { useToast } from "./Toast";
import api from "../api";

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
    <div style={{ maxWidth: "1100px", margin: "0 auto", padding: "20px" }}>
      <h2 style={{ color: "var(--primary)" }}>Teacher Dashboard</h2>
      <p style={{ color: "var(--text-muted)", marginBottom: "30px" }}>
        Manage your classes, register students, open attendance sessions, and review face-verified submissions.
      </p>

      {/* ── SUCCESS MODAL ── */}
      {showModal && createdStudent && (
        <div style={{
          position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: "rgba(0,0,0,0.5)", display: "flex",
          justifyContent: "center", alignItems: "center",
          zIndex: 1000, backdropFilter: "blur(5px)",
        }}>
          <div className="auth-card" style={{ maxWidth: "400px", borderTop: "5px solid var(--secondary)", textAlign: "center" }}>
            <div style={{ fontSize: "50px", marginBottom: "10px" }}>✅</div>
            <h3 style={{ margin: "0 0 10px 0" }}>Student Created!</h3>
            <p style={{ fontSize: "14px", color: "var(--text-muted)", marginBottom: "20px" }}>
              Share these credentials with the student.
            </p>
            <div style={{ backgroundColor: "#F3F4F6", padding: "15px", borderRadius: "10px", textAlign: "left", marginBottom: "20px" }}>
              <p style={{ margin: "5px 0", fontSize: "14px" }}><strong>Name:</strong> {createdStudent.name}</p>
              <p style={{ margin: "5px 0", fontSize: "14px" }}><strong>Email:</strong> {createdStudent.email}</p>
              <p style={{ margin: "5px 0", fontSize: "14px" }}>
                <strong>Password:</strong>{" "}
                <code style={{ color: "var(--primary)", fontWeight: "bold" }}>{createdStudent.password}</code>
              </p>
              <p style={{ margin: "5px 0", fontSize: "14px" }}><strong>Subject:</strong> {createdStudent.subject}</p>
            </div>
            <button className="primary-btn" onClick={() => setShowModal(false)} style={{ width: "100%", margin: 0 }}>
              Got it, Dismiss
            </button>
          </div>
        </div>
      )}

      {/* ── PENDING APPROVALS ── */}
      <section className="auth-card teacher-pending-section" style={{
        padding: "25px", marginBottom: "30px",
        borderTop: "4px solid #F59E0B",
        background: "linear-gradient(135deg, #FFFBEB 0%, #ffffff 100%)",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "6px" }}>
          <span style={{ fontSize: "24px" }}>🔍</span>
          <h4 style={{ margin: 0, fontSize: "18px" }}>Pending Attendance Approvals</h4>
          {pendingRecords.length > 0 && (
            <span style={{
              backgroundColor: "#EF4444", color: "white",
              borderRadius: "50%", width: "22px", height: "22px",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: "12px", fontWeight: "700",
            }}>
              {pendingRecords.length}
            </span>
          )}
        </div>
        <p style={{ fontSize: "13px", color: "var(--text-muted)", marginTop: 0, marginBottom: "15px" }}>
          Students have submitted face + liveness verified requests. Review the confidence score and approve or reject.
        </p>

        <div style={{ display: "flex", gap: "12px", marginBottom: "20px", flexWrap: "wrap", alignItems: "center" }}>
          <select
            value={pendingSubjectId}
            onChange={(e) => setPendingSubjectId(e.target.value)}
            style={{ flex: 1, minWidth: "180px", padding: "10px 14px", borderRadius: "8px", border: "1px solid #E5E7EB", fontSize: "14px", background: "#F9FAFB" }}
          >
            <option value="">Select a subject to review</option>
            {subjects.map((s) => <option key={s._id} value={s._id}>{s.name}</option>)}
          </select>
          <button
            onClick={() => fetchPending(pendingSubjectId)}
            disabled={!pendingSubjectId || pendingLoading}
            className="primary-btn"
            style={{ padding: "10px 18px", margin: 0, backgroundColor: "#F59E0B", borderColor: "#F59E0B" }}
          >
            {pendingLoading ? "Refreshing…" : "↻ Refresh"}
          </button>
        </div>

        {pendingSubjectId && !pendingLoading && pendingRecords.length === 0 && (
          <div style={{
            textAlign: "center", padding: "30px", color: "var(--text-muted)",
            border: "2px dashed #E5E7EB", borderRadius: "10px",
          }}>
            <div style={{ fontSize: "32px", marginBottom: "8px" }}>🎉</div>
            <p style={{ margin: 0, fontSize: "14px" }}>No pending submissions. All caught up!</p>
          </div>
        )}

        {pendingRecords.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            {pendingRecords.map((rec) => {
              const conf = confidenceLabel(rec.confidence);
              const isProcessing = reviewingId === rec._id;
              return (
                <div key={rec._id} className="pending-card" style={{
                  display: "flex", alignItems: "center", gap: "16px",
                  padding: "16px 20px", backgroundColor: "white",
                  border: "1px solid #E5E7EB",
                  borderLeft: `4px solid ${conf.color}`,
                  borderRadius: "10px", flexWrap: "wrap",
                  opacity: isProcessing ? 0.6 : 1, transition: "opacity 0.2s",
                }}>
                  <div style={{
                    width: "44px", height: "44px", borderRadius: "50%",
                    backgroundColor: conf.color + "22",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: "18px", flexShrink: 0,
                  }}>👤</div>

                  <div style={{ flex: 1, minWidth: "160px" }}>
                    <p style={{ margin: 0, fontWeight: "600", fontSize: "15px", color: "var(--text-main)" }}>
                      {rec.student?.name || "Unknown"}
                    </p>
                    <p style={{ margin: "2px 0 0", fontSize: "12px", color: "var(--text-muted)" }}>{rec.student?.email}</p>
                    <p style={{ margin: "2px 0 0", fontSize: "11px", color: "var(--text-muted)" }}>
                      Submitted: {new Date(rec.createdAt).toLocaleString()}
                    </p>
                  </div>

                  <div style={{ minWidth: "140px", fontSize: "12px", color: "var(--text-muted)" }}>
                    <p style={{ margin: 0, fontWeight: "500" }}>Session window</p>
                    <p style={{ margin: "2px 0 0" }}>
                      {rec.window
                        ? `${new Date(rec.window.startTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} – ${new Date(rec.window.endTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`
                        : "—"}
                    </p>
                    {rec.livenessVerified && (
                      <span style={{ color: "#10B981", fontSize: "11px", fontWeight: "600" }}>
                        ✓ Liveness Verified
                      </span>
                    )}
                  </div>

                  <div style={{ textAlign: "center", minWidth: "90px" }}>
                    <div style={{
                      backgroundColor: conf.color + "18",
                      border: `1px solid ${conf.color}44`,
                      borderRadius: "8px", padding: "8px 14px",
                    }}>
                      <p style={{ margin: 0, fontSize: "20px", fontWeight: "700", color: conf.color }}>{conf.pct}%</p>
                      <p style={{ margin: 0, fontSize: "11px", fontWeight: "600", color: conf.color }}>{conf.label} Match</p>
                      <p style={{ margin: 0, fontSize: "10px", color: "var(--text-muted)" }}>
                        dist: {rec.confidence != null ? rec.confidence.toFixed(3) : "?"}
                      </p>
                    </div>
                  </div>

                  <div style={{ display: "flex", gap: "8px", flexShrink: 0 }}>
                    <button onClick={() => handleApprove(rec._id)} disabled={isProcessing}
                      style={{ padding: "9px 18px", backgroundColor: "#10B981", color: "white", border: "none", borderRadius: "8px", cursor: "pointer", fontWeight: "600", fontSize: "13px" }}>
                      ✓ Approve
                    </button>
                    <button onClick={() => handleReject(rec._id)} disabled={isProcessing}
                      style={{ padding: "9px 18px", backgroundColor: "white", color: "#EF4444", border: "1px solid #EF4444", borderRadius: "8px", cursor: "pointer", fontWeight: "600", fontSize: "13px" }}>
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
      <div className="teacher-main-grid">
        {/* LEFT */}
        <div>
          <section className="auth-card" style={{ padding: "25px", marginBottom: "30px", borderTop: "4px solid var(--secondary)" }}>
            <h4 style={{ margin: "0 0 15px 0", fontSize: "18px" }}>Create New Subject</h4>
            <form onSubmit={handleCreateSubject} className="auth-form" style={{ gap: "15px" }}>
              <div className="input-group">
                <input type="text" placeholder="e.g. Computer Science 101"
                  value={newSubject} onChange={(e) => setNewSubject(e.target.value)} required />
              </div>
              <button type="submit" className="primary-btn" style={{ padding: "10px", marginTop: "0" }}>
                Create Subject
              </button>
            </form>
          </section>

          <section className="auth-card" style={{ padding: "25px", borderTop: "4px solid var(--primary)" }}>
            <h4 style={{ margin: "0 0 5px 0", fontSize: "18px" }}>Register New Student</h4>
            <p style={{ fontSize: "13px", color: "var(--text-muted)", marginTop: "0", marginBottom: "15px" }}>
              Credentials shown once — share them with the student.
            </p>
            <form onSubmit={handleCreateStudent} className="auth-form" style={{ gap: "10px" }}>
              <div className="input-group">
                <input type="text" placeholder="Student Name" value={studentData.name}
                  onChange={(e) => handleStudentFieldChange("name", e.target.value)} required />
              </div>
              <div className="input-group">
                <input type="email" placeholder="Student Email" value={studentData.email}
                  onChange={(e) => handleStudentFieldChange("email", e.target.value)} required />
              </div>
              <div className="input-group">
                <input type="text" placeholder="Auto-Generated Password"
                  style={{ backgroundColor: "#F3F4F6" }} value={studentData.password}
                  onChange={(e) => setStudentData({ ...studentData, password: e.target.value })} required />
              </div>
              <div className="input-group">
                <label style={{ fontSize: "13px" }}>Enroll in Subject (Optional)</label>
                <select value={studentSubject} onChange={(e) => setStudentSubject(e.target.value)}>
                  <option value="">-- Do not enroll yet --</option>
                  {subjects.map((s) => <option key={s._id} value={s._id}>{s.name}</option>)}
                </select>
              </div>
              <button type="submit" className="primary-btn" style={{ padding: "10px", marginTop: "5px" }}>
                Register Student
              </button>
            </form>
          </section>
        </div>

        {/* RIGHT */}
        <div>
          <section className="auth-card" style={{ padding: "25px", marginBottom: "30px", borderTop: "4px solid #F59E0B" }}>
            <h4 style={{ margin: "0 0 15px 0", fontSize: "18px" }}>Open Attendance Window</h4>
            <form onSubmit={handleSetWindow} className="auth-form" style={{ gap: "15px" }}>
              <div className="input-group">
                <select value={windowSubject} onChange={(e) => setWindowSubject(e.target.value)} required>
                  <option value="">Select Subject</option>
                  {subjects.map((s) => <option key={s._id} value={s._id}>{s.name}</option>)}
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
              <button type="submit" className="primary-btn pulse-btn" style={{ padding: "10px", marginTop: "0" }}>
                Activate Window
              </button>
            </form>
          </section>

          <section className="auth-card" style={{ padding: "25px", backgroundColor: "white" }}>
            <h4 style={{ margin: "0 0 15px 0", fontSize: "18px" }}>My Subjects Overview</h4>
            <ul style={{ padding: "0", margin: "0", listStyle: "none" }}>
              {subjects.length === 0 && (
                <p style={{ fontSize: "14px", color: "var(--text-muted)" }}>No subjects created yet.</p>
              )}
              {subjects.map((s) => (
                <li key={s._id} style={{
                  padding: "15px", backgroundColor: "#F9FAFB",
                  borderRadius: "8px", marginBottom: "10px", border: "1px solid #E5E7EB",
                }}>
                  <strong style={{ display: "block", color: "var(--text-main)" }}>{s.name}</strong>
                  <span style={{ fontSize: "13px", color: "var(--text-muted)" }}>
                    Enrolled Students: {s.students.length}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        </div>
      </div>

      {/* ── ATTENDANCE REPORT ── */}
      <section className="auth-card" style={{ padding: "25px", marginTop: "30px", borderTop: "4px solid var(--primary)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px", flexWrap: "wrap", gap: "10px" }}>
          <h4 style={{ margin: 0, fontSize: "18px" }}>📋 Attendance Report</h4>
          {report && (
            <button
              onClick={() => exportToExcel(report, report.subjectName)}
              style={{
                display: "flex", alignItems: "center", gap: "6px",
                padding: "8px 16px", backgroundColor: "#16A34A", color: "white",
                border: "none", borderRadius: "8px", cursor: "pointer",
                fontWeight: "600", fontSize: "13px",
              }}
            >
              ⬇ Export to Excel
            </button>
          )}
        </div>
        <p style={{ fontSize: "13px", color: "var(--text-muted)", marginTop: 0, marginBottom: "15px" }}>
          Select a subject to see confirmed attendance records per session.
        </p>

        <div style={{ display: "flex", gap: "12px", marginBottom: "20px", flexWrap: "wrap" }}>
          <select
            value={reportSubjectId}
            onChange={(e) => setReportSubjectId(e.target.value)}
            style={{ flex: 1, padding: "10px 14px", borderRadius: "8px", border: "1px solid #E5E7EB", fontSize: "14px", background: "#F9FAFB" }}
          >
            <option value="">Select Subject</option>
            {subjects.map((s) => <option key={s._id} value={s._id}>{s.name}</option>)}
          </select>
          <button
            onClick={() => handleFetchReport(reportSubjectId)}
            disabled={reportLoading}
            className="primary-btn"
            style={{ padding: "10px 20px", margin: 0 }}
          >
            {reportLoading ? "Loading..." : "View Report"}
          </button>
        </div>

        {report && (
          <div>
            <p style={{ fontSize: "14px", marginBottom: "12px" }}>
              <strong>{report.subjectName}</strong> — {report.totalWindows} session(s) held
            </p>
            {report.report.length === 0 && (
              <p style={{ fontSize: "14px", color: "var(--text-muted)" }}>No sessions recorded yet.</p>
            )}
            {report.report.map((w, i) => (
              <div key={w.windowId} style={{ border: "1px solid #E5E7EB", borderRadius: "10px", marginBottom: "12px", overflow: "hidden" }}>
                <button
                  onClick={() => setExpandedWindow(expandedWindow === w.windowId ? null : w.windowId)}
                  style={{
                    width: "100%", display: "flex", justifyContent: "space-between",
                    alignItems: "center", padding: "14px 18px",
                    background: "#F9FAFB", border: "none", cursor: "pointer",
                    fontSize: "14px", fontWeight: "600", color: "var(--text-main)",
                  }}
                >
                  <span>
                    Session {report.totalWindows - i} &nbsp;·&nbsp;{" "}
                    {new Date(w.startTime).toLocaleString()} → {new Date(w.endTime).toLocaleTimeString()}
                  </span>
                  <span style={{
                    backgroundColor: w.count > 0 ? "rgba(16,185,129,0.12)" : "rgba(239,68,68,0.1)",
                    color: w.count > 0 ? "var(--secondary)" : "var(--error)",
                    borderRadius: "20px", padding: "3px 10px", fontSize: "12px",
                  }}>
                    {w.count} present &nbsp;{expandedWindow === w.windowId ? "▲" : "▼"}
                  </span>
                </button>

                {expandedWindow === w.windowId && (
                  <div style={{ padding: "14px 18px", borderTop: "1px solid #E5E7EB", overflowX: "auto" }}>
                    {w.attendees.length === 0 ? (
                      <p style={{ margin: 0, fontSize: "13px", color: "var(--text-muted)" }}>
                        No confirmed attendance for this session.
                      </p>
                    ) : (
                      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px", minWidth: "500px" }}>
                        <thead>
                          <tr style={{ color: "var(--text-muted)", textAlign: "left" }}>
                            <th style={{ paddingBottom: "8px", fontWeight: "600" }}>#</th>
                            <th style={{ paddingBottom: "8px", fontWeight: "600" }}>Name</th>
                            <th style={{ paddingBottom: "8px", fontWeight: "600" }}>Email</th>
                            <th style={{ paddingBottom: "8px", fontWeight: "600" }}>Match</th>
                            <th style={{ paddingBottom: "8px", fontWeight: "600" }}>Reviewed At</th>
                          </tr>
                        </thead>
                        <tbody>
                          {w.attendees.map((a, idx) => {
                            const c = confidenceLabel(a.confidence);
                            return (
                              <tr key={idx} style={{ borderTop: "1px solid #F3F4F6" }}>
                                <td style={{ padding: "8px 0", color: "var(--text-muted)" }}>{idx + 1}</td>
                                <td style={{ padding: "8px 0", fontWeight: "500" }}>{a.name}</td>
                                <td style={{ padding: "8px 0", color: "var(--text-muted)" }}>{a.email}</td>
                                <td style={{ padding: "8px 4px" }}>
                                  <span style={{
                                    color: c.color, fontWeight: "600", fontSize: "12px",
                                    backgroundColor: c.color + "18", padding: "2px 8px", borderRadius: "12px",
                                  }}>
                                    {c.label} ({c.pct}%)
                                  </span>
                                </td>
                                <td style={{ padding: "8px 0", color: "var(--text-muted)" }}>
                                  {a.reviewedAt ? new Date(a.reviewedAt).toLocaleTimeString() : "—"}
                                </td>
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
    </div>
  );
};

export default TeacherDashboard;