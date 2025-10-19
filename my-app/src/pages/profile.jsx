"use client"

import { useState } from "react"
import "./profile.css"

export default function ProfileNew() {
  const [profile, setProfile] = useState({
    name: "Sarah Rahman",
    phone: "+1 555-369-9200",
    email: "sarah.rahman001@gmail.com",
    avatar: "👤",
    smsAlerts: true,
  })

  const [isEditing, setIsEditing] = useState(false)
  const [formData, setFormData] = useState(profile)

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
                <>
                  <p className="profile-name">{profile.name}</p>
                  <p className="profile-contact">{profile.phone}</p>
                  <p className="profile-contact">{profile.email}</p>
                </>
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

        {/* Right Column - Accounts & Bills */}
        <div className="profile-right">
            {/*mood section*/}
          <div className="section-card">
            Today's mood
          </div>

          {/* uploaded images */}
          <div className="section-card">
            Uploaded images
          </div>
        </div>
      </div>
    </div>
  )
}
