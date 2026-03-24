const Subject = require("../models/Subject");
const User = require("../models/User");
const AttendanceWindow = require("../models/AttendanceWindow");
const { sendWindowNotification } = require("../utils/emailService");
const bcrypt = require("bcryptjs");

// Create student (Member 1 role: teacher creates student login)
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
      role: "student"
    });

    res.status(201).json({ message: "Student created successfully", student });
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

// Create a subject (Admin or Teacher might do this, here Teacher creates their own)
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

// Attendance Window Logic
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

    // Notify students
    subject.students.forEach(async (student) => {
      await sendWindowNotification(student.email, subject.name, startTime, endTime);
    });

    res.status(201).json({ message: "Attendance window set and students notified", window });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
