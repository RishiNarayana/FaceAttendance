const Subject = require("../models/Subject");
const AttendanceWindow = require("../models/AttendanceWindow");
const Attendance = require("../models/Attendance");
const FaceEmbedding = require("../models/FaceEmbedding");

exports.getMySubjects = async (req, res) => {
  try {
    const subjects = await Subject.find({ students: req.user._id }).populate("teacher", "name");
    
    const faceRecord = await FaceEmbedding.findOne({ userId: req.user._id });
    const hasFaceRegistered = !!faceRecord;
    
    // For each subject, check if there is an active window
    const subjectsWithWindows = await Promise.all(subjects.map(async (s) => {
      const window = await AttendanceWindow.findOne({ 
        subject: s._id,
        startTime: { $lte: new Date() },
        endTime: { $gte: new Date() }
      });
      
      let attendanceStatus = null;
      if (window) {
        const attendance = await Attendance.findOne({
          window: window._id,
          student: req.user._id
        });
        if (attendance) {
          attendanceStatus = attendance.status;
        }
      }

      return {
        ...s._doc,
        activeWindow: window ? true : false,
        windowId: window ? window._id : null,
        faceRegistered: hasFaceRegistered,
        attendanceStatus
      };
    }));

    res.json(subjectsWithWindows);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getAnalytics = async (req, res) => {
  try {
    const subjects = await Subject.find({ students: req.user._id });
    
    const stats = await Promise.all(subjects.map(async (s) => {
      // Total windows (sessions) held for this subject
      const totalSessions = await AttendanceWindow.countDocuments({ subject: s._id });
      
      // Sessions confirmed present by teacher
      const attendedSessions = await Attendance.countDocuments({ 
        subject: s._id, 
        student: req.user._id,
        status: "present",
      });

      return {
        subjectName: s.name,
        totalSessions,
        attendedSessions,
        percentage: totalSessions > 0 ? ((attendedSessions / totalSessions) * 100).toFixed(1) : 0
      };
    }));

    res.json(stats);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// GET /api/student/attendance-history
// Returns the last 15 attendance records for this student (newest first)
exports.getAttendanceHistory = async (req, res) => {
  try {
    const records = await Attendance.find({ student: req.user._id })
      .sort({ createdAt: -1 })
      .limit(15)
      .populate("subject", "name")
      .populate("window", "startTime endTime");

    const history = records.map((r) => ({
      _id: r._id,
      subjectName: r.subject?.name || "Unknown",
      status: r.status,
      confidence: r.confidence,
      livenessVerified: r.livenessVerified,
      markedAt: r.createdAt,
      sessionStart: r.window?.startTime,
      sessionEnd: r.window?.endTime,
      teacherReviewedAt: r.teacherReviewedAt || null,
    }));

    res.json(history);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
