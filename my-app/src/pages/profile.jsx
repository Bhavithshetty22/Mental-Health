"use client"

import { useState, useEffect } from "react"
import "./profile.css"
import MoodProfile from "../components/ProfileDynamic"

const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:5000"

export default function ProfileNew() {
  const [profile, setProfile] = useState({
    name: "",
    username: "",
    email: "",
    avatar: "👤",
    smsAlerts: true,
  })
  
  // Load user data from localStorage on component mount
  useEffect(() => {
    const userData = localStorage.getItem("user");
    if (userData) {
      try {
        const parsedUser = JSON.parse(userData);
        setProfile(prevProfile => ({
          ...prevProfile,
          name: parsedUser.name || "",
          username: parsedUser.username || "",
          email: parsedUser.email || ""
        }));
      } catch (error) {
        console.error("Error parsing user data:", error);
      }
    }
  }, [])

  const [isEditing, setIsEditing] = useState(false)
  const [formData, setFormData] = useState(profile)
  const [userPosts, setUserPosts] = useState([])
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState("images") // "images", "text"
  

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  const handleSave = () => {
    setProfile(formData)
    setIsEditing(false)
  }

  const handleCancel = () => {
    setFormData(profile)
    setIsEditing(false)
  }
  
  // Fetch user's community posts - FIXED ENDPOINT
  const fetchUserPosts = async () => {
    setLoading(true)
    try {
      const token = localStorage.getItem("token")
      if (!token) {
        console.warn("No auth token found")
        setUserPosts([])
        return
      }
      
      // Changed from /api/community/my-posts to /api/community/user
      const resp = await fetch(`${API_BASE}/api/community/user`, {
        headers: {
          "Authorization": `Bearer ${token}`
        }
      })
      
      if (!resp.ok) {
        if (resp.status === 401) {
          console.error("Authentication failed - token may be invalid")
          // Optionally clear invalid token
          // localStorage.removeItem("token")
        }
        throw new Error(`Failed to fetch user posts: ${resp.status}`)
      }
      
      const data = await resp.json()
      console.log("Fetched posts:", data) // Debug log
      
      // Handle the response structure from backend
      const posts = Array.isArray(data.posts) ? [...data.posts].reverse() : []
      setUserPosts(posts)
    } catch (err) {
      console.error("Could not fetch user posts", err)
      setUserPosts([])
    } finally {
      setLoading(false)
    }
  }
  
  // Delete a post
  const handleDeletePost = async (postId) => {
    if (!confirm("Are you sure you want to delete this post?")) {
      return
    }
    
    try {
      const token = localStorage.getItem("token")
      if (!token) {
        alert("Authentication required")
        return
      }
      
      const resp = await fetch(`${API_BASE}/api/community/${postId}`, {
        method: "DELETE",
        headers: {
          "Authorization": `Bearer ${token}`
        }
      })
      
      if (!resp.ok) {
        const errorData = await resp.json().catch(() => ({}))
        throw new Error(errorData.error || "Failed to delete post")
      }
      
      // Remove post from state
      setUserPosts(prev => prev.filter(post => post._id !== postId))
      alert("Post deleted successfully")
    } catch (err) {
      console.error("Could not delete post", err)
      alert(err.message || "Failed to delete post. Please try again.")
    }
  }
  
  // Load user posts when component mounts
  useEffect(() => {
    fetchUserPosts()
  }, [])

  // Separate posts into images and text
  const imagePosts = userPosts.filter(p => p.type === "image" || p.image)
  const textPosts = userPosts.filter(p => p.type === "text" || (!p.image && p.content))

  const renderUserPosts = (postList) => {
    if (loading) {
      return <div className="loading-posts">Loading your posts...</div>
    }
    
    if (postList.length === 0) {
      return (
        <div className="no-posts">
          You haven't posted anything yet.
        </div>
      )
    }

    return (
      <div className="posts-grid">
        {postList.map((post) => (
          <div key={post._id} className="user-post-item">
            {post.image && (
              <div className="post-image">
                <img
                  src={post.image || "/placeholder.svg"}
                  alt={post.title || "Your post"}
                  loading="lazy"
                />
              </div>
            )}
            <div className="post-content">
              {post.title && <h3>{post.title}</h3>}
              {post.content && <p>{post.content}</p>}
            </div>
            <button 
              className="delete-post-btn"
              onClick={() => handleDeletePost(post._id)}
              aria-label="Delete post"
            >
              Delete
            </button>
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="profile-new-page">
      <div className="profile-container">
        {/* Left Column - Profile Card */}
        <div className="profile-left">
          <div className="profile-card">
            <div className="profile-avatar-large">
              {profile.avatar || "👤"}
            </div>
            
            <div className="profile-details">
              <h1 className="profile-title">Profile</h1>
              
              {!isEditing ? (
                <div className="profile-info">
                  <div className="profile-name">{profile.name || "Anonymous User"}</div>
                  <div className="profile-contact">@{profile.username || "username"}</div>
                  <div className="profile-contact">{profile.email || "user@example.com"}</div>
                </div>
              ) : (
                <div className="edit-form">
                  <div className="form-row">
                    <input
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleInputChange}
                      placeholder="Your name"
                      className="form-input"
                    />
                  </div>
                  <div className="form-row">
                    <input
                      type="text"
                      name="username"
                      value={formData.username}
                      onChange={handleInputChange}
                      placeholder="Username"
                      className="form-input"
                    />
                  </div>
                  <div className="form-row">
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      placeholder="Email"
                      className="form-input"
                    />
                  </div>
                </div>
              )}

              {!isEditing ? (
                <button
                  className="btn btn-save"
                  onClick={() => {
                    setFormData(profile)
                    setIsEditing(true)
                  }}
                >
                  ✏️ Edit Profile
                </button>
              ) : (
                <>
                  <button className="btn btn-save" onClick={handleSave}>
                    💾 Save Changes
                  </button>
                  <button className="btn btn-cancel" onClick={handleCancel}>
                    Cancel
                  </button>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Right Column - Content */}
        <div className="profile-right">
          {/* Mood Profile Section */}
          <div className="section-card">
            <h2>Mood Profile</h2>
            <div className="mood-container">
              <div className="mood-profile-div">
                <MoodProfile />
              </div>
            </div>
          </div>

          {/* My Posts Section */}
          <div className="section-card">
            <h2>My Posts</h2>
            
            {/* Tabs for image/text posts */}
            <div className="profile-tabs">
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
            
            <div className="user-posts-container">
              {activeTab === "images" && renderUserPosts(imagePosts)}
              {activeTab === "text" && renderUserPosts(textPosts)}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}