// server/models/User.js
const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  username: { type: String, index: true, unique: false },
  email: { type: String, required: true, unique: true, lowercase: true },
  password: { type: String, required: true },
  
  // Profile Setup Fields
  profileComplete: { type: Boolean, default: false },
  profileImage: { type: String }, // Base64 encoded image
  bio: { type: String, maxlength: 500 },
  dateOfBirth: { type: Date },
  gender: { type: String, enum: ['male', 'female', 'other', 'prefer-not-to-say'] },
  location: { type: String, maxlength: 100 },
  interests: [{ type: String }],
  
  createdAt: { type: Date, default: Date.now },
  profileCompletedAt: { type: Date },
});

module.exports = mongoose.model("User", userSchema);