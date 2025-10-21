import React, {
  useState,
  useRef,
  useEffect,
  useCallback,
  useMemo,
} from "react";
import "./AiTherapy.css";

const VoiceChatTherapy = () => {
  // Core state
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [conversation, setConversation] = useState([]);
  const [conversationHistory, setConversationHistory] = useState("");
  const [error, setError] = useState("");

  // UI state
  const [showSummary, setShowSummary] = useState(false);
  const [conversationSummary, setConversationSummary] = useState("");
  const [suggestedExercises, setSuggestedExercises] = useState([]);
  const [crisisDetected, setCrisisDetected] = useState(false);
  const [showCrisisModal, setShowCrisisModal] = useState(false);
  const [sessionEnded, setSessionEnded] = useState(false);
  const [showFullTranscript, setShowFullTranscript] = useState(true);

  // Refs
  const recognitionRef = useRef(null);
  const audioRef = useRef(null);
  const conversationStartTime = useRef(new Date());
  const processingTimeoutRef = useRef(null);
  const ttsTimeoutRef = useRef(null);

  // Default ElevenLabs voice (Adam - calm, professional)
  const defaultVoice = "pNInz6obpgDQGcFmaJgB";

  // Memoized constants
  const crisisKeywords = useMemo(
    () => [
      "suicide",
      "kill myself",
      "end it all",
      "want to die",
      "hurt myself",
      "self harm",
      "cutting",
      "overdose",
      "jump off",
      "hang myself",
      "worthless",
      "hopeless",
      "no point",
      "better off dead",
      "suicidal",
    ],
    []
  );

  const helplines = useMemo(
    () => ({
      US: { name: "National Suicide Prevention Lifeline", number: "988" },
      UK: { name: "Samaritans", number: "116 123" },
      India: { name: "AASRA", number: "91-22-27546669" },
      Australia: { name: "Lifeline", number: "13 11 14" },
      Canada: { name: "Talk Suicide Canada", number: "1-833-456-4566" },
    }),
    []
  );

  const therapyExercises = useMemo(
    () => [
      {
        name: "4-7-8 Breathing",
        description:
          "Inhale for 4 counts, hold for 7, exhale for 8. Repeat 4 times.",
        duration: "2-3 minutes",
        type: "anxiety",
      },
      {
        name: "Progressive Muscle Relaxation",
        description:
          "Tense and release each muscle group, starting from your toes to your head.",
        duration: "10-15 minutes",
        type: "stress",
      },
      {
        name: "5-4-3-2-1 Grounding",
        description:
          "Name 5 things you see, 4 you can touch, 3 you hear, 2 you smell, 1 you taste.",
        duration: "3-5 minutes",
        type: "anxiety",
      },
      {
        name: "Gratitude Journal",
        description:
          "Write down 3 things you're grateful for today, no matter how small.",
        duration: "5 minutes",
        type: "depression",
      },
      {
        name: "Mindful Walking",
        description:
          "Walk slowly, focusing on each step and your surroundings.",
        duration: "10-20 minutes",
        type: "stress",
      },
      {
        name: "Thought Challenging",
        description:
          "Write down a negative thought and challenge it with evidence and alternatives.",
        duration: "10 minutes",
        type: "depression",
      },
    ],
    []
  );

  // Optimized speech recognition initialization
  useEffect(() => {
    let recognition = null;

    const initSpeechRecognition = () => {
      if (
        "webkitSpeechRecognition" in window ||
        "SpeechRecognition" in window
      ) {
        const SpeechRecognition =
          window.SpeechRecognition || window.webkitSpeechRecognition;
        recognition = new SpeechRecognition();

        // Optimized settings
        recognition.continuous = false;
        recognition.interimResults = true;
        recognition.lang = "en-US";
        recognition.maxAlternatives = 1;

        recognition.onresult = (event) => {
          let finalTranscript = "";
          let interimTranscript = "";

          for (let i = event.resultIndex; i < event.results.length; i++) {
            const transcript = event.results[i][0].transcript;
            if (event.results[i].isFinal) {
              finalTranscript += transcript;
            } else {
              interimTranscript += transcript;
            }
          }

          if (finalTranscript) {
            setTranscript(finalTranscript);
            detectCrisis(finalTranscript);

            // Debounced processing
            if (processingTimeoutRef.current) {
              clearTimeout(processingTimeoutRef.current);
            }
            processingTimeoutRef.current = setTimeout(() => {
              processConversationAuto(finalTranscript);
            }, 800);
          } else {
            setTranscript(interimTranscript);
          }
        };

        recognition.onerror = (event) => {
          console.error("Speech recognition error:", event.error);
          setError(`Speech recognition error: ${event.error}`);
          setIsListening(false);
        };

        recognition.onend = () => {
          setIsListening(false);
        };

        recognitionRef.current = recognition;
      }
    };

    initSpeechRecognition();

    return () => {
      if (recognition) {
        recognition.abort();
      }
      if (processingTimeoutRef.current) {
        clearTimeout(processingTimeoutRef.current);
      }
      if (ttsTimeoutRef.current) {
        clearTimeout(ttsTimeoutRef.current);
      }
    };
  }, []);

  // ElevenLabs TTS function
  const callElevenLabsTTS = useCallback(async (text) => {
    return new Promise(async (resolve) => {
      try {
        const apiKey = import.meta.env.VITE_ELEVENLABS_API_KEY;
        
        if (!apiKey) {
          console.warn("ElevenLabs API key not found, falling back to browser TTS");
          await callBrowserTTS(text);
          resolve();
          return;
        }

        if (!text?.trim()) {
          resolve();
          return;
        }

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 30000);

        const response = await fetch(
          `https://api.elevenlabs.io/v1/text-to-speech/${defaultVoice}`,
          {
            method: 'POST',
            headers: {
              'Accept': 'audio/mpeg',
              'Content-Type': 'application/json',
              'xi-api-key': apiKey
            },
            body: JSON.stringify({
              text: text.trim(),
              model_id: "eleven_monolingual_v1",
              voice_settings: {
                stability: 0.5,
                similarity_boost: 0.75,
                style: 0.0,
                use_speaker_boost: true
              }
            }),
            signal: controller.signal
          }
        );

        clearTimeout(timeoutId);

        if (!response.ok) {
          throw new Error(`ElevenLabs API error: ${response.status}`);
        }

        const arrayBuffer = await response.arrayBuffer();
        const blob = new Blob([arrayBuffer], { type: 'audio/mpeg' });
        const audioUrl = URL.createObjectURL(blob);
        
        if (audioRef.current) {
          audioRef.current.src = audioUrl;
          audioRef.current.onended = () => {
            URL.revokeObjectURL(audioUrl);
            resolve();
          };
          audioRef.current.onerror = () => {
            URL.revokeObjectURL(audioUrl);
            resolve();
          };
          audioRef.current.play().catch(() => resolve());
        } else {
          URL.revokeObjectURL(audioUrl);
          resolve();
        }

      } catch (error) {
        console.error("ElevenLabs TTS error:", error);
        // Fallback to browser TTS
        try {
          await callBrowserTTS(text);
          resolve();
        } catch (browserError) {
          console.error("Browser TTS fallback failed:", browserError);
          resolve();
        }
      }
    });
  }, []);

  // Browser TTS fallback
  const callBrowserTTS = useCallback(async (text) => {
    return new Promise((resolve) => {
      try {
        if (!window.speechSynthesis || !text?.trim()) {
          resolve();
          return;
        }

        window.speechSynthesis.cancel();

        setTimeout(() => {
          const utterance = new SpeechSynthesisUtterance(text.trim());

          // Get voices efficiently
          const voices = window.speechSynthesis.getVoices();
          const englishVoice = voices.find((voice) =>
            voice.lang.startsWith("en")
          );

          if (englishVoice) {
            utterance.voice = englishVoice;
          }

          utterance.rate = 1;
          utterance.volume = 1;
          utterance.pitch = 1;

          let hasStarted = false;

          utterance.onstart = () => {
            hasStarted = true;
          };

          utterance.onend = () => {
            resolve();
          };

          utterance.onerror = () => {
            resolve();
          };

          window.speechSynthesis.speak(utterance);

          // Timeout fallback
          ttsTimeoutRef.current = setTimeout(() => {
            if (!hasStarted) {
              window.speechSynthesis.cancel();
            }
            resolve();
          }, Math.min(text.length * 80, 12000));
        }, 50);
      } catch (error) {
        resolve();
      }
    });
  }, []);

  // Optimized crisis detection
  const detectCrisis = useCallback(
    (text) => {
      const lowerText = text.toLowerCase();
      const crisisFound = crisisKeywords.some((keyword) =>
        lowerText.includes(keyword)
      );

      if (crisisFound && !crisisDetected) {
        setCrisisDetected(true);
        setShowCrisisModal(true);
      }
    },
    [crisisKeywords, crisisDetected]
  );

  // Optimized conversation history management
  const addToConversationHistory = useCallback((speaker, message) => {
    const newEntry = `${speaker}: ${message.trim()}`;
    setConversationHistory((prevHistory) => {
      return prevHistory ? `${prevHistory}\n${newEntry}` : newEntry;
    });
  }, []);

  // Optimized Gemini API call
  const callGeminiAPI = useCallback(
    async (userMessage, fullConversationHistory) => {
      try {
        const apiKey = import.meta.env.VITE_GEMINI_API_KEY;

        if (!apiKey) {
          throw new Error("Gemini API key not found");
        }

        const enhancedPrompt = `You are Alex, a compassionate AI therapist. Provide supportive, empathetic responses.

INSTRUCTIONS: 
- Keep responses under 3 sentences for voice interaction
- Reference previous conversation when appropriate
- If detecting crisis situations, encourage professional help

CONVERSATION HISTORY:
${fullConversationHistory}

Respond as Alex the therapist to the user's most recent message.`;

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000);

        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              contents: [
                {
                  parts: [{ text: enhancedPrompt }],
                },
              ],
              generationConfig: {
                temperature: 0.7,
                topK: 40,
                topP: 0.95,
                maxOutputTokens: 120,
              },
            }),
            signal: controller.signal,
          }
        );

        clearTimeout(timeoutId);

        if (!response.ok) {
          throw new Error(`API error: ${response.status}`);
        }

        const data = await response.json();

        if (data.candidates?.[0]?.content?.parts?.[0]?.text) {
          return data.candidates[0].content.parts[0].text.trim();
        } else {
          throw new Error("Invalid response format");
        }
      } catch (error) {
        console.error("Gemini API error:", error);
        return "I'm having trouble connecting right now. Please try again.";
      }
    },
    []
  );

  // Main speak function
  const speakText = useCallback(
    async (text) => {
      if (!text?.trim()) return;

      setIsPlaying(true);
      try {
        await callElevenLabsTTS(text);
      } catch (error) {
        console.warn("TTS failed:", error);
      } finally {
        setIsPlaying(false);
      }
    },
    [callElevenLabsTTS]
  );

  const suggestExercises = useCallback(() => {
    if (!conversationHistory) return;

    const conversationText = conversationHistory.toLowerCase();
    const suggested = [];

    if (
      conversationText.includes("anxious") ||
      conversationText.includes("worried") ||
      conversationText.includes("panic")
    ) {
      suggested.push(...therapyExercises.filter((ex) => ex.type === "anxiety"));
    }
    if (
      conversationText.includes("sad") ||
      conversationText.includes("depressed") ||
      conversationText.includes("down")
    ) {
      suggested.push(
        ...therapyExercises.filter((ex) => ex.type === "depression")
      );
    }
    if (
      conversationText.includes("stress") ||
      conversationText.includes("overwhelmed") ||
      conversationText.includes("pressure")
    ) {
      suggested.push(...therapyExercises.filter((ex) => ex.type === "stress"));
    }

    if (suggested.length === 0) {
      suggested.push(
        therapyExercises[0],
        therapyExercises[2],
        therapyExercises[3]
      );
    }

    setSuggestedExercises([...new Set(suggested)]);
  }, [conversationHistory, therapyExercises]);

  // Optimized conversation processing
  const processConversationAuto = useCallback(
    async (userMessage) => {
      if (!userMessage?.trim() || isProcessing) return;

      setIsProcessing(true);
      setIsListening(false);
      setTranscript("");

      try {
        // Add user message
        const userEntry = {
          type: "user",
          message: userMessage.trim(),
          timestamp: new Date(),
        };
        setConversation((prev) => [...prev, userEntry]);

        // Update conversation history
        let updatedHistory = "";
        setConversationHistory((prevHistory) => {
          updatedHistory = prevHistory
            ? `${prevHistory}\nUser: ${userMessage.trim()}`
            : `User: ${userMessage.trim()}`;
          return updatedHistory;
        });

        // Wait for state update
        await new Promise((resolve) => setTimeout(resolve, 50));

        // Call Gemini with full conversation history
        const aiResponse = await callGeminiAPI(
          userMessage.trim(),
          updatedHistory
        );

        // Add AI response
        const aiEntry = {
          type: "ai",
          message: aiResponse,
          timestamp: new Date(),
        };
        setConversation((prev) => [...prev, aiEntry]);

        // Update history with AI response
        setConversationHistory(
          (prevHistory) => `${prevHistory}\nAI: ${aiResponse}`
        );

        // Speak response
        await speakText(aiResponse);

        // Suggest exercises periodically
        setConversation((currentConversation) => {
          if (
            currentConversation.length > 4 &&
            currentConversation.length % 6 === 0
          ) {
            setTimeout(() => suggestExercises(), 1000);
          }
          return currentConversation;
        });
      } catch (error) {
        console.error("Processing error:", error);
        setError("I'm having trouble right now. Please try speaking again.");
      } finally {
        setIsProcessing(false);
      }
    },
    [isProcessing, callGeminiAPI, speakText, suggestExercises]
  );

  // Event handlers
  const startListening = useCallback(() => {
    if (sessionEnded || isProcessing || isPlaying) return;

    setError("");
    setTranscript("");

    if (recognitionRef.current) {
      setIsListening(true);
      try {
        recognitionRef.current.start();
      } catch (error) {
        setError("Speech recognition failed to start");
        setIsListening(false);
      }
    } else {
      setError("Speech recognition not supported");
    }
  }, [sessionEnded, isProcessing, isPlaying]);

  const stopListening = useCallback(() => {
    if (recognitionRef.current && isListening) {
      recognitionRef.current.stop();
    }
    setIsListening(false);
  }, [isListening]);

  // Optimized summary generation
  const generateSummary = useCallback(async () => {
    if (conversation.length === 0) return;

    try {
      const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
      if (!apiKey) return;

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
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
                    text: `Provide a brief therapeutic summary of this conversation:
${conversationHistory}

Include: main themes, emotional progression, key insights, recommendations.
Keep it concise and professional.`,
                  },
                ],
              },
            ],
            generationConfig: {
              temperature: 0.3,
              maxOutputTokens: 400,
            },
          }),
          signal: controller.signal,
        }
      );

      clearTimeout(timeoutId);

      if (response.ok) {
        const data = await response.json();
        if (data.candidates?.[0]?.content?.parts?.[0]?.text) {
          setConversationSummary(
            data.candidates[0].content.parts[0].text.trim()
          );
          setShowSummary(true);
        }
      }
    } catch (error) {
      console.error("Summary generation error:", error);
    }
  }, [conversation.length, conversationHistory]);

  // Export function
  const exportTranscript = useCallback(() => {
    if (!conversationHistory) {
      setError("No conversation to export.");
      return;
    }

    const sessionDate = conversationStartTime.current.toLocaleDateString();
    const sessionTime = conversationStartTime.current.toLocaleTimeString();

    const exportContent = `THERAPY SESSION TRANSCRIPT
Date: ${sessionDate}
Time: ${sessionTime}
Duration: ${Math.round(
      (new Date() - conversationStartTime.current) / (1000 * 60)
    )} minutes
TTS: ElevenLabs AI Voice

CONVERSATION:
${conversationHistory}

${conversationSummary ? `\nSUMMARY:\n${conversationSummary}` : ""}
${
  suggestedExercises.length > 0
    ? `\nEXERCISES:\n${suggestedExercises
        .map((ex) => `• ${ex.name}: ${ex.description} (${ex.duration})`)
        .join("\n")}`
    : ""
}

---
Generated by AI Therapy Assistant with ElevenLabs TTS`;

    const blob = new Blob([exportContent], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `therapy-session-${sessionDate.replace(/\//g, "-")}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [conversationHistory, conversationSummary, suggestedExercises]);

  const endConversation = useCallback(async () => {
    setIsListening(false);
    setIsProcessing(false);
    setIsPlaying(false);
    setSessionEnded(true);

    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }

    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }

    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = "";
    }

    if (conversation.length > 0) {
      await generateSummary();
      suggestExercises();
      setTimeout(exportTranscript, 2000);
    }
  }, [
    conversation.length,
    generateSummary,
    suggestExercises,
    exportTranscript,
  ]);

  const clearConversation = useCallback(() => {
    setConversation([]);
    setConversationHistory("");
    setTranscript("");
    setError("");
    setShowSummary(false);
    setConversationSummary("");
    setSuggestedExercises([]);
    setCrisisDetected(false);
    conversationStartTime.current = new Date();
  }, []);

  const startNewSession = useCallback(() => {
    clearConversation();
    setSessionEnded(false);
    setShowFullTranscript(true);
  }, [clearConversation]);

  const closeCrisisModal = useCallback(() => {
    setShowCrisisModal(false);
  }, []);

  const handleAudioEnd = useCallback(() => {
    setIsPlaying(false);
    if (audioRef.current?.src) {
      URL.revokeObjectURL(audioRef.current.src);
      audioRef.current.src = "";
    }
  }, []);

  // Memoized components
  const CrisisModal = useMemo(() => {
    if (!showCrisisModal) return null;

    return (
      <div className="crisis-modal-overlay">
        <div className="crisis-modal">
          <div className="crisis-header">
            <h2>🚨 Immediate Support Available</h2>
          </div>
          <div className="crisis-content">
            <p>
              I'm concerned about what you've shared. You're not alone, and help
              is available right now.
            </p>

            <div className="helplines">
              <h3>Crisis Helplines:</h3>
              {Object.entries(helplines).map(([country, info]) => (
                <div key={country} className="helpline-item">
                  <strong>
                    {info.name} ({country}):
                  </strong>
                  <a href={`tel:${info.number}`} className="helpline-number">
                    {info.number}
                  </a>
                </div>
              ))}
            </div>

            <div className="crisis-actions">
              <p>
                <strong>Please consider:</strong>
              </p>
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
    );
  }, [showCrisisModal, helplines, closeCrisisModal]);

  const StatusDisplay = useMemo(() => {
    const getStatusText = () => {
      if (sessionEnded)
        return {
          text: "Session Ended - Review your summary below",
          className: "session-ended",
        };
      if (crisisDetected)
        return {
          text: "Crisis support activated - Help is available",
          className: "crisis-status",
        };
      if (isListening) return { text: "Listening...", className: "" };
      if (isProcessing)
        return { text: "Processing your message...", className: "" };
      if (isPlaying) return { 
        text: "Speaking with ElevenLabs AI voice...", 
        className: "" 
      };
      return { text: "Ready to listen", className: "" };
    };

    const status = getStatusText();
    return <p className={`status-text ${status.className}`}>{status.text}</p>;
  }, [sessionEnded, crisisDetected, isListening, isProcessing, isPlaying]);

  return (
    <div className="voice-therapy-container">
      <div className="therapy-interface">
        {CrisisModal}

        {/* AI Avatar */}
        <div className="ai-avatar">
          <div
            className={`avatar-orb ${isListening ? "listening" : ""} ${
              isProcessing ? "processing" : ""
            } ${isPlaying ? "speaking" : ""} ${
              crisisDetected ? "crisis" : ""
            } ${sessionEnded ? "ended" : ""}`}
          >
            <iframe
              title="Spline Scene - Meeet"
              src="https://my.spline.design/meeet-mJCMHlwEum7Q9VDg1lMSTzes/"
              frameBorder="0"
              allowFullScreen
              style={{
                position: "absolute",
                inset: 0,
                width: "100%",
                height: "100%",
                border: 0,
              }}
            />
          </div>
        </div>

        {/* Status Display */}
        <div className="status-display">{StatusDisplay}</div>

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
                className={`voice-button ${isListening ? "active" : ""}`}
                onClick={isListening ? stopListening : startListening}
                disabled={isProcessing || isPlaying}
              >
                {isListening ? "Stop Talking" : "Start Talking"}
              </button>

              <button
                className="end-conversation-button"
                onClick={endConversation}
                disabled={isProcessing || isPlaying}
                style={{
                  backgroundColor: "#dc3545",
                  color: "white",
                  marginLeft: "10px",
                  padding: "10px 20px",
                  border: "none",
                  borderRadius: "5px",
                  cursor: "pointer",
                }}
              >
                End Conversation
              </button>

              {conversationHistory && (
                <button
                  className="export-button"
                  onClick={exportTranscript}
                  style={{
                    backgroundColor: "#28a745",
                    color: "white",
                    marginLeft: "10px",
                    padding: "10px 20px",
                    border: "none",
                    borderRadius: "5px",
                    cursor: "pointer",
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
                style={{ marginRight: "10px" }}
              >
                Start New Session
              </button>
              <button
                className="export-button"
                onClick={exportTranscript}
                style={{
                  backgroundColor: "#28a745",
                  color: "white",
                  padding: "10px 20px",
                  border: "none",
                  borderRadius: "5px",
                  cursor: "pointer",
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
                  {showFullTranscript ? "Hide" : "Show"} History
                </button>
                <div className="conversation-counter">
                  <span>Messages: {conversation.length}</span>
                </div>
                {!sessionEnded && (
                  <button
                    className="clear-button"
                    onClick={clearConversation}
                    style={{
                      backgroundColor: "#ffc107",
                      color: "#000",
                      border: "none",
                      padding: "5px 10px",
                      borderRadius: "3px",
                      cursor: "pointer",
                    }}
                  >
                    Clear History
                  </button>
                )}
              </div>
            </div>

            {showFullTranscript && (
              <div
                className="transcript-content"
                style={{
                  maxHeight: "400px",
                  overflowY: "auto",
                  backgroundColor: "#f8f9fa",
                  padding: "15px",
                  borderRadius: "8px",
                  marginTop: "10px",
                  border: "1px solid #dee2e6",
                }}
              >
                <div
                  style={{
                    whiteSpace: "pre-line",
                    fontFamily: "monospace",
                    fontSize: "14px",
                    lineHeight: "1.5",
                  }}
                >
                  {conversationHistory.split("\n").map((line, index) => {
                    const isUser = line.startsWith("User:");
                    const isAI = line.startsWith("AI:");
                    return (
                      <div
                        key={index}
                        style={{
                          marginBottom: "10px",
                          padding: "8px",
                          borderRadius: "5px",
                          backgroundColor: isUser
                            ? "#424b52ff"
                            : isAI
                            ? "#412f44ff"
                            : "transparent",
                          borderLeft: isUser
                            ? "4px solid #2196f3"
                            : isAI
                            ? "4px solid #9c27b0"
                            : "none",
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
              {conversationSummary.split("\n").map((line, index) => (
                <p key={index}>{line}</p>
              ))}
            </div>
          </div>
        )}

        {/* Hidden audio element */}
        <audio
          ref={audioRef}
          onEnded={handleAudioEnd}
          style={{ display: "none" }}
        />
      </div>
    </div>
  );
};

export default VoiceChatTherapy;