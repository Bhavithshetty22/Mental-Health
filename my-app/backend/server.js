require("dotenv").config(); // Load .env first

const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");

const moodRoutes = require("./routes/moodRoutes");

const app = express();
const PORT = process.env.PORT || 5000;

// ===== CORS Middleware =====
app.use(
  cors({
    origin: "http://localhost:5173", // 👈 Allow React app
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"], // 👈 Explicitly allow headers
    credentials: true,
  })
);

// ===== Middleware =====
app.use(express.json());

// ===== Debug .env =====
console.log("DEBUG MONGO_URI:", process.env.MONGO_URI);

// ===== Connect to MongoDB =====
if (!process.env.MONGO_URI) {
  console.error("❌ MONGO_URI is missing! Check your .env file.");
  process.exit(1);
}

mongoose
  .connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log("✅ MongoDB connected"))
  .catch((err) => console.error("❌ MongoDB connection error:", err));

// ===== Test routes =====
app.get("/", (req, res) => {
  res.json({
    message: "Server is working!",
    timestamp: new Date().toISOString(),
  });
});

app.get("/api/health", (req, res) => {
  res.json({
    status: "OK",
    message: "Health check passed",
  });
});

// ===== Use mood routes =====
app.use("/api/moods", moodRoutes);

// ===== 404 handler =====
app.use((req, res) => {
  res.status(404).json({
    error: `Route not found: ${req.method} ${req.path}`,
  });
});

// ===== Start server =====
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`✅ Test routes: /, /api/health, /api/moods`);
});
