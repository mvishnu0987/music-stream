import { Router } from "express";
import https from "https";
import http from "http";
import CryptoJS from "crypto-js";

const router = Router();

const JIOSAAVN_BASE = "https://www.jiosaavn.com/api.php";
const INSECURE_AGENT = new https.Agent({ rejectUnauthorized: false });

// Cache TTL: 30 minutes
interface CacheEntry {
  data: any;
  expiresAt: number;
}
const cache = new Map<string, CacheEntry>();
const CACHE_TTL = 30 * 60 * 1000;

function getCached(key: string) {
  const e = cache.get(key);
  return e && Date.now() < e.expiresAt ? e.data : null;
}

function setCache(key: string, data: any) {
  cache.set(key, { data, expiresAt: Date.now() + CACHE_TTL });
}

// Helper: HTTP/HTTPS fetch
function fetchUrl(urlStr: string, redirectCount = 0): Promise<string> {
  if (redirectCount > 5) return Promise.reject(new Error("Too many redirects"));
  const parsed = new URL(urlStr);
  const isHttps = parsed.protocol === "https:";
  const transport = isHttps ? https : http;
  return new Promise((resolve, reject) => {
    const req = transport.request(
      {
        hostname: parsed.hostname,
        path: parsed.pathname + parsed.search,
        method: "GET",
        ...(isHttps ? { agent: INSECURE_AGENT } : {}),
        headers: {
          "Accept": "application/json, */*",
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
          "Referer": "https://www.jiosaavn.com/",
          "X-Forwarded-For": "115.112.148.1",
          "X-Real-IP": "115.112.148.1",
          "Cookie": "L=english;",
        },
      },
      (res) => {
        if (
          res.statusCode &&
          res.statusCode >= 300 &&
          res.statusCode < 400 &&
          res.headers.location
        ) {
          res.resume();
          resolve(fetchUrl(res.headers.location, redirectCount + 1));
          return;
        }
        let data = "";
        res.setEncoding("utf8");
        res.on("data", (chunk: string) => { data += chunk; });
        res.on("end", () => resolve(data));
        res.on("error", reject);
      }
    );
    req.on("error", reject);
    req.setTimeout(15000, () => req.destroy(new Error("Request timeout")));
    req.end();
  });
}

// Helper: Decrypt JioSaavn media URL
function decryptMediaUrl(encryptedUrl: string): string {
  const key = CryptoJS.enc.Utf8.parse("38346591");
  const decrypted = CryptoJS.DES.decrypt(
    encryptedUrl,
    key,
    {
      mode: CryptoJS.mode.ECB,
      padding: CryptoJS.pad.Pkcs7,
    }
  );
  return decrypted.toString(CryptoJS.enc.Utf8);
}

// Helper: Map low-res cover arts to high-res
function getHighQualityArtwork(url: string | null | undefined): string {
  if (!url) return "https://picsum.photos/seed/music/500/500";
  // Convert 50x50 and 150x150 to 500x500
  return url.replace("150x150", "500x500").replace("50x50", "500x500");
}

export function toProxyUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  if (url.startsWith("/api/music/proxy")) return url;
  return `/api/music/proxy?url=${encodeURIComponent(url)}`;
}

// Map JioSaavn song object to standard Track model
function mapJioSaavnTrack(t: any) {
  let audioUrl = "";
  if (t.encrypted_media_url) {
    try {
      const decrypted = decryptMediaUrl(t.encrypted_media_url);
      // Upgrade stream to 320kbps for premium audio quality
      audioUrl = decrypted.replace("_96.mp4", "_320.mp4");
    } catch {
      audioUrl = t.media_preview_url || "";
    }
  } else {
    audioUrl = t.media_preview_url || "";
  }

  const artist = t.primary_artists || t.singers || t.music || "Unknown Artist";
  const durationSec = Number(t.duration) || 180;
  const durationMs = durationSec * 1000;

  return {
    id: String(t.id),
    title: t.song || t.title || "Unknown Track",
    artist,
    album: t.album || "Single",
    duration: durationMs,
    previewUrl: toProxyUrl(audioUrl),
    artworkUrl: getHighQualityArtwork(t.image),
    genre: t.language ? t.language.charAt(0).toUpperCase() + t.language.slice(1) : null,
    releaseYear: t.year ? Number(t.year) : null,
  };
}

// Curated Language Playlists Map
const LANGUAGE_PLAYLISTS: Record<string, string> = {
  Hindi: "1134543272",      // Hindi India Superhits Top 50
  English: "1134595537",    // International India Superhits Top 50
  Punjabi: "1134543511",    // Punjabi India Superhits Top 50
  Tamil: "1134651042",      // Tamil India Superhits Top 50
  Telugu: "1134643225",     // Telugu India Superhits Top 50
  Spanish: "935926082",     // Latin Hits
  Korean: "410785269",      // Best of K-Pop
  Japanese: "814586224",     // Japanese Hits
};

// GET /api/music/proxy — streams audio through server (helps bypass CORS and mixed-content restrictions)
router.get("/music/proxy", (req, res): void => {
  req.socket.setTimeout(0);
  res.setTimeout(0);

  const rawUrl = req.query.url as string;
  if (!rawUrl) { res.status(400).end(); return; }

  let targetUrl: string;
  try {
    targetUrl = decodeURIComponent(rawUrl);
    // Allow proxying only for trusted audio providers
    if (!/saavncdn\.com/i.test(targetUrl) && !/ccmixter\.org/i.test(targetUrl)) {
      res.status(403).end(); return;
    }
  } catch {
    res.status(400).end(); return;
  }

  let activeProxyReq: any = null;
  req.on("close", () => {
    if (activeProxyReq) {
      activeProxyReq.destroy();
    }
  });

  const doRequest = (urlStr: string, redirectCount = 0): void => {
    if (redirectCount > 5) {
      if (!res.headersSent) res.status(502).end();
      return;
    }

    const parsed = new URL(urlStr);
    const isHttps = parsed.protocol === "https:";
    const transport = isHttps ? https : http;

    const headers: Record<string, string> = {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
      "Referer": "https://www.jiosaavn.com/",
      "Accept": "audio/*,*/*",
      "X-Forwarded-For": "115.112.148.1",
      "X-Real-IP": "115.112.148.1",
      "Cookie": "L=english;",
    };
    if (req.headers.range) headers["Range"] = req.headers.range;

    const proxyReq = transport.request(
      {
        hostname: parsed.hostname,
        path: parsed.pathname + parsed.search,
        method: "GET",
        ...(isHttps ? { agent: INSECURE_AGENT } : {}),
        headers,
      },
      (proxyRes) => {
        (proxyRes as any).req.setTimeout(0);
        if (
          proxyRes.statusCode &&
          proxyRes.statusCode >= 300 &&
          proxyRes.statusCode < 400 &&
          proxyRes.headers.location
        ) {
          proxyRes.resume();
          doRequest(proxyRes.headers.location, redirectCount + 1);
          return;
        }

        const resHeaders: Record<string, string> = {
          "Content-Type": (proxyRes.headers["content-type"] as string) || "audio/mpeg",
          "Accept-Ranges": "bytes",
          "Cache-Control": "public, max-age=86400",
        };
        if (proxyRes.headers["content-length"]) {
          resHeaders["Content-Length"] = proxyRes.headers["content-length"] as string;
        }
        if (proxyRes.headers["content-range"]) {
          resHeaders["Content-Range"] = proxyRes.headers["content-range"] as string;
        }

        res.writeHead(proxyRes.statusCode || 200, resHeaders);
        proxyRes.pipe(res);
      }
    );

    activeProxyReq = proxyReq;

    proxyReq.on("error", (err) => {
      req.log.error({ err }, "Audio proxy error");
      if (!res.headersSent) res.status(502).end();
    });

    proxyReq.setTimeout(30000, () => {
      proxyReq.destroy();
      if (!res.headersSent) res.status(504).end();
    });

    proxyReq.end();
  };

  doRequest(targetUrl);
});

// GET /api/music/search?q=...&limit=...&offset=...
router.get("/music/search", async (req, res) => {
  const q = req.query.q as string;
  const limit = Math.min(Number(req.query.limit) || 20, 50);
  const offset = Math.max(0, Number(req.query.offset) || 0);
  const page = Math.floor(offset / limit) + 1;

  if (!q || q.trim().length === 0) {
    return res.status(400).json({ error: "Query parameter q is required" });
  }

  const cacheKey = `search:${q.toLowerCase()}:${limit}:${offset}`;
  const cached = getCached(cacheKey);
  if (cached) return res.json(cached);

  try {
    const url = `${JIOSAAVN_BASE}?__call=search.getResults&_format=json&_marker=0&cc=in&includeMetaTags=1&q=${encodeURIComponent(q)}&n=${limit}&p=${page}`;
    const body = await fetchUrl(url);
    const data = JSON.parse(body);
    const results = data.results || [];
    const tracks = results.map(mapJioSaavnTrack);

    // Deduplicate search results by title and artist case-insensitively to clean up results
    const seen = new Set<string>();
    const uniqueTracks = tracks.filter((t: any) => {
      const key = `${t.title.toLowerCase().trim()}-${t.artist.toLowerCase().trim()}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    setCache(cacheKey, uniqueTracks);
    return res.json(uniqueTracks);
  } catch (err) {
    req.log.error({ err }, "JioSaavn search failed");
    return res.status(500).json({ error: "Failed to search music" });
  }
});

async function paginateTracks(
  tracks: any[],
  offset: number,
  limit: number,
  language: string | undefined,
  genre: string | undefined,
  hasGenre: boolean
): Promise<any[]> {
  const paginated = tracks.slice(offset, offset + limit);
  if (paginated.length < limit) {
    const q = language && hasGenre
      ? `${language} ${genre} hits`
      : language
      ? `${language} hits`
      : hasGenre
      ? `${genre} hits`
      : "Hindi hits";

    const searchPage = Math.floor(offset / limit) + 1;
    try {
      const searchUrl = `${JIOSAAVN_BASE}?__call=search.getResults&_format=json&_marker=0&cc=in&q=${encodeURIComponent(q)}&n=${limit}&p=${searchPage}`;
      const searchBody = await fetchUrl(searchUrl);
      const searchData = JSON.parse(searchBody);
      const searchSongs = (searchData.results || []).map(mapJioSaavnTrack);

      const seen = new Set(paginated.map(t => t.id));
      for (const s of searchSongs) {
        if (!seen.has(s.id) && !tracks.some(t => t.id === s.id)) {
          paginated.push(s);
          if (paginated.length >= limit) break;
        }
      }
    } catch {
      // ignore search failures during pagination
    }
  }
  return paginated;
}

// GET /api/music/top?language=...&genre=...&offset=...&limit=...
router.get("/music/top", async (req, res) => {
  const language = req.query.language as string | undefined;
  const genre = req.query.genre as string | undefined;
  const limit = Math.min(Number(req.query.limit) || 50, 100);
  const offset = Math.max(0, Number(req.query.offset) || 0);

  const hasGenre = !!(genre && genre !== "All");
  const cacheKey = `top:${language || "all"}:${genre || "all"}`;
  const cached = getCached(cacheKey);
  if (cached) {
    const paginated = await paginateTracks(cached, offset, limit, language, genre, hasGenre);
    return res.json(paginated);
  }

  try {
    let tracks: any[] = [];

    if (hasGenre) {
      // Search for playlists with this language + genre combination or just genre
      const query = language ? `${language} ${genre} hits` : `${genre} hits`;
      const playlistSearchUrl = `${JIOSAAVN_BASE}?__call=search.getPlaylistResults&_format=json&_marker=0&cc=in&q=${encodeURIComponent(query)}&n=1`;
      const searchBody = await fetchUrl(playlistSearchUrl);
      const searchData = JSON.parse(searchBody);
      const listid = searchData.results?.[0]?.listid;

      if (listid) {
        const url = `${JIOSAAVN_BASE}?__call=playlist.getDetails&_format=json&_marker=0&cc=in&listid=${listid}`;
        const body = await fetchUrl(url);
        const data = JSON.parse(body);
        const rawSongs = data.songs || [];
        tracks = rawSongs.map(mapJioSaavnTrack);
      }
    } else if (language) {
      const playlistId = LANGUAGE_PLAYLISTS[language];
      if (playlistId) {
        const url = `${JIOSAAVN_BASE}?__call=playlist.getDetails&_format=json&_marker=0&cc=in&listid=${playlistId}`;
        const body = await fetchUrl(url);
        const data = JSON.parse(body);
        const rawSongs = data.songs || [];
        tracks = rawSongs.map(mapJioSaavnTrack);
      }
    }

    // Fallback: If no tracks fetched, try global search for generic hits
    if (tracks.length === 0) {
      const q = language && hasGenre
        ? `${language} ${genre} hits`
        : language
        ? `${language} hits`
        : hasGenre
        ? `${genre} hits`
        : "Hindi hits";
      const fallbackUrl = `${JIOSAAVN_BASE}?__call=search.getResults&_format=json&_marker=0&cc=in&q=${encodeURIComponent(q)}&n=${limit}`;
      const body = await fetchUrl(fallbackUrl);
      const data = JSON.parse(body);
      const rawSongs = data.results || [];
      tracks = rawSongs.map(mapJioSaavnTrack);
    }

    setCache(cacheKey, tracks);
    const paginated = await paginateTracks(tracks, offset, limit, language, genre, hasGenre);
    return res.json(paginated);
  } catch (err) {
    req.log.error({ err }, "Get top tracks failed");
    return res.status(500).json({ error: "Failed to get top tracks" });
  }
});

// GET /api/music/search/artists?q=...
router.get("/music/search/artists", async (req, res) => {
  const q = req.query.q as string;
  if (!q || q.trim().length === 0) {
    return res.status(400).json({ error: "Query is required" });
  }
  try {
    const url = `${JIOSAAVN_BASE}?__call=search.getArtistResults&_format=json&_marker=0&cc=in&q=${encodeURIComponent(q)}&n=20`;
    const body = await fetchUrl(url);
    const data = JSON.parse(body);
    const results = data.results || [];
    return res.json(results.map((a: any) => ({
      id: String(a.id || a.artistId),
      name: a.name || a.title,
      image: getHighQualityArtwork(a.image),
      role: a.role || "Singer",
      isVerified: a.isVerified === true || a.isVerified === "true"
    })));
  } catch (err) {
    return res.status(500).json({ error: "Failed to search artists" });
  }
});

// GET /api/music/search/albums?q=...
router.get("/music/search/albums", async (req, res) => {
  const q = req.query.q as string;
  if (!q || q.trim().length === 0) {
    return res.status(400).json({ error: "Query is required" });
  }
  try {
    const url = `${JIOSAAVN_BASE}?__call=search.getAlbumResults&_format=json&_marker=0&cc=in&q=${encodeURIComponent(q)}&n=20`;
    const body = await fetchUrl(url);
    const data = JSON.parse(body);
    const results = data.results || [];
    return res.json(results.map((a: any) => ({
      id: String(a.id || a.albumid),
      title: a.title || a.name,
      artist: a.music || a.primary_artists || "Various Artists",
      image: getHighQualityArtwork(a.image),
      year: a.year ? Number(a.year) : null
    })));
  } catch (err) {
    return res.status(500).json({ error: "Failed to search albums" });
  }
});

// GET /api/music/artist/:artistId
router.get("/music/artist/:artistId", async (req, res) => {
  const { artistId } = req.params;
  try {
    const url = `${JIOSAAVN_BASE}?__call=artist.getArtistPageDetails&_format=json&_marker=0&cc=in&artistId=${artistId}&n_song=50`;
    const body = await fetchUrl(url);
    const data = JSON.parse(body);
    const rawSongs = data.topSongs?.songs || [];
    const tracks = rawSongs.map(mapJioSaavnTrack);
    return res.json({
      id: String(data.artistId),
      name: data.name,
      image: getHighQualityArtwork(data.image),
      tracks
    });
  } catch (err) {
    return res.status(500).json({ error: "Failed to get artist details" });
  }
});

// GET /api/music/album/:albumId
router.get("/music/album/:albumId", async (req, res) => {
  const { albumId } = req.params;
  try {
    const url = `${JIOSAAVN_BASE}?__call=content.getAlbumDetails&_format=json&_marker=0&cc=in&albumid=${albumId}`;
    const body = await fetchUrl(url);
    const data = JSON.parse(body);
    const rawSongs = data.songs || [];
    const tracks = rawSongs.map(mapJioSaavnTrack);
    return res.json({
      id: String(data.id),
      title: data.title,
      artist: data.primary_artists || "Various Artists",
      image: getHighQualityArtwork(data.image),
      tracks
    });
  } catch (err) {
    return res.status(500).json({ error: "Failed to get album details" });
  }
});

// GET /api/music/track/:trackId
router.get("/music/track/:trackId", async (req, res) => {
  const { trackId } = req.params;

  try {
    const url = `${JIOSAAVN_BASE}?__call=song.getDetails&cc=in&_format=json&pids=${trackId}`;
    const body = await fetchUrl(url);
    const data = JSON.parse(body);
    const songData = data[trackId];

    if (!songData) {
      return res.status(404).json({ error: "Track not found" });
    }

    return res.json(mapJioSaavnTrack(songData));
  } catch (err) {
    req.log.error({ err }, "Get track failed");
    return res.status(500).json({ error: "Failed to get track" });
  }
});

export default router;
