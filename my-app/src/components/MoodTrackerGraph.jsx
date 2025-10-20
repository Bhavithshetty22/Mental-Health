import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

const MoodTrackerGraph = ({ userMoods = {}, viewType = 'weekly' }) => {
  const [hoveredPoint, setHoveredPoint] = useState(null);
  const [showGraph, setShowGraph] = useState(false);
  const [moodData, setMoodData] = useState([]);

  // Memoize userMoods to prevent unnecessary re-renders
  const memoizedUserMoods = useMemo(() => userMoods, [JSON.stringify(userMoods)]);

  // Process data based on viewType and userMoods from database
  useEffect(() => {
    setShowGraph(false);
    const processedData = processUserMoods(memoizedUserMoods, viewType);
    setMoodData(processedData);
    
    const timer = setTimeout(() => setShowGraph(true), 100);
    return () => clearTimeout(timer);
  }, [memoizedUserMoods, viewType]);

  // Mood configuration
  const moodConfig = {
    terrible: { value: 1, label: 'Terrible', color: '#EF4444' },
    bad: { value: 2, label: 'Bad', color: '#FB923C' },
    okay: { value: 3, label: 'Okay', color: '#FCD34D' },
    good: { value: 4, label: 'Good', color: '#A3E635' },
    amazing: { value: 5, label: 'Amazing', color: '#22C55E' }
  };

  // Convert mood string to numeric value
  const getMoodValue = (moodType) => {
    return moodConfig[moodType]?.value || 3;
  };

  const getMoodLabel = (moodType) => {
    return moodConfig[moodType]?.label || 'Unknown';
  };

  const getMoodColor = (moodType) => {
    return moodConfig[moodType]?.color || '#FCD34D';
  };

  // Process user moods from database
  const processUserMoods = (moods, view) => {
    if (!moods || Object.keys(moods).length === 0) {
      return getEmptyData(view);
    }

    const moodEntries = Object.entries(moods).map(([dateStr, data]) => {
      const moodType = typeof data === 'string' ? data : data?.mood;
      return {
        dateStr,
        date: new Date(dateStr),
        mood: moodType,
        value: getMoodValue(moodType),
        label: getMoodLabel(moodType),
        color: getMoodColor(moodType)
      };
    }).sort((a, b) => a.date - b.date);

    if (view === 'weekly') {
      return getLastNDays(moodEntries, 7);
    } else if (view === 'monthly') {
      return getLastNDays(moodEntries, 30);
    }
    return moodEntries;
  };

  // Get last N days with proper day labels
  const getLastNDays = (entries, days) => {
    const result = [];
    const today = new Date();

    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateStr = `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;

      const entry = entries.find(e => e.dateStr === dateStr);
      const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

      if (entry) {
        result.push({
          ...entry,
          day: dayNames[date.getDay()]
        });
      } else {
        result.push({
          dateStr,
          date,
          mood: null,
          value: null,
          label: 'No data',
          color: '#CBD5E1',
          day: dayNames[date.getDay()]
        });
      }
    }

    return result;
  };

  // Return empty data for the specified view
  const getEmptyData = (view) => {
    const days = view === 'weekly' ? 7 : 30;
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const data = [];

    for (let i = days - 1; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      data.push({
        day: dayNames[date.getDay()],
        mood: null,
        value: null,
        label: 'No data',
        color: '#CBD5E1'
      });
    }

    return data;
  };

  // Calculate trend
  const calculateTrend = () => {
    const validMoods = moodData.filter(d => d.value !== null);
    if (validMoods.length < 1) return 'stable';
    if (validMoods.length === 1) return 'stable';

    const firstHalf = validMoods.slice(0, Math.ceil(validMoods.length / 2));
    const secondHalf = validMoods.slice(Math.ceil(validMoods.length / 2));

    if (firstHalf.length === 0 || secondHalf.length === 0) return 'stable';

    const firstAvg = firstHalf.reduce((sum, d) => sum + d.value, 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((sum, d) => sum + d.value, 0) / secondHalf.length;

    const difference = secondAvg - firstAvg;
    
    // More sensitive threshold: 0.1 instead of 0.2
    if (Math.abs(difference) < 0.1) return 'stable';
    return secondAvg > firstAvg ? 'up' : 'down';
  };

  // Calculate stats
  const calculateStats = () => {
    const validMoods = moodData.filter(d => d.value !== null);
    if (validMoods.length === 0) return { avg: 0, goodDays: 0 };

    const avg = validMoods.reduce((sum, d) => sum + d.value, 0) / validMoods.length;
    const goodDays = validMoods.filter(d => d.value >= 4).length;

    return { avg, goodDays };
  };

  // SVG dimensions
  const width = 600;
  const height = 300;
  const padding = { top: 40, right: 40, bottom: 50, left: 50 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  // Calculate points for the line
  const points = moodData.length > 0 ? moodData.map((data, index) => {
    const x = padding.left + (index * chartWidth) / (Math.max(moodData.length - 1, 1));
    const yVal = data.value !== null ? data.value : 3;
    const y = padding.top + chartHeight - (yVal / 5) * chartHeight;
    return { x, y, ...data };
  }) : [];

  // Create SVG path string
  const linePath = points.length > 0 ? points.map((point, index) => {
    if (index === 0) return `M ${point.x} ${point.y}`;
    const prevPoint = points[index - 1];
    const cpx1 = prevPoint.x + (point.x - prevPoint.x) / 2;
    const cpy1 = prevPoint.y;
    const cpx2 = prevPoint.x + (point.x - prevPoint.x) / 2;
    const cpy2 = point.y;
    return `C ${cpx1} ${cpy1}, ${cpx2} ${cpy2}, ${point.x} ${point.y}`;
  }).join(' ') : '';

  // Create gradient area path
  const areaPath = points.length > 0 ? `${linePath} L ${points[points.length - 1].x} ${height - padding.bottom} L ${padding.left} ${height - padding.bottom} Z` : '';

  const trend = calculateTrend();
  const stats = calculateStats();

  const getTrendIcon = () => {
    if (trend === 'up') return <TrendingUp size={20} color="#22C55E" />;
    if (trend === 'down') return <TrendingDown size={20} color="#EF4444" />;
    return <Minus size={20} color="#FCD34D" />;
  };

  const getTrendText = () => {
    if (trend === 'up') return { text: 'Improving', color: '#22C55E' };
    if (trend === 'down') return { text: 'Declining', color: '#EF4444' };
    return { text: 'Stable', color: '#FCD34D' };
  };

  return (
    <div style={{
      borderRadius: '16px',
      padding: '24px',
   
      position: 'relative'
    }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '20px'
      }}>
        <div>
          <h3 style={{
            margin: '0 0 8px 0',
            fontSize: '18px',
            fontWeight: '600',
            color: '#1e293b'
          }}>
            {viewType === 'weekly' ? 'Weekly' : 'Monthly'} Mood Trend
          </h3>
          <p style={{
            margin: 0,
            fontSize: '14px',
            color: '#64748b'
          }}>
            Your emotional journey
          </p>
        </div>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '8px 16px',
          backgroundColor: trend === 'up' ? '#DCFCE7' : trend === 'down' ? '#FEE2E2' : '#FEF3C7',
          borderRadius: '20px'
        }}>
          {getTrendIcon()}
          <span style={{
            fontSize: '14px',
            fontWeight: '600',
            color: getTrendText().color
          }}>
            {getTrendText().text}
          </span>
        </div>
      </div>

      {/* Graph */}
      {moodData.length > 0 ? (
        <>
          <svg
            width="100%"
            height={height}
            viewBox={`0 0 ${width} ${height}`}
            style={{ overflow: 'visible' }}
          >
            {/* Grid lines */}
            {[0, 1, 2, 3, 4, 5].map((level) => (
              <motion.line
                key={level}
                x1={padding.left}
                y1={padding.top + chartHeight - (level / 5) * chartHeight}
                x2={width - padding.right}
                y2={padding.top + chartHeight - (level / 5) * chartHeight}
                stroke="#f1f5f9"
                strokeWidth="1"
                initial={{ opacity: 0 }}
                animate={{ opacity: showGraph ? 0.5 : 0 }}
                transition={{ delay: level * 0.1 }}
              />
            ))}

            {/* Y-axis labels */}
            {['Terrible', 'Bad', 'Okay', 'Good', 'Amazing'].map((label, index) => (
              <motion.text
                key={label}
                x={padding.left - 10}
                y={padding.top + chartHeight - (index / 4) * chartHeight + 5}
                textAnchor="end"
                fontSize="11"
                fill="#94a3b8"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: showGraph ? 1 : 0, x: 0 }}
                transition={{ delay: 0.2 + index * 0.05 }}
              >
                {label}
              </motion.text>
            ))}

            {/* Gradient definition */}
            <defs>
              <linearGradient id="moodGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#6B9080" stopOpacity="0.3" />
                <stop offset="100%" stopColor="#6B9080" stopOpacity="0.05" />
              </linearGradient>
            </defs>

            {/* Area under the line */}
            <motion.path
              d={areaPath}
              fill="url(#moodGradient)"
              initial={{ opacity: 0 }}
              animate={{ opacity: showGraph ? 1 : 0 }}
              transition={{ duration: 0.8, delay: 0.3 }}
            />

            {/* Animated line */}
            <motion.path
              d={linePath}
              fill="none"
              stroke="#6B9080"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: showGraph ? 1 : 0 }}
              transition={{ duration: 1.5, ease: "easeInOut" }}
            />

            {/* Data points */}
            {points.map((point, index) => (
              <g key={index}>
                <motion.circle
                  cx={point.x}
                  cy={point.y}
                  r={hoveredPoint === index ? 8 : 6}
                  fill={point.value ? 'white' : '#f1f5f9'}
                  stroke={point.color}
                  strokeWidth="3"
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{
                    scale: showGraph ? 1 : 0,
                    opacity: showGraph ? 1 : 0
                  }}
                  transition={{
                    delay: 0.5 + index * 0.1,
                    type: "spring",
                    stiffness: 200,
                    damping: 10
                  }}
                  onMouseEnter={() => setHoveredPoint(index)}
                  onMouseLeave={() => setHoveredPoint(null)}
                  style={{ cursor: 'pointer' }}
                  whileHover={{ scale: 1.3 }}
                />

                {/* Hover tooltip */}
                {hoveredPoint === index && point.value && (
                  <motion.g
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <rect
                      x={point.x - 35}
                      y={point.y - 50}
                      width="70"
                      height="36"
                      rx="8"
                      fill="#1e293b"
                      filter="drop-shadow(0 4px 6px rgba(0,0,0,0.1))"
                    />
                    <text
                      x={point.x}
                      y={point.y - 35}
                      textAnchor="middle"
                      fontSize="12"
                      fontWeight="600"
                      fill="white"
                    >
                      {point.label}
                    </text>
                    <text
                      x={point.x}
                      y={point.y - 20}
                      textAnchor="middle"
                      fontSize="10"
                      fill="#94a3b8"
                    >
                      {point.day}
                    </text>
                  </motion.g>
                )}

                {/* Day labels */}
                <motion.text
                  x={point.x}
                  y={height - padding.bottom + 25}
                  textAnchor="middle"
                  fontSize="12"
                  fontWeight={hoveredPoint === index ? "600" : "400"}
                  fill={hoveredPoint === index ? "#1e293b" : "#64748b"}
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: showGraph ? 1 : 0, y: 0 }}
                  transition={{ delay: 0.5 + index * 0.1 }}
                >
                  {point.day}
                </motion.text>
              </g>
            ))}
          </svg>

          {/* Mood Scale Legend */}
          <div style={{
            display: 'flex',
            justifyContent: 'center',
            gap: '16px',
            marginTop: '20px',
            paddingTop: '20px',
            borderTop: '1px solid #f1f5f9',
            flexWrap: 'wrap'
          }}>
            {[
              { label: 'Amazing', color: '#22C55E' },
              { label: 'Good', color: '#A3E635' },
              { label: 'Okay', color: '#FCD34D' },
              { label: 'Bad', color: '#FB923C' },
              { label: 'Terrible', color: '#EF4444' }
            ].map((mood, index) => (
              <motion.div
                key={mood.label}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 1 + index * 0.1 }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <div style={{
                  width: '12px',
                  height: '12px',
                  borderRadius: '50%',
                  backgroundColor: mood.color
                }} />
                <span style={{
                  fontSize: '12px',
                  color: '#64748b',
                  fontWeight: '500'
                }}>
                  {mood.label}
                </span>
              </motion.div>
            ))}
          </div>

          {/* Stats */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-around',
            marginTop: '24px',
            padding: '16px',
            backgroundColor: '#f8fafc',
            borderRadius: '12px'
          }}>
            <div style={{ textAlign: 'center' }}>
              <p style={{
                margin: '0 0 4px 0',
                fontSize: '24px',
                fontWeight: '700',
                color: '#1e293b'
              }}>
                {stats.avg.toFixed(1)}
              </p>
              <p style={{
                margin: 0,
                fontSize: '12px',
                color: '#64748b',
                fontWeight: '500'
              }}>
                Avg Mood
              </p>
            </div>
            <div style={{ textAlign: 'center' }}>
              <p style={{
                margin: '0 0 4px 0',
                fontSize: '24px',
                fontWeight: '700',
                color: '#22C55E'
              }}>
                {stats.goodDays}
              </p>
              <p style={{
                margin: 0,
                fontSize: '12px',
                color: '#64748b',
                fontWeight: '500'
              }}>
                Good Days
              </p>
            </div>
            <div style={{ textAlign: 'center' }}>
              <p style={{
                margin: '0 0 4px 0',
                fontSize: '24px',
                fontWeight: '700',
                color: '#1e293b'
              }}>
                {moodData.filter(d => d.value !== null).length}
              </p>
              <p style={{
                margin: 0,
                fontSize: '12px',
                color: '#64748b',
                fontWeight: '500'
              }}>
                Days Tracked
              </p>
            </div>
          </div>
        </>
      ) : (
        <div style={{
          textAlign: 'center',
          padding: '40px 20px',
          color: '#94a3b8'
        }}>
          <p>No mood data available yet. Start tracking your mood to see the graph!</p>
        </div>
      )}
    </div>
  );
};

export default MoodTrackerGraph;