import { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import './App.css';
import "@fontsource/poppins"; // Defaults to weight 400
import "@fontsource/poppins/600.css"; // Specific weight

// Import your components
import Dashboard from './pages/Dashboard';
import MoodTrackerPage from './pages/MoodTracker';
import Layout from './components/Layout';

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
            <Route path="/mood-tracker" element={<MoodTrackerPage />} />
            
            {/* Add more routes as needed */}
            <Route path="/analytics" element={<div>Analytics Page (Coming Soon)</div>} />
            <Route path="/settings" element={<div>Settings Page (Coming Soon)</div>} />
            
            {/* Catch-all redirect to dashboard */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </div>
    </Router>
  );
}

export default App;