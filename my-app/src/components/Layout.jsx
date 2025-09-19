// src/components/Layout.jsx
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { Home, BarChart3, Settings, Calendar, MessageCircle } from 'lucide-react';
import './Layout.css';

function Layout() {
  const location = useLocation();
  const navigate = useNavigate();

  const isActive = (path) => {
    if (path === '/' && location.pathname === '/') return true;
    if (path !== '/' && location.pathname.startsWith(path)) return true;
    return false;
  };

  return (
    <div className="layout">
      {/* Optional: Navigation Header */}
      <nav className="main-navigation">
        <div className="nav-brand">
          <h2>MOODORA</h2>
        </div>
        <div className="nav-links">
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
            to="/daily-journal"
            className={`nav-link ${isActive('/daily-journal') ? 'active' : ''}`}
          >
            <BarChart3 size={20} />
            <span className="nav-text">Daily Journal</span>
          </Link>

          {/* Settings - use navigate to ensure it routes to /settings (LoginSignup) */}
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

      {/* Main content area */}
      <main className="main-content">
        <Outlet />
      </main>
    </div>
  );
}

export default Layout;
