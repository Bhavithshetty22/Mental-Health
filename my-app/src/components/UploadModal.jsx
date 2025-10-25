"use client"

import { useState } from "react"
import "./UploadModal.css"

const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:5000"

export default function UploadModal({ onClose, onUploaded }) {
  const [type, setType] = useState("text")
  const [title, setTitle] = useState("")
  const [content, setContent] = useState("")
  const [imageDataUrl, setImageDataUrl] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const handleFile = (file) => {
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => setImageDataUrl(reader.result)
    reader.onerror = () => setError("Could not read file")
    reader.readAsDataURL(file)
  }

  const clearForm = () => {
    setTitle("")
    setContent("")
    setImageDataUrl(null)
    setError("")
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError("")

    if (type === "image" && !imageDataUrl) {
      setError("Please upload an image.")
      return
    }

    if (type === "text" && !content.trim()) {
      setError("Please add some content.")
      return
    }

    setLoading(true)
    try {
      const token = localStorage.getItem("token")
      const body = {
        title: type === "text" ? title?.trim() || "" : "",
        content: type === "text" ? content?.trim() || "" : "",
        image: type === "image" ? imageDataUrl : null,
        type,
      }

      const resp = await fetch(`${API_BASE}/api/community`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(body),
      })

      if (!resp.ok) {
        const err = await resp.json().catch(() => ({}))
        throw new Error(err.error || err.message || `Status ${resp.status}`)
      }

      const data = await resp.json()
      clearForm()
      onUploaded && onUploaded(data)
      onClose && onClose()
    } catch (err) {
      console.error("Upload error", err)
      setError(err.message || "Upload failed")
    } finally {
      setLoading(false)
    }
  }

  const handleTypeChange = (newType) => {
    setType(newType)
    clearForm()
  }

  return (
    <div className="upload-modal-backdrop" onClick={onClose} role="dialog" aria-modal="true">
      <div className="upload-modal" onClick={(e) => e.stopPropagation()}>
        <header className="upload-modal-header">
          <div>
            <h3>Share with the community</h3>
            <p className="modal-subtitle">Your story matters. Posts are anonymous.</p>
          </div>
          <button className="close-btn" onClick={onClose} aria-label="Close modal">
            ✕
          </button>
        </header>

        <form onSubmit={handleSubmit} className="upload-form">
          <div className="form-row">
            <label htmlFor="type-select">
              <span className="label-text">Content Type</span>
              <select
                id="type-select"
                value={type}
                onChange={(e) => handleTypeChange(e.target.value)}
                className="type-select"
              >
                <option value="text">📝 Text / Poem / Story</option>
                <option value="image">🖼️ Image</option>
              </select>
            </label>
          </div>

          {type === "text" && (
            <>
              <div className="form-row">
                <label htmlFor="title-input">
                  <span className="label-text">
                    Title <span className="optional">(optional)</span>
                  </span>
                  <input
                    id="title-input"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Give your piece a title..."
                    className="form-input"
                  />
                </label>
              </div>

              <div className="form-row">
                <label htmlFor="content-textarea">
                  <span className="label-text">Content</span>
                  <textarea
                    id="content-textarea"
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    placeholder="Write a poem, story, or paste something meaningful..."
                    rows={6}
                    className="form-textarea"
                  />
                  <span className="char-count">{content.length} characters</span>
                </label>
              </div>
            </>
          )}

          {type === "image" && (
            <div className="form-row">
              <label htmlFor="image-input">
                <span className="label-text">Upload Image</span>
                <div className="file-input-wrapper">
                  <input
                    id="image-input"
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleFile(e.target.files?.[0])}
                    className="file-input"
                  />
                  <span className="file-input-label">
                    {imageDataUrl ? "✓ Image selected" : "Click to upload or drag & drop"}
                  </span>
                </div>
              </label>
              {imageDataUrl && (
                <div className="preview">
                  <img src={imageDataUrl || "/placeholder.svg"} alt="preview" />
                </div>
              )}
            </div>
          )}

          {error && (
            <div className="error-message" role="alert">
              <span className="error-icon">⚠️</span>
              <span>{error}</span>
            </div>
          )}

          <div className="form-actions">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => {
                clearForm()
                onClose && onClose()
              }}
            >
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? (
                <>
                  <span className="spinner"></span>
                  Uploading…
                </>
              ) : (
                <>
                  <span>✓</span>
                  Post
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
