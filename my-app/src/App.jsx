// src/App.js
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
import AiTherapy from './pages/AiTherapy';

// Auth page (login/signup)
import LoginSignup from './pages/LoginSignup';

function isAuthenticated() {
  return !!localStorage.getItem('token');
}

function App() {
  const authed = isAuthenticated();

  return (
    <Router>
      <div className="App">
        <Routes>
          {/* Public auth routes */}
          <Route path="/settings" element={<LoginSignup />} />
          <Route path="/login" element={<LoginSignup />} />

          {/* Protected layout - only accessible when authed */}
          <Route path="/" element={authed ? <Layout /> : <Navigate to="/" replace />} >
            <Route index element={<Dashboard />} />
            <Route path="mood-tracker" element={<MoodTrackerPage />} />
            <Route path="talk-to-future" element={<TalkToFuture />} />
            <Route path="daily-journal" element={<DailyJournal />} />
            <Route path="ai-therapy" element={<AiTherapy />} />
            <Route path="analytics" element={<div>Analytics Page (Coming Soon)</div>} />
          </Route>

          {/* fallback */}
          <Route path="*" element={<Navigate to={authed ? "/" : "/settings"} replace />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
