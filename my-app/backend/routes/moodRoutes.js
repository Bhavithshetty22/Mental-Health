// backend/routes/moodRoutes.js
const express = require("express")
const router = express.Router()
const jwt = require("jsonwebtoken")
const mongoose = require("mongoose")

const JWT_SECRET = process.env.JWT_SECRET || "dev_secret"

// ===== Middleware to verify JWT token =====
const authenticateToken = (req, res, next) => {
  try {
    const authHeader = req.headers["authorization"] || req.headers["Authorization"]
    const token = authHeader && authHeader.split(" ")[1]

    if (!token) {
      return res.status(401).json({ success: false, error: "Access token required" })
    }

    jwt.verify(token, JWT_SECRET, (err, payload) => {
      if (err) {
        console.warn("JWT verify error:", err.message)
        return res.status(403).json({ success: false, error: "Invalid or expired token" })
      }
      // token payload should contain { id: userId } per your auth routes
      req.user = payload
      next()
    })
  } catch (err) {
    console.error("Auth middleware error:", err)
    return res.status(500).json({ success: false, error: "Authentication error" })
  }
}

// ===== Mood Schema =====
const moodSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, required: true, ref: "User" },
  date: { type: String, required: true }, // "YYYY-MM-DD"
  mood: { type: String, required: true, enum: ["amazing", "good", "okay", "bad", "terrible"] },
  notes: { type: String, maxlength: 500 },
  timestamp: { type: Date, default: Date.now },
})

// Ensure one mood per user per date
moodSchema.index({ userId: 1, date: 1 }, { unique: true })

const Mood = mongoose.model("Mood", moodSchema)

// Public test route
router.get("/test", (req, res) => {
  res.json({ message: "Mood routes working (auth enabled).", timestamp: new Date().toISOString() })
})

// Get moods for logged-in user
router.get("/", authenticateToken, async (req, res) => {
  try {
    const { startDate, endDate } = req.query
    const userId = req.user?.id || req.user?._id
    if (!userId) return res.status(401).json({ success: false, error: "Unauthorized" })

    const query = { userId }
    if (startDate && endDate) query.date = { $gte: startDate, $lte: endDate }

    const moodEntries = await Mood.find(query).sort({ date: -1 })
    const moods = {}
    moodEntries.forEach((entry) => {
      const [year, month, day] = entry.date.split("-")
      const dateKey = `${year}-${parseInt(month, 10)}-${parseInt(day, 10)}`
      moods[dateKey] = { mood: entry.mood, notes: entry.notes, timestamp: entry.timestamp }
    })

    res.json({ success: true, moods, total: moodEntries.length })
  } catch (error) {
    console.error("Error fetching moods:", error)
    res.status(500).json({ success: false, error: "Failed to fetch moods" })
  }
})

// Save (upsert) mood for logged-in user
router.post("/", authenticateToken, async (req, res) => {
  try {
    const userId = req.user?.id || req.user?._id
    if (!userId) return res.status(401).json({ success: false, error: "Unauthorized" })

    const { date, mood, notes = "" } = req.body
    if (!date || !mood) return res.status(400).json({ success: false, error: "Date and mood are required" })

    const validMoods = ["amazing", "good", "okay", "bad", "terrible"]
    if (!validMoods.includes(mood)) return res.status(400).json({ success: false, error: "Invalid mood value" })

    const dateMatch = date.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/)
    if (!dateMatch) return res.status(400).json({ success: false, error: "Invalid date format. Use YYYY-M-D" })

    const [, year, month, day] = dateMatch
    const standardDate = `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`

    const moodEntry = await Mood.findOneAndUpdate(
      { userId, date: standardDate },
      { userId, date: standardDate, mood, notes, timestamp: new Date() },
      { upsert: true, new: true, runValidators: true }
    )

    res.json({
      success: true,
      data: { date: standardDate, mood: moodEntry.mood, notes: moodEntry.notes, timestamp: moodEntry.timestamp },
      message: "Mood saved successfully",
    })
  } catch (error) {
    console.error("Error saving mood:", error)
    if (error.code === 11000) {
      res.status(400).json({ success: false, error: "Mood already exists for this date" })
    } else {
      res.status(500).json({ success: false, error: "Failed to save mood" })
    }
  }
})

// Delete mood for logged-in user
router.delete("/:date", authenticateToken, async (req, res) => {
  try {
    const userId = req.user?.id || req.user?._id
    if (!userId) return res.status(401).json({ success: false, error: "Unauthorized" })

    const { date } = req.params
    const dateMatch = date.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/)
    if (!dateMatch) return res.status(400).json({ success: false, error: "Invalid date format. Use YYYY-M-D" })

    const [, year, month, day] = dateMatch
    const standardDate = `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`

    const deletedMood = await Mood.findOneAndDelete({ userId, date: standardDate })
    if (!deletedMood) return res.status(404).json({ success: false, error: "Mood not found for this date" })

    res.json({ success: true, message: "Mood deleted successfully" })
  } catch (error) {
    console.error("Error deleting mood:", error)
    res.status(500).json({ success: false, error: "Failed to delete mood" })
  }
})

// Stats (minimal example)
router.get("/stats", authenticateToken, async (req, res) => {
  try {
    const userId = req.user?.id || req.user?._id
    if (!userId) return res.status(401).json({ success: false, error: "Unauthorized" })

    const { period = "30" } = req.query
    const daysBack = parseInt(period, 10)
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - daysBack)
    const startDateStr = startDate.toISOString().split("T")[0]

    const moodEntries = await Mood.find({ userId, date: { $gte: startDateStr } }).sort({ date: -1 })

    // Simple stats example; plug-in your current stats calculation if desired
    const stats = { totalEntries: moodEntries.length }
    res.json({ success: true, stats })
  } catch (error) {
    console.error("Error calculating mood stats:", error)
    res.status(500).json({ success: false, error: "Failed to calculate mood statistics" })
  }
})

module.exports = router
