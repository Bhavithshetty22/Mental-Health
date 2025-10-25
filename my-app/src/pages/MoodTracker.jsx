// src/pages/MoodTracker.jsx
"use client"

import { useState, useEffect, useRef } from "react"
import { useNavigate } from "react-router-dom"
import { Calendar, TrendingUp, BarChart3, Plus } from "lucide-react"
import MoodCalendar from '../components/MoodCalendar'
import MoodTrackerGraph from '../components/MoodTrackerGraph'
import "./MoodTracker.css"

const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:5000"

const MoodTrackerPage = () => {
  const navigate = useNavigate()
  const [showMoodSelector, setShowMoodSelector] = useState(false)
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [userMoods, setUserMoods] = useState({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [todayMood, setTodayMood] = useState(null)
  const [sliderValue, setSliderValue] = useState(50)
  const [viewType, setViewType] = useState('weekly')
  const [moodImages, setMoodImages] = useState({}) // Store mood images
  const [loadingImage, setLoadingImage] = useState(false) // Image loading state
  const [imageError, setImageError] = useState(null) // Track image errors
  const hasFetched = useRef(false)

  const moodTypes = {
    terrible: { color: "#ef4444", face: "😢", label: "Terrible", description: "Really struggling today", range: [0, 20] },
    bad:     { color: "#f97316", face: "😕", label: "Bad",     description: "Not having a great day",    range: [20, 40] },
    okay:    { color: "#f59e0b", face: "😐", label: "Okay",    description: "Feeling neutral",           range: [40, 60] },
    good:    { color: "#3b82f6", face: "😊", label: "Good",    description: "Having a pleasant day",     range: [60, 80] },
    amazing: { color: "#10b981", face: "😄", label: "Amazing", description: "Feeling fantastic!",        range: [80, 100] },
  }

  const getMoodFromSliderValue = (value) => {
    for (const [key, mood] of Object.entries(moodTypes)) {
      if (value >= mood.range[0] && value < mood.range[1]) return key
    }
    return "amazing"
  }

  const getSliderValueFromMood = (moodKey) => {
    const mood = moodTypes[moodKey]
    if (mood) return (mood.range[0] + mood.range[1]) / 2
    return 50
  }

  const getTodayKey = () => {
    const today = new Date()
    return `${today.getFullYear()}-${today.getMonth() + 1}-${today.getDate()}`
  }

  const getTokenOrRedirect = () => {
    const token = localStorage.getItem("token")
    if (!token) {
      navigate("/settings")
      return null
    }
    return token
  }

  // Fetch mood image from API with better error handling
  const fetchMoodImage = async (mood) => {
    try {
      setLoadingImage(true)
      setImageError(null)
      const token = getTokenOrRedirect()
      if (!token) return null

      console.log(`Fetching image for mood: ${mood}`)

      const response = await fetch(`${API_BASE}/api/mood-tracker/image/${mood}`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        console.error("Failed to fetch mood image:", {
          status: response.status,
          error: errorData
        })
        
        if (response.status === 401 || response.status === 403) {
          console.log("Authentication error - might need to re-login")
        } else if (response.status === 500) {
          setImageError("Image generation service temporarily unavailable")
        }
        return null
      }

      const data = await response.json()
      console.log("Image fetch response:", data)

      if (data.success && data.imageUrl) {
        console.log(`Got image for ${mood}, cached: ${data.cached}`)
        setMoodImages(prev => ({
          ...prev,
          [mood]: data.imageUrl
        }))
        return data.imageUrl
      } else {
        console.error("Invalid response format:", data)
        setImageError("Failed to load mood image")
      }
    } catch (error) {
      console.error("Error fetching mood image:", error)
      setImageError("Network error loading image")
    } finally {
      setLoadingImage(false)
    }
    return null
  }

  const loadMoods = async (forceRefresh = false) => {
    if (hasFetched.current && !forceRefresh) return
    hasFetched.current = true

    try {
      setLoading(true)
      const token = localStorage.getItem("token")
      if (!token) {
        navigate("/settings")
        return
      }

      const response = await fetch(`${API_BASE}/api/moods`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      })

      if (response.status === 401 || response.status === 403) {
        console.warn("Not authenticated - redirecting to login")
        localStorage.removeItem("token")
        localStorage.removeItem("user")
        navigate("/settings")
        return
      }

      if (!response.ok) {
        const err = await response.text()
        console.error("Failed to load moods:", response.status, err)
        return
      }

      const data = await response.json()
      console.log("API Response:", data)

      if (data.success) {
        setUserMoods(data.moods || {})

        const todayKey = getTodayKey()
        const todayMoodData = data.moods?.[todayKey]
        if (todayMoodData) {
          setTodayMood(todayMoodData.mood)
          setSliderValue(getSliderValueFromMood(todayMoodData.mood))
          
          // Fetch image for today's mood
          await fetchMoodImage(todayMoodData.mood)
        }
      }
    } catch (error) {
      console.error("Error loading moods:", error)
      hasFetched.current = false
    } finally {
      setLoading(false)
    }
  }

  const handleRefreshMoods = () => {
    hasFetched.current = false
    loadMoods(true)
  }

  const saveMood = async (date, moodType, notes = "") => {
    try {
      setSaving(true)
      const token = getTokenOrRedirect()
      if (!token) return false

      const apiDate = `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`

      const response = await fetch(`${API_BASE}/api/moods`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          date: apiDate,
          mood: moodType,
          notes: notes,
        }),
      })

      if (response.status === 401 || response.status === 403) {
        alert("You must be signed in to save moods. Redirecting to login...")
        localStorage.removeItem("token")
        localStorage.removeItem("user")
        navigate("/settings")
        return false
      }

      if (!response.ok) {
        const errJson = await response.json().catch(() => null)
        console.error("Save error:", errJson || "unknown")
        throw new Error(errJson?.error || "Failed to save mood")
      }

      const result = await response.json()
      console.log("Save result:", result)

      const displayKey = apiDate
      setUserMoods((prev) => ({
        ...prev,
        [displayKey]: {
          mood: moodType,
          notes,
          timestamp: new Date().toISOString(),
        },
      }))

      if (apiDate === getTodayKey()) {
        setTodayMood(moodType)
        // Fetch image when mood is saved
        await fetchMoodImage(moodType)
      }

      await loadMoods(true)
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
    if (success) setShowMoodSelector(false)
  }

  const handleMoodSelectFromCalendar = async (moodType) => {
    const success = await saveMood(selectedDate, moodType)
    if (success) setShowMoodSelector(false)
  }

  const openTodayMoodSelector = () => {
    setSelectedDate(new Date())
    if (todayMood) setSliderValue(getSliderValueFromMood(todayMood))
    else setSliderValue(50)
    setShowMoodSelector(true)
  }

  const getMoodStats = () => {
    const moodEntries = Object.values(userMoods)
    const totalEntries = moodEntries.length
    if (totalEntries === 0) return null
    const moodCounts = {}
    moodEntries.forEach((entry) => {
      const mood = typeof entry === "string" ? entry : entry?.mood
      if (mood) moodCounts[mood] = (moodCounts[mood] || 0) + 1
    })
    const mostCommon = Object.entries(moodCounts).sort(([, a], [, b]) => b - a)[0]
    return {
      totalEntries,
      mostCommon: mostCommon ? mostCommon[0] : null,
      distribution: moodCounts,
    }
  }

  useEffect(() => {
    const token = localStorage.getItem("token")
    if (!token) {
      navigate("/settings")
      return
    }
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
        <header className="mood-tracker-header">
          <div className="mood-tracker-title">
            <Calendar className="mood-tracker-title-icon" />
            <h1>Mood Tracker</h1>
          </div>
          <p className="mood-tracker-subtitle">
            Track your daily mood and discover patterns in your emotional well-being
          </p>
        </header>

        <section className="today-mood-section">
          <div className="today-mood-card">
            <h2>How are you feeling today?</h2>
            {todayMood ? (
              <div className="current-mood-display">
                {/* Display mood image or fallback */}
                {loadingImage ? (
                  <div className="current-mood-icon" style={{ backgroundColor: moodTypes[todayMood]?.color || "#999" }}>
                    <div className="loading-spinner small"></div>
                  </div>
                ) : moodImages[todayMood] ? (
                  <div className="current-mood-image-container">
                    <img 
                      src={moodImages[todayMood]} 
                      alt={`${todayMood} mood`}
                      className="current-mood-image"
                      style={{ 
                        width: '120px', 
                        height: '120px', 
                        borderRadius: '20px',
                        objectFit: 'cover',
                        border: `3px solid ${moodTypes[todayMood]?.color}`
                      }}
                      onError={(e) => {
                        console.error("Image failed to load")
                        e.target.style.display = 'none'
                        setImageError("Image load failed")
                      }}
                    />
                  </div>
                ) : (
                  <div className="current-mood-icon" style={{ backgroundColor: moodTypes[todayMood]?.color || "#999" }}>
                    {moodTypes[todayMood]?.face || "😐"}
                  </div>
                )}
                {imageError && (
                  <div style={{ fontSize: '12px', color: '#ef4444', marginTop: '8px' }}>
                    {imageError}
                  </div>
                )}
                <div className="current-mood-info">
                  <h3>{moodTypes[todayMood]?.label || "Unknown"}</h3>
                  <p>{moodTypes[todayMood]?.description || "Mood description not available"}</p>
                  <button className="change-mood-btn" onClick={openTodayMoodSelector}>Update mood</button>
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

        <section className="mood-graph-section" style={{ marginBottom: '32px' }}>
          <div style={{ marginBottom: '16px', display: 'flex', gap: '8px' }}>
            <button 
              style={{
                padding: '6px 12px',
                borderRadius: '8px',
                border: '1px solid #6B9080',
                backgroundColor: viewType === 'weekly' ? '#6B9080' : 'white',
                color: viewType === 'weekly' ? 'white' : '#64748b',
                fontSize: '13px',
                fontWeight: '500',
                cursor: 'pointer'
              }}
              onClick={() => setViewType('weekly')}
            >
              Weekly
            </button>
            <button 
              style={{
                padding: '6px 12px',
                borderRadius: '8px',
                border: '1px solid #e2e8f0',
                backgroundColor: viewType === 'monthly' ? '#6B9080' : 'white',
                color: viewType === 'monthly' ? 'white' : '#64748b',
                fontSize: '13px',
                fontWeight: '500',
                cursor: 'pointer'
              }}
              onClick={() => setViewType('monthly')}
            >
              Monthly
            </button>
          </div>
          <MoodTrackerGraph 
            userMoods={userMoods} 
            viewType={viewType}
          />
        </section>

        <section className="calendar-section">
          <h2>Mood Calendar</h2>
          <MoodCalendar
            moods={userMoods}
            onMoodSelect={handleMoodSelectFromCalendar}
            onDateSelect={(date) => {
              setSelectedDate(date)
              const dateKey = `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`
              const existingMood = userMoods[dateKey]
              if (existingMood && existingMood.mood) setSliderValue(getSliderValueFromMood(existingMood.mood))
              else setSliderValue(50)
              setShowMoodSelector(true)
            }}
            onRefresh={handleRefreshMoods}
          />
        </section>

        {showMoodSelector && (
          <div className="mood-selector-overlay">
            <div className="mood-selector-modal mobile-mood-interface">
              <div className="mobile-header">
                <button className="back-btn" onClick={() => setShowMoodSelector(false)}>←</button>
                <button className="save-btn" onClick={handleMoodSelect} disabled={saving}>Save</button>
              </div>

              <div className="large-mood-display">
                <div
                  className="mood-face-container"
                  style={{ background: `linear-gradient(135deg, ${currentMoodInfo.color}dd, ${currentMoodInfo.color})` }}
                >
                  <div className="mood-face">{currentMoodInfo.face}</div>
                </div>
              </div>

              <div className="mood-selection-heading">
                <h2>Select your today's mood</h2>
              </div>

              <div className="mood-selector-date">{selectedDate.toDateString()}</div>

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
                        style={{ height: `${height}px`, backgroundColor: isActive ? currentMoodInfo.color : "#333" }}
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

              <div className="mood-category-buttons">
                {Object.entries(moodTypes).map(([key, mood]) => {
                  const isSelected = key === currentMoodKey
                  return (
                    <button
                      key={key}
                      className={`mood-category-btn ${isSelected ? "selected" : ""}`}
                      style={{ backgroundColor: isSelected ? mood.color : "transparent", color: isSelected ? "white" : "#666" }}
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