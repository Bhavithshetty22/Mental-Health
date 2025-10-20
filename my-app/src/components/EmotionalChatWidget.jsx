import React, { useState } from 'react';

const DashboardEmotionBots = ({ onBotSelect }) => {
  const [activeTab, setActiveTab] = useState('all');

  const emotionBots = [
    { 
      id: 1, 
      name: "Anxious", 
      mood: "Worried",
      color: "#6B9080", 
      description: "Work through anxiety and find calm",
      colorClass: "color-purple-indigo",
      bgColorClass: "bg-purple-indigo",
      image: "/anxious.png"
    },
    { 
      id: 2, 
      name: "Melancholy", 
      mood: "Sad",
      color: "#6B9080", 
      description: "Navigate through sadness with understanding",
      colorClass: "color-gray-blue",
      bgColorClass: "bg-gray-blue",
      image: "/sadness.png"
    },
    { 
      id: 3, 
      name: "Joybot", 
      mood: "Joyful",
      color: "#6B9080", 
      description: "Spread happiness and celebrate life's moments",
      colorClass: "color-yellow-orange",
      bgColorClass: "bg-yellow-orange",
      image: "/joybot.png"
    },
    { 
      id: 4, 
      name: "Stressbot", 
      mood: "Stressed",
      color: "#6B9080", 
      description: "Manage stress and find healthy coping",
      colorClass: "color-gray-slate",
      bgColorClass: "bg-gray-slate",
      image: "https://images.unsplash.com/photo-1499996860823-5214fcc65f8f?w=150&h=150&fit=crop&crop=face"
    },
    { 
      id: 5, 
      name: "Lonesome", 
      mood: "Lonely",
      color: "#6B9080", 
      description: "Find connection and overcome isolation",
      colorClass: "color-indigo-purple",
      bgColorClass: "bg-indigo-purple",
      image: "https://images.unsplash.com/photo-1544717297-fa95b6ee9643?w=150&h=150&fit=crop&crop=face"
    },
    { 
      id: 6, 
      name: "Thunderbot", 
      mood: "Angry",
      color: "#6B9080", 
      description: "Express frustration and work through anger",
      colorClass: "color-red-dark",
      bgColorClass: "bg-red-dark",
      image: "/thunderbolt.png"
    },
    { 
      id: 7, 
      name: "Fearless", 
      mood: "Afraid",
      color: "#6B9080", 
      description: "Face fears and build courage together",
      colorClass: "color-gray-dark",
      bgColorClass: "bg-gray-dark",
      image: "/fear.png"
    }
  ];

  const tabs = [
    { id: 'all', label: 'All emotion bots' },
    { id: 'newest', label: 'Newest' },
    { id: 'rated', label: 'Top rated' },
    { id: 'popular', label: 'Most Popular' }
  ];

  return (
    <div style={{ 
      borderRadius: '12px',
      padding: '24px',
      maxWidth:'55%'
    }}>
      {/* Header */}
      <h2 style={{
        fontSize: '20px',
        fontWeight: '600',
        color: '#1e293b',
        marginBottom: '20px',
        marginTop: '0'
      }}>
        Talk to AI Emotion Bots
      </h2>

      {/* Tabs */}
      <div style={{
        display: 'flex',
        gap: '24px',
        marginBottom: '20px',
        borderBottom: '1px solid #e2e8f0'
      }}>
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              background: 'none',
              border: 'none',
              padding: '12px 0',
              fontSize: '14px',
              fontWeight: activeTab === tab.id ? '600' : '400',
              color: activeTab === tab.id ? '#1e293b' : '#94a3b8',
              cursor: 'pointer',
              position: 'relative',
              transition: 'color 0.2s ease',
              borderBottom: activeTab === tab.id ? '2px solid #6B9080' : '2px solid transparent',
              marginBottom: '-1px'
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Bot Cards */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '12px'
      }}>
        {emotionBots.map(bot => (
          <div
            key={bot.id}
            onClick={() => onBotSelect && onBotSelect(bot)}
            style={{
              backgroundColor:'#5E936C',
              borderRadius: '16px',
              padding: '20px 24px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              minHeight: '60px'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateX(4px)';
              e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateX(0)';
              e.currentTarget.style.boxShadow = 'none';
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div style={{
                width: '40px',
                height: '40px',
                borderRadius: '50%',
                backgroundColor: 'rgba(255,255,255,0.3)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                overflow: 'hidden'
              }}>
                {bot.image ? (
                  <img 
                    src={bot.image} 
                    alt={bot.name}
                    style={{ 
                      width: '100%', 
                      height: '100%', 
                      objectFit: 'cover' 
                    }}
                    onError={(e) => {
                      e.target.style.display = 'none';
                      e.target.parentElement.innerHTML = '<span style="font-size: 20px">🤖</span>';
                    }}
                  />
                ) : (
                  <span style={{ fontSize: '20px' }}>🤖</span>
                )}
              </div>
              <div>
                <h3 style={{
                  margin: '0',
                  fontSize: '16px',
                  fontWeight: '600',
                  color: 'white'
                }}>
                  {bot.name}
                </h3>
                <p style={{
                  margin: '4px 0 0 0',
                  fontSize: '13px',
                  color: 'rgba(255,255,255,0.9)'
                }}>
                  {bot.description}
                </p>
              </div>
            </div>
            <svg 
              width="20" 
              height="20" 
              viewBox="0 0 20 20" 
              fill="none" 
              style={{ opacity: 0.8, flexShrink: 0 }}
            >
              <path 
                d="M7.5 15L12.5 10L7.5 5" 
                stroke="white" 
                strokeWidth="2" 
                strokeLinecap="round" 
                strokeLinejoin="round"
              />
            </svg>
          </div>
        ))}
      </div>
    </div>
  );
};

export default DashboardEmotionBots;