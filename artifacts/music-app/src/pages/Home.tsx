import React, { useState, useEffect } from "react";
import { useGetTopTracks, useGetPlaylists, useAddTrackToPlaylist, useCreatePlaylist, getGetPlaylistsQueryKey } from "@workspace/api-client-react";
import type { Track } from "@workspace/api-client-react";
import { useMusicPlayer } from "@/contexts/MusicPlayerContext";
import { Play, Pause, Disc, Heart, Music, Flame, Globe, Plus, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useQueryClient } from "@tanstack/react-query";

const LANGUAGES = [
  { name: "Hindi", label: "Hindi Hits", icon: "🇮🇳" },
  { name: "English", label: "Global Pop", icon: "🇬🇧" },
  { name: "Punjabi", label: "Punjabi Beats", icon: "🌾" },
  { name: "Tamil", label: "Tamil Melody", icon: "🛕" },
  { name: "Telugu", label: "Telugu Hits", icon: "🦁" },
  { name: "Spanish", label: "Latin Party", icon: "🇪🇸" },
  { name: "Korean", label: "K-Pop Magic", icon: "🇰🇷" },
  { name: "Japanese", label: "J-Pop Anime", icon: "🇯🇵" },
];

const GENRES = ["All", "Pop", "Rock", "Hip-Hop", "Electronic", "Jazz", "Classical"];
const PAGE_SIZE = 50;

function getGreeting() {
  const hr = new Date().getHours();
  if (hr < 12) return "Good morning";
  if (hr < 17) return "Good afternoon";
  return "Good evening";
}

export default function Home() {
  const [selectedLanguage, setSelectedLanguage] = useState<string>("Hindi");
  const [selectedGenre, setSelectedGenre] = useState<string>("All");
  const [offset, setOffset] = useState(0);
  const [allTracks, setAllTracks] = useState<Track[]>([]);
  const [hasMore, setHasMore] = useState(true);
  const { play, currentTrack, isPlaying } = useMusicPlayer();

  const { data: playlists } = useGetPlaylists();
  const addTrack = useAddTrackToPlaylist();
  const createPlaylist = useCreatePlaylist();
  const queryClient = useQueryClient();

  const [newPlaylistName, setNewPlaylistName] = useState("");
  const [isCreatingPlaylist, setIsCreatingPlaylist] = useState(false);

  const handleCreatePlaylistAndAdd = async (track: any) => {
    if (!newPlaylistName.trim()) return;
    createPlaylist.mutate({ data: { name: newPlaylistName } }, {
      onSuccess: (newPlaylist) => {
        queryClient.invalidateQueries({ queryKey: getGetPlaylistsQueryKey() });
        addTrack.mutate({
          playlistId: newPlaylist.id,
          data: {
            trackId: track.id,
            title: track.title,
            artist: track.artist,
            album: track.album,
            duration: track.duration,
            previewUrl: track.previewUrl,
            artworkUrl: track.artworkUrl,
            genre: track.genre,
            releaseYear: track.releaseYear
          }
        });
        setNewPlaylistName("");
        setIsCreatingPlaylist(false);
      }
    });
  };

  const params = selectedGenre !== "All"
    ? ({ genre: selectedGenre } as any)
    : ({ language: selectedLanguage } as any);

  const { data: topTracks, isLoading } = useGetTopTracks(params);

  useEffect(() => {
    if (topTracks) {
      const unique = Array.from(new Map(topTracks.map(t => [t.id, t])).values());
      setAllTracks(unique);
      setHasMore(topTracks.length >= PAGE_SIZE);
      setOffset(topTracks.length);
    }
  }, [topTracks, selectedLanguage, selectedGenre]);

  const handleLanguageChange = (lang: string) => {
    setSelectedLanguage(lang);
    setSelectedGenre("All");
    setAllTracks([]);
    setOffset(0);
    setHasMore(true);
  };

  const handleGenreChange = (genre: string) => {
    setSelectedGenre(genre);
    setAllTracks([]);
    setOffset(0);
    setHasMore(true);
  };

  const handlePlaySong = (track: Track) => {
    play(track, allTracks);
  };

  const currentLangObj = LANGUAGES.find(l => l.name === selectedLanguage);

  return (
    <div className="space-y-8 pb-10">
      {/* Immersive Header Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-purple-900/40 via-indigo-900/30 to-black/20 p-8 border border-white/5 shadow-2xl">
        <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-primary/10 rounded-full blur-[120px] pointer-events-none -mr-20 -mt-20" />
        <div className="relative z-10 space-y-4 max-w-xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md text-xs font-semibold text-primary">
            <Flame className="w-3.5 h-3.5 fill-current animate-pulse text-rose-500" />
            Trending Live Stream
          </div>
          <h1 className="text-4xl font-extrabold tracking-tight text-white md:text-5xl">
            {getGreeting()}
          </h1>
          <p className="text-muted-foreground text-sm md:text-base leading-relaxed">
            Welcome to the ultimate real-time music space. Experience high-fidelity 320kbps full songs across regional & international languages.
          </p>
          <div className="flex gap-3 pt-2">
            {allTracks.length > 0 && (
              <Button
                onClick={() => handlePlaySong(allTracks[0])}
                className="rounded-full px-6 font-bold hover:scale-105 transition-transform"
              >
                <Play className="w-4 h-4 fill-current mr-2" />
                Listen Now
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Language Tabs Row */}
      <div className="space-y-3">
        <h2 className="text-lg font-bold text-white flex items-center gap-2">
          <Globe className="w-5 h-5 text-primary" />
          Choose Language
        </h2>
        <div className="flex gap-2.5 overflow-x-auto pb-2 scrollbar-hide">
          {LANGUAGES.map((lang) => (
            <button
              key={lang.name}
              className={`flex items-center gap-2 px-4.5 py-2.5 rounded-2xl border transition-all duration-200 shrink-0 font-medium ${selectedLanguage === lang.name && selectedGenre === "All"
                ? "bg-primary text-primary-foreground border-transparent shadow-lg shadow-primary/20 scale-[1.03]"
                : "bg-white/5 border-white/5 text-white/80 hover:bg-white/10 hover:border-white/10"
                }`}
              onClick={() => handleLanguageChange(lang.name)}
            >
              <span className="text-lg">{lang.icon}</span>
              <span className="text-sm">{lang.name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Genre Pills Row */}
      <div className="space-y-3">
        <h2 className="text-lg font-bold text-white flex items-center gap-2">
          <Music className="w-5 h-5 text-primary" />
          Select Vibe
        </h2>
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
          {GENRES.map((genre) => (
            <Button
              key={genre}
              variant={selectedGenre === genre ? "default" : "secondary"}
              className={`rounded-full shrink-0 text-sm ${selectedGenre === genre
                ? "shadow-md shadow-primary/10"
                : "bg-white/5 hover:bg-white/15 border-transparent text-white/90"
                }`}
              onClick={() => handleGenreChange(genre)}
            >
              {genre === "All" ? "⚡ Everything" : genre}
            </Button>
          ))}
        </div>
      </div>

      {/* Songs Grid Container */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            {selectedGenre !== "All" ? `${selectedGenre} Hits` : `${currentLangObj?.label || selectedLanguage}`}
          </h2>
          <span className="text-sm text-muted-foreground bg-white/5 px-3 py-1 rounded-full border border-white/5">
            {allTracks.length} tracks
          </span>
        </div>

        {isLoading && allTracks.length === 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-5">
            {[...Array(12)].map((_, i) => (
              <div key={i} className="bg-white/5 p-4 rounded-2xl animate-pulse border border-white/5">
                <div className="aspect-square bg-white/10 rounded-xl mb-4" />
                <div className="h-4 bg-white/10 rounded w-3/4 mb-2" />
                <div className="h-3 bg-white/10 rounded w-1/2" />
              </div>
            ))}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-5">
              {allTracks.map((track) => {
                const isCurrent = currentTrack?.id === track.id;
                return (
                  <div
                    key={track.id}
                    className={`bg-white/5 p-4 rounded-2xl hover:bg-white/10 hover:scale-[1.02] hover:shadow-xl hover:shadow-black/20 transition-all duration-300 group cursor-pointer border relative overflow-hidden ${isCurrent ? "border-primary/50 bg-primary/5 shadow-lg shadow-primary/5" : "border-white/5"
                      }`}
                    onClick={() => handlePlaySong(track)}
                  >
                    <div className="relative aspect-square mb-4 shadow-md rounded-xl overflow-hidden bg-black/40">
                      {track.artworkUrl ? (
                        <img
                          src={track.artworkUrl}
                          alt={track.title}
                          className={`w-full h-full object-cover transition-transform duration-500 group-hover:scale-105 ${isCurrent && isPlaying ? "animate-spin-slow" : ""
                            }`}
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-white/5">
                          <Disc className="w-10 h-10 text-muted-foreground animate-pulse" />
                        </div>
                      )}

                      {/* Play overlay button */}
                      <button
                        className={`absolute inset-0 bg-black/40 flex items-center justify-center transition-opacity duration-300 ${isCurrent ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                          }`}
                        onClick={(e) => {
                          e.stopPropagation();
                          if (isCurrent) {
                            // Already playing this song, handle play/pause
                            const pBtn = document.querySelector('.h-24 button');
                            if (pBtn) (pBtn as HTMLButtonElement).click();
                          } else {
                            handlePlaySong(track);
                          }
                        }}
                      >
                        <div className="w-12 h-12 bg-primary rounded-full flex items-center justify-center text-primary-foreground shadow-xl scale-90 group-hover:scale-100 transition-transform hover:scale-105">
                          {isCurrent && isPlaying ? (
                            <Pause className="w-5 h-5 fill-current" />
                          ) : (
                            <Play className="w-5 h-5 fill-current ml-1" />
                          )}
                        </div>
                      </button>

                      {isCurrent && isPlaying && (
                        <div className="absolute top-2 left-2 bg-primary/95 text-primary-foreground text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1.5 shadow-md">
                          <span className="flex gap-0.5">
                            <span className="w-0.5 h-2.5 bg-current animate-bounce" style={{ animationDelay: '0.1s' }} />
                            <span className="w-0.5 h-2.5 bg-current animate-bounce" style={{ animationDelay: '0.3s' }} />
                            <span className="w-0.5 h-2.5 bg-current animate-bounce" style={{ animationDelay: '0.2s' }} />
                          </span>
                          Playing
                        </div>
                      )}

                      <div
                        className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {track.previewUrl && (
                          <button
                            className="w-8 h-8 bg-black/60 rounded-full flex items-center justify-center text-white hover:bg-black/80 transition-colors"
                            title="Download"
                            onClick={() => {
                              fetch(track.previewUrl!).then(res => res.blob()).then(blob => {
                                const url = URL.createObjectURL(blob);
                                const a = document.createElement('a');
                                a.href = url;
                                a.download = `${track.artist} - ${track.title}.mp3`;
                                a.click();
                                URL.revokeObjectURL(url);
                              });
                            }}
                          >
                            <Download className="w-3.5 h-3.5" />
                          </button>
                        )}

                        <Dialog>
                          <DialogTrigger asChild>
                            <button
                              className="w-8 h-8 bg-black/60 rounded-full flex items-center justify-center text-white hover:bg-black/80 transition-colors"
                              title="Add to Playlist"
                            >
                              <Plus className="w-3.5 h-3.5" />
                            </button>
                          </DialogTrigger>
                          <DialogContent className="bg-card text-card-foreground border-border max-w-sm">
                            <DialogHeader>
                              <DialogTitle>Add to Playlist</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-1 max-h-64 overflow-y-auto mt-4">
                              {isCreatingPlaylist ? (
                                <div className="p-2 space-y-2">
                                  <Input
                                    autoFocus
                                    placeholder="Playlist name..."
                                    value={newPlaylistName}
                                    onChange={e => setNewPlaylistName(e.target.value)}
                                    onKeyDown={e => e.key === 'Enter' && handleCreatePlaylistAndAdd(track)}
                                    className="bg-background border-input"
                                  />
                                  <div className="flex gap-2">
                                    <button onClick={() => setIsCreatingPlaylist(false)} className="text-xs text-muted-foreground hover:text-white p-1">Cancel</button>
                                    <button onClick={() => handleCreatePlaylistAndAdd(track)} disabled={!newPlaylistName.trim()} className="text-xs text-primary font-bold p-1">Create & Add</button>
                                  </div>
                                </div>
                              ) : (
                                <button
                                  className="w-full text-left p-2 flex items-center gap-3 hover:bg-white/10 rounded transition-colors text-primary font-medium"
                                  onClick={() => setIsCreatingPlaylist(true)}
                                >
                                  <div className="w-10 h-10 bg-primary/20 rounded flex items-center justify-center shrink-0">
                                    <Plus className="w-5 h-5 text-primary" />
                                  </div>
                                  New Playlist
                                </button>
                              )}

                              {playlists?.map(playlist => (
                                <button
                                  key={playlist.id}
                                  className="w-full text-left p-2 flex items-center gap-3 hover:bg-white/10 rounded transition-colors"
                                  onClick={() => {
                                    addTrack.mutate({
                                      playlistId: playlist.id,
                                      data: {
                                        trackId: track.id,
                                        title: track.title,
                                        artist: track.artist,
                                        album: track.album,
                                        duration: track.duration,
                                        previewUrl: track.previewUrl,
                                        artworkUrl: track.artworkUrl,
                                        genre: track.genre,
                                        releaseYear: track.releaseYear
                                      }
                                    });
                                  }}
                                >
                                  <div className="w-10 h-10 bg-white/10 rounded flex items-center justify-center shrink-0 overflow-hidden">
                                    {playlist.coverArt ? (
                                      <img src={playlist.coverArt} className="w-full h-full object-cover" />
                                    ) : (
                                      <div className="text-white/30 font-bold text-sm">{playlist.name[0]}</div>
                                    )}
                                  </div>
                                  <div className="flex flex-col overflow-hidden">
                                    <span className="truncate text-sm">{playlist.name}</span>
                                    <span className="text-xs text-muted-foreground">{playlist.trackCount} tracks</span>
                                  </div>
                                </button>
                              ))}
                            </div>
                          </DialogContent>
                        </Dialog>
                      </div>
                    </div>

                    <div className="font-semibold text-white truncate text-sm" title={track.title}>
                      {track.title}
                    </div>
                    <div className="text-xs text-muted-foreground truncate mt-1" title={track.artist}>
                      {track.artist}
                    </div>
                    <div className="flex items-center justify-between mt-2 pt-1 border-t border-white/5">
                      <span className="text-[10px] text-muted-foreground/60 font-medium">
                        {track.genre || selectedLanguage}
                      </span>
                      {track.releaseYear && (
                        <span className="text-[10px] text-muted-foreground/50">
                          {track.releaseYear}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {hasMore && !isLoading && (
              <div className="flex justify-center pt-8">
                <Button
                  variant="secondary"
                  className="bg-white/10 hover:bg-white/15 text-white px-8 rounded-full border border-white/5 transition-colors"
                  onClick={async () => {
                    try {
                      const qs = new URLSearchParams({ limit: String(PAGE_SIZE), offset: String(offset) });
                      if (selectedGenre !== "All") {
                        qs.set("genre", selectedGenre);
                      } else {
                        qs.set("language", selectedLanguage);
                      }
                      const res = await fetch(`/api/music/top?${qs}`);
                      const more: Track[] = await res.json();
                      if (more.length < PAGE_SIZE) setHasMore(false);
                      setAllTracks(prev => {
                        const seen = new Set(prev.map(t => t.id));
                        return [...prev, ...more.filter(t => !seen.has(t.id))];
                      });
                      setOffset(prev => prev + more.length);
                    } catch {
                      setHasMore(false);
                    }
                  }}
                >
                  Load More Hits
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
