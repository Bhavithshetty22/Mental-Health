// routes/mood-tracker.js - FIXED VERSION
const express = require('express');
const router = express.Router();
const axios = require('axios');
const { GoogleAuth } = require('google-auth-library');
const MoodImage = require('../models/MoodImage');
const User = require('../models/User');
const { authenticateToken } = require('./auth');

// ADDED: Background removal with dynamic import (ESM module)
let removeBackgroundLib = null;
let backgroundRemovalLoaded = false;

// Load background removal library asynchronously
(async () => {
  try {
    removeBackgroundLib = await import('@imgly/background-removal-node');
    backgroundRemovalLoaded = true;
    console.log('[Mood Image] ✅ Background removal library loaded');
  } catch (error) {
    console.log('[Mood Image] ⚠️ Background removal library not found. Install with: npm install @imgly/background-removal-node');
    backgroundRemovalLoaded = false;
  }
})();

// UPDATED: Stronger identity preservation in base prompt with clean background
const BASE_CHARACTER = "Transform this person into a Disney Pixar style 3D character while preserving their EXACT facial features, face shape, eye color, eye shape, nose, mouth, and all distinctive characteristics. The character MUST look like the same person. Keep their unique identity clearly recognizable. High quality CGI render with Pixar animation style, expressive, detailed 3D rendering, cinematic lighting, vibrant color palette, upper body shot, clean white background, isolated character, no background elements, simple studio lighting";

// UPDATED: Better prompts that work with image-to-image transformation
const MOOD_PROMPTS = {
  terrible: `Transform into Disney Pixar 3D character style, crying with deep sadness, teary eyes, trembling lips, heartbreak expression, cool blue lighting, emotional atmosphere, clean white background, character only, no scenery`,
  
  bad: `Transform into Disney Pixar 3D character style, worried anxious expression, furrowed eyebrows, subtle frown, downcast eyes, soft lighting, muted colors, clean white background, character only, no scenery`,
  
  okay: `Transform into Disney Pixar 3D character style, neutral calm expression, relaxed posture, subtle smile, balanced lighting, clean white background, character only, no scenery`,
  
  good: `Transform into Disney Pixar 3D character style, gentle confident smile, bright happy eyes, warm lighting, joyful expression, clean white background, character only, no scenery`,
  
  amazing: `Transform into Disney Pixar 3D character style, laughing with joy, big smile, sparkling eyes, dynamic lighting, vibrant colors, warm glow, playful energy, clean white background, character only, no scenery`
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

// Helper function to clean base64 image
function cleanBase64Image(base64String) {
  if (base64String.startsWith('data:')) {
    return base64String.split(',')[1];
  }
  return base64String;
}

// FIXED: Background removal function with better format handling
async function removeBackgroundFromImage(base64Image) {
  if (!backgroundRemovalLoaded || !removeBackgroundLib) {
    console.log('[Mood Image] ⚠️ Background removal not available, skipping...');
    return base64Image;
  }

  try {
    console.log('[Mood Image] 🎨 Removing background...');
    
    // Handle both data URL and raw base64
    let cleanedBase64 = base64Image;
    if (base64Image.startsWith('data:')) {
      cleanedBase64 = base64Image.split(',')[1];
    }
    
    // Convert base64 to buffer
    const imageBuffer = Buffer.from(cleanedBase64, 'base64');
    
    console.log(`[Mood Image] 📊 Image buffer size: ${imageBuffer.length} bytes`);
    
    // Remove background using the default export with config
    const blob = await removeBackgroundLib.default(imageBuffer, {
      model: 'medium', // or 'small' for faster processing
      output: {
        format: 'image/png',
        quality: 1.0
      }
    });
    
    // Convert blob to buffer
    const arrayBuffer = await blob.arrayBuffer();
    const resultBuffer = Buffer.from(arrayBuffer);
    
    // Convert back to base64
    const resultBase64 = resultBuffer.toString('base64');
    
    console.log('[Mood Image] ✅ Background removed successfully');
    console.log(`[Mood Image] 📊 Result size: ${resultBuffer.length} bytes`);
    return `data:image/png;base64,${resultBase64}`;
    
  } catch (error) {
    console.error('[Mood Image] ❌ Background removal failed:', error.message);
    console.error('[Mood Image] Stack:', error.stack);
    console.log('[Mood Image] 📝 Returning original image');
    return base64Image;
  }
}

// UPDATED: Subject-consistent generation (BEST for identity preservation)
async function generateMoodImageWithSubjectConsistency(accessToken, projectId, userImageBase64, mood, prompt) {
  const MODEL = 'imagen-3.0-capability-001'; // Imagen 3
  const API_URL = `https://us-central1-aiplatform.googleapis.com/v1/projects/${projectId}/locations/us-central1/publishers/google/models/${MODEL}:predict`;

  const cleanedImage = cleanBase64Image(userImageBase64);

  // FIXED: Correct structure for subject-consistent generation
  const requestBody = {
    instances: [
  {
    prompt: prompt,
    referenceImages: [
      {
        referenceType: "REFERENCE_TYPE_SUBJECT",
        referenceId: 1,
        image: {
          bytesBase64Encoded: cleanedImage
        }
      }
    ]
  }
],
    parameters: {
      sampleCount: 1,
      aspectRatio: "1:1",
      personGeneration: "allow_adult",
      safetySetting: "block_some",
      addWatermark: false
    }
  };

  console.log('[Mood Image] 🎨 Using subject-consistent generation (identity preservation mode)');

  const response = await axios.post(
    API_URL,
    requestBody,
    {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json; charset=utf-8'
      },
      timeout: 120000
    }
  );

  return response;
}

// UPDATED: Edit mode with better identity preservation parameters
async function generateMoodImageWithReference(accessToken, projectId, userImageBase64, mood, prompt) {
  const MODEL = 'imagen-3.0-capability-001';
  const API_URL = `https://us-central1-aiplatform.googleapis.com/v1/projects/${projectId}/locations/us-central1/publishers/google/models/${MODEL}:predict`;

  const cleanedImage = cleanBase64Image(userImageBase64);

  // FIXED: Simplified structure for edit mode
  const requestBody = {
    instances: [
      {
        prompt: prompt,
        image: {
          bytesBase64Encoded: cleanedImage
        }
      }
    ],
    parameters: {
      sampleCount: 1,
      aspectRatio: "1:1",
      personGeneration: "allow_adult",
      safetySetting: "block_some",
      addWatermark: false
    }
  };

  console.log('[Mood Image] 🎨 Using edit mode with identity preservation');

  const response = await axios.post(
    API_URL,
    requestBody,
    {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json; charset=utf-8'
      },
      timeout: 120000
    }
  );

  return response;
}

// Standard Imagen generation (fallback)
async function generateMoodImageStandard(accessToken, projectId, prompt) {
  const MODEL = process.env.IMAGEN_MODEL || 'imagen-4.0-fast-generate-001';
  const API_URL = `https://us-central1-aiplatform.googleapis.com/v1/projects/${projectId}/locations/us-central1/publishers/google/models/${MODEL}:predict`;

  const requestBody = {
    instances: [
      {
        prompt: prompt
      }
    ],
    parameters: {
      sampleCount: 1,
      aspectRatio: "1:1",
      personGeneration: "allow_adult",
      safetySetting: "block_some"
    }
  };

  console.log('[Mood Image] 🎨 Using standard Imagen generation');

  const response = await axios.post(
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

  return response;
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
    
    // Fetch user's profile image
    const user = await User.findById(userId).select('profileImage name');
    console.log(`[Mood Image] 👤 User found: ${user?.name}`);
    console.log(`[Mood Image] 🖼️ Profile image exists: ${!!user?.profileImage}`);
    
    const PROJECT_ID = process.env.GOOGLE_CLOUD_PROJECT_ID;
    
    console.log(`[Mood Image] 🔑 Project ID exists: ${!!PROJECT_ID}`);
    
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
    console.log(`[Mood Image] 📝 Prompt: ${prompt.substring(0, 100)}...`);
    console.log(`[Mood Image] 🚀 Calling Google Imagen API...`);

    try {
      // Get auth token
      const accessToken = await getAuthToken();
      console.log(`[Mood Image] 🔐 Authentication successful`);

      let imagenResponse;
      let usedProfileImage = false;
      let generationMethod = 'standard';

      // UPDATED: Try subject-consistent generation first (BEST method)
      if (user?.profileImage) {
        try {
          console.log(`[Mood Image] 🎯 Method 1: Trying subject-consistent generation (RECOMMENDED)...`);
          imagenResponse = await generateMoodImageWithSubjectConsistency(
            accessToken, 
            PROJECT_ID, 
            user.profileImage, 
            mood, 
            prompt
          );
          usedProfileImage = true;
          generationMethod = 'subject-consistent';
          console.log(`[Mood Image] ✅ Subject-consistent generation SUCCESS!`);
          
        } catch (subjectError) {
          console.log(`[Mood Image] ⚠️ Subject-consistent failed: ${subjectError.message}`);
          console.log(`[Mood Image] 🔄 Method 2: Trying mask-free edit mode...`);
          
          try {
            imagenResponse = await generateMoodImageWithReference(
              accessToken, 
              PROJECT_ID, 
              user.profileImage, 
              mood, 
              prompt
            );
            usedProfileImage = true;
            generationMethod = 'mask-free-edit';
            console.log(`[Mood Image] ✅ Mask-free edit SUCCESS!`);
            
          } catch (editError) {
            console.log(`[Mood Image] ⚠️ Edit mode failed: ${editError.message}`);
            console.log(`[Mood Image] 🔄 Method 3: Using standard generation (fallback)...`);
            imagenResponse = await generateMoodImageStandard(accessToken, PROJECT_ID, prompt);
            generationMethod = 'standard';
          }
        }
      } else {
        console.log(`[Mood Image] ℹ️ No profile image found, using standard generation`);
        imagenResponse = await generateMoodImageStandard(accessToken, PROJECT_ID, prompt);
      }

      console.log(`[Mood Image] ✅ Google Imagen API SUCCESS!`);
      console.log(`[Mood Image] 📊 Status: ${imagenResponse.status}`);
      console.log(`[Mood Image] 🎨 Generation method: ${generationMethod}`);

      // Extract base64 image from response
      const predictions = imagenResponse.data.predictions;
      if (!predictions || predictions.length === 0) {
        throw new Error('No predictions returned from Imagen API');
      }

      const imageBase64 = predictions[0].bytesBase64Encoded;
      let imageUrl = `data:image/png;base64,${imageBase64}`;

      console.log(`[Mood Image] 🎨 Successfully generated AI image for ${mood}`);
      
      // ADDED: Remove background (controlled by environment variable)
      if (process.env.REMOVE_BACKGROUND === 'true') {
        console.log(`[Mood Image] 🧹 Attempting to remove background...`);
        imageUrl = await removeBackgroundFromImage(imageUrl);
      } else {
        console.log(`[Mood Image] ℹ️ Background removal disabled (set REMOVE_BACKGROUND=true to enable)`);
      }
      
      console.log(`[Mood Image] 💾 Saving to database...`);

      // Check if image already exists and update or create
      const existingImage = await MoodImage.findOne({ userId, mood });
      
      // Extract just the base64 part for storage
      const imageDataToStore = cleanBase64Image(imageUrl);
      
      if (existingImage) {
        existingImage.imageUrl = imageUrl;
        existingImage.imageData = imageDataToStore;
        existingImage.prompt = prompt;
        existingImage.generatedAt = new Date();
        existingImage.usageCount = 1;
        existingImage.lastUsed = new Date();
        moodImage = await existingImage.save();
        console.log(`[Mood Image] ✅ Updated existing image in database`);
      } else {
        moodImage = new MoodImage({
          userId,
          mood,
          imageUrl,
          imageData: imageDataToStore,
          prompt,
          generatedAt: new Date(),
          usageCount: 1,
          lastUsed: new Date()
        });
        await moodImage.save();
        console.log(`[Mood Image] ✅ Saved new AI-generated image to database`);
      }

      return res.json({
        success: true,
        imageUrl,
        cached: false,
        aiGenerated: true,
        usedProfileImage,
        generationMethod,
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
      
      const existingFallback = await MoodImage.findOne({ userId, mood });
      
      if (existingFallback) {
        existingFallback.imageUrl = fallbackUrl;
        existingFallback.imageData = 'fallback';
        existingFallback.prompt = MOOD_PROMPTS[mood];
        existingFallback.generatedAt = new Date();
        existingFallback.lastUsed = new Date();
        moodImage = await existingFallback.save();
      } else {
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
      }
      
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

    const user = await User.findById(userId).select('profileImage name');
    console.log(`[Mood Image] 👤 Regenerating for user: ${user?.name}`);
    console.log(`[Mood Image] 🖼️ Profile image available: ${!!user?.profileImage}`);

    const prompt = MOOD_PROMPTS[mood];
    const accessToken = await getAuthToken();
    
    let imagenResponse;
    let usedProfileImage = false;
    let generationMethod = 'standard';

    // Try subject-consistent first
    if (user?.profileImage) {
      try {
        imagenResponse = await generateMoodImageWithSubjectConsistency(
          accessToken, 
          PROJECT_ID, 
          user.profileImage, 
          mood, 
          prompt
        );
        usedProfileImage = true;
        generationMethod = 'subject-consistent';
      } catch (subjectError) {
        try {
          imagenResponse = await generateMoodImageWithReference(
            accessToken, 
            PROJECT_ID, 
            user.profileImage, 
            mood, 
            prompt
          );
          usedProfileImage = true;
          generationMethod = 'mask-free-edit';
        } catch (editError) {
          imagenResponse = await generateMoodImageStandard(accessToken, PROJECT_ID, prompt);
        }
      }
    } else {
      imagenResponse = await generateMoodImageStandard(accessToken, PROJECT_ID, prompt);
    }

    const imageBase64 = imagenResponse.data.predictions[0].bytesBase64Encoded;
    let imageUrl = `data:image/png;base64,${imageBase64}`;

    // ADDED: Remove background (controlled by environment variable)
    if (process.env.REMOVE_BACKGROUND === 'true') {
      console.log(`[Mood Image] 🧹 Removing background from regenerated image...`);
      imageUrl = await removeBackgroundFromImage(imageUrl);
    } else {
      console.log(`[Mood Image] ℹ️ Background removal disabled (set REMOVE_BACKGROUND=true to enable)`);
    }

    const existingMoodImage = await MoodImage.findOne({ userId, mood });
    const imageDataToStore = cleanBase64Image(imageUrl);
    
    if (existingMoodImage) {
      existingMoodImage.imageUrl = imageUrl;
      existingMoodImage.imageData = imageDataToStore;
      existingMoodImage.prompt = prompt;
      existingMoodImage.generatedAt = new Date();
      existingMoodImage.usageCount = 1;
      existingMoodImage.lastUsed = new Date();
      moodImage = await existingMoodImage.save();
    } else {
      moodImage = new MoodImage({
        userId,
        mood,
        imageUrl,
        imageData: imageDataToStore,
        prompt,
        generatedAt: new Date(),
        usageCount: 1,
        lastUsed: new Date()
      });
      await moodImage.save();
    }

    console.log(`[Mood Image] ✅ Force regenerated and saved image for ${mood}`);

    res.json({
      success: true,
      imageUrl,
      regenerated: true,
      usedProfileImage,
      generationMethod,
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