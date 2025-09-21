import React, { useState, useEffect } from 'react';
import './ProfileDynamic.css';

// Use the same API base as your MoodTracker
const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:5000";

const MoodProfile = ({ userId = null, selectedDate = null }) => {
  const [currentMood, setCurrentMood] = useState('okay');
  const [loading, setLoading] = useState(true);

  // Add your image URLs here for each mood
  const moodImages = {
    amazing: '/amazing.png',
    good: '/happy.png', 
    okay: '/okay.png',
    bad: '/bad.png',
    terrible: '/terrible.png' // Fixed missing slash
  };

  // Get today's date key to match your API format (YYYY-M-D)
  const getTodayKey = () => {
    const today = selectedDate || new Date();
    return `${today.getFullYear()}-${today.getMonth() + 1}-${today.getDate()}`;
  };

  // Fetch mood from database with authentication
  const fetchMoodFromDatabase = async () => {
    try {
      setLoading(true);
      
      // Get the auth token from localStorage (same as MoodTracker)
      const token = localStorage.getItem("token");
      
      if (!token) {
        console.log('No auth token found, using default mood');
        setCurrentMood('okay');
        setLoading(false);
        return;
      }

      // Make authenticated request (same as MoodTracker)
      const response = await fetch(`${API_BASE}/api/moods`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });
      
      // Handle auth errors
      if (response.status === 401 || response.status === 403) {
        console.warn('Authentication failed in MoodProfile');
        setCurrentMood('okay');
        setLoading(false);
        return;
      }

      if (response.ok) {
        const data = await response.json();
        console.log('Fetched mood data:', data);
        
        if (data.success && data.moods) {
          const todayKey = getTodayKey();
          const todayMoodData = data.moods[todayKey];
          
          if (todayMoodData) {
            // Handle both string and object formats from your database
            const mood = typeof todayMoodData === 'string' 
              ? todayMoodData 
              : todayMoodData.mood;
            
            console.log('Setting mood to:', mood);
            setCurrentMood(mood || 'okay');
          } else {
            console.log('No mood found for today, using default');
            setCurrentMood('okay');
          }
        }
      } else {
        console.error('Failed to fetch mood data:', response.status);
        setCurrentMood('okay');
      }
    } catch (error) {
      console.error('Error fetching mood from database:', error);
      setCurrentMood('okay');
    } finally {
      setLoading(false);
    }
  };

  // Fetch mood when component mounts or date changes
  useEffect(() => {
    fetchMoodFromDatabase();
  }, [selectedDate]);

  // Show loading state
  if (loading) {
    return (
      <div className="mood-profile-div mood-loading">
        <div className="loading-spinner"></div>
      </div>
    );
  }

  return (
    <div 
      className={`mood-profile-div mood-${currentMood}`}
      style={{
        backgroundImage: `url(${moodImages[currentMood] || moodImages.okay})`
      }}
    >
      
    </div>
  );
};

export default MoodProfile;