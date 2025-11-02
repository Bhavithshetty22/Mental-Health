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
    profileImage: null,
    bio: "",
    smsAlerts: true,
  })
  
  useEffect(() => {
    const fetchUserProfile = async () => {
      const userData = localStorage.getItem("user");
      const token = localStorage.getItem("token");
      
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
      
      if (token) {
        try {
          const response = await fetch(`${API_BASE}/api/auth/profile-status`, {
            headers: {
              "Authorization": `Bearer ${token}`
            }
          });
          
          if (response.ok) {
            const data = await response.json();
            if (data.user) {
              setProfile(prevProfile => ({
                ...prevProfile,
                name: data.user.name || prevProfile.name,
                username: data.user.username || prevProfile.username,
                email: data.user.email || prevProfile.email,
                profileImage: data.user.profileImage || null,
                bio: data.user.bio || "",
                avatar: data.user.profileImage ? null : prevProfile.avatar
              }));
              
              localStorage.setItem("user", JSON.stringify(data.user));
            }
          } else {
            console.error("Failed to fetch profile:", response.status);
          }
        } catch (error) {
          console.error("Error fetching user profile:", error);
        }
      }
    };
    
    fetchUserProfile();
  }, [])

  const [isEditing, setIsEditing] = useState(false)
  const [formData, setFormData] = useState(profile)
  const [userPosts, setUserPosts] = useState([])
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState("images")
  

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
  
  const fetchUserPosts = async () => {
    setLoading(true)
    try {
      const token = localStorage.getItem("token")
      if (!token) {
        console.warn("No auth token found")
        setUserPosts([])
        return
      }
      
      const resp = await fetch(`${API_BASE}/api/community/user`, {
        headers: {
          "Authorization": `Bearer ${token}`
        }
      })
      
      if (!resp.ok) {
        if (resp.status === 401) {
          console.error("Authentication failed - token may be invalid")
        }
        throw new Error(`Failed to fetch user posts: ${resp.status}`)
      }
      
      const data = await resp.json()
      console.log("Fetched posts:", data)
      
      const posts = Array.isArray(data.posts) ? [...data.posts].reverse() : []
      setUserPosts(posts)
    } catch (err) {
      console.error("Could not fetch user posts", err)
      setUserPosts([])
    } finally {
      setLoading(false)
    }
  }
  
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
      
      setUserPosts(prev => prev.filter(post => post._id !== postId))
      alert("Post deleted successfully")
    } catch (err) {
      console.error("Could not delete post", err)
      alert(err.message || "Failed to delete post. Please try again.")
    }
  }
  
  useEffect(() => {
    fetchUserPosts()
  }, [])

  const imagePosts = userPosts.filter(p => p.type === "image" || p.image)
  const textPosts = userPosts.filter(p => p.type === "text" || (!p.image && p.content))

  const renderUserPosts = (postList) => {
    if (loading) {
      return <div className="moodora-loading-posts">Loading your posts...</div>
    }
    
    if (postList.length === 0) {
      return (
        <div className="moodora-no-posts">
          You haven't posted anything yet.
        </div>
      )
    }

    return (
      <div className="moodora-posts-grid">
        {postList.map((post) => (
          <div key={post._id} className="moodora-user-post-item">
            {post.image && (
              <div className="moodora-post-image">
                <img
                  src={post.image || "/placeholder.svg"}
                  alt={post.title || "Your post"}
                  loading="lazy"
                />
              </div>
            )}
            <div className="moodora-post-content">
              {post.title && <h3>{post.title}</h3>}
              {post.content && <p>{post.content}</p>}
            </div>
            <button 
              className="moodora-delete-post-btn"
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
    <div className="moodora-profile-page">
      <div className="moodora-profile-container">
        {/* Left Column - Profile Card */}
        <div className="moodora-profile-left">
          <div className="moodora-profile-card">
            <div className="moodora-profile-avatar-large">
              {profile.profileImage ? (
                <img 
                  src={profile.profileImage} 
                  alt={profile.name || "Profile"} 
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    borderRadius: 'inherit'
                  }}
                  onError={(e) => {
                    console.error("Error loading profile image");
                    e.target.style.display = 'none';
                    e.target.parentElement.textContent = profile.avatar || "👤";
                  }}
                />
              ) : (
                profile.avatar || "👤"
              )}
            </div>
            
            <div className="moodora-profile-details">
              <h1 className="moodora-profile-title">Profile</h1>
              
              {!isEditing ? (
                <div className="moodora-profile-info">
                  <div className="moodora-profile-name">{profile.name || "Anonymous User"}</div>
                  <div className="moodora-profile-contact">@{profile.username || "username"}</div>
                  <div className="moodora-profile-contact">{profile.email || "user@example.com"}</div>
                  {profile.bio && (
                    <div className="moodora-profile-bio" style={{ marginTop: '10px', fontSize: '14px', color: '#666' }}>
                      {profile.bio}
                    </div>
                  )}
                </div>
              ) : (
                <div className="moodora-edit-form">
                  <div className="moodora-form-row">
                    <input
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleInputChange}
                      placeholder="Your name"
                      className="moodora-form-input"
                    />
                  </div>
                  <div className="moodora-form-row">
                    <input
                      type="text"
                      name="username"
                      value={formData.username}
                      onChange={handleInputChange}
                      placeholder="Username"
                      className="moodora-form-input"
                    />
                  </div>
                  <div className="moodora-form-row">
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      placeholder="Email"
                      className="moodora-form-input"
                    />
                  </div>
                </div>
              )}

              {!isEditing ? (
                <button
                  className="moodora-btn moodora-btn-save"
                  onClick={() => {
                    setFormData(profile)
                    setIsEditing(true)
                  }}
                >
                  ✏️ Edit Profile
                </button>
              ) : (
                <>
                  <button className="moodora-btn moodora-btn-save" onClick={handleSave}>
                    💾 Save Changes
                  </button>
                  <button className="moodora-btn moodora-btn-cancel" onClick={handleCancel}>
                    Cancel
                  </button>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Right Column - Content */}
        <div className="moodora-profile-right">
          {/* My Posts Section */}
          <div className="moodora-section-card">
            <h2>My Posts</h2>
            
            {/* Tabs for image/text posts */}
            <div className="moodora-profile-tabs">
              <button
                className={`moodora-tab-btn ${activeTab === "images" ? "moodora-active" : ""}`}
                onClick={() => setActiveTab("images")}
              >
                🖼️ Images ({imagePosts.length})
              </button>
              <button
                className={`moodora-tab-btn ${activeTab === "text" ? "moodora-active" : ""}`}
                onClick={() => setActiveTab("text")}
              >
                📝 Text & Poems ({textPosts.length})
              </button>
            </div>
            
            <div className="moodora-user-posts-container">
              {activeTab === "images" && renderUserPosts(imagePosts)}
              {activeTab === "text" && renderUserPosts(textPosts)}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}