// routes/mood-tracker.js
const express = require('express');
const router = express.Router();
const axios = require('axios');
const MoodImage = require('../models/MoodImage');
const { authenticateToken } = require('./auth');

// Mood-specific prompts for Stability AI - Updated for human emotions
const MOOD_PROMPTS = {
  terrible: "portrait of person crying with sadness, tears streaming down face, emotional distress, somber lighting, empathetic expression, realistic human face, photorealistic emotional portrait, gentle soft focus, 4k high quality",
  bad: "portrait of person looking worried and anxious, furrowed brow, concerned expression, subdued lighting, realistic human emotion, thoughtful sad face, photorealistic portrait, natural lighting, 4k high quality",
  okay: "portrait of person with neutral calm expression, peaceful face, relaxed features, balanced natural lighting, serene composure, realistic human portrait, photorealistic facial features, soft natural light, 4k high quality",
  good: "portrait of person smiling warmly, genuine happy expression, bright cheerful face, joyful eyes, positive energy, realistic human happiness, photorealistic smiling portrait, natural daylight, 4k high quality",
  amazing: "portrait of person laughing with pure joy, ecstatic happy expression, radiant smile, eyes full of delight, euphoric face, realistic human elation, photorealistic joyful portrait, bright vibrant lighting, 4k high quality"
};

// Mood color mapping for fallback images
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

// Generate an SVG-based fallback image with human silhouette
function generateFallbackImage(mood) {
  const color = MOOD_COLORS[mood] || "#999999";
  const description = MOOD_DESCRIPTIONS[mood] || "Neutral";
  
  // Create an SVG with gradient background and human face silhouette
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
      
      <!-- Simple human face silhouette -->
      <g transform="translate(256, 200)">
        <!-- Head circle -->
        <circle cx="0" cy="0" r="80" fill="url(#face-gradient)" stroke="white" stroke-width="3" opacity="0.8"/>
        
        <!-- Eyes based on mood -->
        ${getMoodEyes(mood)}
        
        <!-- Mouth based on mood -->
        ${getMoodMouth(mood)}
      </g>
      
      <!-- Shoulders/body hint -->
      <ellipse cx="256" cy="380" rx="120" ry="60" fill="url(#face-gradient)" opacity="0.6"/>
      
      <text x="50%" y="90%" font-size="22" text-anchor="middle" fill="white" opacity="0.95" font-family="Arial, sans-serif" font-weight="600">${description}</text>
    </svg>
  `;
  
  // Convert SVG to base64 data URI
  const base64 = Buffer.from(svg).toString('base64');
  return `data:image/svg+xml;base64,${base64}`;
}

// Helper function to draw eyes based on mood
function getMoodEyes(mood) {
  switch(mood) {
    case 'terrible':
      // Sad/crying eyes - downturned with tears
      return `
        <circle cx="-25" cy="-10" r="8" fill="white" opacity="0.9"/>
        <circle cx="25" cy="-10" r="8" fill="white" opacity="0.9"/>
        <line x1="-25" y1="5" x2="-25" y2="25" stroke="white" stroke-width="2" opacity="0.7"/>
        <line x1="25" y1="5" x2="25" y2="25" stroke="white" stroke-width="2" opacity="0.7"/>
      `;
    case 'bad':
      // Worried eyes - slightly downturned
      return `
        <ellipse cx="-25" cy="-10" rx="7" ry="9" fill="white" opacity="0.9"/>
        <ellipse cx="25" cy="-10" rx="7" ry="9" fill="white" opacity="0.9"/>
      `;
    case 'okay':
      // Neutral eyes
      return `
        <circle cx="-25" cy="-10" r="7" fill="white" opacity="0.9"/>
        <circle cx="25" cy="-10" r="7" fill="white" opacity="0.9"/>
      `;
    case 'good':
      // Happy eyes - slightly curved
      return `
        <circle cx="-25" cy="-10" r="8" fill="white" opacity="0.9"/>
        <circle cx="25" cy="-10" r="8" fill="white" opacity="0.9"/>
        <path d="M -35 -15 Q -25 -20 -15 -15" stroke="white" stroke-width="2" fill="none" opacity="0.8"/>
        <path d="M 15 -15 Q 25 -20 35 -15" stroke="white" stroke-width="2" fill="none" opacity="0.8"/>
      `;
    case 'amazing':
      // Ecstatic eyes - curved happy eyes
      return `
        <path d="M -35 -10 Q -25 -18 -15 -10" stroke="white" stroke-width="3" fill="none" opacity="0.9"/>
        <path d="M 15 -10 Q 25 -18 35 -10" stroke="white" stroke-width="3" fill="none" opacity="0.9"/>
      `;
    default:
      return `<circle cx="-25" cy="-10" r="7" fill="white" opacity="0.9"/>
              <circle cx="25" cy="-10" r="7" fill="white" opacity="0.9"/>`;
  }
}

// Helper function to draw mouth based on mood
function getMoodMouth(mood) {
  switch(mood) {
    case 'terrible':
      // Deep frown
      return `<path d="M -30 35 Q 0 25 30 35" stroke="white" stroke-width="3" fill="none" opacity="0.9"/>`;
    case 'bad':
      // Slight frown
      return `<path d="M -25 30 Q 0 28 25 30" stroke="white" stroke-width="2.5" fill="none" opacity="0.9"/>`;
    case 'okay':
      // Straight line
      return `<line x1="-25" y1="30" x2="25" y2="30" stroke="white" stroke-width="2.5" opacity="0.9"/>`;
    case 'good':
      // Smile
      return `<path d="M -30 25 Q 0 35 30 25" stroke="white" stroke-width="3" fill="none" opacity="0.9"/>`;
    case 'amazing':
      // Big smile with open mouth
      return `
        <path d="M -35 25 Q 0 45 35 25" stroke="white" stroke-width="3" fill="none" opacity="0.9"/>
        <path d="M -25 28 Q 0 38 25 28" fill="white" opacity="0.3"/>
      `;
    default:
      return `<line x1="-25" y1="30" x2="25" y2="30" stroke="white" stroke-width="2.5" opacity="0.9"/>`;
  }
}

// GET /api/mood-tracker/image/:mood - Check if mood image exists or generate new one
router.get('/image/:mood', authenticateToken, async (req, res) => {
  try {
    const { mood } = req.params;
    const userId = req.user.id;

    console.log(`[Mood Image] Request for mood: ${mood}, userId: ${userId}`);

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
      console.log(`[Mood Image] Found cached image for ${mood}`);
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
    console.log(`[Mood Image] No cached image found, attempting to generate for ${mood}`);
    
    const STABILITY_API_KEY = process.env.STABILITY_API_KEY;
    
    // If no API key, use fallback immediately
    if (!STABILITY_API_KEY) {
      console.log(`[Mood Image] No STABILITY_API_KEY found, using fallback image`);
      const fallbackUrl = generateFallbackImage(mood);
      
      // Save fallback image to database
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
        generatedAt: moodImage.generatedAt
      });
    }

    const prompt = MOOD_PROMPTS[mood];
    console.log(`[Mood Image] Calling Stability AI with prompt: ${prompt.substring(0, 50)}...`);

    try {
      const stabilityResponse = await axios.post(
        'https://api.stability.ai/v1/generation/stable-diffusion-xl-1024-v1-0/text-to-image',
        {
          text_prompts: [
            { text: prompt, weight: 1 },
            { text: "cartoon, anime, drawing, illustration, painting, sketch, ugly, blurry, low quality, distorted, deformed, text, watermark, signature, multiple faces", weight: -1 }
          ],
          cfg_scale: 7,
          height: 512,
          width: 512,
          steps: 30,
          samples: 1,
          style_preset: "photographic"
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${STABILITY_API_KEY}`,
            'Accept': 'application/json'
          },
          timeout: 30000
        }
      );

      if (!stabilityResponse.data?.artifacts?.[0]) {
        throw new Error('Invalid response from Stability AI');
      }

      const imageBase64 = stabilityResponse.data.artifacts[0].base64;
      const imageUrl = `data:image/png;base64,${imageBase64}`;

      console.log(`[Mood Image] Successfully generated image for ${mood}`);

      // Save to database
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
      console.log(`[Mood Image] Saved new mood image to database`);

      return res.json({
        success: true,
        imageUrl,
        cached: false,
        generatedAt: moodImage.generatedAt
      });

    } catch (stabilityError) {
      console.error('[Mood Image] Stability API error:', stabilityError.message);
      
      // Fall back to SVG placeholder if Stability fails
      console.log(`[Mood Image] Falling back to SVG placeholder for ${mood}`);
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
        generatedAt: moodImage.generatedAt,
        warning: 'Using placeholder image - AI generation unavailable'
      });
    }

  } catch (error) {
    console.error('[Mood Image] Error:', error.message);
    
    // Last resort fallback
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

    console.log(`[Mood Image] Force regenerate request for mood: ${mood}, userId: ${userId}`);

    if (!MOOD_PROMPTS[mood]) {
      return res.status(400).json({ 
        success: false, 
        error: 'Invalid mood type'
      });
    }

    const STABILITY_API_KEY = process.env.STABILITY_API_KEY;
    if (!STABILITY_API_KEY) {
      return res.status(500).json({ 
        success: false, 
        error: 'Image generation service not configured'
      });
    }

    const prompt = MOOD_PROMPTS[mood];
    
    const stabilityResponse = await axios.post(
      'https://api.stability.ai/v1/generation/stable-diffusion-xl-1024-v1-0/text-to-image',
      {
        text_prompts: [
          { text: prompt, weight: 1 },
          { text: "cartoon, anime, drawing, illustration, painting, sketch, ugly, blurry, low quality, distorted, deformed, text, watermark, signature, multiple faces", weight: -1 }
        ],
        cfg_scale: 7,
        height: 512,
        width: 512,
        steps: 30,
        samples: 1,
        style_preset: "photographic"
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${STABILITY_API_KEY}`,
          'Accept': 'application/json'
        },
        timeout: 30000
      }
    );

    const imageBase64 = stabilityResponse.data.artifacts[0].base64;
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

    console.log(`[Mood Image] Force regenerated and saved image for ${mood}`);

    res.json({
      success: true,
      imageUrl,
      regenerated: true,
      generatedAt: moodImage.generatedAt
    });

  } catch (error) {
    console.error('[Mood Image] Regeneration error:', error.message);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to regenerate mood image',
      details: error.message
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

    console.log(`[Mood Image] Deleted cached image for ${mood}`);

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