// EmotionWidget.jsx
import React, { useRef, useState } from 'react';
import { ChevronRight, ChevronLeft } from 'lucide-react';
import EmotionCard from './EmotionCard';
import GeminiChatInterface from '../pages/AiChatInterface';
import './EmotionalChatWidget.css';

const EmotionWidget = () => {
  const scrollContainerRef = useRef(null);
  const [selectedBot, setSelectedBot] = useState(null);

  const scrollLeft = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({
        left: -300,
        behavior: 'smooth'
      });
    }
  };

  const scrollRight = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({
        left: 300,
        behavior: 'smooth'
      });
    }
  };

  const voicebots = [
    {
      id: 1,
      name: "Joybot",
      mood: "Joyful",
      description: "Spread happiness and celebrate life's moments",
      colorClass: "color-yellow-orange",
      bgColorClass: "bg-yellow-orange",
      image: "/joybot.png"
    },
    {
      id: 2,
      name: "Serenity",
      mood: "Peaceful",
      description: "Find inner peace and tranquil moments",
      colorClass: "color-blue-cyan",
      bgColorClass: "bg-blue-cyan",
      image: "/serenity.png"
    },
    {
      id: 3,
      name: "Thunderbot",
      mood: "Angry",
      description: "Express frustration and work through anger",
      colorClass: "color-red-dark",
      bgColorClass: "bg-red-dark",
      image: "/thunderbolt.png"
    },
    {
      id: 4,
      name: "Melancholy",
      mood: "Sad",
      description: "Navigate through sadness with understanding",
      colorClass: "color-gray-blue",
      bgColorClass: "bg-gray-blue",
      image: "/sadness.png"
    },
    {
      id: 5,
      name: "Anxious",
      mood: "Worried",
      description: "Work through anxiety and find calm",
      colorClass: "color-purple-indigo",
      bgColorClass: "bg-purple-indigo",
      image: "/anxious.png"
    },
    {
      id: 6,
      name: "Fearless",
      mood: "Afraid",
      description: "Face fears and build courage together",
      colorClass: "color-gray-dark",
      bgColorClass: "bg-gray-dark",
      image: "/fear.png"
    },
    {
      id: 7,
      name: "Wonderbot",
      mood: "Surprised",
      description: "Explore amazement and unexpected discoveries",
      colorClass: "color-pink-rose",
      bgColorClass: "bg-pink-rose",
      image: "amazement.png"
    },
    {
      id: 8,
      name: "Disgustia",
      mood: "Disgusted",
      description: "Process aversion and difficult feelings",
      colorClass: "color-green-dark",
      bgColorClass: "bg-green-dark",
      image: "https://images.unsplash.com/photo-1507591064344-4c6ce005b128?w=150&h=150&fit=crop&crop=face"
    },
    {
      id: 9,
      name: "Confidia",
      mood: "Confident",
      description: "Build self-assurance and inner strength",
      colorClass: "color-emerald-teal",
      bgColorClass: "bg-emerald-teal",
      image: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150&h=150&fit=crop&crop=face"
    },
    {
      id: 10,
      name: "Envybot",
      mood: "Envious",
      description: "Transform envy into motivation and growth",
      colorClass: "color-lime-green",
      bgColorClass: "bg-lime-green",
      image: "https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=150&h=150&fit=crop&crop=face"
    },
    {
      id: 11,
      name: "Prideful",
      mood: "Proud",
      description: "Celebrate achievements and build self-worth",
      colorClass: "color-amber-yellow",
      bgColorClass: "bg-amber-yellow",
      image: "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=150&h=150&fit=crop&crop=face"
    },
    {
      id: 12,
      name: "Shybot",
      mood: "Shy",
      description: "Overcome shyness and build social confidence",
      colorClass: "color-rose-pink",
      bgColorClass: "bg-rose-pink",
      image: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&h=150&fit=crop&crop=face"
    },
    {
      id: 13,
      name: "Guiltybot",
      mood: "Guilty",
      description: "Process guilt and find path to forgiveness",
      colorClass: "color-orange-red",
      bgColorClass: "bg-orange-red",
      image: "https://images.unsplash.com/photo-1543610892-0b1f7e6d8ac1?w=150&h=150&fit=crop&crop=face"
    },
    {
      id: 14,
      name: "Shameful",
      mood: "Ashamed",
      description: "Heal shame and rebuild self-compassion",
      colorClass: "color-slate-gray",
      bgColorClass: "bg-slate-gray",
      image: "https://images.unsplash.com/photo-1489424731084-a5d8b219a5bb?w=150&h=150&fit=crop&crop=face"
    },
    {
      id: 15,
      name: "Gratitude",
      mood: "Grateful",
      description: "Cultivate appreciation and thankfulness",
      colorClass: "color-violet-purple",
      bgColorClass: "bg-violet-purple",
      image: "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&h=150&fit=crop&crop=face"
    },
    {
      id: 16,
      name: "Hopebot",
      mood: "Hopeful",
      description: "Nurture optimism and positive outlook",
      colorClass: "color-sky-blue",
      bgColorClass: "bg-sky-blue",
      image: "https://images.unsplash.com/photo-1502323777036-f29e3972d82f?w=150&h=150&fit=crop&crop=face"
    },
    {
      id: 17,
      name: "Lonesome",
      mood: "Lonely",
      description: "Find connection and overcome isolation",
      colorClass: "color-indigo-purple",
      bgColorClass: "bg-indigo-purple",
      image: "https://images.unsplash.com/photo-1544717297-fa95b6ee9643?w=150&h=150&fit=crop&crop=face"
    },
    {
      id: 18,
      name: "Loveable",
      mood: "In Love",
      description: "Explore love and deep emotional connections",
      colorClass: "color-red-pink",
      bgColorClass: "bg-red-pink",
      image: "https://images.unsplash.com/photo-1559829577-7e2228c8dbd0?w=150&h=150&fit=crop&crop=face"
    },
    {
      id: 19,
      name: "Stressbot",
      mood: "Stressed",
      description: "Manage stress and find healthy coping",
      colorClass: "color-gray-slate",
      bgColorClass: "bg-gray-slate",
      image: "https://images.unsplash.com/photo-1499996860823-5214fcc65f8f?w=150&h=150&fit=crop&crop=face"
    },
    {
      id: 20,
      name: "Exhausted",
      mood: "Tired",
      description: "Rest, recharge and restore energy",
      colorClass: "color-slate-gray-dark",
      bgColorClass: "bg-slate-gray-dark",
      image: "https://images.unsplash.com/photo-1531123897727-8f129e1688ce?w=150&h=150&fit=crop&crop=face"
    }
  ];

  const handleTalkClick = (voicebot) => {
    setSelectedBot(voicebot);
  };

  const handleCloseChat = () => {
    setSelectedBot(null);
  };

  return (
    <div className="emotion-widget">
      <div className="emotion-widget__container">
        <div className="emotion-widget__header">
          <div className="emotion-widget__header-content">
            <h1 className="emotion-widget__title">TALK TO AI EMOTION BOTS</h1>
            <p className="emotion-widget__subtitle">
              Choose how you're feeling and chat with that emotional context
            </p>
          </div>
          <div className="emotion-widget__navigation">
            <button className="emotion-widget__nav-btn" onClick={scrollLeft}>
              <ChevronLeft className="emotion-widget__chevron" />
            </button>
            <button className="emotion-widget__nav-btn" onClick={scrollRight}>
              <ChevronRight className="emotion-widget__chevron" />
            </button>
          </div>
        </div>
        
        <div className="emotion-widget__cards-container" ref={scrollContainerRef}>
          {voicebots.map((bot) => (
            <EmotionCard 
              key={bot.id} 
              bot={bot} 
              onTalkClick={handleTalkClick} 
            />
          ))}
        </div>
        
        <div className="emotion-widget__scroll-indicators">
          <div className="emotion-widget__indicators">
            {Array.from({ length: Math.min(voicebots.length, 8) }).map((_, index) => (
              <div
                key={index}
                className="emotion-widget__indicator"
              ></div>
            ))}
          </div>
        </div>
      </div>

      {selectedBot && (
        <GeminiChatInterface 
          selectedBot={selectedBot} 
          onClose={handleCloseChat}
          // Pass the API key from environment variables
          apiKey={import.meta.env.VITE_GEMINI_API_KEY || process.env.REACT_APP_GEMINI_API_KEY}
        />
      )}
    </div>
  );
};

export default EmotionWidget;