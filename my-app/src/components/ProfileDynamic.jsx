import React, { useState, useEffect } from 'react';
import './ProfileDynamic.css';

// Use the same API base as your MoodTracker
const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:5000";

const MoodProfile = ({ selectedDate = null }) => {
  const [currentMood, setCurrentMood] = useState('okay');
  const [moodImage, setMoodImage] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadingImage, setLoadingImage] = useState(false);
  const [userName, setUserName] = useState('Guest');

  // Mood colors for fallback display
  const moodColors = {
    terrible: "#ef4444",
    bad: "#f97316",
    okay: "#f59e0b",
    good: "#3b82f6",
    amazing: "#10b981"
  };

  const moodEmojis = {
    terrible: "😢",
    bad: "😕",
    okay: "😐",
    good: "😊",
    amazing: "😄"
  };

  // Get user name from localStorage
  useEffect(() => {
    try {
      const userStr = localStorage.getItem("user");
      if (userStr) {
        const user = JSON.parse(userStr);
        setUserName(user.name || user.username || 'Guest');
      }
    } catch (error) {
      console.error('Error parsing user:', error);
    }
  }, []);

  // Fetch mood image from API
  const fetchMoodImage = async (mood) => {
    try {
      setLoadingImage(true);
      const token = localStorage.getItem("token");
      if (!token) return;

      console.log(`[ProfileDynamic] Fetching mood image for: ${mood}`);

      const response = await fetch(`${API_BASE}/api/mood-tracker/image/${mood}`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.imageUrl) {
          console.log(`[ProfileDynamic] Got mood image, cached: ${data.cached}`);
          setMoodImage(data.imageUrl);
        }
      } else {
        console.error("[ProfileDynamic] Failed to fetch mood image:", response.status);
      }
    } catch (error) {
      console.error("[ProfileDynamic] Error fetching mood image:", error);
    } finally {
      setLoadingImage(false);
    }
  };

  // Fetch mood when component mounts or date changes
  useEffect(() => {
    const fetchMoodFromDatabase = async () => {
      const getTodayKey = () => {
        const today = selectedDate || new Date();
        return `${today.getFullYear()}-${today.getMonth() + 1}-${today.getDate()}`;
      };
      try {
        setLoading(true);
        const token = localStorage.getItem("token");
        if (!token) {
          setCurrentMood('okay');
          setLoading(false);
          return;
        }

        const response = await fetch(`${API_BASE}/api/moods`, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        });

        if (response.status === 401 || response.status === 403) {
          console.warn('Authentication failed in MoodProfile');
          setCurrentMood('okay');
          setLoading(false);
          return;
        }

        if (response.ok) {
          const data = await response.json();
          if (data.success && data.moods) {
            const todayKey = getTodayKey();
            const todayMoodData = data.moods[todayKey];
            if (todayMoodData) {
              const mood = typeof todayMoodData === 'string' ? todayMoodData : todayMoodData.mood;
              setCurrentMood(mood || 'okay');
              // Fetch the mood image
              await fetchMoodImage(mood || 'okay');
            } else {
              setCurrentMood('okay');
            }
          }
        } else {
          setCurrentMood('okay');
        }
      } catch (error) {
        console.error('Error fetching mood from database:', error);
        setCurrentMood('okay');
      } finally {
        setLoading(false);
      }
    };

    fetchMoodFromDatabase();
  }, [selectedDate]);

  return (
    <div className="mood-profile-div">
      <div className='mood-text-for-box'>
        <h1 className='mood-welcome-text'>Hello {userName}!</h1>
        <p className='mood-welcome-para'>It's good to see you again</p>
      </div>
      
      {/* Mood Image Display */}
      <div 
        className="mood-image-container"
        style={{
          position: 'relative',
          width: '280px',
          height: '280px',
          borderRadius: '20px',
          overflow: 'hidden',
        
 
          background: loading || loadingImage ? `${moodColors[currentMood]}20` : 'white'
        }}
      >
        {loading || loadingImage ? (
          <div style={{
            width: '100%',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '40px'
          }}>
            {moodEmojis[currentMood]}
          </div>
        ) : moodImage ? (
          <img 
            src={moodImage} 
            alt={`Mood: ${currentMood}`} 
            className="mood-image1"
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover'
            }}
            onError={(e) => {
              console.error("Mood image failed to load, showing emoji fallback");
              e.target.style.display = 'none';
              // Show emoji as fallback
              const parent = e.target.parentElement;
              if (parent) {
                parent.innerHTML = `
                  <div style="
                    width: 100%;
                    height: 100%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 40px;
                  ">
                    ${moodEmojis[currentMood]}
                  </div>
                `;
              }
            }}
          />
        ) : (
          <div style={{
            width: '100%',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '40px'
          }}>
            {moodEmojis[currentMood]}
          </div>
        )}
      </div>

      
    </div>
  );
};

export default MoodProfile;