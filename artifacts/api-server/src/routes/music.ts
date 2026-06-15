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
  // Prefer explicit mp3 file
  const mp3 = track.files.find(
    (f) => f.download_url && (f.download_url.endsWith(".mp3") || f.file_format_info?.default_ext === "mp3")
  );
  if (mp3?.download_url) return mp3.download_url;
  // Fallback to first file with a URL
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

function mapCcmixterTrack(t: CcmixterTrack) {
  const audioUrl = getMp3Url(t);
  const artist = t.user_real_name || t.user_name || "Unknown Artist";
  const genre = t.upload_tags ? getGenreFromTags(t.upload_tags) : null;
  const releaseYear = t.upload_date_format ? parseInt(t.upload_date_format.slice(0, 4)) : null;
  // Use a consistent placeholder image based on track ID
  const artworkUrl = `https://picsum.photos/seed/${t.upload_id}/300/300`;

  return {
    id: String(t.upload_id),
    title: t.upload_name || "Unknown Track",
    artist,
    album: "ccMixter",
    duration: 180000, // ccMixter doesn't return duration; estimate 3 min
    previewUrl: audioUrl,
    artworkUrl,
    genre,
    releaseYear: isNaN(releaseYear ?? NaN) ? null : releaseYear,
  };
}

// Simple in-memory cache (30 min TTL)
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

// GET /api/music/search?q=...&limit=...
router.get("/music/search", async (req, res) => {
  const q = req.query.q as string;
  const limit = Math.min(Number(req.query.limit) || 25, 50);

  if (!q || q.trim().length === 0) {
    return res.status(400).json({ error: "Query parameter q is required" });
  }

  const cacheKey = `search:${q.toLowerCase()}:${limit}`;
  const cached = getCached(cacheKey);
  if (cached) return res.json(cached);

  try {
    const raw = await fetchCcmixter({ q, limit: String(limit) });
    const tracks = raw.map(mapCcmixterTrack);
    setCache(cacheKey, tracks);
    return res.json(tracks);
  } catch (err) {
    req.log.error({ err }, "Music search failed");
    return res.status(500).json({ error: "Failed to search music" });
  }
});

// GET /api/music/top?genre=...
router.get("/music/top", async (req, res) => {
  const genre = req.query.genre as string | undefined;

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

  const cacheKey = `top:${genre || "all"}`;
  const cached = getCached(cacheKey);
  if (cached) return res.json(cached);

  try {
    const params: Record<string, string> = { limit: "30", sort: "num_scores" };
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
