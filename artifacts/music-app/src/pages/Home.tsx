import React, { useState } from "react";
import { useGetTopTracks } from "@workspace/api-client-react";
import { useMusicPlayer } from "@/contexts/MusicPlayerContext";
import { Play } from "lucide-react";
import { Button } from "@/components/ui/button";

const GENRES = ["All", "Pop", "Rock", "Hip-Hop", "Electronic", "Jazz", "Classical"];

export default function Home() {
  const [selectedGenre, setSelectedGenre] = useState<string>("All");
  const { data: topTracks } = useGetTopTracks(selectedGenre !== "All" ? { genre: selectedGenre.toLowerCase() } : {});
  const { play } = useMusicPlayer();

  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-bold tracking-tight">Good evening</h1>
      
      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
        {GENRES.map((genre) => (
          <Button
            key={genre}
            variant={selectedGenre === genre ? "default" : "secondary"}
            className={`rounded-full ${selectedGenre !== genre ? 'bg-white/10 hover:bg-white/20' : ''}`}
            onClick={() => setSelectedGenre(genre)}
          >
            {genre}
          </Button>
        ))}
      </div>

      <div className="space-y-4">
        <h2 className="text-xl font-bold">Featured Tracks</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
          {topTracks?.map((track) => (
            <div key={track.id} className="bg-white/5 p-4 rounded-xl hover:bg-white/10 transition-colors group cursor-pointer" onClick={() => play(track, topTracks)}>
              <div className="relative aspect-square mb-4 shadow-lg rounded-md overflow-hidden bg-black/40">
                {track.artworkUrl && <img src={track.artworkUrl} alt={track.title} className="w-full h-full object-cover" />}
                <button className="absolute bottom-2 right-2 w-12 h-12 bg-primary rounded-full flex items-center justify-center text-primary-foreground shadow-xl opacity-0 translate-y-4 group-hover:opacity-100 group-hover:translate-y-0 transition-all hover:scale-105 hover:bg-primary/90">
                  <Play className="w-5 h-5 fill-current ml-1" />
                </button>
              </div>
              <div className="font-semibold text-white truncate">{track.title}</div>
              <div className="text-sm text-muted-foreground truncate mt-1">{track.artist}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}