// src/pages/LoginSignup.jsx
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./GenAIAuth.css";

export default function LoginSignup() {
  const navigate = useNavigate();
  const [mode, setMode] = useState("login"); // "login" or "signup"

  // login state
  const [loginEmailOrUsername, setLoginEmailOrUsername] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // signup state
  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [signupEmail, setSignupEmail] = useState("");
  const [signupPassword, setSignupPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [signupErrors, setSignupErrors] = useState({});
  const [isSigningUp, setIsSigningUp] = useState(false);

  const emailValid = (e) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);
  const passwordValid = (p) => /(?=.{8,})(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9])/.test(p);

  const handleLoginSubmit = async (ev) => {
    ev.preventDefault();
    setLoginError("");
    setIsLoggingIn(true);
    
    if (!loginEmailOrUsername.trim() || !loginPassword) {
      setLoginError("Enter email/username and password.");
      setIsLoggingIn(false);
      return;
    }

    try {
      const res = await fetch(`${import.meta.env.VITE_API_BASE}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          identifier: loginEmailOrUsername.trim(),
          password: loginPassword,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Login failed");

      // Save token + user
      localStorage.setItem("token", data.token);
      localStorage.setItem("user", JSON.stringify(data.user));

      // Force a page reload to trigger the App.js authentication check
      window.location.href = "/";
    } catch (err) {
      setLoginError(err.message || "Login failed");
      setIsLoggingIn(false);
    }
  };

  const validateSignup = () => {
    const errors = {};
    if (!fullName.trim()) errors.fullName = "Full name required.";
    if (!signupEmail.trim()) errors.email = "Email required.";
    else if (!emailValid(signupEmail)) errors.email = "Invalid email.";
    if (!signupPassword) errors.password = "Password required.";
    else if (!passwordValid(signupPassword))
      errors.password = "Min 8 chars, uppercase, lowercase, digit & special char.";
    if (signupPassword !== confirmPassword) errors.confirmPassword = "Passwords must match.";
    if (!acceptTerms) errors.acceptTerms = "You must accept Terms & Privacy Policy.";
    return errors;
  };

  const handleSignupSubmit = async (ev) => {
    ev.preventDefault();
    const errors = validateSignup();
    setSignupErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setIsSigningUp(true);

    try {
      const res = await fetch(`${import.meta.env.VITE_API_BASE}/api/auth/signup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: fullName.trim(),
          username: username.trim() || undefined,
          email: signupEmail.trim(),
          password: signupPassword,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Signup failed");

      localStorage.setItem("token", data.token);
      localStorage.setItem("user", JSON.stringify(data.user));

      // Force a page reload to trigger the App.js authentication check
      window.location.href = "/";
    } catch (err) {
      setSignupErrors({ general: err.message || "Signup failed" });
      setIsSigningUp(false);
    }
  };

  return (
    <div className="genai-auth-root">
      {/* Left side - Illustration */}
      <div className="auth-illustration">
        <div className="illustration-content">
    
        </div>
      </div>

      {/* Right side - Form */}
      <div className="auth-form-container">
        <div className="auth-form-wrapper">
          <h1 className="auth-logo">MOODORA</h1>

          {mode === "login" ? (
            <form className="auth-form" onSubmit={handleLoginSubmit} noValidate>
              <div className="form-field">
                <label className="field-label">Email</label>
                <input 
                  className="field-input" 
                  type="text" 
                  value={loginEmailOrUsername} 
                  onChange={(e) => setLoginEmailOrUsername(e.target.value)} 
                  disabled={isLoggingIn}
                />
              </div>

              <div className="form-field">
                <label className="field-label">Password</label>
                <input 
                  className="field-input" 
                  type="password" 
                  value={loginPassword} 
                  onChange={(e) => setLoginPassword(e.target.value)} 
                  disabled={isLoggingIn}
                />
              </div>

              {loginError && <div className="field-error">{loginError}</div>}

              <button 
                className="submit-btn" 
                type="submit" 
                disabled={isLoggingIn}
              >
                {isLoggingIn ? "Logging in..." : "Login"}
              </button>

              <div className="switch-mode">
                don't have an account?{' '}
                <button 
                  type="button" 
                  className="switch-link" 
                  onClick={() => setMode("signup")}
                  disabled={isLoggingIn}
                >
                  Sign up
                </button>
              </div>
            </form>
          ) : (
            <form className="auth-form" onSubmit={handleSignupSubmit} noValidate>
              {signupErrors.general && <div className="field-error">{signupErrors.general}</div>}

              <div className="form-field">
                <label className="field-label">Full Name</label>
                <input 
                  className="field-input" 
                  type="text" 
                  value={fullName} 
                  onChange={(e) => setFullName(e.target.value)} 
                  disabled={isSigningUp}
                />
                {signupErrors.fullName && <div className="field-error-inline">{signupErrors.fullName}</div>}
              </div>

              <div className="form-field">
                <label className="field-label">Username (optional)</label>
                <input 
                  className="field-input" 
                  type="text" 
                  value={username} 
                  onChange={(e) => setUsername(e.target.value)} 
                  disabled={isSigningUp}
                />
              </div>

              <div className="form-field">
                <label className="field-label">Email</label>
                <input 
                  className="field-input" 
                  type="email" 
                  value={signupEmail} 
                  onChange={(e) => setSignupEmail(e.target.value)} 
                  disabled={isSigningUp}
                />
                {signupErrors.email && <div className="field-error-inline">{signupErrors.email}</div>}
              </div>

              <div className="form-field">
                <label className="field-label">Password</label>
                <input 
                  className="field-input" 
                  type="password" 
                  value={signupPassword} 
                  onChange={(e) => setSignupPassword(e.target.value)} 
                  disabled={isSigningUp}
                />
                {signupErrors.password && <div className="field-error-inline">{signupErrors.password}</div>}
              </div>

              <div className="form-field">
                <label className="field-label">Confirm Password</label>
                <input 
                  className="field-input" 
                  type="password" 
                  value={confirmPassword} 
                  onChange={(e) => setConfirmPassword(e.target.value)} 
                  disabled={isSigningUp}
                />
                {signupErrors.confirmPassword && <div className="field-error-inline">{signupErrors.confirmPassword}</div>}
              </div>

              <div className="checkbox-field">
                <label className="checkbox-label">
                  <input 
                    type="checkbox" 
                    checked={acceptTerms} 
                    onChange={(e) => setAcceptTerms(e.target.checked)}
                    disabled={isSigningUp}
                  />
                  <span>I accept the Terms & Privacy Policy</span>
                </label>
                {signupErrors.acceptTerms && <div className="field-error-inline">{signupErrors.acceptTerms}</div>}
              </div>

              <button 
                className="submit-btn" 
                type="submit" 
                disabled={isSigningUp}
              >
                {isSigningUp ? "Creating account..." : "Sign up"}
              </button>

              <div className="switch-mode">
                Already have an account?{' '}
                <button 
                  type="button" 
                  className="switch-link" 
                  onClick={() => setMode("login")}
                  disabled={isSigningUp}
                >
                  Login
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}