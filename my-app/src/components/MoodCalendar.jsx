import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import './MoodCalendar.css';

const MoodCalendar = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [moods, setMoods] = useState({});
  const [loading, setLoading] = useState(false);

  // Mood types with colors and faces
  const moodTypes = {
    amazing: { className: 'mood-amazing', face: '😄', label: 'Amazing' },
    good: { className: 'mood-good', face: '😊', label: 'Good' },
    okay: { className: 'mood-okay', face: '😐', label: 'Okay' },
    bad: { className: 'mood-bad', face: '😔', label: 'Bad' },
    terrible: { className: 'mood-terrible', face: '😢', label: 'Terrible' }
  };

  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  // Fetch moods from API
  const fetchMoods = async () => {
    setLoading(true);
    try {
      const response = await fetch('http://localhost:5000/api/moods');
      const data = await response.json();
      
      if (data.success) {
        // Convert API format to our component format
        const formattedMoods = {};
        Object.entries(data.moods).forEach(([dateKey, moodData]) => {
          // Convert from "2025-9-13" to our internal format
          const [year, month, day] = dateKey.split('-');
          const internalKey = `${year}-${parseInt(month) - 1}-${parseInt(day)}`;
          formattedMoods[internalKey] = {
            mood: moodData.mood,
            notes: moodData.notes || '',
            timestamp: moodData.timestamp
          };
        });
        setMoods(formattedMoods);
      }
    } catch (error) {
      console.error('Error fetching moods:', error);
    } finally {
      setLoading(false);
    }
  };

  // Get days in month
  const getDaysInMonth = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const days = [];
    
    // Add empty cells for days before month starts
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }
    
    // Add days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(day);
    }
    
    return days;
  };

  const navigateMonth = (direction) => {
    setCurrentDate(prev => {
      const newDate = new Date(prev);
      newDate.setMonth(prev.getMonth() + direction);
      return newDate;
    });
  };

  const getMood = (day) => {
    if (!day) return null;
    const dateKey = `${currentDate.getFullYear()}-${currentDate.getMonth()}-${day}`;
    return moods[dateKey];
  };

  // Fetch moods when component mounts or month changes
  useEffect(() => {
    fetchMoods();
  }, [currentDate]);

  const days = getDaysInMonth(currentDate);
  const trackedDaysThisMonth = Object.keys(moods).filter(
    key => key.startsWith(`${currentDate.getFullYear()}-${currentDate.getMonth()}`)
  ).length;

  return (
    <div className="mood-calendar">
      {/* Header */}
      <div className="mood-calendar__header">
        <div className="mood-calendar__header-left">
          <div className="mood-calendar__icon">
            <span>😊</span>
          </div>
          <button
            onClick={() => navigateMonth(-1)}
            className="mood-calendar__nav-button"
          >
            <ChevronLeft size={20} />
          </button>
        </div>
        
        <div className="mood-calendar__header-center">
          <span className="mood-calendar__month-year">
            {months[currentDate.getMonth()]} {currentDate.getFullYear()}
          </span>
          <button
            onClick={() => navigateMonth(1)}
            className="mood-calendar__nav-button"
          >
            <ChevronRight size={20} />
          </button>
        </div>
        
        <button 
          className="mood-calendar__export-button"
          onClick={fetchMoods}
          title="Refresh moods"
          style={{ 
            backgroundColor: loading ? '#f3f4f6' : 'transparent',
            animation: loading ? 'spin 1s linear infinite' : 'none' 
          }}
        >
          <span>{loading ? '↻' : '🔄'}</span>
        </button>
      </div>

      {/* Days of week */}
      <div className="mood-calendar__days-header">
        {daysOfWeek.map(day => (
          <div key={day} className="mood-calendar__day-name">
            {day}
          </div>
        ))}
      </div>

      {/* Calendar days */}
      <div className="mood-calendar__days-grid">
        {days.map((day, index) => {
          const currentMoodData = getMood(day);
          const moodData = currentMoodData ? moodTypes[currentMoodData.mood] : null;
          
          return (
            <div key={index} className="mood-calendar__day-cell">
              {day ? (
                <div className="mood-calendar__day-container">
                  <div
                    className={`mood-calendar__day-button ${moodData ? moodData.className : 'mood-calendar__day-button--default'}`}
                  >
                    {moodData ? moodData.face : ''}
                  </div>
                  
                  {/* Day number */}
                  <span className="mood-calendar__day-number">
                    {day}
                  </span>
                  
                  {/* Tooltip */}
                  {moodData && (
                    <div className="mood-calendar__tooltip">
                      {moodData.label}
                      {currentMoodData.notes && (
                        <div style={{ fontSize: '0.8em', opacity: 0.8 }}>
                          {currentMoodData.notes.substring(0, 30)}{currentMoodData.notes.length > 30 ? '...' : ''}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ) : null}
            </div>
          );
        })}
      </div>

      {/* Mood legend */}
      <div className="mood-calendar__legend">
        <h3 className="mood-calendar__legend-title">Mood Scale</h3>
        <div className="mood-calendar__legend-items">
          {Object.entries(moodTypes).map(([key, mood]) => (
            <div key={key} className="mood-calendar__legend-item">
              <div className={`mood-calendar__legend-icon ${mood.className}`}>
                {mood.face}
              </div>
              <span className="mood-calendar__legend-label">{mood.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Stats */}
      <div className="mood-calendar__stats">
        <div className="mood-calendar__stats-text">
          This month: {trackedDaysThisMonth} days tracked
          {loading && <span> • Loading...</span>}
        </div>
      </div>
    </div>
  );
};

export default MoodCalendar;