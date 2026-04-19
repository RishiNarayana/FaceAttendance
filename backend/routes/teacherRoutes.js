const express = require("express");
const {
  getMySubjects,
  createSubject,
  addStudentsToSubject,
  enrollExistingStudent,
  setAttendanceWindow,
  createStudent,
  getAttendanceReport,
  getPendingAttendance,
  approveAttendance,
  rejectAttendance,
} = require("../controllers/teacherController");
const { protect, authorize } = require("../middleware/authMiddleware");
const router = express.Router();

router.use(protect);
router.use(authorize("teacher", "admin"));

router.get("/my-subjects",                        getMySubjects);
router.post("/create-subject",                    createSubject);
router.post("/add-students",                      addStudentsToSubject);
router.post("/enroll-student",                    enrollExistingStudent);
router.post("/set-window",                        setAttendanceWindow);
router.post("/create-student",                    createStudent);
router.get("/attendance/:subjectId",              getAttendanceReport);

// ── Pending-approval review flow ──────────────────────────────────────────────
router.get("/pending-attendance/:subjectId",      getPendingAttendance);
router.put("/approve-attendance/:attendanceId",   approveAttendance);
router.put("/reject-attendance/:attendanceId",    rejectAttendance);

module.exports = router;