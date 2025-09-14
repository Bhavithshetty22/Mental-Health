// backend/routes/letters.js
const express = require("express");
const mongoose = require("mongoose");

const router = express.Router();

/**
 * Define the Letter schema & model here (no separate models/ folder required)
 */
const LetterSchema = new mongoose.Schema(
  {
    title: { type: String, default: "", trim: true, maxlength: 140 },
    situation: { type: String, required: true, trim: true },
    letter: { type: String, required: true },
    model: { type: String, default: "" },
    crisis: { type: Boolean, default: false },
    owner: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: false },
  },
  { timestamps: true }
);

// Reuse existing model if already compiled (avoids OverwriteModelError in dev)
const Letter = mongoose.models?.Letter || mongoose.model("Letter", LetterSchema);

/**
 * GET /api/letters
 * Optional query: ?owner=<ownerId>
 */
router.get("/", async (req, res) => {
  try {
    const { owner } = req.query;
    const filter = {};
    if (owner) filter.owner = owner;
    const letters = await Letter.find(filter).sort({ createdAt: -1 }).limit(200).lean();
    res.json(letters);
  } catch (err) {
    console.error("Error fetching letters:", err);
    res.status(500).json({ error: "Failed to fetch letters" });
  }
});

/**
 * GET /api/letters/:id
 */
router.get("/:id", async (req, res) => {
  try {
    const letter = await Letter.findById(req.params.id).lean();
    if (!letter) return res.status(404).json({ error: "Letter not found" });
    res.json(letter);
  } catch (err) {
    console.error("Error fetching letter:", err);
    res.status(500).json({ error: "Failed to fetch letter" });
  }
});

/**
 * (Optional) POST /api/letters
 * If you want the frontend to be able to save letters as a separate step,
 * you can enable this. It accepts { title, situation, letter, model, owner }.
 */
router.post("/", async (req, res) => {
  try {
    const { title, situation, letter: text, model, owner } = req.body;
    if (!situation || !situation.trim()) return res.status(400).json({ error: "situation required" });
    if (!text || !text.trim()) return res.status(400).json({ error: "letter text required" });

    const saved = await Letter.create({
      title: title ? String(title).slice(0, 140) : "Letter from Future",
      situation,
      letter: text,
      model: model || "",
      owner: owner || undefined,
      crisis: false,
    });

    res.status(201).json({ savedId: saved._id, saved });
  } catch (err) {
    console.error("Error saving letter:", err);
    res.status(500).json({ error: "Failed to save letter" });
  }
});

/**
 * Export router AND the Mongoose model so server.js can import the model as:
 * const lettersRouter = require('./routes/letters');
 * const Letter = lettersRouter.Letter;
 */
module.exports = router;
module.exports.Letter = Letter;
