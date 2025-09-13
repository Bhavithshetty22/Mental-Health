// backend/server.js
const express = require("express");
const rateLimit = require("express-rate-limit");
const cors = require("cors");
require("dotenv").config();

const { GoogleGenerativeAI } = require("@google/generative-ai"); // Correct import

const app = express();
app.use(express.json());
app.use(cors());

app.get("/health", (req, res) => res.json({ status: "ok", pid: process.pid }));
app.use((req, res, next) => {
  console.log(new Date().toISOString(), req.method, req.url);
  next();
});

app.use(
  "/api/",
  rateLimit({
    windowMs: 60 * 1000,
    max: 20,
  })
);

const GEMINI_KEY = process.env.GEMINI_API_KEY || "";
const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-1.5-flash"; // Correct model name
const USE_FAKE = process.env.USE_FAKE === "true";

if (!GEMINI_KEY && !USE_FAKE) {
  console.warn("GEMINI_API_KEY missing and USE_FAKE not enabled. Set backend/.env accordingly.");
}

// Instantiate SDK client correctly
const genAI = new GoogleGenerativeAI(GEMINI_KEY);

const CRISIS_KEYWORDS = [
  "suicide","kill myself","end my life","self-harm","hurt myself",
  "i want to die","i can't go on",
];

function detectCrisis(text) {
  if (!text) return false;
  const t = text.toLowerCase();
  return CRISIS_KEYWORDS.some((k) => t.includes(k));
}

app.post("/api/generate", async (req, res) => {
  try {
    const { situation } = req.body;
    if (!situation || !situation.trim()) {
      return res.status(400).json({ error: "No situation provided" });
    }

    if (detectCrisis(situation)) {
      return res.json({
        crisis: true,
        message:
          "I'm really sorry you're feeling this way. I can't help in a crisis. Please contact your local emergency services or a crisis hotline right now, or reach out to someone you trust.",
      });
    }

    if (USE_FAKE) {
      return res.json({
        letter:
          "Dear past me,\n\nEverything looks a bit intense right now, but looking back this was one of the turning points. You took small, steady steps... — Future You",
      });
    }

    // Build the system + user prompt
    const systemPrompt =
      "You are an empathetic, hopeful, and realistic future version of the user. Write a warm short letter (3-6 short paragraphs) from their future self about how the current situation turned out, what small practical steps were taken, and encouraging lessons learned. Do not give medical or legal advice. If the user is in severe crisis include a suggestion to seek help and do not give instructions for self-harm.";

    const userPrompt = `Current situation:\n"""${situation}"""\n\nWrite the letter as if it's from the user's future self, focusing on reassurance, small actionable steps, and hope. Keep it empathetic and concise.`;

    // Get the model
    const model = genAI.getGenerativeModel({ model: GEMINI_MODEL });

    // Generate content with correct format
    const combinedPrompt = `${systemPrompt}\n\n${userPrompt}`;
    const result = await model.generateContent(combinedPrompt);

    const response = await result.response;
    const letterText = response.text();

    return res.json({ letter: letterText });
  } catch (err) {
    console.error("Server error:", err);
    
    // More detailed error logging for debugging
    if (err.message) {
      console.error("Error message:", err.message);
    }
    if (err.status) {
      console.error("Error status:", err.status);
    }
    
    return res.status(500).json({ 
      error: "Generation failed", 
      details: err.message || String(err) 
    });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Backend listening on port ${PORT}`));