import React, { useState } from 'react';
import { 
  Type, 
  MessageSquare, 
  Image,
  Music,
  FileText,
  Save,
  Check
} from 'lucide-react';
import './DailyJournal.css';

const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:5000";

const _getMoodEmoji = (mood) => {
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

const DailyJournal = () => {
  const [textInput, setTextInput] = useState("");
  const [selectedOption, setSelectedOption] = useState("");
  const [output, setOutput] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [songs, setSongs] = useState([]);
  const [story, setStory] = useState("");
  const [poem, setPoem] = useState("");
  const [currentGeneratedContent, setCurrentGeneratedContent] = useState(null);

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
    q = q.replace(/["'`''""]/g, "");
    q = q.replace(/[\\/|]/g, " ");
    q = q.replace(/\s+/g, " ").trim();
    if (!q) q = "music";
    return `https://www.youtube.com/results?search_query=${encodeURIComponent(q)}`;
  };

  const saveToDatabase = async () => {
    if (!textInput.trim() || !currentGeneratedContent) {
      console.warn("Cannot save: missing text or generated content");
      return;
    }

    setIsSaving(true);
    setSaved(false);

    try {
      const token = localStorage.getItem('token');
      
      if (!token) {
        alert("Please log in to save your journal entry");
        setIsSaving(false);
        return;
      }

      const response = await fetch(`${API_BASE}/api/daily-journal`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          text: textInput,
          generatedContent: currentGeneratedContent
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      const data = await response.json();
      console.log("Journal entry saved:", data);

      setSaved(true);
      
      // Dispatch custom event to notify DailyTaskTracker
      window.dispatchEvent(new CustomEvent('journalUpdated', {
        detail: { 
          date: new Date().toISOString(),
          entryId: data.entry?.id 
        }
      }));

      // Show success for 3 seconds
      setTimeout(() => setSaved(false), 3000);

    } catch (error) {
      console.error("Error saving to database:", error);
      alert(`Failed to save: ${error.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const generateOutput = async () => {
    if (!textInput.trim()) return;
    if (!selectedOption) return;

    setIsGenerating(true);
    setOutput("");
    setSongs([]);
    setStory("");
    setPoem("");
    setCurrentGeneratedContent(null);
    setSaved(false);

    try {
      if (selectedOption === "image") {
        const response = await fetch(`${API_BASE}/api/generate-image`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: textInput }),
        });

        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const data = await response.json();
        
        if (data?.image) {
          const imageData = {
            type: "image",
            content: `data:image/png;base64,${data.image}`,
            prompt: data.prompt,
          };
          
          setOutput(imageData);
          
          // Set generated content for saving
          setCurrentGeneratedContent({
            type: 'image',
            imageUrl: imageData.content,
            imagePrompt: data.prompt
          });
        } else {
          setOutput({ type: "text", content: "❌ No image returned." });
        }
      } else if (selectedOption === "song") {
        const resp = await fetch(`${API_BASE}/api/songs`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: textInput }),
        });
        const data = await resp.json();
        const songList = Array.isArray(data.songs) ? data.songs : [];
        setSongs(songList);
        
        // Set generated content for saving
        setCurrentGeneratedContent({
          type: 'song',
          songs: songList.map(s => ({
            title: s.title,
            artist: s.artist,
            url: s.url || buildYouTubeSearchUrl(s.title, s.artist),
            reason: s.reason
          }))
        });
      } else if (selectedOption === "poem") {
        const resp = await fetch(`${API_BASE}/api/creative`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: textInput }),
        });
        const data = await resp.json();
        const storyText = data.story || "";
        const poemText = data.poem || "";
        
        setStory(storyText);
        setPoem(poemText);
        
        // Set generated content for saving
        setCurrentGeneratedContent({
          type: 'poem',
          story: storyText,
          poem: poemText
        });
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

  const hasGeneratedContent = currentGeneratedContent !== null;

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

              <div style={{ display: 'flex', gap: '12px' }}>
                <button
                  className="generate-btn"
                  onClick={generateOutput}
                  disabled={!textInput.trim() || !selectedOption || isGenerating}
                  style={{ flex: 1 }}
                >
                  {isGenerating ? "Generating..." : "Generate"}
                </button>

                {hasGeneratedContent && (
                  <button
                    className={`save-btn ${saved ? 'saved' : ''}`}
                    onClick={saveToDatabase}
                    disabled={isSaving || saved}
                    style={{ 
                      minWidth: '120px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      background: saved ? '#10b981' : '#3b82f6',
                      color: 'white',
                      border: 'none',
                      borderRadius: '8px',
                      padding: '12px 24px',
                      cursor: isSaving || saved ? 'not-allowed' : 'pointer',
                      opacity: isSaving || saved ? 0.7 : 1,
                      transition: 'all 0.3s ease'
                    }}
                  >
                    {saved ? (
                      <>
                        <Check size={18} />
                        <span>Saved!</span>
                      </>
                    ) : isSaving ? (
                      <span>Saving...</span>
                    ) : (
                      <>
                        <Save size={18} />
                        <span>Save</span>
                      </>
                    )}
                  </button>
                )}
              </div>
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