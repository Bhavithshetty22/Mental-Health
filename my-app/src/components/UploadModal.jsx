// src/components/UploadModal.jsx
import React, { useState } from "react";
import "./UploadModal.css"; // create minimal styles or put in Community.css
const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:5000"

export default function UploadModal({ onClose, onUploaded }) {
  const [type, setType] = useState("text"); // text | image
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [imageDataUrl, setImageDataUrl] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // convert file to base64 data URL
  const handleFile = (file) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setImageDataUrl(reader.result);
    reader.onerror = () => setError("Could not read file");
    reader.readAsDataURL(file);
  };

  const clearForm = () => {
    setTitle("");
    setContent("");
    setImageDataUrl(null);
    setError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (!content.trim() && !imageDataUrl) {
      setError("Please add text or an image.");
      return;
    }

    setLoading(true);
    try {
      const token = localStorage.getItem("token"); // expect auth
      const body = {
        title: title?.trim() || "",
        content: content?.trim() || "",
        image: imageDataUrl || null,
        type,
      };

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
      clearForm();
      onUploaded && onUploaded(data);
      onClose && onClose();
    } catch (err) {
      console.error("Upload error", err);
      setError(err.message || "Upload failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="upload-modal-backdrop" onClick={onClose} role="dialog">
      <div className="upload-modal" onClick={(e) => e.stopPropagation()}>
        <header className="upload-modal-header">
          <h3>Share with the community</h3>
          <button className="close-btn" onClick={onClose} aria-label="Close">✕</button>
        </header>

        <form onSubmit={handleSubmit} className="upload-form">
          <div className="form-row">
            <label>
              <span>Type</span>
              <select value={type} onChange={(e) => setType(e.target.value)}>
                <option value="text">Text / Poem / Story</option>
                <option value="image">Image</option>
              </select>
            </label>
          </div>

          <div className="form-row">
            <label>
              <span>Title (optional)</span>
              <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="A short title" />
            </label>
          </div>

          <div className="form-row">
            <label>
              <span>Content</span>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Write a poem, story, or paste a letter you liked..."
                rows={6}
              />
            </label>
          </div>

          <div className="form-row">
            <label>
              <span>Image (optional)</span>
              <input type="file" accept="image/*" onChange={(e) => handleFile(e.target.files?.[0])} />
            </label>
            {imageDataUrl && (
              <div className="preview">
                <img src={imageDataUrl} alt="preview" />
              </div>
            )}
          </div>

          {error && <div className="error">{error}</div>}

          <div className="form-actions">
            <button type="button" className="btn ghost" onClick={() => { clearForm(); onClose && onClose(); }}>
              Cancel
            </button>
            <button type="submit" className="btn primary" disabled={loading}>
              {loading ? "Uploading…" : "Post"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
