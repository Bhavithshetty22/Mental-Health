import React from 'react';
import { ArrowRight } from 'lucide-react';
import './MoodTrackerWidget.css';

function MoodTrackerWidget({ onGoClick }) {
  return (
    <div className="mood-tracker-widget">
      <div className="widget-header1">
        <h3>How are you feeling today?</h3>
        <p>Track your daily mood and emotions</p>
      </div>
      
      <div className="widget-content">
        <div className="mood-preview">
          <div className="mood-icons">
            <span className="mood-icon">😄</span>
            <span className="mood-icon">😊</span>
            <span className="mood-icon">😐</span>
            <span className="mood-icon">😔</span>
            <span className="mood-icon">😢</span>
          </div>
          <p className="mood-hint">Select your current mood</p>
        </div>
        
        <button 
          className="go-button"
          onClick={onGoClick}
        >
          <span>Track Mood</span>
          <ArrowRight size={18} />
        </button>
      </div>
    </div>
  );
}

export default MoodTrackerWidget;