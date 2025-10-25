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
  const [supportingPostId, setSupportingPostId] = useState(null) // Track which post is being supported

  const fetchPosts = async () => {
    setLoading(true)
    try {
      const token = localStorage.getItem("token")
      const headers = {}
      if (token) {
        headers["Authorization"] = `Bearer ${token}`
      }
      
      const resp = await fetch(`${API_BASE}/api/community`, { headers })
      if (!resp.ok) throw new Error("Failed to load posts")
      const data = await resp.json()
      
      console.log("Fetched posts data:", data); // Debug log
      
      const list = Array.isArray(data.posts) ? [...data.posts].reverse() : []
      
      // Log hasSupported status for debugging
      list.forEach(post => {
        if (post.likes > 0) {
          console.log(`Post ${post._id}: hasSupported=${post.hasSupported}, likes=${post.likes}`);
        }
      });
      
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
      
      if (!token) {
        alert("You must be logged in to support posts")
        return
      }
      
      // Check if user already supported this post (from current state)
      const post = posts.find(p => p._id === postId)
      if (post && post.hasSupported) {
        console.log("Post already supported, not sending request");
        return
      }
      
      // Prevent double-clicking
      if (supportingPostId === postId) {
        console.log("Already processing support for this post");
        return
      }
      
      setSupportingPostId(postId)
      
      const url = `${API_BASE}/api/community/${postId}/support`
      
      console.log("Sending support request for post:", postId);
      
      const resp = await fetch(url, {
        method: 'POST',
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        }
      })
      
      const data = await resp.json()
      
      console.log("Support response:", data);
      
      if (!resp.ok) {
        // If already supported, just update the UI without showing error
        if (resp.status === 400 && data.error?.includes("already supported")) {
          console.log("Backend says already supported, updating UI");
          setPosts(posts.map(p => 
            p._id === postId ? {...p, hasSupported: true, likes: data.likes || p.likes} : p
          ))
          return
        }
        throw new Error(data.error || "Failed to support post")
      }
      
      // Update post in state with new like count and hasSupported flag
      console.log("Successfully supported post, updating state");
      setPosts(posts.map(p => 
        p._id === postId ? {...p, likes: data.likes, hasSupported: true} : p
      ))
      
    } catch (err) {
      console.error("Could not support post", err)
      // Only show alert for actual errors, not "already supported"
      if (!err.message?.includes("already supported")) {
        alert(err.message || "Failed to support post. Please try again.")
      }
    } finally {
      setSupportingPostId(null)
    }
  }

  // Separate posts into images and text
  const imagePosts = posts.filter(p => p.type === "image" || p.image)
  const textPosts = posts.filter(p => p.type === "text" || (!p.image && p.content))

  const renderPosts = (postList) => {
    if (postList.length === 0) {
      return (
        <div className="empty-state">
          <div className="empty-icon">📭</div>
          <p>No posts yet — be the first to share something kind.</p>
        </div>
      )
    }

    return postList.map((p, idx) => {
      const hasImage = !!p.image
      const isSupporting = supportingPostId === p._id
      
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
              className={`support-btn ${p.hasSupported ? 'supported' : ''} ${isSupporting ? 'loading' : ''}`}
              onClick={() => handleSupport(p._id)}
              disabled={p.hasSupported || isSupporting}
              aria-label={p.hasSupported ? "Already supported" : "Support post"}
            >
              {isSupporting ? '...' : (
                <>
                  ❤️ {p.likes  ? 'Supported' : 'Support'} {p.likes > 0 && `(${p.likes})`}
                </>
              )}
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
          onClose={() => setShowUpload(true)}
          onUploaded={() => {
            fetchPosts()
            setShowUpload(false)
          }}
        />
      )}
    </div>
  )
}