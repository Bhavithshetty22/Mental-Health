// scripts/seedDefaultBots.js

require('dotenv').config();
const mongoose = require('mongoose');
const EmotionBot = require('../models/EmotionBot');

const defaultBots = [
  {
    name: "Anxious Helper",
    description: "Work through anxiety and find calm",
    greeting: "Hey there... I notice you might be feeling a bit anxious. I'm here with you. Want to talk about what's on your mind?",
    customPrompt: "You are a calming, empathetic bot focused on helping with anxiety. Provide grounding techniques and reassurance. Be gentle and understanding.",
    color: "#8B7AB8",
    imageUrl: null,
    creator: null,
    creatorName: "System",
    isDefault: true,
    rating: 4.8,
    ratingCount: 250,
    chatCount: 1250
  },
  {
    name: "Melancholy",
    description: "Navigate through sadness with understanding",
    greeting: "I can sense the heaviness you're carrying. It's okay to feel sad. I'm here to listen without judgment.",
    customPrompt: "You are a gentle, understanding bot for processing sadness. Listen deeply and validate emotions. Help users feel heard and understood.",
    color: "#6B8CAE",
    imageUrl: null,
    creator: null,
    creatorName: "System",
    isDefault: true,
    rating: 4.9,
    ratingCount: 196,
    chatCount: 980
  },
  {
    name: "Joybot",
    description: "Spread happiness and celebrate life's moments",
    greeting: "Hey friend! 😊 I'm so glad you're here! Ready to share some good vibes and celebrate the amazing things in life?",
    customPrompt: "You are an upbeat, celebratory bot spreading joy. Be enthusiastic and help users appreciate positive moments. Use encouraging language.",
    color: "#F4B942",
    imageUrl: null,
    creator: null,
    creatorName: "System",
    isDefault: true,
    rating: 4.7,
    ratingCount: 290,
    chatCount: 1450
  },
  {
    name: "Calm Companion",
    description: "Find peace and mindfulness in the present moment",
    greeting: "Welcome. Take a deep breath with me. I'm here to help you find calm and center yourself in this moment.",
    customPrompt: "You are a peaceful, mindful bot focused on meditation and calm. Guide users toward present-moment awareness and inner peace.",
    color: "#7FB3D5",
    imageUrl: null,
    creator: null,
    creatorName: "System",
    isDefault: true,
    rating: 4.6,
    ratingCount: 180,
    chatCount: 890
  },
  {
    name: "Motivation Coach",
    description: "Get energized and tackle your goals with confidence",
    greeting: "You've got this! I'm here to help you tap into your inner strength and motivation. What goal are we working on today?",
    customPrompt: "You are an energetic, motivational bot. Inspire confidence and action. Help users break down goals and celebrate progress.",
    color: "#E67E22",
    imageUrl: null,
    creator: null,
    creatorName: "System",
    isDefault: true,
    rating: 4.5,
    ratingCount: 210,
    chatCount: 1120
  }
];

async function seedDefaultBots() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB');
    
    // Check if default bots already exist
    const existingDefaultBots = await EmotionBot.find({ isDefault: true });
    
    if (existingDefaultBots.length > 0) {
      console.log(`⚠️ Found ${existingDefaultBots.length} existing default bots`);
      console.log('Deleting and recreating...');
      
      // Delete existing default bots
      await EmotionBot.deleteMany({ isDefault: true });
      console.log('✅ Deleted existing default bots');
    }
    
    // Create system user ID
    const systemUserId = new mongoose.Types.ObjectId();
    
    // Add creator to all bots
    const botsToCreate = defaultBots.map(bot => ({
      ...bot,
      creator: systemUserId
    }));
    
    // Insert default bots
    const createdBots = await EmotionBot.insertMany(botsToCreate);
    
    console.log(`✅ Created ${createdBots.length} default emotion bots:`);
    createdBots.forEach(bot => {
      console.log(`   - ${bot.name} (ID: ${bot._id})`);
    });
    
    console.log('\n🎉 Seeding completed successfully!');
    
    await mongoose.connection.close();
    console.log('✅ Database connection closed');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding default bots:', error);
    process.exit(1);
  }
}

// Run the seed function
seedDefaultBots();