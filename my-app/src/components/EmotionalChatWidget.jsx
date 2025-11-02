import React, { useState, useRef, useEffect } from 'react';
import { Send, X, Plus, Star, TrendingUp, Clock, Users, Smile } from 'lucide-react';

const API_URL = 'http://localhost:5000/api';

const EmotionChatApp = () => {
  const [selectedBot, setSelectedBot] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [activeTab, setActiveTab] = useState('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [allBots, setAllBots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAllBots, setShowAllBots] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  const getToken = () => localStorage.getItem('token');

  useEffect(() => {
    loadBots();
  }, []);

  const loadBots = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/emotion-bots`);
      const data = await response.json();
      
      if (data.success) {
        setAllBots(data.bots);
        setError(null);
      } else {
        setError('Failed to load bots');
      }
    } catch (error) {
      console.error('Error loading bots:', error);
      setError('Failed to connect to server');
    } finally {
      setLoading(false);
    }
  };

  const getFilteredBots = () => {
    let filtered = [...allBots];
    
    if (searchQuery.trim()) {
      filtered = filtered.filter(bot => 
        bot.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        bot.description.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    
    switch(activeTab) {
      case 'newest':
        filtered = filtered.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        break;
      case 'rated':
        filtered = filtered.sort((a, b) => (b.rating || 0) - (a.rating || 0));
        break;
      case 'popular':
        filtered = filtered.sort((a, b) => (b.chats || 0) - (a.chats || 0));
        break;
      default:
        break;
    }
    
    if (!showAllBots) {
      return filtered.slice(0, 5);
    }
    
    return filtered;
  };

  const tabs = [
    { id: 'all', label: 'All emotion bots', icon: Users },
    { id: 'newest', label: 'Newest', icon: Clock },
    { id: 'rated', label: 'Top rated', icon: Star },
    { id: 'popular', label: 'Most Popular', icon: TrendingUp }
  ];

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleBotSelect = async (bot) => {
    setSelectedBot(bot);
    setMessages([]);
    setInputMessage('');
    
    const token = getToken();
    if (token) {
      try {
        const response = await fetch(`${API_URL}/emotion-bots/${bot.id}/chat`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        const data = await response.json();
        
        if (data.success && data.messages && data.messages.length > 0) {
          setMessages(data.messages.map(msg => ({
            id: msg._id || Date.now(),
            text: msg.text,
            sender: msg.sender,
            timestamp: new Date(msg.timestamp)
          })));
        } else {
          setMessages([{
            id: Date.now(),
            text: bot.greeting,
            sender: 'bot',
            timestamp: new Date()
          }]);
        }
      } catch (error) {
        console.error('Error loading chat:', error);
        setMessages([{
          id: Date.now(),
          text: bot.greeting,
          sender: 'bot',
          timestamp: new Date()
        }]);
      }
    } else {
      setMessages([{
        id: Date.now(),
        text: bot.greeting,
        sender: 'bot',
        timestamp: new Date()
      }]);
    }
  };

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || !selectedBot) return;

    const token = getToken();
    if (!token) {
      alert('Please log in to chat with bots');
      return;
    }

    const messageText = inputMessage.trim();
    const userMessage = {
      id: Date.now(),
      text: messageText,
      sender: 'user',
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsTyping(true);

    try {
      const response = await fetch(`${API_URL}/emotion-bots/${selectedBot.id}/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ message: messageText })
      });

      const data = await response.json();

      if (data.success && data.message) {
        const botResponse = {
          id: Date.now() + 1,
          text: data.message.text,
          sender: 'bot',
          timestamp: new Date(data.message.timestamp)
        };
        setMessages(prev => [...prev, botResponse]);
      } else {
        throw new Error(data.error || 'Failed to get response');
      }
    } catch (error) {
      console.error('Error sending message:', error);
      const errorMessage = {
        id: Date.now() + 1,
        text: "I'm having trouble connecting right now. Please try again.",
        sender: 'bot',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsTyping(false);
    }
  };

  const CreateBotModal = () => {
    const [formData, setFormData] = useState({
      name: '',
      description: '',
      greeting: '',
      customPrompt: '',
      color: '#6B9080',
      imageUrl: ''
    });
    const [creating, setCreating] = useState(false);

    const handleCreate = async () => {
      if (!formData.name || !formData.description || !formData.greeting) {
        alert('Please fill in all required fields');
        return;
      }

      const token = getToken();
      if (!token) {
        alert('Please log in to create a bot');
        return;
      }

      setCreating(true);

      try {
        const response = await fetch(`${API_URL}/emotion-bots`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            name: formData.name,
            description: formData.description,
            greeting: formData.greeting,
            customPrompt: formData.customPrompt,
            color: formData.color,
            imageUrl: formData.imageUrl || null
          })
        });

        const data = await response.json();

        if (data.success) {
          await loadBots();
          setShowCreateModal(false);
          alert('Bot created successfully!');
        } else {
          throw new Error(data.error || 'Failed to create bot');
        }
      } catch (error) {
        console.error('Error creating bot:', error);
        alert('Failed to create bot: ' + error.message);
      } finally {
        setCreating(false);
      }
    };

    return (
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: '20px'
      }}>
        <div style={{
          backgroundColor: 'white',
          borderRadius: '16px',
          padding: '32px',
          maxWidth: '600px',
          width: '100%',
          maxHeight: '90vh',
          overflowY: 'auto'
        }}>
          <h2 style={{ margin: '0 0 24px 0', fontSize: '24px', fontWeight: '600', color: '#1e293b' }}>
            Create Your Emotion Bot
          </h2>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '500', color: '#475569' }}>
                Bot Name *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                placeholder="e.g., Peaceful Mind, Energy Booster"
                disabled={creating}
                style={{
                  width: '100%',
                  padding: '12px',
                  border: '2px solid #e2e8f0',
                  borderRadius: '8px',
                  fontSize: '15px',
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '500', color: '#475569' }}>
                Description *
              </label>
              <input
                type="text"
                value={formData.description}
                onChange={(e) => setFormData({...formData, description: e.target.value})}
                placeholder="Brief description of what this bot helps with"
                disabled={creating}
                style={{
                  width: '100%',
                  padding: '12px',
                  border: '2px solid #e2e8f0',
                  borderRadius: '8px',
                  fontSize: '15px',
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '500', color: '#475569' }}>
                Greeting Message *
              </label>
              <textarea
                value={formData.greeting}
                onChange={(e) => setFormData({...formData, greeting: e.target.value})}
                placeholder="First message users see when they start chatting"
                disabled={creating}
                style={{
                  width: '100%',
                  padding: '12px',
                  border: '2px solid #e2e8f0',
                  borderRadius: '8px',
                  fontSize: '15px',
                  outline: 'none',
                  minHeight: '80px',
                  fontFamily: 'inherit',
                  resize: 'vertical',
                  boxSizing: 'border-box'
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '500', color: '#475569' }}>
                Custom Personality Prompt
              </label>
              <textarea
                value={formData.customPrompt}
                onChange={(e) => setFormData({...formData, customPrompt: e.target.value})}
                placeholder="Describe how this bot should behave and respond (optional)"
                disabled={creating}
                style={{
                  width: '100%',
                  padding: '12px',
                  border: '2px solid #e2e8f0',
                  borderRadius: '8px',
                  fontSize: '15px',
                  outline: 'none',
                  minHeight: '100px',
                  fontFamily: 'inherit',
                  resize: 'vertical',
                  boxSizing: 'border-box'
                }}
              />
            </div>

            <div style={{ display: 'flex', gap: '20px' }}>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '500', color: '#475569' }}>
                  Bot Color
                </label>
                <input
                  type="color"
                  value={formData.color}
                  onChange={(e) => setFormData({...formData, color: e.target.value})}
                  disabled={creating}
                  style={{ width: '100%', height: '50px', border: '2px solid #e2e8f0', borderRadius: '8px', cursor: 'pointer' }}
                />
              </div>
              <div style={{ flex: 2 }}>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '500', color: '#475569' }}>
                  Image URL (optional)
                </label>
                <input
                  type="text"
                  value={formData.imageUrl}
                  onChange={(e) => setFormData({...formData, imageUrl: e.target.value})}
                  placeholder="https://..."
                  disabled={creating}
                  style={{
                    width: '100%',
                    padding: '12px',
                    border: '2px solid #e2e8f0',
                    borderRadius: '8px',
                    fontSize: '15px',
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                />
              </div>
            </div>

            <div style={{ display: 'flex', gap: '12px', marginTop: '12px' }}>
              <button
                onClick={() => setShowCreateModal(false)}
                disabled={creating}
                style={{
                  flex: 1,
                  padding: '14px',
                  border: '2px solid #e2e8f0',
                  borderRadius: '8px',
                  fontSize: '15px',
                  fontWeight: '500',
                  cursor: 'pointer',
                  backgroundColor: 'white',
                  color: '#64748b'
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleCreate}
                disabled={creating}
                style={{
                  flex: 1,
                  padding: '14px',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '15px',
                  fontWeight: '500',
                  cursor: 'pointer',
                  backgroundColor: '#6B9080',
                  color: 'white'
                }}
              >
                {creating ? 'Creating...' : 'Create Bot'}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const ChatModal = () => {
    if (!selectedBot) return null;

    return (
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.6)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 999,
        padding: '20px',
        animation: 'fadeIn 0.2s ease-out'
      }}>
        <div style={{
          backgroundColor: 'white',
          borderRadius: '24px',
          width: '100%',
          maxWidth: '800px',
          height: '85vh',
          maxHeight: '700px',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
          overflow: 'hidden',
          animation: 'slideUp 0.3s ease-out'
        }}>
          <div style={{
            padding: '20px 24px',
            borderBottom: '1px solid #e2e8f0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div style={{
                width: '48px',
                height: '48px',
                borderRadius: '50%',
                backgroundColor: `${selectedBot.color}15`,
                border: `3px solid ${selectedBot.color}30`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                overflow: 'hidden'
              }}>
                {selectedBot.imageUrl ? (
                  <img src={selectedBot.imageUrl} alt={selectedBot.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <span style={{ fontSize: '24px' }}>🤖</span>
                )}
              </div>
              <div>
                <h3 style={{ margin: '0', fontSize: '18px', fontWeight: '700', color: '#1e293b' }}>
                  {selectedBot.name}
                </h3>
                <p style={{ margin: '2px 0 0 0', fontSize: '13px', color: '#64748b', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    backgroundColor: '#10b981',
                    display: 'inline-block',
                    animation: isTyping ? 'pulse 2s infinite' : 'none'
                  }} />
                  {isTyping ? 'typing...' : 'Online'}
                </p>
              </div>
            </div>
            <button
              onClick={() => { setSelectedBot(null); setMessages([]); setInputMessage(''); }}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: '8px',
                borderRadius: '10px',
                display: 'flex',
                alignItems: 'center',
                color: '#64748b',
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#f1f5f9';
                e.currentTarget.style.color = '#1e293b';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
                e.currentTarget.style.color = '#64748b';
              }}
            >
              <X size={24} />
            </button>
          </div>

          <div style={{
            flex: 1,
            overflowY: 'auto',
            padding: '24px',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
            background: 'linear-gradient(180deg, #f8fafc 0%, #ffffff 100%)'
          }}>
            {messages.map((message) => (
              <div key={message.id} style={{
                display: 'flex',
                justifyContent: message.sender === 'user' ? 'flex-end' : 'flex-start',
                animation: 'messageSlide 0.3s ease-out'
              }}>
                <div style={{
                  maxWidth: '75%',
                  display: 'flex',
                  gap: '12px',
                  flexDirection: message.sender === 'user' ? 'row-reverse' : 'row'
                }}>
                  {message.sender === 'bot' && (
                    <div style={{
                      width: '36px',
                      height: '36px',
                      borderRadius: '50%',
                      backgroundColor: `${selectedBot.color}15`,
                      border: `2px solid ${selectedBot.color}30`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                      overflow: 'hidden'
                    }}>
                      {selectedBot.imageUrl ? (
                        <img src={selectedBot.imageUrl} alt={selectedBot.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : (
                        <span style={{ fontSize: '18px' }}>🤖</span>
                      )}
                    </div>
                  )}
                  <div>
                    <div style={{
                      backgroundColor: message.sender === 'user' ? selectedBot.color : 'white',
                      color: message.sender === 'user' ? 'white' : '#1e293b',
                      padding: '12px 18px',
                      borderRadius: message.sender === 'user' ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                      boxShadow: message.sender === 'user' 
                        ? `0 4px 12px ${selectedBot.color}40`
                        : '0 2px 8px rgba(0,0,0,0.08)',
                      fontSize: '15px',
                      lineHeight: '1.5',
                      border: message.sender === 'bot' ? '1px solid #e2e8f0' : 'none'
                    }}>
                      {message.text}
                    </div>
                    <p style={{
                      margin: '6px 8px 0',
                      fontSize: '11px',
                      color: '#94a3b8',
                      textAlign: message.sender === 'user' ? 'right' : 'left'
                    }}>
                      {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
              </div>
            ))}
            
            {isTyping && (
              <div style={{ display: 'flex', gap: '12px', animation: 'messageSlide 0.3s ease-out' }}>
                <div style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '50%',
                  backgroundColor: `${selectedBot.color}15`,
                  border: `2px solid ${selectedBot.color}30`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}>
                  <span style={{ fontSize: '18px' }}>🤖</span>
                </div>
                <div style={{
                  backgroundColor: 'white',
                  padding: '16px 20px',
                  borderRadius: '18px 18px 18px 4px',
                  border: '1px solid #e2e8f0',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.08)'
                }}>
                  <div style={{ display: 'flex', gap: '5px', alignItems: 'center' }}>
                    {[0, 1, 2].map(i => (
                      <div key={i} style={{
                        width: '8px',
                        height: '8px',
                        borderRadius: '50%',
                        backgroundColor: selectedBot.color,
                        animation: 'bounce 1.4s infinite',
                        animationDelay: `${i * 0.2}s`
                      }} />
                    ))}
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <div style={{
            padding: '20px 24px',
            borderTop: '1px solid #e2e8f0',
            backgroundColor: 'white'
          }}>
            <div style={{
              display: 'flex',
              gap: '12px',
              alignItems: 'flex-end'
            }}>
              <button style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '10px', color: '#64748b', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Smile size={20} />
              </button>
              <textarea
                ref={inputRef}
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
                placeholder="Type your message..."
                style={{
                  flex: 1,
                  padding: '14px 18px',
                  border: '2px solid #e2e8f0',
                  borderRadius: '16px',
                  fontSize: '15px',
                  resize: 'none',
                  fontFamily: 'inherit',
                  outline: 'none',
                  minHeight: '52px',
                  maxHeight: '120px'
                }}
                rows={1}
              />
              <button
                onClick={handleSendMessage}
                disabled={!inputMessage.trim()}
                style={{
                  backgroundColor: inputMessage.trim() ? selectedBot.color : '#e2e8f0',
                  color: 'white',
                  border: 'none',
                  borderRadius: '14px',
                  padding: '14px 18px',
                  cursor: inputMessage.trim() ? 'pointer' : 'not-allowed',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.2s',
                  boxShadow: inputMessage.trim() ? `0 4px 12px ${selectedBot.color}40` : 'none'
                }}
              >
                <Send size={20} />
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', fontSize: '18px', color: '#64748b' }}>
        Loading bots...
      </div>
    );
  }

  if (error && !selectedBot) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', height: '100vh', gap: '16px' }}>
        <p style={{ fontSize: '18px', color: '#ef4444' }}>{error}</p>
        <button
          onClick={loadBots}
          style={{ padding: '12px 24px', backgroundColor: '#6B9080', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '15px', fontWeight: '500' }}
        >
          Retry
        </button>
      </div>
    );
  }

  const filteredBots = getFilteredBots();
  const totalBotsCount = searchQuery.trim() 
    ? allBots.filter(bot => 
        bot.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        bot.description.toLowerCase().includes(searchQuery.toLowerCase())
      ).length
    : allBots.length;

  return (
    <>
      {/* Chat Modal - Rendered separately */}
      {selectedBot && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.6)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 999,
          padding: '20px',
          animation: 'fadeIn 0.2s ease-out'
        }}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '24px',
            width: '100%',
            maxWidth: '800px',
            height: '85vh',
            maxHeight: '700px',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
            overflow: 'hidden',
            animation: 'slideUp 0.3s ease-out'
          }}>
            <div style={{
              padding: '20px 24px',
              borderBottom: '1px solid #e2e8f0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <div style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: '50%',
                  backgroundColor: `${selectedBot.color}15`,
                  border: `3px solid ${selectedBot.color}30`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  overflow: 'hidden'
                }}>
                  {selectedBot.imageUrl ? (
                    <img src={selectedBot.imageUrl} alt={selectedBot.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <span style={{ fontSize: '24px' }}>🤖</span>
                  )}
                </div>
                <div>
                  <h3 style={{ margin: '0', fontSize: '18px', fontWeight: '700', color: '#1e293b' }}>
                    {selectedBot.name}
                  </h3>
                  <p style={{ margin: '2px 0 0 0', fontSize: '13px', color: '#64748b', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{
                      width: '8px',
                      height: '8px',
                      borderRadius: '50%',
                      backgroundColor: '#10b981',
                      display: 'inline-block',
                      animation: isTyping ? 'pulse 2s infinite' : 'none'
                    }} />
                    {isTyping ? 'typing...' : 'Online'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => { setSelectedBot(null); setMessages([]); setInputMessage(''); }}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '8px',
                  borderRadius: '10px',
                  display: 'flex',
                  alignItems: 'center',
                  color: '#64748b',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#f1f5f9';
                  e.currentTarget.style.color = '#1e293b';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                  e.currentTarget.style.color = '#64748b';
                }}
              >
                <X size={24} />
              </button>
            </div>

            <div style={{
              flex: 1,
              overflowY: 'auto',
              padding: '24px',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
              background: 'linear-gradient(180deg, #f8fafc 0%, #ffffff 100%)'
            }}>
              {messages.map((message) => (
                <div key={message.id} style={{
                  display: 'flex',
                  justifyContent: message.sender === 'user' ? 'flex-end' : 'flex-start',
                  animation: 'messageSlide 0.3s ease-out'
                }}>
                  <div style={{
                    maxWidth: '75%',
                    display: 'flex',
                    gap: '12px',
                    flexDirection: message.sender === 'user' ? 'row-reverse' : 'row'
                  }}>
                    {message.sender === 'bot' && (
                      <div style={{
                        width: '36px',
                        height: '36px',
                        borderRadius: '50%',
                        backgroundColor: `${selectedBot.color}15`,
                        border: `2px solid ${selectedBot.color}30`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                        overflow: 'hidden'
                      }}>
                        {selectedBot.imageUrl ? (
                          <img src={selectedBot.imageUrl} alt={selectedBot.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        ) : (
                          <span style={{ fontSize: '18px' }}>🤖</span>
                        )}
                      </div>
                    )}
                    <div>
                      <div style={{
                        backgroundColor: message.sender === 'user' ? selectedBot.color : 'white',
                        color: message.sender === 'user' ? 'white' : '#1e293b',
                        padding: '12px 18px',
                        borderRadius: message.sender === 'user' ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                        boxShadow: message.sender === 'user' 
                          ? `0 4px 12px ${selectedBot.color}40`
                          : '0 2px 8px rgba(0,0,0,0.08)',
                        fontSize: '15px',
                        lineHeight: '1.5',
                        border: message.sender === 'bot' ? '1px solid #e2e8f0' : 'none'
                      }}>
                        {message.text}
                      </div>
                      <p style={{
                        margin: '6px 8px 0',
                        fontSize: '11px',
                        color: '#94a3b8',
                        textAlign: message.sender === 'user' ? 'right' : 'left'
                      }}>
                        {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
              
              {isTyping && (
                <div style={{ display: 'flex', gap: '12px', animation: 'messageSlide 0.3s ease-out' }}>
                  <div style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '50%',
                    backgroundColor: `${selectedBot.color}15`,
                    border: `2px solid ${selectedBot.color}30`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0
                  }}>
                    <span style={{ fontSize: '18px' }}>🤖</span>
                  </div>
                  <div style={{
                    backgroundColor: 'white',
                    padding: '16px 20px',
                    borderRadius: '18px 18px 18px 4px',
                    border: '1px solid #e2e8f0',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.08)'
                  }}>
                    <div style={{ display: 'flex', gap: '5px', alignItems: 'center' }}>
                      {[0, 1, 2].map(i => (
                        <div key={i} style={{
                          width: '8px',
                          height: '8px',
                          borderRadius: '50%',
                          backgroundColor: selectedBot.color,
                          animation: 'bounce 1.4s infinite',
                          animationDelay: `${i * 0.2}s`
                        }} />
                      ))}
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            <div style={{
              padding: '20px 24px',
              borderTop: '1px solid #e2e8f0',
              backgroundColor: 'white'
            }}>
              <div style={{
                display: 'flex',
                gap: '12px',
                alignItems: 'flex-end'
              }}>
                <button style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '10px', color: '#64748b', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Smile size={20} />
                </button>
                <input
                  type="text"
                  ref={inputRef}
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage();
                    }
                  }}
                  placeholder="Type your message..."
                  style={{
                    flex: 1,
                    padding: '14px 18px',
                    border: '2px solid #e2e8f0',
                    borderRadius: '16px',
                    fontSize: '15px',
                    fontFamily: 'inherit',
                    outline: 'none',
                    height: '52px'
                  }}
                />
                <button
                  onClick={handleSendMessage}
                  disabled={!inputMessage.trim()}
                  style={{
                    backgroundColor: inputMessage.trim() ? selectedBot.color : '#e2e8f0',
                    color: 'white',
                    border: 'none',
                    borderRadius: '14px',
                    padding: '14px 18px',
                    cursor: inputMessage.trim() ? 'pointer' : 'not-allowed',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'all 0.2s',
                    boxShadow: inputMessage.trim() ? `0 4px 12px ${selectedBot.color}40` : 'none'
                  }}
                >
                  <Send size={20} />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div style={{ borderRadius: '12px', padding: '24px', maxWidth: '900px', margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <h2 style={{ fontSize: '28px', fontWeight: '600', color: '#1e293b', margin: 0 }}>Talk to AI Emotion Bots</h2>
          <button onClick={() => setShowCreateModal(true)} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 20px', backgroundColor: '#6B9080', color: 'white', border: 'none', borderRadius: '10px', fontSize: '15px', fontWeight: '500', cursor: 'pointer' }}>
            <Plus size={20} />
            Create Bot
          </button>
        </div>

        <div style={{ marginBottom: '24px' }}>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search bots by name or description..."
            style={{
              width: '100%',
              padding: '14px 16px',
              border: '2px solid #e2e8f0',
              borderRadius: '12px',
              fontSize: '15px',
              outline: 'none',
              boxSizing: 'border-box'
            }}
          />
        </div>

        <div style={{ display: 'flex', gap: '24px', marginBottom: '20px', borderBottom: '1px solid #e2e8f0' }}>
          {tabs.map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                style={{ background: 'none', border: 'none', padding: '12px 0', fontSize: '14px', fontWeight: activeTab === tab.id ? '600' : '400', color: activeTab === tab.id ? '#1e293b' : '#94a3b8', cursor: 'pointer', borderBottom: activeTab === tab.id ? '2px solid #6B9080' : '2px solid transparent', marginBottom: '-1px', display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                <Icon size={16} />
                {tab.label}
              </button>
            );
          })}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {filteredBots.map(bot => (
            <div key={bot.id} onClick={() => handleBotSelect(bot)} style={{ backgroundColor: 'white', border: '2px solid #e2e8f0', borderRadius: '16px', padding: '20px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', transition: 'all 0.2s ease' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flex: 1 }}>
                <div style={{ width: '56px', height: '56px', borderRadius: '50%', backgroundColor: `${bot.color}20`, border: `2px solid ${bot.color}40`, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', flexShrink: 0 }}>
                  {bot.imageUrl ? (
                    <img src={bot.imageUrl} alt={bot.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <span style={{ fontSize: '28px' }}>🤖</span>
                  )}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                    <h3 style={{ margin: '0', fontSize: '18px', fontWeight: '600', color: '#1e293b' }}>{bot.name}</h3>
                    {!bot.isDefault && (
                      <span style={{ fontSize: '11px', padding: '2px 8px', backgroundColor: '#6B908020', color: '#6B9080', borderRadius: '4px', fontWeight: '500' }}>
                        by {bot.creator}
                      </span>
                    )}
                  </div>
                  <p style={{ margin: '4px 0 8px 0', fontSize: '14px', color: '#64748b' }}>{bot.description}</p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px', fontSize: '12px', color: '#94a3b8' }}>
                    {bot.rating > 0 && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Star size={14} fill="#F4B942" color="#F4B942" />
                        <span>{bot.rating.toFixed(1)}</span>
                      </div>
                    )}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Users size={14} />
                      <span>{bot.chats} chats</span>
                    </div>
                  </div>
                </div>
              </div>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" style={{ color: bot.color, flexShrink: 0 }}>
                <path d="M9 18l6-6-6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
          ))}
        </div>

        {totalBotsCount > 5 && (
          <div style={{ display: 'flex', justifyContent: 'center', marginTop: '24px' }}>
            <button
              onClick={() => setShowAllBots(!showAllBots)}
              style={{
                padding: '12px 32px',
                backgroundColor: 'white',
                color: '#6B9080',
                border: '2px solid #6B9080',
                borderRadius: '10px',
                fontSize: '15px',
                fontWeight: '500',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#6B9080';
                e.currentTarget.style.color = 'white';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'white';
                e.currentTarget.style.color = '#6B9080';
              }}
            >
              {showAllBots ? 'Show Less' : `See More (${totalBotsCount - 5} more bots)`}
            </button>
          </div>
        )}
      </div>

      {showCreateModal && <CreateBotModal />}

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slideUp {
          from { 
            opacity: 0;
            transform: translateY(20px);
          }
          to { 
            opacity: 1;
            transform: translateY(0);
          }
        }
        @keyframes messageSlide {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @keyframes bounce {
          0%, 60%, 100% { transform: translateY(0); }
          30% { transform: translateY(-10px); }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
    </>
  );
};

export default EmotionChatApp;