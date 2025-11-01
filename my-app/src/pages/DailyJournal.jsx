import React, { useState } from 'react';
import { 
  Type, 
  MessageSquare, 
  Image,
  Music,
  FileText,
  Send
} from 'lucide-react';
import './DailyJournal.css';

const DailyJournal = () => {
  const [textInput, setTextInput] = useState("");
  const [selectedOption, setSelectedOption] = useState("");
  const [output, setOutput] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [songs, setSongs] = useState([]);
  const [story, setStory] = useState("");
  const [poem, setPoem] = useState("");

  const options = [
    { 
      value: 'image', 
      label: 'Image', 
      icon: Image,
      gradient: 'gradient-purple'
    },
    { 
      value: 'song', 
      label: 'Song', 
      icon: Music,
      gradient: 'gradient-blue'
    },
    { 
      value: 'poem', 
      label: 'Poem/Story', 
      icon: FileText,
      gradient: 'gradient-green'
    }
  ];

  const buildYouTubeSearchUrl = (title = "", artist = "") => {
    let q = `${title || ""} ${artist || ""}`.trim();
    q = q.replace(/[\n\r]+/g, " ");
    q = q.replace(/["'`''""]/g, "");
    q = q.replace(/[\\/|]/g, " ");
    q = q.replace(/\s+/g, " ").trim();
    if (!q) q = "music";
    return `https://www.youtube.com/results?search_query=${encodeURIComponent(q)}`;
  };

  const generateOutput = async () => {
    if (!textInput.trim()) return;
    if (!selectedOption) return;

    setIsGenerating(true);
    setOutput("");
    setSongs([]);
    setStory("");
    setPoem("");

    try {
      if (selectedOption === "image") {
        const response = await fetch(`${import.meta.env.VITE_API_BASE}/api/generate-image`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: textInput }),
        });

        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const data = await response.json();
        
        if (data?.image) {
          setOutput({
            type: "image",
            content: `data:image/png;base64,${data.image}`,
            prompt: data.prompt,
          });
        } else {
          setOutput({ type: "text", content: "❌ No image returned." });
        }
      } else if (selectedOption === "song") {
        const resp = await fetch(`${import.meta.env.VITE_API_BASE}/api/songs`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: textInput }),
        });
        const data = await resp.json();
        setSongs(Array.isArray(data.songs) ? data.songs : []);
      } else if (selectedOption === "poem") {
        const resp = await fetch(`${import.meta.env.VITE_API_BASE}/api/creative`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: textInput }),
        });
        const data = await resp.json();
        setStory(data.story || "");
        setPoem(data.poem || "");
      }
    } catch (err) {
      console.error("generateOutput error:", err);
      setOutput({
        type: "text",
        content: "⚠️ Something went wrong. Please try again.",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  return (
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
                <button className="toggle-btn active">
                  <Type className="icon-sm" />
                  <span>Text</span>
                </button>
              </div>

              <div className="input-area">
                <div className="text-input-container">
                  <textarea
                    value={textInput}
                    onChange={(e) => setTextInput(e.target.value)}
                    placeholder="Write about your day, thoughts, or feelings..."
                    className="textarea"
                  />
                </div>
              </div>

              <div className="options-section">
                <label className="options-label">Choose your creative output</label>
                <div className="options-grid">
                  {options.map((option) => {
                    const OptionIcon = option.icon;
                    return (
                      <button
                        key={option.value}
                        onClick={() => setSelectedOption(option.value)}
                        className={`option-btn ${selectedOption === option.value ? 'active ' + option.gradient : ''}`}
                      >
                        <OptionIcon className="option-icon" />
                        <span className="option-label">{option.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <button
                className="generate-btn"
                onClick={generateOutput}
                disabled={!textInput.trim() || !selectedOption || isGenerating}
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
                            <div style={{ marginTop: 8, fontSize: 12, color: "#059669", wordBreak: "break-all" }}>{url}</div>
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
                    <div className="empty-icon"><MessageSquare className="icon" /></div>
                    <div className="empty-content">
                      <h3 className="empty-title">Ready to create</h3>
                      <p className="empty-text">Enter your thoughts to get started</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DailyJournal;