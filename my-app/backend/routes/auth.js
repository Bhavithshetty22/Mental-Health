// server/routes/auth.js
const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET || "dev_secret";
const SALT_ROUNDS = 10;

// Authentication middleware
const authenticateToken = (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

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

    // simple email check
    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) return res.status(400).json({ message: "Email already registered" });

    const hashed = await bcrypt.hash(password, SALT_ROUNDS);
    const user = new User({ name, username, email: email.toLowerCase(), password: hashed });
    await user.save();

    // Include more user info in token for better compatibility
    const token = jwt.sign({ 
      id: user._id,
      userId: user._id,  // Added for compatibility
      username: user.username || user.name,
      email: user.email,
      name: user.name
    }, JWT_SECRET, { expiresIn: "7d" });
    
    const safeUser = { id: user._id, name: user.name, email: user.email, username: user.username };

    res.json({ token, user: safeUser });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// Login (accepts email or username)
router.post("/login", async (req, res) => {
  try {
    const { identifier, password } = req.body;
    if (!identifier || !password) return res.status(400).json({ message: "Missing fields" });

    // find by email or username
    const query = identifier.includes("@") ? { email: identifier.toLowerCase() } : { username: identifier };
    let user = await User.findOne(query);

    // fallback: try email if username search failed
    if (!user && !identifier.includes("@")) {
      user = await User.findOne({ email: identifier.toLowerCase() });
    }
    if (!user) return res.status(400).json({ message: "Invalid credentials" });

    const ok = await bcrypt.compare(password, user.password);
    if (!ok) return res.status(400).json({ message: "Invalid credentials" });

    // Include more user info in token for better compatibility
    const token = jwt.sign({ 
      id: user._id,
      userId: user._id,  // Added for compatibility
      username: user.username || user.name,
      email: user.email,
      name: user.name
    }, JWT_SECRET, { expiresIn: "7d" });
    
    const safeUser = { id: user._id, name: user.name, email: user.email, username: user.username };
    res.json({ token, user: safeUser });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// Export both router and middleware
module.exports = router;
module.exports.authenticateToken = authenticateToken;