import React, { useState, useEffect, useContext, useMemo } from "react";
import api from "../api";
import { AuthContext } from "../context/AuthContext";

const TeacherDirectory = () => {
  const { user } = useContext(AuthContext);
  const [subjects, setSubjects] = useState([]);
  const [selectedSubject, setSelectedSubject] = useState("");
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [filterMode, setFilterMode] = useState("all"); // 'all' | 'risk' | 'perfect'

  // Fetch subjects
  useEffect(() => {
    const fetchSubjects = async () => {
      try {
        const res = await api.get("/teacher/my-subjects");
        setSubjects(res.data);
        if (res.data.length > 0) {
          setSelectedSubject(res.data[0]._id);
        }
      } catch (err) {
        console.error("Failed to load subjects", err);
      }
    };
    fetchSubjects();
  }, [user.token]);

  // Fetch report whenever subject changes
  useEffect(() => {
    if (!selectedSubject) return;

    const fetchReport = async () => {
      setLoading(true);
      setReportData(null);
      try {
        const res = await api.get(`/teacher/attendance/${selectedSubject}`);
        setReportData(res.data);
      } catch (err) {
        console.error("Failed to load report", err);
      } finally {
        setLoading(false);
      }
    };

    fetchReport();
  }, [selectedSubject, user.token]);

  // Calculate stats based on aggregated report
  const studentStats = useMemo(() => {
    if (!reportData || !reportData.report) return [];

    const totalSessions = reportData.totalWindows;
    if (totalSessions === 0) return []; // No sessions held yet

    // Find the currently selected subject to get all enrolled students securely
    const currentSubject = subjects.find(s => s._id === selectedSubject);
    const enrolledStudents = currentSubject ? currentSubject.students : [];

    // Tally attendance based on report
    const attendanceMap = {};
    enrolledStudents.forEach(stu => {
      attendanceMap[stu._id] = {
        name: stu.name,
        email: stu.email,
        sessionsAttended: 0,
      };
    });

    reportData.report.forEach(window => {
      window.attendees.forEach(att => {
        // Find corresponding student in map (match by email/name normally, attendees might just have embedded meta)
        const stuKey = Object.keys(attendanceMap).find(
          k => attendanceMap[k].email === att.email
        );
        if (stuKey) {
          attendanceMap[stuKey].sessionsAttended++;
        }
      });
    });

    return Object.values(attendanceMap).map(s => {
      const percentage = Math.round((s.sessionsAttended / totalSessions) * 100);
      return { ...s, percentage, totalSessions };
    }).sort((a, b) => b.percentage - a.percentage);

  }, [reportData, selectedSubject, subjects]);

  // Apply filters
  const filteredStats = useMemo(() => {
    if (filterMode === "all") return studentStats;
    if (filterMode === "risk") return studentStats.filter(s => s.percentage < 75);
    if (filterMode === "perfect") return studentStats.filter(s => s.percentage >= 90);
    return studentStats;
  }, [studentStats, filterMode]);

  return (
    <div style={{ maxWidth: "600px", margin: "0 auto", paddingBottom: "40px" }}>
      {/* Header Dropdown */}
      <div style={{ position: "relative", marginBottom: "20px" }}>
        <div style={{ position: "absolute", left: "16px", top: "15px", color: "var(--primary)" }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
          </svg>
        </div>
        <select 
          className="custom-select" 
          value={selectedSubject} 
          onChange={(e) => setSelectedSubject(e.target.value)}
          style={{ paddingLeft: "42px", fontWeight: "600", fontSize: "16px" }}
        >
          <option value="" disabled>Select subject...</option>
          {subjects.map(s => <option key={s._id} value={s._id}>{s.name} Data</option>)}
        </select>
      </div>

      {/* Filter Tabs */}
      <div style={{ display: "flex", gap: "10px", marginBottom: "20px", overflowX: "auto", paddingBottom: "5px" }}>
        <button 
          onClick={() => setFilterMode("all")}
          style={{ 
            padding: "8px 16px", borderRadius: "20px", border: "none", cursor: "pointer", fontSize: "13px", fontWeight: "600",
            background: filterMode === "all" ? "var(--primary)" : "white",
            color: filterMode === "all" ? "white" : "var(--primary)",
            boxShadow: "0 2px 4px rgba(0,0,0,0.05)", whiteSpace: "nowrap"
          }}
        >
          All Enrolled
        </button>
        <button 
          onClick={() => setFilterMode("risk")}
          style={{ 
            padding: "8px 16px", borderRadius: "20px", border: "none", cursor: "pointer", fontSize: "13px", fontWeight: "600",
            background: filterMode === "risk" ? "white" : "white",
            color: filterMode === "risk" ? "var(--error)" : "var(--text-main)",
            border: filterMode === "risk" ? "1px solid var(--error)" : "1px solid transparent",
            boxShadow: "0 2px 4px rgba(0,0,0,0.05)", whiteSpace: "nowrap"
          }}
        >
          <span style={{ color: "var(--error)", marginRight: "4px" }}>●</span> At Risk (&lt; 75%)
        </button>
        <button 
          onClick={() => setFilterMode("perfect")}
          style={{ 
            padding: "8px 16px", borderRadius: "20px", border: "none", cursor: "pointer", fontSize: "13px", fontWeight: "600",
            background: filterMode === "perfect" ? "white" : "white",
            color: filterMode === "perfect" ? "var(--success)" : "var(--text-main)",
            border: filterMode === "perfect" ? "1px solid var(--success)" : "1px solid transparent",
            boxShadow: "0 2px 4px rgba(0,0,0,0.05)", whiteSpace: "nowrap"
          }}
        >
          Top Performers
        </button>
      </div>

      {/* Directory List */}
      <div>
        {loading && (
          <div style={{ textAlign: "center", padding: "40px", color: "var(--text-muted)", fontSize: "24px" }}>⏳</div>
        )}
        
        {!loading && (!reportData || reportData.totalWindows === 0) && (
          <div style={{ textAlign: "center", padding: "40px", background: "white", borderRadius: "16px", color: "var(--text-muted)" }}>
            <p>No sessions have been held for this subject yet.</p>
          </div>
        )}

        {!loading && reportData && reportData.totalWindows > 0 && filteredStats.length === 0 && (
          <div style={{ textAlign: "center", padding: "40px", background: "white", borderRadius: "16px", color: "var(--text-muted)" }}>
            <p>No students match this filter.</p>
          </div>
        )}

        {!loading && filteredStats.map((stu, i) => {
          let ringClass = "success";
          if (stu.percentage < 75) ringClass = "danger";
          else if (stu.percentage < 85) ringClass = "warning";

          // Calculate offset for circular progress (circumference = 2 * pi * 20 = ~125.6)
          const offset = 125.6 - (125.6 * stu.percentage) / 100;

          return (
            <div key={i} className="directory-item" style={{ borderLeft: stu.percentage < 75 ? "4px solid var(--error)" : "none" }}>
              <div className="avatar-large" style={{ backgroundColor: stu.percentage < 75 ? "rgba(239,68,68,0.1)" : "var(--card-bg)" }}>
                {stu.name.charAt(0).toUpperCase()}
              </div>
              <div style={{ flex: 1 }}>
                <h4 style={{ margin: "0 0 2px 0", fontSize: "16px", color: "var(--primary)", fontWeight: "600" }}>{stu.name}</h4>
                <p style={{ margin: 0, fontSize: "13px", color: "var(--text-muted)" }}>{stu.email}</p>
                {stu.percentage < 75 && (
                  <p style={{ margin: "4px 0 0", fontSize: "10px", fontWeight: "700", color: "var(--error)", letterSpacing: "1px", textTransform: "uppercase" }}>
                    AT RISK
                  </p>
                )}
              </div>
              <div className={`progress-ring ${ringClass}`}>
                <svg width="48" height="48" viewBox="0 0 48 48">
                  <circle className="ring-bg" cx="24" cy="24" r="20"></circle>
                  <circle className="ring-fill" cx="24" cy="24" r="20" style={{ strokeDasharray: "125.6", strokeDashoffset: offset }}></circle>
                </svg>
                <span className="ring-text">{stu.percentage}%</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default TeacherDirectory;
