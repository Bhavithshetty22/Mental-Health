"use client"

import { useState, useEffect } from "react"
import { Calendar, TrendingUp, BarChart3, Plus, X } from "lucide-react"
import MoodCalendar from '../components/MoodCalendar'
import "./MoodTracker.css"

const MoodTrackerPage = () => {
  const [showMoodSelector, setShowMoodSelector] = useState(false)
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [userMoods, setUserMoods] = useState({})
  const [loading, setLoading] = useState(true) // Back to true for real backend loading
  const [saving, setSaving] = useState(false)
  const [todayMood, setTodayMood] = useState(null)
  const [sliderValue, setSliderValue] = useState(50)

  const moodTypes = {
    terrible: {
      color: "#ef4444", // Red
      face: "😢",
      label: "Terrible",
      description: "Really struggling today",
      range: [0, 20],
    },
    bad: {
      color: "#f97316", // Orange
      face: "😔",
      label: "Bad",
      description: "Not having a great day",
      range: [20, 40],
    },
    okay: {
      color: "#f59e0b", // Yellow
      face: "😐",
      label: "Okay",
      description: "Feeling neutral, just getting by",
      range: [40, 60],
    },
    good: {
      color: "#3b82f6", // Blue
      face: "😊",
      label: "Good",
      description: "Having a pleasant day",
      range: [60, 80],
    },
    amazing: {
      color: "#10b981", // Green
      face: "😄",
      label: "Amazing",
      description: "Feeling fantastic and energetic!",
      range: [80, 100],
    },
  }

  const getMoodFromSliderValue = (value) => {
    for (const [key, mood] of Object.entries(moodTypes)) {
      if (value >= mood.range[0] && value < mood.range[1]) {
        return key
      }
    }
    return "amazing" // Default for value 100
  }

  const getSliderValueFromMood = (moodKey) => {
    const mood = moodTypes[moodKey]
    if (mood) {
      return (mood.range[0] + mood.range[1]) / 2
    }
    return 50
  }

  // FIXED: Get today's date key to match API format (YYYY-M-D)
  const getTodayKey = () => {
    const today = new Date()
    return `${today.getFullYear()}-${today.getMonth() + 1}-${today.getDate()}`
  }

  // FIXED: Load moods from API (removed auth headers that were causing issues)
  const loadMoods = async () => {
    try {
      setLoading(true)
      const response = await fetch('http://localhost:5000/api/moods')
      
      if (response.ok) {
        const data = await response.json()
        console.log('API Response:', data) // Debug log
        
        if (data.success) {
          setUserMoods(data.moods || {})
          
          // Check if today's mood is set
          const todayKey = getTodayKey()
          console.log('Today key:', todayKey) // Debug log
          console.log('Available moods:', data.moods) // Debug log
          
          const todayMoodData = data.moods[todayKey]
          if (todayMoodData) {
            setTodayMood(todayMoodData.mood)
            setSliderValue(getSliderValueFromMood(todayMoodData.mood))
          }
        }
      }
    } catch (error) {
      console.error('Error loading moods:', error)
    } finally {
      setLoading(false)
    }
  }

  // FIXED: Save mood to API with correct date format
  const saveMood = async (date, moodType, notes = '') => {
    try {
      setSaving(true)
      // Use API format: YYYY-M-D
      const apiDate = `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`
      
      const response = await fetch('http://localhost:5000/api/moods', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // Removed auth header since we're using mock user
        },
        body: JSON.stringify({
          date: apiDate,
          mood: moodType,
          notes: notes
        })
      })

      if (response.ok) {
        const result = await response.json()
        console.log('Save result:', result) // Debug log
        
        // Update local state with the same key format as API returns
        const displayKey = apiDate // Keep same format as API
        setUserMoods(prev => ({
          ...prev,
          [displayKey]: {
            mood: moodType,
            notes: notes,
            timestamp: new Date().toISOString()
          }
        }))

        // Update today's mood if it's today
        if (apiDate === getTodayKey()) {
          setTodayMood(moodType)
        }

        // Reload moods to sync with server
        await loadMoods()

        return true
      } else {
        const errorData = await response.json()
        console.error('Save error:', errorData)
        throw new Error(errorData.error || 'Failed to save mood')
      }
    } catch (error) {
      console.error('Error saving mood:', error)
      alert('Failed to save mood. Please try again.')
      return false
    } finally {
      setSaving(false)
    }
  }

  const handleMoodSelect = async () => {
    const moodType = getMoodFromSliderValue(sliderValue)
    const success = await saveMood(selectedDate, moodType)
    if (success) {
      setShowMoodSelector(false)
    }
  }

  // Handle mood selection from calendar (for direct mood selection without slider)
  const handleMoodSelectFromCalendar = async (moodType) => {
    const success = await saveMood(selectedDate, moodType)
    if (success) {
      setShowMoodSelector(false)
    }
  }

  // Open mood selector for today
  const openTodayMoodSelector = () => {
    setSelectedDate(new Date())
    if (todayMood) {
      setSliderValue(getSliderValueFromMood(todayMood))
    } else {
      setSliderValue(50)
    }
    setShowMoodSelector(true)
  }

  // FIXED: Get mood statistics with better error handling
  const getMoodStats = () => {
    const moodEntries = Object.values(userMoods)
    const totalEntries = moodEntries.length

    if (totalEntries === 0) return null

    const moodCounts = {}
    moodEntries.forEach((entry) => {
      // Handle both string and object formats
      const mood = typeof entry === "string" ? entry : entry?.mood
      if (mood) {
        moodCounts[mood] = (moodCounts[mood] || 0) + 1
      }
    })

    const mostCommon = Object.entries(moodCounts).sort(([, a], [, b]) => b - a)[0]

    return {
      totalEntries,
      mostCommon: mostCommon ? mostCommon[0] : null,
      distribution: moodCounts,
    }
  }

  // Load moods on component mount
  useEffect(() => {
    loadMoods()
  }, [])

  const stats = getMoodStats()
  const currentMoodKey = getMoodFromSliderValue(sliderValue)
  const currentMoodInfo = moodTypes[currentMoodKey]

  if (loading) {
    return (
      <div className="mood-tracker-page">
        <div className="mood-tracker-loading">
          <div className="loading-spinner"></div>
          <p>Loading your mood data...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="mood-tracker-page">
      <div className="mood-tracker-container">
        {/* Header */}
        <header className="mood-tracker-header">
          <div className="mood-tracker-title">
            <Calendar className="mood-tracker-title-icon" />
            <h1>Mood Tracker</h1>
          </div>
          <p className="mood-tracker-subtitle">
            Track your daily mood and discover patterns in your emotional well-being
          </p>
        </header>

        {/* Today's Mood Section */}
        <section className="today-mood-section">
          <div className="today-mood-card">
            <h2>How are you feeling today?</h2>
            {todayMood ? (
              <div className="current-mood-display">
                <div className="current-mood-icon" style={{ backgroundColor: moodTypes[todayMood]?.color || "#gray" }}>
                  {moodTypes[todayMood]?.face || "😐"}
                </div>
                <div className="current-mood-info">
                  <h3>{moodTypes[todayMood]?.label || "Unknown"}</h3>
                  <p>{moodTypes[todayMood]?.description || "Mood description not available"}</p>
                  <button className="change-mood-btn" onClick={openTodayMoodSelector}>
                    Update mood
                  </button>
                </div>
              </div>
            ) : (
              <div className="no-mood-display">
                <p>You haven't logged your mood today yet.</p>
                <button className="log-mood-btn" onClick={openTodayMoodSelector}>
                  <Plus size={20} />
                  Log Today's Mood
                </button>
              </div>
            )}
          </div>
        </section>

        {/* Stats Section */}
        {stats && (
          <section className="mood-stats-section">
            <h2>Your Mood Insights</h2>
            <div className="mood-stats-grid">
              <div className="mood-stat-card">
                <TrendingUp className="mood-stat-icon" />
                <div className="mood-stat-content">
                  <h3>{stats.totalEntries}</h3>
                  <p>Days tracked</p>
                </div>
              </div>
              {stats.mostCommon && moodTypes[stats.mostCommon] && (
                <div className="mood-stat-card">
                  <div className="mood-stat-mood" style={{ backgroundColor: moodTypes[stats.mostCommon].color }}>
                    {moodTypes[stats.mostCommon].face}
                  </div>
                  <div className="mood-stat-content">
                    <h3>{moodTypes[stats.mostCommon].label}</h3>
                    <p>Most common mood</p>
                  </div>
                </div>
              )}
              <div className="mood-stat-card">
                <BarChart3 className="mood-stat-icon" />
                <div className="mood-stat-content">
                  <h3>{Math.round((stats.totalEntries / 30) * 100)}%</h3>
                  <p>Month completion</p>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Calendar Section */}
        <section className="calendar-section">
          <h2>Mood Calendar</h2>
          <MoodCalendar 
            moods={userMoods} 
            onMoodSelect={handleMoodSelectFromCalendar}
            onDateSelect={(date) => {
              setSelectedDate(date);
              // Check if this date already has a mood to set the slider appropriately
              const dateKey = `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
              const existingMood = userMoods[dateKey];
              if (existingMood && existingMood.mood) {
                setSliderValue(getSliderValueFromMood(existingMood.mood));
              } else {
                setSliderValue(50);
              }
              setShowMoodSelector(true);
            }}
          />
        </section>

        {showMoodSelector && (
          <div className="mood-selector-overlay">
            <div className="mood-selector-modal mobile-mood-interface">
              {/* Mobile-style header */}
              <div className="mobile-header">
                <button className="back-btn" onClick={() => setShowMoodSelector(false)}>
                  ←
                </button>
                <button className="save-btn" onClick={handleMoodSelect} disabled={saving}>
                  Save
                </button>
              </div>

              {/* Large mood display area */}
              <div className="large-mood-display">
                <div
                  className="mood-face-container"
                  style={{
                    background: `linear-gradient(135deg, ${currentMoodInfo.color}dd, ${currentMoodInfo.color})`,
                  }}
                >
                  <div className="mood-face">{currentMoodInfo.face}</div>
                </div>
              </div>

              {/* Elegant heading */}
              <div className="mood-selection-heading">
                <h2>Select your today's mood</h2>
              </div>

              {/* Selected date display */}
              <div className="mood-selector-date">
                {selectedDate.toDateString()}
              </div>

              {/* Equalizer-style slider */}
              <div className="equalizer-slider-container">
                <div className="equalizer-bars">
                  {Array.from({ length: 25 }, (_, i) => {
                    const position = (i / 24) * 100
                    const isActive = Math.abs(position - sliderValue) < 4
                    const height = Math.sin((i / 24) * Math.PI * 3) * 20 + 30

                    return (
                      <div
                        key={i}
                        className={`equalizer-bar ${isActive ? "active" : ""}`}
                        style={{
                          height: `${height}px`,
                          backgroundColor: isActive ? currentMoodInfo.color : "#333",
                        }}
                      />
                    )
                  })}
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={sliderValue}
                  onChange={(e) => setSliderValue(Number.parseInt(e.target.value))}
                  className="hidden-slider"
                />
              </div>

              {/* Mood category buttons */}
              <div className="mood-category-buttons">
                {Object.entries(moodTypes).map(([key, mood]) => {
                  const isSelected = key === currentMoodKey
                  return (
                    <button
                      key={key}
                      className={`mood-category-btn ${isSelected ? "selected" : ""}`}
                      style={{
                        backgroundColor: isSelected ? mood.color : "transparent",
                        color: isSelected ? "white" : "#666",
                      }}
                      onClick={() => setSliderValue(getSliderValueFromMood(key))}
                    >
                      {mood.label}
                    </button>
                  )
                })}
              </div>

              {saving && (
                <div className="mood-selector-saving">
                  <div className="loading-spinner small"></div>
                  Saving...
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default MoodTrackerPage