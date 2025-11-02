// src/pages/ProfileSetup.jsx
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./ProfileSetup.css";

export default function ProfileSetup() {
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState({});
  
  // Form state
  const [profileImage, setProfileImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [bio, setBio] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [gender, setGender] = useState("");
  const [location, setLocation] = useState("");
  const [interests, setInterests] = useState([]);
  const [customInterest, setCustomInterest] = useState("");

  const availableInterests = [
    "Reading", "Writing", "Music", "Art", "Sports", 
    "Travel", "Cooking", "Photography", "Gaming", 
    "Meditation", "Yoga", "Fitness", "Movies", "Nature"
  ];

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setErrors({ ...errors, image: "Please select an image file" });
      return;
    }

    // Validate file size (5MB)
    if (file.size > 5 * 1024 * 1024) {
      setErrors({ ...errors, image: "Image must be smaller than 5MB" });
      return;
    }

    // Convert to base64
    const reader = new FileReader();
    reader.onloadend = () => {
      setProfileImage(reader.result);
      setImagePreview(reader.result);
      setErrors({ ...errors, image: null });
    };
    reader.readAsDataURL(file);
  };

  const toggleInterest = (interest) => {
    if (interests.includes(interest)) {
      setInterests(interests.filter(i => i !== interest));
    } else {
      setInterests([...interests, interest]);
    }
  };

  const addCustomInterest = () => {
    if (customInterest.trim() && !interests.includes(customInterest.trim())) {
      setInterests([...interests, customInterest.trim()]);
      setCustomInterest("");
    }
  };

  const removeInterest = (interest) => {
    setInterests(interests.filter(i => i !== interest));
  };

  const validate = () => {
    const newErrors = {};
    
    if (!profileImage) {
      newErrors.image = "Profile image is required";
    }
    
    if (bio && bio.length > 500) {
      newErrors.bio = "Bio must be less than 500 characters";
    }
    
    if (dateOfBirth) {
      const dob = new Date(dateOfBirth);
      const today = new Date();
      const age = today.getFullYear() - dob.getFullYear();
      if (age < 13) {
        newErrors.dateOfBirth = "You must be at least 13 years old";
      }
    }
    
    return newErrors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const validationErrors = validate();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        throw new Error("No authentication token found");
      }
      
      const res = await fetch(`${import.meta.env.VITE_API_BASE}/api/auth/complete-profile`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          profileImage,
          bio: bio.trim(),
          dateOfBirth: dateOfBirth || null,
          gender: gender || null,
          location: location.trim(),
          interests
        }),
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.message || "Failed to complete profile");
      }
      
      console.log("Profile completed:", data);
      
      // Update user in localStorage
      localStorage.setItem("user", JSON.stringify(data.user));
      
      // Force page reload to update App.js state and redirect to home
      window.location.href = "/";
    } catch (err) {
      setErrors({ general: err.message || "Failed to complete profile" });
      setIsSubmitting(false);
    }
  };

  return (
    <div className="profile-setup-container">
      <div className="profile-setup-card">
        <h1 className="profile-setup-title">Complete Your Profile</h1>
        <p className="profile-setup-subtitle">Tell us a bit about yourself</p>
        
        <form onSubmit={handleSubmit} className="profile-setup-form">
          {errors.general && (
            <div className="error-banner">{errors.general}</div>
          )}
          
          {/* Profile Image */}
          <div className="form-section">
            <label className="form-label required">Profile Picture</label>
            <div className="image-upload-container">
              <div className="image-preview">
                {imagePreview ? (
                  <img src={imagePreview} alt="Profile preview" />
                ) : (
                  <div className="image-placeholder">
                    <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" strokeWidth="2" strokeLinecap="round"/>
                      <circle cx="12" cy="7" r="4" strokeWidth="2"/>
                    </svg>
                    <p>Click to upload</p>
                  </div>
                )}
              </div>
              <input
                type="file"
                accept="image/*"
                onChange={handleImageChange}
                className="image-input"
                id="profile-image"
              />
              <label htmlFor="profile-image" className="image-upload-btn">
                {imagePreview ? "Change Photo" : "Upload Photo"}
              </label>
            </div>
            {errors.image && <span className="field-error">{errors.image}</span>}
          </div>

          {/* Bio */}
          <div className="form-section">
            <label className="form-label">Bio</label>
            <textarea
              className="form-textarea"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Tell us about yourself..."
              rows="4"
              maxLength="500"
            />
            <span className="char-count">{bio.length}/500</span>
            {errors.bio && <span className="field-error">{errors.bio}</span>}
          </div>

          {/* Date of Birth */}
          <div className="form-section">
            <label className="form-label">Date of Birth</label>
            <input
              type="date"
              className="form-input"
              value={dateOfBirth}
              onChange={(e) => setDateOfBirth(e.target.value)}
              max={new Date().toISOString().split('T')[0]}
            />
            {errors.dateOfBirth && <span className="field-error">{errors.dateOfBirth}</span>}
          </div>

          {/* Gender */}
          <div className="form-section">
            <label className="form-label">Gender</label>
            <select
              className="form-select"
              value={gender}
              onChange={(e) => setGender(e.target.value)}
            >
              <option value="">Select gender</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="other">Other</option>
              <option value="prefer-not-to-say">Prefer not to say</option>
            </select>
          </div>

          {/* Location */}
          <div className="form-section">
            <label className="form-label">Location</label>
            <input
              type="text"
              className="form-input"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="City, Country"
              maxLength="100"
            />
          </div>

          {/* Interests */}
          <div className="form-section">
            <label className="form-label">Interests</label>
            <div className="interests-grid">
              {availableInterests.map((interest) => (
                <button
                  key={interest}
                  type="button"
                  className={`interest-tag ${interests.includes(interest) ? 'selected' : ''}`}
                  onClick={() => toggleInterest(interest)}
                >
                  {interest}
                </button>
              ))}
            </div>
            
            {/* Custom Interest */}
            <div className="custom-interest">
              <input
                type="text"
                className="form-input"
                value={customInterest}
                onChange={(e) => setCustomInterest(e.target.value)}
                placeholder="Add custom interest..."
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addCustomInterest())}
              />
              <button
                type="button"
                className="add-interest-btn"
                onClick={addCustomInterest}
              >
                Add
              </button>
            </div>
            
            {/* Selected Interests */}
            {interests.length > 0 && (
              <div className="selected-interests">
                {interests.map((interest) => (
                  <span key={interest} className="selected-interest-tag">
                    {interest}
                    <button
                      type="button"
                      onClick={() => removeInterest(interest)}
                      className="remove-interest"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          <button
            type="submit"
            className="submit-btn"
            disabled={isSubmitting}
          >
            {isSubmitting ? "Completing Profile..." : "Complete Profile"}
          </button>
        </form>
      </div>
    </div>
  );
}