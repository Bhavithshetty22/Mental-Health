// src/pages/Community.jsx
import React, { useEffect, useState } from "react";
import "./Community.css";
import UploadModal from "../components/UploadModal";

const API_BASE = process.env.REACT_APP_API_BASE || "";

export default function CommunityPage() {
  const [posts, setPosts] = useState([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [showUpload, setShowUpload] = useState(false);
  const [error, setError] = useState("");

  const fetchPosts = async (p = 1) => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/community?page=${p}&limit=12`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to fetch");
      setPosts(data.posts || []);
      setPage(data.page || 1);
    } catch (err) {
      console.error(err);
      setError(err.message || "Error loading community posts");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPosts();
  }, []);

  const handleUploadSuccess = (newPost) => {
    // prepend new post so user sees it immediately
    setPosts(prev => [newPost, ...prev]);
    setShowUpload(false);
  };

  const handleLike = async (postId) => {
    const token = localStorage.getItem("token");
    if (!token) {
      alert("Please sign in to like posts.");
      return;
    }
    try {
      const res = await fetch(`${API_BASE}/api/community/${postId}/like`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Like failed");
      // We do not show like counts; optionally indicate like toggled locally by disabling the button briefly
      // For UX, you could store which posts this user liked in local state; to keep it simple we do an animation
      // Refresh posts list to reflect potential data changes (still won't show counts)
      fetchPosts(page);
    } catch (err) {
      console.error("Like error:", err);
      alert("Failed to like post");
    }
  };

  return (
    <div className="community-page">
      <header className="community-header">
        <h1>Community</h1>
        <p className="subtitle">Share poems, stories, or images you love. Identities & like counts are hidden to encourage safe sharing.</p>

        <div className="controls">
          <button className="btn primary" onClick={() => setShowUpload(true)}>＋ Create Post</button>
          <button className="btn ghost" onClick={() => fetchPosts()}>Refresh</button>
        </div>
      </header>

      {error && <div className="error">{error}</div>}

      <main className="community-feed">
        {loading ? (
          <div className="loading">Loading posts…</div>
        ) : posts.length === 0 ? (
          <div className="empty">No posts yet — be the first to share something kind.</div>
        ) : (
          posts.map(post => (
            <article className="community-post" key={post.id}>
              {post.image && (
                <div className="post-image">
                  <img src={post.image.startsWith("http") ? post.image : `${API_BASE}${post.image}`} alt="community" />
                </div>
              )}
              {post.text && <div className="post-text">{post.text}</div>}
              <div className="post-footer">
                <div className="post-meta">Posted: {new Date(post.createdAt).toLocaleString()}</div>
                <div className="post-actions">
                  <button className="like-btn" onClick={() => handleLike(post.id)}>❤ Like</button>
                  {/* Like count intentionally not displayed */}
                </div>
              </div>
            </article>
          ))
        )}
      </main>

      <footer className="community-footer">
        <button className="btn ghost" onClick={() => { /* TODO: prev page */ }} disabled={page <= 1}>Prev</button>
        <span>Page {page}</span>
        <button className="btn ghost" onClick={() => { setPage(p => { const np = p+1; fetchPosts(np); return np; }) }}>Next</button>
      </footer>

      {showUpload && (
        <UploadModal
          onClose={() => setShowUpload(false)}
          onSuccess={handleUploadSuccess}
        />
      )}
    </div>
  );
}
