// models/MoodImage.js
const mongoose = require('mongoose');

const moodImageSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  mood: {
    type: String,
    required: true,
    enum: ['terrible', 'bad', 'okay', 'good', 'amazing'],
    index: true
  },
  imageUrl: {
    type: String,
    required: true
  },
  imageData: {
    type: String,
    required: true
  },
  prompt: {
    type: String,
    required: true
  },
  generatedAt: {
    type: Date,
    default: Date.now
  },
  usageCount: {
    type: Number,
    default: 1
  },
  lastUsed: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Compound index for efficient lookups
moodImageSchema.index({ userId: 1, mood: 1 }, { unique: true });

// Method to increment usage count
moodImageSchema.methods.incrementUsage = async function() {
  this.usageCount += 1;
  this.lastUsed = new Date();
  return this.save();
};

module.exports = mongoose.model('MoodImage', moodImageSchema);