import React from 'react';
import './EmotionalChatWidget.css';

const EmotionalChatWidget = ({ onChatClick }) => {
  const emotionalChats = [
    {
      emotion: 'joy',
      icon: '😄',
      title: 'Joy',
      color: '#10B981'
    },
    {
      emotion: 'comfort',
      icon: '🤗',
      title: 'Comfort',
      color: '#3B82F6'
    },
    {
      emotion: 'anxiety',
      icon: '😰',
      title: 'Anxiety',
      color: '#F59E0B'
    },
    {
      emotion: 'anger',
      icon: '😠',
      title: 'Anger',
      color: '#EF4444'
    },
    {
      emotion: 'stress',
      icon: '😫',
      title: 'Stress',
      color: '#8B5CF6'
    }
  ];

  return (
    <div className="emotional-chat-widget">
      <div className="emotional-chat-widget__container">
        {emotionalChats.map((chat) => (
          <button
            key={chat.emotion}
            className="emotional-chat-widget__button"
            onClick={() => onChatClick(chat.emotion)}
          >
            <div className="emotional-chat-widget__circle">
              <span className="emotional-chat-widget__emoji">{chat.icon}</span>
            </div>
            <span className="emotional-chat-widget__label">{chat.title}</span>
          </button>
        ))}
      </div>
    </div>
  );
};

export default EmotionalChatWidget;