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
  const [rememberMe, setRememberMe] = useState(false);
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
      // This ensures the routing updates properly
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

  const [showPasswordLogin, setShowPasswordLogin] = useState(false);
  const [showPasswordSignup, setShowPasswordSignup] = useState(false);

  const handleGoogle = () => {
    window.location.href = "/api/auth/google"; // backend route if implemented
  };

  return (
    <div className="genai-auth-root">
      <div className="auth-card">
        <header className="auth-header">
          <div>
            <h1 className="brand">MoodOra</h1>
            <p className="subtitle">Your personal mood and wellness companion</p>
          </div>

          <div className="mode-switch">
            <button 
              className={`tab ${mode === "login" ? "active" : ""}`} 
              onClick={() => setMode("login")}
              disabled={isLoggingIn || isSigningUp}
            >
              Login
            </button>
            <button 
              className={`tab ${mode === "signup" ? "active" : ""}`} 
              onClick={() => setMode("signup")}
              disabled={isLoggingIn || isSigningUp}
            >
              Signup
            </button>
          </div>
        </header>

        <div className="auth-body">
          <div className="oauth-row">
            
          </div>

          
          {mode === "login" ? (
            <form className="form" onSubmit={handleLoginSubmit} noValidate>
              <label className="form-group">
                <span className="label">Email or Username</span>
                <input 
                  className="input" 
                  type="text" 
                  value={loginEmailOrUsername} 
                  onChange={(e) => setLoginEmailOrUsername(e.target.value)} 
                  placeholder="you@example.com"
                  disabled={isLoggingIn}
                />
              </label>

              <label className="form-group">
                <span className="label">Password</span>
                <div className="input-with-btn">
                  <input 
                    className="input" 
                    type={showPasswordLogin ? "text" : "password"} 
                    value={loginPassword} 
                    onChange={(e) => setLoginPassword(e.target.value)} 
                    placeholder="Your password"
                    disabled={isLoggingIn}
                  />
                  <button 
                    type="button" 
                    className="link-btn" 
                    onClick={() => setShowPasswordLogin(s => !s)}
                    disabled={isLoggingIn}
                  >
                    {showPasswordLogin ? "Hide" : "Show"}
                  </button>
                </div>
              </label>

              <div className="row-between">
                <label className="small">
                  <input 
                    type="checkbox" 
                    checked={rememberMe} 
                    onChange={(e) => setRememberMe(e.target.checked)}
                    disabled={isLoggingIn}
                  /> 
                  Remember me
                </label>
                <button type="button" className="link-btn" disabled={isLoggingIn}>
                  Forgot?
                </button>
              </div>

              {loginError && <div className="error">{loginError}</div>}

              <button 
                className="primary" 
                type="submit" 
                disabled={isLoggingIn}
                style={{ opacity: isLoggingIn ? 0.7 : 1 }}
              >
                {isLoggingIn ? "Signing in..." : "Sign in"}
              </button>
            </form>
          ) : (
            <form className="form" onSubmit={handleSignupSubmit} noValidate>
              {signupErrors.general && <div className="error">{signupErrors.general}</div>}

              <label className="form-group">
                <span className="label">Full Name</span>
                <input 
                  className="input" 
                  type="text" 
                  value={fullName} 
                  onChange={(e) => setFullName(e.target.value)} 
                  placeholder="Your full name"
                  disabled={isSigningUp}
                />
                {signupErrors.fullName && <div className="error">{signupErrors.fullName}</div>}
              </label>

              <label className="form-group">
                <span className="label">Username (optional)</span>
                <input 
                  className="input" 
                  type="text" 
                  value={username} 
                  onChange={(e) => setUsername(e.target.value)} 
                  placeholder="your_handle"
                  disabled={isSigningUp}
                />
              </label>

              <label className="form-group">
                <span className="label">Email</span>
                <input 
                  className="input" 
                  type="email" 
                  value={signupEmail} 
                  onChange={(e) => setSignupEmail(e.target.value)} 
                  placeholder="you@example.com"
                  disabled={isSigningUp}
                />
                {signupErrors.email && <div className="error">{signupErrors.email}</div>}
              </label>

              <label className="form-group">
                <span className="label">Password</span>
                <div className="input-with-btn">
                  <input 
                    className="input" 
                    type={showPasswordSignup ? "text" : "password"} 
                    value={signupPassword} 
                    onChange={(e) => setSignupPassword(e.target.value)} 
                    placeholder="Create a strong password"
                    disabled={isSigningUp}
                  />
                  <button 
                    type="button" 
                    className="link-btn" 
                    onClick={() => setShowPasswordSignup(s => !s)}
                    disabled={isSigningUp}
                  >
                    {showPasswordSignup ? "Hide" : "Show"}
                  </button>
                </div>
                {signupErrors.password ? 
                  <div className="error">{signupErrors.password}</div> : 
                  <div className="hint">Minimum 8 chars, uppercase, lowercase, number & special char</div>
                }
              </label>

              <label className="form-group">
                <span className="label">Confirm Password</span>
                <input 
                  className="input" 
                  type="password" 
                  value={confirmPassword} 
                  onChange={(e) => setConfirmPassword(e.target.value)} 
                  placeholder="Repeat password"
                  disabled={isSigningUp}
                />
                {signupErrors.confirmPassword && <div className="error">{signupErrors.confirmPassword}</div>}
              </label>

              <label className="checkbox-row">
                <input 
                  type="checkbox" 
                  checked={acceptTerms} 
                  onChange={(e) => setAcceptTerms(e.target.checked)}
                  disabled={isSigningUp}
                />
                <span>
                  I accept the <button type="button" className="link-btn" disabled={isSigningUp}>Terms</button> & <button type="button" className="link-btn" disabled={isSigningUp}>Privacy Policy</button>
                </span>
              </label>
              {signupErrors.acceptTerms && <div className="error">{signupErrors.acceptTerms}</div>}

              <button 
                className="primary" 
                type="submit" 
                disabled={isSigningUp}
                style={{ opacity: isSigningUp ? 0.7 : 1 }}
              >
                {isSigningUp ? "Creating account..." : "Create account"}
              </button>
            </form>
          )}

          <div className="footer-note">
            By continuing you agree to our Terms & Privacy Policy.
          </div>
        </div>
      </div>
    </div>
  );
}