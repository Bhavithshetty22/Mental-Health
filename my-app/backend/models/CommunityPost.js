// server/models/CommunityPost.js
const mongoose = require("mongoose");

const CommunityPostSchema = new mongoose.Schema({
  title: { type: String, trim: true, default: "" },
  content: { type: String, trim: true, default: "" },
  // store image as base64 data URL (string) OR URL to object store in future
  image: { type: String, default: null },
  type: { type: String, enum: ["text", "image"], default: "text" },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null }, // optional, keep for moderation
  likes: { type: Number, default: 0 }, // you said like count hidden — still keep for analytics if desired
  supporters: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }], // track which users have supported
  createdAt: { type: Date, default: Date.now },
});

CommunityPostSchema.index({ createdAt: -1 }); // speed reads for recent posts

module.exports = mongoose.model("CommunityPost", CommunityPostSchema);
