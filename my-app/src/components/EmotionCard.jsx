// EmotionCard.jsx
import React from 'react';
import { MessageCircle } from 'lucide-react';
import './EmotionCard.css';

const EmotionCard = ({ bot, onTalkClick }) => {
  const handleImageError = (e) => {
    e.target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjQiIGhlaWdodD0iNjQiIHZpZXdCb3g9IjAgMCA2NCA2NCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPGNpcmNsZSBjeD0iMzIiIGN5PSIzMiIgcj0iMzIiIGZpbGw9IiM2MzY2RjEiLz4KPHN2ZyB4PSIxNiIgeT0iMTYiIHdpZHRoPSIzMiIgaGVpZ2h0PSIzMiIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9IndoaXRlIiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCI+CjxwYXRoIGQ9Im0yMCA3LTggMTItOC0xMiIvPgo8L3N2Zz4KPC9zdmc+';
  };

  return (
    <div className="emotion-card">
      {/* Avatar Section */}
      <div className={`emotion-card__avatar ${bot.bgColorClass}`}>
       
          <img 
            src={bot.image}
            alt={`${bot.mood} emotion`}
            className="emotion-card__image"
            onError={handleImageError}
          />
       
      
      </div>
      
      {/* Content Section */}
      <div className="emotion-card__content">
        <div className="emotion-card__info">
          <h3 className="emotion-card__name">{bot.name}</h3>
          <p className="emotion-card__description">{bot.description}</p>
        </div>
        
      
        
        {/* Talk Button */}
        <button
          onClick={() => onTalkClick(bot)}
          className={`emotion-card__button ${bot.bgColorClass}`}
        >
          <MessageCircle className="emotion-card__button-icon" />
          Talk
        </button>
      </div>
    </div>
  );
};

export default EmotionCard;