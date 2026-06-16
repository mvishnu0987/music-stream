import { Router } from "express";
import https from "https";
import http from "http";

const router = Router();

const CCMIXTER_BASE = "https://ccmixter.org/api/query";

const INSECURE_AGENT = new https.Agent({ rejectUnauthorized: false });

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
          "User-Agent": "MelodifyApp/1.0",
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

interface CcmixterFile {
  download_url: string;
  file_format_info?: { default_ext?: string };
}

interface CcmixterTrack {
  upload_id: number;
  upload_name: string;
  user_name: string;
  user_real_name?: string;
  upload_tags?: string;
  upload_date_format?: string;
  files?: CcmixterFile[];
  file_page_url?: string;
}

function getMp3Url(track: CcmixterTrack): string | null {
  if (!track.files || track.files.length === 0) return null;
  const mp3 = track.files.find(
    (f) => f.download_url && (f.download_url.endsWith(".mp3") || f.file_format_info?.default_ext === "mp3")
  );
  if (mp3?.download_url) return mp3.download_url;
  const first = track.files.find((f) => f.download_url);
  return first?.download_url || null;
}

function getGenreFromTags(tags: string): string | null {
  const t = tags.toLowerCase();
  const genres = ["jazz", "rock", "pop", "electronic", "classical", "hip-hop", "hiphop", "blues", "country", "soul", "ambient", "folk", "indie", "reggae", "metal"];
  for (const g of genres) {
    if (t.includes(g)) return g.charAt(0).toUpperCase() + g.slice(1);
  }
  return null;
}

export function toProxyUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  if (url.startsWith("/api/music/proxy")) return url;
  if (/ccmixter\.org/i.test(url)) {
    return `/api/music/proxy?url=${encodeURIComponent(url)}`;
  }
  return url;
}

function mapCcmixterTrack(t: CcmixterTrack) {
  const audioUrl = getMp3Url(t);
  const artist = t.user_real_name || t.user_name || "Unknown Artist";
  const genre = t.upload_tags ? getGenreFromTags(t.upload_tags) : null;
  const releaseYear = t.upload_date_format ? parseInt(t.upload_date_format.slice(0, 4)) : null;
  const artworkUrl = `https://picsum.photos/seed/${t.upload_id}/300/300`;

  return {
    id: String(t.upload_id),
    title: t.upload_name || "Unknown Track",
    artist,
    album: "ccMixter",
    duration: 180000,
    previewUrl: toProxyUrl(audioUrl),
    artworkUrl,
    genre,
    releaseYear: isNaN(releaseYear ?? NaN) ? null : releaseYear,
  };
}

interface CacheEntry { data: ReturnType<typeof mapCcmixterTrack>[]; expiresAt: number }
const cache = new Map<string, CacheEntry>();
const CACHE_TTL = 30 * 60 * 1000;

function getCached(key: string) {
  const e = cache.get(key);
  return e && Date.now() < e.expiresAt ? e.data : null;
}
function setCache(key: string, data: ReturnType<typeof mapCcmixterTrack>[]) {
  cache.set(key, { data, expiresAt: Date.now() + CACHE_TTL });
}

async function fetchCcmixter(params: Record<string, string>): Promise<CcmixterTrack[]> {
  const url = new URL(CCMIXTER_BASE);
  url.searchParams.set("f", "json");
  url.searchParams.set("lic", "by");
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  const body = await fetchUrl(url.toString());
  const data = JSON.parse(body) as CcmixterTrack[];
  return (data || []).filter((t) => t.upload_id && getMp3Url(t));
}

// GET /api/music/proxy?url=... — streams audio from ccMixter through our server
router.get("/music/proxy", (req, res): void => {
  const rawUrl = req.query.url as string;
  if (!rawUrl) { res.status(400).end(); return; }

  let targetUrl: string;
  try {
    targetUrl = decodeURIComponent(rawUrl);
    if (!/ccmixter\.org/i.test(targetUrl)) {
      res.status(403).end(); return;
    }
  } catch {
    res.status(400).end(); return;
  }

  const doRequest = (urlStr: string, redirectCount = 0): void => {
    if (redirectCount > 5) {
      if (!res.headersSent) res.status(502).end();
      return;
    }

    const parsed = new URL(urlStr);
    const isHttps = parsed.protocol === "https:";
    const transport = isHttps ? https : http;

    const headers: Record<string, string> = {
      "User-Agent": "Mozilla/5.0 (compatible; MelodifyApp/1.0)",
      "Referer": "https://ccmixter.org/",
      "Accept": "audio/*,*/*",
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
          "Cache-Control": "public, max-age=3600",
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
  const limit = Math.min(Number(req.query.limit) || 50, 100);
  const offset = Math.max(0, Number(req.query.offset) || 0);

  if (!q || q.trim().length === 0) {
    return res.status(400).json({ error: "Query parameter q is required" });
  }

  const cacheKey = `search:${q.toLowerCase()}:${limit}:${offset}`;
  const cached = getCached(cacheKey);
  if (cached) return res.json(cached);

  try {
    const raw = await fetchCcmixter({ q, limit: String(limit), skip: String(offset) });
    const tracks = raw.map(mapCcmixterTrack);
    setCache(cacheKey, tracks);
    return res.json(tracks);
  } catch (err) {
    req.log.error({ err }, "Music search failed");
    return res.status(500).json({ error: "Failed to search music" });
  }
});

// GET /api/music/top?genre=...&offset=...&limit=...
router.get("/music/top", async (req, res) => {
  const genre = req.query.genre as string | undefined;
  const offset = Math.max(0, Number(req.query.offset) || 0);
  const limit = Math.min(Number(req.query.limit) || 50, 100);

  const genreTagMap: Record<string, string> = {
    Pop: "pop",
    Rock: "rock",
    "Hip-Hop": "hiphop",
    Electronic: "electronic",
    Jazz: "jazz",
    Classical: "classical",
    "R&B": "soul",
    Country: "country",
    Indie: "indie",
  };

  const cacheKey = `top:${genre || "all"}:${offset}:${limit}`;
  const cached = getCached(cacheKey);
  if (cached) return res.json(cached);

  try {
    const params: Record<string, string> = { limit: String(limit), sort: "num_scores", offset: String(offset) };
    if (genre && genreTagMap[genre]) {
      params.tags = genreTagMap[genre];
    }
    const raw = await fetchCcmixter(params);
    const tracks = raw.map(mapCcmixterTrack);
    setCache(cacheKey, tracks);
    return res.json(tracks);
  } catch (err) {
    req.log.error({ err }, "Get top tracks failed");
    return res.status(500).json({ error: "Failed to get top tracks" });
  }
});

// GET /api/music/track/:trackId
router.get("/music/track/:trackId", async (req, res) => {
  const { trackId } = req.params;

  try {
    const raw = await fetchCcmixter({ ids: trackId, limit: "1" });
    if (raw.length === 0) {
      return res.status(404).json({ error: "Track not found" });
    }
    return res.json(mapCcmixterTrack(raw[0]));
  } catch (err) {
    req.log.error({ err }, "Get track failed");
    return res.status(500).json({ error: "Failed to get track" });
  }
});

export default router;
