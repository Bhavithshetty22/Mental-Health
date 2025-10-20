// src/pages/Dashboard.jsx
import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import MoodCalendar from "../components/MoodCalendar";
import MoodTrackerWidget from "../components/MoodTrackerWidget";
import ProfileDynamic from "../components/ProfileDynamic";
import "./Dashboard.css";
import EmotionChatWidget from "../components/EmotionalChatWidget";
import AiChatInterface from "./AiChatInterface";
import GoogleFitnessWidget from "../components/GoogleFitWidget";
import WidgetTemplate from "../components/WidgetTemplate";
import MoodTrackerGraph from "../components/MoodTrackerGraph";

const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:5000";

function Dashboard() {
  const [count, setCount] = useState(0);
  const [user, setUser] = useState(null);
  const [userMoods, setUserMoods] = useState({});
  const [viewType, setViewType] = useState("weekly");
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

  const displayName = () => {
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
    <div className="cont">
      <div className="maincontainer">
        <div className="topdashboarddiv">
          <ProfileDynamic />
          <div className="righttopdashboarddiv">
            <MoodTrackerWidget onGoClick={handleGoToMoodTracker} />
            <div className="thesquareicons">
              <div className="profileicon"></div>
              <div className="notifications"></div>
            </div>
          </div>
        </div>

        <div className="middledashdiv1">
          <div className="emotionbotandupper">
            <div className="recent"></div>
            <EmotionChatWidget onBotSelect={setSelectedBot} />
            {selectedBot && (
              <AiChatInterface
                selectedBot={selectedBot}
                onClose={() => setSelectedBot(null)}
                apiKey={import.meta.env.VITE_GEMINI_API_KEY}
              />
            )}
          </div>

          <div className="graphsdiv">
            {!graphLoading && (
              <MoodTrackerGraph userMoods={userMoods} viewType={viewType} />
            )}
            <MoodCalendar moods={userMoods} />
          </div>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;
