const express = require("express");
const router = express.Router();
const FaceEmbedding = require("../models/FaceEmbedding");
const { protect } = require("../middleware/authMiddleware");

// @route POST /api/face/register
// @desc Store student face embedding
router.post("/register", protect, async (req, res) => {
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
    console.error(err);
    res.status(500).json({ msg: "Server error" });
  }
});

module.exports = router;