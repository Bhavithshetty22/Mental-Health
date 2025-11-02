// src/pages/MoodTracker.jsx
"use client"

import { useState, useEffect, useRef } from "react"
import { useNavigate } from "react-router-dom"
import { Calendar, TrendingUp, BarChart3, Plus, Sparkles, Activity, PieChart } from "lucide-react"
import { motion } from "framer-motion"
import "./MoodTracker.css"

const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:3000"

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
  const [moodImages, setMoodImages] = useState({})
  const [loadingImage, setLoadingImage] = useState(false)
  const [imageError, setImageError] = useState(null)
  const hasFetched = useRef(false)

  const moodTypes = {
    terrible: { 
      color: "#ef4444", 
      face: "😢", 
      label: "Terrible", 
      description: "Really struggling today", 
      range: [0, 20],
      value: 1
    },
    bad: { 
      color: "#f97316", 
      face: "😕", 
      label: "Bad", 
      description: "Not having a great day", 
      range: [20, 40],
      value: 2
    },
    okay: { 
      color: "#f59e0b", 
      face: "😐", 
      label: "Okay", 
      description: "Feeling neutral", 
      range: [40, 60],
      value: 3
    },
    good: { 
      color: "#3b82f6", 
      face: "😊", 
      label: "Good", 
      description: "Having a pleasant day", 
      range: [60, 80],
      value: 4
    },
    amazing: { 
      color: "#10b981", 
      face: "😄", 
      label: "Amazing", 
      description: "Feeling fantastic!", 
      range: [80, 100],
      value: 5
    },
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
    if (!mood || hasFetched.current) return null
    
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
      console.log("Loaded moods from API:", data)

      if (data.success) {
        setUserMoods(data.moods || {})
        hasFetched.current = true

        const todayKey = getTodayKey()
        const todayMoodData = data.moods?.[todayKey]
        if (todayMoodData) {
          const mood = typeof todayMoodData === 'string' ? todayMoodData : todayMoodData.mood
          setTodayMood(mood)
          setSliderValue(getSliderValueFromMood(mood))
          
          // Fetch image for today's mood
          await fetchMoodImage(mood)
        }
      }
    } catch (error) {
      console.error("Error loading moods:", error)
      hasFetched.current = false
    } finally {
      setLoading(false)
    }
  }

  // In MoodTracker.jsx, update the saveMood function:
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
      await fetchMoodImage(moodType)
      
      // ADD THIS: Emit custom event to notify DailyTasksTracker
      console.log('[MoodTracker] Emitting moodUpdated event')
      window.dispatchEvent(new CustomEvent('moodUpdated', { 
        detail: { mood: moodType, date: apiDate } 
      }))
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

  // Get mood trend data for line chart
  const getMoodTrendData = () => {
    console.log("=== GET MOOD TREND DATA ===")
    console.log("userMoods:", userMoods)
    
    const entries = Object.entries(userMoods)
      .map(([dateKey, moodData]) => {
        console.log(`Processing: ${dateKey}`, moodData)
        
        const [year, month, day] = dateKey.split('-').map(Number)
        const date = new Date(year, month - 1, day)
        const mood = typeof moodData === 'string' ? moodData : moodData?.mood
        
        console.log(`  -> Date: ${date}, Mood: ${mood}, Value: ${moodTypes[mood]?.value}`)
        
        return { date, mood, dateKey }
      })
      .filter(entry => entry.mood && moodTypes[entry.mood]) // Filter out invalid entries
      .sort((a, b) => a.date - b.date)
      .slice(-14) // Last 14 days
    
    console.log("Filtered entries:", entries)
    
    const chartData = entries.map(entry => ({
      date: entry.date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      value: moodTypes[entry.mood]?.value || 3,
      mood: entry.mood
    }))
    
    console.log("Final chart data:", chartData)
    return chartData
  }

  // Get mood distribution for donut chart
  const getMoodDistribution = () => {
    const stats = getMoodStats()
    if (!stats) return []
    
    return Object.entries(stats.distribution).map(([mood, count]) => ({
      mood,
      count,
      percentage: (count / stats.totalEntries) * 100,
      color: moodTypes[mood]?.color || '#999',
      label: moodTypes[mood]?.label || mood
    }))
  }

  // Get weekly average
  const getWeeklyAverage = () => {
    const now = new Date()
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    
    const weekMoods = Object.entries(userMoods)
      .filter(([dateKey]) => {
        const [year, month, day] = dateKey.split('-').map(Number)
        const date = new Date(year, month - 1, day)
        return date >= weekAgo && date <= now
      })
      .map(([, moodData]) => {
        const mood = typeof moodData === 'string' ? moodData : moodData?.mood
        return moodTypes[mood]?.value || 3
      })
    
    if (weekMoods.length === 0) return 0
    return (weekMoods.reduce((a, b) => a + b, 0) / weekMoods.length).toFixed(1)
  }

  useEffect(() => {
    const token = localStorage.getItem("token")
    if (!token) {
      navigate("/settings")
      return
    }
    loadMoods()
  }, [])

  // Debug effect
  useEffect(() => {
    console.log("=== MOOD DATA UPDATE ===")
    console.log("userMoods:", userMoods)
    console.log("Total entries:", Object.keys(userMoods).length)
  }, [userMoods])

  const stats = getMoodStats()
  const trendData = getMoodTrendData()
  const distributionData = getMoodDistribution()
  const weeklyAvg = getWeeklyAverage()
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
            <Sparkles className="mood-tracker-title-icon" />
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
          <>
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
                  <Activity className="mood-stat-icon" />
                  <div className="mood-stat-content">
                    <h3>{weeklyAvg}/5</h3>
                    <p>Weekly average</p>
                  </div>
                </div>
              </div>
            </section>

            {/* Mood Analysis Section */}
            <section className="mood-analysis-section">
              <h2>Mood Analysis</h2>
              
              {/* Mood Trend Chart */}
              {trendData.length > 0 ? (
                <div className="analysis-card">
                  <div className="analysis-card-header">
                    <Activity size={20} />
                    <h3>14-Day Mood Trend ({trendData.length} days)</h3>
                  </div>
                  
                  
                  
                  <div className="mood-trend-chart">
                    <svg width="100%" height="200" viewBox="0 0 600 200">
                      {/* Grid lines */}
                      {[1, 2, 3, 4, 5].map(i => (
                        <motion.line
                          key={i}
                          x1="40"
                          y1={160 - (i - 1) * 40}
                          x2="580"
                          y2={160 - (i - 1) * 40}
                          stroke="#e5e7eb"
                          strokeWidth="1"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ delay: i * 0.1 }}
                        />
                      ))}
                      
                      {/* Y-axis labels */}
                      {['😢', '😕', '😐', '😊', '😄'].map((emoji, i) => (
                        <text key={i} x="15" y={165 - i * 40} fontSize="16" fill="#6b7280">
                          {emoji}
                        </text>
                      ))}
                      
                      {/* Line path */}
                      {trendData.length > 1 && (
                        <motion.path
                          d={trendData.map((point, i) => {
                            const x = 60 + (i * (500 / Math.max(trendData.length - 1, 1)))
                            const y = 160 - ((point.value - 1) * 40)
                            return `${i === 0 ? 'M' : 'L'} ${x} ${y}`
                          }).join(' ')}
                          fill="none"
                          stroke="#6366f1"
                          strokeWidth="3"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          initial={{ pathLength: 0 }}
                          animate={{ pathLength: 1 }}
                          transition={{ duration: 1.5, ease: "easeInOut" }}
                        />
                      )}
                      
                      {/* Data points */}
                      {trendData.map((point, i) => {
                        const x = 60 + (i * (500 / Math.max(trendData.length - 1, 1)))
                        const y = 160 - ((point.value - 1) * 40)
                        return (
                          <motion.g key={i}>
                            <motion.circle
                              cx={x}
                              cy={y}
                              r="6"
                              fill={moodTypes[point.mood]?.color || '#999'}
                              stroke="white"
                              strokeWidth="2"
                              initial={{ scale: 0 }}
                              animate={{ scale: 1 }}
                              transition={{ delay: 0.5 + i * 0.05 }}
                            />
                            {(trendData.length <= 7 || i % 2 === 0) && (
                              <text
                                x={x}
                                y="185"
                                fontSize="10"
                                fill="#6b7280"
                                textAnchor="middle"
                              >
                                {point.date}
                              </text>
                            )}
                          </motion.g>
                        )
                      })}
                    </svg>
                  </div>
                </div>
              ) : (
                <div className="analysis-card">
                  <div className="analysis-card-header">
                    <Activity size={20} />
                    <h3>14-Day Mood Trend</h3>
                  </div>
                  <div style={{ padding: '40px', textAlign: 'center', color: '#6b7280' }}>
                    <p>Log at least 2 moods to see your trend chart</p>
                    <p style={{ fontSize: '12px', marginTop: '8px' }}>
                      Total moods logged: {Object.keys(userMoods).length}
                    </p>
                  </div>
                </div>
              )}

              {/* Mood Distribution */}
              {distributionData.length > 0 && (
                <div className="analysis-card">
                  <div className="analysis-card-header">
                    <PieChart size={20} />
                    <h3>Mood Distribution</h3>
                  </div>
                  <div className="mood-distribution">
                    <svg width="200" height="200" viewBox="0 0 200 200" className="donut-chart">
                      {(() => {
                        let currentAngle = -90
                        const radius = 70
                        const innerRadius = 45
                        
                        return distributionData.map((item, i) => {
                          const angle = (item.percentage / 100) * 360
                          const startAngle = currentAngle
                          const endAngle = currentAngle + angle
                          
                          const startRad = (startAngle * Math.PI) / 180
                          const endRad = (endAngle * Math.PI) / 180
                          
                          const x1 = 100 + radius * Math.cos(startRad)
                          const y1 = 100 + radius * Math.sin(startRad)
                          const x2 = 100 + radius * Math.cos(endRad)
                          const y2 = 100 + radius * Math.sin(endRad)
                          
                          const x3 = 100 + innerRadius * Math.cos(endRad)
                          const y3 = 100 + innerRadius * Math.sin(endRad)
                          const x4 = 100 + innerRadius * Math.cos(startRad)
                          const y4 = 100 + innerRadius * Math.sin(startRad)
                          
                          const largeArc = angle > 180 ? 1 : 0
                          
                          const pathData = [
                            `M ${x1} ${y1}`,
                            `A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2}`,
                            `L ${x3} ${y3}`,
                            `A ${innerRadius} ${innerRadius} 0 ${largeArc} 0 ${x4} ${y4}`,
                            'Z'
                          ].join(' ')
                          
                          currentAngle = endAngle
                          
                          return (
                            <motion.path
                              key={i}
                              d={pathData}
                              fill={item.color}
                              initial={{ opacity: 0, scale: 0 }}
                              animate={{ opacity: 1, scale: 1 }}
                              transition={{ delay: i * 0.1, duration: 0.5 }}
                            />
                          )
                        })
                      })()}
                      
                      {/* Center text */}
                      <text x="100" y="95" textAnchor="middle" fontSize="24" fontWeight="bold" fill="#374151">
                        {stats.totalEntries}
                      </text>
                      <text x="100" y="110" textAnchor="middle" fontSize="12" fill="#6b7280">
                        entries
                      </text>
                    </svg>
                    
                    <div className="distribution-legend">
                      {distributionData.map((item, i) => (
                        <motion.div
                          key={i}
                          className="legend-item"
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 0.5 + i * 0.1 }}
                        >
                          <div className="legend-color" style={{ backgroundColor: item.color }}></div>
                          <div className="legend-info">
                            <span className="legend-label">{item.label}</span>
                            <span className="legend-value">{item.count} ({item.percentage.toFixed(0)}%)</span>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Mood Frequency Bars */}
              {distributionData.length > 0 && (
                <div className="analysis-card">
                  <div className="analysis-card-header">
                    <BarChart3 size={20} />
                    <h3>Mood Frequency</h3>
                  </div>
                  <div className="frequency-bars">
                    {distributionData.sort((a, b) => b.count - a.count).map((item, i) => (
                      <div key={i} className="frequency-bar-item">
                        <div className="frequency-bar-label">
                          <span className="frequency-emoji" style={{ color: item.color }}>
                            {moodTypes[item.mood]?.face}
                          </span>
                          <span>{item.label}</span>
                        </div>
                        <div className="frequency-bar-track">
                          <motion.div
                            className="frequency-bar-fill"
                            style={{ backgroundColor: item.color }}
                            initial={{ width: 0 }}
                            animate={{ width: `${item.percentage}%` }}
                            transition={{ delay: i * 0.1, duration: 0.8, ease: "easeOut" }}
                          />
                        </div>
                        <div className="frequency-bar-count">{item.count}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </section>
          </>
        )}

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