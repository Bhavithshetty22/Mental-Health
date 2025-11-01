const express = require('express');
const router = express.Router();
const axios = require('axios');

// Load environment variables
require('dotenv').config();

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.0-flash';

/**
 * POST /api/creative
 * Generate a short story and a poem based on user's journal text
 */
router.post('/', async (req, res) => {
  try {
    const { text } = req.body;

    if (!text || text.trim().length === 0) {
      return res.status(400).json({ error: 'Text is required' });
    }

    if (!GEMINI_API_KEY) {
      console.error('GEMINI_API_KEY is not set in environment variables');
      return res.status(500).json({ error: 'API key not configured' });
    }

    console.log('Generating creative content for text:', text.substring(0, 100) + '...');

    // Call Gemini API
    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`;

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

    console.log('Raw Gemini response:', generatedText);

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
      rawResponse: generatedText // For debugging
    });

  } catch (error) {
    console.error('Error in /api/creative:', error.message);
    
    if (error.response) {
      console.error('Gemini API Error Response:', JSON.stringify(error.response.data, null, 2));
      return res.status(error.response.status).json({
        error: 'Failed to generate creative content',
        details: error.response.data
      });
    }

    res.status(500).json({
      error: 'Failed to generate creative content',
      message: error.message
    });
  }
});

module.exports = router;