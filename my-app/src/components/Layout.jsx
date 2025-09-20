import { Outlet, Link, useLocation } from 'react-router-dom';
import { Home, BarChart3, Settings, Calendar, MessageCircle } from 'lucide-react';
import { BsJournalBookmarkFill } from "react-icons/bs";
import { RiPsychotherapyLine } from "react-icons/ri";
import './Layout.css';

function Layout() {
  const location = useLocation();

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
            className={`nav-link ${isActive('/DailyJournal') ? 'active' : ''}`}
          >
            <BsJournalBookmarkFill size={20} />
      
            
          </Link>

          <Link
            to="/ai-therapy"
            className={`nav-link ${isActive('/AiTherapy') ? 'active' : ''}`}
          >
            <RiPsychotherapyLine size={20} />
            
          </Link>
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
