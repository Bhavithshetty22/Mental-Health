// src/components/Layout.jsx
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { Home, BarChart3, Settings, Calendar, MessageCircle, LogOut } from 'lucide-react';
import './Layout.css';
import { useEffect, useState } from 'react';

function Layout() {
  const location = useLocation();
  const navigate = useNavigate();
  const [loggedInUser, setLoggedInUser] = useState(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("user");
      if (raw) {
        setLoggedInUser(JSON.parse(raw));
      }
    } catch (e) {
      console.warn("Could not parse stored user", e);
    }
  }, [location.pathname]); // re-check when route changes

  const handleSignOut = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setLoggedInUser(null);
    navigate("/settings"); // redirect to login/signup
  };

  const isActive = (path) => {
    if (path === '/' && location.pathname === '/') return true;
    if (path !== '/' && location.pathname.startsWith(path)) return true;
    return false;
  };

  return (
    <div className="layout">
      <nav className="main-navigation">
        <div className="nav-brand">
          <h2>MOODORA</h2>
        </div>
        <div className="nav-links">

          {/* ✅ Signout button only when logged in */}
          {loggedInUser && (
            <button
              type="button"
              onClick={handleSignOut}
              className="nav-link btn-as-link"
              aria-label="Sign out"
              style={{ color: "red" }}
            >
              <LogOut size={20} />
            </button>
          )}

          <Link to="/" className={`nav-link ${isActive('/') ? 'active' : ''}`}>
            <Home size={20} />
          </Link>

          <Link
            to="/mood-tracker"
            className={`nav-link ${isActive('/mood-tracker') ? 'active' : ''}`}
          >
            <Calendar size={20} />
          </Link>

          <Link
            to="/talk-to-future"
            className={`nav-link ${isActive('/talk-to-future') ? 'active' : ''}`}
          >
            <MessageCircle size={20} />
          </Link>

          <Link
            to="/AiTherapy"
            className={`nav-link ${isActive('/AiTherapy') ? 'active' : ''}`}
          >
            <BarChart3 size={20} />
            <span className="nav-text">Daily Journal</span>
          </Link>

          <button
            type="button"
            onClick={() => navigate('/settings')}
            className={`nav-link btn-as-link ${isActive('/settings') ? 'active' : ''}`}
            aria-label="Settings"
          >
            <Settings size={20} />
            <span className="nav-text">Settings</span>
          </button>
        </div>
      </nav>

      <main className="main-content">
        <Outlet />
      </main>
    </div>
  );
}

export default Layout;
