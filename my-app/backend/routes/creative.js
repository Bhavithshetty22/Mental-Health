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
router.get("/", authenticateToken, async (req, res) => {
  try {
    const posts = await CommunityPost.find({})
      .sort({ createdAt: -1 })
      .limit(200)
      .lean();

    const userId = req.user?.id;
    
    console.log('Fetching posts for user:', userId); // Debug log

    // Include likes count and whether current user has supported each post
    const safe = posts.map((p) => {
      let hasSupported = false;
      
      if (userId && p.supporters && Array.isArray(p.supporters)) {
        // Convert both to strings for comparison to handle ObjectId vs string
        hasSupported = p.supporters.some(supporterId => {
          const supporterIdStr = supporterId.toString();
          const userIdStr = userId.toString();
          return supporterIdStr === userIdStr;
        });
        
        // Debug log for first post
        if (p.supporters.length > 0) {
          console.log(`Post ${p._id}: userId=${userId}, supporters=${p.supporters.map(s => s.toString())}, hasSupported=${hasSupported}`);
        }
      }
      
      return {
        _id: p._id,
        title: p.title,
        content: p.content,
        image: p.image,
        type: p.type,
        createdAt: p.createdAt,
        likes: p.likes || 0,
        hasSupported: hasSupported
      };
    });

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
      type: p.type,
      likes: p.likes || 0
    }));

    res.json({ success: true, posts: userPosts, total: userPosts.length });
  } catch (err) {
    console.error("Failed to fetch user posts", err);
    res.status(500).json({ success: false, error: "Failed to fetch user posts" });
  }
});

// POST /api/community/:postId/support - add support/like to a post
router.post("/:postId/support", authenticateToken, async (req, res) => {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({ success: false, error: "Authentication required" });
    }

    const postId = req.params.postId;
    const userId = req.user.id;
    
    console.log(`Support request: postId=${postId}, userId=${userId}`); // Debug log
    
    // Find the post
    const post = await CommunityPost.findById(postId);
    
    if (!post) {
      return res.status(404).json({ success: false, error: "Post not found" });
    }
    
    // Initialize supporters array if it doesn't exist
    if (!post.supporters) {
      post.supporters = [];
    }
    
    console.log('Current supporters:', post.supporters.map(s => s.toString())); // Debug log
    
    // Check if user already supported this post (convert to strings for comparison)
    const alreadySupported = post.supporters.some(supporterId => {
      const supporterIdStr = supporterId.toString();
      const userIdStr = userId.toString();
      console.log(`Comparing: ${supporterIdStr} === ${userIdStr} = ${supporterIdStr === userIdStr}`);
      return supporterIdStr === userIdStr;
    });
    
    console.log('Already supported:', alreadySupported); // Debug log
    
    if (alreadySupported) {
      return res.status(400).json({ 
        success: false, 
        error: "You have already supported this post",
        likes: post.likes || 0
      });
    }
    
    // Add user to supporters array and increment likes count
    post.supporters.push(userId);
    post.likes = (post.likes || 0) + 1;
    await post.save();
    
    console.log('Support added. New supporters:', post.supporters.map(s => s.toString())); // Debug log
    console.log('New likes count:', post.likes); // Debug log
    
    res.json({ 
      success: true, 
      likes: post.likes,
      message: "Post supported successfully"
    });
  } catch (err) {
    console.error("Failed to support post", err);
    res.status(500).json({ success: false, error: "Failed to support post" });
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
    const doc = await CommunityPost.create({ 
      title, 
      content, 
      image, 
      userId, 
      type,
      likes: 0,
      supporters: []
    });
    res.json({
      success: true,
      post: {
        _id: doc._id,
        title: doc.title,
        content: doc.content,
        image: doc.image,
        createdAt: doc.createdAt,
        userId: doc.userId,
        type: doc.type,
        likes: doc.likes
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
    
    // Check if user owns this post (convert to strings for comparison)
    if (post.userId && post.userId.toString() !== req.user.id.toString()) {
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