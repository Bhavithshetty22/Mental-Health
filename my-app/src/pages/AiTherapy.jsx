import React, { useState, useRef, useEffect } from 'react';
import './VoiceChatTherapy.css';

const VoiceChatTherapy = () => {
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [conversation, setConversation] = useState([]);
  const [error, setError] = useState('');
  
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const audioRef = useRef(null);
  const recognitionRef = useRef(null);

  // Initialize speech recognition
  useEffect(() => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false; // Changed to false for natural pauses
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
          // Auto-process immediately when we get final transcript
          setTimeout(() => {
            processConversationAuto(finalTranscript);
          }, 1000); // Small delay to ensure user is done speaking
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
  }, [transcript]);

  // Call Gemini API for therapy response
  const callGeminiAPI = async (userMessage) => {
    try {
      const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
      
      if (!apiKey) {
        throw new Error('Gemini API key not found in environment variables');
      }

      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: `You are a compassionate AI therapist named Alex. Provide supportive, empathetic responses to help users with their mental health. Listen actively and offer helpful guidance. Keep responses conversational, warm, and under 3 sentences for natural voice interaction.

User message: ${userMessage}

Please respond as a caring therapist would:`
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
      console.log('Calling ElevenLabs TTS with voice ID:', voiceId);
      
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
      console.log('TTS successful, audio blob size:', audioBlob.size);
      return audioBlob;
    } catch (error) {
      console.error('ElevenLabs TTS error:', error);
      throw error;
    }
  };

  // Start listening (auto-stops when user finishes speaking)
  const startListening = () => {
    setError('');
    setTranscript('');
    
    if (recognitionRef.current) {
      setIsListening(true);
      recognitionRef.current.start();
    } else {
      setError('Speech recognition not supported in this browser');
    }
  };

  // Manual stop if needed
  const stopListening = () => {
    if (recognitionRef.current && isListening) {
      recognitionRef.current.stop();
    }
    setIsListening(false);
  };

  // Auto-process the conversation (no manual trigger needed)
  const processConversationAuto = async (userMessage) => {
    if (!userMessage || !userMessage.trim()) return;

    setIsProcessing(true);
    setIsListening(false); // Stop listening while processing
    
    // Add user message to conversation
    const newConversation = [...conversation, { type: 'user', message: userMessage.trim() }];
    setConversation(newConversation);
    setTranscript(''); // Clear transcript after processing

    try {
      // Get AI response from Gemini
      const aiResponse = await callGeminiAPI(userMessage.trim());
      
      // Add AI response to conversation
      const updatedConversation = [...newConversation, { type: 'ai', message: aiResponse }];
      setConversation(updatedConversation);

      // Convert response to speech using ElevenLabs
      try {
        const audioBlob = await callElevenLabsTTS(aiResponse);
        
        // Play the audio if TTS is available
        if (audioBlob && audioRef.current) {
          const audioUrl = URL.createObjectURL(audioBlob);
          audioRef.current.src = audioUrl;
          setIsPlaying(true);
          await audioRef.current.play();
        } else {
          // If no TTS, just show the response without audio
          console.log('TTS not available, showing text response only');
        }
      } catch (ttsError) {
        console.warn('TTS failed, continuing without audio:', ttsError);
        // Continue without audio - don't let TTS failure break the conversation
      }
    } catch (error) {
      console.error('Conversation processing error:', error);
      setError('I apologize, I\'m having trouble right now. Please try speaking again.');
    } finally {
      setIsProcessing(false);
    }
  };

  // Process the conversation (keeping for manual use if needed)
  const processConversation = async () => {
    if (!transcript.trim()) return;
    await processConversationAuto(transcript.trim());
  };

  // Handle audio playback end
  const handleAudioEnd = () => {
    setIsPlaying(false);
    if (audioRef.current?.src) {
      URL.revokeObjectURL(audioRef.current.src);
    }
  };

  // Clear conversation
  const clearConversation = () => {
    setConversation([]);
    setTranscript('');
    setError('');
  };

  return (
    <div className="voice-therapy-container">
      <div className="therapy-interface">
        {/* AI Avatar */}
        <div className="ai-avatar">
          <div className={`avatar-orb ${isListening ? 'listening' : ''} ${isProcessing ? 'processing' : ''} ${isPlaying ? 'speaking' : ''}`}>
            {/* Beautiful animated orb - you can replace this with your 3D model later */}
            <div className="orb-inner"></div>
            <div className="orb-particles"></div>
          </div>
        </div>

        {/* Status Display */}
        <div className="status-display">
          {isListening && <p className="status-text">Listening...</p>}
          {isProcessing && <p className="status-text">Processing your message...</p>}
          {isPlaying && <p className="status-text">Speaking...</p>}
          {!isListening && !isProcessing && !isPlaying && (
            <p className="status-text">Ready to listen</p>
          )}
        </div>

        {/* Transcript Display */}
        {transcript && (
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

        {/* Control Button */}
        <div className="control-buttons">
          <button
            className={`voice-button ${isListening ? 'active' : ''}`}
            onClick={isListening ? stopListening : startListening}
            disabled={isProcessing || isPlaying}
          >
            {isListening ? 'Stop Talking' : 'Start Talking'}
          </button>
        </div>

        {/* Conversation History */}
        {conversation.length > 0 && (
          <div className="conversation-history">
            <div className="conversation-header">
              <h3>Session History</h3>
              <button className="clear-button" onClick={clearConversation}>
                Clear
              </button>
            </div>
            <div className="conversation-list">
              {conversation.map((item, index) => (
                <div key={index} className={`conversation-item ${item.type}`}>
                  <div className="message-content">
                    <span className="message-label">
                      {item.type === 'user' ? 'You' : 'Therapist'}:
                    </span>
                    <p>{item.message}</p>
                  </div>
                </div>
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