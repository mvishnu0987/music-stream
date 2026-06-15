import { Router } from "express";

const router = Router();

interface ItunesTrack {
  trackId: number;
  trackName: string;
  artistName: string;
  collectionName: string;
  trackTimeMillis: number;
  previewUrl?: string;
  artworkUrl100: string;
  primaryGenreName?: string;
  releaseDate?: string;
  kind?: string;
}

function mapTrack(t: ItunesTrack) {
  const releaseYear = t.releaseDate ? new Date(t.releaseDate).getFullYear() : null;
  return {
    id: String(t.trackId),
    title: t.trackName,
    artist: t.artistName,
    album: t.collectionName || "",
    duration: t.trackTimeMillis || 30000,
    previewUrl: t.previewUrl || null,
    artworkUrl: (t.artworkUrl100 || "").replace("100x100", "300x300"),
    genre: t.primaryGenreName || null,
    releaseYear: releaseYear,
  };
}

// GET /api/music/search?q=...&limit=...
router.get("/music/search", async (req, res) => {
  const q = req.query.q as string;
  const limit = Math.min(Number(req.query.limit) || 25, 50);

  if (!q || q.trim().length === 0) {
    return res.status(400).json({ error: "Query parameter q is required" });
  }

  try {
    const url = `https://itunes.apple.com/search?term=${encodeURIComponent(q)}&media=music&entity=song&limit=${limit}`;
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`iTunes API error: ${response.status}`);
    }
    const data = (await response.json()) as { results: ItunesTrack[] };
    const tracks = (data.results || [])
      .filter((t) => t.kind === "song" && t.trackId)
      .map(mapTrack);
    return res.json(tracks);
  } catch (err) {
    req.log.error({ err }, "Music search failed");
    return res.status(500).json({ error: "Failed to search music" });
  }
});

// GET /api/music/top?genre=...
router.get("/music/top", async (req, res) => {
  const genre = req.query.genre as string | undefined;

  const genreMap: Record<string, string> = {
    Pop: "pop",
    Rock: "rock",
    "Hip-Hop": "hip-hop",
    Electronic: "electronic",
    Jazz: "jazz",
    Classical: "classical",
    "R&B": "r&b",
    Country: "country",
    Latin: "latin",
    Indie: "indie",
  };

  const term = genre && genreMap[genre] ? genreMap[genre] : "top hits 2024";

  try {
    const url = `https://itunes.apple.com/search?term=${encodeURIComponent(term)}&media=music&entity=song&limit=30`;
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`iTunes API error: ${response.status}`);
    }
    const data = (await response.json()) as { results: ItunesTrack[] };
    const tracks = (data.results || [])
      .filter((t) => t.kind === "song" && t.trackId)
      .map(mapTrack);
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
    const url = `https://itunes.apple.com/lookup?id=${encodeURIComponent(trackId)}&entity=song`;
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`iTunes API error: ${response.status}`);
    }
    const data = (await response.json()) as { results: ItunesTrack[] };
    const tracks = (data.results || []).filter((t) => t.kind === "song");
    if (tracks.length === 0) {
      return res.status(404).json({ error: "Track not found" });
    }
    return res.json(mapTrack(tracks[0]));
  } catch (err) {
    req.log.error({ err }, "Get track failed");
    return res.status(500).json({ error: "Failed to get track" });
  }
});

export default router;
