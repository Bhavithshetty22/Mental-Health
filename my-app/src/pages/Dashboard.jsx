import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import MoodCalendar from '../components/MoodCalendar';
import MoodTrackerWidget from '../components/MoodTrackerWidget';
import ProfileDynamic from '../components/ProfileDynamic';
import './Dashboard.css';
import EmotionChatWidget from '../components/EmotionalChatWidget';
import GoogleFitnessWidget from '../components/GoogleFitWidget';

function Dashboard() {
  const [count, setCount] = useState(0);
  const navigate = useNavigate();

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
      <h2 className="welcome-title">Welcome Back Bhavith</h2>
      <p className="welcome-subtitle">You are feeling sad today and its ok we can get through this talk to me anytime u want</p>
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