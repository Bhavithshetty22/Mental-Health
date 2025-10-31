import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, CheckCircle, Circle, Sparkles } from 'lucide-react';

const TaskCompletionTracker = ({ onRefresh }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [tasks, setTasks] = useState([
    { id: 'mood', name: 'Mood Tracker', completed: false, icon: '😊', color: '#3b82f6' },
    { id: 'journal', name: 'Daily Journal', completed: false, icon: '📝', color: '#8b5cf6' },
    { id: 'future', name: 'Talk to Future Self', completed: false, icon: '💭', color: '#ec4899' }
  ]);

  const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:5000";

  useEffect(() => {
    checkTasksCompletion();
    
    // Set up polling to check for updates every 2 seconds for faster updates
    const interval = setInterval(() => {
      checkTasksCompletion();
    }, 2000);
    
    // Listen for storage events (when other tabs update)
    const handleStorageChange = () => {
      console.log('📢 Storage change detected, refreshing tasks...');
      checkTasksCompletion();
    };
    
    window.addEventListener('storage', handleStorageChange);
    
    // Listen for custom events from other components
    const handleTaskComplete = (event) => {
      console.log('📢 Task completion event received:', event.type);
      setTimeout(() => checkTasksCompletion(), 100); // Small delay to ensure data is saved
    };
    
    window.addEventListener('taskCompleted', handleTaskComplete);
    window.addEventListener('moodSaved', handleTaskComplete);
    window.addEventListener('journalSaved', handleTaskComplete);
    window.addEventListener('letterSaved', handleTaskComplete);
    
    return () => {
      clearInterval(interval);
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('taskCompleted', handleTaskComplete);
      window.removeEventListener('moodSaved', handleTaskComplete);
      window.removeEventListener('journalSaved', handleTaskComplete);
      window.removeEventListener('letterSaved', handleTaskComplete);
    };
  }, []);

  const checkTasksCompletion = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        console.log('⚠️ No auth token found');
        return;
      }

      const today = new Date();
      const todayStr = today.toISOString().split('T')[0]; // "2025-01-15"
      const [year, month, day] = todayStr.split('-');
      
      // All possible date formats
      const dateKey1 = `${year}-${parseInt(month, 10)}-${parseInt(day, 10)}`; // "2025-1-15"
      const dateKey2 = todayStr; // "2025-01-15"

      console.log('🔄 Checking tasks for:', { dateKey1, dateKey2 });

      // Check mood tracker
      let moodCompleted = false;
      try {
        const moodResponse = await fetch(`${API_BASE}/api/moods`, {
          headers: { 
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        
        if (moodResponse.ok) {
          const moodData = await moodResponse.json();
          
          if (moodData.success && moodData.moods) {
            // Check both date formats
            const foundKey = Object.keys(moodData.moods).find(key => {
              return key === dateKey1 || key === dateKey2;
            });
            
            moodCompleted = !!foundKey;
            
            console.log('😊 Mood check:', {
              foundKey,
              completed: moodCompleted,
              availableKeys: Object.keys(moodData.moods)
            });
          }
        } else {
          console.error('❌ Mood API error:', moodResponse.status);
        }
      } catch (err) {
        console.error('❌ Error checking mood:', err);
      }

      // Check daily journal
      let journalCompleted = false;
      try {
        const storageKeys = ['journalEntries', 'dailyJournal', 'journal', 'journals'];
        
        for (const key of storageKeys) {
          const data = JSON.parse(localStorage.getItem(key) || '{}');
          if (data[todayStr] || data[dateKey1]) {
            journalCompleted = true;
            console.log('📝 Journal found in:', key);
            break;
          }
        }
        
        console.log('📝 Journal completed:', journalCompleted);
      } catch (err) {
        console.error('❌ Error checking journal:', err);
      }

      // Check talk to future self
      let futureCompleted = false;
      try {
        const letterKeys = ['futureLetters', 'letters', 'savedLetters'];
        let allLetters = [];
        
        for (const key of letterKeys) {
          const data = JSON.parse(localStorage.getItem(key) || '[]');
          if (Array.isArray(data)) {
            allLetters = [...allLetters, ...data];
          }
        }
        
        const todayLetters = allLetters.filter(letter => {
          if (!letter) return false;
          const letterDate = letter.createdAt || letter.timestamp || letter.date;
          if (!letterDate) return false;
          
          try {
            const date = new Date(letterDate).toISOString().split('T')[0];
            return date === todayStr;
          } catch {
            return false;
          }
        });
        
        futureCompleted = todayLetters.length > 0;
        console.log('💭 Future letters:', {
          total: allLetters.length,
          today: todayLetters.length,
          completed: futureCompleted
        });
      } catch (err) {
        console.error('❌ Error checking future letters:', err);
      }

      // Update tasks state
      setTasks(prev => [
        { ...prev[0], completed: moodCompleted },
        { ...prev[1], completed: journalCompleted },
        { ...prev[2], completed: futureCompleted }
      ]);

      console.log('✅ Task status updated:', {
        mood: moodCompleted,
        journal: journalCompleted,
        future: futureCompleted,
        total: [moodCompleted, journalCompleted, futureCompleted].filter(Boolean).length
      });

    } catch (error) {
      console.error('❌ Fatal error in task check:', error);
    }
  };

  const completedCount = tasks.filter(t => t.completed).length;
  const totalTasks = tasks.length;
  const progress = (completedCount / totalTasks) * 100;
  const allCompleted = completedCount === totalTasks;

  const nextSlide = () => {
    setCurrentIndex((prev) => (prev + 1) % tasks.length);
  };

  const prevSlide = () => {
    setCurrentIndex((prev) => (prev - 1 + tasks.length) % tasks.length);
  };

  const goToSlide = (index) => {
    setCurrentIndex(index);
  };

  const currentTask = tasks[currentIndex];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      style={{
        background: allCompleted 
          ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
          : 'linear-gradient(135deg, #f5f7fa 0%, #e2e8f0 100%)',
        borderRadius: '24px',
        padding: '28px',
        boxShadow: '0 20px 40px rgba(0,0,0,0.12)',
        position: 'relative',
        overflow: 'hidden',
        minHeight: '240px',
        transition: 'all 0.5s ease'
      }}
    >
      {/* Background Pattern */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        opacity: 0.05,
        backgroundImage: 'radial-gradient(circle, currentColor 2px, transparent 2px)',
        backgroundSize: '24px 24px',
        pointerEvents: 'none'
      }} />

      <AnimatePresence mode="wait">
        {allCompleted ? (
          <motion.div
            key="completed-celebration"
            initial={{ opacity: 0, scale: 0.8, rotateY: -90 }}
            animate={{ opacity: 1, scale: 1, rotateY: 0 }}
            exit={{ opacity: 0, scale: 0.8, rotateY: 90 }}
            transition={{ duration: 0.6, type: "spring" }}
            style={{
              textAlign: 'center',
              padding: '20px',
              position: 'relative',
              zIndex: 1
            }}
          >
            <motion.div
              animate={{ 
                rotate: [0, 15, -15, 15, 0],
                scale: [1, 1.2, 1, 1.2, 1]
              }}
              transition={{ 
                duration: 2,
                repeat: Infinity,
                repeatDelay: 1
              }}
              style={{ fontSize: '80px', marginBottom: '16px' }}
            >
              🎉
            </motion.div>
            
            <h2 style={{ 
              color: '#fff', 
              fontSize: '28px', 
              fontWeight: '800',
              margin: '0 0 12px 0',
              textShadow: '0 2px 10px rgba(0,0,0,0.2)'
            }}>
              All Tasks Complete!
            </h2>
            
            <p style={{ 
              color: 'rgba(255,255,255,0.95)', 
              fontSize: '16px',
              margin: '0 0 20px 0',
              fontWeight: '500'
            }}>
              You're crushing your wellness goals today! 🌟
            </p>

            {/* Completion Badge */}
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.3, type: "spring", stiffness: 200 }}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                background: 'rgba(255,255,255,0.25)',
                padding: '12px 24px',
                borderRadius: '50px',
                backdropFilter: 'blur(10px)',
                border: '2px solid rgba(255,255,255,0.3)'
              }}
            >
              <Sparkles size={20} color="#fff" />
              <span style={{ color: '#fff', fontWeight: '700', fontSize: '16px' }}>
                3/3 Completed
              </span>
            </motion.div>

            {/* Confetti */}
            {[...Array(15)].map((_, i) => (
              <motion.div
                key={i}
                initial={{ 
                  y: -20, 
                  x: `${Math.random() * 100}%`,
                  opacity: 1,
                  rotate: 0
                }}
                animate={{ 
                  y: '250%',
                  rotate: Math.random() * 720 - 360,
                  opacity: 0
                }}
                transition={{ 
                  duration: Math.random() * 2 + 2,
                  repeat: Infinity,
                  delay: Math.random() * 2,
                  ease: 'linear'
                }}
                style={{
                  position: 'absolute',
                  fontSize: '24px',
                  pointerEvents: 'none'
                }}
              >
                {['🎉', '✨', '🌟', '⭐', '💫', '🎊'][Math.floor(Math.random() * 6)]}
              </motion.div>
            ))}
          </motion.div>
        ) : (
          <motion.div
            key="task-slider"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{ position: 'relative', zIndex: 1 }}
          >
            {/* Header */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '24px'
            }}>
              <h3 style={{
                margin: 0,
                fontSize: '20px',
                fontWeight: '700',
                color: '#1e293b',
                display: 'flex',
                alignItems: 'center',
                gap: '10px'
              }}>
                <span style={{ fontSize: '24px' }}>📋</span>
                Today's Tasks
              </h3>

              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                background: 'rgba(255,255,255,0.9)',
                padding: '8px 16px',
                borderRadius: '20px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.08)'
              }}>
                <span style={{
                  fontSize: '16px',
                  fontWeight: '700',
                  color: progress > 50 ? '#22c55e' : '#64748b'
                }}>
                  {completedCount}/{totalTasks}
                </span>
              </div>
            </div>

            {/* Progress Bar */}
            <div style={{
              background: 'rgba(255,255,255,0.5)',
              borderRadius: '12px',
              height: '8px',
              marginBottom: '24px',
              overflow: 'hidden',
              boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.06)'
            }}>
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.8, ease: 'easeOut' }}
                style={{
                  height: '100%',
                  background: 'linear-gradient(90deg, #4ade80 0%, #22c55e 100%)',
                  borderRadius: '12px',
                  position: 'relative'
                }}
              >
                <motion.div
                  animate={{ x: ['-100%', '200%'] }}
                  transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent)',
                    width: '50%'
                  }}
                />
              </motion.div>
            </div>

            {/* Slider Container */}
            <div style={{ position: 'relative' }}>
              {/* Navigation Buttons */}
              <motion.button
                whileHover={{ scale: 1.1, x: -2 }}
                whileTap={{ scale: 0.95 }}
                onClick={prevSlide}
                style={{
                  position: 'absolute',
                  left: '-12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  zIndex: 10,
                  background: 'rgba(255,255,255,0.95)',
                  border: 'none',
                  borderRadius: '50%',
                  width: '40px',
                  height: '40px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                  transition: 'all 0.2s'
                }}
              >
                <ChevronLeft size={20} color="#475569" />
              </motion.button>

              <motion.button
                whileHover={{ scale: 1.1, x: 2 }}
                whileTap={{ scale: 0.95 }}
                onClick={nextSlide}
                style={{
                  position: 'absolute',
                  right: '-12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  zIndex: 10,
                  background: 'rgba(255,255,255,0.95)',
                  border: 'none',
                  borderRadius: '50%',
                  width: '40px',
                  height: '40px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                  transition: 'all 0.2s'
                }}
              >
                <ChevronRight size={20} color="#475569" />
              </motion.button>

              {/* Task Card */}
              <AnimatePresence mode="wait">
                <motion.div
                  key={currentIndex}
                  initial={{ opacity: 0, x: 100, rotateY: -20 }}
                  animate={{ opacity: 1, x: 0, rotateY: 0 }}
                  exit={{ opacity: 0, x: -100, rotateY: 20 }}
                  transition={{ type: "spring", stiffness: 300, damping: 30 }}
                  style={{
                    background: currentTask.completed 
                      ? 'linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%)'
                      : 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
                    borderRadius: '20px',
                    padding: '32px 24px',
                    border: currentTask.completed 
                      ? '3px solid #22c55e' 
                      : '3px solid #e2e8f0',
                    boxShadow: currentTask.completed
                      ? '0 8px 24px rgba(34, 197, 94, 0.25)'
                      : '0 8px 24px rgba(0,0,0,0.08)',
                    position: 'relative',
                    overflow: 'hidden'
                  }}
                >
                  {/* Status Icon */}
                  <motion.div
                    animate={currentTask.completed ? { 
                      scale: [1, 1.2, 1],
                      rotate: [0, 360]
                    } : {}}
                    transition={{ duration: 0.6 }}
                    style={{
                      position: 'absolute',
                      top: '16px',
                      right: '16px'
                    }}
                  >
                    {currentTask.completed ? (
                      <CheckCircle size={32} color="#22c55e" fill="#22c55e" />
                    ) : (
                      <Circle size={32} color="#cbd5e1" strokeWidth={3} />
                    )}
                  </motion.div>

                  {/* Task Icon */}
                  <motion.div
                    animate={{ 
                      scale: [1, 1.05, 1],
                      rotate: [0, 5, -5, 0]
                    }}
                    transition={{ 
                      duration: 3,
                      repeat: Infinity,
                      repeatDelay: 2
                    }}
                    style={{
                      fontSize: '64px',
                      marginBottom: '16px',
                      textAlign: 'center'
                    }}
                  >
                    {currentTask.icon}
                  </motion.div>

                  {/* Task Name */}
                  <h4 style={{
                    fontSize: '24px',
                    fontWeight: '700',
                    color: currentTask.completed ? '#22c55e' : '#1e293b',
                    textAlign: 'center',
                    margin: '0 0 12px 0',
                    textDecoration: currentTask.completed ? 'line-through' : 'none'
                  }}>
                    {currentTask.name}
                  </h4>

                  {/* Status Badge */}
                  <div style={{
                    textAlign: 'center'
                  }}>
                    <motion.span
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      style={{
                        display: 'inline-block',
                        padding: '8px 20px',
                        borderRadius: '20px',
                        fontSize: '14px',
                        fontWeight: '700',
                        background: currentTask.completed 
                          ? 'rgba(34, 197, 94, 0.2)' 
                          : 'rgba(100, 116, 139, 0.1)',
                        color: currentTask.completed ? '#15803d' : '#64748b',
                        border: `2px solid ${currentTask.completed ? '#22c55e' : '#cbd5e1'}`
                      }}
                    >
                      {currentTask.completed ? '✓ Completed' : '○ Pending'}
                    </motion.span>
                  </div>
                </motion.div>
              </AnimatePresence>
            </div>

            {/* Dot Indicators */}
            <div style={{
              display: 'flex',
              justifyContent: 'center',
              gap: '8px',
              marginTop: '20px'
            }}>
              {tasks.map((task, index) => (
                <motion.button
                  key={task.id}
                  onClick={() => goToSlide(index)}
                  whileHover={{ scale: 1.2 }}
                  whileTap={{ scale: 0.9 }}
                  style={{
                    width: currentIndex === index ? '32px' : '12px',
                    height: '12px',
                    borderRadius: '6px',
                    border: 'none',
                    background: task.completed 
                      ? '#22c55e'
                      : currentIndex === index 
                        ? '#475569' 
                        : '#cbd5e1',
                    cursor: 'pointer',
                    transition: 'all 0.3s ease',
                    boxShadow: currentIndex === index ? '0 2px 8px rgba(0,0,0,0.2)' : 'none'
                  }}
                />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default TaskCompletionTracker;