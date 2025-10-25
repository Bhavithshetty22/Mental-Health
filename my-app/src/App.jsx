// src/App.js
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import './App.css';
import "@fontsource/poppins";
import "@fontsource/poppins/600.css";
import React, { Suspense, lazy } from 'react';


// Lazy-loaded components to reduce initial bundle
const Dashboard = lazy(() => import('./pages/Dashboard'));
const MoodTrackerPage = lazy(() => import('./pages/MoodTracker'));
const TalkToFuture = lazy(() => import('./pages/TalkToFuture'));
const Layout = lazy(() => import('./components/Layout'));
const DailyJournal = lazy(() => import('./pages/DailyJournal'));
const AiTherapy = lazy(() => import('./pages/AiTherapy'));
const LoginSignup = lazy(() => import('./pages/LoginSignup'));
const CommunityPage = lazy(() => import('./pages/Community'));
const Profile = lazy(() => import('./pages/Profile'));

function isAuthenticated() {
  return !!localStorage.getItem('token');
}

function App() {
  const authed = isAuthenticated();
  
  return (
    <Router>
      <div className="App">
        <Suspense fallback={<div style={{padding:20}}>Loading...</div>}>
        <Routes>
          {/* Public auth routes */}

          <Route 
            path="/login" 
            element={authed ? <Navigate to="/" replace /> : <LoginSignup />} 
          />
          
          {/* Protected layout - only accessible when authed */}
          <Route 
            path="/" 
            element={authed ? <Layout /> : <Navigate to="/login" replace />}
          >
            <Route index element={<Dashboard />} />
            <Route path="mood-tracker" element={<MoodTrackerPage />} />
            <Route path="talk-to-future" element={<TalkToFuture />} />
            <Route path="community" element={<CommunityPage />} />
            <Route path="daily-journal" element={<DailyJournal />} />
            <Route path="ai-therapy" element={<AiTherapy />} />
            <Route path="profile" element={<Profile />} />
            <Route path="analytics" element={<div>Analytics Page (Coming Soon)</div>} />
          </Route>
          
          {/* Fallback route */}
          <Route 
            path="*" 
            element={<Navigate to={authed ? "/" : "/login"} replace />} 
          />
        </Routes>
        </Suspense>
      </div>
    </Router>
  );
}

export default App;