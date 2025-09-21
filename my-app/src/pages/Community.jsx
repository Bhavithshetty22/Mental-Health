// src/pages/Community.jsx
import React, { useEffect, useState } from "react";
import "./Community.css";
import UploadModal from "../components/UploadModal";

const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:5000"

export default function CommunityPage() {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showUpload, setShowUpload] = useState(false);

  const fetchPosts = async () => {
    setLoading(true);
    try {
      const resp = await fetch(`${API_BASE}/api/community`);
      if (!resp.ok) throw new Error("Failed to load posts");
      const data = await resp.json();
      // posts are shown in reverse chronological order
      setPosts(Array.isArray(data.posts) ? data.posts.reverse() : []);
    } catch (err) {
      console.error("Could not fetch community posts", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPosts();
  }, []);

  return (
    <div className="community-page">
      <header className="community-header">
        <h1>Community</h1>
        <p>Share a poem, story, or AI creation. Posts are anonymous and like counts are hidden.</p>

        <div className="community-actions">
          <button className="btn primary" onClick={() => setShowUpload(true)}>
            ➕ Share something
          </button>
        </div>
      </header>

      <main className="community-list">
        {loading ? (
          <div className="loading">Loading posts…</div>
        ) : posts.length === 0 ? (
          <div className="empty">No posts yet — be the first to share something kind.</div>
        ) : (
          posts.map((p) => (
            <article key={p._id} className="community-post">
              {p.title && <h3 className="post-title">{p.title}</h3>}
              {p.content && <div className="post-content" style={{ whiteSpace: "pre-wrap" }}>{p.content}</div>}
              {p.image && (
                <div className="post-image">
                  <img src={p.image} alt="user upload" />
                </div>
              )}
              <div className="post-meta">
                <span>{new Date(p.createdAt).toLocaleString()}</span>
                <span aria-hidden style={{ opacity: 0.6 }}> • anonymous</span>
              </div>
            </article>
          ))
        )}
      </main>

      {showUpload && (
        <UploadModal
          onClose={() => setShowUpload(false)}
          onUploaded={() => { fetchPosts(); }}
        />
      )}
    </div>
  );
}
