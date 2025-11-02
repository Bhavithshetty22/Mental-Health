// routes/emotion-bots.js

const express = require('express');
const router = express.Router();
const EmotionBot = require('../models/EmotionBot');
const EmotionChat = require('../models/EmotionChat');
const { authenticateToken } = require('../middleware/auth');
const axios = require('axios');

// Load environment variables
require('dotenv').config();

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.0-flash';

// GET all public bots (with optional filters)
router.get('/', async (req, res) => {
  try {
    const { sort, limit = 50 } = req.query;
    
    let query = EmotionBot.find({ isPublic: true });
    
    // Apply sorting
    switch(sort) {
      case 'newest':
        query = query.sort({ createdAt: -1 });
        break;
      case 'rated':
        query = query.sort({ rating: -1, ratingCount: -1 });
        break;
      case 'popular':
        query = query.sort({ chatCount: -1 });
        break;
      default:
        query = query.sort({ createdAt: -1 });
    }
    
    const bots = await query.limit(parseInt(limit));
    
    res.json({
      success: true,
      bots: bots.map(bot => ({
        id: bot._id,
        name: bot.name,
        description: bot.description,
        greeting: bot.greeting,
        customPrompt: bot.customPrompt,
        color: bot.color,
        imageUrl: bot.imageUrl,
        creator: bot.creatorName,
        creatorId: bot.creator,
        isDefault: bot.isDefault,
        rating: bot.rating,
        chats: bot.chatCount,
        createdAt: bot.createdAt
      }))
    });
  } catch (error) {
    console.error('Error fetching bots:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch bots',
      details: error.message
    });
  }
});

// GET single bot by ID
router.get('/:id', async (req, res) => {
  try {
    const bot = await EmotionBot.findById(req.params.id);
    
    if (!bot) {
      return res.status(404).json({
        success: false,
        error: 'Bot not found'
      });
    }
    
    res.json({
      success: true,
      bot: {
        id: bot._id,
        name: bot.name,
        description: bot.description,
        greeting: bot.greeting,
        customPrompt: bot.customPrompt,
        color: bot.color,
        imageUrl: bot.imageUrl,
        creator: bot.creatorName,
        creatorId: bot.creator,
        isDefault: bot.isDefault,
        rating: bot.rating,
        chats: bot.chatCount,
        createdAt: bot.createdAt
      }
    });
  } catch (error) {
    console.error('Error fetching bot:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch bot',
      details: error.message
    });
  }
});

// POST create new bot (requires authentication)
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { name, description, greeting, customPrompt, color, imageUrl, isPublic } = req.body;
    
    // Validation
    if (!name || !description || !greeting) {
      return res.status(400).json({
        success: false,
        error: 'Name, description, and greeting are required'
      });
    }
    
    if (name.length > 100) {
      return res.status(400).json({
        success: false,
        error: 'Name must be 100 characters or less'
      });
    }
    
    if (description.length > 300) {
      return res.status(400).json({
        success: false,
        error: 'Description must be 300 characters or less'
      });
    }
    
    if (greeting.length > 500) {
      return res.status(400).json({
        success: false,
        error: 'Greeting must be 500 characters or less'
      });
    }
    
    // Handle both 'id' and 'userId' from JWT token
    const userId = req.user.id || req.user.userId || req.user._id;
    const username = req.user.username || req.user.name || req.user.email || 'Anonymous';
    
    if (!userId) {
      console.error('No user ID found in token:', req.user);
      return res.status(400).json({
        success: false,
        error: 'Invalid authentication token'
      });
    }
    
    console.log('Creating bot for user:', userId, 'username:', username);
    
    // Create bot
    const bot = await EmotionBot.create({
      name: name.trim(),
      description: description.trim(),
      greeting: greeting.trim(),
      customPrompt: customPrompt ? customPrompt.trim() : '',
      color: color || '#6B9080',
      imageUrl: imageUrl || null,
      creator: userId,
      creatorName: username,
      isPublic: isPublic !== false // Default to true
    });
    
    console.log('Bot created successfully:', bot._id);
    
    res.status(201).json({
      success: true,
      bot: {
        id: bot._id,
        name: bot.name,
        description: bot.description,
        greeting: bot.greeting,
        customPrompt: bot.customPrompt,
        color: bot.color,
        imageUrl: bot.imageUrl,
        creator: bot.creatorName,
        creatorId: bot.creator,
        isDefault: bot.isDefault,
        rating: bot.rating,
        chats: bot.chatCount,
        createdAt: bot.createdAt
      }
    });
  } catch (error) {
    console.error('Error creating bot:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create bot',
      details: error.message
    });
  }
});

// GET user's own bots (requires authentication)
router.get('/my/bots', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id || req.user.userId || req.user._id;
    
    const bots = await EmotionBot.find({ creator: userId })
      .sort({ createdAt: -1 });
    
    res.json({
      success: true,
      bots: bots.map(bot => ({
        id: bot._id,
        name: bot.name,
        description: bot.description,
        greeting: bot.greeting,
        customPrompt: bot.customPrompt,
        color: bot.color,
        imageUrl: bot.imageUrl,
        creator: bot.creatorName,
        creatorId: bot.creator,
        isDefault: bot.isDefault,
        isPublic: bot.isPublic,
        rating: bot.rating,
        chats: bot.chatCount,
        createdAt: bot.createdAt
      }))
    });
  } catch (error) {
    console.error('Error fetching user bots:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch your bots',
      details: error.message
    });
  }
});

// PUT update bot (requires authentication and ownership)
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id || req.user.userId || req.user._id;
    const bot = await EmotionBot.findById(req.params.id);
    
    if (!bot) {
      return res.status(404).json({
        success: false,
        error: 'Bot not found'
      });
    }
    
    // Check ownership
    if (bot.creator.toString() !== userId.toString()) {
      return res.status(403).json({
        success: false,
        error: 'You can only update your own bots'
      });
    }
    
    // Update fields
    const { name, description, greeting, customPrompt, color, imageUrl, isPublic } = req.body;
    
    if (name) bot.name = name.trim();
    if (description) bot.description = description.trim();
    if (greeting) bot.greeting = greeting.trim();
    if (customPrompt !== undefined) bot.customPrompt = customPrompt.trim();
    if (color) bot.color = color;
    if (imageUrl !== undefined) bot.imageUrl = imageUrl;
    if (isPublic !== undefined) bot.isPublic = isPublic;
    
    await bot.save();
    
    res.json({
      success: true,
      bot: {
        id: bot._id,
        name: bot.name,
        description: bot.description,
        greeting: bot.greeting,
        customPrompt: bot.customPrompt,
        color: bot.color,
        imageUrl: bot.imageUrl,
        creator: bot.creatorName,
        isDefault: bot.isDefault,
        isPublic: bot.isPublic,
        rating: bot.rating,
        chats: bot.chatCount,
        createdAt: bot.createdAt
      }
    });
  } catch (error) {
    console.error('Error updating bot:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update bot',
      details: error.message
    });
  }
});

// DELETE bot (requires authentication and ownership)
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id || req.user.userId || req.user._id;
    const bot = await EmotionBot.findById(req.params.id);
    
    if (!bot) {
      return res.status(404).json({
        success: false,
        error: 'Bot not found'
      });
    }
    
    // Check ownership
    if (bot.creator.toString() !== userId.toString()) {
      return res.status(403).json({
        success: false,
        error: 'You can only delete your own bots'
      });
    }
    
    // Delete associated chats
    await EmotionChat.deleteMany({ bot: bot._id });
    
    await bot.deleteOne();
    
    res.json({
      success: true,
      message: 'Bot deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting bot:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete bot',
      details: error.message
    });
  }
});

// POST send message to bot (requires authentication)
router.post('/:id/chat', authenticateToken, async (req, res) => {
  try {
    const { message } = req.body;
    const userId = req.user.id || req.user.userId || req.user._id;
    
    if (!message || !message.trim()) {
      return res.status(400).json({
        success: false,
        error: 'Message is required'
      });
    }
    
    if (message.length > 2000) {
      return res.status(400).json({
        success: false,
        error: 'Message too long (max 2000 characters)'
      });
    }
    
    // Find bot
    const bot = await EmotionBot.findById(req.params.id);
    
    if (!bot) {
      return res.status(404).json({
        success: false,
        error: 'Bot not found'
      });
    }
    
    // Find or create chat session
    let chat = await EmotionChat.findOne({
      user: userId,
      bot: bot._id,
      isActive: true
    });
    
    if (!chat) {
      chat = await EmotionChat.create({
        user: userId,
        bot: bot._id,
        messages: []
      });
      
      // Increment chat count for bot
      bot.chatCount += 1;
      await bot.save();
    }
    
    // Add user message
    chat.messages.push({
      text: message.trim(),
      sender: 'user',
      timestamp: new Date()
    });
    
    // Generate bot response using Gemini
    let botResponse = 'I hear you. Tell me more about that.'; // Default fallback
    
    if (GEMINI_API_KEY) {
      try {
        const systemPrompt = bot.customPrompt || 
          `You are ${bot.name}, an empathetic AI emotion bot. ${bot.description}. 
          Be warm, supportive, and genuinely caring. Keep responses conversational and under 150 words.`;
        
        const conversationHistory = chat.messages.slice(-6).map(msg => ({
          role: msg.sender === 'user' ? 'user' : 'model',
          parts: [{ text: msg.text }]
        }));
        
        const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`;
        
        const response = await axios.post(geminiUrl, {
          contents: [
            {
              role: 'user',
              parts: [{ text: systemPrompt }]
            },
            ...conversationHistory,
            {
              role: 'user',
              parts: [{ text: message.trim() }]
            }
          ],
          generationConfig: {
            maxOutputTokens: 300,
            temperature: 0.8,
            topP: 0.9
          }
        }, {
          timeout: 15000
        });
        
        botResponse = response.data?.candidates?.[0]?.content?.parts?.[0]?.text || botResponse;
      } catch (aiError) {
        console.error('AI generation error:', aiError.message);
        // Fall back to default responses
        const fallbackResponses = [
          "I'm here to listen. Tell me more about that.",
          "That's really important. How are you feeling about it?",
          "Thank you for sharing. What else is on your mind?",
          "I hear you. Let's explore this together.",
          "That sounds significant. What does that mean for you?"
        ];
        botResponse = fallbackResponses[Math.floor(Math.random() * fallbackResponses.length)];
      }
    }
    
    // Add bot response
    chat.messages.push({
      text: botResponse,
      sender: 'bot',
      timestamp: new Date()
    });
    
    chat.lastMessageAt = new Date();
    await chat.save();
    
    res.json({
      success: true,
      message: {
        text: botResponse,
        sender: 'bot',
        timestamp: new Date()
      }
    });
  } catch (error) {
    console.error('Error in chat:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to send message',
      details: error.message
    });
  }
});

// GET chat history with a bot (requires authentication)
router.get('/:id/chat', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id || req.user.userId || req.user._id;
    
    const chat = await EmotionChat.findOne({
      user: userId,
      bot: req.params.id,
      isActive: true
    }).populate('bot', 'name greeting color imageUrl');
    
    if (!chat) {
      return res.json({
        success: true,
        messages: [],
        bot: null
      });
    }
    
    res.json({
      success: true,
      messages: chat.messages,
      bot: chat.bot
    });
  } catch (error) {
    console.error('Error fetching chat:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch chat history',
      details: error.message
    });
  }
});

// POST rate a bot (requires authentication)
router.post('/:id/rate', authenticateToken, async (req, res) => {
  try {
    const { rating } = req.body;
    
    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({
        success: false,
        error: 'Rating must be between 1 and 5'
      });
    }
    
    const bot = await EmotionBot.findById(req.params.id);
    
    if (!bot) {
      return res.status(404).json({
        success: false,
        error: 'Bot not found'
      });
    }
    
    // Calculate new average rating
    const totalRating = (bot.rating * bot.ratingCount) + rating;
    bot.ratingCount += 1;
    bot.rating = totalRating / bot.ratingCount;
    
    await bot.save();
    
    res.json({
      success: true,
      rating: bot.rating,
      ratingCount: bot.ratingCount
    });
  } catch (error) {
    console.error('Error rating bot:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to rate bot',
      details: error.message
    });
  }
});

module.exports = router;