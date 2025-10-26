// routes/mood-tracker.js
const express = require('express');
const router = express.Router();
const axios = require('axios');
const FormData = require('form-data');
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
router.get('/debug/config', authenticateToken, (req, res) => {
  const STABILITY_API_KEY = process.env.VITE_STABILITY_API_KEY;
  
  res.json({
    apiKeyExists: !!STABILITY_API_KEY,
    apiKeyLength: STABILITY_API_KEY ? STABILITY_API_KEY.length : 0,
    apiKeyPrefix: STABILITY_API_KEY ? STABILITY_API_KEY.substring(0, 10) + '...' : 'NO KEY',
    envVars: {
      VITE_STABILITY_API_KEY: !!process.env.VITE_STABILITY_API_KEY,
      STABILITY_API_KEY: !!process.env.STABILITY_API_KEY
    }
  });
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
    
    const STABILITY_API_KEY = process.env.VITE_STABILITY_API_KEY;
    
    console.log(`[Mood Image] 🔑 API Key exists: ${!!STABILITY_API_KEY}`);
    console.log(`[Mood Image] 🔑 API Key length: ${STABILITY_API_KEY ? STABILITY_API_KEY.length : 0}`);
    console.log(`[Mood Image] 🔑 API Key prefix: ${STABILITY_API_KEY?.substring(0, 10)}...`);
    
    // If no API key, use fallback immediately
    if (!STABILITY_API_KEY) {
      console.log(`[Mood Image] ❌ No STABILITY_API_KEY found!`);
      console.log(`[Mood Image] 💡 Add VITE_STABILITY_API_KEY to your .env file`);
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
        reason: 'No API key configured',
        generatedAt: moodImage.generatedAt
      });
    }

    const prompt = MOOD_PROMPTS[mood];
    console.log(`[Mood Image] 📝 Prompt: ${prompt.substring(0, 80)}...`);
    console.log(`[Mood Image] 🚀 Calling Stability AI API with multipart/form-data...`);

    try {
      // Create FormData for multipart/form-data request
      const formData = new FormData();
      formData.append('prompt', prompt);
      formData.append('negative_prompt', "cartoon, anime, drawing, illustration, painting, sketch, ugly, blurry, low quality, distorted, deformed, text, watermark, signature, multiple faces");
      formData.append('output_format', 'png');
      formData.append('aspect_ratio', '1:1');

      const stabilityResponse = await axios.post(
        'https://api.stability.ai/v2beta/stable-image/generate/core',
        formData,
        {
          headers: {
            'Authorization': `Bearer ${STABILITY_API_KEY}`,
            'Accept': 'image/*',
            ...formData.getHeaders()
          },
          responseType: 'arraybuffer',
          timeout: 60000
        }
      );

      console.log(`[Mood Image] ✅ Stability API SUCCESS!`);
      console.log(`[Mood Image] 📊 Status: ${stabilityResponse.status}`);
      console.log(`[Mood Image] 📦 Response size: ${stabilityResponse.data.length} bytes`);

      const imageBase64 = Buffer.from(stabilityResponse.data, 'binary').toString('base64');
      const imageUrl = `data:image/png;base64,${imageBase64}`;

      console.log(`[Mood Image] 🎨 Successfully generated AI image for ${mood}`);
      console.log(`[Mood Image] 💾 Saving to database...`);

      moodImage = new MoodImage({
        userId,
        mood,
        imageUrl,
        imageData: imageBase64,
        prompt,
        generatedAt: new Date(),
        usageCount: 1,
        lastUsed: new Date()
      });

      await moodImage.save();
      console.log(`[Mood Image] ✅ Saved AI-generated image to database`);

      return res.json({
        success: true,
        imageUrl,
        cached: false,
        aiGenerated: true,
        generatedAt: moodImage.generatedAt
      });

    } catch (stabilityError) {
      console.log('\n========================================');
      console.error('[Mood Image] ❌ STABILITY API ERROR');
      console.log('========================================');
      console.error('[Mood Image] Error message:', stabilityError.message);
      console.error('[Mood Image] Status code:', stabilityError.response?.status);
      console.error('[Mood Image] Status text:', stabilityError.response?.statusText);
      
      if (stabilityError.response?.data) {
        try {
          const errorText = Buffer.from(stabilityError.response.data).toString();
          console.error('[Mood Image] Error details:', errorText);
        } catch (e) {
          console.error('[Mood Image] Could not parse error details');
        }
      }

      // Provide specific error messages
      let errorReason = 'Unknown error';
      if (stabilityError.response?.status === 401) {
        errorReason = 'Invalid API key';
        console.error('[Mood Image] 🔑 Your API key is invalid or expired');
        console.error('[Mood Image] 💡 Get a new key at: https://platform.stability.ai/account/keys');
      } else if (stabilityError.response?.status === 402) {
        errorReason = 'Insufficient credits';
        console.error('[Mood Image] 💳 Your account has insufficient credits');
        console.error('[Mood Image] 💡 Add credits at: https://platform.stability.ai/account/billing');
      } else if (stabilityError.response?.status === 404) {
        errorReason = 'Model not found';
        console.error('[Mood Image] 🤖 The core model is not available');
      } else if (stabilityError.response?.status === 400) {
        errorReason = 'Bad request';
        console.error('[Mood Image] 📝 Request format error');
      } else if (stabilityError.code === 'ECONNABORTED') {
        errorReason = 'Request timeout';
        console.error('[Mood Image] ⏱️ Request timed out after 60 seconds');
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
        error: stabilityError.message
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

    const STABILITY_API_KEY = process.env.VITE_STABILITY_API_KEY;
    if (!STABILITY_API_KEY) {
      return res.status(500).json({ 
        success: false, 
        error: 'Image generation service not configured'
      });
    }

    const prompt = MOOD_PROMPTS[mood];
    
    // Create FormData for multipart/form-data request
    const formData = new FormData();
    formData.append('prompt', prompt);
    formData.append('negative_prompt', "cartoon, anime, drawing, illustration, painting, sketch, ugly, blurry, low quality, distorted, deformed, text, watermark, signature, multiple faces");
    formData.append('output_format', 'png');
    formData.append('aspect_ratio', '1:1');
    
    const stabilityResponse = await axios.post(
      'https://api.stability.ai/v2beta/stable-image/generate/core',
      formData,
      {
        headers: {
          'Authorization': `Bearer ${STABILITY_API_KEY}`,
          'Accept': 'image/*',
          ...formData.getHeaders()
        },
        responseType: 'arraybuffer',
        timeout: 60000
      }
    );

    const imageBase64 = Buffer.from(stabilityResponse.data, 'binary').toString('base64');
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
      generatedAt: moodImage.generatedAt
    });

  } catch (error) {
    console.error('[Mood Image] ❌ Regeneration error:', error.message);
    if (error.response?.data) {
      try {
        const errorText = Buffer.from(error.response.data).toString();
        console.error('[Mood Image] Error details:', errorText);
      } catch (e) {
        console.error('[Mood Image] Could not parse error');
      }
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