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
      return {
        ...s._doc,
        activeWindow: window ? true : false,
        windowId: window ? window._id : null,
        faceRegistered: hasFaceRegistered
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
