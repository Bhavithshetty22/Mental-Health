// backend/models/Post.js
const mongoose = require("mongoose");

const postSchema = new mongoose.Schema({
  text: { type: String, maxlength: 2000 },
  imagePath: { type: String },       // local uploaded file path (served from /uploads)
  imageUrl: { type: String },        // external image URL (optional)
  owner: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: false }, // stored but not exposed
  likes: { type: Number, default: 0 },
  likedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }], // optional: track who liked
  createdAt: { type: Date, default: Date.now }
});

// index to get newest posts quickly
postSchema.index({ createdAt: -1 });

module.exports = mongoose.model("Post", postSchema);
