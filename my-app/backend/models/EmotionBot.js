// models/EmotionBot.js

const mongoose = require('mongoose');

const emotionBotSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  description: {
    type: String,
    required: true,
    trim: true,
    maxlength: 300
  },
  greeting: {
    type: String,
    required: true,
    maxlength: 500
  },
  customPrompt: {
    type: String,
    maxlength: 1000
  },
  color: {
    type: String,
    default: '#6B9080',
    match: /^#[0-9A-F]{6}$/i
  },
  imageUrl: {
    type: String,
    default: null
  },
  creator: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  creatorName: {
    type: String,
    required: true
  },
  isDefault: {
    type: Boolean,
    default: false
  },
  rating: {
    type: Number,
    default: 0,
    min: 0,
    max: 5
  },
  ratingCount: {
    type: Number,
    default: 0
  },
  chatCount: {
    type: Number,
    default: 0
  },
  isPublic: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Index for efficient queries
emotionBotSchema.index({ creator: 1 });
emotionBotSchema.index({ isPublic: 1, createdAt: -1 });
emotionBotSchema.index({ rating: -1 });
emotionBotSchema.index({ chatCount: -1 });

// Virtual for formatted rating
emotionBotSchema.virtual('formattedRating').get(function() {
  return this.rating.toFixed(1);
});

module.exports = mongoose.model('EmotionBot', emotionBotSchema);