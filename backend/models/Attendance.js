const mongoose = require("mongoose");

const attendanceSchema = new mongoose.Schema({
  student: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  subject: { type: mongoose.Schema.Types.ObjectId, ref: "Subject", required: true },
  window: { type: mongoose.Schema.Types.ObjectId, ref: "AttendanceWindow" },
  status: { type: String, default: "present" }
}, { timestamps: true });

module.exports = mongoose.model("Attendance", attendanceSchema);
