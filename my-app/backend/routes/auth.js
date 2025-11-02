// server/routes/auth.js
const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const EmotionBot = require("../models/EmotionBot");
const router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET || "dev_secret";
const SALT_ROUNDS = 10;

// Default bots configuration
const DEFAULT_BOTS = [
  {
    name: "Anxious Helper",
    description: "Work through anxiety and find calm",
    greeting: "Hey there... I notice you might be feeling a bit anxious. I'm here with you. Want to talk about what's on your mind?",
    customPrompt: "You are a calming, empathetic bot focused on helping with anxiety. Provide grounding techniques and reassurance. Be gentle and understanding.",
    color: "#8B7AB8",
    imageUrl: null,
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
    creatorName: "System",
    isDefault: true,
    rating: 4.5,
    ratingCount: 210,
    chatCount: 1120
  }
];

// Function to ensure default bots exist
async function ensureDefaultBots() {
  try {
    // Check if default bots already exist
    const existingDefaultBots = await EmotionBot.find({ isDefault: true });
    
    if (existingDefaultBots.length === 0) {
      console.log('No default bots found, creating them...');
      
      // Create system user ID for default bots
      const mongoose = require('mongoose');
      const systemUserId = new mongoose.Types.ObjectId();
      
      // Add creator to all bots
      const botsToCreate = DEFAULT_BOTS.map(bot => ({
        ...bot,
        creator: systemUserId
      }));
      
      // Insert default bots
      await EmotionBot.insertMany(botsToCreate);
      console.log(`✅ Created ${botsToCreate.length} default emotion bots`);
    } else {
      console.log(`✅ Default bots already exist (${existingDefaultBots.length} found)`);
    }
  } catch (error) {
    console.error('Error ensuring default bots:', error);
    // Don't throw error - allow auth to continue even if bot seeding fails
  }
}

// Authentication middleware
const authenticateToken = (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({ message: "Access token required" });
    }

    jwt.verify(token, JWT_SECRET, (err, user) => {
      if (err) {
        return res.status(403).json({ message: "Invalid or expired token" });
      }
      req.user = user;
      next();
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Authentication error" });
  }
};

// Signup
router.post("/signup", async (req, res) => {
  try {
    const { name, username, email, password } = req.body;
    if (!name || !email || !password) return res.status(400).json({ message: "Missing fields" });

    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) return res.status(400).json({ message: "Email already registered" });

    const hashed = await bcrypt.hash(password, SALT_ROUNDS);
    const user = new User({ 
      name, 
      username, 
      email: email.toLowerCase(), 
      password: hashed,
      profileComplete: false 
    });
    await user.save();

    // Ensure default bots exist in database
    await ensureDefaultBots();

    const token = jwt.sign({ id: user._id }, JWT_SECRET, { expiresIn: "7d" });
    const safeUser = { 
      id: user._id, 
      name: user.name, 
      email: user.email, 
      username: user.username,
      profileComplete: user.profileComplete
    };

    res.json({ token, user: safeUser });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// Login
router.post("/login", async (req, res) => {
  try {
    const { identifier, password } = req.body;
    if (!identifier || !password) return res.status(400).json({ message: "Missing fields" });

    const query = identifier.includes("@") ? { email: identifier.toLowerCase() } : { username: identifier };
    let user = await User.findOne(query);

    if (!user && !identifier.includes("@")) {
      user = await User.findOne({ email: identifier.toLowerCase() });
    }
    if (!user) return res.status(400).json({ message: "Invalid credentials" });

    const ok = await bcrypt.compare(password, user.password);
    if (!ok) return res.status(400).json({ message: "Invalid credentials" });

    // Ensure default bots exist in database
    await ensureDefaultBots();

    const token = jwt.sign({ id: user._id }, JWT_SECRET, { expiresIn: "7d" });
    const safeUser = { 
      id: user._id, 
      name: user.name, 
      email: user.email, 
      username: user.username,
      profileComplete: user.profileComplete
    };

    res.json({ token, user: safeUser });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// Get profile status
router.get("/profile-status", authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    if (!user) return res.status(404).json({ message: "User not found" });
    
    res.json({ 
      profileComplete: user.profileComplete,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        username: user.username,
        profileImage: user.profileImage,
        bio: user.bio,
        dateOfBirth: user.dateOfBirth,
        gender: user.gender,
        location: user.location,
        interests: user.interests
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// Complete profile setup
router.post("/complete-profile", authenticateToken, async (req, res) => {
  try {
    const { profileImage, bio, dateOfBirth, gender, location, interests } = req.body;
    
    if (!profileImage) {
      return res.status(400).json({ message: "Profile image is required" });
    }
    
    if (profileImage.length > 7000000) {
      return res.status(400).json({ message: "Image too large. Please upload an image smaller than 5MB" });
    }
    
    if (bio && bio.length > 500) {
      return res.status(400).json({ message: "Bio must be less than 500 characters" });
    }
    
    const user = await User.findByIdAndUpdate(
      req.user.id,
      {
        profileImage,
        bio: bio?.trim() || '',
        dateOfBirth: dateOfBirth || null,
        gender: gender || null,
        location: location?.trim() || '',
        interests: Array.isArray(interests) ? interests : [],
        profileComplete: true,
        profileCompletedAt: new Date()
      },
      { new: true }
    ).select('-password');
    
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    
    res.json({ 
      message: "Profile completed successfully",
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        username: user.username,
        profileImage: user.profileImage,
        bio: user.bio,
        dateOfBirth: user.dateOfBirth,
        gender: user.gender,
        location: user.location,
        interests: user.interests,
        profileComplete: user.profileComplete
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// Update profile
router.patch("/update-profile", authenticateToken, async (req, res) => {
  try {
    const { profileImage, bio, dateOfBirth, gender, location, interests } = req.body;
    
    const updateData = {};
    if (profileImage !== undefined) {
      if (profileImage.length > 7000000) {
        return res.status(400).json({ message: "Image too large" });
      }
      updateData.profileImage = profileImage;
    }
    if (bio !== undefined) {
      if (bio.length > 500) {
        return res.status(400).json({ message: "Bio too long" });
      }
      updateData.bio = bio.trim();
    }
    if (dateOfBirth !== undefined) updateData.dateOfBirth = dateOfBirth;
    if (gender !== undefined) updateData.gender = gender;
    if (location !== undefined) updateData.location = location.trim();
    if (interests !== undefined) updateData.interests = interests;
    
    const user = await User.findByIdAndUpdate(
      req.user.id,
      updateData,
      { new: true }
    ).select('-password');
    
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    
    res.json({ 
      message: "Profile updated successfully",
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        username: user.username,
        profileImage: user.profileImage,
        bio: user.bio,
        dateOfBirth: user.dateOfBirth,
        gender: user.gender,
        location: user.location,
        interests: user.interests,
        profileComplete: user.profileComplete
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
module.exports.authenticateToken = authenticateToken;