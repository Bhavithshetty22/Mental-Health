// src/pages/Community.jsx
import React, { useEffect, useState } from "react";
import "./Community.css";
import UploadModal from "../components/UploadModal";

const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:5000";

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
      // produce newest-first safely (don't mutate original array)
      const list = Array.isArray(data.posts) ? [...data.posts].reverse() : [];
      setPosts(list);
    } catch (err) {
      console.error("Could not fetch community posts", err);
      setPosts([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPosts();
  }, []);

  // small helper: display-friendly date
  const formatDate = (iso) => {
    try {
      return new Date(iso).toLocaleString();
    } catch {
      return iso;
    }
  };

  return (
    <div className="community-page">
      <header className="community-header">
        <div>
          <h1>Community</h1>
          <p className="subtitle">Share a poem, story, or AI creation. Posts are anonymous and like counts are hidden.</p>
        </div>

        <div className="community-actions">
          <button className="btn primary" onClick={() => setShowUpload(true)}>
            ➕ Share something
          </button>
        </div>
      </header>

      <main className="community-feed">
        {loading ? (
          <div className="empty loading">Loading posts…</div>
        ) : posts.length === 0 ? (
          <div className="empty">No posts yet — be the first to share something kind.</div>
        ) : (
          posts.map((p) => {
            const hasImage = !!p.image;
            return (
              <article key={p._id} className={`community-post ${hasImage ? "with-image" : "text-only"}`}>
                {hasImage && (
                  <div className="post-image">
                    {/* lazy loading for performance; object-fit via CSS */}
                    <img src={p.image} alt={p.title ? p.title : "Community image"} loading="lazy" />
                  </div>
                )}

                <div className="post-body">
                  {p.title && <h3 className="post-title">{p.title}</h3>}
                  {p.content && <div className="post-text">{p.content}</div>}
                </div>

                <div className="post-footer">
                  <span className="post-date">{formatDate(p.createdAt)}</span>
                  <span className="post-anon">• anonymous</span>
                </div>
              </article>
            );
          })
        )}
      </main>

      {showUpload && (
        <UploadModal
          onClose={() => setShowUpload(false)}
          onUploaded={() => {
            fetchPosts();
            setShowUpload(false);
          }}
        />
      )}
    </div>
  );
}
