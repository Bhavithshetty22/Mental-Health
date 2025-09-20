// backend/routes/community.js
const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const Post = require("../models/Post");
const jwt = require("jsonwebtoken");
const router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET || "dev_secret";

// --------- Multer setup ----------
const uploadsDir = path.join(__dirname, "..", "uploads");
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const base = path.basename(file.originalname, ext).replace(/\s+/g, "-").toLowerCase();
    const name = `${Date.now()}-${base}${ext}`;
    cb(null, name);
  }
});
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    const allowed = ["image/png", "image/jpeg", "image/jpg", "image/webp", "image/gif"];
    cb(null, allowed.includes(file.mimetype));
  }
});

// --------- Auth middleware (optional) ----------
function authenticateTokenOptional(req, res, next) {
  const auth = req.headers["authorization"];
  if (!auth) return next();
  const token = auth.split(" ")[1];
  if (!token) return next();
  jwt.verify(token, JWT_SECRET, (err, payload) => {
    if (!err && payload) req.user = payload;
    // even if invalid, continue as anonymous (don't block)
    next();
  });
}

function authenticateTokenRequired(req, res, next) {
  const auth = req.headers["authorization"];
  const token = auth && auth.split(" ")[1];
  if (!token) return res.status(401).json({ success: false, error: "Access token required" });
  jwt.verify(token, JWT_SECRET, (err, payload) => {
    if (err) return res.status(403).json({ success: false, error: "Invalid token" });
    req.user = payload;
    next();
  });
}

// Serve a quick health endpoint
router.get("/test", (req, res) => {
  res.json({ message: "Community routes OK", timestamp: new Date().toISOString() });
});

// GET /api/community
// Query params: page (1), limit (10)
router.get("/", async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(50, parseInt(req.query.limit) || 12);

    const skip = (page - 1) * limit;

    const posts = await Post.find({})
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    // IMPORTANT: hide owner and likes when sending to clients
    const safePosts = posts.map(p => ({
      id: p._id,
      text: p.text,
      image: p.imagePath ? `/uploads/${path.basename(p.imagePath)}` : (p.imageUrl || null),
      // do not send p.owner or p.likedBy or p.likes
      createdAt: p.createdAt
    }));

    const total = await Post.countDocuments();

    res.json({ success: true, posts: safePosts, page, limit, total });
  } catch (err) {
    console.error("Community GET error:", err);
    res.status(500).json({ success: false, error: "Failed to fetch posts" });
  }
});

// POST /api/community
// Fields: text, imageUrl (optional). Optional file: image
// Authentication optional (anonymous allowed)
router.post("/", authenticateTokenOptional, upload.single("image"), async (req, res) => {
  try {
    const { text, imageUrl } = req.body;

    if (!text && !req.file && !imageUrl) {
      return res.status(400).json({ success: false, error: "Post must contain text or an image" });
    }

    const post = new Post({
      text: text ? String(text).slice(0, 2000) : undefined,
      imagePath: req.file ? req.file.path : undefined,
      imageUrl: imageUrl ? String(imageUrl).slice(0, 1000) : undefined,
      owner: req.user?.id || undefined
    });

    await post.save();

    // return safe minimal data
    res.json({
      success: true,
      post: {
        id: post._id,
        text: post.text,
        image: post.imagePath ? `/uploads/${path.basename(post.imagePath)}` : (post.imageUrl || null),
        createdAt: post.createdAt
      }
    });
  } catch (err) {
    console.error("Community POST error:", err);
    res.status(500).json({ success: false, error: "Failed to create post" });
  }
});

// POST /api/community/:id/like  => requires auth
router.post("/:id/like", authenticateTokenRequired, async (req, res) => {
  try {
    const postId = req.params.id;
    const userId = req.user?.id;

    if (!postId) return res.status(400).json({ success: false, error: "Invalid post id" });

    const post = await Post.findById(postId);
    if (!post) return res.status(404).json({ success: false, error: "Post not found" });

    // If you want to prevent double-likes, track likedBy
    if (post.likedBy && post.likedBy.some(id => String(id) === String(userId))) {
      // already liked - remove like (toggle)
      post.likedBy = post.likedBy.filter(id => String(id) !== String(userId));
      post.likes = Math.max(0, post.likes - 1);
    } else {
      post.likedBy = post.likedBy || [];
      post.likedBy.push(userId);
      post.likes = (post.likes || 0) + 1;
    }

    await post.save();

    // IMPORTANT: don't return like count publicly if you want it hidden.
    res.json({ success: true, message: "Toggled like (count not exposed)." });
  } catch (err) {
    console.error("Like error:", err);
    res.status(500).json({ success: false, error: "Failed to like post" });
  }
});

module.exports = router;
