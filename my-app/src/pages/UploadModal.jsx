// src/components/UploadModal.jsx
import React, { useState } from "react";
import "./UploadModal.css";

const API_BASE = process.env.REACT_APP_API_BASE || "";

export default function UploadModal({ onClose, onSuccess }) {
  const [text, setText] = useState("");
  const [imageFile, setImageFile] = useState(null);
  const [imageUrl, setImageUrl] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (ev) => {
    ev.preventDefault();
    setError("");
    if (!text && !imageFile && !imageUrl) {
      setError("Please add text or an image.");
      return;
    }
    setSending(true);
    try {
      const token = localStorage.getItem("token");
      const form = new FormData();
      if (text) form.append("text", text);
      if (imageUrl) form.append("imageUrl", imageUrl);
      if (imageFile) form.append("image", imageFile);

      const res = await fetch(`${API_BASE}/api/community`, {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        body: form
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Upload failed");
      onSuccess && onSuccess(data.post);
    } catch (err) {
      console.error("Upload error:", err);
      setError(err.message || "Failed to upload");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="upload-modal-backdrop" role="dialog" aria-modal="true">
      <div className="upload-modal">
        <header className="upload-header">
          <h2>Create a Post</h2>
          <button className="close-btn" onClick={onClose}>✕</button>
        </header>

        <form onSubmit={handleSubmit} className="upload-form">
          <label>
            <span>Text (poem / story / note)</span>
            <textarea value={text} onChange={e => setText(e.target.value)} maxLength={2000} rows={6} />
          </label>

          <label>
            <span>Image file (optional)</span>
            <input type="file" accept="image/*" onChange={e => setImageFile(e.target.files[0] || null)} />
          </label>

          <div className="divider">OR</div>

          <label>
            <span>Image URL (optional)</span>
            <input type="url" placeholder="https://example.com/image.jpg" value={imageUrl} onChange={e => setImageUrl(e.target.value)} />
          </label>

          {error && <div className="error">{error}</div>}

          <div className="actions">
            <button className="btn ghost" type="button" onClick={onClose} disabled={sending}>Cancel</button>
            <button className="btn primary" type="submit" disabled={sending}>
              {sending ? "Posting..." : "Post to Community"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
