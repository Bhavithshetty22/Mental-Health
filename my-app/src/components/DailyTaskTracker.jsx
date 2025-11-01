import React, { useState, useEffect } from 'react';
import { Check, Circle } from 'lucide-react';
import './DailyTaskTracker.css';

const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:5000";

const DailyTasksTracker = () => {
  const [tasks, setTasks] = useState([
    { id: 'mood', label: 'Track your mood', completed: false },
    { id: 'journal', label: 'Write daily journal', completed: false },
    { id: 'future', label: 'Talk to your future self', completed: false }
  ]);

  const [currentSlide, setCurrentSlide] = useState(0);
  const [loading, setLoading] = useState(true);

  const getTodayKey = () => {
    const today = new Date();
    return `${today.getFullYear()}-${today.getMonth() + 1}-${today.getDate()}`;
  };

  const getUserId = () => {
    try {
      const userStr = localStorage.getItem('user');
      if (userStr) {
        const user = JSON.parse(userStr);
        return user._id || user.id;
      }
    } catch (err) {
      console.error('Error parsing user:', err);
    }
    return null;
  };

  const fetchTaskStatus = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setLoading(false);
        return;
      }

      const todayKey = getTodayKey();
      const userId = getUserId();
      const today = new Date().toISOString().split('T')[0];

      console.log('[DailyTasksTracker] Checking tasks for date:', todayKey);

      // Check mood
      const moodResponse = await fetch(`${API_BASE}/api/moods`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      let moodTracked = false;
      if (moodResponse.ok) {
        const moodData = await moodResponse.json();
        if (moodData.success && moodData.moods) {
          moodTracked = todayKey in moodData.moods;
        }
      }

      // Check daily journal (NEW: Check /api/daily-journal)
      let journalWritten = false;
      const journalResponse = await fetch(`${API_BASE}/api/daily-journal/check/today`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (journalResponse.ok) {
        const journalData = await journalResponse.json();
        journalWritten = journalData.success && journalData.hasEntry;
        console.log('[DailyTasksTracker] Journal check:', journalData);
      }

      // Check future letter
      let futureLetterWritten = false;
      
      if (userId) {
        const lettersResponse = await fetch(`${API_BASE}/api/letters?owner=${userId}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        if (lettersResponse.ok) {
          const lettersData = await lettersResponse.json();
          
          if (Array.isArray(lettersData)) {
            lettersData.forEach(entry => {
              const entryDate = new Date(entry.createdAt).toISOString().split('T')[0];
              if (entryDate === today) {
                // Check if it's a future letter (has model field)
                const hasModel = entry.model && entry.model !== '';
                if (hasModel) {
                  futureLetterWritten = true;
                }
              }
            });
          }
        }
      }

      setTasks([
        { id: 'mood', label: 'Track your mood', completed: moodTracked },
        { id: 'journal', label: 'Write daily journal', completed: journalWritten },
        { id: 'future', label: 'Talk to your future self', completed: futureLetterWritten }
      ]);

      console.log('[DailyTasksTracker] Task status:', {
        mood: moodTracked,
        journal: journalWritten,
        future: futureLetterWritten
      });

    } catch (error) {
      console.error('[DailyTasksTracker] Error fetching task status:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTaskStatus();
  }, []);

  useEffect(() => {
    const interval = setInterval(fetchTaskStatus, 10000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const handleMoodUpdate = () => {
      console.log('[DailyTasksTracker] Mood updated event received');
      fetchTaskStatus();
    };
    
    const handleJournalUpdate = () => {
      console.log('[DailyTasksTracker] Journal updated event received');
      fetchTaskStatus();
    };
    
    const handleFutureLetterUpdate = () => {
      console.log('[DailyTasksTracker] Future letter updated event received');
      fetchTaskStatus();
    };

    window.addEventListener('moodUpdated', handleMoodUpdate);
    window.addEventListener('journalUpdated', handleJournalUpdate);
    window.addEventListener('futureLetterCreated', handleFutureLetterUpdate);

    return () => {
      window.removeEventListener('moodUpdated', handleMoodUpdate);
      window.removeEventListener('journalUpdated', handleJournalUpdate);
      window.removeEventListener('futureLetterCreated', handleFutureLetterUpdate);
    };
  }, []);

  const completedCount = tasks.filter(t => t.completed).length;
  const totalTasks = tasks.length;
  const progress = (completedCount / totalTasks) * 100;
  const allCompleted = completedCount === totalTasks;

  useEffect(() => {
    if (!allCompleted && !loading) {
      const interval = setInterval(() => {
        setCurrentSlide((prev) => (prev + 1) % totalTasks);
      }, 3000);
      return () => clearInterval(interval);
    }
  }, [allCompleted, totalTasks, loading]);

  if (loading) {
    return (
      <div className="daily-tasks-wrapper">
        <div className="daily-tasks-loading">
          <div className="loading-pulse">
            <div className="loading-bar loading-bar-short"></div>
            <div className="loading-bar loading-bar-medium"></div>
            <div className="loading-bar loading-bar-tall"></div>
            <div className="loading-bar loading-bar-large"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="daily-tasks-wrapper">
      <div className="daily-tasks-container">
        <div className="daily-tasks-content">
          <div className="daily-tasks-header">
            <h2 className="daily-tasks-title">
              {allCompleted ? '🎉 All Tasks Completed!' : 'Today\'s Wellness Tasks'}
            </h2>
            <p className="daily-tasks-subtitle">
              {allCompleted 
                ? 'Great job! You\'ve completed all your daily tasks.' 
                : `${completedCount} of ${totalTasks} tasks completed`}
            </p>
          </div>

          <div className="progress-section">
            <div className="progress-header">
              <span className="progress-label">Progress</span>
              <span className="progress-percentage">{Math.round(progress)}%</span>
            </div>
            <div className="progress-track">
              <div className="progress-fill" style={{ width: `${progress}%` }}>
                <div className="progress-shine"></div>
              </div>
            </div>
          </div>

          <div className="tasks-cards-container">
            {allCompleted ? (
              <div className="completion-message">
                <div className="completion-card">
                  <div className="completion-emoji">✨</div>
                  <h3 className="completion-title">All Tasks Completed!</h3>
                  <p className="completion-text">You're taking great care of yourself today. Keep up the amazing work! 💪</p>
                  <div style={{ 
                    marginTop: '16px', 
                    fontSize: '14px', 
                    color: '#6b7280',
                    textAlign: 'center' 
                  }}>
                    Come back tomorrow for new wellness tasks
                  </div>
                </div>
              </div>
            ) : (
              tasks.map((task, index) => (
                <div
                  key={task.id}
                  className={`task-card ${
                    index === currentSlide 
                      ? 'task-card-active' 
                      : index < currentSlide 
                        ? 'task-card-prev' 
                        : 'task-card-next'
                  }`}
                >
                  <div className="task-card-inner">
                    <div className="task-content">
                      <div className={`task-icon ${task.completed ? 'task-icon-completed' : 'task-icon-pending'}`}>
                        {task.completed ? (
                          <Check size={28} strokeWidth={3} color="#047857" />
                        ) : (
                          <Circle size={28} color="rgba(255, 255, 255, 0.6)" />
                        )}
                      </div>
                      <div className="task-info">
                        <p className={`task-label ${task.completed ? 'task-label-completed' : 'task-label-pending'}`}>
                          {task.label}
                        </p>
                        <p className="task-status">
                          {task.completed ? 'Completed ✓' : 'Not completed yet'}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {!allCompleted && (
            <div className="slide-indicators">
              {tasks.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentSlide(index)}
                  className={`slide-indicator ${index === currentSlide ? 'slide-indicator-active' : 'slide-indicator-inactive'}`}
                  aria-label={`Go to task ${index + 1}`}
                />
              ))}
            </div>
          )}

          <div className="quick-overview">
            <h3 className="quick-overview-title">Quick Overview</h3>
            <div className="overview-tasks">
              {tasks.map((task) => (
                <div key={task.id} className="overview-task">
                  <div className={`overview-icon ${task.completed ? 'overview-icon-completed' : 'overview-icon-pending'}`}>
                    {task.completed && <Check size={12} strokeWidth={3} color="#047857" />}
                  </div>
                  <span className={`overview-label ${task.completed ? 'overview-label-completed' : 'overview-label-pending'}`}>
                    {task.label}
                  </span>
                  {task.completed && (
                    <span className="overview-badge">Done</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DailyTasksTracker;