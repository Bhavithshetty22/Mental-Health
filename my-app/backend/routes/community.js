// backend/routes/community.js
const express = require("express");
const router = express.Router();
const CommunityPost = require("../models/CommunityPost");
const jwt = require("jsonwebtoken");
const JWT_SECRET = process.env.JWT_SECRET || "dev_secret";

// lightweight auth middleware (optional)
const authenticateToken = (req, res, next) => {
  try {
    const authHeader = req.headers["authorization"];
    const token = authHeader && authHeader.split(" ")[1];
    if (!token) return next(); // allow anonymous posts if you prefer
    jwt.verify(token, JWT_SECRET, (err, payload) => {
      if (err) return next(); // on invalid token, proceed as anonymous
      req.user = payload;
      next();
    });
  } catch (err) {
    console.error("Auth check failed", err);
    next();
  }
};

// GET /api/community - returns list of recent posts
router.get("/", async (req, res) => {
  try {
    const posts = await CommunityPost.find({})
      .sort({ createdAt: -1 })
      .limit(200)
      .lean();

    // IMPORTANT: remove or mask any PII before sending (createdBy -> hidden)
    const safe = posts.map((p) => ({
      _id: p._id,
      title: p.title,
      content: p.content,
      image: p.image,
      createdAt: p.createdAt,
      // likes and createdBy intentionally omitted from client view for privacy
    }));

    res.json({ success: true, posts: safe, total: safe.length });
  } catch (err) {
    console.error("Failed to fetch community posts", err);
    res.status(500).json({ success: false, error: "Failed to fetch posts" });
  }
});

// POST /api/community - create new post (supports anonymous)
router.post("/", authenticateToken, async (req, res) => {
  try {
    const { title = "", content = "", image = null } = req.body;
    if (!content && !image) {
      return res.status(400).json({ success: false, error: "Content or image required" });
    }

    const createdBy = req.user?.id || null; // user id if logged in
    const doc = await CommunityPost.create({ title, content, image, createdBy });
    res.json({
      success: true,
      post: {
        _id: doc._id,
        title: doc.title,
        content: doc.content,
        image: doc.image,
        createdAt: doc.createdAt,
      },
    });
  } catch (err) {
    console.error("Failed to create community post", err);
    res.status(500).json({ success: false, error: "Failed to create post" });
  }
});

module.exports = router;
