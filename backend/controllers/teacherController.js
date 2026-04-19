const Subject = require("../models/Subject");
const User = require("../models/User");
const AttendanceWindow = require("../models/AttendanceWindow");
const Attendance = require("../models/Attendance");
const { sendWindowNotification } = require("../utils/emailService");
const bcrypt = require("bcryptjs");

// Create student (teacher creates student login)
exports.createStudent = async (req, res) => {
  const { name, email, password } = req.body;
  try {
    if (req.user.role !== "teacher" && req.user.role !== "admin") {
      return res.status(403).json({ message: "Only teachers can create students" });
    }

    const existing = await User.findOne({ email });
    if (existing) return res.status(400).json({ message: "Student email already exists" });

    const hashedPassword = await bcrypt.hash(password, 10);
    const student = await User.create({
      name,
      email,
      password: hashedPassword,
      role: "student",
    });

    res.status(201).json({ message: "Student created successfully", student });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Enroll an EXISTING student (identified by email) into a subject
exports.enrollExistingStudent = async (req, res) => {
  const { studentEmail, subjectId } = req.body;
  try {
    if (!studentEmail || !subjectId) {
      return res.status(400).json({ message: "Student email and subject are required" });
    }

    const subject = await Subject.findById(subjectId);
    if (!subject || subject.teacher.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Not authorized to manage this subject" });
    }

    const student = await User.findOne({ email: studentEmail.trim().toLowerCase(), role: "student" });
    if (!student) {
      return res.status(404).json({ message: "No student account found with that email" });
    }

    if (subject.students.map(id => id.toString()).includes(student._id.toString())) {
      return res.status(400).json({ message: "Student is already enrolled in this subject" });
    }

    subject.students.push(student._id);
    await subject.save();

    res.json({
      message: `${student.name} has been enrolled in ${subject.name} successfully`,
      student: { name: student.name, email: student.email, _id: student._id },
      subject: { name: subject.name, _id: subject._id },
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get teacher's subjects
exports.getMySubjects = async (req, res) => {
  try {
    const subjects = await Subject.find({ teacher: req.user._id }).populate("students", "name email");
    res.json(subjects);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Create a subject
exports.createSubject = async (req, res) => {
  const { name } = req.body;
  try {
    const subject = await Subject.create({
      name,
      teacher: req.user._id,
    });
    res.status(201).json(subject);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Add students to subject
exports.addStudentsToSubject = async (req, res) => {
  const { subjectId, studentEmail } = req.body;
  try {
    const subject = await Subject.findById(subjectId);
    if (!subject || subject.teacher.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Not authorized to manage this subject" });
    }

    const student = await User.findOne({ email: studentEmail, role: "student" });
    if (!student) return res.status(404).json({ message: "Student not found" });

    if (subject.students.includes(student._id)) {
      return res.status(400).json({ message: "Student already added" });
    }

    subject.students.push(student._id);
    await subject.save();
    res.json({ message: "Student added successfully", subject });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Set attendance window + notify students (email is non-blocking)
exports.setAttendanceWindow = async (req, res) => {
  const { subjectId, startTime, endTime } = req.body;
  try {
    const subject = await Subject.findById(subjectId).populate("students", "email");
    if (!subject || subject.teacher.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Not authorized" });
    }

    const window = await AttendanceWindow.create({
      subject: subjectId,
      startTime: new Date(startTime),
      endTime: new Date(endTime),
    });

    // Non-blocking: email failures won't crash the attendance window creation
    try {
      for (const student of subject.students) {
        await sendWindowNotification(student.email, subject.name, startTime, endTime);
      }
    } catch (emailErr) {
      console.warn("Email notification failed (non-critical):", emailErr.message);
    }

    res.status(201).json({ message: "Attendance window set and students notified", window });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get attendance report for a subject — teacher view
exports.getAttendanceReport = async (req, res) => {
  const { subjectId } = req.params;
  try {
    const subject = await Subject.findById(subjectId);
    if (!subject || subject.teacher.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Not authorized to view this report" });
    }

    // All sessions for this subject, newest first
    const windows = await AttendanceWindow.find({ subject: subjectId }).sort({ startTime: -1 });

    // Per-window attendee list (only confirmed-present records)
    const report = await Promise.all(
      windows.map(async (w) => {
        const records = await Attendance.find({
          subject: subjectId,
          window: w._id,
          status: "present",
        }).populate("student", "name email");

        return {
          windowId: w._id,
          startTime: w.startTime,
          endTime: w.endTime,
          attendees: records.map((r) => ({
            name: r.student?.name || "Unknown",
            email: r.student?.email || "",
            markedAt: r.createdAt,
            confidence: r.confidence,
            reviewedAt: r.teacherReviewedAt,
          })),
          count: records.length,
        };
      })
    );

    res.json({ subjectName: subject.name, totalWindows: windows.length, report });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ─── PENDING ATTENDANCE — teacher review flow ────────────────────────────────

// GET  /api/teacher/pending-attendance/:subjectId
exports.getPendingAttendance = async (req, res) => {
  const { subjectId } = req.params;
  try {
    const subject = await Subject.findById(subjectId);
    if (!subject || subject.teacher.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Not authorized" });
    }

    const pending = await Attendance.find({ subject: subjectId, status: "pending" })
      .populate("student", "name email")
      .populate("window", "startTime endTime")
      .sort({ createdAt: -1 });

    res.json(pending);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// PUT  /api/teacher/approve-attendance/:attendanceId
exports.approveAttendance = async (req, res) => {
  const { attendanceId } = req.params;
  try {
    const record = await Attendance.findById(attendanceId).populate("subject");
    if (!record) return res.status(404).json({ message: "Record not found" });
    if (record.subject.teacher.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Not authorized" });
    }

    record.status = "present";
    record.teacherReviewedAt = new Date();
    await record.save();

    res.json({ message: "Attendance approved — student marked present" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// PUT  /api/teacher/reject-attendance/:attendanceId
exports.rejectAttendance = async (req, res) => {
  const { attendanceId } = req.params;
  try {
    const record = await Attendance.findById(attendanceId).populate("subject");
    if (!record) return res.status(404).json({ message: "Record not found" });
    if (record.subject.teacher.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Not authorized" });
    }

    record.status = "absent";
    record.teacherReviewedAt = new Date();
    await record.save();

    res.json({ message: "Attendance rejected — student marked absent" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
