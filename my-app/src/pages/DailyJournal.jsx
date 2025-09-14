import React, { useState, useRef, useEffect } from 'react';
import { 
  Mic, 
  MicOff, 
  Type, 
  Volume2, 
  MessageSquare, 
  Moon, 
  Sun, 
  Send,
  X,
  Heart,
  Lightbulb,
  Square,
  Play
} from 'lucide-react';
import './DailyJournal.css';

const DailyJournal = () => {
  const [inputMode, setInputMode] = useState("");
  const [textInput, setTextInput] = useState("");
  const [selectedOption, setSelectedOption] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [output, setOutput] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [isDark, setIsDark] = useState(false);
  
  // Voice-related states
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [voiceSupported, setVoiceSupported] = useState(false);
  const [audioBlob, setAudioBlob] = useState(null);
  
  // Mood detection states
  const [isMoodDetecting, setIsMoodDetecting] = useState(false);
  const [moodResult, setMoodResult] = useState(null);
  const [showMoodPopup, setShowMoodPopup] = useState(false);

  // Refs for voice functionality
  const recognitionRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);

  // Check for voice support on component mount
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const isSupported = SpeechRecognition && navigator.mediaDevices && navigator.mediaDevices.getUserMedia;
    setVoiceSupported(isSupported);

    if (isSupported) {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onresult = (event) => {
        let finalTranscript = '';
        let interimTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalTranscript += transcript;
          } else {
            interimTranscript += transcript;
          }
        }

        setTranscript(finalTranscript + interimTranscript);
      };

      recognition.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        setIsListening(false);
        if (event.error === 'not-allowed') {
          alert('Microphone access denied. Please allow microphone access and try again.');
        }
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      if (mediaRecorderRef.current) {
        mediaRecorderRef.current.stop();
      }
    };
  }, []);

  const handleInputModeChange = (mode) => {
    setInputMode(mode);
    setTextInput("");
    setTranscript("");
    setIsRecording(false);
    setIsListening(false);
    setAudioBlob(null);
    
    // Stop any ongoing recordings
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
  };

  const toggleTheme = () => {
    setIsDark(!isDark);
    document.documentElement.classList.toggle("dark");
  };

  // Voice recognition functions
  const startListening = async () => {
    if (!voiceSupported) {
      alert('Voice input is not supported in your browser. Please use Chrome or Edge.');
      return;
    }

    try {
      await navigator.mediaDevices.getUserMedia({ audio: true });
      setTranscript("");
      setIsListening(true);
      recognitionRef.current.start();
    } catch (error) {
      console.error('Error starting voice recognition:', error);
      alert('Could not access microphone. Please check your permissions.');
    }
  };

  const stopListening = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    setIsListening(false);
  };

  const toggleListening = () => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  };

  // Audio recording functions
  const startRecording = async () => {
    if (!voiceSupported) {
      alert('Audio recording is not supported in your browser.');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
        setAudioBlob(audioBlob);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (error) {
      console.error('Error starting audio recording:', error);
      alert('Could not start recording. Please check your microphone permissions.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
  };

  const toggleRecording = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  const playRecording = () => {
    if (audioBlob) {
      const audio = new Audio(URL.createObjectURL(audioBlob));
      audio.play();
    }
  };

  // Mood detection function
  const detectMood = async () => {
    let textToAnalyze = "";
    
    if (inputMode === "text") {
      textToAnalyze = textInput.trim();
    } else if (inputMode === "voice") {
      textToAnalyze = transcript.trim();
    }

    if (!textToAnalyze) {
      alert("Please enter some text or record your voice first!");
      return;
    }

    setIsMoodDetecting(true);
    
    try {
      const response = await fetch('http://localhost:5000/api/detect-mood', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text: textToAnalyze }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      setMoodResult(data);
      setShowMoodPopup(true);
      
    } catch (error) {
      console.error('Error detecting mood:', error);
      alert('Failed to detect mood. Please make sure the server is running.');
    } finally {
      setIsMoodDetecting(false);
    }
  };

  const closeMoodPopup = () => {
    setShowMoodPopup(false);
  };

  const generateOutput = async () => {
    let inputText = "";
    
    if (inputMode === "text") {
      inputText = textInput;
    } else if (inputMode === "voice") {
      inputText = transcript;
    }

    if (!inputText && !audioBlob) return;

    setIsGenerating(true);
    await new Promise((resolve) => setTimeout(resolve, 2000));

    const outputs = {
      image: "A serene landscape with soft pastel colors reflecting your peaceful state of mind.",
      song: '"Peaceful Moments" - A gentle acoustic melody with soft piano accompaniment.',
      poem: "In quiet moments of the day,\nYour thoughts like gentle breezes play.\nWith hope and peace within your heart,\nEach feeling plays its vital part.",
    };

    setOutput(outputs[selectedOption] || "Your journal entry has been processed successfully.");
    setIsGenerating(false);
  };

  // Get mood emoji based on detected mood
  const getMoodEmoji = (mood) => {
    const emojiMap = {
      joy: "😊",
      happiness: "😊",
      sadness: "😢",
      sad: "😢",
      anger: "😠",
      angry: "😠",
      fear: "😰",
      scared: "😰",
      surprise: "😮",
      surprised: "😮",
      disgust: "🤢",
      disgusted: "🤢",
      neutral: "😐"
    };
    return emojiMap[mood?.toLowerCase()] || "😐";
  };

  const hasInput = () => {
    if (inputMode === "text") {
      return textInput.trim().length > 0;
    } else if (inputMode === "voice") {
      return transcript.trim().length > 0 || audioBlob;
    }
    return false;
  };

  return (
    <div className={`app ${isDark ? "dark" : ""}`}>
      <div className="theme-toggle">
        <button onClick={toggleTheme} className="theme-btn">
          {isDark ? <Sun className="icon" /> : <Moon className="icon" />}
        </button>
      </div>

      <div className="container">
        <div className="grid">
          <div className="input-section">
            <div className="card">
              <div className="card-content">
                <div className="header">
                  <h2 className="title">How are you feeling today?</h2>
                  <p className="subtitle">Share your thoughts and get personalized content</p>
                </div>

                <div className="input-toggle">
                  <button
                    className={`toggle-btn ${inputMode === "text" ? "active" : ""}`}
                    onClick={() => handleInputModeChange("text")}
                  >
                    <Type className="icon-sm" />
                    <span>Text</span>
                  </button>
                  <button
                    className={`toggle-btn ${inputMode === "voice" ? "active" : ""}`}
                    onClick={() => handleInputModeChange("voice")}
                  >
                    <Volume2 className="icon-sm" />
                    <span>Voice</span>
                    {!voiceSupported && <span className="voice-warning">*</span>}
                  </button>
                </div>

                <div className="input-area">
                  {inputMode === "text" && (
                    <div className="text-input-container">
                      <textarea
                        value={textInput}
                        onChange={(e) => setTextInput(e.target.value)}
                        placeholder="Write about your day, thoughts, or feelings..."
                        className="textarea"
                      />
                      <button
                        className="send-btn"
                        onClick={detectMood}
                        disabled={!textInput.trim() || isMoodDetecting}
                      >
                        {isMoodDetecting ? (
                          <div className="loading-spinner"></div>
                        ) : (
                          <Send className="icon-sm" />
                        )}
                      </button>
                    </div>
                  )}

                  {inputMode === "voice" && (
                    <div className="voice-input">
                      {!voiceSupported && (
                        <div className="voice-not-supported">
                          <p>Voice input is not supported in your browser. Please use Chrome, Edge, or Safari for the best experience.</p>
                        </div>
                      )}
                      
                      <div className="voice-center">
                        {/* Speech Recognition */}
                        <div className="mic-container">
                          <button
                            className={`mic-btn ${isListening ? "listening" : ""}`}
                            onClick={toggleListening}
                            disabled={!voiceSupported}
                          >
                            {isListening ? <MicOff className="icon" /> : <Mic className="icon" />}
                          </button>
                          {isListening && <div className="pulse-ring"></div>}
                        </div>
                        <p className="voice-text">
                          {isListening ? "Listening... Click to stop" : "Tap to start speaking"}
                        </p>

                        {/* Audio Recording */}
                        <div className="recording-controls">
                          <button
                            className={`record-btn ${isRecording ? "recording" : ""}`}
                            onClick={toggleRecording}
                            disabled={!voiceSupported}
                          >
                            {isRecording ? (
                              <>
                                <Square className="icon-sm" />
                                <span>Stop Recording</span>
                              </>
                            ) : (
                              <>
                                <Mic className="icon-sm" />
                                <span>Record Audio</span>
                              </>
                            )}
                          </button>
                          
                          {audioBlob && (
                            <button
                              className="play-btn"
                              onClick={playRecording}
                            >
                              <Play className="icon-sm" />
                              <span>Play</span>
                            </button>
                          )}
                        </div>

                        {/* Transcript Display */}
                        {transcript && (
                          <div className="transcript-display">
                            <h4>Transcript:</h4>
                            <p>{transcript}</p>
                          </div>
                        )}

                        {/* Voice Mood Analysis Button */}
                        <button
                          className="voice-mood-btn"
                          onClick={detectMood}
                          disabled={(!transcript.trim() && !audioBlob) || isMoodDetecting}
                        >
                          {isMoodDetecting ? (
                            <>
                              <div className="loading-spinner"></div>
                              <span>Analyzing...</span>
                            </>
                          ) : (
                            "Analyze Mood"
                          )}
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                <select
                  value={selectedOption}
                  onChange={(e) => setSelectedOption(e.target.value)}
                  className="select"
                >
                  <option value="">Choose output format</option>
                  <option value="image">Image Description</option>
                  <option value="song">Song Suggestion</option>
                  <option value="poem">Poem or Story</option>
                </select>

                <button
                  className="generate-btn"
                  onClick={generateOutput}
                  disabled={!hasInput() || !selectedOption || isGenerating}
                >
                  {isGenerating ? "Generating..." : "Generate"}
                </button>
              </div>
            </div>
          </div>

          <div className="output-section">
            <div className="card">
              <div className="card-content">
                <div className="header">
                  <h2 className="title">Your Content</h2>
                  <p className="subtitle">Generated content will appear here</p>
                </div>

                <div className="output-area">
                  {isGenerating ? (
                    <div className="loading">
                      <div className="spinner"></div>
                      <p className="loading-text">Generating content...</p>
                    </div>
                  ) : output ? (
                    <div className="output-content">
                      <div className="output-text">
                        <p>{output}</p>
                      </div>
                      <div className="action-buttons">
                        <button className="save-btn">Save</button>
                        <button className="share-btn">Share</button>
                      </div>
                    </div>
                  ) : (
                    <div className="empty-state">
                      <div className="empty-icon">
                        <MessageSquare className="icon" />
                      </div>
                      <div className="empty-content">
                        <h3 className="empty-title">Ready to create</h3>
                        <p className="empty-text">Choose an input method to get started</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Mood Detection Popup */}
      {showMoodPopup && moodResult && (
        <div className="mood-popup-overlay">
          <div className="mood-popup">
            <div className="mood-popup-header">
              <h3 className="mood-popup-title">
                Mood Detected {getMoodEmoji(moodResult.detectedMood)}
              </h3>
              <button
                className="mood-popup-close"
                onClick={closeMoodPopup}
              >
                <X className="icon-sm" />
              </button>
            </div>
            
            <div className="mood-popup-content">
              <div className="mood-detection-result">
                <div className="detected-mood">
                  <div className="mood-main">
                    <span className="mood-emoji">{getMoodEmoji(moodResult.detectedMood)}</span>
                    <div className="mood-info">
                      <h4 className="mood-label">{moodResult.detectedMood}</h4>
                      <p className="mood-confidence">
                        Confidence: {Math.round(moodResult.confidence * 100)}%
                      </p>
                    </div>
                  </div>
                </div>

                <div className="mood-message">
                  <Heart className="icon-sm mood-heart" />
                  <p>{moodResult.suggestions.message}</p>
                </div>

                <div className="mood-suggestions">
                  <div className="suggestions-header">
                    <Lightbulb className="icon-sm" />
                    <h4>Suggestions for you:</h4>
                  </div>
                  <ul className="suggestions-list">
                    {moodResult.suggestions.tips.map((tip, index) => (
                      <li key={index} className="suggestion-item">
                        {tip}
                      </li>
                    ))}
                  </ul>
                </div>

                {moodResult.allPredictions && moodResult.allPredictions.length > 1 && (
                  <div className="all-predictions">
                    <h4>All detected emotions:</h4>
                    <div className="predictions-grid">
                      {moodResult.allPredictions
                        .sort((a, b) => b.score - a.score)
                        .slice(0, 3)
                        .map((prediction, index) => (
                          <div key={index} className="prediction-item">
                            <span className="prediction-emoji">
                              {getMoodEmoji(prediction.label)}
                            </span>
                            <span className="prediction-label">{prediction.label}</span>
                            <span className="prediction-score">
                              {Math.round(prediction.score * 100)}%
                            </span>
                          </div>
                        ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="mood-popup-actions">
              <button className="mood-action-btn secondary" onClick={closeMoodPopup}>
                Close
              </button>
              <button className="mood-action-btn primary" onClick={() => {
                closeMoodPopup();
                // You can add logic here to save the mood or do something with it
              }}>
                Save Mood
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DailyJournal;