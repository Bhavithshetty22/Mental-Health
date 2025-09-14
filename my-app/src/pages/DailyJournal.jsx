import React, { useState, useRef, useEffect } from 'react';
import { Mic, MicOff, Type, Volume2, MessageSquare, Moon, Sun } from 'lucide-react';
import './DailyJournal.css';
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
    return `A warm and comforting scene with soft light, nature, and peaceful colors that inspire hope and healing.`; // ✅ fallback
  }
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
  const recognitionRef = useRef(null);

  useEffect(() => {
    // Check if speech recognition is supported
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
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalTranscript += transcript;
          } else {
            interimTranscript += transcript;
          }
        }
        
        setVoiceInput(prevInput => prevInput + finalTranscript);
      };
      
      recognitionRef.current.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        setIsRecording(false);
      };
      
      recognitionRef.current.onend = () => {
        setIsRecording(false);
      };
    }
  }, []);

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

  const generateOutput = async () => {
  const currentInput = inputMode === "text" ? textInput : voiceInput;
  if (!currentInput.trim() && !isRecording) return;

  setIsGenerating(true);

  try {
    if (selectedOption === "image") {
      // 1️⃣ Enhance the raw input into an artistic healing prompt
      const visualPrompt = await enhancePromptWithGemini(currentInput);

      // 2️⃣ Send to Stability
      const formData = new FormData();
      formData.append("prompt", visualPrompt);
      formData.append("aspect_ratio", "1:1");

      const response = await fetch(
        "https://api.stability.ai/v2beta/stable-image/generate/core",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${import.meta.env.VITE_STABILITY_API_KEY}`,
            Accept: "application/json",
          },
          body: formData,
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      console.log("Stability API response:", data);

      if (data?.image) {
        setOutput({
          type: "image",
          content: `data:image/png;base64,${data.image}`,
          prompt: visualPrompt,
        });
      } else {
        setOutput({
          type: "text",
          content: "❌ No image returned. Check console for details.",
        });
      }
    }
  } catch (error) {
    console.error("Error during generation:", error);
    setOutput({
      type: "text",
      content: "⚠️ Something went wrong while generating. Please try again.",
    });
  } finally {
    setIsGenerating(false);
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
                  </button>
                </div>

                <div className="input-area">
                  {inputMode === "text" && (
                    <textarea
                      value={textInput}
                      onChange={(e) => setTextInput(e.target.value)}
                      placeholder="Write about your day, thoughts, or feelings..."
                      className="textarea"
                    />
                  )}

                  {inputMode === "voice" && (
                    <div className="voice-input">
                      <div className="voice-center">
                        <div className="mic-container">
                          <button
                            className={`mic-btn ${isRecording ? "recording" : ""}`}
                            onClick={toggleRecording}
                            disabled={!speechSupported}
                          >
                            {isRecording ? <MicOff className="icon" /> : <Mic className="icon" />}
                          </button>
                          {isRecording && <div className="pulse-ring"></div>}
                        </div>
                        <p className="voice-text">
                          {!speechSupported 
                            ? "Speech recognition not supported" 
                            : isRecording 
                            ? "Recording... Speak now" 
                            : "Tap to record"
                          }
                        </p>
                        {voiceInput && (
                          <div className="voice-transcript">
                            <p>"{voiceInput}"</p>
                          </div>
                        )}
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
                    (inputMode === "voice" && !voiceInput.trim()) || 
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
                  ) : output ? (
                    <div className="output-content">
                      {output.type === "image" ? (
                        <div className="image-output">
                          <img src={output.content} alt="Generated artwork" className="generated-image" />
                          <p className="image-prompt">Based on: "{output.prompt}"</p>
                        </div>
                      ) : (
                        <div className="output-text">
                          
  {output.content || output}

                        </div>
                      )}
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
    </div>
  );
};

export default DailyJournal;