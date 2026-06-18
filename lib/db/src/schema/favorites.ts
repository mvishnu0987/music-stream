import { pgTable, text, serial, integer, timestamp } from "drizzle-orm/pg-core";

export const favoritesTable = pgTable("favorites", {
  id: serial("id").primaryKey(),
  trackId: text("track_id").notNull(),
  userId: text("user_id"),
  title: text("title").notNull(),
  artist: text("artist").notNull(),
  album: text("album").notNull(),
  duration: integer("duration").notNull(),
  previewUrl: text("preview_url"),
  artworkUrl: text("artwork_url").notNull(),
  genre: text("genre"),
  releaseYear: integer("release_year"),
  addedAt: timestamp("added_at").defaultNow().notNull(),
});

export type Favorite = typeof favoritesTable.$inferSelect;
