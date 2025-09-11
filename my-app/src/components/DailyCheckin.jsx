import React, { useState, useEffect } from 'react';

const DailyCheckin = () => {
  const [days, setDays] = useState([]);
  const [visibleDays, setVisibleDays] = useState([]);

  useEffect(() => {
    generateDays();
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      handleResize();
    }, 100); // Small delay to ensure DOM is ready
    
    window.addEventListener('resize', handleResize);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', handleResize);
    };
  }, [days]);

  const generateDays = () => {
    const today = new Date();
    const daysList = [];
    
    // Generate 30 days (29 previous days + today) to have enough for any screen size
    for (let i = 29; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(today.getDate() - i);
      const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });
      const dayNumber = date.getDate();
      const isToday = i === 0;
const moodImages = ["/anger.png", "/happy.png", "/sad.png"];

daysList.push({ 
  day: dayName, 
  date: dayNumber, 
  isToday,
  fullDate: new Date(date),
  moodImage: moodImages[Math.floor(Math.random() * moodImages.length)]
});

    
    
    }
    setDays(daysList);
  };

  const handleResize = () => {
    if (days.length === 0) return;
    
    const screenWidth = window.innerWidth;
    
    // Calculate how many boxes can fit based on screen width
    // Box width: 60px + gap: 8px = 68px per box
    // Container padding: 40px (20px on each side)
    const availableWidth = screenWidth - 40; // Subtract container padding
    const boxWidth = 68; // 60px min-width + 8px gap
    const maxVisible = Math.floor(availableWidth / boxWidth);
    
    // Ensure we show at least 3 boxes and don't exceed available days
    const finalMaxVisible = Math.max(3, Math.min(maxVisible, days.length));
    
    // Always show the latest days (including today)
    const latestDays = days.slice(-finalMaxVisible);
    setVisibleDays(latestDays);
  };

  return (
    <>
      <style>{`
        .daily-checkin-container {
          display: flex;
          flex-wrap: nowrap;
          gap: 15px;
          padding: 20px;
          border-radius: 40px;
          justify-content: end;
          overflow: hidden;
        }
        
        @media (max-width: 480px) {
          .daily-checkin-container {
            gap: 6px;
            padding: 15px 10px;
          }
        }

        .day-item {
          display: flex;
          flex-direction: column;
          align-items: center;
          flex-shrink: 0;
        }

        .daycheck {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
        
        min-width:100px;
          height: 100px;
          background-color: white;
          border: 2px solid #e0e0e0;
          border-radius: 20px;
          cursor: pointer;
          transition: all 0.3s ease;
          scroll-snap-align: center;
        }
        
        @media (max-width: 480px) {
          .daycheck {
            min-width: 50px;
            height: 120px;
          }
        }

        .daycheck:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 8px rgba(0,0,0,0.1);
        }
        
        .daycheck.today {
          border-color: #4CAF50;
          background-color: #f8fff8;
        }

        .day {
          margin: 0;
          font-size: 12px;
          font-weight: 600;
          color: #666;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        
        @media (max-width: 480px) {
          .day {
            font-size: 10px;
          }
        }
        
        .daycheck.today .day {
          color: #4CAF50;
        }

        .date {
          margin: 2px 0 0 0;
          font-size: 20px;
          font-weight: bold;
          color: #333;
        }
        
        @media (max-width: 480px) {
          .date {
            font-size: 16px;
          }
        }
        
        .daycheck.today .date {
          color: #4CAF50;
        }

        .mood-image-container {
          margin-top: 10px;
          width: 60px;
          height: 60px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 12px;
    
         
          cursor: pointer;
          transition: all 0.2s ease;
        }

        @media (max-width: 480px) {
          .mood-image-container {
            width: 50px;
            height: 50px;
          }
        }

       

        .mood-image {
          width: 100%;
          height: 100%;
          object-fit: cover;
          border-radius: 10px;
        }

        .mood-placeholder {
          color: #999;
          font-size: 12px;
          text-align: center;
          font-weight: 500;
        }

        @media (max-width: 480px) {
          .mood-placeholder {
            font-size: 10px;
          }
        }
      `}</style>
      
      <div className="daily-checkin-container">
        {visibleDays.map((dayInfo, index) => (
          <div key={`${dayInfo.fullDate.getTime()}`} className="day-item">
            <div className={`daycheck ${dayInfo.isToday ? 'today' : ''}`}>
              <h1 className="day">{dayInfo.day}</h1>
              <h1 className="date">{dayInfo.date}</h1>
            </div>
            
            <div className="mood-image-container">
              {dayInfo.moodImage ? (
                <img 
                  src={dayInfo.moodImage} 
                  alt="Mood" 
                  className="mood-image"
                />
              ) : (
                <div className="mood-placeholder">Mood</div>
              )}
            </div>
          </div>
        ))}
      </div>
    </>
  );
};

export default DailyCheckin;