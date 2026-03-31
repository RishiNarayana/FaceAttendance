const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/authMiddleware");
const { registerFace, markAttendance } = require("../controllers/faceController");

// @route  POST /api/face/register
// @desc   Store student face embedding
router.post("/register", protect, registerFace);

// @route  POST /api/face/mark-attendance
// @desc   Verify face and mark attendance for a subject session
router.post("/mark-attendance", protect, markAttendance);

module.exports = router;