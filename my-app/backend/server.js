// server.js (enhanced with Vertex AI Imagen + Creative Endpoint + Google Cloud TTS)

require("dotenv").config(); // Load .env first

const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const rateLimit = require("express-rate-limit");
const axios = require("axios");
const { GoogleAuth } = require('google-auth-library');
const textToSpeech = require('@google-cloud/text-to-speech');

const moodRoutes = require("./routes/moodRoutes"); 
const lettersRouter = require("./routes/letters"); 
const moodTrackerRouter = require("./routes/mood-tracker"); // Mood image routes
const authRoutes = require("./routes/auth");
const communityRoutes = require("./routes/community");

const { GoogleGenerativeAI } = require("@google/generative-ai");

const app = express();
const PORT = process.env.PORT || 5000;

// ===== Enhanced CORS Configuration =====
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || "http://localhost:5173";
// ===== Simplified CORS Configuration for Development =====
app.use(
  cors({
    origin: function (origin, callback) {
      // Allow requests with no origin (like mobile apps, Postman, server-to-server)
      if (!origin) return callback(null, true);
      
      // For development, allow all localhost origins
      if (origin.includes('localhost') || origin.includes('127.0.0.1')) {
        return callback(null, true);
      }
      
      // Allow specific production origins
      const allowedOrigins = [
        process.env.CLIENT_ORIGIN,
        'http://localhost:5173',
        'http://localhost:5000',  // Allow server to call itself
        'http://localhost:3000',
        'http://localhost:8080'
      ];
      
      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      
      console.log(`CORS blocked origin: ${origin}`);
      // In development, allow it anyway
      callback(null, true);
    },
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allowedHeaders: [
      "Content-Type", 
      "Authorization", 
      "X-Requested-With",
      "Accept",
      "Origin"
    ],
    credentials: true,
    optionsSuccessStatus: 200
  })
);

// Add security headers
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
  next();
});

app.use((req, res, next) => {
  res.setHeader("Cross-Origin-Opener-Policy", "same-origin-allow-popups");
  next();
});

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ===== Enhanced Request logging with error tracking =====
app.use((req, res, next) => {
  const start = Date.now();
  
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url} - Origin: ${req.get('Origin') || 'none'}`);
  
  // Log when response finishes
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url} - ${res.statusCode} (${duration}ms)`);
  });
  
  next();
});

// ===== Enhanced Rate limiter with better error handling =====
const limiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 50, // Increased limit
  message: {
    error: "Too many requests from this IP, please try again later.",
    retryAfter: 60
  },
  standardHeaders: true,
  legacyHeaders: false,
  // Custom handler for rate limit exceeded
  handler: (req, res) => {
    console.log(`Rate limit exceeded for IP: ${req.ip}`);
    res.status(429).json({
      error: "Too many requests",
      retryAfter: 60
    });
  }
});

app.use("/api/", limiter);

// ===== Initialize Google Cloud Text-to-Speech =====
let ttsClient = null;
if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
  try {
    ttsClient = new textToSpeech.TextToSpeechClient();
    console.log("✅ Google Cloud Text-to-Speech client initialized");
  } catch (err) {
    console.error("❌ Could not instantiate Text-to-Speech client:", err?.message);
  }
}

// ===== Debug .env =====
console.log("DEBUG MONGO_URI:", process.env.MONGO_URI ? "present" : "MISSING");
console.log("DEBUG GEMINI_API_KEY:", process.env.GEMINI_API_KEY ? "present" : "MISSING");
console.log("DEBUG HUGGING_FACE_TOKEN:", process.env.HUGGING_FACE_TOKEN ? "present" : "MISSING");
console.log("DEBUG VERTEX_PROJECT_ID:", process.env.VERTEX_PROJECT_ID ? "present" : "MISSING");
console.log("DEBUG VERTEX_LOCATION:", process.env.VERTEX_LOCATION || "us-central1 (default)");
console.log("DEBUG IMAGEN_MODEL:", process.env.IMAGEN_MODEL || "imagen-3.0-generate-001 (default)");
console.log("DEBUG GOOGLE_APPLICATION_CREDENTIALS:", process.env.GOOGLE_APPLICATION_CREDENTIALS ? "present" : "MISSING");

// ===== Enhanced MongoDB Connection =====
if (process.env.MONGO_URI) {
  mongoose
    .connect(process.env.MONGO_URI, {
      serverSelectionTimeoutMS: 5000, // Timeout after 5s instead of 30s
      socketTimeoutMS: 45000, // Close sockets after 45s of inactivity
      maxPoolSize: 10, // Maintain up to 10 socket connections
      bufferCommands: false // Disable mongoose buffering
    })
    .then(() => {
      console.log("✅ MongoDB connected successfully");
    })
    .catch((err) => {
      console.error("❌ MongoDB connection error:", err.message);
    });

  // Handle MongoDB connection events
  mongoose.connection.on('error', (err) => {
    console.error('MongoDB connection error:', err);
  });

  mongoose.connection.on('disconnected', () => {
    console.warn('⚠️ MongoDB disconnected');
  });

  mongoose.connection.on('reconnected', () => {
    console.log('✅ MongoDB reconnected');
  });
} else {
  console.warn("⚠️ MONGO_URI missing - running without database");
}

// ===== Enhanced Basic test routes =====
app.get("/", (req, res) => {
  res.json({
    message: "Server is working!",
    timestamp: new Date().toISOString(),
    pid: process.pid,
    env: process.env.NODE_ENV || 'development',
    mongoConnected: mongoose.connection.readyState === 1
  });
});

app.get("/health", (req, res) => {
  const health = {
    status: "ok", 
    pid: process.pid,
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    mongoStatus: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
    timestamp: new Date().toISOString()
  };
  
  res.json(health);
});

app.get("/api/health", (req, res) => {
  res.json({ 
    status: "OK", 
    message: "Health check passed",
    timestamp: new Date().toISOString()
  });
});

// ===== Mount all routers =====
app.use("/api/auth", authRoutes);
app.use("/api/community", communityRoutes);
app.use("/api/letters", lettersRouter);
app.use("/api/mood-tracker", moodTrackerRouter); // IMPORTANT: Mood image routes

// Use mood routes with error handling
if (process.env.MONGO_URI) {
  app.use("/api/moods", moodRoutes);
}

const Letter = lettersRouter.Letter;

// Load other routers with error handling
try {
  const songsRouter = require("./routes/songs");
  app.use("/api/songs", songsRouter);
} catch (err) {
  console.warn("⚠️ Songs router not available:", err.message);
}

try {
  const creativeRouter = require("./routes/creative");
  app.use("/api/creative", creativeRouter);
} catch (err) {
  console.warn("⚠️ Creative router not available:", err.message);
}

// ===== Enhanced Generative AI setup =====
const GEMINI_KEY = process.env.GEMINI_API_KEY || "";
const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-2.0-flash";
const USE_FAKE = process.env.USE_FAKE === "true";

if (!GEMINI_KEY && !USE_FAKE) {
  console.warn("⚠️ GEMINI_API_KEY missing and USE_FAKE not enabled. AI generation will fail unless USE_FAKE=true.");
}

let genAI = null;
if (GEMINI_KEY) {
  try {
    genAI = new GoogleGenerativeAI(GEMINI_KEY);
    console.log("✅ Google Generative AI client initialized");
  } catch (err) {
    console.error("❌ Could not instantiate GoogleGenerativeAI client:", err?.message);
  }
}

// ===== Crisis detection =====
const CRISIS_KEYWORDS = [
  "suicide", "kill myself", "end my life", "self-harm", "hurt myself",
  "i want to die", "i can't go on", "ending it all", "no point living",
  "want to hurt myself", "cutting myself", "overdose"
];

function detectCrisis(text) {
  if (!text) return false;
  const t = text.toLowerCase();
  return CRISIS_KEYWORDS.some((k) => t.includes(k));
}

// ===== Enhanced Hugging Face Configuration =====
const HUGGING_FACE_TOKEN = process.env.HUGGING_FACE_TOKEN;

const EMOTION_MODELS = [
  "cardiffnlp/twitter-roberta-base-emotion-multilabel-latest",
  "j-hartmann/emotion-english-distilroberta-base",
  "SamLowe/roberta-base-go_emotions"
];

// Enhanced fallback emotion detection
function detectEmotionFallback(text) {
  const emotionKeywords = {
    joy: ["happy", "excited", "great", "amazing", "wonderful", "fantastic", "good", "pleased", "delighted", "cheerful", "elated"],
    sadness: ["sad", "depressed", "down", "upset", "disappointed", "hurt", "cry", "crying", "lonely", "miserable", "devastated"],
    anger: ["angry", "mad", "furious", "annoyed", "irritated", "frustrated", "hate", "pissed", "rage", "outraged"],
    fear: ["scared", "afraid", "anxious", "worried", "nervous", "panic", "terrified", "stress", "stressed", "overwhelmed"],
    surprise: ["surprised", "shocked", "amazed", "unexpected", "wow", "unbelievable", "astonished"],
    disgust: ["disgusted", "sick", "gross", "awful", "terrible", "horrible", "revolting"],
    neutral: ["okay", "fine", "normal", "average", "alright", "usual", "typical"]
  };

  const textLower = text.toLowerCase();
  const scores = {};

  // Calculate weighted scores
  Object.keys(emotionKeywords).forEach(emotion => {
    scores[emotion] = 0;
    emotionKeywords[emotion].forEach((keyword, index) => {
      // Give higher weight to matches found earlier in keyword list (more important words)
      const weight = Math.max(1, emotionKeywords[emotion].length - index) / emotionKeywords[emotion].length;
      if (textLower.includes(keyword)) {
        scores[emotion] += weight;
      }
    });
  });

  const maxEmotion = Object.keys(scores).reduce((a, b) => 
    scores[a] > scores[b] ? a : b
  );

  const maxScore = scores[maxEmotion];
  
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

  const predictions = Object.keys(scores).map(emotion => ({
    label: emotion,
    score: Math.min(0.95, scores[emotion] / Math.max(1, maxScore) * 0.8)
  })).sort((a, b) => b.score - a.score);

  return {
    detectedMood: maxEmotion,
    confidence: predictions[0].score,
    allPredictions: predictions.slice(0, 5)
  };
}

// Enhanced mood detection with better timeout and retry logic
async function detectMoodWithFallback(text) {
  if (!HUGGING_FACE_TOKEN) {
    console.log("Using fallback emotion detection (no HF token)");
    return detectEmotionFallback(text);
  }

  for (let i = 0; i < EMOTION_MODELS.length; i++) {
    const modelUrl = EMOTION_MODELS[i];
    try {
      console.log(`Trying model ${i + 1}/${EMOTION_MODELS.length}: ${modelUrl}`);
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
      
      const response = await axios.post(
        `https://api-inference.huggingface.co/models/${modelUrl}`,
        {
          inputs: text.substring(0, 500), // Limit input length
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
          timeout: 10000,
          signal: controller.signal
        }
      );

      clearTimeout(timeoutId);
      
      let predictions = response.data;
      
      if (Array.isArray(predictions) && predictions.length > 0) {
        if (Array.isArray(predictions[0])) {
          predictions = predictions[0];
        }

        predictions = predictions.map(pred => ({
          label: pred.label?.toLowerCase() || pred.LABEL?.toLowerCase() || 'unknown',
          score: Math.max(0, Math.min(1, pred.score || pred.Score || 0))
        }));

        const topPrediction = predictions.reduce((prev, current) => 
          (prev.score > current.score) ? prev : current
        );

        return {
          detectedMood: topPrediction.label,
          confidence: topPrediction.score,
          allPredictions: predictions.slice(0, 5)
        };
      }
    } catch (error) {
      console.error(`Model ${modelUrl} failed:`, error.message);
      
      if (error.name === 'AbortError') {
        console.log("Request timed out, trying next model...");
      } else if (error.response?.status === 503) {
        console.log("Model is loading, trying next model...");
      } else if (error.response?.status === 429) {
        console.log("Rate limited, trying next model...");
      }
      
      // Don't try more models if this is the last one
      if (i === EMOTION_MODELS.length - 1) break;
    }
  }

  console.log("All HF models failed, using keyword-based fallback");
  return detectEmotionFallback(text);
}

// ===== Enhanced mood detection endpoint =====
app.post("/api/detect-mood", async (req, res) => {
  try {
    const { text } = req.body;
    
    if (!text || !text.trim()) {
      return res.status(400).json({ 
        error: "No text provided",
        code: "MISSING_TEXT"
      });
    }

    if (text.length > 2000) {
      return res.status(400).json({
        error: "Text too long (max 2000 characters)",
        code: "TEXT_TOO_LONG"
      });
    }

    console.log(`Detecting mood for text (${text.length} chars):`, text.substring(0, 100) + "...");

    const result = await detectMoodWithFallback(text);
    const moodSuggestions = getMoodSuggestions(result.detectedMood);

    const response = {
      detectedMood: result.detectedMood,
      confidence: result.confidence,
      allPredictions: result.allPredictions,
      suggestions: moodSuggestions,
      method: HUGGING_FACE_TOKEN ? "huggingface" : "fallback",
      timestamp: new Date().toISOString()
    };

    console.log("Mood detection result:", {
      mood: response.detectedMood,
      confidence: response.confidence.toFixed(3),
      method: response.method
    });

    res.json(response);

  } catch (error) {
    console.error("Error in mood detection:", error);
    
    try {
      const fallbackResult = detectEmotionFallback(req.body.text || "");
      const moodSuggestions = getMoodSuggestions(fallbackResult.detectedMood);
      
      res.json({
        ...fallbackResult,
        suggestions: moodSuggestions,
        method: "emergency_fallback",
        warning: "Using basic emotion detection due to service errors",
        error: error.message
      });
    } catch {
      res.status(500).json({
        error: "All emotion detection methods failed",
        details: error.message,
        code: "DETECTION_FAILED"
      });
    }
  }
});

// Enhanced mood suggestions function
function getMoodSuggestions(mood) {
  const suggestions = {
    'joy': {
      message: "You're feeling joyful! 🌟",
      tips: [
        "Share your happiness with someone you care about",
        "Take a moment to appreciate what's going well",
        "Consider writing down what made you feel this way",
        "Use this positive energy for something creative"
      ]
    },
    'happiness': {
      message: "You're feeling happy! 😊",
      tips: [
        "Savor this positive moment",
        "Share your good mood with others",
        "Remember what brought you this joy",
        "Take a photo or note to remember this feeling"
      ]
    },
    'sadness': {
      message: "It seems like you're feeling sad. 💙",
      tips: [
        "It's okay to feel sad - emotions are temporary",
        "Consider talking to a friend or loved one",
        "Try some gentle self-care activities",
        "Remember that this feeling will pass",
        "Consider what might help you process these feelings"
      ]
    },
    'anger': {
      message: "You seem to be feeling angry. 🔥",
      tips: [
        "Take some deep breaths to help calm down",
        "Try going for a walk or doing some exercise",
        "Consider what's really bothering you underneath the anger",
        "It might help to write about your feelings",
        "Try counting to ten before reacting"
      ]
    },
    'fear': {
      message: "It looks like you might be feeling anxious or fearful. 🤗",
      tips: [
        "Try some deep breathing exercises (4-7-8 technique)",
        "Focus on what you can control right now",
        "Consider talking to someone you trust",
        "Remember that you've overcome challenges before",
        "Ground yourself by naming 5 things you can see, 4 you can hear, etc."
      ]
    },
    'surprise': {
      message: "You seem surprised! 😮",
      tips: [
        "Take a moment to process what happened",
        "It's normal to need time to adjust to unexpected things",
        "Consider how this surprise might affect your day",
        "Ask yourself if this is a positive or challenging surprise"
      ]
    },
    'disgust': {
      message: "Something seems to be bothering you. 😔",
      tips: [
        "It's okay to feel put off by certain things",
        "Try to identify what specifically is causing this feeling",
        "Consider if there's a way to address or avoid what's bothering you",
        "Sometimes discussing it with someone can help"
      ]
    },
    'neutral': {
      message: "You seem to be feeling neutral today. 😐",
      tips: [
        "Neutral feelings are completely normal",
        "Consider what might bring you some joy today",
        "Sometimes taking a small positive action can shift your mood",
        "This could be a good time for reflection or planning"
      ]
    }
  };

  const moodKey = mood?.toLowerCase() || 'neutral';
  return suggestions[moodKey] || suggestions['neutral'];
}

// ===== Google Cloud Text-to-Speech Endpoint =====
app.post('/api/text-to-speech', async (req, res) => {
  try {
    const { text } = req.body;

    if (!text || !text.trim()) {
      return res.status(400).json({ 
        error: 'Text is required',
        code: 'MISSING_TEXT'
      });
    }

    if (text.length > 5000) {
      return res.status(400).json({
        error: 'Text too long (max 5000 characters)',
        code: 'TEXT_TOO_LONG'
      });
    }

    if (!ttsClient) {
      return res.status(500).json({
        error: 'Text-to-Speech service not configured',
        details: 'Please ensure GOOGLE_APPLICATION_CREDENTIALS is set and Text-to-Speech API is enabled',
        code: 'TTS_NOT_CONFIGURED'
      });
    }

    console.log(`Generating speech for text (${text.length} chars)`);

    // Construct the request
    const request = {
      input: { text: text.trim() },
      voice: {
        languageCode: 'en-US',
        name: 'en-US-Neural2-D', // Calm, professional male voice
        ssmlGender: 'MALE'
      },
      audioConfig: {
        audioEncoding: 'MP3',
        speakingRate: 1.0,
        pitch: 0.0,
        volumeGainDb: 0.0,
        effectsProfileId: ['handset-class-device'] // Optimized for voice
      }
    };

    // Perform the text-to-speech request
    const [response] = await ttsClient.synthesizeSpeech(request);

    if (!response.audioContent) {
      throw new Error('No audio content returned from Google TTS');
    }

    // Convert the audio content to base64
    const audioBase64 = response.audioContent.toString('base64');

    console.log(`Speech generated successfully (${audioBase64.length} chars)`);

    res.json({
      audio: audioBase64,
      contentType: 'audio/mpeg',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error in text-to-speech:', error);

    if (error.code === 7) { // PERMISSION_DENIED
      return res.status(403).json({
        error: 'Text-to-Speech API access denied',
        details: 'Please ensure Text-to-Speech API is enabled and service account has proper permissions',
        code: 'PERMISSION_DENIED'
      });
    }

    if (error.code === 8) { // RESOURCE_EXHAUSTED
      return res.status(429).json({
        error: 'Text-to-Speech quota exceeded',
        details: 'Too many requests. Please try again later.',
        code: 'QUOTA_EXCEEDED'
      });
    }

    res.status(500).json({
      error: 'Failed to generate speech',
      details: error.message,
      code: 'TTS_ERROR'
    });
  }
});

// ===== NEW: Creative Content (Story + Poem) Endpoint =====
app.post('/api/creative', async (req, res) => {
  try {
    const { text } = req.body;

    if (!text || !text.trim()) {
      return res.status(400).json({ 
        error: 'Text is required',
        code: 'MISSING_TEXT'
      });
    }

    if (text.length > 2000) {
      return res.status(400).json({
        error: 'Text too long (max 2000 characters)',
        code: 'TEXT_TOO_LONG'
      });
    }

    console.log(`Generating creative content for text (${text.length} chars)`);

    if (!GEMINI_KEY) {
      return res.status(500).json({
        error: 'AI service not configured',
        code: 'API_KEY_MISSING'
      });
    }

    // Call Gemini API
    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_KEY}`;

    const prompt = `Based on the following journal entry, create two things:

1. A short inspirational story (2-3 paragraphs) that relates to the emotions and situation described. Make it uplifting and hopeful.

2. A poem (8-12 lines) that captures the mood and feelings expressed.

Journal entry:
"""
${text}
"""

Please format your response EXACTLY as follows (use these exact labels):

SHORT STORY:
[Your story here]

POEM:
[Your poem here]

Important: Keep the story warm and encouraging. The poem should be reflective and meaningful.`;

    const requestBody = {
      contents: [
        {
          role: 'user',
          parts: [
            {
              text: prompt
            }
          ]
        }
      ],
      generationConfig: {
        maxOutputTokens: 2048,
        temperature: 0.8,
        topP: 0.9,
        topK: 40
      }
    };

    const response = await axios.post(geminiUrl, requestBody, {
      headers: {
        'Content-Type': 'application/json'
      },
      timeout: 30000
    });

    // Extract the generated text
    const candidates = response.data?.candidates;
    if (!candidates || candidates.length === 0) {
      throw new Error('No candidates in Gemini response');
    }

    const generatedText = candidates[0]?.content?.parts?.[0]?.text;
    if (!generatedText) {
      throw new Error('No text in Gemini response');
    }

    console.log('Generated creative content successfully');

    // Parse the response to extract story and poem
    const storyMatch = generatedText.match(/SHORT STORY:\s*\n([\s\S]*?)(?=\n\s*POEM:|$)/i);
    const poemMatch = generatedText.match(/POEM:\s*\n([\s\S]*?)$/i);

    let story = storyMatch ? storyMatch[1].trim() : '';
    let poem = poemMatch ? poemMatch[1].trim() : '';

    // Fallback: if parsing failed, try alternative splitting
    if (!story && !poem) {
      const parts = generatedText.split(/\n\s*\n/);
      if (parts.length >= 2) {
        story = parts[0].trim();
        poem = parts.slice(1).join('\n\n').trim();
      } else {
        // Last resort: give them something
        story = generatedText.trim();
        poem = '';
      }
    }

    console.log('Parsed story length:', story.length);
    console.log('Parsed poem length:', poem.length);

    res.json({
      story: story || 'Unable to generate story at this time.',
      poem: poem || 'Unable to generate poem at this time.',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error in /api/creative:', error.message);
    
    if (error.response) {
      console.error('Gemini API Error Response:', JSON.stringify(error.response.data, null, 2));
      
      // Check for specific error types
      if (error.response.data?.error?.message?.includes('API key')) {
        return res.status(401).json({
          error: 'API key expired or invalid. Please renew the API key.',
          code: 'API_KEY_ERROR'
        });
      }
      
      return res.status(error.response.status).json({
        error: 'Failed to generate creative content',
        details: error.response.data,
        code: 'GEMINI_ERROR'
      });
    }

    res.status(500).json({
      error: 'Failed to generate creative content',
      message: error.message,
      code: 'GENERATION_ERROR'
    });
  }
});

// ===== NEW: Vertex AI Imagen Image Generation Endpoint =====
app.post('/api/generate-image', async (req, res) => {
  try {
    const { text } = req.body;

    if (!text || !text.trim()) {
      return res.status(400).json({ 
        error: 'Text is required',
        code: 'MISSING_TEXT'
      });
    }

    if (text.length > 2000) {
      return res.status(400).json({
        error: 'Text too long (max 2000 characters)',
        code: 'TEXT_TOO_LONG'
      });
    }

    console.log(`Generating image for journal entry (${text.length} chars)`);

    // Step 1: Enhance the prompt using Gemini
    let enhancedPrompt;
    
    if (!GEMINI_KEY) {
      console.log("No Gemini API key, using default prompt");
      enhancedPrompt = `A warm and comforting scene with soft light, nature, and peaceful colors that inspire hope and healing.`;
    } else {
      try {
        const geminiResponse = await axios.post(
          `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_KEY}`,
          {
            contents: [
              {
                parts: [
                  {
                    text: `The user shared the following journal entry:\n\n"${text}"\n\n
Transform these emotions into a positive, uplifting, and cinematic image prompt.  

Guidelines:
- Always turn sadness, anger, or loneliness into visuals of hope, peace, or renewal.  
- Avoid disturbing or depressing imagery (no crying faces, violence, or dark visuals).  
- Use nature, light, color, and artistic symbolism to create comforting scenes.  
- Make it dreamy, painterly, and soothing — something that uplifts mental health.  
- Style: soft, artistic, emotional yet hopeful, like a professional painting or photograph.  

Output only the final artistic image prompt, nothing else.`,
                  },
                ],
              },
            ],
          },
          {
            headers: {
              "Content-Type": "application/json",
            },
            timeout: 10000
          }
        );

        enhancedPrompt = geminiResponse.data?.candidates?.[0]?.content?.parts?.[0]?.text || 
          `A warm and comforting scene with soft light, nature, and peaceful colors that inspire hope and healing.`;
        
        console.log("Enhanced prompt:", enhancedPrompt.substring(0, 100) + "...");
      } catch (geminiError) {
        console.error("Gemini enhancement failed:", geminiError.message);
        enhancedPrompt = `A warm and comforting scene with soft light, nature, and peaceful colors that inspire hope and healing.`;
      }
    }

    // Step 2: Generate image using Vertex AI Imagen
    const projectId = process.env.VERTEX_PROJECT_ID;
    const location = process.env.VERTEX_LOCATION || 'us-central1';
    const imagenModel = process.env.IMAGEN_MODEL || 'imagen-3.0-generate-001';
    
    // Remove any :predict or :generateContent suffix if present
    const model = imagenModel.replace(':predict', '').replace(':generateContent', '');

    if (!projectId) {
      return res.status(500).json({
        error: 'Vertex AI not configured (missing VERTEX_PROJECT_ID)',
        code: 'VERTEX_NOT_CONFIGURED'
      });
    }

    console.log(`Calling Vertex AI Imagen (project: ${projectId}, location: ${location})`);

    // Initialize Google Auth
    const auth = new GoogleAuth({
      scopes: ['https://www.googleapis.com/auth/cloud-platform'],
      keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS
    });

    const client = await auth.getClient();
    const accessToken = await client.getAccessToken();

    if (!accessToken || !accessToken.token) {
      throw new Error('Failed to get access token from Google Auth');
    }

    const vertexUrl = `https://${location}-aiplatform.googleapis.com/v1/projects/${projectId}/locations/${location}/publishers/google/models/${model}:predict`;

    const vertexResponse = await axios.post(
      vertexUrl,
      {
        instances: [
          {
            prompt: enhancedPrompt
          }
        ],
        parameters: {
          sampleCount: 1,
          aspectRatio: "1:1",
          safetyFilterLevel: "block_some",
          personGeneration: "allow_adult"
        }
      },
      {
        headers: {
          'Authorization': `Bearer ${accessToken.token}`,
          'Content-Type': 'application/json',
        },
        timeout: 30000 // 30 second timeout for image generation
      }
    );

    // Extract the base64 image from the response
    const imageBase64 = vertexResponse.data?.predictions?.[0]?.bytesBase64Encoded;

    if (!imageBase64) {
      console.error('Vertex AI response:', JSON.stringify(vertexResponse.data));
      throw new Error('No image data returned from Vertex AI');
    }

    console.log(`Image generated successfully (${imageBase64.length} chars)`);

    res.json({
      image: imageBase64,
      prompt: enhancedPrompt,
      model: model,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error generating image:', error);
    
    // Provide specific error messages
    if (error.message?.includes('access token')) {
      return res.status(500).json({ 
        error: 'Authentication failed with Google Cloud',
        details: 'Please check GOOGLE_APPLICATION_CREDENTIALS path and service account permissions',
        code: 'AUTH_ERROR'
      });
    }

    if (error.response?.status === 403) {
      return res.status(403).json({
        error: 'Vertex AI API access denied',
        details: 'Please ensure Vertex AI API is enabled and service account has proper permissions',
        code: 'PERMISSION_DENIED'
      });
    }

    if (error.response?.status === 429) {
      return res.status(429).json({
        error: 'Vertex AI quota exceeded',
        details: 'Too many requests. Please try again later.',
        code: 'QUOTA_EXCEEDED'
      });
    }

    res.status(500).json({ 
      error: 'Failed to generate image',
      details: error.message,
      code: 'GENERATION_ERROR'
    });
  }
});

// ===== Enhanced /api/generate endpoint =====
app.post("/api/generate", async (req, res) => {
  try {
    const { situation, title, owner } = req.body;
    
    if (!situation || !situation.trim()) {
      return res.status(400).json({ 
        error: "No situation provided",
        code: "MISSING_SITUATION"
      });
    }

    if (situation.length > 5000) {
      return res.status(400).json({
        error: "Situation text too long (max 5000 characters)",
        code: "TEXT_TOO_LONG"
      });
    }

    console.log(`Generating letter for situation (${situation.length} chars)`);

    if (detectCrisis(situation)) {
      console.log("Crisis detected - not generating letter");
      return res.json({
        crisis: true,
        message: "I'm really sorry you're feeling this way. Please reach out for help immediately:",
        resources: [
          "Emergency: 911 (US) or your local emergency number",
          "Crisis Text Line: Text HOME to 741741",
          "National Suicide Prevention Lifeline: 988",
          "Or contact a trusted friend, family member, or mental health professional"
        ]
      });
    }

    if (USE_FAKE) {
      console.log("Using fake generation mode");
      const fakeLetter = `Dear past me,

Everything looks a bit intense right now, but looking back this was one of the turning points. You took small, steady steps forward even when you couldn't see the full path ahead.

The situation you're facing now taught you resilience you didn't know you had. You learned to be kinder to yourself during difficult times.

Trust the process, and remember that future you is rooting for present you.

— Future You`;

      let savedDoc = null;
      if (process.env.MONGO_URI) {
        try {
          savedDoc = await Letter.create({
            title: title ? String(title).slice(0, 140) : "From the Future",
            situation,
            letter: fakeLetter,
            model: "FAKE",
            crisis: false,
            owner: owner || undefined,
          });
          console.log("Fake letter saved with ID:", savedDoc._id);
        } catch (saveErr) {
          console.error("Warning: failed to save fake letter:", saveErr?.message);
        }
      }

      return res.json({ 
        letter: fakeLetter, 
        savedId: savedDoc ? savedDoc._id : null,
        mode: "fake"
      });
    }

    if (!genAI) {
      return res.status(500).json({ 
        error: "AI client not initialized",
        code: "AI_CLIENT_ERROR"
      });
    }

    const systemPrompt = `You are an empathetic, hopeful, and realistic future version of the user. Write a warm short letter (3-6 short paragraphs) from their future self about how the current situation turned out, what small practical steps were taken, and encouraging lessons learned. 

Guidelines:
- Be supportive but realistic
- Focus on growth and learning
- Suggest small, actionable steps
- Avoid medical or legal advice
- Keep it personal and warm
- End with hope and encouragement`;

    const userPrompt = `Current situation:\n"""${situation}"""\n\nWrite the letter as if it's from the user's future self, focusing on reassurance, small actionable steps, and hope. Keep it empathetic and concise.`;

    const combinedPrompt = `${systemPrompt}\n\n${userPrompt}`;

    console.log("Calling Gemini API...");
    const model = genAI.getGenerativeModel({ 
      model: GEMINI_MODEL,
      generationConfig: {
        maxOutputTokens: 1000,
        temperature: 0.7,
      }
    });
    
    const result = await model.generateContent(combinedPrompt);
    const response = await result.response;
    const letterText = response.text();

    console.log(`Generated letter (${letterText.length} chars)`);

    // Save to DB with error handling
    let savedDoc = null;
    if (process.env.MONGO_URI) {
      try {
        savedDoc = await Letter.create({
          title: title ? String(title).slice(0, 140) : "Letter from Future",
          situation,
          letter: letterText,
          model: GEMINI_MODEL,
          crisis: false,
          owner: owner || undefined,
        });
        console.log("Letter saved with ID:", savedDoc._id);
      } catch (saveErr) {
        console.error("Warning: failed to save generated letter:", saveErr?.message);
      }
    }

    return res.json({ 
      letter: letterText, 
      savedId: savedDoc ? savedDoc._id : null,
      model: GEMINI_MODEL,
      timestamp: new Date().toISOString()
    });

  } catch (err) {
    console.error("Server error in /api/generate:", err);

    // Check if it's a Gemini API error
    if (err.message?.includes('API key')) {
      return res.status(500).json({
        error: "AI service configuration error",
        code: "API_KEY_ERROR"
      });
    }

    if (err.message?.includes('quota') || err.message?.includes('limit')) {
      return res.status(429).json({
        error: "AI service temporarily unavailable due to quota limits",
        code: "QUOTA_EXCEEDED"
      });
    }

    return res.status(500).json({
      error: "Generation failed",
      details: err.message || String(err),
      code: "GENERATION_ERROR"
    });
  }
});

// ===== 404 handler - MUST come before error handler =====
app.use((req, res, next) => {
  console.log(`404: ${req.method} ${req.path}`);
  res.status(404).json({ 
    error: `Route not found: ${req.method} ${req.path}`,
    availableRoutes: [
      "GET /",
      "GET /health", 
      "GET /api/health",
      "POST /api/generate",
      "POST /api/generate-image",
      "POST /api/creative",
      "POST /api/detect-mood",
      "POST /api/text-to-speech",
      "POST /api/songs",
      "POST /api/auth/signup",
      "POST /api/auth/login",
      "* /api/moods",
      "* /api/letters",
      "* /api/mood-tracker",
      "* /api/community"
    ]
  });
});

// ===== Global error handler - MUST have 4 parameters and come LAST =====
app.use((err, req, res, next) => {
  console.error('Global error handler caught:', err);
  
  // Check if headers were already sent
  if (res.headersSent) {
    return next(err);
  }
  
  // Don't leak error details in production
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  res.status(err.status || 500).json({
    success: false,
    error: err.message || "Internal server error",
    ...(isDevelopment && { details: err.message, stack: err.stack }),
    timestamp: new Date().toISOString()
  });
});

// ===== Graceful shutdown =====
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  mongoose.connection.close();
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  mongoose.connection.close();
  process.exit(0);
});

// ===== Start server =====
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`📝 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔗 Client Origin: ${CLIENT_ORIGIN}`);
  console.log(`✅ Available endpoints:`);
  console.log(`   GET  /`);
  console.log(`   GET  /health`);
  console.log(`   GET  /api/health`);
  console.log(`   POST /api/generate`);
  console.log(`   POST /api/generate-image (Vertex AI Imagen)`);
  console.log(`   POST /api/creative (Story + Poem)`);
  console.log(`   POST /api/detect-mood`);
  console.log(`   POST /api/text-to-speech (Google Cloud TTS)`);
  console.log(`   POST /api/songs`);
  console.log(`   POST /api/auth/signup`);
  console.log(`   POST /api/auth/login`);
  console.log(`   *    /api/moods`);
  console.log(`   *    /api/letters`);
  console.log(`   *    /api/mood-tracker`);
  console.log(`   *    /api/community`);
});