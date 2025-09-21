// src/pages/DailyJournal.jsx
import React, { useState, useEffect, useRef } from 'react';
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

// Use environment variable or fallback
const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:5000";

// ✅ Function defined OUTSIDE the component
const enhancePromptWithGemini = async (journalText) => {
  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${import.meta.env.VITE_GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: `The user shared the following journal entry:\n\n"${journalText}"\n\n
Transform these emotions into a positive, uplifting, and cinematic image prompt.  

Guidelines:
- Always turn sadness, anger, or loneliness into visuals of hope, peace, or renewal.  
- Avoid disturbing or depressing imagery (no crying faces, violence, or dark visuals).  
- Use nature, light, color, and artistic symbolism to create comforting scenes.  
- Make it dreamy, painterly, and soothing — something that uplifts mental health.  
- Style: soft, artistic, emotional yet hopeful, like a professional painting or photograph.  

Output only the final artistic image prompt, nothing else.`,
                },
              ],
            },
          ],
        }),
      }
    );

    const data = await response.json();
    return data?.candidates?.[0]?.content?.parts?.[0]?.text || journalText;
  } catch (error) {
    console.error("Gemini enhancement failed:", error);
    return `A warm and comforting scene with soft light, nature, and peaceful colors that inspire hope and healing.`; // fallback
  }
};
const getMoodEmoji = (mood) => {
  const emojis = {
    happy: "😊",
    sad: "😢",
    angry: "😡",
    relaxed: "😌",
    anxious: "😰",
    neutral: "🙂",
    excited: "🤩",
    tired: "🥱",
    lonely: "🥺",
    love: "❤️",
  };
  return emojis[mood?.toLowerCase()] || "🤔";
};

const makeImagePrompt = (journalText) => {
  return `
  An expressive illustration that captures the feeling: "${journalText}". 
  Show it visually in an artistic, cinematic way that conveys the emotions of the text.
  `;
};

const DailyJournal = () => {
  const [inputMode, setInputMode] = useState("");
  const [textInput, setTextInput] = useState("");
  const [voiceInput, setVoiceInput] = useState("");
  const [selectedOption, setSelectedOption] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [output, setOutput] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [isDark, setIsDark] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(false);

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
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const recognitionRef = useRef(null);

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const isSupported =
      !!SpeechRecognition && !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
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
          const transcriptPart = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalTranscript += transcriptPart;
          } else {
            interimTranscript += transcriptPart;
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
        try { mediaRecorderRef.current.stop(); } catch {}
      }
    };
  }, []);

  useEffect(() => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      setSpeechSupported(true);

      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;
      recognitionRef.current.lang = 'en-US';
      recognitionRef.current.onresult = (event) => {
        let finalTranscript = '';
        let interimTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcriptPart = event.results[i][0].transcript;
          if (event.results[i].isFinal) finalTranscript += transcriptPart;
          else interimTranscript += transcriptPart;
        }
        setVoiceInput(prevInput => prevInput + finalTranscript);
      };
      recognitionRef.current.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        setIsRecording(false);
      };
      recognitionRef.current.onend = () => setIsRecording(false);
    }
  }, []);

  const [songs, setSongs] = useState([]);
  const [story, setStory] = useState("");
  const [poem, setPoem] = useState("");

  const handleInputModeChange = (mode) => {
    setInputMode(mode);
    setTextInput("");
    setVoiceInput("");
    if (isRecording) {
      recognitionRef.current?.stop();
      setIsRecording(false);
    }
  };

  const toggleRecording = () => {
    if (!speechSupported) {
      alert('Speech recognition is not supported in this browser. Please use Chrome, Edge, or Safari.');
      return;
    }
    if (isRecording) {
      recognitionRef.current?.stop();
      setIsRecording(false);
    } else {
      setVoiceInput("");
      recognitionRef.current?.start();
      setIsRecording(true);
    }
  };

  const toggleTheme = () => {
    setIsDark(!isDark);
    document.documentElement.classList.toggle("dark");
  };

  const buildYouTubeSearchUrl = (title = "", artist = "") => {
    let q = `${title || ""} ${artist || ""}`.trim();
    q = q.replace(/[\n\r]+/g, " ");
    q = q.replace(/["'`‘’“”]/g, "");
    q = q.replace(/[\/\\|]/g, " ");
    q = q.replace(/\s+/g, " ").trim();
    if (!q) q = "music";
    return `https://www.youtube.com/results?search_query=${encodeURIComponent(q)}`;
  };

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
    if (recognitionRef.current) recognitionRef.current.stop();
    setIsListening(false);
  };

  const toggleListening = () => {
    if (isListening) stopListening();
    else startListening();
  };

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
        if (event.data.size > 0) audioChunksRef.current.push(event.data);
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

  const playRecording = () => {
    if (audioBlob) {
      const audio = new Audio(URL.createObjectURL(audioBlob));
      audio.play();
    }
  };

  // Mood detection
  const detectMood = async () => {
    let textToAnalyze = "";
    if (inputMode === "text") textToAnalyze = textInput.trim();
    else if (inputMode === "voice") textToAnalyze = transcript.trim();
    if (!textToAnalyze) {
      alert("Please enter some text or record your voice first!");
      return;
    }
    setIsMoodDetecting(true);
    try {
      const response = await fetch(`${API_BASE}/api/detect-mood`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: textToAnalyze }),
      });
      if (!response.ok) throw new Error('Mood detection failed');
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

  const closeMoodPopup = () => setShowMoodPopup(false);

  // Generate Output
  const generateOutput = async () => {
    const currentInput = inputMode === "text" ? textInput : voiceInput || transcript;
    if (!currentInput?.trim()) return;
    if (!selectedOption) return;

    setIsGenerating(true);
    setOutput("");
    setSongs([]);
    setStory("");
    setPoem("");

    try {
      if (selectedOption === "image") {
        const visualPrompt = await enhancePromptWithGemini(currentInput);
        // Example: call your image generation backend (stability.ai etc.)
        const resp = await fetch(`${API_BASE}/api/generate-image`, { // adjust endpoint to your backend
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ prompt: visualPrompt }),
        });
        if (!resp.ok) throw new Error('Image generation failed');
        const data = await resp.json();
        // Expect data.image to be data URL or base64 — adapt as necessary
        const imageDataUrl = data.image?.startsWith('data:') ? data.image : `data:image/png;base64,${data.image}`;
        setOutput({ type: "image", content: imageDataUrl, prompt: visualPrompt });
      } else if (selectedOption === "song") {
        const resp = await fetch(`${API_BASE}/api/songs`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: currentInput }),
        });
        if (!resp.ok) throw new Error('Song generation failed');
        const data = await resp.json();
        setSongs(Array.isArray(data.songs) ? data.songs : []);
      } else if (selectedOption === "poem") {
        const resp = await fetch(`${API_BASE}/api/creative`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: currentInput }),
        });
        if (!resp.ok) throw new Error('Creative generation failed');
        const data = await resp.json();
        setStory(data.story || "");
        setPoem(data.poem || "");
      }
    } catch (err) {
      console.error("generateOutput error:", err);
      setOutput({ type: "text", content: "⚠️ Something went wrong. Please try again." });
    } finally {
      setIsGenerating(false);
    }
  };

  // -------------------------
  // Upload to Community helper
  // -------------------------
  const [uploading, setUploading] = useState(false);
  const uploadToCommunity = async ({ title = "", content = "", image = null, type = "text" }) => {
    setUploading(true);
    try {
      const token = localStorage.getItem("token");
      const body = { title: title || "", content: content || "", image: image || null, type };
      const resp = await fetch(`${API_BASE}/api/community`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(body),
      });
      if (!resp.ok) {
        const err = await resp.json().catch(() => ({}));
        throw new Error(err.error || err.message || `Status ${resp.status}`);
      }
      const data = await resp.json();
      alert("Shared to community!");
      return data;
    } catch (err) {
      console.error("Upload to community failed:", err);
      alert("Failed to share: " + (err.message || "Unknown error"));
      return null;
    } finally {
      setUploading(false);
    }
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
                        title="Detect mood"
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
                            <button className="play-btn" onClick={playRecording}>
                              <Play className="icon-sm" />
                              <span>Play</span>
                            </button>
                          )}
                        </div>

                        {transcript && (
                          <div className="transcript-display">
                            <h4>Transcript:</h4>
                            <p>{transcript}</p>
                          </div>
                        )}

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
                  disabled={
                    (inputMode === "text" && !textInput.trim()) ||
                    (inputMode === "voice" && !voiceInput.trim() && !transcript.trim()) ||
                    !selectedOption ||
                    isGenerating ||
                    !inputMode
                  }
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
                      <p className="loading-text">
                        {selectedOption === "image" ? "Generating your image..." : "Generating content..."}
                      </p>
                    </div>
                  ) : selectedOption === "song" ? (
                    songs && songs.length > 0 ? (
                      <div className="song-list">
                        {songs.map((s, idx) => {
                          const title = s.title || "Untitled";
                          const artist = s.artist || "";
                          const url = s.url && s.url.length > 0 ? s.url : buildYouTubeSearchUrl(title, artist);

                          return (
                            <div className="song-card" key={idx}>
                              <a href={url} target="_blank" rel="noreferrer" className="song-link">
                                <div className="song-title">{title}</div>
                                <div className="song-artist">{artist}</div>
                              </a>
                              <div style={{ marginTop: 8, fontSize: 12, color: "#666", wordBreak: "break-all" }}>{url}</div>
                              {s.reason && <div className="song-reason">{s.reason}</div>}

                              {/* Share the song suggestion to community */}
                              <div style={{ marginTop: 8 }}>
                                <button
                                  className="btn primary"
                                  onClick={() =>
                                    uploadToCommunity({
                                      title: `Song suggestion: ${title}`,
                                      content: `Song: ${title}\nArtist: ${artist}\nLink: ${url}`,
                                      type: "text"
                                    })
                                  }
                                  disabled={uploading}
                                >
                                  {uploading ? "Sharing…" : "Share to Community"}
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="empty-state">
                        <div className="empty-icon"><MessageSquare className="icon" /></div>
                        <div className="empty-content">
                          <h3 className="empty-title">No suggestions yet</h3>
                          <p className="empty-text">Write about your day and press Generate to get song recommendations.</p>
                        </div>
                      </div>
                    )
                  ) : selectedOption === "poem" ? (
                    (story || poem) ? (
                      <div className="creative-list">
                        {story && (
                          <div className="creative-card">
                            <h3 className="creative-title">Short Inspiration</h3>
                            <div className="creative-body">{story}</div>
                            <div style={{ marginTop: 8 }}>
                              <button
                                className="btn primary"
                                onClick={() =>
                                  uploadToCommunity({
                                    title: "Short Inspiration",
                                    content: story,
                                    type: "text"
                                  })
                                }
                                disabled={uploading}
                              >
                                {uploading ? "Sharing…" : "Share to Community"}
                              </button>
                            </div>
                          </div>
                        )}

                        {poem && (
                          <div className="creative-card">
                            <h3 className="creative-title">Poem</h3>
                            <pre className="creative-poem">{poem}</pre>
                            <div style={{ marginTop: 8 }}>
                              <button
                                className="btn primary"
                                onClick={() =>
                                  uploadToCommunity({
                                    title: "Poem",
                                    content: poem,
                                    type: "text"
                                  })
                                }
                                disabled={uploading}
                              >
                                {uploading ? "Sharing…" : "Share to Community"}
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="empty-state">
                        <div className="empty-icon"><MessageSquare className="icon" /></div>
                        <div className="empty-content">
                          <h3 className="empty-title">No content yet</h3>
                          <p className="empty-text">Write about your day and press Generate to get a story and a poem.</p>
                        </div>
                      </div>
                    )
                  ) : output ? (
                    <div className="output-content">
                      {output.type === "image" ? (
                        <div className="image-output">
                          <img src={output.content} alt="Generated artwork" className="generated-image" />
                          <p className="image-prompt">Based on: "{output.prompt}"</p>
                          <div className="action-buttons" style={{ marginTop: 8 }}>
                            <button
                              className="btn primary"
                              onClick={() =>
                                uploadToCommunity({
                                  title: "Generated image",
                                  content: output.prompt || "",
                                  image: output.content,
                                  type: "image"
                                })
                              }
                              disabled={uploading}
                            >
                              {uploading ? "Sharing…" : "Share to Community"}
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="output-text">
                          {output.content || output}
                          <div style={{ marginTop: 8 }}>
                            <button
                              className="btn primary"
                              onClick={() =>
                                uploadToCommunity({
                                  title: "Generated content",
                                  content: typeof output.content === "string" ? output.content : JSON.stringify(output),
                                  type: "text"
                                })
                              }
                              disabled={uploading}
                            >
                              {uploading ? "Sharing…" : "Share to Community"}
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="empty-state">
                      <div className="empty-icon"><MessageSquare className="icon" /></div>
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
      </div> {/* container */}

      {/* Mood Detection Popup */}
      {showMoodPopup && moodResult && (
        <div className="mood-popup-overlay">
          <div className="mood-popup">
            <div className="mood-popup-header">
              <h3 className="mood-popup-title">
                Mood Detected {getMoodEmoji(moodResult.detectedMood)}
              </h3>
              <button className="mood-popup-close" onClick={closeMoodPopup}>
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
                      <p className="mood-confidence">Confidence: {Math.round(moodResult.confidence * 100)}%</p>
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
                      <li key={index} className="suggestion-item">{tip}</li>
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
                            <span className="prediction-emoji">{getMoodEmoji(prediction.label)}</span>
                            <span className="prediction-label">{prediction.label}</span>
                            <span className="prediction-score">{Math.round(prediction.score * 100)}%</span>
                          </div>
                        ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="mood-popup-actions">
              <button className="mood-action-btn secondary" onClick={closeMoodPopup}>Close</button>
              <button className="mood-action-btn primary" onClick={() => { closeMoodPopup(); /* optionally save mood */ }}>
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
