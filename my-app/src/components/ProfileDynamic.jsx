import React, { useState, useEffect } from 'react';
import './ProfileDynamic.css';

// Use the same API base as your MoodTracker
const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:5000";

const MoodProfile = ({ selectedDate = null }) => {
  const [currentMood, setCurrentMood] = useState('okay');
  const [_loading, _setLoading] = useState(true);

  // Add your image URLs here for each mood
  const moodImages = {
   
  };


  // Fetch mood when component mounts or date changes
  useEffect(() => {
    const fetchMoodFromDatabase = async () => {
      const getTodayKey = () => {
        const today = selectedDate || new Date();
        return `${today.getFullYear()}-${today.getMonth() + 1}-${today.getDate()}`;
      };
      try {
        _setLoading(true);
        const token = localStorage.getItem("token");
        if (!token) {
          setCurrentMood('okay');
          _setLoading(false);
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
          _setLoading(false);
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
        _setLoading(false);
      }
    };

    fetchMoodFromDatabase();
  }, [selectedDate]);

  

  return (
    <div className="mood-profile-div">
      <div className='mood-text-for-box'>
        <h1 className='mood-welcome-text'>Hello Bhavith!</h1>
        <p className='mood-welcome-para'>It's good to see you again</p>
      </div>
     <img 
        src={moodImages[currentMood] || moodImages['okay']} 
        alt={`Mood: ${currentMood}`} 
        className="mood-image1"
        />
    </div>

  );
};

export default MoodProfile;