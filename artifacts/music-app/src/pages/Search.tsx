import React, { useState, useEffect, useRef } from "react";
import type { Track } from "@workspace/api-client-react";
import { useGetPlaylists, useAddTrackToPlaylist, useCreatePlaylist, getGetPlaylistsQueryKey, customFetch } from "@workspace/api-client-react";
import { useMusicPlayer } from "@/contexts/MusicPlayerContext";
import { useSearchHistory } from "@/hooks/use-search-history";
import { Input } from "@/components/ui/input";
import { Search as SearchIcon, Play, Plus, Download, Clock, X, Disc, Music, Mic, Film } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useQueryClient } from "@tanstack/react-query";

interface ArtistResult {
  id: string;
  name: string;
  image: string;
  role: string;
  isVerified: boolean;
}

interface AlbumResult {
  id: string;
  title: string;
  artist: string;
  image: string;
  year: number | null;
}

const BROWSE_CATEGORIES = [
  { name: "Hindi Hits", query: "Hindi", gradient: "from-orange-500 to-amber-600", icon: "🇮🇳" },
  { name: "Global Pop", query: "English", gradient: "from-purple-500 to-indigo-600", icon: "🇬🇧" },
  { name: "Punjabi Beats", query: "Punjabi", gradient: "from-rose-500 to-red-600", icon: "🌾" },
  { name: "Tamil Melody", query: "Tamil", gradient: "from-teal-400 to-emerald-600", icon: "🛕" },
  { name: "Telugu Hits", query: "Telugu", gradient: "from-blue-500 to-cyan-600", icon: "🦁" },
  { name: "Latin Dance", query: "Spanish", gradient: "from-pink-500 to-rose-600", icon: "🇪🇸" },
  { name: "K-Pop Zone", query: "Korean", gradient: "from-fuchsia-500 to-purple-600", icon: "🇰🇷" },
  { name: "J-Pop Anime", query: "Japanese", gradient: "from-cyan-400 to-blue-600", icon: "🇯🇵" },
];

function formatDuration(ms: number) {
  const seconds = Math.floor(ms / 1000);
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export default function Search() {
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [focused, setFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const [results, setResults] = useState<Track[]>([]);
  const [searchType, setSearchType] = useState<"songs" | "artists" | "albums">("songs");
  const [artistResults, setArtistResults] = useState<ArtistResult[]>([]);
  const [albumResults, setAlbumResults] = useState<AlbumResult[]>([]);

  const [selectedArtist, setSelectedArtist] = useState<ArtistResult | null>(null);
  const [selectedAlbum, setSelectedAlbum] = useState<AlbumResult | null>(null);
  const [detailsTracks, setDetailsTracks] = useState<Track[]>([]);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [detailsError, setDetailsError] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isError, setIsError] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [searchOffset, setSearchOffset] = useState(0);
  const PAGE_SIZE = 50;

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query.trim()), 300);
    return () => clearTimeout(t);
  }, [query]);

  const shouldSearch = debouncedQuery.length >= 2;

  useEffect(() => {
    setResults([]);
    setArtistResults([]);
    setAlbumResults([]);
    if (!shouldSearch) {
      setIsError(false);
      setHasMore(false);
      setSearchOffset(0);
      return;
    }
    const controller = new AbortController();
    setIsLoading(true);
    setIsError(false);
    setSearchOffset(0);

    let url = "";
    if (searchType === "songs") {
      url = `/api/music/search?q=${encodeURIComponent(debouncedQuery)}&limit=${PAGE_SIZE}`;
    } else if (searchType === "artists") {
      url = `/api/music/search/artists?q=${encodeURIComponent(debouncedQuery)}`;
    } else {
      url = `/api/music/search/albums?q=${encodeURIComponent(debouncedQuery)}`;
    }

    customFetch<any>(url, { signal: controller.signal })
      .then((data) => {
        if (searchType === "songs") {
          const unique = Array.from(new Map((data as Track[]).map(t => [t.id, t])).values());
          setResults(unique);
          setHasMore(data.length >= PAGE_SIZE);
          setSearchOffset(data.length);
        } else if (searchType === "artists") {
          setArtistResults(data || []);
          setHasMore(false);
        } else {
          setAlbumResults(data || []);
          setHasMore(false);
        }
        setIsLoading(false);
      })
      .catch(err => { if (err.name !== "AbortError") { setIsError(true); setIsLoading(false); } });
    return () => controller.abort();
  }, [debouncedQuery, shouldSearch, searchType]);

  const handleLoadMore = async () => {
    if (isLoadingMore || searchType !== "songs") return;
    setIsLoadingMore(true);
    try {
      const data = await customFetch<Track[]>(`/api/music/search?q=${encodeURIComponent(debouncedQuery)}&limit=${PAGE_SIZE}&offset=${searchOffset}`);
      setResults(prev => {
        const seen = new Set(prev.map(t => t.id));
        return [...prev, ...data.filter(t => !seen.has(t.id))];
      });
      setHasMore(data.length >= PAGE_SIZE);
      setSearchOffset(prev => prev + data.length);
    } catch {
      // silently fail on load more
    } finally {
      setIsLoadingMore(false);
    }
  };

  const handleArtistClick = async (artist: ArtistResult) => {
    setSelectedArtist(artist);
    setDetailsLoading(true);
    setDetailsError(false);
    setDetailsTracks([]);
    try {
      const data = await customFetch<{ tracks: Track[] }>(`/api/music/artist/${artist.id}`);
      setDetailsTracks(data.tracks || []);
    } catch {
      setDetailsError(true);
    } finally {
      setDetailsLoading(false);
    }
  };

  const handleAlbumClick = async (album: AlbumResult) => {
    setSelectedAlbum(album);
    setDetailsLoading(true);
    setDetailsError(false);
    setDetailsTracks([]);
    try {
      const data = await customFetch<{ tracks: Track[] }>(`/api/music/album/${album.id}`);
      setDetailsTracks(data.tracks || []);
    } catch {
      setDetailsError(true);
    } finally {
      setDetailsLoading(false);
    }
  };

  const handleDetailClose = () => {
    setSelectedArtist(null);
    setSelectedAlbum(null);
    setDetailsTracks([]);
    setDetailsError(false);
  };

  const { play, currentTrack, isPlaying } = useMusicPlayer();
  const { history, addEntry, removeEntry, clearHistory } = useSearchHistory();

  const { data: playlists } = useGetPlaylists();
  const addTrack = useAddTrackToPlaylist();
  const createPlaylist = useCreatePlaylist();
  const queryClient = useQueryClient();

  const [newPlaylistName, setNewPlaylistName] = useState("");
  const [isCreatingPlaylist, setIsCreatingPlaylist] = useState(false);

  useEffect(() => {
    const hasResults =
      (searchType === "songs" && results.length > 0) ||
      (searchType === "artists" && artistResults.length > 0) ||
      (searchType === "albums" && albumResults.length > 0);
    if (hasResults && debouncedQuery.length >= 2) {
      addEntry(debouncedQuery);
    }
  }, [results, artistResults, albumResults, debouncedQuery, searchType]);

  const handleHistoryClick = (term: string) => {
    setQuery(term);
    setDebouncedQuery(term);
    inputRef.current?.focus();
  };

  const handleCategoryClick = (term: string) => {
    setQuery(term);
    setDebouncedQuery(term);
    inputRef.current?.focus();
  };

  const showHistory = !shouldSearch && history.length > 0;

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

  return (
    <div className="space-y-8 pb-10">
      {/* Search Input Bar */}
      <div className="relative max-w-xl">
        <SearchIcon className="absolute left-4 top-3.5 text-muted-foreground w-5 h-5 pointer-events-none z-10" />
        <Input
          ref={inputRef}
          className="w-full bg-white/10 border-transparent text-white pl-12 pr-10 h-12 text-md rounded-full focus-visible:ring-primary placeholder:text-white/40"
          placeholder="Search for songs, artists, or languages..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setTimeout(() => setFocused(false), 150)}
        />
        {query.length > 0 && (
          <button
            className="absolute right-4 top-3.5 text-muted-foreground hover:text-white transition-colors"
            onClick={() => { setQuery(""); setDebouncedQuery(""); inputRef.current?.focus(); }}
            tabIndex={-1}
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Search Type Tabs */}
      <div className="flex gap-2 border-b border-white/5 pb-2">
        <button
          onClick={() => setSearchType("songs")}
          className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-full transition-all ${
            searchType === "songs"
              ? "bg-primary text-primary-foreground shadow-lg"
              : "bg-white/5 text-muted-foreground hover:bg-white/10 hover:text-white"
          }`}
        >
          <Music className="w-4 h-4" />
          Songs
        </button>
        <button
          onClick={() => setSearchType("artists")}
          className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-full transition-all ${
            searchType === "artists"
              ? "bg-primary text-primary-foreground shadow-lg"
              : "bg-white/5 text-muted-foreground hover:bg-white/10 hover:text-white"
          }`}
        >
          <Mic className="w-4 h-4" />
          Singers
        </button>
        <button
          onClick={() => setSearchType("albums")}
          className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-full transition-all ${
            searchType === "albums"
              ? "bg-primary text-primary-foreground shadow-lg"
              : "bg-white/5 text-muted-foreground hover:bg-white/10 hover:text-white"
          }`}
        >
          <Film className="w-4 h-4" />
          Movies
        </button>
      </div>

      {/* Recent History Section */}
      {showHistory && (
        <div className="max-w-xl">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <Clock className="w-4 h-4 text-muted-foreground" />
              Recent searches
            </h2>
            <button
              className="text-xs text-muted-foreground hover:text-red-400 transition-colors px-2 py-1 rounded hover:bg-white/5"
              onClick={clearHistory}
            >
              Clear all
            </button>
          </div>
          <div className="space-y-1">
            {history.map((term) => (
              <div
                key={term}
                className="flex items-center justify-between px-3 py-2 rounded-lg hover:bg-white/5 transition-colors cursor-pointer"
                onClick={() => handleHistoryClick(term)}
              >
                <span className="text-white text-sm">{term}</span>
                <button
                  className="text-muted-foreground hover:text-red-400 p-1 rounded-full hover:bg-white/10 transition-colors shrink-0 ml-2"
                  onClick={(e) => { e.stopPropagation(); removeEntry(term); }}
                  title="Remove"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Loading state skeleton */}
      {isLoading && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
          {[...Array(12)].map((_, i) => (
            <div key={i} className="bg-white/5 p-4 rounded-xl animate-pulse">
              <div className="aspect-square bg-white/10 rounded-md mb-4" />
              <div className="h-4 bg-white/10 rounded w-3/4 mb-2" />
              <div className="h-3 bg-white/10 rounded w-1/2" />
            </div>
          ))}
        </div>
      )}

      {/* Error State */}
      {isError && (
        <div className="text-destructive mt-4 text-sm bg-destructive/10 p-3 rounded-lg border border-destructive/20 inline-block">
          Something went wrong loading results. Please try again.
        </div>
      )}

      {/* Songs Results Grid */}
      {!isLoading && searchType === "songs" && results && results.length > 0 && (
        <div className="space-y-4 animate-in fade-in duration-300">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-white">
              Results for &ldquo;{debouncedQuery}&rdquo;
            </h2>
            <span className="text-sm text-muted-foreground bg-white/5 px-3 py-1 rounded-full border border-white/5">
              {results.length} tracks
            </span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-5">
            {results.map((track) => {
              const isCurrent = currentTrack?.id === track.id;
              return (
                <div
                  key={track.id}
                  className={`bg-white/5 p-4 rounded-2xl hover:bg-white/10 hover:scale-[1.02] transition-all duration-300 group cursor-pointer border relative overflow-hidden ${
                    isCurrent ? "border-primary/50 bg-primary/5 shadow-md shadow-primary/5" : "border-white/5"
                  }`}
                  onClick={() => play(track, results)}
                >
                  <div className="relative aspect-square mb-4 shadow-lg rounded-xl overflow-hidden bg-black/40">
                    {track.artworkUrl ? (
                      <img src={track.artworkUrl} alt={track.title} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-white/5">
                        <Disc className="w-10 h-10 text-muted-foreground" />
                      </div>
                    )}
                    
                    {/* Play overlay button */}
                    <button
                      className={`absolute inset-0 bg-black/40 flex items-center justify-center transition-opacity duration-300 ${
                        isCurrent ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                      }`}
                      onClick={(e) => {
                        e.stopPropagation();
                        play(track, results);
                      }}
                    >
                      <div className="w-12 h-12 bg-primary rounded-full flex items-center justify-center text-primary-foreground shadow-xl scale-90 group-hover:scale-100 transition-transform hover:scale-105">
                        {isCurrent && isPlaying ? (
                          <Play className="w-5 h-5 fill-current ml-0.5 animate-pulse" />
                        ) : (
                          <Play className="w-5 h-5 fill-current ml-1" />
                        )}
                      </div>
                    </button>

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

                    <div className="absolute bottom-2 left-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <span className="text-[10px] text-white/70 bg-black/60 px-1.5 py-0.5 rounded">
                        {formatDuration(track.duration)}
                      </span>
                    </div>
                  </div>
                  <div className="font-semibold text-white truncate text-sm" title={track.title}>{track.title}</div>
                  <div className="text-xs text-muted-foreground truncate mt-1" title={track.artist}>{track.artist}</div>
                  {track.genre && (
                    <div className="text-[10px] text-muted-foreground/60 truncate mt-1 bg-white/5 px-2 py-0.5 rounded border border-white/5 w-fit">{track.genre}</div>
                  )}
                </div>
              );
            })}
          </div>

          {hasMore && (
            <div className="flex justify-center pt-4">
              <button
                className="bg-white/10 hover:bg-white/20 text-white px-8 py-2 rounded-full text-sm font-medium transition-colors disabled:opacity-50"
                onClick={handleLoadMore}
                disabled={isLoadingMore}
              >
                {isLoadingMore ? "Loading…" : "Load More"}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Singers Results Grid */}
      {!isLoading && searchType === "artists" && artistResults && artistResults.length > 0 && (
        <div className="space-y-4 animate-in fade-in duration-300">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-white">
              Singers for &ldquo;{debouncedQuery}&rdquo;
            </h2>
            <span className="text-sm text-muted-foreground bg-white/5 px-3 py-1 rounded-full border border-white/5">
              {artistResults.length} singers
            </span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-5">
            {artistResults.map((artist) => (
              <div
                key={artist.id}
                className="bg-white/5 p-4 rounded-2xl hover:bg-white/10 hover:scale-[1.02] transition-all duration-300 group cursor-pointer border border-white/5 text-center flex flex-col items-center"
                onClick={() => handleArtistClick(artist)}
              >
                <div className="relative w-28 h-28 sm:w-32 sm:h-32 mb-4 shadow-lg rounded-full overflow-hidden bg-black/40">
                  {artist.image ? (
                    <img src={artist.image} alt={artist.name} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-white/5">
                      <Mic className="w-12 h-12 text-muted-foreground" />
                    </div>
                  )}
                </div>
                <div className="font-semibold text-white truncate w-full text-sm" title={artist.name}>
                  {artist.name}
                </div>
                <div className="text-xs text-muted-foreground truncate mt-1">
                  {artist.role || "Singer"}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Movies / Albums Results Grid */}
      {!isLoading && searchType === "albums" && albumResults && albumResults.length > 0 && (
        <div className="space-y-4 animate-in fade-in duration-300">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-white">
              Movies & Albums for &ldquo;{debouncedQuery}&rdquo;
            </h2>
            <span className="text-sm text-muted-foreground bg-white/5 px-3 py-1 rounded-full border border-white/5">
              {albumResults.length} results
            </span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-5">
            {albumResults.map((album) => (
              <div
                key={album.id}
                className="bg-white/5 p-4 rounded-2xl hover:bg-white/10 hover:scale-[1.02] transition-all duration-300 group cursor-pointer border border-white/5"
                onClick={() => handleAlbumClick(album)}
              >
                <div className="relative aspect-square mb-4 shadow-lg rounded-xl overflow-hidden bg-black/40">
                  {album.image ? (
                    <img src={album.image} alt={album.title} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-white/5">
                      <Disc className="w-12 h-12 text-muted-foreground" />
                    </div>
                  )}
                </div>
                <div className="font-semibold text-white truncate text-sm animate-in fade-in duration-300 w-full" title={album.title}>
                  {album.title}
                </div>
                <div className="text-xs text-muted-foreground truncate mt-1" title={album.artist}>
                  {album.artist}
                </div>
                {album.year && (
                  <div className="text-[10px] text-muted-foreground/60 truncate mt-1 bg-white/5 px-2 py-0.5 rounded border border-white/5 w-fit">
                    {album.year}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* No Results Fallback */}
      {shouldSearch && !isLoading && !isError && (
        (searchType === "songs" && results && results.length === 0) ||
        (searchType === "artists" && artistResults && artistResults.length === 0) ||
        (searchType === "albums" && albumResults && albumResults.length === 0)
      ) && (
        <div className="mt-8 text-center py-16 space-y-4">
          <SearchIcon className="w-12 h-12 mx-auto opacity-30 text-muted-foreground" />
          <p className="text-lg font-medium text-white">No results found for &ldquo;{debouncedQuery}&rdquo;</p>
          <p className="text-sm text-muted-foreground max-w-sm mx-auto">
            Try searching for a song title, singer name, language, or album (e.g. Arijit Singh, Taylor Swift, Diljit Dosanjh, BTS).
          </p>
        </div>
      )}

      {/* Default State: Browse Categories Grid */}
      {!shouldSearch && !showHistory && (
        <div className="space-y-6 animate-in fade-in duration-300">
          <div>
            <h2 className="text-2xl font-bold text-white tracking-tight">Browse all</h2>
            <p className="text-muted-foreground text-sm mt-1">Select a category or language to explore popular tracks.</p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
            {BROWSE_CATEGORIES.map((cat) => (
              <div
                key={cat.name}
                className={`h-36 rounded-2xl bg-gradient-to-br ${cat.gradient} p-5 relative overflow-hidden hover:scale-[1.03] transition-transform cursor-pointer group shadow-lg`}
                onClick={() => handleCategoryClick(cat.query)}
              >
                <span className="text-xl font-bold text-white block select-none">{cat.name}</span>
                <span className="absolute bottom-4 right-4 text-5xl select-none transition-transform duration-300 group-hover:scale-110 group-hover:rotate-6 block">
                  {cat.icon}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Singer / Movie Details Dialog */}
      <Dialog open={!!selectedArtist || !!selectedAlbum} onOpenChange={(open) => { if (!open) handleDetailClose(); }}>
        <DialogContent className="bg-zinc-950 text-white border-white/10 max-w-2xl max-h-[80vh] overflow-y-auto rounded-2xl">
          <DialogHeader className="hidden">
            <DialogTitle>Details</DialogTitle>
          </DialogHeader>

          {/* Details Loading State */}
          {detailsLoading && (
            <div className="py-12 flex flex-col items-center justify-center gap-4">
              <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
              <p className="text-sm text-muted-foreground animate-pulse">Fetching tracks...</p>
            </div>
          )}

          {/* Details Error State */}
          {!detailsLoading && detailsError && (
            <div className="py-12 text-center">
              <p className="text-red-400 font-semibold mb-2">Failed to load details</p>
              <p className="text-sm text-muted-foreground">Please try again later.</p>
            </div>
          )}

          {/* Details Content */}
          {!detailsLoading && !detailsError && (selectedArtist || selectedAlbum) && (
            <div className="space-y-6">
              {/* Header Info */}
              <div className="flex items-center gap-5 pb-4 border-b border-white/5">
                <div className={`w-24 h-24 overflow-hidden shrink-0 shadow-lg ${selectedArtist ? "rounded-full" : "rounded-2xl"}`}>
                  <img
                    src={selectedArtist ? selectedArtist.image : selectedAlbum?.image}
                    alt={selectedArtist ? selectedArtist.name : selectedAlbum?.title}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="flex flex-col gap-1 min-w-0">
                  <span className="text-[10px] uppercase font-bold tracking-wider text-primary">
                    {selectedArtist ? "Singer" : "Movie / Album"}
                  </span>
                  <h2 className="text-xl sm:text-2xl font-black truncate text-white">
                    {selectedArtist ? selectedArtist.name : selectedAlbum?.title}
                  </h2>
                  <p className="text-xs text-muted-foreground truncate">
                    {selectedArtist ? selectedArtist.role : selectedAlbum?.artist}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {detailsTracks.length} {detailsTracks.length === 1 ? "track" : "tracks"}
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              {detailsTracks.length > 0 && (
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => play(detailsTracks[0], detailsTracks)}
                    className="flex items-center gap-2 bg-primary hover:bg-primary/95 text-primary-foreground px-5 py-2 rounded-full font-bold text-sm transition-all hover:scale-105 shadow-md"
                  >
                    <Play className="w-4 h-4 fill-current" />
                    Play All
                  </button>
                </div>
              )}

              {/* Tracks List */}
              <div className="space-y-1">
                {detailsTracks.length === 0 ? (
                  <p className="text-center py-6 text-sm text-muted-foreground">No tracks available.</p>
                ) : (
                  detailsTracks.map((track, i) => {
                    const isCurrent = currentTrack?.id === track.id;
                    return (
                      <div
                        key={track.id}
                        className={`flex items-center gap-4 px-3 py-2 rounded-xl hover:bg-white/5 transition-colors group cursor-pointer ${
                          isCurrent ? "bg-primary/5 border border-primary/20" : "border border-transparent"
                        }`}
                        onClick={() => play(track, detailsTracks)}
                      >
                        <div className="w-4 text-right text-xs font-bold text-muted-foreground shrink-0 group-hover:hidden">
                          {i + 1}
                        </div>
                        <button
                          className="w-4 text-center text-white hidden group-hover:block shrink-0"
                          onClick={(e) => {
                            e.stopPropagation();
                            play(track, detailsTracks);
                          }}
                        >
                          <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
                        </button>

                        <div className="w-10 h-10 rounded-lg overflow-hidden bg-black/40 shrink-0 shadow">
                          <img src={track.artworkUrl} alt={track.title} className="w-full h-full object-cover" />
                        </div>

                        <div className="flex flex-col min-w-0 flex-1">
                          <span className={`text-sm font-semibold truncate ${isCurrent ? "text-primary" : "text-white"}`}>
                            {track.title}
                          </span>
                          <span className="text-xs text-muted-foreground truncate">{track.artist}</span>
                        </div>

                        <span className="text-xs text-muted-foreground hidden sm:block truncate max-w-[120px]">
                          {track.album}
                        </span>

                        <span className="text-xs text-muted-foreground shrink-0 w-10 text-right">
                          {formatDuration(track.duration)}
                        </span>

                        {/* Hover action buttons (Add to Playlist & Download) */}
                        <div
                          className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity z-10 shrink-0"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {track.previewUrl && (
                            <button
                              className="w-8 h-8 bg-white/5 rounded-full flex items-center justify-center text-muted-foreground hover:text-white hover:bg-white/10 transition-all"
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
                                className="w-8 h-8 bg-white/5 rounded-full flex items-center justify-center text-muted-foreground hover:text-white hover:bg-white/10 transition-all"
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
                    );
                  })
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
