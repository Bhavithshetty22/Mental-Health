import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import './App.css';
import "@fontsource/poppins";
import "@fontsource/poppins/600.css";

// Import your components/pages
import Dashboard from './pages/Dashboard';
import MoodTrackerPage from './pages/MoodTracker';
import TalkToFuture from './pages/TalkToFuture';
import Layout from './components/Layout';
import DailyJournal from './pages/DailyJournal';
import AiTherapy from './pages/AiTherapy'

function App() {
  return (
    <Router>
      <div className="App">
        <Routes>
          {/* Main layout wrapper */}
          <Route path="/" element={<Layout />}>
            {/* Dashboard route */}
            <Route index element={<Dashboard />} />

            {/* Mood Tracker route */}
            <Route path="mood-tracker" element={<MoodTrackerPage />} />

            {/* Talk To Future route */}
            <Route path="talk-to-future" element={<TalkToFuture />} />
             <Route path="daily-journal" element={<DailyJournal />} />
               <Route path="AiTherapy" element={<AiTherapy />} />

            {/* Add more routes as needed */}
            <Route path="analytics" element={<div>Analytics Page (Coming Soon)</div>} />
            <Route path="settings" element={<div>Settings Page (Coming Soon)</div>} />

            {/* Catch-all redirect to dashboard */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </div>
    </Router>
  );
}

export default App;
