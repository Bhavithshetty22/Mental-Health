// src/pages/LoginSignup.jsx
import React, { useEffect, useState } from "react";
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

  // signup state
  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [signupEmail, setSignupEmail] = useState("");
  const [signupPassword, setSignupPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [signupErrors, setSignupErrors] = useState({});

  // logged in user state (from localStorage)
  const [loggedInUser, setLoggedInUser] = useState(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("user");
      if (raw) {
        setLoggedInUser(JSON.parse(raw));
        // If user is already logged in, take them to dashboard
        navigate("/", { replace: true });
      }
    } catch (e) {
      console.warn("Could not parse stored user", e);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const emailValid = (e) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);
  const passwordValid = (p) => /(?=.{8,})(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9])/.test(p);

  const handleLoginSubmit = async (ev) => {
    ev.preventDefault();
    setLoginError("");
    if (!loginEmailOrUsername.trim() || !loginPassword) {
      setLoginError("Enter email/username and password.");
      return;
    }

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          identifier: loginEmailOrUsername.trim(),
          password: loginPassword,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Login failed");

      // Save token + user and update UI
      localStorage.setItem("token", data.token);
      localStorage.setItem("user", JSON.stringify(data.user));
      setLoggedInUser(data.user);

      // navigate to dashboard (protected area)
      navigate("/", { replace: true });
    } catch (err) {
      setLoginError(err.message || "Login failed");
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

    try {
      const res = await fetch("/api/auth/signup", {
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
      setLoggedInUser(data.user);

      // navigate to dashboard (protected area)
      navigate("/", { replace: true });
    } catch (err) {
      setSignupErrors({ general: err.message || "Signup failed" });
    }
  };

  const [showPasswordLogin, setShowPasswordLogin] = useState(false);
  const [showPasswordSignup, setShowPasswordSignup] = useState(false);

  const handleGoogle = () => {
    window.location.href = "/api/auth/google"; // backend route if implemented
  };

  // Sign out - clear token and user state (keeps component usable)
  const handleSignOut = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setLoggedInUser(null);
    setMode("login");
    // navigate to login page explicitly
    navigate("/settings", { replace: true });
  };

  // Display name preference: username -> name -> email
  const displayName = (user) => {
    if (!user) return "";
    return user.username || user.name || user.email || "(unknown)";
  };

  return (
    <div className="genai-auth-root">
      <div className="auth-card">
        <header className="auth-header">
          <div>
            <h1 className="brand">MoodOra</h1>
            <p className="subtitle">Create and manage prompts, models & experiments</p>
          </div>

          <div className="mode-switch" aria-hidden={!!loggedInUser}>
            {!loggedInUser && (
              <>
                <button className={`tab ${mode === "login" ? "active" : ""}`} onClick={() => setMode("login")}>
                  Login
                </button>
                <button className={`tab ${mode === "signup" ? "active" : ""}`} onClick={() => setMode("signup")}>
                  Signup
                </button>
              </>
            )}
          </div>
        </header>

        <div className="auth-body">
          {loggedInUser ? (
            <div className="user-panel" role="status" aria-live="polite">
              <p style={{ margin: 0, fontSize: 14 }}>
                <strong>Logged in as</strong>{" "}
                <span className="user-name">{displayName(loggedInUser)}</span>
              </p>
              <p style={{ marginTop: 8, color: "var(--muted)", fontSize: 13 }}>
                {loggedInUser.email && <><small>{loggedInUser.email}</small></>}
              </p>

              <div style={{ marginTop: 16, display: "flex", gap: 8 }}>
                <button
                  className="primary"
                  onClick={() => navigate("/", { replace: true })}
                >
                  Continue
                </button>

                <button
                  className="link-btn"
                  onClick={handleSignOut}
                  style={{ alignSelf: "center", padding: "8px 10px", borderRadius: 8 }}
                >
                  Sign out
                </button>
              </div>

              <div style={{ marginTop: 14 }} className="footer-note">
                To confirm your session, token is stored in localStorage (browser). Signing out clears it.
              </div>
            </div>
          ) : (
            <>
              <div className="oauth-row">
                <button className="oauth-btn" onClick={handleGoogle}>
                  <svg viewBox="0 0 48 48" className="g-icon" xmlns="http://www.w3.org/2000/svg">
                    <path fill="#EA4335" d="M24 9.5c3.9 0 7.1 1.4 9.4 3.3l7-7C36.6 2 30.9 0 24 0 14.7 0 6.9 5 3 12.1l8.2 6.4C13.8 14 18.5 9.5 24 9.5z" />
                    <path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.6H24v9h12.6c-.6 3.2-2.6 5.9-5.4 7.6l8.2 6.4C43.6 38.9 46.5 32.3 46.5 24.5z" />
                    <path fill="#FBBC05" d="M11.2 28.5c-.6-1.7-1-3.5-1-5.4s.4-3.7 1-5.4L3 11.3C1.1 14.9 0 19.2 0 24s1.1 9.1 3 12.7l8.2-6.2z" />
                    <path fill="#34A853" d="M24 48c6.6 0 12.2-2.2 16.2-6l-8.2-6.4c-2.3 1.6-5.2 2.5-8 2.5-5.5 0-10.2-4.5-11.6-10.4L3 36.7C6.9 43 14.7 48 24 48z" />
                  </svg>
                  <span>Continue with Google</span>
                </button>
              </div>

              <div className="or-row">
                <span>or use your email</span>
              </div>

              {mode === "login" ? (
                <form className="form" onSubmit={handleLoginSubmit} noValidate>
                  <label className="form-group">
                    <span className="label">Email or Username</span>
                    <input className="input" type="text" value={loginEmailOrUsername} onChange={(e) => setLoginEmailOrUsername(e.target.value)} placeholder="you@example.com" />
                  </label>

                  <label className="form-group">
                    <span className="label">Password</span>
                    <div className="input-with-btn">
                      <input className="input" type={showPasswordLogin ? "text" : "password"} value={loginPassword} onChange={(e) => setLoginPassword(e.target.value)} placeholder="Your password" />
                      <button type="button" className="link-btn" onClick={() => setShowPasswordLogin(s => !s)}>{showPasswordLogin ? "Hide" : "Show"}</button>
                    </div>
                  </label>

                  <div className="row-between">
                    <label className="small">
                      <input type="checkbox" checked={rememberMe} onChange={(e) => setRememberMe(e.target.checked)} /> Remember me
                    </label>
                    <button type="button" className="link-btn">Forgot?</button>
                  </div>

                  {loginError && <div className="error">{loginError}</div>}

                  <button className="primary" type="submit">Sign in</button>
                </form>
              ) : (
                <form className="form" onSubmit={handleSignupSubmit} noValidate>
                  {signupErrors.general && <div className="error">{signupErrors.general}</div>}

                  <label className="form-group">
                    <span className="label">Full Name</span>
                    <input className="input" type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Your full name" />
                    {signupErrors.fullName && <div className="error">{signupErrors.fullName}</div>}
                  </label>

                  <label className="form-group">
                    <span className="label">Username (optional)</span>
                    <input className="input" type="text" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="your_handle" />
                  </label>

                  <label className="form-group">
                    <span className="label">Email</span>
                    <input className="input" type="email" value={signupEmail} onChange={(e) => setSignupEmail(e.target.value)} placeholder="you@example.com" />
                    {signupErrors.email && <div className="error">{signupErrors.email}</div>}
                  </label>

                  <label className="form-group">
                    <span className="label">Password</span>
                    <div className="input-with-btn">
                      <input className="input" type={showPasswordSignup ? "text" : "password"} value={signupPassword} onChange={(e) => setSignupPassword(e.target.value)} placeholder="Create a strong password" />
                      <button type="button" className="link-btn" onClick={() => setShowPasswordSignup(s => !s)}>{showPasswordSignup ? "Hide" : "Show"}</button>
                    </div>
                    {signupErrors.password ? <div className="error">{signupErrors.password}</div> : <div className="hint">Minimum 8 chars, uppercase, lowercase, number & special char</div>}
                  </label>

                  <label className="form-group">
                    <span className="label">Confirm Password</span>
                    <input className="input" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Repeat password" />
                    {signupErrors.confirmPassword && <div className="error">{signupErrors.confirmPassword}</div>}
                  </label>

                  <label className="checkbox-row">
                    <input type="checkbox" checked={acceptTerms} onChange={(e) => setAcceptTerms(e.target.checked)} />
                    <span>I accept the <button type="button" className="link-btn">Terms</button> & <button type="button" className="link-btn">Privacy Policy</button></span>
                  </label>
                  {signupErrors.acceptTerms && <div className="error">{signupErrors.acceptTerms}</div>}

                  <button className="primary" type="submit">Create account</button>
                </form>
              )}

              <div className="footer-note">By continuing you agree to our Terms & Privacy Policy.</div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
