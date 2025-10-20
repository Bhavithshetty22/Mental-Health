import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import './MoodCalendar.css';

const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:5000";

const MoodCalendar = () => {
  const navigate = useNavigate();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [moods, setMoods] = useState({});
  const [loading, setLoading] = useState(false);
  const hasFetched = useRef(false); // Ref to track if data has been fetched

  // Mood types with colors and faces
  const moodTypes = {
    amazing: { className: 'mood-amazing', face: '😄', label: 'Amazing' },
    good:    { className: 'mood-good',    face: '😊', label: 'Good' },
    okay:    { className: 'mood-okay',    face: '😐', label: 'Okay' },
    bad:     { className: 'mood-bad',     face: '😔', label: 'Bad' },
    terrible:{ className: 'mood-terrible',face: '😢', label: 'Terrible' }
  };

  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  // Fetch moods from API (with auth)
  const fetchMoods = async (forceRefresh = false) => {
    // Prevent multiple calls unless forced refresh
    if (hasFetched.current && !forceRefresh) return;
    hasFetched.current = true;

    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        // Not logged in -> send to login page
        navigate('/settings');
        return;
      }

      const res = await fetch(`${API_BASE}/api/moods`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });

      if (res.status === 401 || res.status === 403) {
        // unauthorized: clear local state and redirect to login
        console.warn('Auth error while fetching moods, redirecting to login.');
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        navigate('/settings');
        return;
      }

      const data = await res.json();
      if (data.success) {
        // convert server keys (YYYY-M-D with 1-based month) to internal keys that use same format:
        // We'll keep keys using "YYYY-M-D" (month 1-based) to match other parts of your app.
        const formatted = {};
        Object.entries(data.moods || {}).forEach(([dateKey, moodData]) => {
          // server dateKey already looks like "2025-9-13" (1-based month)
          // We'll normalize it (remove extra zeroes) to "YYYY-M-D"
          const parts = dateKey.split('-').map(s => String(parseInt(s, 10))); // ["2025","9","13"]
          const normalizedKey = `${parts[0]}-${parts[1]}-${parts[2]}`; // "2025-9-13"
          formatted[normalizedKey] = {
            mood: moodData.mood,
            notes: moodData.notes || '',
            timestamp: moodData.timestamp || null,
          };
        });

        setMoods(formatted);
      } else {
        // if API returned success:false, clear moods
        setMoods({});
      }
    } catch (err) {
      console.error('Error fetching moods:', err);
      hasFetched.current = false; // allow retry
    } finally {
      setLoading(false);
    }
  };

  // Manual refresh function
  const handleRefresh = () => {
    hasFetched.current = false; // Reset the flag to allow fetching again
    fetchMoods(true); // Force refresh
  };

  // Get days in month
  const getDaysInMonth = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth(); // 0-based internally
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const days = [];
    // Add empty cells for days before month starts
    for (let i = 0; i < startingDayOfWeek; i++) days.push(null);
    // Add days of the month
    for (let d = 1; d <= daysInMonth; d++) days.push(d);
    return days;
  };

  const navigateMonth = (direction) => {
    setCurrentDate(prev => {
      const n = new Date(prev);
      n.setMonth(prev.getMonth() + direction);
      return n;
    });
  };

  // getMood for a day: build key consistent with server: "YYYY-M-D" (1-based month, no padding)
  const getMood = (day) => {
    if (!day) return null;
    const y = currentDate.getFullYear();
    const m = currentDate.getMonth() + 1; // convert to 1-based month
    const key = `${y}-${m}-${day}`; // same format backend uses
    return moods[key] || null;
  };

  // Fetch moods on mount
  useEffect(() => {
    fetchMoods();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const days = getDaysInMonth(currentDate);

  // count tracked days this month using same key format
  const trackedDaysThisMonth = Object.keys(moods).filter(key => {
    // consider keys like "2025-9-13" -> check year and month
    const [ky, km] = key.split('-');
    return Number(ky) === currentDate.getFullYear() && Number(km) === (currentDate.getMonth() + 1);
  }).length;

  return (
    <div className="mood-calendar1">
      {/* Header */}
      <div className="mood-calendar__header">
        <div className="mood-calendar__header-left">
          <div className="mood-calendar__icon"><span>😊</span></div>
          <button onClick={() => navigateMonth(-1)} className="mood-calendar__nav-button">
            <ChevronLeft size={20} />
          </button>
        </div>

        <div className="mood-calendar__header-center">
          <button onClick={() => navigateMonth(1)} className="mood-calendar__nav-button">
            <ChevronRight size={20} />
          </button>
          <span className="mood-calendar__month-year">
            {months[currentDate.getMonth()]} {currentDate.getFullYear()}
          </span>
        </div>

        <button
          className="mood-calendar__export-button"
          onClick={handleRefresh}
          title="Refresh moods"
          style={{
            backgroundColor: loading ? '#f3f4f6' : 'transparent',
            animation: loading ? 'spin 1s linear infinite' : 'none'
          }}
        >
          <span>{loading ? '↻' : '🔄'}</span>
        </button>
      </div>

      {/* Days header */}
      <div className="mood-calendar__days-header">
        {daysOfWeek.map(d => <div key={d} className="mood-calendar__day-name">{d}</div>)}
      </div>

      {/* Days grid */}
      <div className="mood-calendar__days-grid">
        {days.map((day, idx) => {
          const currentMoodData = getMood(day);
          const moodData = currentMoodData ? moodTypes[currentMoodData.mood] : null;

          return (
            <div key={idx} className="mood-calendar__day-cell">
              {day ? (
                <div className="mood-calendar__day-container">
                  <div className={`mood-calendar__day-button ${moodData ? moodData.className : 'mood-calendar__day-button--default'}`}>
                    {moodData ? moodData.face : ''}
                  </div>

                  <span className="mood-calendar__day-number">{day}</span>

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

      {/* Legend */}
      <div className="mood-calendar__legend">
        <h3 className="mood-calendar__legend-title">Mood Scale</h3>
        <div className="mood-calendar__legend-items">
          {Object.entries(moodTypes).map(([key, mood]) => (
            <div key={key} className="mood-calendar__legend-item">
              <div className={`mood-calendar__legend-icon ${mood.className}`}>{mood.face}</div>
              <span className="mood-calendar__legend-label">{mood.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Stats */}
      
    </div>
  );
};

export default MoodCalendar;
