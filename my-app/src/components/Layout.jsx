// src/components/Layout.jsx
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { Home, Calendar, MessageCircle, LogOut } from 'lucide-react';
import { BsJournalBookmarkFill } from "react-icons/bs";
import { RiPsychotherapyLine } from "react-icons/ri";
import './Layout.css';
import { useEffect, useState } from 'react';

function Layout() {
  const location = useLocation();
  const navigate = useNavigate();
  const [loggedInUser, setLoggedInUser] = useState(null);

  // read localStorage on mount and whenever pathname changes
  useEffect(() => {
    try {
      const raw = localStorage.getItem("user");
      setLoggedInUser(raw ? JSON.parse(raw) : null);
    } catch (e) {
      console.warn("Could not parse stored user", e);
      setLoggedInUser(null);
    }
  }, [location.pathname]);

  // keep in sync across tabs (optional but useful)
  useEffect(() => {
    const handler = (ev) => {
      if (ev.key === "user") {
        try {
          setLoggedInUser(ev.newValue ? JSON.parse(ev.newValue) : null);
        } catch {
          setLoggedInUser(null);
        }
      }
    };
    window.addEventListener("storage", handler);
    return () => window.removeEventListener("storage", handler);
  }, []);

  const handleSignOut = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setLoggedInUser(null);
    // optional: notify other parts of app
    window.dispatchEvent(new Event("storage")); // lightweight hint
    // navigate to login/signup or home
    navigate("/settings"); // your Login/Signup route
  };

  const isActive = (path) => {
    const p = (location.pathname || "/").toLowerCase();
    const normalized = path.toLowerCase();
    if (normalized === '/' && p === '/') return true;
    return p === normalized || p.startsWith(normalized + '/') || p.startsWith(normalized + '?') || p === normalized;
  };

  return (
    <div className="layout">
      <nav className="main-navigation">
        <div className="nav-brand">
          <h2>MOODORA</h2>
        </div>

        <div className="nav-links">
          {/* Sign out button at left-most if logged in */}
          {loggedInUser && (
            <button
              type="button"
              onClick={handleSignOut}
              className={`nav-link btn-as-link`}
              aria-label="Sign out"
              title="Sign out"
            >
              <LogOut size={18} />
            </button>
          )}

          <Link to="/" className={`nav-link ${isActive('/') ? 'active' : ''}`} aria-label="Home">
            <Home size={20} />
          </Link>

          <Link to="/mood-tracker" className={`nav-link ${isActive('/mood-tracker') ? 'active' : ''}`} aria-label="Mood tracker">
            <Calendar size={20} />
          </Link>

          <Link to="/talk-to-future" className={`nav-link ${isActive('/talk-to-future') ? 'active' : ''}`} aria-label="Talk to future">
            <MessageCircle size={20} />
          </Link>

          <Link to="/daily-journal" className={`nav-link ${isActive('/daily-journal') ? 'active' : ''}`} aria-label="Daily journal">
            <BsJournalBookmarkFill size={20} />
            <span className="nav-text">Daily Journal</span>
          </Link>

          <Link to="/ai-therapy" className={`nav-link ${isActive('/ai-therapy') ? 'active' : ''}`} aria-label="AI therapy">
            <RiPsychotherapyLine size={20} />
            <span className="nav-text">AI Therapy</span>
          </Link>
        </div>
      </nav>

      <main className="main-content">
        <Outlet />
      </main>
    </div>
  );
}

export default Layout;
