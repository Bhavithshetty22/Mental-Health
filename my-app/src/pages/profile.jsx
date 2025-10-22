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
  
  // Fetch user's community posts
  const fetchUserPosts = async () => {
    setLoading(true)
    try {
      const token = localStorage.getItem("token")
      if (!token) {
        console.warn("No auth token found")
        setUserPosts([])
        setLoading(false)
        return
      }
      
      const resp = await fetch(`${API_BASE}/api/community/user`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        }
      })
      
      if (!resp.ok) throw new Error("Failed to load posts")
      const data = await resp.json()
      setUserPosts(Array.isArray(data.posts) ? data.posts : [])
      console.log("Fetched user posts:", data.posts)
    } catch (err) {
      console.error("Could not fetch user posts", err)
      setUserPosts([])
    } finally {
      setLoading(false)
    }
  }
  
  // Delete a post
  const handleDeletePost = async (postId) => {
    if (!confirm("Are you sure you want to delete this post?")) return
    
    try {
      const token = localStorage.getItem("token")
      if (!token) {
        console.warn("No auth token found")
        alert("You must be logged in to delete posts")
        return
      }
      
      const resp = await fetch(`${API_BASE}/api/community/${postId}`, {
        method: 'DELETE',
        headers: {
          "Authorization": `Bearer ${token}`
        }
      })
      if (!resp.ok) throw new Error("Failed to delete post")
      
      // Remove post from state
      setUserPosts(userPosts.filter(post => post._id !== postId))
    } catch (err) {
      console.error("Could not delete post", err)
      alert("Failed to delete post. Please try again.")
    }
  }
  
  useEffect(() => {
    fetchUserPosts()
  }, [])

  return (
    <div className="profile-new-page">
      <div className="profile-container">
        {/* Left Column - Profile Card */}
        <div className="profile-left">
          <div className="profile-card">
            <div className="profile-avatar-large">{profile.avatar}</div>

            <div className="profile-details">
              <h1 className="profile-title">My profile</h1>

              {isEditing ? (
                <div className="edit-form">
                  <div className="form-row">
                    <input
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleInputChange}
                      className="form-input"
                      placeholder="Full name"
                    />
                  </div>
                  <div className="form-row">
                    <input
                      type="tel"
                      name="phone"
                      value={formData.phone}
                      onChange={handleInputChange}
                      className="form-input"
                      placeholder="Phone number"
                    />
                  </div>
                  <div className="form-row">
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      className="form-input"
                      placeholder="Email address"
                    />
                  </div>
                </div>
              ) : (
                <div className="profile-info">
                  <p className="profile-name">{profile.name}</p>
                  <p className="profile-contact">@{profile.username}</p>
                  <p className="profile-contact">{profile.email}</p>
                </div>
              )}

              <button
                className="btn btn-save"
                onClick={() => {
                  if (isEditing) {
                    handleSave()
                  } else {
                    setIsEditing(true)
                  }
                }}
              >
                {isEditing ? "Save" : "Edit"}
              </button>

              {isEditing && (
                <button className="btn btn-cancel" onClick={handleCancel}>
                  Cancel
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Right Column - Content */}
        <div className="profile-right">
          {/*mood section*/}
          <div className="section-card">
            <h2>Today's Mood</h2>
            <MoodProfile />
          </div>

          {/* uploaded images */}
          <div className="section-card">
            <h2>Uploaded Posts</h2>
            
            {/* Tab Navigation */}
            <div className="profile-tabs">
              <button
                className={`tab-btn ${activeTab === "images" ? "active" : ""}`}
                onClick={() => setActiveTab("images")}
              >
                🖼️ Images
              </button>
              <button
                className={`tab-btn ${activeTab === "text" ? "active" : ""}`}
                onClick={() => setActiveTab("text")}
              >
                📝 Poems & Text
              </button>
            </div>
            
            <div className="user-posts-container">
              {loading ? (
                <div className="loading-posts">Loading your posts...</div>
              ) : userPosts.length === 0 ? (
                <div className="no-posts">You haven't posted anything yet.</div>
              ) : (
                <div className="posts-grid">
                  {userPosts
                    .filter(post => 
                      activeTab === "images" 
                        ? (post.type === "image" || post.image) 
                        : (post.type === "text" || (!post.image && post.content))
                    )
                    .map((post) => (
                    <div key={post._id} className="user-post-item">
                      {post.image && (
                        <div className="post-image">
                          <img src={post.image} alt={post.title || "Community post"} />
                        </div>
                      )}
                      <div className="post-content">
                        {post.title && <h3>{post.title}</h3>}
                        {post.content && <p>{post.content}</p>}
                      </div>
                      <div className="post-actions">
                        <button 
                          className="delete-post-btn" 
                          onClick={() => handleDeletePost(post._id)}
                          aria-label="Delete post"
                        >
                          🗑️ Delete
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
