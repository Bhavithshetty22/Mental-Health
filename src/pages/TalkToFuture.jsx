// TalkToFuture.jsx
import React, { useState } from "react";
import "./TalkToFuture.css";

export default function TalkToFuture() {
  const [situation, setSituation] = useState("");
  const [letter, setLetter] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    setLetter(null);

    if (!situation.trim()) {
      setError("Please describe your situation.");
      return;
    }

    setLoading(true);
    try {
      const url = "http://localhost:5000/api/generate"; // full backend URL
      const resp = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ situation }),
      });

      const raw = await resp.text();

      if (!resp.ok) {
        let errMsg;
        try {
          const parsed = JSON.parse(raw || "{}");
          errMsg = parsed?.error || parsed?.details || JSON.stringify(parsed);
        } catch {
          errMsg = raw || resp.statusText;
        }
        setError(`Server error ${resp.status}: ${errMsg}`);
        return;
      }

      if (!raw) {
        setError("Empty server response.");
        return;
      }

      let data;
      try {
        data = JSON.parse(raw);
      } catch {
        setLetter(raw);
        return;
      }

      if (data?.crisis) setLetter(data.message);
      else if (data?.letter) setLetter(data.letter);
      else setLetter(JSON.stringify(data));
    } catch (err) {
      console.error(err);
      setError("Network error. Make sure backend is running and URL is correct.");
    } finally {
      setLoading(false);
    }
  }

  function resetAll() {
    setSituation("");
    setLetter(null);
    setError(null);
  }

  return (
    <div className="page-root vintage-root">
      <div className="card">
        <header className="card-header">
          <h1>Talk to Future</h1>
          <p className="subtitle">Tell your future self what's happening. Receive a calm, hopeful letter back.</p>
        </header>

        <form onSubmit={handleSubmit} className="form">
          <label className="label">Your current situation</label>
          <textarea
            value={situation}
            onChange={(e) => setSituation(e.target.value)}
            rows={7}
            placeholder="Type what's going on—your worries, the problem, small details..."
          />

          <div className="actions">
            <button className="btn primary" type="submit" disabled={loading}>
              {loading ? "Writing..." : "Send to Future"}
            </button>

            <button className="btn ghost" type="button" onClick={resetAll}>
              Reset
            </button>
          </div>

          {error && <div className="error">{error}</div>}
        </form>

        {letter && (
          <section className="letter-wrap">
            <div className="parchment" role="region" aria-live="polite">
              {/* Decorative torn shadow layers to increase realism */}
              <div className="torn-edge top" aria-hidden="true" />
              <div className="torn-edge bottom" aria-hidden="true" />

              <div className="parchment-inner">
                <h2>A letter from your future self 💌</h2>
                <div className="parchment-body" style={{ whiteSpace: "pre-wrap" }}>
                  {letter}
                </div>
              </div>

              {/* subtle floating dust */}
              <div className="dust" aria-hidden="true" />
            </div>
          </section>
        )}

        <footer className="note">
          <strong>Note:</strong> This tool provides supportive messages only. If you or someone is in crisis, contact local emergency services or a crisis hotline immediately.
        </footer>
      </div>
    </div>
  );
}
