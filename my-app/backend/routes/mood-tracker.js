// routes/mood-tracker.js
const express = require('express');
const router = express.Router();
const axios = require('axios');
const { GoogleAuth } = require('google-auth-library');
const MoodImage = require('../models/MoodImage');
const { authenticateToken } = require('./auth');

const BASE_CHARACTER = "portrait of a young Asian person with medium-length dark hair, soft natural lighting, consistent character design, photorealistic, cinematic lighting, 4k ultra detail, realistic skin texture, same person in all moods, upper body shot";

const MOOD_PROMPTS = {
  terrible: `${BASE_CHARACTER}, crying softly, eyes red and teary, expression of deep sadness and emotional pain, dim cool lighting, empathetic atmosphere, cinematic realism, subtle tears on face, muted tones`,
  
  bad: `${BASE_CHARACTER}, worried and anxious expression, slightly furrowed brows, eyes looking down, low contrast lighting, somber atmosphere, emotional realism, muted background colors`,
  
  okay: `${BASE_CHARACTER}, neutral relaxed expression, gentle eye contact, calm breathing, balanced soft lighting, natural background blur, peaceful composition, warm and cool tones balanced`,
  
  good: `${BASE_CHARACTER}, gentle happy smile, warm eyes, positive calm energy, golden hour lighting, soft shadows, vibrant yet natural tones, cinematic depth of field`,
  
  amazing: `${BASE_CHARACTER}, laughing joyfully, radiant smile, bright eyes, expressive face full of energy, vivid colorful lighting, warm golden tones, cinematic portrait with sparkle in eyes`
};

const MOOD_COLORS = {
  terrible: "#ef4444",
  bad: "#f97316",
  okay: "#f59e0b",
  good: "#3b82f6",
  amazing: "#10b981"
};

const MOOD_DESCRIPTIONS = {
  terrible: "Deeply Sad",
  bad: "Feeling Down",
  okay: "Neutral",
  good: "Happy",
  amazing: "Ecstatic"
};

// Initialize Google Auth
let authClient = null;
async function getAuthToken() {
  if (!authClient) {
    authClient = new GoogleAuth({
      scopes: ['https://www.googleapis.com/auth/cloud-platform']
    });
  }
  const client = await authClient.getClient();
  const token = await client.getAccessToken();
  return token.token;
}

function generateFallbackImage(mood) {
  const color = MOOD_COLORS[mood] || "#999999";
  const description = MOOD_DESCRIPTIONS[mood] || "Neutral";
  
  const svg = `
    <svg width="512" height="512" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:${color};stop-opacity:0.6" />
          <stop offset="100%" style="stop-color:${color};stop-opacity:0.9" />
        </linearGradient>
        <radialGradient id="face-gradient" cx="50%" cy="50%" r="50%">
          <stop offset="0%" style="stop-color:#ffffff;stop-opacity:0.3" />
          <stop offset="100%" style="stop-color:#ffffff;stop-opacity:0.1" />
        </radialGradient>
      </defs>
      <rect width="512" height="512" fill="url(#grad)" rx="40"/>
      
      <g transform="translate(256, 200)">
        <circle cx="0" cy="0" r="80" fill="url(#face-gradient)" stroke="white" stroke-width="3" opacity="0.8"/>
        ${getMoodEyes(mood)}
        ${getMoodMouth(mood)}
      </g>
      
      <ellipse cx="256" cy="380" rx="120" ry="60" fill="url(#face-gradient)" opacity="0.6"/>
      
      <text x="50%" y="90%" font-size="22" text-anchor="middle" fill="white" opacity="0.95" font-family="Arial, sans-serif" font-weight="600">${description}</text>
    </svg>
  `;
  
  const base64 = Buffer.from(svg).toString('base64');
  return `data:image/svg+xml;base64,${base64}`;
}

function getMoodEyes(mood) {
  switch(mood) {
    case 'terrible':
      return `
        <circle cx="-25" cy="-10" r="8" fill="white" opacity="0.9"/>
        <circle cx="25" cy="-10" r="8" fill="white" opacity="0.9"/>
        <line x1="-25" y1="5" x2="-25" y2="25" stroke="white" stroke-width="2" opacity="0.7"/>
        <line x1="25" y1="5" x2="25" y2="25" stroke="white" stroke-width="2" opacity="0.7"/>
      `;
    case 'bad':
      return `
        <ellipse cx="-25" cy="-10" rx="7" ry="9" fill="white" opacity="0.9"/>
        <ellipse cx="25" cy="-10" rx="7" ry="9" fill="white" opacity="0.9"/>
      `;
    case 'okay':
      return `
        <circle cx="-25" cy="-10" r="7" fill="white" opacity="0.9"/>
        <circle cx="25" cy="-10" r="7" fill="white" opacity="0.9"/>
      `;
    case 'good':
      return `
        <circle cx="-25" cy="-10" r="8" fill="white" opacity="0.9"/>
        <circle cx="25" cy="-10" r="8" fill="white" opacity="0.9"/>
        <path d="M -35 -15 Q -25 -20 -15 -15" stroke="white" stroke-width="2" fill="none" opacity="0.8"/>
        <path d="M 15 -15 Q 25 -20 35 -15" stroke="white" stroke-width="2" fill="none" opacity="0.8"/>
      `;
    case 'amazing':
      return `
        <path d="M -35 -10 Q -25 -18 -15 -10" stroke="white" stroke-width="3" fill="none" opacity="0.9"/>
        <path d="M 15 -10 Q 25 -18 35 -10" stroke="white" stroke-width="3" fill="none" opacity="0.9"/>
      `;
    default:
      return `<circle cx="-25" cy="-10" r="7" fill="white" opacity="0.9"/>
              <circle cx="25" cy="-10" r="7" fill="white" opacity="0.9"/>`;
  }
}

function getMoodMouth(mood) {
  switch(mood) {
    case 'terrible':
      return `<path d="M -30 35 Q 0 25 30 35" stroke="white" stroke-width="3" fill="none" opacity="0.9"/>`;
    case 'bad':
      return `<path d="M -25 30 Q 0 28 25 30" stroke="white" stroke-width="2.5" fill="none" opacity="0.9"/>`;
    case 'okay':
      return `<line x1="-25" y1="30" x2="25" y2="30" stroke="white" stroke-width="2.5" opacity="0.9"/>`;
    case 'good':
      return `<path d="M -30 25 Q 0 35 30 25" stroke="white" stroke-width="3" fill="none" opacity="0.9"/>`;
    case 'amazing':
      return `
        <path d="M -35 25 Q 0 45 35 25" stroke="white" stroke-width="3" fill="none" opacity="0.9"/>
        <path d="M -25 28 Q 0 38 25 28" fill="white" opacity="0.3"/>
      `;
    default:
      return `<line x1="-25" y1="30" x2="25" y2="30" stroke="white" stroke-width="2.5" opacity="0.9"/>`;
  }
}

// DEBUG ENDPOINT - Check API configuration
router.get('/debug/config', authenticateToken, async (req, res) => {
  const PROJECT_ID = process.env.GOOGLE_CLOUD_PROJECT_ID;
  
  try {
    const hasAuth = !!process.env.GOOGLE_APPLICATION_CREDENTIALS;
    res.json({
      projectIdExists: !!PROJECT_ID,
      projectId: PROJECT_ID || 'NOT SET',
      credentialsConfigured: hasAuth,
      credentialsPath: process.env.GOOGLE_APPLICATION_CREDENTIALS || 'NOT SET'
    });
  } catch (error) {
    res.json({
      error: error.message,
      projectIdExists: !!PROJECT_ID
    });
  }
});

// GET /api/mood-tracker/image/:mood - Check if mood image exists or generate new one
router.get('/image/:mood', authenticateToken, async (req, res) => {
  try {
    const { mood } = req.params;
    const userId = req.user.id;

    console.log('\n========================================');
    console.log(`[Mood Image] 🎭 Request for mood: ${mood}`);
    console.log(`[Mood Image] 👤 User ID: ${userId}`);
    console.log('========================================');

    if (!MOOD_PROMPTS[mood]) {
      return res.status(400).json({ 
        success: false, 
        error: 'Invalid mood type',
        validMoods: Object.keys(MOOD_PROMPTS)
      });
    }

    // Check if image already exists in database
    let moodImage = await MoodImage.findOne({ userId, mood });

    if (moodImage && moodImage.imageUrl) {
      console.log(`[Mood Image] ✅ Found cached image for ${mood}`);
      console.log(`[Mood Image] 📊 Usage count: ${moodImage.usageCount}`);
      await moodImage.incrementUsage();

      return res.json({
        success: true,
        imageUrl: moodImage.imageUrl,
        cached: true,
        usageCount: moodImage.usageCount,
        generatedAt: moodImage.generatedAt
      });
    }

    // No cached image - try to generate new one
    console.log(`[Mood Image] 🆕 No cached image found, attempting to generate...`);
    
    const PROJECT_ID = process.env.GOOGLE_CLOUD_PROJECT_ID;
    
    console.log(`[Mood Image] 🔑 Project ID exists: ${!!PROJECT_ID}`);
    console.log(`[Mood Image] 🔑 Project ID: ${PROJECT_ID}`);
    
    // If no project ID, use fallback immediately
    if (!PROJECT_ID) {
      console.log(`[Mood Image] ❌ No GOOGLE_CLOUD_PROJECT_ID found!`);
      console.log(`[Mood Image] 💡 Add GOOGLE_CLOUD_PROJECT_ID to your .env file`);
      console.log(`[Mood Image] 💡 Also set GOOGLE_APPLICATION_CREDENTIALS to your service account key path`);
      console.log(`[Mood Image] 🎨 Using fallback SVG image`);
      
      const fallbackUrl = generateFallbackImage(mood);
      
      moodImage = new MoodImage({
        userId,
        mood,
        imageUrl: fallbackUrl,
        imageData: 'fallback',
        prompt: MOOD_PROMPTS[mood],
        generatedAt: new Date(),
        usageCount: 1,
        lastUsed: new Date()
      });

      await moodImage.save();
      
      return res.json({
        success: true,
        imageUrl: fallbackUrl,
        cached: false,
        fallback: true,
        reason: 'No Google Cloud project configured',
        generatedAt: moodImage.generatedAt
      });
    }

    const prompt = MOOD_PROMPTS[mood];
    console.log(`[Mood Image] 📝 Prompt: ${prompt.substring(0, 80)}...`);
    console.log(`[Mood Image] 🚀 Calling Google Imagen API...`);

    try {
      // Get auth token
      const accessToken = await getAuthToken();
      console.log(`[Mood Image] 🔐 Authentication successful`);

      // Choose model version (fast, standard, or ultra)
      const MODEL = process.env.IMAGEN_MODEL || 'imagen-4.0-fast-generate-001';
      const API_URL = `https://us-central1-aiplatform.googleapis.com/v1/projects/${PROJECT_ID}/locations/us-central1/publishers/google/models/${MODEL}:predict`;

      const requestBody = {
        instances: [
          {
            prompt: prompt
          }
        ],
        parameters: {
          sampleCount: 1
        }
      };

      const imagenResponse = await axios.post(
        API_URL,
        requestBody,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json; charset=utf-8'
          },
          timeout: 90000 // 90 seconds for image generation
        }
      );

      console.log(`[Mood Image] ✅ Google Imagen API SUCCESS!`);
      console.log(`[Mood Image] 📊 Status: ${imagenResponse.status}`);

      // Extract base64 image from response
      const predictions = imagenResponse.data.predictions;
      if (!predictions || predictions.length === 0) {
        throw new Error('No predictions returned from Imagen API');
      }

      // Imagen returns base64 encoded image in bytesBase64Encoded field
      const imageBase64 = predictions[0].bytesBase64Encoded;
      const imageUrl = `data:image/png;base64,${imageBase64}`;

      console.log(`[Mood Image] 🎨 Successfully generated AI image for ${mood}`);
      console.log(`[Mood Image] 💾 Saving to database...`);

      // Use upsert to avoid race condition duplicates
      moodImage = await MoodImage.findOneAndUpdate(
        { userId, mood },
        {
          imageUrl,
          imageData: imageBase64,
          prompt,
          generatedAt: new Date(),
          usageCount: 1,
          lastUsed: new Date()
        },
        { 
          upsert: true, 
          new: true,
          setDefaultsOnInsert: true
        }
      );
      console.log(`[Mood Image] ✅ Saved AI-generated image to database`);

      return res.json({
        success: true,
        imageUrl,
        cached: false,
        aiGenerated: true,
        model: MODEL,
        generatedAt: moodImage.generatedAt
      });

    } catch (imagenError) {
      console.log('\n========================================');
      console.error('[Mood Image] ❌ GOOGLE IMAGEN API ERROR');
      console.log('========================================');
      console.error('[Mood Image] Error message:', imagenError.message);
      console.error('[Mood Image] Status code:', imagenError.response?.status);
      console.error('[Mood Image] Status text:', imagenError.response?.statusText);
      
      if (imagenError.response?.data) {
        console.error('[Mood Image] Error details:', JSON.stringify(imagenError.response.data, null, 2));
      }

      // Provide specific error messages
      let errorReason = 'Unknown error';
      if (imagenError.response?.status === 401) {
        errorReason = 'Authentication failed';
        console.error('[Mood Image] 🔑 Authentication failed - check your service account credentials');
      } else if (imagenError.response?.status === 403) {
        errorReason = 'Permission denied';
        console.error('[Mood Image] 🚫 Permission denied - ensure Vertex AI API is enabled');
        console.error('[Mood Image] 💡 Enable at: https://console.cloud.google.com/apis/library/aiplatform.googleapis.com');
      } else if (imagenError.response?.status === 404) {
        errorReason = 'Model not found';
        console.error('[Mood Image] 🤖 Model not found or not available in your region');
      } else if (imagenError.response?.status === 400) {
        errorReason = 'Bad request';
        console.error('[Mood Image] 📝 Request format error');
      } else if (imagenError.code === 'ECONNABORTED') {
        errorReason = 'Request timeout';
        console.error('[Mood Image] ⏱️ Request timed out');
      }
      
      console.log(`[Mood Image] 🎨 Falling back to SVG placeholder`);
      console.log('========================================\n');
      
      const fallbackUrl = generateFallbackImage(mood);
      
      moodImage = new MoodImage({
        userId,
        mood,
        imageUrl: fallbackUrl,
        imageData: 'fallback',
        prompt,
        generatedAt: new Date(),
        usageCount: 1,
        lastUsed: new Date()
      });

      await moodImage.save();
      
      return res.json({
        success: true,
        imageUrl: fallbackUrl,
        cached: false,
        fallback: true,
        reason: errorReason,
        generatedAt: moodImage.generatedAt,
        warning: 'Using placeholder image - AI generation unavailable',
        error: imagenError.message
      });
    }

  } catch (error) {
    console.error('[Mood Image] ❌ General error:', error.message);
    console.error('[Mood Image] Stack:', error.stack);
    
    const fallbackUrl = generateFallbackImage(req.params.mood);
    
    res.json({ 
      success: true,
      imageUrl: fallbackUrl,
      fallback: true,
      warning: 'Image generation service temporarily unavailable'
    });
  }
});

// POST /api/mood-tracker/image/generate - Force regenerate image
router.post('/image/generate', authenticateToken, async (req, res) => {
  try {
    const { mood } = req.body;
    const userId = req.user.id;

    console.log(`[Mood Image] 🔄 Force regenerate request for mood: ${mood}, userId: ${userId}`);

    if (!MOOD_PROMPTS[mood]) {
      return res.status(400).json({ 
        success: false, 
        error: 'Invalid mood type'
      });
    }

    const PROJECT_ID = process.env.GOOGLE_CLOUD_PROJECT_ID;
    if (!PROJECT_ID) {
      return res.status(500).json({ 
        success: false, 
        error: 'Image generation service not configured'
      });
    }

    const prompt = MOOD_PROMPTS[mood];
    
    // Get auth token
    const accessToken = await getAuthToken();
    
    const MODEL = process.env.IMAGEN_MODEL || 'imagen-4.0-fast-generate-001';
    const API_URL = `https://us-central1-aiplatform.googleapis.com/v1/projects/${PROJECT_ID}/locations/us-central1/publishers/google/models/${MODEL}:predict`;

    const requestBody = {
      instances: [
        {
          prompt: prompt
        }
      ],
      parameters: {
        sampleCount: 1
      }
    };

    const imagenResponse = await axios.post(
      API_URL,
      requestBody,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json; charset=utf-8'
        },
        timeout: 90000
      }
    );

    const imageBase64 = imagenResponse.data.predictions[0].bytesBase64Encoded;
    const imageUrl = `data:image/png;base64,${imageBase64}`;

    const moodImage = await MoodImage.findOneAndUpdate(
      { userId, mood },
      {
        imageUrl,
        imageData: imageBase64,
        prompt,
        generatedAt: new Date(),
        usageCount: 1,
        lastUsed: new Date()
      },
      { 
        upsert: true, 
        new: true,
        setDefaultsOnInsert: true
      }
    );

    console.log(`[Mood Image] ✅ Force regenerated and saved image for ${mood}`);

    res.json({
      success: true,
      imageUrl,
      regenerated: true,
      model: MODEL,
      generatedAt: moodImage.generatedAt
    });

  } catch (error) {
    console.error('[Mood Image] ❌ Regeneration error:', error.message);
    if (error.response?.data) {
      console.error('[Mood Image] Error details:', JSON.stringify(error.response.data, null, 2));
    }
    res.status(500).json({ 
      success: false, 
      error: 'Failed to regenerate mood image',
      details: error.message
    });
  }
});

// DELETE /api/mood-tracker/images/clear-all - Clear all cached images
router.delete('/images/clear-all', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;

    const result = await MoodImage.deleteMany({ userId });

    console.log(`[Mood Image] 🗑️ Cleared ${result.deletedCount} cached images for user ${userId}`);

    res.json({
      success: true,
      message: `Cleared ${result.deletedCount} cached mood images`,
      deletedCount: result.deletedCount
    });

  } catch (error) {
    console.error('[Mood Image] ❌ Clear all error:', error.message);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to clear cached images'
    });
  }
});

// GET /api/mood-tracker/images/all - Get all mood images
router.get('/images/all', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;

    const moodImages = await MoodImage.find({ userId })
      .select('-imageData')
      .sort({ mood: 1 });

    const imageMap = {};
    moodImages.forEach(img => {
      imageMap[img.mood] = {
        imageUrl: img.imageUrl,
        usageCount: img.usageCount,
        generatedAt: img.generatedAt,
        lastUsed: img.lastUsed
      };
    });

    res.json({
      success: true,
      images: imageMap,
      totalGenerated: moodImages.length
    });

  } catch (error) {
    console.error('[Mood Image] Error fetching all images:', error.message);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to retrieve mood images'
    });
  }
});

// DELETE /api/mood-tracker/image/:mood - Delete cached mood image
router.delete('/image/:mood', authenticateToken, async (req, res) => {
  try {
    const { mood } = req.params;
    const userId = req.user.id;

    const result = await MoodImage.findOneAndDelete({ userId, mood });

    if (!result) {
      return res.status(404).json({
        success: false,
        error: 'Mood image not found'
      });
    }

    console.log(`[Mood Image] 🗑️ Deleted cached image for ${mood}`);

    res.json({
      success: true,
      message: `Deleted mood image for ${mood}`,
      deletedMood: mood
    });

  } catch (error) {
    console.error('[Mood Image] Delete error:', error.message);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to delete mood image'
    });
  }
});

// GET /api/mood-tracker/stats - Get statistics
router.get('/stats', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;

    const moodImages = await MoodImage.find({ userId });

    if (moodImages.length === 0) {
      return res.json({
        success: true,
        stats: {
          totalImages: 0,
          totalUsage: 0,
          averageUsage: 0,
          moodCoverage: [],
          coveragePercentage: 0
        }
      });
    }

    const totalImages = moodImages.length;
    const totalUsage = moodImages.reduce((sum, img) => sum + img.usageCount, 0);
    const averageUsage = totalUsage / totalImages;
    const moodCoverage = moodImages.map(img => img.mood);
    const totalMoods = Object.keys(MOOD_PROMPTS).length;
    const coveragePercentage = (moodCoverage.length / totalMoods) * 100;

    res.json({
      success: true,
      stats: {
        totalImages,
        totalUsage,
        averageUsage: Math.round(averageUsage * 10) / 10,
        moodCoverage,
        coveragePercentage: Math.round(coveragePercentage)
      }
    });

  } catch (error) {
    console.error('[Mood Image] Stats error:', error.message);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to retrieve statistics'
    });
  }
});

module.exports = router;