import React, { useState } from 'react';

import { 
  Type, 
  MessageSquare, 
  Moon, 
  Sun,
  Send,
  X,
  Heart,
  Lightbulb
} from 'lucide-react';

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
  const [isDark, setIsDark] = useState(false);
  
  // Mood detection states
  const [_isMoodDetecting, _setIsMoodDetecting] = useState(false);
  const [_moodResult, _setMoodResult] = useState(null);
  const [_showMoodPopup, _setShowMoodPopup] = useState(false);

  const [songs, setSongs] = useState([]);
  const [story, setStory] = useState("");
  const [poem, setPoem] = useState("");

  const _toggleTheme = () => {
    setIsDark(!isDark);
    document.documentElement.classList.toggle("dark");
  };

  // build YouTube search url fallback (same rules as backend)
  const buildYouTubeSearchUrl = (title = "", artist = "") => {
    let q = `${title || ""} ${artist || ""}`.trim();
    q = q.replace(/[\n\r]+/g, " ");
    q = q.replace(/["'`''""]/g, "");
  q = q.replace(/["'`‘’“”]/g, "");
  q = q.replace(/[\\/|]/g, " ");
    q = q.replace(/\s+/g, " ").trim();
    if (!q) q = "music";
    return `https://www.youtube.com/results?search_query=${encodeURIComponent(q)}`;
  };

  // Mood detection function
  const _detectMood = async () => {
    const textToAnalyze = textInput.trim();

    if (!textToAnalyze) {
      alert("Please enter some text first!");
      return;
    }

  _setIsMoodDetecting(true);

    try {
      const response = await fetch(`${import.meta.env.VITE_API_BASE}/api/detect-mood`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: textToAnalyze }),
      });

      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

      const data = await response.json();
  _setMoodResult(data);
  _setShowMoodPopup(true);
    } catch (error) {
      console.error('Error detecting mood:', error);
      alert('Failed to detect mood. Please make sure the server is running.');
    } finally {
  _setIsMoodDetecting(false);
    }
  };

  const _closeMoodPopup = () => _setShowMoodPopup(false);

  // Generate Output (keep Stability + songs + poem logic)
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
        const visualPrompt = await enhancePromptWithGemini(textInput);

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

        if (!response.ok) throw new Error(`HTTP ${response.status}`);

        const data = await response.json();
        if (data?.image) {
          setOutput({
            type: "image",
            content: `data:image/png;base64,${data.image}`,
            prompt: visualPrompt,
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