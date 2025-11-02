// src/pages/Dashboard.jsx
import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import MoodCalendar from "../components/MoodCalendar";
import MoodTrackerWidget from "../components/MoodTrackerWidget";
import ProfileDynamic from "../components/ProfileDynamic";
import "./Dashboard.css";
import EmotionChatWidget from "../components/EmotionalChatWidget";
import AiChatInterface from "./AiChatInterface";
import GoogleFitnessWidget from "../components/GoogleFitWidget";
import WidgetTemplate from "../components/WidgetTemplate";
import MoodTrackerGraph from "../components/MoodTrackerGraph";
import DailyTasksTracker from "../components/DailyTaskTracker";

const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:5000";

// SVG Background Pattern Component
const BackgroundPattern = () => (
  <svg
    className="dashboard-bg-pattern"
    style={{
      position: "absolute",
      top: 0,
      left: 0,
      width: "100%",
      height: "100%",
      zIndex: 0,
      opacity: 0.03,
      pointerEvents: "none",
    }}
  >
    <defs>
      <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
        <circle cx="20" cy="20" r="1" fill="currentColor" />
      </pattern>
    </defs>
    <rect width="100%" height="100%" fill="url(#grid)" />
  </svg>
);

// Animated SVG Icons
const AnimatedMoodIcon = () => (
  <motion.svg
    width="24"
    height="24"
    viewBox="0 0 24 24"
    initial={{ rotate: 0 }}
    animate={{ rotate: 360 }}
    transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
  >
    <circle
      cx="12"
      cy="12"
      r="10"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    />
    <circle cx="9" cy="9" r="1.5" fill="currentColor" />
    <circle cx="15" cy="9" r="1.5" fill="currentColor" />
    <motion.path
      d="M8 14 Q12 17 16 14"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      initial={{ pathLength: 0 }}
      animate={{ pathLength: 1 }}
      transition={{ duration: 1, repeat: Infinity, repeatType: "reverse" }}
    />
  </motion.svg>
);

// Animation Variants
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.2,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      type: "spring",
      stiffness: 100,
      damping: 12,
    },
  },
};

const slideInVariants = {
  hidden: { opacity: 0, x: -30 },
  visible: {
    opacity: 1,
    x: 0,
    transition: {
      type: "spring",
      stiffness: 80,
      damping: 15,
    },
  },
};

const scaleInVariants = {
  hidden: { opacity: 0, scale: 0.8 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: {
      type: "spring",
      stiffness: 100,
      damping: 15,
    },
  },
};

function Dashboard() {
  const [_count, _setCount] = useState(0);
  const [user, setUser] = useState(null);
  const [userMoods, setUserMoods] = useState({});
  const [viewType, _setViewType] = useState("weekly");
  const [graphLoading, setGraphLoading] = useState(true);
  const navigate = useNavigate();
  const hasFetched = useRef(false);

  // Load user from localStorage on mount
  useEffect(() => {
    try {
      const raw = localStorage.getItem("user");
      if (raw) {
        setUser(JSON.parse(raw));
      }
    } catch (err) {
      console.warn("Failed to parse user from localStorage", err);
    }
  }, []);

  // Fetch moods from API
  useEffect(() => {
    const loadMoods = async () => {
      if (hasFetched.current) return;
      hasFetched.current = true;

      try {
        setGraphLoading(true);
        const token = localStorage.getItem("token");
        if (!token) {
          setGraphLoading(false);
          return;
        }

        const response = await fetch(`${API_BASE}/api/moods`, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        });

        if (response.ok) {
          const data = await response.json();
          if (data.success) {
            setUserMoods(data.moods || {});
          }
        }
      } catch (error) {
        console.error("Error loading moods for dashboard:", error);
      } finally {
        setGraphLoading(false);
      }
    };

    loadMoods();
  }, []);

  const [selectedBot, setSelectedBot] = useState(null);

  const _displayName = () => {
    if (!user) return "Guest";
    return user.name || user.username || user.email || "Guest";
  };

  const handleGoToMoodTracker = () => {
    navigate("/mood-tracker");
  };

  const handleJournalClick = () => {
    navigate("/daily-journal");
  };

  const handleMeditationClick = () => {
    navigate("/ai-therapy");
  };

  const handleAnalyticsClick = () => {
    navigate("/talk-to-future");
  };

  return (
    <div className="cont" style={{ position: "relative", overflow: "hidden" }}>
      <BackgroundPattern />

      <motion.div
        className="maincontainer"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        style={{ position: "relative", zIndex: 1 }}
      >
        {/* Top Dashboard Section */}
        <motion.div className="topdashboarddiv" variants={itemVariants}>
          <ProfileDynamic />

          <motion.div
            className="righttopdashboarddiv"
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
              <MoodTrackerWidget onGoClick={handleGoToMoodTracker} />
            </motion.div>

            <div className="thesquareicons">
              <motion.div
                className="profileicon"
                whileHover={{ scale: 1.1, rotate: 5 }}
                whileTap={{ scale: 0.95 }}
                transition={{ type: "spring", stiffness: 300 }}
                onClick={() => navigate("/profile")}
                style={{ cursor: "pointer" }}
              />
            </div>
          </motion.div>
        </motion.div>

        {/* Middle Dashboard Section */}
        <motion.div className="middledashdiv1" variants={itemVariants}>
          <motion.div className="emotionbotandupper" variants={slideInVariants}>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.5 }}
            >
              <DailyTasksTracker />
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4, duration: 0.5 }}
            >
              <EmotionChatWidget onBotSelect={setSelectedBot} />
            </motion.div>
            <AnimatePresence>
              {selectedBot && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9, y: 20 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9, y: 20 }}
                  transition={{ type: "spring", stiffness: 200, damping: 20 }}
                >
                  <AiChatInterface
                    selectedBot={selectedBot}
                    onClose={() => setSelectedBot(null)}
                    apiKey={import.meta.env.VITE_GEMINI_API_KEY}
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>

          <motion.div className="graphsdiv" variants={slideInVariants}>
            <AnimatePresence mode="wait">
              {!graphLoading && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.4 }}
                >
                  <MoodTrackerGraph userMoods={userMoods} viewType={viewType} />
                </motion.div>
              )}
            </AnimatePresence>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5, duration: 0.5 }}
              whileHover={{ scale: 1.01 }}
            >
              <MoodCalendar moods={userMoods} />
            </motion.div>
          </motion.div>
        </motion.div>

        {/* Features Grid */}
        <motion.div className="featuresgrid" variants={containerVariants}>
          <motion.div
            variants={scaleInVariants}
            whileHover={{
              scale: 1.03,

              transition: { duration: 0.2 },
            }}
            whileTap={{ scale: 0 }}
          >
            <WidgetTemplate
              theme="light"
              title="Daily Journal"
              description="Reflect on your day and track your thoughts and emotions through journaling."
              buttonText="Start Writing"
              imageUrl="/dailyjournal.png"
              handleButtonClick={handleJournalClick}
            />
          </motion.div>

          <motion.div
            variants={scaleInVariants}
            whileHover={{
              scale: 1.03,
              transition: { duration: 0.2 },
            }}
            whileTap={{ scale: 0 }}
          >
            <WidgetTemplate
              theme="light"
              title="AI Therapist"
              description="Find your inner peace with our curated meditation sessions and mindfulness exercises."
              buttonText="Begin Session"
              imageUrl="/aitherapist.png"
              handleButtonClick={handleMeditationClick}
            />
          </motion.div>

          <motion.div
            variants={scaleInVariants}
            whileHover={{
              scale: 1.03,
              transition: { duration: 0.2 },
            }}
            whileTap={{ scale: 0 }}
          >
            <WidgetTemplate
              theme="light"
              title="Talk to your future self"
              description="Visualize your emotional patterns and gain insights into your mental health journey."
              buttonText="Let's start"
              imageUrl="/talktoyourfutureself.png"
              handleButtonClick={handleAnalyticsClick}
            />
          </motion.div>
        </motion.div>
        {/* Footer Section */}
      </motion.div>
      {/* Footer Section */}
      <motion.footer
        className="dashboard-footer"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 0.5 }}
      >
        <div className="footer-content">
          <div className="footer-left">
            <h3>Moodora</h3>
            <p>Your daily companion for emotional wellness 💚</p>
          </div>

          <div className="footer-links">
            <a href="/about">About</a>
            <a href="/privacy">Privacy</a>
            <a href="/contact">Contact</a>
          </div>

          <div className="footer-right">
            <p>© {new Date().getFullYear()} Moodora. All rights reserved.</p>
          </div>
        </div>
      </motion.footer>
    </div>
  );
}

export default Dashboard;
