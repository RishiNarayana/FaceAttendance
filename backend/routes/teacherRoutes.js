const express = require("express");
const { getMySubjects, createSubject, addStudentsToSubject, setAttendanceWindow, createStudent } = require("../controllers/teacherController");
const { protect, authorize } = require("../middleware/authMiddleware");
const router = express.Router();

router.use(protect);
router.use(authorize("teacher", "admin"));

router.get("/my-subjects", getMySubjects);
router.post("/create-subject", createSubject);
router.post("/add-students", addStudentsToSubject);
router.post("/set-window", setAttendanceWindow);
router.post("/create-student", createStudent);

module.exports = router;
