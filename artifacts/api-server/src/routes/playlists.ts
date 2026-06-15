import { Router } from "express";
import { db } from "@workspace/db";
import { playlistsTable, playlistTracksTable } from "@workspace/db";
import { eq, sql } from "drizzle-orm";
import {
  CreatePlaylistBody,
  UpdatePlaylistBody,
  AddTrackToPlaylistBody,
} from "@workspace/api-zod";

const router = Router();

function formatPlaylist(p: { id: number; name: string; description: string | null; createdAt: Date }, trackCount = 0, coverArt: string | null = null) {
  return {
    id: p.id,
    name: p.name,
    description: p.description,
    trackCount,
    coverArt,
    createdAt: p.createdAt.toISOString(),
  };
}

// GET /api/playlists
router.get("/playlists", async (req, res) => {
  try {
    const playlists = await db.select().from(playlistsTable).orderBy(playlistsTable.createdAt);

    const result = await Promise.all(
      playlists.map(async (pl) => {
        const countResult = await db
          .select({ count: sql<number>`count(*)` })
          .from(playlistTracksTable)
          .where(eq(playlistTracksTable.playlistId, pl.id));
        const count = Number(countResult[0]?.count || 0);

        const firstTrack = await db
          .select({ artworkUrl: playlistTracksTable.artworkUrl })
          .from(playlistTracksTable)
          .where(eq(playlistTracksTable.playlistId, pl.id))
          .limit(1);
        const coverArt = firstTrack[0]?.artworkUrl || null;

        return formatPlaylist(pl, count, coverArt);
      })
    );

    return res.json(result);
  } catch (err) {
    req.log.error({ err }, "Get playlists failed");
    return res.status(500).json({ error: "Failed to get playlists" });
  }
});

// POST /api/playlists
router.post("/playlists", async (req, res) => {
  const parsed = CreatePlaylistBody.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid request body" });
  }

  try {
    const [playlist] = await db
      .insert(playlistsTable)
      .values({ name: parsed.data.name, description: parsed.data.description })
      .returning();
    return res.status(201).json(formatPlaylist(playlist, 0, null));
  } catch (err) {
    req.log.error({ err }, "Create playlist failed");
    return res.status(500).json({ error: "Failed to create playlist" });
  }
});

// GET /api/playlists/:playlistId
router.get("/playlists/:playlistId", async (req, res) => {
  const playlistId = Number(req.params.playlistId);
  if (isNaN(playlistId)) {
    return res.status(400).json({ error: "Invalid playlist ID" });
  }

  try {
    const [playlist] = await db.select().from(playlistsTable).where(eq(playlistsTable.id, playlistId));
    if (!playlist) {
      return res.status(404).json({ error: "Playlist not found" });
    }

    const tracks = await db
      .select()
      .from(playlistTracksTable)
      .where(eq(playlistTracksTable.playlistId, playlistId))
      .orderBy(playlistTracksTable.addedAt);

    const coverArt = tracks[0]?.artworkUrl || null;

    return res.json({
      ...formatPlaylist(playlist, tracks.length, coverArt),
      tracks: tracks.map((t) => ({
        id: t.trackId,
        title: t.title,
        artist: t.artist,
        album: t.album,
        duration: t.duration,
        previewUrl: t.previewUrl,
        artworkUrl: t.artworkUrl,
        genre: t.genre,
        releaseYear: t.releaseYear,
      })),
    });
  } catch (err) {
    req.log.error({ err }, "Get playlist failed");
    return res.status(500).json({ error: "Failed to get playlist" });
  }
});

// PATCH /api/playlists/:playlistId
router.patch("/playlists/:playlistId", async (req, res) => {
  const playlistId = Number(req.params.playlistId);
  if (isNaN(playlistId)) {
    return res.status(400).json({ error: "Invalid playlist ID" });
  }

  const parsed = UpdatePlaylistBody.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid request body" });
  }

  try {
    const updates: Record<string, unknown> = {};
    if (parsed.data.name !== undefined) updates.name = parsed.data.name;
    if (parsed.data.description !== undefined) updates.description = parsed.data.description;

    const [updated] = await db
      .update(playlistsTable)
      .set(updates)
      .where(eq(playlistsTable.id, playlistId))
      .returning();

    if (!updated) {
      return res.status(404).json({ error: "Playlist not found" });
    }

    const countResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(playlistTracksTable)
      .where(eq(playlistTracksTable.playlistId, playlistId));
    const count = Number(countResult[0]?.count || 0);

    const firstTrack = await db
      .select({ artworkUrl: playlistTracksTable.artworkUrl })
      .from(playlistTracksTable)
      .where(eq(playlistTracksTable.playlistId, playlistId))
      .limit(1);
    const coverArt = firstTrack[0]?.artworkUrl || null;

    return res.json(formatPlaylist(updated, count, coverArt));
  } catch (err) {
    req.log.error({ err }, "Update playlist failed");
    return res.status(500).json({ error: "Failed to update playlist" });
  }
});

// DELETE /api/playlists/:playlistId
router.delete("/playlists/:playlistId", async (req, res) => {
  const playlistId = Number(req.params.playlistId);
  if (isNaN(playlistId)) {
    return res.status(400).json({ error: "Invalid playlist ID" });
  }

  try {
    await db.delete(playlistsTable).where(eq(playlistsTable.id, playlistId));
    return res.status(204).send();
  } catch (err) {
    req.log.error({ err }, "Delete playlist failed");
    return res.status(500).json({ error: "Failed to delete playlist" });
  }
});

// POST /api/playlists/:playlistId/tracks
router.post("/playlists/:playlistId/tracks", async (req, res) => {
  const playlistId = Number(req.params.playlistId);
  if (isNaN(playlistId)) {
    return res.status(400).json({ error: "Invalid playlist ID" });
  }

  const parsed = AddTrackToPlaylistBody.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid request body" });
  }

  try {
    const [playlist] = await db.select().from(playlistsTable).where(eq(playlistsTable.id, playlistId));
    if (!playlist) {
      return res.status(404).json({ error: "Playlist not found" });
    }

    // Check if track already in playlist
    const existing = await db
      .select()
      .from(playlistTracksTable)
      .where(eq(playlistTracksTable.playlistId, playlistId))
      .then((rows) => rows.find((r) => r.trackId === parsed.data.trackId));

    if (!existing) {
      await db.insert(playlistTracksTable).values({
        playlistId,
        trackId: parsed.data.trackId,
        title: parsed.data.title,
        artist: parsed.data.artist,
        album: parsed.data.album,
        duration: parsed.data.duration,
        previewUrl: parsed.data.previewUrl ?? null,
        artworkUrl: parsed.data.artworkUrl,
        genre: parsed.data.genre ?? null,
        releaseYear: parsed.data.releaseYear ?? null,
      });
    }

    const tracks = await db
      .select()
      .from(playlistTracksTable)
      .where(eq(playlistTracksTable.playlistId, playlistId))
      .orderBy(playlistTracksTable.addedAt);

    const coverArt = tracks[0]?.artworkUrl || null;

    return res.status(201).json({
      ...formatPlaylist(playlist, tracks.length, coverArt),
      tracks: tracks.map((t) => ({
        id: t.trackId,
        title: t.title,
        artist: t.artist,
        album: t.album,
        duration: t.duration,
        previewUrl: t.previewUrl,
        artworkUrl: t.artworkUrl,
        genre: t.genre,
        releaseYear: t.releaseYear,
      })),
    });
  } catch (err) {
    req.log.error({ err }, "Add track to playlist failed");
    return res.status(500).json({ error: "Failed to add track to playlist" });
  }
});

// DELETE /api/playlists/:playlistId/tracks/:trackId
router.delete("/playlists/:playlistId/tracks/:trackId", async (req, res) => {
  const playlistId = Number(req.params.playlistId);
  const trackId = req.params.trackId;
  if (isNaN(playlistId)) {
    return res.status(400).json({ error: "Invalid playlist ID" });
  }

  try {
    const [playlist] = await db.select().from(playlistsTable).where(eq(playlistsTable.id, playlistId));
    if (!playlist) {
      return res.status(404).json({ error: "Playlist not found" });
    }

    await db
      .delete(playlistTracksTable)
      .where(
        sql`${playlistTracksTable.playlistId} = ${playlistId} AND ${playlistTracksTable.trackId} = ${trackId}`
      );

    const tracks = await db
      .select()
      .from(playlistTracksTable)
      .where(eq(playlistTracksTable.playlistId, playlistId))
      .orderBy(playlistTracksTable.addedAt);

    const coverArt = tracks[0]?.artworkUrl || null;

    return res.json({
      ...formatPlaylist(playlist, tracks.length, coverArt),
      tracks: tracks.map((t) => ({
        id: t.trackId,
        title: t.title,
        artist: t.artist,
        album: t.album,
        duration: t.duration,
        previewUrl: t.previewUrl,
        artworkUrl: t.artworkUrl,
        genre: t.genre,
        releaseYear: t.releaseYear,
      })),
    });
  } catch (err) {
    req.log.error({ err }, "Remove track from playlist failed");
    return res.status(500).json({ error: "Failed to remove track from playlist" });
  }
});

export default router;
