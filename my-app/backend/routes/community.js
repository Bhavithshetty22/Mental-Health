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

// GET /api/community/user - returns posts created by the authenticated user
router.get("/user", authenticateToken, async (req, res) => {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({ success: false, error: "Authentication required" });
    }

    const posts = await CommunityPost.find({ userId: req.user.id })
      .sort({ createdAt: -1 })
      .lean();

    const userPosts = posts.map((p) => ({
      _id: p._id,
      title: p.title,
      content: p.content,
      image: p.image,
      createdAt: p.createdAt,
      userId: p.userId,
      type: p.type
    }));

    res.json({ success: true, posts: userPosts, total: userPosts.length });
  } catch (err) {
    console.error("Failed to fetch user posts", err);
    res.status(500).json({ success: false, error: "Failed to fetch user posts" });
  }
});

// POST /api/community - create new post (supports anonymous)
router.post("/", authenticateToken, async (req, res) => {
  try {
    const { title = "", content = "", image = null, type = "text" } = req.body;
    if (!content && !image) {
      return res.status(400).json({ success: false, error: "Content or image required" });
    }

    const userId = req.user?.id || null; // user id if logged in
    const doc = await CommunityPost.create({ title, content, image, userId, type });
    res.json({
      success: true,
      post: {
        _id: doc._id,
        title: doc.title,
        content: doc.content,
        image: doc.image,
        createdAt: doc.createdAt,
        userId: doc.userId
      },
    });
  } catch (err) {
    console.error("Failed to create community post", err);
    res.status(500).json({ success: false, error: "Failed to create post" });
  }
});

// DELETE /api/community/:postId - delete a post
router.delete("/:postId", authenticateToken, async (req, res) => {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({ success: false, error: "Authentication required" });
    }

    const { postId } = req.params;
    
    // Find the post first to verify ownership
    const post = await CommunityPost.findById(postId);
    
    if (!post) {
      return res.status(404).json({ success: false, error: "Post not found" });
    }
    
    // Check if user owns this post
    if (post.createdBy && post.createdBy.toString() !== req.user.id) {
      return res.status(403).json({ success: false, error: "Not authorized to delete this post" });
    }
    
    await CommunityPost.findByIdAndDelete(postId);
    
    res.json({ success: true, message: "Post deleted successfully" });
  } catch (err) {
    console.error("Failed to delete post", err);
    res.status(500).json({ success: false, error: "Failed to delete post" });
  }
});

module.exports = router;
