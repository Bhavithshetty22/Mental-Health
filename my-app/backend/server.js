// server.js
require("dotenv").config(); // Load .env first

const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const rateLimit = require("express-rate-limit");

const moodRoutes = require("./routes/moodRoutes"); // existing mood routes
const lettersRouter = require("./routes/letters"); // exports router and .Letter model
const { GoogleGenerativeAI } = require("@google/generative-ai");

const app = express();
const PORT = process.env.PORT || 5000;

// ===== CORS Middleware =====
// Allow setting via env or default to React dev server
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || "http://localhost:5173";

// ===== Middleware (CORS + JSON) =====
app.use(
  cors({
    origin: CLIENT_ORIGIN,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  })
);
app.use(express.json());

// ===== Request logging =====
app.use((req, res, next) => {
  console.log(new Date().toISOString(), req.method, req.url);
  next();
});

// ===== Rate limiter applied to API routes =====
app.use(
  "/api/",
  rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 20,
  })
);

// ===== Debug .env =====
console.log("DEBUG MONGO_URI:", process.env.MONGO_URI ? "present" : "MISSING");
console.log("DEBUG GEMINI_API_KEY:", process.env.GEMINI_API_KEY ? "present" : "MISSING");
console.log("DEBUG GEMINI_MODEL:", process.env.GEMINI_MODEL || "default");
console.log("DEBUG USE_FAKE:", process.env.USE_FAKE || "false");
console.log("DEBUG CLIENT_ORIGIN:", CLIENT_ORIGIN);

// ===== Connect to MongoDB =====
if (!process.env.MONGO_URI) {
  console.error("❌ MONGO_URI is missing! Check your .env file.");
  process.exit(1);
}

mongoose
  .connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log("✅ MongoDB connected"))
  .catch((err) => console.error("❌ MongoDB connection error:", err));

// ===== Basic test routes =====
app.get("/", (req, res) => {
  res.json({
    message: "Server is working!",
    timestamp: new Date().toISOString(),
    pid: process.pid,
  });
});

app.get("/health", (req, res) => res.json({ status: "ok", pid: process.pid }));

app.get("/api/health", (req, res) => {
  res.json({ status: "OK", message: "Health check passed" });
});

// ===== Use mood routes (unchanged) =====
app.use("/api/moods", moodRoutes);

// ===== Mount letters router (after JSON middleware) =====
app.use("/api/letters", lettersRouter);
// Grab model exported from router file
const Letter = lettersRouter.Letter;
// after you require other routers
const songsRouter = require("./routes/songs");
app.use("/api/songs", songsRouter);
const creativeRouter = require("./routes/creative");
app.use("/api/creative", creativeRouter);

// ===== Generative AI setup =====
const GEMINI_KEY = process.env.GEMINI_API_KEY || "";
const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-1.5-flash";
const USE_FAKE = process.env.USE_FAKE === "true";

if (!GEMINI_KEY && !USE_FAKE) {
  console.warn("⚠️ GEMINI_API_KEY missing and USE_FAKE not enabled. AI generation will fail unless USE_FAKE=true.");
}

let genAI = null;
try {
  genAI = new GoogleGenerativeAI(GEMINI_KEY);
} catch (err) {
  console.warn("Could not instantiate GoogleGenerativeAI client:", err && err.message);
  genAI = null;
}

const CRISIS_KEYWORDS = [
  "suicide",
  "kill myself",
  "end my life",
  "self-harm",
  "hurt myself",
  "i want to die",
  "i can't go on",
];

function detectCrisis(text) {
  if (!text) return false;
  const t = text.toLowerCase();
  return CRISIS_KEYWORDS.some((k) => t.includes(k));
}

// ===== /api/generate endpoint =====
app.post("/api/generate", async (req, res) => {
  try {
    const { situation, title, owner } = req.body;
    if (!situation || !situation.trim()) {
      return res.status(400).json({ error: "No situation provided" });
    }

    if (detectCrisis(situation)) {
      // Do not save crisis content
      return res.json({
        crisis: true,
        message:
          "I'm really sorry you're feeling this way. I can't help in a crisis. Please contact your local emergency services or a crisis hotline right now, or reach out to someone you trust.",
      });
    }

    if (USE_FAKE) {
      const fakeLetter =
        "Dear past me,\n\nEverything looks a bit intense right now, but looking back this was one of the turning points. You took small, steady steps... — Future You";

      // try saving fake letter (optional)
      let savedDoc = null;
      try {
        savedDoc = await Letter.create({
          title: title ? String(title).slice(0, 140) : "From the Future",
          situation,
          letter: fakeLetter,
          model: "FAKE",
          crisis: false,
          owner: owner || undefined,
        });
      } catch (saveErr) {
        console.error("Warning: failed to save fake letter:", saveErr && saveErr.message);
      }

      return res.json({ letter: fakeLetter, savedId: savedDoc ? savedDoc._id : null });
    }

    if (!genAI) {
      return res.status(500).json({ error: "AI client not initialized" });
    }

    const systemPrompt =
      "You are an empathetic, hopeful, and realistic future version of the user. Write a warm short letter (3-6 short paragraphs) from their future self about how the current situation turned out, what small practical steps were taken, and encouraging lessons learned. Do not give medical or legal advice. If the user is in severe crisis include a suggestion to seek help and do not give instructions for self-harm.";

    const userPrompt = `Current situation:\n"""${situation}"""\n\nWrite the letter as if it's from the user's future self, focusing on reassurance, small actionable steps, and hope. Keep it empathetic and concise.`;

    const combinedPrompt = `${systemPrompt}\n\n${userPrompt}`;

    const model = genAI.getGenerativeModel({ model: GEMINI_MODEL });
    const result = await model.generateContent(combinedPrompt);
    const response = await result.response;
    const letterText = response.text();

    // Save to DB (non-blocking error handling)
    let savedDoc = null;
    try {
      savedDoc = await Letter.create({
        title: title ? String(title).slice(0, 140) : "Letter from Future",
        situation,
        letter: letterText,
        model: GEMINI_MODEL,
        crisis: false,
        owner: owner || undefined,
      });
    } catch (saveErr) {
      console.error("Warning: failed to save generated letter:", saveErr && saveErr.message);
    }

    return res.json({ letter: letterText, savedId: savedDoc ? savedDoc._id : null });
  } catch (err) {
    console.error("Server error in /api/generate:", err);
    if (err && err.message) console.error("Error message:", err.message);
    if (err && err.status) console.error("Error status:", err.status);

    return res.status(500).json({ error: "Generation failed", details: err.message || String(err) });
  }
});

// ===== 404 handler =====
app.use((req, res) => {
  res.status(404).json({ error: `Route not found: ${req.method} ${req.path}` });
});

// ===== Start server =====
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`✅ Test routes: /, /health, /api/health, /api/moods, /api/letters, /api/generate`);
});
