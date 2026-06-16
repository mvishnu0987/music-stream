import { Router } from "express";
import { db } from "@workspace/db";
import { favoritesTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { AddTrackToPlaylistBody } from "@workspace/api-zod";
import { toProxyUrl } from "./music.js";

const router = Router();

function formatFavorite(f: typeof favoritesTable.$inferSelect) {
  return {
    id: f.trackId,
    title: f.title,
    artist: f.artist,
    album: f.album,
    duration: f.duration,
    previewUrl: toProxyUrl(f.previewUrl),
    artworkUrl: f.artworkUrl,
    genre: f.genre,
    releaseYear: f.releaseYear,
  };
}

// GET /api/favorites
router.get("/favorites", async (req, res) => {
  try {
    const favs = await db.select().from(favoritesTable).orderBy(favoritesTable.addedAt);
    return res.json(favs.map(formatFavorite));
  } catch (err) {
    req.log.error({ err }, "Get favorites failed");
    return res.status(500).json({ error: "Failed to get favorites" });
  }
});

// GET /api/favorites/ids
router.get("/favorites/ids", async (req, res) => {
  try {
    const favs = await db.select({ trackId: favoritesTable.trackId }).from(favoritesTable);
    return res.json(favs.map((f) => f.trackId));
  } catch (err) {
    req.log.error({ err }, "Get favorite IDs failed");
    return res.status(500).json({ error: "Failed to get favorite IDs" });
  }
});

// POST /api/favorites
router.post("/favorites", async (req, res) => {
  const parsed = AddTrackToPlaylistBody.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid request body" });
  }

  try {
    await db
      .insert(favoritesTable)
      .values({
        trackId: parsed.data.trackId,
        title: parsed.data.title,
        artist: parsed.data.artist,
        album: parsed.data.album,
        duration: parsed.data.duration,
        previewUrl: parsed.data.previewUrl ?? null,
        artworkUrl: parsed.data.artworkUrl,
        genre: parsed.data.genre ?? null,
        releaseYear: parsed.data.releaseYear ?? null,
      })
      .onConflictDoNothing();

    const [fav] = await db
      .select()
      .from(favoritesTable)
      .where(eq(favoritesTable.trackId, parsed.data.trackId));

    return res.status(201).json(formatFavorite(fav));
  } catch (err) {
    req.log.error({ err }, "Add favorite failed");
    return res.status(500).json({ error: "Failed to add favorite" });
  }
});

// DELETE /api/favorites/:trackId
router.delete("/favorites/:trackId", async (req, res) => {
  const { trackId } = req.params;
  try {
    await db.delete(favoritesTable).where(eq(favoritesTable.trackId, trackId));
    return res.status(204).send();
  } catch (err) {
    req.log.error({ err }, "Remove favorite failed");
    return res.status(500).json({ error: "Failed to remove favorite" });
  }
});

export default router;
