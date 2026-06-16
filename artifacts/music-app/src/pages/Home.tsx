import React, { useState, useEffect } from "react";
import { useGetTopTracks } from "@workspace/api-client-react";
import type { Track } from "@workspace/api-client-react";
import { useMusicPlayer } from "@/contexts/MusicPlayerContext";
import { Play } from "lucide-react";
import { Button } from "@/components/ui/button";

const GENRES = ["All", "Pop", "Rock", "Hip-Hop", "Electronic", "Jazz", "Classical"];
const PAGE_SIZE = 50;

export default function Home() {
  const [selectedGenre, setSelectedGenre] = useState<string>("All");
  const [offset, setOffset] = useState(0);
  const [allTracks, setAllTracks] = useState<Track[]>([]);
  const [hasMore, setHasMore] = useState(true);
  const { play } = useMusicPlayer();

  const params = selectedGenre !== "All"
    ? { genre: selectedGenre }
    : {};

  const { data: topTracks, isLoading } = useGetTopTracks(params);

  useEffect(() => {
    if (topTracks) {
      setAllTracks(topTracks);
      setHasMore(topTracks.length >= PAGE_SIZE);
      setOffset(topTracks.length);
    }
  }, [topTracks, selectedGenre]);

  const handleGenreChange = (genre: string) => {
    setSelectedGenre(genre);
    setAllTracks([]);
    setOffset(0);
    setHasMore(true);
  };

  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-bold tracking-tight">Good evening</h1>

      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
        {GENRES.map((genre) => (
          <Button
            key={genre}
            variant={selectedGenre === genre ? "default" : "secondary"}
            className={`rounded-full shrink-0 ${selectedGenre !== genre ? 'bg-white/10 hover:bg-white/20' : ''}`}
            onClick={() => handleGenreChange(genre)}
          >
            {genre}
          </Button>
        ))}
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold">
            {selectedGenre === "All" ? "All Songs" : `${selectedGenre} Songs`}
          </h2>
          <span className="text-sm text-muted-foreground">{allTracks.length} tracks</span>
        </div>

        {isLoading && allTracks.length === 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
            {[...Array(10)].map((_, i) => (
              <div key={i} className="bg-white/5 p-4 rounded-xl animate-pulse">
                <div className="aspect-square bg-white/10 rounded-md mb-4" />
                <div className="h-4 bg-white/10 rounded w-3/4 mb-2" />
                <div className="h-3 bg-white/10 rounded w-1/2" />
              </div>
            ))}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
              {allTracks.map((track) => (
                <div
                  key={track.id}
                  className="bg-white/5 p-4 rounded-xl hover:bg-white/10 transition-colors group cursor-pointer"
                  onClick={() => play(track, allTracks)}
                >
                  <div className="relative aspect-square mb-4 shadow-lg rounded-md overflow-hidden bg-black/40">
                    {track.artworkUrl && (
                      <img src={track.artworkUrl} alt={track.title} className="w-full h-full object-cover" />
                    )}
                    <button
                      className="absolute bottom-2 right-2 w-12 h-12 bg-primary rounded-full flex items-center justify-center text-primary-foreground shadow-xl opacity-0 translate-y-4 group-hover:opacity-100 group-hover:translate-y-0 transition-all hover:scale-105 hover:bg-primary/90"
                      onClick={(e) => { e.stopPropagation(); play(track, allTracks); }}
                    >
                      <Play className="w-5 h-5 fill-current ml-1" />
                    </button>
                  </div>
                  <div className="font-semibold text-white truncate">{track.title}</div>
                  <div className="text-sm text-muted-foreground truncate mt-1">{track.artist}</div>
                  {track.genre && (
                    <div className="text-xs text-muted-foreground/60 truncate mt-0.5">{track.genre}</div>
                  )}
                </div>
              ))}
            </div>

            {hasMore && !isLoading && (
              <div className="flex justify-center pt-4">
                <Button
                  variant="secondary"
                  className="bg-white/10 hover:bg-white/20 text-white px-8"
                  onClick={async () => {
                    try {
                      const qs = new URLSearchParams({ limit: String(PAGE_SIZE), offset: String(offset) });
                      if (selectedGenre !== "All") qs.set("genre", selectedGenre);
                      const res = await fetch(`/api/music/top?${qs}`);
                      const more: Track[] = await res.json();
                      if (more.length < PAGE_SIZE) setHasMore(false);
                      setAllTracks(prev => [...prev, ...more]);
                      setOffset(prev => prev + more.length);
                    } catch {
                      setHasMore(false);
                    }
                  }}
                >
                  Load More
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
