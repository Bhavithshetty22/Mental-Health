// Updated Dashboard.js
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import MoodCalendar from '../components/MoodCalendar';
import MoodTrackerWidget from '../components/MoodTrackerWidget';
import ProfileDynamic from '../components/ProfileDynamic';
import './Dashboard.css';
import EmotionChatWidget from '../components/EmotionalChatWidget';
import GoogleFitnessWidget from '../components/GoogleFitWidget';
import WidgetTemplate from '../components/WidgetTemplate'; // Import your widget

function Dashboard() {
  const [count, setCount] = useState(0);
  const navigate = useNavigate();

  // Function to handle navigation to mood tracker
  const handleGoToMoodTracker = () => {
    navigate('/mood-tracker');
  };

  // Handler functions for the three widgets
  const handleJournalClick = () => {
    navigate('/daily-journal');
    // Or any other action you want
  };

  const handleMeditationClick = () => {
    navigate('/ai-therapy');
    // Or any other action you want
  };

  const handleAnalyticsClick = () => {
    navigate('/talk-to-future');
    // Or any other action you want
  };

  return (
    <div className="cont">
      <div className="maincontainer">
        <div className="container1st">
          <div className="left-section">
             <div className="welcome-text">
              <h2 className="welcome-title">Welcome Back Bhavith</h2>
              <p className="welcome-subtitle">You are feeling sad today and its ok we can get through this talk to me anytime u want</p>
            </div>
            <ProfileDynamic />
           
          </div>
          <div className="othercontainer1boxes">
            <div className="moodandfit">
              <MoodTrackerWidget onGoClick={handleGoToMoodTracker} />
              <GoogleFitnessWidget />
            </div>
            <MoodCalendar />
          </div>
        </div>
        
        <div className='featuresgrid'>
          <WidgetTemplate
            theme="light"
            title="Daily Journal"
            description="Reflect on your day and track your thoughts and emotions through journaling."
            buttonText="Start Writing"
            imageUrl="/dailyjournal.png"
            handleButtonClick={handleJournalClick}
          />
          
          <WidgetTemplate
            theme="light"
            title="AI Therapist"
            description="Find your inner peace with our curated meditation sessions and mindfulness exercises."
            buttonText="Begin Session"
            imageUrl="/aitherapist.png"
            handleButtonClick={handleMeditationClick}
          />
          
          <WidgetTemplate
            theme="light"
            title="Talk to your futute self"
            description="Visualize your emotional patterns and gain insights into your mental health journey."
            buttonText="Lets start"
            imageUrl="/talktoyourfutureself.png"
            handleButtonClick={handleAnalyticsClick}
          />
        </div>

        <EmotionChatWidget />
      </div>
    </div>
  );
}

export default Dashboard;