import React, { useState, useRef, useEffect } from 'react';
import { X, Send, Loader } from 'lucide-react';

const GeminiChatInterface = ({ selectedBot, onClose, apiKey }) => {
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);
  const chatContainerRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    // Initial greeting from the bot
    const greeting = `Hello! I'm ${selectedBot.name}, your ${selectedBot.mood} companion. I'm here to help you navigate through your ${selectedBot.mood.toLowerCase()} feelings. How are you feeling right now?`;
    setMessages([{
      role: 'assistant',
      content: greeting,
      timestamp: new Date()
    }]);
  }, [selectedBot]);

  const sendMessage = async () => {
    if (!inputMessage.trim() || isLoading) return;

    const userMessage = {
      role: 'user',
      content: inputMessage,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsLoading(true);

    try {
      // Simulated API call - replace with actual Gemini API call
      const systemPrompt = `You are ${selectedBot.name}, an empathetic AI companion specialized in helping people who are feeling ${selectedBot.mood.toLowerCase()}. ${selectedBot.description}. Be warm, understanding, and supportive. Keep responses concise and conversational.`;

      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Simulated response - replace with actual API integration
      const botResponse = {
        role: 'assistant',
        content: generateSimulatedResponse(inputMessage, selectedBot.mood),
        timestamp: new Date()
      };

      setMessages(prev => [...prev, botResponse]);
    } catch (error) {
      console.error('Error sending message:', error);
      const errorMessage = {
        role: 'assistant',
        content: "I apologize, but I'm having trouble responding right now. Please try again.",
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const generateSimulatedResponse = (userInput, mood) => {
    const responses = {
      'Worried': [
        "I understand that anxiety can feel overwhelming. Let's take this one step at a time. What specific worry is on your mind right now?",
        "It's okay to feel anxious. Would you like to try a brief grounding exercise with me?",
        "Remember, worries are just thoughts, not facts. What evidence do you have for and against this worry?"
      ],
      'Sad': [
        "I'm here with you through this difficult time. Sadness is a valid emotion. What's weighing on your heart?",
        "It's okay to not be okay sometimes. Would you like to talk about what's making you feel this way?",
        "Your feelings matter. Take all the time you need to express what you're going through."
      ],
      'Joyful': [
        "That's wonderful! I love hearing about what makes you happy. Tell me more!",
        "Your joy is contagious! What's bringing you this happiness today?",
        "It's beautiful to celebrate these moments. What else is making you smile?"
      ],
      'Stressed': [
        "Stress can feel heavy. Let's work through this together. What's the biggest stressor right now?",
        "When we're stressed, it helps to prioritize. What feels most urgent to you?",
        "Remember to breathe. Let's break this down into manageable pieces."
      ],
      'Lonely': [
        "Loneliness can be really hard. I'm here with you, and you're not alone in this conversation.",
        "Connection is so important. What kind of connection are you craving right now?",
        "I hear you. Would you like to talk about what's making you feel isolated?"
      ],
      'Angry': [
        "Your anger is valid. It's telling you something important. What's underneath this feeling?",
        "Let's channel this energy constructively. What triggered these feelings?",
        "Anger often protects us from hurt. What might be the deeper emotion here?"
      ],
      'Afraid': [
        "Fear is your mind trying to protect you. Let's explore what feels scary right now.",
        "You're brave for acknowledging your fear. What specifically are you afraid of?",
        "It's okay to be afraid. Courage isn't the absence of fear, but moving forward despite it."
      ]
    };

    const moodResponses = responses[mood] || responses['Joyful'];
    return moodResponses[Math.floor(Math.random() * moodResponses.length)];
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      padding: '20px'
    }}>
      <div style={{
        backgroundColor: 'white',
        borderRadius: '16px',
        width: '100%',
        maxWidth: '800px',
        height: '90vh',
        maxHeight: '700px',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
      }}>
        {/* Header */}
        <div style={{
          background: `linear-gradient(135deg, ${selectedBot.color}, ${selectedBot.color}dd)`,
          padding: '20px 24px',
          borderRadius: '16px 16px 0 0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '48px',
              height: '48px',
              borderRadius: '50%',
              backgroundColor: 'rgba(255, 255, 255, 0.3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              overflow: 'hidden'
            }}>
              {selectedBot.image ? (
                <img 
                  src={selectedBot.image} 
                  alt={selectedBot.name}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  onError={(e) => e.target.style.display = 'none'}
                />
              ) : (
                <span style={{ fontSize: '24px' }}>🤖</span>
              )}
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: '18px', fontWeight: '600', color: 'white' }}>
                {selectedBot.name}
              </h2>
              <p style={{ margin: '2px 0 0 0', fontSize: '13px', color: 'rgba(255, 255, 255, 0.9)' }}>
                {selectedBot.mood} • Online
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'rgba(255, 255, 255, 0.2)',
              border: 'none',
              borderRadius: '8px',
              padding: '8px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'background 0.2s'
            }}
            onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.3)'}
            onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)'}
          >
            <X size={20} color="white" />
          </button>
        </div>

        {/* Messages */}
        <div 
          ref={chatContainerRef}
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '24px',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
            backgroundColor: '#f8fafc'
          }}
        >
          {messages.map((message, index) => (
            <div
              key={index}
              style={{
                display: 'flex',
                justifyContent: message.role === 'user' ? 'flex-end' : 'flex-start'
              }}
            >
              <div
                style={{
                  maxWidth: '70%',
                  padding: '12px 16px',
                  borderRadius: '12px',
                  backgroundColor: message.role === 'user' ? selectedBot.color : 'white',
                  color: message.role === 'user' ? 'white' : '#1e293b',
                  boxShadow: '0 1px 2px rgba(0, 0, 0, 0.1)',
                  wordWrap: 'break-word'
                }}
              >
                <p style={{ margin: 0, fontSize: '14px', lineHeight: '1.5' }}>
                  {message.content}
                </p>
                <span style={{
                  fontSize: '11px',
                  opacity: 0.7,
                  marginTop: '4px',
                  display: 'block'
                }}>
                  {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            </div>
          ))}
          {isLoading && (
            <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
              <div style={{
                padding: '12px 16px',
                borderRadius: '12px',
                backgroundColor: 'white',
                boxShadow: '0 1px 2px rgba(0, 0, 0, 0.1)',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                <Loader size={16} style={{ animation: 'spin 1s linear infinite' }} />
                <span style={{ fontSize: '14px', color: '#64748b' }}>Typing...</span>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div style={{
          padding: '16px 24px',
          borderTop: '1px solid #e2e8f0',
          backgroundColor: 'white',
          borderRadius: '0 0 16px 16px'
        }}>
          <div style={{
            display: 'flex',
            gap: '12px',
            alignItems: 'flex-end'
          }}>
            <textarea
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Type your message..."
              style={{
                flex: 1,
                padding: '12px 16px',
                borderRadius: '12px',
                border: '1px solid #e2e8f0',
                fontSize: '14px',
                resize: 'none',
                minHeight: '44px',
                maxHeight: '120px',
                fontFamily: 'inherit',
                outline: 'none'
              }}
              rows={1}
            />
            <button
              onClick={sendMessage}
              disabled={!inputMessage.trim() || isLoading}
              style={{
                backgroundColor: selectedBot.color,
                color: 'white',
                border: 'none',
                borderRadius: '12px',
                padding: '12px 20px',
                cursor: inputMessage.trim() && !isLoading ? 'pointer' : 'not-allowed',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.2s',
                opacity: inputMessage.trim() && !isLoading ? 1 : 0.5,
                minWidth: '44px',
                height: '44px'
              }}
              onMouseEnter={(e) => {
                if (inputMessage.trim() && !isLoading) {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.15)';
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              <Send size={18} />
            </button>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default GeminiChatInterface;