// backend/routes/creative.js
const express = require("express");
const router = express.Router();
const { GoogleGenerativeAI } = require("@google/generative-ai");

const GEMINI_KEY = process.env.GEMINI_API_KEY || "";
const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-1.5-flash";
const USE_FAKE = process.env.USE_FAKE === "true";

let genAI = null;
if (GEMINI_KEY) {
  try {
    genAI = new GoogleGenerativeAI(GEMINI_KEY);
  } catch (err) {
    console.warn("Could not instantiate GoogleGenerativeAI in creative route:", err?.message);
  }
}

router.post("/", async (req, res) => {
  try {
    const { text } = req.body;
    if (!text || !text.trim()) return res.status(400).json({ error: "text required" });

    if (USE_FAKE) {
      return res.json({
        story: "You walked through the rain and found an unexpected moment of clarity — a small kindness, a warm cup of tea, and the knowledge that small steps tomorrow will add up.",
        poem: "Raindrops on the window pane,\nMemories stir, then gently wane.\nHope flickers bright like morning's gold,\nA softer strength in stories told."
      });
    }

    if (!genAI) {
      return res.status(500).json({ error: "AI client not initialized. Set GEMINI_API_KEY." });
    }

    // We'll ask for a short inspiring micro-story (2-4 paragraphs) and a short poem (3-6 lines).
    const systemPrompt = `You are a compassionate creative writer. Given a short user journal, create two things:
1) A short, uplifting micro-story (2-4 short paragraphs) that relates to the journal's themes and ends with a hopeful, practical idea.
2) A short poem (3-6 lines) that captures the mood.

Return a JSON object with exactly two keys: "story" and "poem". The values should be strings. Do NOT include extra commentary outside the JSON.`;

    const userPrompt = `Journal text:\n"""${text}"""\n\nReturn:\n{ "story": "...", "poem": "..." }`;

    const combined = `${systemPrompt}\n\n${userPrompt}`;

    const model = genAI.getGenerativeModel({ model: GEMINI_MODEL });
    const result = await model.generateContent(combined);
    const response = await result.response;
    const raw = response.text();

    // try parse JSON
    try {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === "object" && (parsed.story || parsed.poem)) {
        return res.json({ story: String(parsed.story || "").trim(), poem: String(parsed.poem || "").trim() });
      }
    } catch (e) {
      // fallthrough to attempt crude extraction
    }

    // crude extraction if model returned text not strictly JSON
    // look for "story:" and "poem:" sections
    const lower = raw.toLowerCase();
    let story = "";
    let poem = "";

    // try JSON-like substring
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        const parsed = JSON.parse(jsonMatch[0]);
        if (parsed) {
          story = parsed.story || "";
          poem = parsed.poem || "";
        }
      } catch (_) {}
    }

    // fallback: split by headings
    if (!story) {
      const sMatch = raw.match(/story[:\-]\s*([\s\S]*?)(poem[:\-]|\n\n|$)/i);
      if (sMatch) story = sMatch[1].trim();
    }
    if (!poem) {
      const pMatch = raw.match(/poem[:\-]\s*([\s\S]*?)$/i);
      if (pMatch) poem = pMatch[1].trim();
    }

    if (!story && !poem) {
      // last resort: return raw as story
      story = raw.trim();
    }

    return res.json({ story, poem });
  } catch (err) {
    console.error("Error in /api/creative:", err);
    return res.status(500).json({ error: "Server error", details: err.message || String(err) });
  }
});

module.exports = router;
