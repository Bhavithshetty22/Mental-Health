// server.js (updated with improved mood detection)
require("dotenv").config(); // Load .env first

const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const rateLimit = require("express-rate-limit");
const axios = require("axios");

const moodRoutes = require("./routes/moodRoutes");
const { GoogleGenerativeAI } = require("@google/generative-ai");

const app = express();
const PORT = process.env.PORT || 5000;

// ===== CORS Middleware =====
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || "http://localhost:5173";
app.use(
  cors({
    origin: CLIENT_ORIGIN,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  })
);

// ===== Middleware =====
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
    max: 20, // limit each IP to 20 requests per windowMs
  })
);

// ===== Debug .env =====
console.log("DEBUG MONGO_URI:", process.env.MONGO_URI ? "present" : "MISSING");
console.log("DEBUG GEMINI_API_KEY:", process.env.GEMINI_API_KEY ? "present" : "MISSING");
console.log("DEBUG HUGGING_FACE_TOKEN:", process.env.HUGGING_FACE_TOKEN ? "present" : "MISSING");

// ===== Connect to MongoDB =====
if (process.env.MONGO_URI) {
  mongoose
    .connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    })
    .then(() => console.log("✅ MongoDB connected"))
    .catch((err) => console.error("❌ MongoDB connection error:", err));
} else {
  console.warn("⚠️ MONGO_URI missing - running without database");
}

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
  res.json({
    status: "OK",
    message: "Health check passed",
  });
});

// ===== Use mood routes =====
if (process.env.MONGO_URI) {
  app.use("/api/moods", moodRoutes);
}

// ===== Generative AI setup =====
const GEMINI_KEY = process.env.GEMINI_API_KEY || "";
const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-1.5-flash";
const USE_FAKE = process.env.USE_FAKE === "true";

let genAI = null;
if (GEMINI_KEY) {
  try {
    genAI = new GoogleGenerativeAI(GEMINI_KEY);
  } catch (err) {
    console.warn("Could not instantiate GoogleGenerativeAI client:", err?.message);
  }
}

// ===== Crisis detection =====
const CRISIS_KEYWORDS = [
  "suicide", "kill myself", "end my life", "self-harm", "hurt myself",
  "i want to die", "i can't go on", "ending it all", "no point living"
];

function detectCrisis(text) {
  if (!text) return false;
  const t = text.toLowerCase();
  return CRISIS_KEYWORDS.some((k) => t.includes(k));
}

// ===== Hugging Face Configuration =====
const HUGGING_FACE_TOKEN = process.env.HUGGING_FACE_TOKEN;

// Try multiple emotion detection models as fallbacks
const EMOTION_MODELS = [
  "cardiffnlp/twitter-roberta-base-emotion-multilabel-latest",
  "j-hartmann/emotion-english-distilroberta-base",
  "SamLowe/roberta-base-go_emotions"
];

// Fallback emotion detection using keyword matching
function detectEmotionFallback(text) {
  const emotionKeywords = {
    joy: ["happy", "excited", "great", "amazing", "wonderful", "fantastic", "good", "pleased", "delighted"],
    sadness: ["sad", "depressed", "down", "upset", "disappointed", "hurt", "cry", "crying", "lonely"],
    anger: ["angry", "mad", "furious", "annoyed", "irritated", "frustrated", "hate", "pissed"],
    fear: ["scared", "afraid", "anxious", "worried", "nervous", "panic", "terrified", "stress", "stressed"],
    surprise: ["surprised", "shocked", "amazed", "unexpected", "wow", "unbelievable"],
    disgust: ["disgusted", "sick", "gross", "awful", "terrible", "horrible"],
    neutral: ["okay", "fine", "normal", "average", "alright"]
  };

  const textLower = text.toLowerCase();
  const scores = {};

  // Calculate scores for each emotion
  Object.keys(emotionKeywords).forEach(emotion => {
    scores[emotion] = 0;
    emotionKeywords[emotion].forEach(keyword => {
      if (textLower.includes(keyword)) {
        scores[emotion] += 1;
      }
    });
  });

  // Find the emotion with highest score
  const maxEmotion = Object.keys(scores).reduce((a, b) => 
    scores[a] > scores[b] ? a : b
  );

  const maxScore = scores[maxEmotion];
  
  // If no keywords matched, default to neutral
  if (maxScore === 0) {
    return {
      detectedMood: "neutral",
      confidence: 0.5,
      allPredictions: [
        { label: "neutral", score: 0.5 },
        { label: "joy", score: 0.1 },
        { label: "sadness", score: 0.1 }
      ]
    };
  }

  // Create prediction array
  const predictions = Object.keys(scores).map(emotion => ({
    label: emotion,
    score: scores[emotion] / Math.max(1, maxScore) * 0.8 // Normalize and cap at 0.8
  })).sort((a, b) => b.score - a.score);

  return {
    detectedMood: maxEmotion,
    confidence: predictions[0].score,
    allPredictions: predictions
  };
}

// Enhanced mood detection with multiple fallbacks
async function detectMoodWithFallback(text) {
  if (!HUGGING_FACE_TOKEN) {
    console.log("Using fallback emotion detection (no HF token)");
    return detectEmotionFallback(text);
  }

  // Try Hugging Face models
  for (const modelUrl of EMOTION_MODELS) {
    try {
      console.log(`Trying model: ${modelUrl}`);
      
      const response = await axios.post(
        `https://api-inference.huggingface.co/models/${modelUrl}`,
        {
          inputs: text,
          options: {
            wait_for_model: true,
            use_cache: false
          }
        },
        {
          headers: {
            Authorization: `Bearer ${HUGGING_FACE_TOKEN}`,
            "Content-Type": "application/json",
          },
          timeout: 15000, // 15 second timeout
        }
      );

      console.log("HF Response:", response.data);

      let predictions = response.data;
      
      // Handle different response formats
      if (Array.isArray(predictions) && predictions.length > 0) {
        // Handle multi-label format
        if (Array.isArray(predictions[0])) {
          predictions = predictions[0];
        }

        // Normalize the predictions
        predictions = predictions.map(pred => ({
          label: pred.label?.toLowerCase() || pred.LABEL?.toLowerCase() || 'unknown',
          score: pred.score || pred.Score || 0
        }));

        // Find top prediction
        const topPrediction = predictions.reduce((prev, current) => 
          (prev.score > current.score) ? prev : current
        );

        return {
          detectedMood: topPrediction.label,
          confidence: topPrediction.score,
          allPredictions: predictions.slice(0, 5) // Top 5 predictions
        };
      }
    } catch (error) {
      console.error(`Model ${modelUrl} failed:`, error.message);
      
      if (error.response?.status === 503) {
        console.log("Model is loading, trying next model...");
        continue;
      }
      
      if (error.response?.status === 429) {
        console.log("Rate limited, trying next model...");
        continue;
      }
    }
  }

  // If all HF models fail, use fallback
  console.log("All HF models failed, using keyword-based fallback");
  return detectEmotionFallback(text);
}

// ===== Mood detection endpoint =====
app.post("/api/detect-mood", async (req, res) => {
  try {
    const { text } = req.body;
    
    if (!text || !text.trim()) {
      return res.status(400).json({ error: "No text provided" });
    }

    console.log("Detecting mood for text:", text.substring(0, 100) + "...");

    // Use enhanced mood detection with fallbacks
    const result = await detectMoodWithFallback(text);
    
    // Get mood suggestions
    const moodSuggestions = getMoodSuggestions(result.detectedMood);

    const response = {
      detectedMood: result.detectedMood,
      confidence: result.confidence,
      allPredictions: result.allPredictions,
      suggestions: moodSuggestions,
      method: HUGGING_FACE_TOKEN ? "huggingface" : "fallback"
    };

    console.log("Mood detection result:", {
      mood: response.detectedMood,
      confidence: response.confidence,
      method: response.method
    });

    res.json(response);

  } catch (error) {
    console.error("Error in mood detection:", error);
    
    // Final fallback - use simple keyword detection
    try {
      const fallbackResult = detectEmotionFallback(req.body.text);
      const moodSuggestions = getMoodSuggestions(fallbackResult.detectedMood);
      
      res.json({
        ...fallbackResult,
        suggestions: moodSuggestions,
        method: "emergency_fallback",
        warning: "Using basic emotion detection due to service errors"
      });
    } catch (fallbackError) {
      res.status(500).json({
        error: "All emotion detection methods failed",
        details: error.message
      });
    }
  }
});

// Helper function to provide mood-based suggestions
function getMoodSuggestions(mood) {
  const suggestions = {
    'joy': {
      message: "You're feeling joyful! 🌟",
      tips: [
        "Share your happiness with someone you care about",
        "Take a moment to appreciate what's going well",
        "Consider writing down what made you feel this way"
      ]
    },
    'happiness': {
      message: "You're feeling happy! 😊",
      tips: [
        "Savor this positive moment",
        "Share your good mood with others",
        "Remember what brought you this joy"
      ]
    },
    'sadness': {
      message: "It seems like you're feeling sad. 💙",
      tips: [
        "It's okay to feel sad - emotions are temporary",
        "Consider talking to a friend or loved one",
        "Try some gentle self-care activities",
        "Remember that this feeling will pass"
      ]
    },
    'anger': {
      message: "You seem to be feeling angry. 🔥",
      tips: [
        "Take some deep breaths to help calm down",
        "Try going for a walk or doing some exercise",
        "Consider what's really bothering you underneath the anger",
        "It might help to write about your feelings"
      ]
    },
    'fear': {
      message: "It looks like you might be feeling anxious or fearful. 🤗",
      tips: [
        "Try some deep breathing exercises",
        "Focus on what you can control right now",
        "Consider talking to someone you trust",
        "Remember that you've overcome challenges before"
      ]
    },
    'surprise': {
      message: "You seem surprised! 😮",
      tips: [
        "Take a moment to process what happened",
        "It's normal to need time to adjust to unexpected things",
        "Consider how this surprise might affect your day"
      ]
    },
    'disgust': {
      message: "Something seems to be bothering you. 😔",
      tips: [
        "It's okay to feel put off by certain things",
        "Try to identify what specifically is causing this feeling",
        "Consider if there's a way to address or avoid what's bothering you"
      ]
    },
    'neutral': {
      message: "You seem to be feeling neutral today. 😐",
      tips: [
        "Neutral feelings are completely normal",
        "Consider what might bring you some joy today",
        "Sometimes taking a small positive action can shift your mood"
      ]
    }
  };

  const moodKey = mood?.toLowerCase() || 'neutral';
  return suggestions[moodKey] || suggestions['neutral'];
}

// ===== /api/generate endpoint =====
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

    if (USE_FAKE || !genAI) {
      return res.json({
        letter:
          "Dear past me,\n\nEverything looks a bit intense right now, but looking back this was one of the turning points. You took small, steady steps forward, and each day got a little easier. Trust in your resilience. — Future You",
      });
    }

    // Build system + user prompts
    const systemPrompt =
      "You are an empathetic, hopeful, and realistic future version of the user. Write a warm short letter (3-6 short paragraphs) from their future self about how the current situation turned out, what small practical steps were taken, and encouraging lessons learned. Do not give medical or legal advice. If the user is in severe crisis include a suggestion to seek help and do not give instructions for self-harm.";

    const userPrompt = `Current situation:\n"""${situation}"""\n\nWrite the letter as if it's from the user's future self, focusing on reassurance, small actionable steps, and hope. Keep it empathetic and concise.`;

    const combinedPrompt = `${systemPrompt}\n\n${userPrompt}`;

    // Get model and generate
    const model = genAI.getGenerativeModel({ model: GEMINI_MODEL });
    const result = await model.generateContent(combinedPrompt);
    const response = await result.response;
    const letterText = response.text();

    return res.json({ letter: letterText });
  } catch (err) {
    console.error("Server error in /api/generate:", err);
    return res.status(500).json({
      error: "Generation failed",
      details: err.message || String(err),
    });
  }
});

// ===== 404 handler =====
app.use((req, res) => {
  res.status(404).json({
    error: `Route not found: ${req.method} ${req.path}`,
  });
});

// ===== Start server =====
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`✅ Test routes: /, /health, /api/health, /api/moods, /api/generate, /api/detect-mood`);
});