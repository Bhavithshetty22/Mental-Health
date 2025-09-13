import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import MoodCalendar from '../components/MoodCalendar';
import MoodTrackerWidget from '../components/MoodTrackerWidget';
import './Dashboard.css';

function Dashboard() {
  const [count, setCount] = useState(0);
  const navigate = useNavigate();

  // Function to handle navigation to mood tracker
  const handleGoToMoodTracker = () => {
    navigate('/mood-tracker');
  };

  return (
    <div className="maincontainer">
      <div className="logo">
        <h1 className='logotext'>MoodCheck</h1>
      </div>
      
      <div className="container1st">
        <div className="pfp">
          <img src="/pfp1.jpg" alt="" className="dynamicpfp" />
        </div>
        <div className="othercontainer1boxes">
          <MoodTrackerWidget onGoClick={handleGoToMoodTracker} />
          <MoodCalendar />
        </div>
      </div>
    </div>
  );
}

export default Dashboard;