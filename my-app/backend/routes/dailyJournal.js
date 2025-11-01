// routes/dailyJournal.js
const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");

// ===== Daily Journal Entry Schema =====
const dailyJournalSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true,
    index: true
  },
  text: {
    type: String,
    required: true,
    maxlength: 5000
  },
  generatedContent: {
    type: {
      type: String,
      enum: ['image', 'song', 'poem', 'story'],
      required: true
    },
    imageUrl: String,
    imagePrompt: String,
    songs: [{
      title: String,
      artist: String,
      url: String,
      reason: String
    }],
    story: String,
    poem: String
  },
  date: {
    type: String, // Format: YYYY-M-D
    required: true,
    index: true
  },
  createdAt: {
    type: Date,
    default: Date.now,
    index: true
  }
}, {
  timestamps: true
});

// Compound index for efficient queries
dailyJournalSchema.index({ userId: 1, date: 1 });
dailyJournalSchema.index({ userId: 1, createdAt: -1 });

const DailyJournal = mongoose.model("DailyJournal", dailyJournalSchema);

// ===== Authentication Middleware =====
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ 
      error: 'Access token required',
      code: 'NO_TOKEN'
    });
  }

  try {
    // Extract userId from token (simplified - adjust based on your auth implementation)
    const userId = extractUserIdFromToken(token);
    if (!userId) {
      return res.status(403).json({ 
        error: 'Invalid token',
        code: 'INVALID_TOKEN'
      });
    }
    req.userId = userId;
    next();
  } catch (err) {
    return res.status(403).json({ 
      error: 'Invalid token',
      code: 'INVALID_TOKEN'
    });
  }
};

// Helper function to extract userId from token
// NOTE: Adjust this based on your actual auth implementation
function extractUserIdFromToken(token) {
  try {
    // If using JWT, decode it
    const jwt = require('jsonwebtoken');
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    return decoded.userId || decoded.id || decoded._id;
  } catch (err) {
    // Fallback: try to parse as simple base64 encoded userId
    try {
      return Buffer.from(token, 'base64').toString('utf-8');
    } catch {
      return null;
    }
  }
}

// Helper function to get today's date key
const getTodayKey = () => {
  const today = new Date();
  return `${today.getFullYear()}-${today.getMonth() + 1}-${today.getDate()}`;
};

// ===== CREATE: Save a new daily journal entry =====
router.post("/", authenticateToken, async (req, res) => {
  try {
    const { text, generatedContent } = req.body;

    if (!text || !text.trim()) {
      return res.status(400).json({
        error: "Text is required",
        code: "MISSING_TEXT"
      });
    }

    if (!generatedContent || !generatedContent.type) {
      return res.status(400).json({
        error: "Generated content is required",
        code: "MISSING_CONTENT"
      });
    }

    // Validate content type
    const validTypes = ['image', 'song', 'poem', 'story'];
    if (!validTypes.includes(generatedContent.type)) {
      return res.status(400).json({
        error: "Invalid content type",
        code: "INVALID_TYPE"
      });
    }

    const todayKey = getTodayKey();

    // Create new journal entry
    const journalEntry = new DailyJournal({
      userId: req.userId,
      text: text.trim(),
      generatedContent,
      date: todayKey
    });

    await journalEntry.save();

    console.log(`[DailyJournal] Entry saved for user ${req.userId} on ${todayKey}`);

    res.status(201).json({
      success: true,
      message: "Journal entry saved successfully",
      entry: {
        id: journalEntry._id,
        date: journalEntry.date,
        type: journalEntry.generatedContent.type,
        createdAt: journalEntry.createdAt
      }
    });

  } catch (error) {
    console.error("[DailyJournal] Error saving entry:", error);
    res.status(500).json({
      error: "Failed to save journal entry",
      details: error.message,
      code: "SAVE_ERROR"
    });
  }
});

// ===== READ: Get all journal entries for the authenticated user =====
router.get("/", authenticateToken, async (req, res) => {
  try {
    const { date, limit = 50, page = 1 } = req.query;
    
    const query = { userId: req.userId };
    
    // Filter by specific date if provided
    if (date) {
      query.date = date;
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const entries = await DailyJournal.find(query)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip(skip)
      .lean();

    const total = await DailyJournal.countDocuments(query);

    res.json({
      success: true,
      entries,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / parseInt(limit))
      }
    });

  } catch (error) {
    console.error("[DailyJournal] Error fetching entries:", error);
    res.status(500).json({
      error: "Failed to fetch journal entries",
      details: error.message,
      code: "FETCH_ERROR"
    });
  }
});

// ===== READ: Get a specific journal entry by ID =====
router.get("/:id", authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        error: "Invalid entry ID",
        code: "INVALID_ID"
      });
    }

    const entry = await DailyJournal.findOne({
      _id: id,
      userId: req.userId
    }).lean();

    if (!entry) {
      return res.status(404).json({
        error: "Journal entry not found",
        code: "NOT_FOUND"
      });
    }

    res.json({
      success: true,
      entry
    });

  } catch (error) {
    console.error("[DailyJournal] Error fetching entry:", error);
    res.status(500).json({
      error: "Failed to fetch journal entry",
      details: error.message,
      code: "FETCH_ERROR"
    });
  }
});

// ===== READ: Check if user has written journal today =====
router.get("/check/today", authenticateToken, async (req, res) => {
  try {
    const todayKey = getTodayKey();
    
    const entry = await DailyJournal.findOne({
      userId: req.userId,
      date: todayKey
    }).lean();

    res.json({
      success: true,
      hasEntry: !!entry,
      date: todayKey,
      entryId: entry?._id
    });

  } catch (error) {
    console.error("[DailyJournal] Error checking today's entry:", error);
    res.status(500).json({
      error: "Failed to check journal status",
      details: error.message,
      code: "CHECK_ERROR"
    });
  }
});

// ===== UPDATE: Update an existing journal entry =====
router.put("/:id", authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { text, generatedContent } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        error: "Invalid entry ID",
        code: "INVALID_ID"
      });
    }

    const updateData = {};
    if (text) updateData.text = text.trim();
    if (generatedContent) updateData.generatedContent = generatedContent;

    const updatedEntry = await DailyJournal.findOneAndUpdate(
      { _id: id, userId: req.userId },
      { $set: updateData },
      { new: true, runValidators: true }
    );

    if (!updatedEntry) {
      return res.status(404).json({
        error: "Journal entry not found",
        code: "NOT_FOUND"
      });
    }

    res.json({
      success: true,
      message: "Journal entry updated successfully",
      entry: updatedEntry
    });

  } catch (error) {
    console.error("[DailyJournal] Error updating entry:", error);
    res.status(500).json({
      error: "Failed to update journal entry",
      details: error.message,
      code: "UPDATE_ERROR"
    });
  }
});

// ===== DELETE: Delete a journal entry =====
router.delete("/:id", authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        error: "Invalid entry ID",
        code: "INVALID_ID"
      });
    }

    const deletedEntry = await DailyJournal.findOneAndDelete({
      _id: id,
      userId: req.userId
    });

    if (!deletedEntry) {
      return res.status(404).json({
        error: "Journal entry not found",
        code: "NOT_FOUND"
      });
    }

    res.json({
      success: true,
      message: "Journal entry deleted successfully",
      deletedId: id
    });

  } catch (error) {
    console.error("[DailyJournal] Error deleting entry:", error);
    res.status(500).json({
      error: "Failed to delete journal entry",
      details: error.message,
      code: "DELETE_ERROR"
    });
  }
});

// ===== STATS: Get journal statistics =====
router.get("/stats/summary", authenticateToken, async (req, res) => {
  try {
    const total = await DailyJournal.countDocuments({ userId: req.userId });
    
    const typeStats = await DailyJournal.aggregate([
      { $match: { userId: req.userId } },
      { $group: {
        _id: "$generatedContent.type",
        count: { $sum: 1 }
      }}
    ]);

    const todayKey = getTodayKey();
    const hasToday = await DailyJournal.exists({
      userId: req.userId,
      date: todayKey
    });

    res.json({
      success: true,
      stats: {
        totalEntries: total,
        byType: typeStats.reduce((acc, item) => {
          acc[item._id] = item.count;
          return acc;
        }, {}),
        hasEntryToday: !!hasToday
      }
    });

  } catch (error) {
    console.error("[DailyJournal] Error fetching stats:", error);
    res.status(500).json({
      error: "Failed to fetch statistics",
      details: error.message,
      code: "STATS_ERROR"
    });
  }
});

// Export router and model
module.exports = router;
module.exports.DailyJournal = DailyJournal;