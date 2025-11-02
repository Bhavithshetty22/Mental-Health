// src/App.js
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import './App.css';
import "@fontsource/poppins";
import "@fontsource/poppins/600.css";
import React, { Suspense, lazy, useState, useEffect } from 'react';


// Lazy-loaded components to reduce initial bundle
const Dashboard = lazy(() => import('./pages/Dashboard'));
const MoodTrackerPage = lazy(() => import('./pages/MoodTracker'));
const TalkToFuture = lazy(() => import('./pages/TalkToFuture'));
const Layout = lazy(() => import('./components/Layout'));
const DailyJournal = lazy(() => import('./pages/DailyJournal'));
const AiTherapy = lazy(() => import('./pages/AiTherapy'));
const LoginSignup = lazy(() => import('./pages/LoginSignup'));
const CommunityPage = lazy(() => import('./pages/Community'));
const Profile = lazy(() => import('./pages/profile'));

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState(null);

  useEffect(() => {
    // Check authentication on mount
    const token = localStorage.getItem("token");
    const userData = localStorage.getItem("user");
    
    if (token && userData) {
      try {
        const parsedUser = JSON.parse(userData);
        setUser(parsedUser);
        setIsAuthenticated(true);
        console.log("User loaded:", parsedUser);
      } catch (err) {
        console.error("Failed to parse user data:", err);
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        setIsAuthenticated(false);
        setUser(null);
      }
    } else {
      setIsAuthenticated(false);
      setUser(null);
    }
    
    setIsLoading(false);
  }, []);

  // Loading component
  const LoadingScreen = () => (
    <div style={{ 
      display: 'flex', 
      justifyContent: 'center', 
      alignItems: 'center', 
      height: '100vh',
      fontSize: '1.2rem',
      color: '#667eea'
    }}>
      Loading...
    </div>
  );

  // Protected Route Component - requires auth only
  const ProtectedRoute = ({ children }) => {
    if (isLoading) {
      return <LoadingScreen />;
    }
    
    // Not authenticated - go to login
    if (!isAuthenticated) {
      console.log("Not authenticated, redirecting to login");
      return <Navigate to="/login" replace />;
    }
    
    // All good - show the page
    return children;
  };

  return (
    <Router>
      <div className="App">
        <Suspense fallback={<LoadingScreen />}>
          <Routes>
            {/* Public auth route - accessible when not authenticated */}
            <Route 
              path="/login" 
              element={
                isLoading ? (
                  <LoadingScreen />
                ) : isAuthenticated ? (
                  <Navigate to="/" replace />
                ) : (
                  <LoginSignup />
                )
              } 
            />
            
            {/* Protected layout - only accessible when authenticated */}
            <Route 
              path="/" 
              element={
                <ProtectedRoute>
                  <Layout />
                </ProtectedRoute>
              }
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
            
            {/* Fallback route - redirect based on auth status */}
            <Route 
              path="*" 
              element={
                isLoading ? (
                  <LoadingScreen />
                ) : !isAuthenticated ? (
                  <Navigate to="/login" replace />
                ) : (
                  <Navigate to="/" replace />
                )
              } 
            />
          </Routes>
        </Suspense>
      </div>
    </Router>
  );
}

export default App;