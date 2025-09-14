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
  const [songs, setSongs] = useState([]);
  const [story, setStory] = useState("");
  const [poem, setPoem] = useState("");

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

  // build YouTube search url fallback (same rules as backend)
  const buildYouTubeSearchUrl = (title = "", artist = "") => {
    let q = `${title || ""} ${artist || ""}`.trim();
    q = q.replace(/[\n\r]+/g, " ");
    q = q.replace(/["'`‘’“”]/g, "");
    q = q.replace(/[\/\\|]/g, " ");
    q = q.replace(/\s+/g, " ").trim();
    if (!q) q = "music";
    return `https://www.youtube.com/results?search_query=${encodeURIComponent(q)}`;
  };

  const generateOutput = async () => {
    if (!textInput && !isRecording) return;
    if (!selectedOption) return;

    setIsGenerating(true);
    setOutput("");
    setSongs([]);
    setStory("");
    setPoem("");

    try {
      if (selectedOption === "song") {
        const resp = await fetch("http://localhost:5000/api/songs", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: textInput }),
        });

        const data = await resp.json();
        if (!resp.ok) {
          console.error("Songs API error:", data);
          setOutput("Failed to get song suggestions.");
        } else {
          const suggestions = Array.isArray(data.songs) ? data.songs : [];
          setSongs(suggestions);
        }
      } else if (selectedOption === "poem") {
        const resp = await fetch("http://localhost:5000/api/creative", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: textInput }),
        });

        const data = await resp.json();
        if (!resp.ok) {
          console.error("Creative API error:", data);
          setOutput("Failed to get creative content.");
        } else {
          setStory(data.story || "");
          setPoem(data.poem || "");
        }
      } else {
        // image or other: keep fake behavior for now
        await new Promise((resolve) => setTimeout(resolve, 1200));
        const outputs = {
          image: "A serene landscape with soft pastel colors reflecting your peaceful state of mind.",
        };
        setOutput(outputs[selectedOption] || "Your journal entry has been processed successfully.");
      }
    } catch (err) {
      console.error("generateOutput error:", err);
      setOutput("Network error. Check backend.");
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
                  ) : selectedOption === "song" ? (
                    songs && songs.length > 0 ? (
                      <div className="song-list">
                        {songs.map((s, idx) => {
                          const title = s.title || "Untitled";
                          const artist = s.artist || "";
                          // Use YouTube URL or fallback to YouTube search
                          const url =
                            s.url && s.url.length > 0
                              ? s.url
                              : buildYouTubeSearchUrl(title, artist);

                          return (
                            <div className="song-card" key={idx}>
                              <a href={url} target="_blank" rel="noreferrer" className="song-link">
                                <div className="song-title">{title}</div>
                                <div className="song-artist">{artist}</div>
                              </a>
                              <div style={{ marginTop: 8, fontSize: 12, color: "#666", wordBreak: "break-all" }}>{url}</div>
                              {s.reason && <div className="song-reason">{s.reason}</div>}
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
                          </div>
                        )}

                        {poem && (
                          <div className="creative-card">
                            <h3 className="creative-title">Poem</h3>
                            <pre className="creative-poem">{poem}</pre>
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
      </div>
    </div>
  );
};

export default DailyJournal;
