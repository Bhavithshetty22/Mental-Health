// backend/routes/songs.js
// Full rewritten file — normalizes YouTube links, verifies availability via YouTube oEmbed,
// and falls back to a YouTube search URL when the video is removed/private or malformed.

const express = require("express");
const router = express.Router();
const axios = require("axios");
const { GoogleGenerativeAI } = require("@google/generative-ai");

const GEMINI_KEY = process.env.GEMINI_API_KEY || "";
const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-1.5-flash";
const USE_FAKE = process.env.USE_FAKE === "true";

let genAI = null;
if (GEMINI_KEY) {
  try {
    genAI = new GoogleGenerativeAI(GEMINI_KEY);
  } catch (err) {
    console.warn("Could not instantiate GoogleGenerativeAI in songs route:", err?.message);
  }
}

/* ---------- Helpers ---------- */
function safeParseJson(text) {
  try {
    return JSON.parse(text);
  } catch {
    // try to extract a JSON array/object blob from noisy output
    const match = text.match(/(\[\s*\{[\s\S]*\}\s*\])/m);
    if (match) {
      try {
        return JSON.parse(match[1]);
      } catch {
        return null;
      }
    }
    return null;
  }
}

// sanitize and validate a direct URL coming from model (handles YouTube links)
// Normalizes youtu.be, youtube.com/shorts, watch?v=... -> canonical https://www.youtube.com/watch?v=VIDEOID
function sanitizeUrl(raw) {
  let s = String(raw).trim();

  // strip common wrappers and whitespace/newlines/tabs
  s = s.replace(/^<|>$/g, "").replace(/^['"`]+|['"`]+$/g, "");
  s = s.replace(/[\r\n\t]+/g, " ").trim();

  // remove surrounding parentheses if they wrap the whole url
  if (/^\(.+\)$/.test(s)) s = s.slice(1, -1).trim();

  // collapse multiple spaces and strip trailing punctuation
  s = s.replace(/\s+/g, " ").replace(/[)\],;:!?]+$/g, "");

  // youtu.be short link (e.g. https://youtu.be/VIDEOID)
  const ytShortMatch = s.match(/(?:https?:\/\/)?(?:www\.)?youtu\.be\/([A-Za-z0-9_-]{11})/i);
  if (ytShortMatch) {
    return `https://www.youtube.com/watch?v=${ytShortMatch[1]}`;
  }

  // youtube shorts (e.g. /shorts/VIDEOID)
  const ytShortsMatch = s.match(/(?:https?:\/\/)?(?:www\.)?youtube\.com\/shorts\/([A-Za-z0-9_-]{11})/i);
  if (ytShortsMatch) {
    return `https://www.youtube.com/watch?v=${ytShortsMatch[1]}`;
  }

  // watch?v=VIDEOID
  const vMatch = s.match(/[?&]v=([A-Za-z0-9_-]{11})/i);
  if (vMatch) {
    return `https://www.youtube.com/watch?v=${vMatch[1]}`;
  }

  // sometimes LLMs produce URLs like "youtube.com/watch?v=ID" without scheme
  const youtubeNoScheme = s.match(/^(www\.youtube\.com\/.+|youtube\.com\/.+)/i);
  if (youtubeNoScheme) {
    s = `https://${s}`;
  }

  // require http(s)
  if (!/^https?:\/\//i.test(s)) {
    return null;
  }

  // try to normalize encoding without double-encoding
  try {
    s = encodeURI(decodeURI(s));
  } catch {
    try {
      s = s.replace(/\s/g, "%20");
    } catch {
      // last resort: leave as-is
    }
  }

  // Basic safety: only return http(s) URLs
  return s;
}

// build YouTube search URL safely as fallback
function buildYouTubeSearchUrl(title = "", artist = "") {
  let q = `${title || ""} ${artist || ""}`.trim();
  q = q.replace(/[\n\r]+/g, " ");
  q = q.replace(/["'`‘’“”]/g, "");
    q = q.replace(new RegExp('\\\\/|\\\\|', 'g'), " ");
  q = q.replace(/\s+/g, " ").trim();
  if (!q) q = "music";
  return `https://www.youtube.com/results?search_query=${encodeURIComponent(q)}`;
}

// verify via YouTube oEmbed (returns true if video exists/accessible)
async function isYouTubeAvailable(watchUrl) {
  try {
    if (!watchUrl || !watchUrl.includes("youtube.com/watch")) return false;
    const oembed = `https://www.youtube.com/oembed?url=${encodeURIComponent(watchUrl)}&format=json`;
    const resp = await axios.get(oembed, { timeout: 5000, validateStatus: () => true });
    // oEmbed returns 200 for existing public videos; 404 for removed/private
    return resp.status === 200;
  } catch {
    // network error or blocked -> treat as unavailable
    return false;
  }
}

/* ---------- Route: POST /api/songs ---------- */
router.post("/", async (req, res) => {
  try {
    const { text } = req.body;
    if (!text || !text.trim()) return res.status(400).json({ error: "text required" });

    if (USE_FAKE) {
      const fake = [
        { title: "Peaceful Moments", artist: "Acoustic From The Heart", url: "", reason: "Calm, gentle acoustic fits a reflective day." },
        { title: "Bright Mornings", artist: "Sunrise Band", url: "", reason: "Uplifting tempo to boost optimism." },
        { title: "Slow Streets", artist: "Night Walkers", url: "", reason: "Gentle late-night track for introspection." }
      ];

      const fakeProcessed = fake.map((s) => {
        const url = sanitizeUrl(s.url) || buildYouTubeSearchUrl(s.title, s.artist);
        return { ...s, url };
      });

      console.log("SONGS (FAKE) ->", fakeProcessed);
      return res.json({ songs: fakeProcessed });
    }

    if (!genAI) {
      return res.status(500).json({ error: "AI client not initialized. Set GEMINI_API_KEY." });
    }

    const systemPrompt = `You are a friendly music recommender. Based on the user's short journal text, suggest up to 5 songs that match the mood, situation, or vibe described. Output must be valid JSON: an array of objects. Each object must have these keys: "title" (string), "artist" (string or empty), "url" (string or empty), "reason" (short explanation string). If you can, provide a YouTube video or short URL (https://www.youtube.com/watch?v/...) for each suggestion. Do not output additional prose outside the JSON.`;

    const userPrompt = `Journal text:\n"""${text}"""\n\nReturn up to 5 suggestions as JSON. Example:\n[{"title":"Song Name","artist":"Artist Name","url":"https://www.youtube.com/watch?v/...","reason":"Short reason"}]`;

    const combined = `${systemPrompt}\n\n${userPrompt}`;

    const model = genAI.getGenerativeModel({ model: GEMINI_MODEL });
    const result = await model.generateContent(combined);
    const response = await result.response;
    const raw = response.text();

    // log raw LLM output for debugging
    console.log("SONGS RAW OUTPUT FROM MODEL:\n", raw);

    // try parsing JSON output
    let parsed = safeParseJson(raw);
    let suggestions = [];

    if (parsed && Array.isArray(parsed)) {
      suggestions = parsed.slice(0, 5).map((it) => {
        const title = String(it.title || "").trim();
        const artist = String(it.artist || "").trim();
        const providedUrl = sanitizeUrl(it.url);
        const url = providedUrl || buildYouTubeSearchUrl(title, artist);
        const reason = String(it.reason || "").trim();
        return { title, artist, url, reason };
      });
    } else {
      // fallback line-parsing "1. Title - Artist" or "Title - Artist"
      const lines = raw.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
      for (const line of lines) {
        const m = line.match(/^\d+\.\s*(.+?)\s*-\s*(.+)$/);
        if (m) {
          const title = m[1].trim();
          const artist = m[2].trim();
          suggestions.push({ title, artist, url: buildYouTubeSearchUrl(title, artist), reason: "" });
        } else if (suggestions.length < 5) {
          const parts = line.split(/\s*[-—]\s*/);
          if (parts.length >= 2) {
            suggestions.push({ title: parts[0].trim(), artist: parts[1].trim(), url: buildYouTubeSearchUrl(parts[0].trim(), parts[1].trim()), reason: "" });
          }
        }
        if (suggestions.length >= 5) break;
      }
    }

    if (suggestions.length === 0) {
      console.log("SONGS PARSE FAILED, RAW:\n", raw);
      return res.status(500).json({ error: "Could not parse model output", raw });
    }

    // final ensure all suggestions have a safe URL and verify YouTube availability if applicable
    const final = [];
    for (const s of suggestions.slice(0, 5)) {
      // start with normalized / provided url or fallback search
      let url = sanitizeUrl(s.url) || buildYouTubeSearchUrl(s.title, s.artist);

      // if it looks like a youtube watch URL, verify it exists via oEmbed
      if (url && url.includes("youtube.com/watch")) {
        try {
          const ok = await isYouTubeAvailable(url);
          if (!ok) {
            console.log("YouTube video unavailable, falling back to search:", url);
            url = buildYouTubeSearchUrl(s.title, s.artist);
          }
        } catch (_e) {
          console.log("Error verifying YouTube availability for", url, _e?.message || _e);
          // on error, fall back to search to avoid broken links
          url = buildYouTubeSearchUrl(s.title, s.artist);
        }
      }

      final.push({
        title: s.title,
        artist: s.artist,
        url,
        reason: s.reason || ""
      });
    }

    // Log final suggestions so you can copy/paste problematic URLs
    console.log("FINAL SONGS ->", JSON.stringify(final, null, 2));

    return res.json({ songs: final });
  } catch (err) {
    console.error("Error in /api/songs:", err);
    return res.status(500).json({ error: "Server error", details: err.message || String(err) });
  }
});

module.exports = router;
