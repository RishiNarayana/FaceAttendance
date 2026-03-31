const FaceEmbedding = require("../models/FaceEmbedding");
const AttendanceWindow = require("../models/AttendanceWindow");
const Attendance = require("../models/Attendance");
const Subject = require("../models/Subject");

// Euclidean distance between two 128-dim face descriptor arrays
// face-api.js standard threshold: 0.6 (lower = more similar)
const euclideanDistance = (a, b) => {
  if (!a || !b || a.length !== b.length) return Infinity;
  let sum = 0;
  for (let i = 0; i < a.length; i++) {
    sum += (a[i] - b[i]) ** 2;
  }
  return Math.sqrt(sum);
};

// @route  POST /api/face/register
// @desc   Store face embedding for the logged-in student
exports.registerFace = async (req, res) => {
  try {
    const { embedding } = req.body;
    const userId = req.user._id;

    if (!embedding || !Array.isArray(embedding)) {
      return res.status(400).json({ msg: "Invalid or missing embedding array" });
    }

    let faceRecord = await FaceEmbedding.findOne({ userId });
    if (faceRecord) {
      faceRecord.embeddingVector = embedding;
      await faceRecord.save();
    } else {
      faceRecord = new FaceEmbedding({ userId, embeddingVector: embedding });
      await faceRecord.save();
    }

    res.json({ msg: "Face embedding stored successfully" });
  } catch (err) {
    console.error("registerFace error:", err);
    res.status(500).json({ msg: "Server error" });
  }
};

// @route  POST /api/face/mark-attendance
// @desc   Verify student face, then create a PENDING attendance record for teacher review
exports.markAttendance = async (req, res) => {
  try {
    const { subjectId, windowId, embedding, livenessVerified } = req.body;
    const studentId = req.user._id;

    // --- 1. Basic validation ---
    if (!subjectId || !windowId || !embedding || !Array.isArray(embedding)) {
      return res.status(400).json({ msg: "subjectId, windowId, and embedding are required" });
    }

    // --- 2. Check the attendance window is still active ---
    const now = new Date();
    const window = await AttendanceWindow.findOne({
      _id: windowId,
      subject: subjectId,
      startTime: { $lte: now },
      endTime: { $gte: now },
    });
    if (!window) {
      return res.status(400).json({ msg: "Attendance window is not active or has expired" });
    }

    // --- 3. Check student is enrolled in this subject ---
    const subject = await Subject.findOne({ _id: subjectId, students: studentId });
    if (!subject) {
      return res.status(403).json({ msg: "You are not enrolled in this subject" });
    }

    // --- 4. Prevent duplicate submissions for the same window ---
    const alreadySubmitted = await Attendance.findOne({
      student: studentId,
      subject: subjectId,
      window: windowId,
    });
    if (alreadySubmitted) {
      if (alreadySubmitted.status === "pending") {
        return res.status(400).json({ msg: "Your attendance is already submitted and awaiting teacher approval" });
      }
      return res.status(400).json({ msg: "Attendance has already been recorded for this session" });
    }

    // --- 5. Fetch stored face embedding for this student ---
    const faceRecord = await FaceEmbedding.findOne({ userId: studentId });
    if (!faceRecord || !faceRecord.embeddingVector || faceRecord.embeddingVector.length === 0) {
      return res.status(400).json({ msg: "No face registered. Please set up Face ID first" });
    }

    // --- 6. Compare submitted embedding vs stored embedding ---
    const THRESHOLD = 0.6; // face-api.js default; lower = stricter
    const distance = euclideanDistance(embedding, faceRecord.embeddingVector);

    if (distance > THRESHOLD) {
      return res.status(401).json({
        msg: `Face verification failed (distance: ${distance.toFixed(3)}). Please try again in better lighting.`,
      });
    }

    // --- 7. Save PENDING attendance record (teacher must approve/reject) ---
    await Attendance.create({
      student: studentId,
      subject: subjectId,
      window: windowId,
      status: "pending",
      confidence: parseFloat(distance.toFixed(4)),
      livenessVerified: livenessVerified === true,
    });

    res.json({
      msg: "✅ Face verified! Your attendance is pending teacher approval.",
      confidence: parseFloat(distance.toFixed(3)),
    });
  } catch (err) {
    console.error("markAttendance error:", err);
    res.status(500).json({ msg: "Server error during verification" });
  }
};