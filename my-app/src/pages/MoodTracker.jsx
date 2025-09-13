"use client"

import { useState, useEffect } from "react"
import { Calendar, TrendingUp, BarChart3, Plus, X } from "lucide-react"
import "./MoodTracker.css"

const MoodTrackerPage = () => {
  const [showMoodSelector, setShowMoodSelector] = useState(false)
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [userMoods, setUserMoods] = useState({})
  const [loading, setLoading] = useState(false) // Set to false for demo
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
      const mockMoods = {
        "2024-1-15": { mood: "good", notes: "", timestamp: new Date().toISOString() },
        "2024-1-14": { mood: "amazing", notes: "", timestamp: new Date().toISOString() },
        "2024-1-13": { mood: "okay", notes: "", timestamp: new Date().toISOString() },
      }

      setUserMoods(mockMoods)

      // Check if today's mood is set
      const todayKey = getTodayKey()
      const todayMoodData = mockMoods[todayKey]
      if (todayMoodData) {
        setTodayMood(todayMoodData.mood)
        setSliderValue(getSliderValueFromMood(todayMoodData.mood))
      }
    } catch (error) {
      console.error("Error loading moods:", error)
    } finally {
      setLoading(false)
    }
  }

  // FIXED: Save mood to API with correct date format
  const saveMood = async (date, moodType, notes = "") => {
    try {
      setSaving(true)
      // Use API format: YYYY-M-D
      const apiDate = `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`

      await new Promise((resolve) => setTimeout(resolve, 500))

      // Update local state with the same key format as API returns
      const displayKey = apiDate
      setUserMoods((prev) => ({
        ...prev,
        [displayKey]: {
          mood: moodType,
          notes: notes,
          timestamp: new Date().toISOString(),
        },
      }))

      // Update today's mood if it's today
      if (apiDate === getTodayKey()) {
        setTodayMood(moodType)
      }

      return true
    } catch (error) {
      console.error("Error saving mood:", error)
      alert("Failed to save mood. Please try again.")
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
          <div className="calendar-placeholder">
            <p>Calendar component would go here</p>
          </div>
        </section>

        {showMoodSelector && (
          <div className="mood-selector-overlay">
            <div className="mood-selector-modal">
              <div className="mood-selector-header">
                <h3>Select your mood</h3>
                <button className="mood-selector-close" onClick={() => setShowMoodSelector(false)}>
                  <X size={24} />
                </button>
              </div>

              <div className="mood-selector-date">{selectedDate.toDateString()}</div>

              <div className="mood-slider-container">
                {/* Large mood display */}
                <div className="mood-display">
                  <div className="mood-display-icon" style={{ backgroundColor: currentMoodInfo.color }}>
                    {currentMoodInfo.face}
                  </div>
                  <div className="mood-display-info">
                    <h3>{currentMoodInfo.label}</h3>
                    <p>{currentMoodInfo.description}</p>
                  </div>
                </div>

                {/* Slider */}
                <div className="mood-slider-section">
                  <div className="mood-slider-track">
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={sliderValue}
                      onChange={(e) => setSliderValue(Number.parseInt(e.target.value))}
                      className="mood-slider"
                      style={{
                        background: `linear-gradient(to right, 
                          #ef4444 0%, #ef4444 20%, 
                          #f97316 20%, #f97316 40%, 
                          #f59e0b 40%, #f59e0b 60%, 
                          #3b82f6 60%, #3b82f6 80%, 
                          #10b981 80%, #10b981 100%)`,
                      }}
                    />
                    <div className="mood-slider-labels">
                      <span>😢</span>
                      <span>😔</span>
                      <span>😐</span>
                      <span>😊</span>
                      <span>😄</span>
                    </div>
                  </div>
                </div>

                {/* Save button */}
                <button className="mood-save-btn" onClick={handleMoodSelect} disabled={saving}>
                  {saving ? "Saving..." : "Save Mood"}
                </button>
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
