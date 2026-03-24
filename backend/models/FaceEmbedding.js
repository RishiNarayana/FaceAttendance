const mongoose = require("mongoose");

const faceEmbeddingSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  embeddingVector: { type: [Number], required: true },
  createdAt: { type: Date, default: Date.now }
}, { collection: "FaceEmbeddings" });

module.exports = mongoose.model("FaceEmbedding", faceEmbeddingSchema);