// moodRoutes.js - Express.js routes for mood tracking (FIXED - Auth removed for testing)
const express = require("express");
const router = express.Router();
const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");

// ===== Middleware to verify JWT token (DISABLED FOR TESTING) =====
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    return res.status(401).json({ error: "Access token required" });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: "Invalid or expired token" });
    }
    req.user = user;
    next();
  });
};

// ===== Mock user for testing (TEMPORARY) =====
const mockUser = (req, res, next) => {
  req.user = { id: new mongoose.Types.ObjectId("507f1f77bcf86cd799439011") }; // Mock user ID
  next();
};

// ===== Mood Schema =====
const moodSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: "User",
  },
  date: {
    type: String, // Format: "YYYY-MM-DD"
    required: true,
  },
  mood: {
    type: String,
    required: true,
    enum: ["amazing", "good", "okay", "bad", "terrible"],
  },
  notes: {
    type: String,
    maxlength: 500,
  },
  timestamp: {
    type: Date,
    default: Date.now,
  },
});

// Ensure one mood per user per date
moodSchema.index({ userId: 1, date: 1 }, { unique: true });

const Mood = mongoose.model("Mood", moodSchema);

// ===== Routes (AUTHENTICATION TEMPORARILY DISABLED) =====

// GET /api/moods/test - Public test route
router.get("/test", (req, res) => {
  res.json({ 
    message: "Mood routes working without auth!",
    timestamp: new Date().toISOString() 
  });
});

// GET /api/moods - CHANGED: mockUser instead of authenticateToken
router.get("/", mockUser, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const query = { userId: req.user.id };

    if (startDate && endDate) {
      query.date = { $gte: startDate, $lte: endDate };
    }

    const moodEntries = await Mood.find(query).sort({ date: -1 });

    const moods = {};
    moodEntries.forEach((entry) => {
      const [year, month, day] = entry.date.split("-");
      const dateKey = `${year}-${parseInt(month)}-${parseInt(day)}`;
      moods[dateKey] = {
        mood: entry.mood,
        notes: entry.notes,
        timestamp: entry.timestamp,
      };
    });

    res.json({ success: true, moods, total: moodEntries.length });
  } catch (error) {
    console.error("Error fetching moods:", error);
    res.status(500).json({ success: false, error: "Failed to fetch moods" });
  }
});

// POST /api/moods - CHANGED: mockUser instead of authenticateToken
router.post("/", mockUser, async (req, res) => {
  try {
    const { date, mood, notes = "" } = req.body;

    if (!date || !mood) {
      return res.status(400).json({ success: false, error: "Date and mood are required" });
    }

    const validMoods = ["amazing", "good", "okay", "bad", "terrible"];
    if (!validMoods.includes(mood)) {
      return res.status(400).json({ success: false, error: "Invalid mood value" });
    }

    const dateMatch = date.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
    if (!dateMatch) {
      return res.status(400).json({ success: false, error: "Invalid date format. Use YYYY-M-D" });
    }

    const [, year, month, day] = dateMatch;
    const standardDate = `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;

    const moodEntry = await Mood.findOneAndUpdate(
      { userId: req.user.id, date: standardDate },
      { userId: req.user.id, date: standardDate, mood, notes, timestamp: new Date() },
      { upsert: true, new: true, runValidators: true }
    );

    res.json({
      success: true,
      data: {
        date: standardDate,
        mood: moodEntry.mood,
        notes: moodEntry.notes,
        timestamp: moodEntry.timestamp,
      },
      message: "Mood saved successfully",
    });
  } catch (error) {
    console.error("Error saving mood:", error);
    if (error.code === 11000) {
      res.status(400).json({ success: false, error: "Mood already exists for this date" });
    } else {
      res.status(500).json({ success: false, error: "Failed to save mood" });
    }
  }
});

// DELETE /api/moods/:date - CHANGED: mockUser instead of authenticateToken
router.delete("/:date", mockUser, async (req, res) => {
  try {
    const { date } = req.params;
    const dateMatch = date.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);

    if (!dateMatch) {
      return res.status(400).json({ success: false, error: "Invalid date format. Use YYYY-M-D" });
    }

    const [, year, month, day] = dateMatch;
    const standardDate = `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;

    const deletedMood = await Mood.findOneAndDelete({ userId: req.user.id, date: standardDate });

    if (!deletedMood) {
      return res.status(404).json({ success: false, error: "Mood not found for this date" });
    }

    res.json({ success: true, message: "Mood deleted successfully" });
  } catch (error) {
    console.error("Error deleting mood:", error);
    res.status(500).json({ success: false, error: "Failed to delete mood" });
  }
});

// GET /api/moods/stats - CHANGED: mockUser instead of authenticateToken
router.get("/stats", mockUser, async (req, res) => {
  try {
    const { period = "30" } = req.query;
    const daysBack = parseInt(period);

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - daysBack);
    const startDateStr = startDate.toISOString().split("T")[0];

    const moodEntries = await Mood.find({
      userId: req.user.id,
      date: { $gte: startDateStr },
    }).sort({ date: -1 });

    const stats = {
      totalEntries: moodEntries.length,
      period: daysBack,
      moodDistribution: {},
      streakData: calculateStreak(moodEntries),
      averageMood: 0,
      weeklyPattern: {},
      monthlyTrend: [],
    };

    let moodSum = 0;
    const moodValues = { terrible: 1, bad: 2, okay: 3, good: 4, amazing: 5 };

    moodEntries.forEach((entry) => {
      stats.moodDistribution[entry.mood] = (stats.moodDistribution[entry.mood] || 0) + 1;
      moodSum += moodValues[entry.mood];

      const date = new Date(entry.date);
      const dayOfWeek = date.getDay();
      const dayName = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][dayOfWeek];
      stats.weeklyPattern[dayName] = (stats.weeklyPattern[dayName] || 0) + 1;
    });

    if (moodEntries.length > 0) {
      stats.averageMood = (moodSum / moodEntries.length).toFixed(2);
    }

    res.json({ success: true, stats });
  } catch (error) {
    console.error("Error calculating mood stats:", error);
    res.status(500).json({ success: false, error: "Failed to calculate mood statistics" });
  }
});

// ===== Helper: calculate streak =====
function calculateStreak(moodEntries) {
  if (moodEntries.length === 0) {
    return { currentStreak: 0, longestStreak: 0, lastEntry: null };
  }

  const sortedEntries = moodEntries.sort((a, b) => new Date(a.date) - new Date(b.date));
  let currentStreak = 0;
  let longestStreak = 0;
  let tempStreak = 1;

  for (let i = 1; i < sortedEntries.length; i++) {
    const prevDate = new Date(sortedEntries[i - 1].date);
    const currentDate = new Date(sortedEntries[i].date);
    const dayDiff = (currentDate - prevDate) / (1000 * 60 * 60 * 24);

    if (dayDiff === 1) {
      tempStreak++;
    } else {
      longestStreak = Math.max(longestStreak, tempStreak);
      tempStreak = 1;
    }
  }
  longestStreak = Math.max(longestStreak, tempStreak);

  const today = new Date();
  const todayStr = today.toISOString().split("T")[0];

  const recentEntries = moodEntries.sort((a, b) => new Date(b.date) - new Date(a.date));

  for (let i = 0; i < recentEntries.length; i++) {
    const entryDate = new Date(recentEntries[i].date);
    const expectedDate = new Date(today);
    expectedDate.setDate(today.getDate() - i);
    const expectedDateStr = expectedDate.toISOString().split("T")[0];

    if (recentEntries[i].date === expectedDateStr) {
      currentStreak++;
    } else {
      break;
    }
  }

  return {
    currentStreak,
    longestStreak,
    lastEntry: recentEntries[0]?.date || null,
  };
}

module.exports = router;