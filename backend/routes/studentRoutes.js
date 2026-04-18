const express = require("express");
const { getMySubjects, getAnalytics, getAttendanceHistory } = require("../controllers/studentController");
const { protect, authorize } = require("../middleware/authMiddleware");
const router = express.Router();

router.use(protect);
router.use(authorize("student"));

router.get("/my-subjects", getMySubjects);
router.get("/analytics", getAnalytics);
router.get("/attendance-history", getAttendanceHistory);

module.exports = router;
