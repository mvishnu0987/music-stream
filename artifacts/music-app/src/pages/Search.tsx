import React, { useState, useEffect, useRef } from "react";
import { useSearchMusic, useGetPlaylists, useAddTrackToPlaylist, useCreatePlaylist, getGetPlaylistsQueryKey } from "@workspace/api-client-react";
import { useMusicPlayer } from "@/contexts/MusicPlayerContext";
import { useSearchHistory } from "@/hooks/use-search-history";
import { Input } from "@/components/ui/input";
import { Search as SearchIcon, Play, Plus, Download, Clock, X } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useQueryClient } from "@tanstack/react-query";

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

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query.trim()), 300);
    return () => clearTimeout(t);
  }, [query]);

  const shouldSearch = debouncedQuery.length >= 2;

  const { data: results, isLoading, isError } = useSearchMusic(
    { q: debouncedQuery || " ", limit: 20 },
    { query: { enabled: shouldSearch } }
  );

  const { play } = useMusicPlayer();
  const { history, addEntry, removeEntry, clearHistory } = useSearchHistory();

  const { data: playlists } = useGetPlaylists();
  const addTrack = useAddTrackToPlaylist();
  const createPlaylist = useCreatePlaylist();
  const queryClient = useQueryClient();

  const [newPlaylistName, setNewPlaylistName] = useState("");
  const [isCreatingPlaylist, setIsCreatingPlaylist] = useState(false);

  useEffect(() => {
    if (results && results.length > 0 && debouncedQuery.length >= 2) {
      addEntry(debouncedQuery);
    }
  }, [results, debouncedQuery]);

  const handleHistoryClick = (term: string) => {
    setQuery(term);
    setDebouncedQuery(term);
    inputRef.current?.focus();
  };

  const showHistory = focused && !shouldSearch && history.length > 0;

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
    <div className="space-y-8">
      <div className="relative max-w-xl">
        <SearchIcon className="absolute left-4 top-3 text-muted-foreground w-6 h-6 pointer-events-none z-10" />
        <Input
          ref={inputRef}
          className="w-full bg-white/10 border-transparent text-white pl-14 pr-10 h-12 text-lg rounded-full focus-visible:ring-primary placeholder:text-white/40"
          placeholder="What do you want to listen to?"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setTimeout(() => setFocused(false), 150)}
        />
        {query.length > 0 && (
          <button
            className="absolute right-4 top-3 text-muted-foreground hover:text-white transition-colors"
            onClick={() => { setQuery(""); setDebouncedQuery(""); inputRef.current?.focus(); }}
            tabIndex={-1}
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {showHistory && (
        <div className="max-w-xl">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-semibold text-white">Recent searches</h2>
            <button
              className="text-xs text-muted-foreground hover:text-white transition-colors"
              onClick={clearHistory}
            >
              Clear all
            </button>
          </div>
          <div className="space-y-1">
            {history.map((term) => (
              <div
                key={term}
                className="flex items-center justify-between group px-3 py-2.5 rounded-lg hover:bg-white/5 transition-colors cursor-pointer"
                onClick={() => handleHistoryClick(term)}
              >
                <div className="flex items-center gap-3">
                  <Clock className="w-4 h-4 text-muted-foreground shrink-0" />
                  <span className="text-white text-sm">{term}</span>
                </div>
                <button
                  className="text-muted-foreground hover:text-red-400 p-1.5 rounded-full hover:bg-white/10 transition-colors"
                  onClick={(e) => { e.stopPropagation(); removeEntry(term); }}
                  title="Remove from history"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {isLoading && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
          {[...Array(10)].map((_, i) => (
            <div key={i} className="bg-white/5 p-4 rounded-xl animate-pulse">
              <div className="aspect-square bg-white/10 rounded-md mb-4" />
              <div className="h-4 bg-white/10 rounded w-3/4 mb-2" />
              <div className="h-3 bg-white/10 rounded w-1/2" />
            </div>
          ))}
        </div>
      )}

      {isError && (
        <div className="text-destructive mt-4 text-sm">
          Something went wrong loading results. Please try again.
        </div>
      )}

      {!isLoading && results && results.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-xl font-bold">
            Results for &ldquo;{debouncedQuery}&rdquo;
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
            {results.map((track) => (
              <div
                key={track.id}
                className="bg-white/5 p-4 rounded-xl hover:bg-white/10 transition-colors group cursor-pointer"
                onClick={() => play(track, results)}
              >
                <div className="relative aspect-square mb-4 shadow-lg rounded-md overflow-hidden bg-black/40">
                  {track.artworkUrl && (
                    <img src={track.artworkUrl} alt={track.title} className="w-full h-full object-cover" />
                  )}
                  <button
                    className="absolute bottom-2 right-2 w-12 h-12 bg-primary rounded-full flex items-center justify-center text-primary-foreground shadow-xl opacity-0 translate-y-4 group-hover:opacity-100 group-hover:translate-y-0 transition-all hover:scale-105 hover:bg-primary/90"
                    onClick={(e) => { e.stopPropagation(); play(track, results); }}
                  >
                    <Play className="w-5 h-5 fill-current ml-1" />
                  </button>

                  <div
                    className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity"
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
                    <span className="text-xs text-white/70 bg-black/60 px-1.5 py-0.5 rounded">
                      {formatDuration(track.duration)}
                    </span>
                  </div>
                </div>
                <div className="font-semibold text-white truncate text-sm">{track.title}</div>
                <div className="text-xs text-muted-foreground truncate mt-1">{track.artist}</div>
                {track.genre && (
                  <div className="text-xs text-muted-foreground/60 truncate mt-0.5">{track.genre}</div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {shouldSearch && !isLoading && !isError && results && results.length === 0 && (
        <div className="text-muted-foreground mt-8 text-center py-16">
          <SearchIcon className="w-12 h-12 mx-auto mb-4 opacity-30" />
          <p className="text-lg font-medium">No results found</p>
          <p className="text-sm mt-1">Try a different search term</p>
        </div>
      )}

      {!shouldSearch && !showHistory && (
        <div className="text-muted-foreground text-center py-16">
          <SearchIcon className="w-12 h-12 mx-auto mb-4 opacity-20" />
          <p className="text-lg font-medium text-white/50">Search for music</p>
          <p className="text-sm mt-1">Find songs by title, artist, or genre</p>
        </div>
      )}
    </div>
  );
}
