// routes/mood-tracker.js
const express = require('express');
const router = express.Router();
const axios = require('axios');
const MoodImage = require('../models/MoodImage');
const { authenticateToken } = require('./auth');

// Mood-specific prompts for Stability AI
const MOOD_PROMPTS = {
  terrible: "abstract calming art, soft blues and gentle purples, peaceful flowing water, serene healing atmosphere, minimalist gentle waves, soothing ethereal colors, comforting peaceful landscape, emotional support visual, high quality 4k",
  bad: "warm contemplative scene, soft orange amber sunset tones, gentle rolling hills, hopeful peaceful atmosphere, comforting soft gradients, emotional warmth, uplifting gentle light, healing visualization, high quality 4k",
  okay: "balanced neutral composition, calm earth tones, tranquil nature scenery, gentle mountains peaceful sky, harmonious balanced colors, centered grounded feeling, serene peaceful atmosphere, emotional equilibrium, high quality 4k",
  good: "bright uplifting scene, vibrant blues fresh greens, sunny cheerful day, happy blooming flowers, positive joyful energy, optimistic pleasant atmosphere, emotional wellness visual, celebration of life, high quality 4k",
  amazing: "energetic celebration, brilliant golds vibrant rainbow colors, radiant glowing sunrise, magnificent blooming garden, euphoric magical atmosphere, inspiring fantastic energy, peak happiness visual, pure joy expression, high quality 4k"
};

// Mood color mapping for fallback images
const MOOD_COLORS = {
  terrible: "#ef4444",
  bad: "#f97316",
  okay: "#f59e0b",
  good: "#3b82f6",
  amazing: "#10b981"
};

const MOOD_EMOJIS = {
  terrible: "😢",
  bad: "😕",
  okay: "😐",
  good: "😊",
  amazing: "😄"
};

// Generate an SVG-based fallback image as data URI
function generateFallbackImage(mood) {
  const color = MOOD_COLORS[mood] || "#999999";
  const emoji = MOOD_EMOJIS[mood] || "😐";
  
  // Create an SVG with gradient background and emoji
  const svg = `
    <svg width="512" height="512" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:${color};stop-opacity:0.8" />
          <stop offset="100%" style="stop-color:${color};stop-opacity:1" />
        </linearGradient>
      </defs>
      <rect width="512" height="512" fill="url(#grad)" rx="40"/>
      <text x="50%" y="50%" font-size="180" text-anchor="middle" dominant-baseline="middle">${emoji}</text>
      <text x="50%" y="85%" font-size="24" text-anchor="middle" fill="white" opacity="0.9" font-family="Arial, sans-serif">${mood.toUpperCase()}</text>
    </svg>
  `;
  
  // Convert SVG to base64 data URI
  const base64 = Buffer.from(svg).toString('base64');
  return `data:image/svg+xml;base64,${base64}`;
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
            { text: "ugly, blurry, low quality, distorted, text, watermark, signature", weight: -1 }
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
          { text: "ugly, blurry, low quality, distorted, text, watermark, signature", weight: -1 }
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