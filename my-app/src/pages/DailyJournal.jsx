import React, { useState } from 'react';
import { Mic, MicOff, Type, Volume2, MessageSquare, Moon, Sun } from 'lucide-react';
import './DailyJournal.css';

const DailyJournal = () => {
  const [inputMode, setInputMode] = useState("");
  const [textInput, setTextInput] = useState("");
  const [selectedOption, setSelectedOption] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [output, setOutput] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [isDark, setIsDark] = useState(false);

  const handleInputModeChange = (mode) => {
    setInputMode(mode);
    setTextInput("");
    setIsRecording(false);
  };

  const toggleRecording = () => {
    setIsRecording(!isRecording);
  };

  const toggleTheme = () => {
    setIsDark(!isDark);
    document.documentElement.classList.toggle("dark");
  };

  const generateOutput = async () => {
    if (!textInput && !isRecording) return;

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
                          >
                            {isRecording ? <MicOff className="icon" /> : <Mic className="icon" />}
                          </button>
                          {isRecording && <div className="pulse-ring"></div>}
                        </div>
                        <p className="voice-text">
                          {isRecording ? "Recording..." : "Tap to record"}
                        </p>
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
                  disabled={(!textInput && !isRecording) || !selectedOption || isGenerating}
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
    </div>
  );
};

export default DailyJournal;