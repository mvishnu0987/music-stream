import React, { useState } from "react";
import { useSearchMusic, useGetPlaylists, useAddTrackToPlaylist, useCreatePlaylist, getGetPlaylistsQueryKey } from "@workspace/api-client-react";
import { useMusicPlayer } from "@/contexts/MusicPlayerContext";
import { Input } from "@/components/ui/input";
import { Search as SearchIcon, Play, Plus, Download, Clock } from "lucide-react";
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
  const { data: results, isLoading } = useSearchMusic({ q: query, limit: 20 }, { query: { enabled: query.length > 2 } });
  const { play } = useMusicPlayer();
  
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

  return (
    <div className="space-y-8">
      <div className="relative max-w-xl">
        <SearchIcon className="absolute left-4 top-3 text-muted-foreground w-6 h-6" />
        <Input 
          className="w-full bg-white/10 border-transparent text-white pl-14 h-12 text-lg rounded-full focus-visible:ring-primary placeholder:text-white/40"
          placeholder="What do you want to listen to?"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      {isLoading && (
        <div className="space-y-4 mt-8">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex items-center p-2 rounded-md animate-pulse">
              <div className="w-8 h-8 mr-2"></div>
              <div className="w-10 h-10 bg-white/10 rounded mr-4"></div>
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-white/10 rounded w-1/4"></div>
                <div className="h-3 bg-white/10 rounded w-1/6"></div>
              </div>
            </div>
          ))}
        </div>
      )}

      {results && results.length > 0 && (
        <div className="space-y-2">
          <div className="grid grid-cols-[16px_1fr_minmax(120px,200px)_40px_40px] gap-4 px-4 py-2 border-b border-white/10 text-xs uppercase tracking-wider text-muted-foreground font-medium mb-4">
            <div className="text-right">#</div>
            <div>Title</div>
            <div className="hidden md:block">Album</div>
            <div className="text-right"><Clock className="w-4 h-4 ml-auto" /></div>
            <div></div>
          </div>

          {results.map((track, i) => (
            <div key={track.id} className="grid grid-cols-[16px_1fr_minmax(120px,200px)_40px_40px] gap-4 px-4 py-2 hover:bg-white/5 rounded-md group items-center transition-colors">
              <div className="text-right text-muted-foreground text-sm group-hover:hidden">{i + 1}</div>
              <button 
                onClick={() => play(track, results)} 
                className="w-4 text-center text-white hidden group-hover:block"
              >
                <Play className="w-3 h-3 fill-current ml-0.5" />
              </button>
              
              <div className="flex items-center gap-3 overflow-hidden">
                <img src={track.artworkUrl} alt={track.title} className="w-10 h-10 rounded object-cover shadow-sm" />
                <div className="flex flex-col overflow-hidden">
                  <span className="text-white truncate font-medium text-sm">{track.title}</span>
                  <span className="text-muted-foreground truncate text-xs">{track.artist}</span>
                </div>
              </div>
              
              <div className="text-muted-foreground text-sm truncate hidden md:block">{track.album}</div>
              
              <div className="text-right text-muted-foreground text-sm">
                {formatDuration(track.duration)}
              </div>
              
              <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                {track.previewUrl && (
                  <button onClick={() => {
                    fetch(track.previewUrl!).then(res => res.blob()).then(blob => {
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = `${track.artist} - ${track.title}.mp3`;
                      a.click();
                      URL.revokeObjectURL(url);
                    });
                  }} className="text-muted-foreground hover:text-white" title="Download">
                    <Download className="w-4 h-4" />
                  </button>
                )}
                
                <Dialog>
                  <DialogTrigger asChild>
                    <button className="text-muted-foreground hover:text-white" title="Add to Playlist">
                      <Plus className="w-4 h-4" />
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
                              <div className="text-white/30 font-bold">M</div>
                            )}
                          </div>
                          <div className="flex flex-col overflow-hidden">
                            <span className="truncate">{playlist.name}</span>
                            <span className="text-xs text-muted-foreground">{playlist.trackCount} tracks</span>
                          </div>
                        </button>
                      ))}
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </div>
          ))}
        </div>
      )}

      {query.length > 2 && !isLoading && (!results || results.length === 0) && (
        <div className="text-muted-foreground mt-8 text-center">
          No results found for "{query}"
        </div>
      )}
    </div>
  );
}