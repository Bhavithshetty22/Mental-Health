import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import MoodCalendar from '../components/MoodCalendar';
import MoodTrackerWidget from '../components/MoodTrackerWidget';
import ProfileDynamic from '../components/ProfileDynamic';
import './Dashboard.css';
import EmotionChatWidget from '../components/EmotionalChatWidget';

function Dashboard() {
  const [count, setCount] = useState(0);
  const navigate = useNavigate();

  // Function to handle navigation to mood tracker
  const handleGoToMoodTracker = () => {
    navigate('/mood-tracker');
  };

  return (
    <div className="maincontainer">
      
      <div className="container1st">
        <ProfileDynamic />
        <div className="othercontainer1boxes">
          <MoodTrackerWidget onGoClick={handleGoToMoodTracker} />
          <MoodCalendar />
        </div>
      </div>
      <EmotionChatWidget />
    </div>
  );
}

export default Dashboard;