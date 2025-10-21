// src/components/Layout.jsx
import { Outlet, Link, useLocation } from 'react-router-dom';
import { Home, Calendar, MessageCircle, LogOut, Globe } from 'lucide-react';
import { BsJournalBookmarkFill } from "react-icons/bs";
import { RiPsychotherapyLine } from "react-icons/ri";
import './Layout.css';
import { useEffect, useState } from 'react';

function Layout() {
  const location = useLocation();
  const [loggedInUser, setLoggedInUser] = useState(null);
  const [isSigningOut, setIsSigningOut] = useState(false);

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
    setIsSigningOut(true);
    
    // Clear localStorage
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setLoggedInUser(null);
    
    // Use window.location to ensure clean redirect to login
    // This prevents any routing conflicts and ensures a fresh start
    window.location.href = "/login";
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

        {loggedInUser && (
          <button
            type="button"
            onClick={handleSignOut}
            className={`nav-link btn-as-link ${isSigningOut ? 'signing-out' : ''}`}
            aria-label="Sign out"
            title="Sign out"
            disabled={isSigningOut}
            style={{ opacity: isSigningOut ? 0.6 : 1 }}
          >
            <LogOut size={18} />
          </button>
        )}
        <div className="nav-brand">
          <h2>MOODORA</h2>
        </div>

        <div className="nav-links">

          <Link 
            to="/" 
            className={`nav-link ${isActive('/') ? 'active' : ''}`} 
            aria-label="Home"
          >

            <Home size={20} />
          </Link>

          <Link 
            to="/mood-tracker" 
            className={`nav-link ${isActive('/mood-tracker') ? 'active' : ''}`} 
            aria-label="Mood tracker"
          >
            <Calendar size={20} />
          </Link>

          <Link 
            to="/talk-to-future" 
            className={`nav-link ${isActive('/talk-to-future') ? 'active' : ''}`} 
            aria-label="Talk to future"
          >
            <MessageCircle size={20} />
          </Link>


          {/* Community tab (globe) */}
          <Link to="/community" className={`nav-link ${isActive('/community') ? 'active' : ''}`} aria-label="Community">
            <Globe size={20} />
          </Link>

          <Link to="/daily-journal" className={`nav-link ${isActive('/daily-journal') ? 'active' : ''}`} aria-label="Daily journal">

            <BsJournalBookmarkFill size={20} />
          </Link>

          <Link 
            to="/ai-therapy" 
            className={`nav-link ${isActive('/ai-therapy') ? 'active' : ''}`} 
            aria-label="AI therapy"
          >
            <RiPsychotherapyLine size={20} />
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