// src/pages/Dashboard.jsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import MoodCalendar from '../components/MoodCalendar';
import MoodTrackerWidget from '../components/MoodTrackerWidget';
import ProfileDynamic from '../components/ProfileDynamic';
import './Dashboard.css';
import EmotionChatWidget from '../components/EmotionalChatWidget';
import GoogleFitnessWidget from '../components/GoogleFitWidget';

function Dashboard() {
  const [count, setCount] = useState(0);
  const [user, setUser] = useState(null);
  const navigate = useNavigate();

  // load user from localStorage on mount
  useEffect(() => {
    try {
      const raw = localStorage.getItem('user');
      if (raw) {
        setUser(JSON.parse(raw));
      }
    } catch (err) {
      console.warn('Failed to parse user from localStorage', err);
    }
  }, []);

  const displayName = () => {
    if (!user) return 'Guest';
    // prefer name, then username, then email
    return user.name || user.username || user.email || 'Guest';
  };

  // Function to handle navigation to mood tracker
  const handleGoToMoodTracker = () => {
    navigate('/mood-tracker');
  };

  return (
    <div className="cont">
      <div className="maincontainer">
        <div className="container1st">
          <div className="left-section">
            <ProfileDynamic />
            <div className="welcome-text">
              <h2 className="welcome-title">Welcome back {displayName()}</h2>
              <p className="welcome-subtitle">
                You are feeling sad today and it's okay — we can get through this.
                Talk to me anytime you want.
              </p>
            </div>
          </div>

          <div className="othercontainer1boxes">
            <div className="moodandfit">
              <MoodTrackerWidget onGoClick={handleGoToMoodTracker} />
              <GoogleFitnessWidget />
            </div>

            <MoodCalendar />
          </div>
        </div>

        <EmotionChatWidget />
      </div>
    </div>
  );
}

export default Dashboard;
