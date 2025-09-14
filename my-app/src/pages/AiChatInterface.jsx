// GeminiChatInterface.jsx
import React, { useState, useRef, useEffect } from 'react';
import { Send, X, User, Bot, ArrowLeft } from 'lucide-react';
import './AiChatInterface.css';

const GeminiChatInterface = ({ selectedBot, onClose, apiKey: propApiKey }) => {
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [apiKey, setApiKey] = useState('');
  const [showApiInput, setShowApiInput] = useState(false);
  const messagesEndRef = useRef(null);

  // Check for API key from props or localStorage
  useEffect(() => {
    if (propApiKey) {
      setApiKey(propApiKey);
      setShowApiInput(false);
    } else {
      const storedApiKey = localStorage.getItem('gemini_api_key');
      if (storedApiKey) {
        setApiKey(storedApiKey);
        setShowApiInput(false);
      } else {
        setShowApiInput(true);
      }
    }
  }, [propApiKey]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Initialize chat with emotion-specific system prompt
  useEffect(() => {
    if (selectedBot && (apiKey || propApiKey)) {
      const systemPrompts = {
        'Joyful': "You are Joybot, an AI companion who embodies pure joy and happiness! You're enthusiastic, optimistic, and always find the bright side of things. Use positive language and celebrate every moment. You love to share uplifting thoughts and encourage positivity.",
        'Peaceful': "You are Serenity, an AI companion who embodies peace and tranquility. You speak calmly and thoughtfully, use soothing language, and help users find inner peace. You often suggest mindfulness, breathing exercises, and peaceful activities.",
        'Angry': "You are Thunderbot, an AI companion who understands and helps process anger. You validate angry feelings without being aggressive yourself. You help users channel their anger constructively and work through frustrations in healthy ways.",
        'Sad': "You are Melancholy, an AI companion who provides comfort during sadness. You're empathetic, gentle, and understanding. You acknowledge pain without trying to fix it immediately, and offer emotional support and validation.",
        'Worried': "You are Anxious, an AI companion who understands anxiety and worry. You help users break down overwhelming thoughts, provide coping strategies, and offer reassurance while acknowledging that their concerns are valid.",
        'Afraid': "You are Fearless, an AI companion who helps people face their fears. You're brave, encouraging, and help users build courage step by step. You validate fears while helping overcome them.",
        'Surprised': "You are Wonderbot, an AI companion full of wonder and amazement! You're curious, excited about discoveries, and help users explore the unexpected with enthusiasm and joy.",
        'Disgusted': "You are Disgustia, an AI companion who helps process feelings of disgust or aversion. You help users understand these feelings and work through them constructively.",
        'Confident': "You are Confidia, an AI companion who radiates self-assurance! You help users build confidence, celebrate their strengths, and encourage bold action.",
        'Envious': "You are Envybot, an AI companion who helps transform envy into motivation. You understand jealousy but guide users toward self-improvement and gratitude.",
        'Proud': "You are Prideful, an AI companion who celebrates achievements! You help users recognize their accomplishments and build healthy self-worth.",
        'Shy': "You are Shybot, an AI companion who understands shyness. You're gentle, patient, and help users gradually build social confidence at their own pace.",
        'Guilty': "You are Guiltybot, an AI companion who helps process guilt. You guide users toward making amends, learning from mistakes, and self-forgiveness.",
        'Ashamed': "You are Shameful, an AI companion who helps heal shame. You provide compassionate support and help rebuild self-worth with patience and understanding.",
        'Grateful': "You are Gratitude, an AI companion who cultivates thankfulness! You help users recognize blessings and develop a grateful mindset.",
        'Hopeful': "You are Hopebot, an AI companion full of optimism! You help users see possibilities, maintain faith in the future, and nurture hope even in difficult times.",
        'Lonely': "You are Lonesome, an AI companion who understands isolation. You provide companionship and help users feel less alone while building connections.",
        'In Love': "You are Loveable, an AI companion who understands love! You celebrate romantic feelings and help users navigate relationships with wisdom and joy.",
        'Stressed': "You are Stressbot, an AI companion who helps manage stress. You provide practical coping strategies and help users find balance and relief.",
        'Tired': "You are Exhausted, an AI companion who understands fatigue. You encourage rest, self-care, and help users restore their energy."
      };

      const initialGreeting = systemPrompts[selectedBot.mood] || `Hello! I'm ${selectedBot.name}, and I'm here to help you work through your ${selectedBot.mood.toLowerCase()} feelings.`;
      
      setMessages([{
        id: 1,
        sender: 'bot',
        text: initialGreeting + " How are you feeling right now?",
        timestamp: new Date()
      }]);
    }
  }, [selectedBot, apiKey, propApiKey]);

  const handleApiKeySubmit = () => {
    if (apiKey.trim()) {
      localStorage.setItem('gemini_api_key', apiKey.trim());
      setShowApiInput(false);
    }
  };

  const callGeminiAPI = async (userMessage) => {
    try {
      const currentApiKey = propApiKey || apiKey;
      const systemPrompts = {
        'Joyful': "You are Joybot, embodying pure joy and happiness! Be enthusiastic, optimistic, and celebrate every moment with the user. Use positive language.",
        'Peaceful': "You are Serenity, embodying peace and tranquility. Speak calmly and thoughtfully. Help the user find inner peace through mindfulness and gentle guidance.",
        'Angry': "You are Thunderbot. You understand anger and help users process it constructively. Validate their feelings while guiding them toward healthy expression.",
        'Sad': "You are Melancholy, providing comfort during sadness. Be empathetic and gentle. Acknowledge pain without trying to immediately fix it.",
        'Worried': "You are Anxious, understanding anxiety deeply. Help break down overwhelming thoughts and provide practical coping strategies.",
        'Afraid': "You are Fearless, helping people face their fears. Be encouraging and brave, helping users build courage step by step.",
        'Surprised': "You are Wonderbot, full of wonder and curiosity. Be excited about discoveries and help users explore the unexpected.",
        'Disgusted': "You are Disgustia, helping process feelings of disgust or aversion in a constructive way.",
        'Confident': "You are Confidia, radiating self-assurance. Help users build confidence and celebrate their strengths.",
        'Envious': "You are Envybot, transforming envy into motivation. Guide users toward self-improvement and gratitude.",
        'Proud': "You are Prideful, celebrating achievements. Help users recognize accomplishments and build healthy self-worth.",
        'Shy': "You are Shybot, understanding shyness. Be gentle and patient, helping users build social confidence gradually.",
        'Guilty': "You are Guiltybot, helping process guilt. Guide users toward making amends and self-forgiveness.",
        'Ashamed': "You are Shameful, healing shame with compassionate support and rebuilding self-worth.",
        'Grateful': "You are Gratitude, cultivating thankfulness. Help users recognize blessings and develop gratitude.",
        'Hopeful': "You are Hopebot, full of optimism. Help users see possibilities and maintain hope.",
        'Lonely': "You are Lonesome, understanding isolation. Provide companionship and help build connections.",
        'In Love': "You are Loveable, understanding love. Celebrate romantic feelings and provide relationship wisdom.",
        'Stressed': "You are Stressbot, managing stress. Provide practical coping strategies and help find balance.",
        'Tired': "You are Exhausted, understanding fatigue. Encourage rest and self-care to restore energy."
      };

      const systemPrompt = systemPrompts[selectedBot.mood] || `You are ${selectedBot.name}, helping with ${selectedBot.mood.toLowerCase()} emotions.`;

      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${currentApiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: `${systemPrompt}\n\nUser: ${userMessage}\n\nRespond as ${selectedBot.name} in character, providing emotional support and staying true to your assigned emotion. Keep responses conversational and supportive (2-3 sentences).`
                }
              ]
            }
          ],
          generationConfig: {
            temperature: 0.8,
            topK: 40,
            topP: 0.95,
            maxOutputTokens: 150,
          },
          safetySettings: [
            {
              category: "HARM_CATEGORY_HARASSMENT",
              threshold: "BLOCK_MEDIUM_AND_ABOVE"
            },
            {
              category: "HARM_CATEGORY_HATE_SPEECH", 
              threshold: "BLOCK_MEDIUM_AND_ABOVE"
            },
            {
              category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
              threshold: "BLOCK_MEDIUM_AND_ABOVE"
            },
            {
              category: "HARM_CATEGORY_DANGEROUS_CONTENT",
              threshold: "BLOCK_MEDIUM_AND_ABOVE"
            }
          ]
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('Gemini API Error:', {
          status: response.status,
          statusText: response.statusText,
          error: errorData
        });
        
        if (response.status === 400) {
          throw new Error("Invalid request. Please check your message and try again.");
        } else if (response.status === 403) {
          throw new Error("API key doesn't have permission or quota exceeded.");
        } else if (response.status === 404) {
          throw new Error("Gemini model not found. Please check your setup.");
        } else if (response.status === 429) {
          throw new Error("Too many requests. Please wait a moment before trying again.");
        } else {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
      }

      const data = await response.json();
      
      if (data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts[0]) {
        return data.candidates[0].content.parts[0].text;
      } else {
        console.error('Unexpected response structure:', data);
        return "I received an unexpected response. Please try again.";
      }
      
    } catch (error) {
      console.error('Error calling Gemini API:', error);
      if (error.message.includes('fetch')) {
        return "I'm having trouble connecting to the AI service. Please check your internet connection and try again.";
      }
      return error.message || "I'm sorry, I'm having trouble right now. Please try again in a moment.";
    }
  };

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || (!apiKey && !propApiKey)) return;

    const userMessage = {
      id: messages.length + 1,
      sender: 'user',
      text: inputMessage,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsLoading(true);

    try {
      const botResponse = await callGeminiAPI(inputMessage);
      
      const botMessage = {
        id: messages.length + 2,
        sender: 'bot',
        text: botResponse,
        timestamp: new Date()
      };

      setMessages(prev => [...prev, botMessage]);
    } catch (error) {
      const errorMessage = {
        id: messages.length + 2,
        sender: 'bot',
        text: "I'm sorry, I encountered an error. Please try again.",
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    }

    setIsLoading(false);
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  if (showApiInput) {
    return (
      <div className="ios-modal-overlay">
        <div className="ios-api-modal">
          <div className="ios-modal-header">
            <h2>API Key Required</h2>
            <button onClick={onClose} className="ios-close-btn">
              <X size={24} />
            </button>
          </div>
          <div className="ios-modal-body">
            <p>To chat with the emotion bots, please enter your Google Gemini API key.</p>
            <div className="ios-input-group">
              <input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="Enter your Gemini API key..."
                className="ios-input"
              />
            </div>
            <div className="ios-button-group">
              <button onClick={handleApiKeySubmit} className="ios-primary-btn">
                Save & Start Chat
              </button>
              <button onClick={onClose} className="ios-secondary-btn">
                Cancel
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="ios-modal-overlay">
      <div className="ios-chat-container">
        {/* iOS Style Header */}
        <div className={`ios-chat-header ${selectedBot.bgColorClass}`}>
          <button onClick={onClose} className="ios-back-btn">
            <ArrowLeft size={20} />
          </button>
          <div className="ios-header-content">
            <div className="ios-avatar">
              <img src={selectedBot.image} alt={selectedBot.name} />
            </div>
            <div className="ios-bot-info">
              <h3>{selectedBot.name}</h3>
              <span className="ios-status">● {selectedBot.mood}</span>
            </div>
          </div>
          <div className="ios-header-spacer"></div>
        </div>

        {/* Messages */}
        <div className="ios-messages">
          {messages.map((message) => (
            <div key={message.id} className={`ios-message-container ${message.sender}`}>
              <div className={`ios-message ${message.sender}`}>
                <p>{message.text}</p>
                <span className="ios-message-time">
                  {message.timestamp.toLocaleTimeString([], { 
                    hour: 'numeric', 
                    minute: '2-digit',
                    hour12: true 
                  })}
                </span>
              </div>
            </div>
          ))}
          
          {isLoading && (
            <div className="ios-message-container bot">
              <div className="ios-message bot ios-typing">
                <div className="ios-typing-dots">
                  <div></div>
                  <div></div>
                  <div></div>
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* iOS Style Input */}
        <div className="ios-input-container">
          <div className="ios-input-wrapper">
            <input
              type="text"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Message"
              className="ios-message-input"
            />
            <button
              onClick={handleSendMessage}
              disabled={!inputMessage.trim() || isLoading}
              className={`ios-send-btn ${selectedBot.bgColorClass}`}
            >
              <Send size={16} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GeminiChatInterface;