const mongoose = require("mongoose");

const attendanceSchema = new mongoose.Schema({
  student:           { type: mongoose.Schema.Types.ObjectId, ref: "User",             required: true },
  subject:           { type: mongoose.Schema.Types.ObjectId, ref: "Subject",          required: true },
  window:            { type: mongoose.Schema.Types.ObjectId, ref: "AttendanceWindow" },
  status:            { type: String, enum: ["pending", "present", "absent"], default: "pending" },
  confidence:        { type: Number },        // Euclidean distance — lower = better match
  livenessVerified:  { type: Boolean, default: true },
  teacherReviewedAt: { type: Date },
}, { timestamps: true });

module.exports = mongoose.model("Attendance", attendanceSchema);
