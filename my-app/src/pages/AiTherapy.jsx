import React, { useState, useRef, useEffect } from 'react';

import './AiTherapy.css';

const VoiceChatTherapy = () => {

  const [isListening, setIsListening] = useState(false);

  const [isProcessing, setIsProcessing] = useState(false);

  const [isPlaying, setIsPlaying] = useState(false);

  const [transcript, setTranscript] = useState('');

  const [conversation, setConversation] = useState([]);

  const [conversationHistory, setConversationHistory] = useState(''); // Full conversation as string

  const [error, setError] = useState('');

  const [showSummary, setShowSummary] = useState(false);

  const [conversationSummary, setConversationSummary] = useState('');

  const [suggestedExercises, setSuggestedExercises] = useState([]);

  const [crisisDetected, setCrisisDetected] = useState(false);

  const [showCrisisModal, setShowCrisisModal] = useState(false);

  const [sessionEnded, setSessionEnded] = useState(false);

  const [showFullTranscript, setShowFullTranscript] = useState(true);

  

  const mediaRecorderRef = useRef(null);

  const audioChunksRef = useRef([]);

  const audioRef = useRef(null);

  const recognitionRef = useRef(null);

  const conversationStartTime = useRef(new Date());

  // Crisis keywords for detection

  const crisisKeywords = [

    'suicide', 'kill myself', 'end it all', 'want to die', 'hurt myself',

    'self harm', 'cutting', 'overdose', 'jump off', 'hang myself',

    'worthless', 'hopeless', 'no point', 'better off dead', 'suicidal'

  ];

  // Helpline numbers

  const helplines = {

    US: { name: 'National Suicide Prevention Lifeline', number: '988' },

    UK: { name: 'Samaritans', number: '116 123' },

    India: { name: 'AASRA', number: '91-22-27546669' },

    Australia: { name: 'Lifeline', number: '13 11 14' },

    Canada: { name: 'Talk Suicide Canada', number: '1-833-456-4566' }

  };

  // Therapy exercises database

  const therapyExercises = [

    {

      name: "4-7-8 Breathing",

      description: "Inhale for 4 counts, hold for 7, exhale for 8. Repeat 4 times.",

      duration: "2-3 minutes",

      type: "anxiety"

    },

    {

      name: "Progressive Muscle Relaxation",

      description: "Tense and release each muscle group, starting from your toes to your head.",

      duration: "10-15 minutes",

      type: "stress"

    },

    {

      name: "5-4-3-2-1 Grounding",

      description: "Name 5 things you see, 4 you can touch, 3 you hear, 2 you smell, 1 you taste.",

      duration: "3-5 minutes",

      type: "anxiety"

    },

    {

      name: "Gratitude Journal",

      description: "Write down 3 things you're grateful for today, no matter how small.",

      duration: "5 minutes",

      type: "depression"

    },

    {

      name: "Mindful Walking",

      description: "Walk slowly, focusing on each step and your surroundings.",

      duration: "10-20 minutes",

      type: "stress"

    },

    {

      name: "Thought Challenging",

      description: "Write down a negative thought and challenge it with evidence and alternatives.",

      duration: "10 minutes",

      type: "depression"

    }

  ];

  // Initialize speech recognition

  useEffect(() => {

    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {

      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

      recognitionRef.current = new SpeechRecognition();

      recognitionRef.current.continuous = false;

      recognitionRef.current.interimResults = true;

      recognitionRef.current.lang = 'en-US';

      recognitionRef.current.onresult = (event) => {

        let finalTranscript = '';

        let interimTranscript = '';

        

        for (let i = event.resultIndex; i < event.results.length; i++) {

          if (event.results[i].isFinal) {

            finalTranscript += event.results[i][0].transcript;

          } else {

            interimTranscript += event.results[i][0].transcript;

          }

        }

        

        if (finalTranscript) {

          setTranscript(finalTranscript);

          // Check for crisis keywords

          detectCrisis(finalTranscript);

          // Auto-process immediately when we get final transcript

          setTimeout(() => {

            processConversationAuto(finalTranscript);

          }, 1000);

        } else {

          setTranscript(interimTranscript);

        }

      };

      recognitionRef.current.onerror = (event) => {

        setError('Speech recognition error: ' + event.error);

        setIsListening(false);

      };

      recognitionRef.current.onend = () => {

        setIsListening(false);

      };

    }

  }, []);

  // Crisis detection function

  const detectCrisis = (text) => {

    const lowerText = text.toLowerCase();

    const crisisFound = crisisKeywords.some(keyword => lowerText.includes(keyword));

    

    if (crisisFound) {

      setCrisisDetected(true);

      setShowCrisisModal(true);

    }

  };

  // Add message to conversation history - FIXED VERSION

  const addToConversationHistory = (speaker, message) => {

    const newEntry = `${speaker}: ${message.trim()}`;

    setConversationHistory(prevHistory => {

      const updatedHistory = prevHistory ? `${prevHistory}\n${newEntry}` : newEntry;

      return updatedHistory;

    });

    return conversationHistory ? `${conversationHistory}\n${newEntry}` : newEntry;

  };

  // Generate conversation summary using Gemini

  const generateSummary = async () => {

    if (conversation.length === 0) return;

    try {

      const apiKey = import.meta.env.VITE_GEMINI_API_KEY;

      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${apiKey}`, {

        method: 'POST',

        headers: {

          'Content-Type': 'application/json',

        },

        body: JSON.stringify({

          contents: [{

            parts: [{

              text: `Please provide a therapeutic summary of this conversation session. Include:

1. Main themes discussed

2. Emotional state progression

3. Key insights or breakthroughs

4. Recommendations for future sessions

Conversation:

${conversationHistory}

Please format this as a professional therapy session summary:`

            }]

          }],

          generationConfig: {

            temperature: 0.3,

            maxOutputTokens: 500,

          }

        }),

      });

      const data = await response.json();

      if (data.candidates?.[0]?.content?.parts?.[0]?.text) {

        setConversationSummary(data.candidates[0].content.parts[0].text.trim());

        setShowSummary(true);

      }

    } catch (error) {

      console.error('Summary generation error:', error);

      setError('Unable to generate summary at this time.');

    }

  };

  // Suggest therapy exercises based on conversation

  const suggestExercises = () => {

    const conversationText = conversationHistory.toLowerCase();

    const suggested = [];

    if (conversationText.includes('anxious') || conversationText.includes('worried') || conversationText.includes('panic')) {

      suggested.push(...therapyExercises.filter(ex => ex.type === 'anxiety'));

    }

    if (conversationText.includes('sad') || conversationText.includes('depressed') || conversationText.includes('down')) {

      suggested.push(...therapyExercises.filter(ex => ex.type === 'depression'));

    }

    if (conversationText.includes('stress') || conversationText.includes('overwhelmed') || conversationText.includes('pressure')) {

      suggested.push(...therapyExercises.filter(ex => ex.type === 'stress'));

    }

    // If no specific triggers, suggest general exercises

    if (suggested.length === 0) {

      suggested.push(therapyExercises[0], therapyExercises[2], therapyExercises[3]);

    }

    setSuggestedExercises([...new Set(suggested)]); // Remove duplicates

  };

  // Call Gemini API with full conversation context

  const callGeminiAPI = async (userMessage, fullConversationHistory) => {

    try {

      const apiKey = import.meta.env.VITE_GEMINI_API_KEY;

      

      if (!apiKey) {

        throw new Error('Gemini API key not found in environment variables');

      }

      console.log('Sending to AI - Full conversation history:', fullConversationHistory); // Debug log

      // Enhanced prompt with full conversation context

      const enhancedPrompt = `You are Alex, a compassionate AI therapist. You provide supportive, empathetic responses to help users with their mental health. 

IMPORTANT INSTRUCTIONS: 

- If you detect any mention of self-harm, suicide, or crisis situations, acknowledge their pain with empathy but strongly encourage them to seek immediate professional help.

- ALWAYS read and remember the COMPLETE conversation history provided below.

- Reference previous parts of the conversation when appropriate to show you're listening and remembering.

- If the user asks what they said before, summarize their previous messages accurately.

- Keep responses conversational and under 3 sentences for voice interaction.

- Build upon what has been discussed previously and show continuity.

COMPLETE CONVERSATION HISTORY (READ ALL OF THIS):

${fullConversationHistory}

Based on this COMPLETE conversation history above, respond as Alex the therapist. Remember everything the user has told you and reference it when appropriate. The user's most recent message is the last line in the conversation history.`;

      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${apiKey}`, {

        method: 'POST',

        headers: {

          'Content-Type': 'application/json',

        },

        body: JSON.stringify({

          contents: [{

            parts: [{

              text: enhancedPrompt

            }]

          }],

          generationConfig: {

            temperature: 0.7,

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

        throw new Error(`Gemini API error: ${response.status}`);

      }

      const data = await response.json();

      

      if (data.candidates && data.candidates[0] && data.candidates[0].content) {

        return data.candidates[0].content.parts[0].text.trim();

      } else {

        throw new Error('Invalid response format from Gemini API');

      }

    } catch (error) {

      console.error('Gemini API error:', error);

      return 'I apologize, but I\'m having trouble connecting right now. Please try again in a moment.';

    }

  };

  // Call ElevenLabs TTS API

  const callElevenLabsTTS = async (text) => {

    const apiKey = import.meta.env.VITE_ELEVENLABS_API_KEY;

    const voiceId = import.meta.env.VITE_ELEVENLABS_VOICE_ID || '21m00Tcm4TlvDq8ikWAM';

    

    if (!apiKey) {

      console.warn('ElevenLabs API key not found in environment variables');

      return null;

    }

    if (!text || text.trim().length === 0) {

      console.warn('No text provided for TTS');

      return null;

    }

    try {

      const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {

        method: 'POST',

        headers: {

          'Accept': 'audio/mpeg',

          'Content-Type': 'application/json',

          'xi-api-key': apiKey,

        },

        body: JSON.stringify({

          text: text.trim(),

          model_id: 'eleven_monolingual_v1',

          voice_settings: {

            stability: 0.5,

            similarity_boost: 0.5,

          },

        }),

      });

      if (!response.ok) {

        const errorText = await response.text();

        console.error('ElevenLabs API error:', response.status, errorText);

        throw new Error(`ElevenLabs API error: ${response.status} - ${errorText}`);

      }

      const audioBlob = await response.blob();

      return audioBlob;

    } catch (error) {

      console.error('ElevenLabs TTS error:', error);

      throw error;

    }

  };

  // Start listening

  const startListening = () => {

    if (sessionEnded) {

      setError('Session has ended. Please start a new session.');

      return;

    }

    

    setError('');

    setTranscript('');

    

    if (recognitionRef.current) {

      setIsListening(true);

      recognitionRef.current.start();

    } else {

      setError('Speech recognition not supported in this browser');

    }

  };

  // Stop listening

  const stopListening = () => {

    if (recognitionRef.current && isListening) {

      recognitionRef.current.stop();

    }

    setIsListening(false);

  };

  // FIXED Auto-process the conversation with proper history management

  const processConversationAuto = async (userMessage) => {

    if (!userMessage || !userMessage.trim()) return;

    setIsProcessing(true);

    setIsListening(false);

    setTranscript('');

    try {

      // Add user message to conversation array

      const userEntry = { type: 'user', message: userMessage.trim(), timestamp: new Date() };

      setConversation(prev => [...prev, userEntry]);

      

      // Add user message to conversation history using the function

      const updatedHistoryWithUser = addToConversationHistory('User', userMessage.trim());

      

      console.log('Conversation history before AI call:', updatedHistoryWithUser);

      

      // Get AI response using the updated conversation history

      const aiResponse = await callGeminiAPI(userMessage.trim(), updatedHistoryWithUser);

      

      // Add AI response to conversation array

      const aiEntry = { type: 'ai', message: aiResponse, timestamp: new Date() };

      setConversation(prev => [...prev, aiEntry]);

      

      // Add AI response to conversation history using the function

      addToConversationHistory('AI', aiResponse);

      

      // Suggest exercises after every few exchanges

      setTimeout(() => {

        setConversation(currentConversation => {

          if (currentConversation.length > 4 && currentConversation.length % 6 === 0) {

            suggestExercises();

          }

          return currentConversation;

        });

      }, 1000);

      try {

        const audioBlob = await callElevenLabsTTS(aiResponse);

        

        if (audioBlob && audioRef.current) {

          const audioUrl = URL.createObjectURL(audioBlob);

          audioRef.current.src = audioUrl;

          setIsPlaying(true);

          await audioRef.current.play();

        }

      } catch (ttsError) {

        console.warn('TTS failed, continuing without audio:', ttsError);

      }

    } catch (error) {

      console.error('Conversation processing error:', error);

      setError('I apologize, I\'m having trouble right now. Please try speaking again.');

    } finally {

      setIsProcessing(false);

    }

  };

  // Handle audio playback end

  const handleAudioEnd = () => {

    setIsPlaying(false);

    if (audioRef.current?.src) {

      URL.revokeObjectURL(audioRef.current.src);

    }

  };

  // Export/Save transcript

  const exportTranscript = () => {

    if (!conversationHistory) {

      setError('No conversation to export.');

      return;

    }

    const sessionDate = conversationStartTime.current.toLocaleDateString();

    const sessionTime = conversationStartTime.current.toLocaleTimeString();

    

    const exportContent = `

THERAPY SESSION TRANSCRIPT

Date: ${sessionDate}

Time: ${sessionTime}

Duration: ${Math.round((new Date() - conversationStartTime.current) / (1000 * 60))} minutes

FULL CONVERSATION:

${conversationHistory}

${conversationSummary ? `\nSESSION SUMMARY:\n${conversationSummary}` : ''}

${suggestedExercises.length > 0 ? `\nRECOMMENDED EXERCISES:\n${suggestedExercises.map(ex => `• ${ex.name}: ${ex.description} (${ex.duration})`).join('\n')}` : ''}

---

Generated by AI Therapy Assistant

Remember: This is supplementary support. Please consult with a licensed therapist for comprehensive care.

    `;

    const blob = new Blob([exportContent], { type: 'text/plain' });

    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');

    a.href = url;

    a.download = `therapy-session-${sessionDate.replace(/\//g, '-')}-${Date.now()}.txt`;

    document.body.appendChild(a);

    a.click();

    document.body.removeChild(a);

    URL.revokeObjectURL(url);

  };

  // End conversation - Enhanced version

  const endConversation = async () => {

    // Stop all ongoing processes

    setIsListening(false);

    setIsProcessing(false);

    setIsPlaying(false);

    setSessionEnded(true);

    

    if (recognitionRef.current && isListening) {

      recognitionRef.current.stop();

    }

    

    // Generate summary if we have a conversation

    if (conversation.length > 0) {

      await generateSummary();

      suggestExercises();

      

      // Auto-export transcript

      setTimeout(() => {

        exportTranscript();

      }, 2000);

    }

  };

  // Clear conversation and history - FIXED

  const clearConversation = () => {

    setConversation([]);

    setConversationHistory(''); // Clear the history string properly

    setTranscript('');

    setError('');

    setShowSummary(false);

    setConversationSummary('');

    setSuggestedExercises([]);

    setCrisisDetected(false);

    conversationStartTime.current = new Date();

  };

  // Start new session

  const startNewSession = () => {

    clearConversation();

    setSessionEnded(false);

    setShowFullTranscript(true);

  };

  // Close crisis modal

  const closeCrisisModal = () => {

    setShowCrisisModal(false);

  };

  return (

    <div className="voice-therapy-container">

      <div className="therapy-interface">

        {/* Crisis Detection Modal */}

        {showCrisisModal && (

          <div className="crisis-modal-overlay">

            <div className="crisis-modal">

              <div className="crisis-header">

                <h2>🚨 Immediate Support Available</h2>

              </div>

              <div className="crisis-content">

                <p>I'm concerned about what you've shared. You're not alone, and help is available right now.</p>

                

                <div className="helplines">

                  <h3>Crisis Helplines:</h3>

                  {Object.entries(helplines).map(([country, info]) => (

                    <div key={country} className="helpline-item">

                      <strong>{info.name} ({country}):</strong>

                      <a href={`tel:${info.number}`} className="helpline-number">{info.number}</a>

                    </div>

                  ))}

                </div>

                

                <div className="crisis-actions">

                  <p><strong>Please consider:</strong></p>

                  <ul>

                    <li>Calling one of these helplines immediately</li>

                    <li>Going to your nearest emergency room</li>

                    <li>Contacting a trusted friend or family member</li>

                    <li>Reaching out to your therapist or doctor</li>

                  </ul>

                </div>

                

                <button className="crisis-close-btn" onClick={closeCrisisModal}>

                  I understand - Continue Session

                </button>

              </div>

            </div>

          </div>

        )}

        {/* AI Avatar */}

        <div className="ai-avatar">

          <div className={`avatar-orb ${isListening ? 'listening' : ''} ${isProcessing ? 'processing' : ''} ${isPlaying ? 'speaking' : ''} ${crisisDetected ? 'crisis' : ''} ${sessionEnded ? 'ended' : ''}`}>

            <iframe

              title="Spline Scene - Meeet"

              src="https://my.spline.design/meeet-mJCMHlwEum7Q9VDg1lMSTzes/"

              frameBorder="0"

              allowFullScreen

              style={{

                position: 'absolute',

                inset: 0,

                width: '100%',

                height: '100%',

                border: 0,

              }}

            />

          </div>

        </div>

        {/* Status Display */}

        <div className="status-display">

          {sessionEnded && <p className="status-text session-ended">Session Ended - Review your summary below</p>}

          {crisisDetected && !sessionEnded && <p className="status-text crisis-status">Crisis support activated - Help is available</p>}

          {!sessionEnded && isListening && <p className="status-text">Listening...</p>}

          {!sessionEnded && isProcessing && <p className="status-text">Processing your message...</p>}

          {!sessionEnded && isPlaying && <p className="status-text">Speaking...</p>}

          {!sessionEnded && !isListening && !isProcessing && !isPlaying && (

            <p className="status-text">Ready to listen</p>

          )}

        </div>

        {/* Transcript Display */}

        {transcript && !sessionEnded && (

          <div className="transcript-display">

            <p>You said: "{transcript}"</p>

          </div>

        )}

        {/* Error Display */}

        {error && (

          <div className="error-display">

            <p>{error}</p>

          </div>

        )}

        {/* Control Buttons */}

        <div className="control-buttons">

          {!sessionEnded ? (

            <>

              <button

                className={`voice-button ${isListening ? 'active' : ''}`}

                onClick={isListening ? stopListening : startListening}

                disabled={isProcessing || isPlaying}

              >

                {isListening ? 'Stop Talking' : 'Start Talking'}

              </button>

              

              <button

                className="end-conversation-button"

                onClick={endConversation}

                disabled={isProcessing || isPlaying}

                style={{ 

                  backgroundColor: '#dc3545', 

                  color: 'white',

                  marginLeft: '10px',

                  padding: '10px 20px',

                  border: 'none',

                  borderRadius: '5px',

                  cursor: 'pointer'

                }}

              >

                End Conversation

              </button>

              

              {conversationHistory && (

                <button

                  className="export-button"

                  onClick={exportTranscript}

                  style={{ 

                    backgroundColor: '#28a745', 

                    color: 'white',

                    marginLeft: '10px',

                    padding: '10px 20px',

                    border: 'none',

                    borderRadius: '5px',

                    cursor: 'pointer'

                  }}

                >

                  Export Transcript

                </button>

              )}

            </>

          ) : (

            <div>

              <button

                className="new-session-button"

                onClick={startNewSession}

                style={{ marginRight: '10px' }}

              >

                Start New Session

              </button>

              <button

                className="export-button"

                onClick={exportTranscript}

                style={{ 

                  backgroundColor: '#28a745', 

                  color: 'white',

                  padding: '10px 20px',

                  border: 'none',

                  borderRadius: '5px',

                  cursor: 'pointer'

                }}

              >

                Export Final Transcript

              </button>

            </div>

          )}

        </div>

        {/* Live Conversation History Display */}

        {conversationHistory && (

          <div className="conversation-transcript">

            <div className="transcript-header">

              <h3>Live Conversation History</h3>

              <div className="transcript-actions">

                <button 

                  className="toggle-transcript-btn"

                  onClick={() => setShowFullTranscript(!showFullTranscript)}

                >

                  {showFullTranscript ? 'Hide' : 'Show'} History

                </button>

                <div className="conversation-counter">

                  <span>Messages: {conversation.length}</span>

                </div>

                {!sessionEnded && (

                  <button 

                    className="clear-button" 

                    onClick={clearConversation}

                    style={{

                      backgroundColor: '#ffc107',

                      color: '#000',

                      border: 'none',

                      padding: '5px 10px',

                      borderRadius: '3px',

                      cursor: 'pointer'

                    }}

                  >

                    Clear History

                  </button>

                )}

              </div>

            </div>

            

            {showFullTranscript && (

              <div className="transcript-content" style={{

                maxHeight: '400px',

                overflowY: 'auto',

                backgroundColor: '#f8f9fa',

                padding: '15px',

                borderRadius: '8px',

                marginTop: '10px',

                border: '1px solid #dee2e6'

              }}>

                <div style={{

                  whiteSpace: 'pre-line',

                  fontFamily: 'monospace',

                  fontSize: '14px',

                  lineHeight: '1.5'

                }}>

                  {conversationHistory.split('\n').map((line, index) => {

                    const isUser = line.startsWith('User:');

                    const isAI = line.startsWith('AI:');

                    return (

                      <div 

                        key={index} 

                        style={{

                          marginBottom: '10px',

                          padding: '8px',

                          borderRadius: '5px',

                          backgroundColor: isUser ? '#e3f2fd' : isAI ? '#f3e5f5' : 'transparent',

                          borderLeft: isUser ? '4px solid #2196f3' : isAI ? '4px solid #9c27b0' : 'none'

                        }}

                      >

                        {line}

                      </div>

                    );

                  })}

                </div>

              </div>

            )}

          </div>

        )}

        {/* Suggested Exercises */}

        {suggestedExercises.length > 0 && (

          <div className="exercises-container">

            <h3>Recommended Exercises for You</h3>

            <div className="exercises-grid">

              {suggestedExercises.slice(0, 3).map((exercise, index) => (

                <div key={index} className="exercise-card">

                  <h4>{exercise.name}</h4>

                  <p>{exercise.description}</p>

                  <span className="exercise-duration">{exercise.duration}</span>

                </div>

              ))}

            </div>

          </div>

        )}

        {/* Session Summary */}

        {showSummary && (

          <div className="summary-container">

            <div className="summary-header">

              <h3>Session Summary</h3>

            </div>

            <div className="summary-content">

              {conversationSummary.split('\n').map((line, index) => (

                <p key={index}>{line}</p>

              ))}

            </div>

          </div>

        )}

        {/* Hidden audio element */}

        <audio

          ref={audioRef}

          onEnded={handleAudioEnd}

          style={{ display: 'none' }}

        />

      </div>

    </div>

  );

};

export default VoiceChatTherapy;