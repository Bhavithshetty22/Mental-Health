"use client"

import { useEffect, useState } from "react"
import "./Community.css"
import UploadModal from "../components/UploadModal.jsx"

const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:5000"

export default function CommunityPage() {
  const [posts, setPosts] = useState([])
  const [loading, setLoading] = useState(true)
  const [showUpload, setShowUpload] = useState(false)
  const [activeTab, setActiveTab] = useState("images") // "images", "text"
  const [supportedPosts, setSupportedPosts] = useState([])

  const fetchPosts = async () => {
    setLoading(true)
    try {
      const resp = await fetch(`${API_BASE}/api/community`)
      if (!resp.ok) throw new Error("Failed to load posts")
      const data = await resp.json()
      const list = Array.isArray(data.posts) ? [...data.posts].reverse() : []
      setPosts(list)
    } catch (err) {
      console.error("Could not fetch community posts", err)
      setPosts([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchPosts()
    
    // Load supported posts from localStorage - check both formats
    const userId = localStorage.getItem("userId") || localStorage.getItem("user_id")
    if (userId) {
      const supported = JSON.parse(localStorage.getItem(`supported_${userId}`) || "[]")
      setSupportedPosts(supported)
    }
  }, [])

  const formatDate = (iso) => {
    try {
      const date = new Date(iso)
      const now = new Date()
      const diffMs = now - date
      const diffMins = Math.floor(diffMs / 60000)
      const diffHours = Math.floor(diffMs / 3600000)
      const diffDays = Math.floor(diffMs / 86400000)

      if (diffMins < 1) return "just now"
      if (diffMins < 60) return `${diffMins}m ago`
      if (diffHours < 24) return `${diffHours}h ago`
      if (diffDays < 7) return `${diffDays}d ago`

      return date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: date.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
      })
    } catch {
      return iso
    }
  }
  
  // Function to handle support/like
  const handleSupport = async (postId) => {
    try {
      const token = localStorage.getItem("token") 
      const userId = localStorage.getItem("user")
      
      if (!token || !userId) {
        console.warn("No auth token or userId found")
        alert("You must be logged in to support posts")
        return
      }
      
      // Check if user already supported this post
      if (supportedPosts.includes(postId)) {
        alert("You have already supported this post")
        return
      }
      
      const resp = await fetch(`${API_BASE}/api/community/${postId}/support`, {
        method: 'POST',
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        }
      })
      
      if (!resp.ok) throw new Error("Failed to support post")
      
      const data = await resp.json()
      
      // Update post in state with new like count
      setPosts(posts.map(post => 
        post._id === postId ? {...post, likes: data.likes} : post
      ))
      
      // Add to supported posts
      const newSupportedPosts = [...supportedPosts, postId]
      setSupportedPosts(newSupportedPosts)
      
      // Save to localStorage - use the userId we found
      const actualUserId = localStorage.getItem("userId") || localStorage.getItem("user_id")
      localStorage.setItem(`supported_${actualUserId}`, JSON.stringify(newSupportedPosts))
    } catch (err) {
      console.error("Could not support post", err)
      alert("Failed to support post. Please try again.")
    }
  }

  // Separate posts into images and text
  const imagePosts = posts.filter(p => p.type === "image" || p.image)
  const textPosts = posts.filter(p => p.type === "text" || (!p.image && p.content))

  const renderPosts = (postList) => {
    if (postList.length === 0) {
      return (
        <div className="empty-state">
          <div className="empty-icon">📝</div>
          <p>No posts yet — be the first to share something kind.</p>
        </div>
      )
    }

    return postList.map((p, idx) => {
      const hasImage = !!p.image
      return (
        <article
          key={p._id}
          className={`community-post ${hasImage ? "with-image" : "text-only"}`}
          style={{ animationDelay: `${idx * 0.05}s` }}
        >
          {hasImage && (
            <div className="post-image">
              <img
                src={p.image || "/placeholder.svg"}
                alt={p.title ? p.title : "Community image"}
                loading="lazy"
              />
            </div>
          )}

          <div className="post-body">
            {p.title && <h3 className="post-title">{p.title}</h3>}
            {p.content && <div className="post-text">{p.content}</div>}
          </div>

          <div className="post-footer">
            <span className="post-date">{formatDate(p.createdAt)}</span>
            <span className="post-anon">• anonymous</span>
            <button 
              className={`support-btn ${supportedPosts.includes(p._id) ? 'supported' : ''}`}
              onClick={() => handleSupport(p._id)}
              disabled={supportedPosts.includes(p._id)}
              aria-label="Support post"
            >
              ❤️ {supportedPosts.includes(p._id) ? 'Supported' : 'Support'} {p.likes > 0 && `(${p.likes})`}
            </button>
          </div>
        </article>
      )
    })
  }

  return (
    <div className="community-page">
      <header className="community-header">
        <div className="header-content">
          <h1>Community</h1>
          <p className="subtitle">Share a poem, story, or creation. Posts are anonymous and like counts are hidden.</p>
        </div>

        <div className="community-actions">
          <button
            className="btn btn-primary"
            onClick={() => setShowUpload(true)}
            aria-label="Share something with the community"
          >
            <span>✨</span>
            Share something
          </button>
        </div>
      </header>

      {/* Tab Navigation */}
      <div className="community-tabs">
        <button
          className={`tab-btn ${activeTab === "images" ? "active" : ""}`}
          onClick={() => setActiveTab("images")}
        >
          🖼️ Images ({imagePosts.length})
        </button>
        <button
          className={`tab-btn ${activeTab === "text" ? "active" : ""}`}
          onClick={() => setActiveTab("text")}
        >
          📝 Text & Poems ({textPosts.length})
        </button>
      </div>

      <main className="community-feed">
        {loading ? (
          <div className="empty-state loading">
            <div className="spinner"></div>
            <p>Loading posts…</p>
          </div>
        ) : (
          <div className="posts-container">
            {activeTab === "images" && renderPosts(imagePosts)}
            {activeTab === "text" && renderPosts(textPosts)}
          </div>
        )}
      </main>

      {showUpload && (
        <UploadModal
          onClose={() => setShowUpload(false)}
          onUploaded={() => {
            fetchPosts()
            setShowUpload(false)
          }}
        />
      )}
    </div>
  )
}