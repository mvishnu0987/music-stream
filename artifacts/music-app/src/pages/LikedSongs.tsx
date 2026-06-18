import React, { useState } from "react";
import { useGetFavorites, useRemoveFavorite, getGetFavoritesQueryKey, getGetFavoriteIdsQueryKey, useGetPlaylists, useAddTrackToPlaylist, useCreatePlaylist, getGetPlaylistsQueryKey } from "@workspace/api-client-react";
import { useMusicPlayer } from "@/contexts/MusicPlayerContext";
import { Play, Heart, Download, Clock, Plus } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

function formatDuration(ms: number | undefined) {
  if (!ms) return "0:00";
  const seconds = Math.floor(ms / 1000);
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export default function LikedSongs() {
  const { data: favorites, isLoading } = useGetFavorites({ query: { queryKey: getGetFavoritesQueryKey() } });
  const { play } = useMusicPlayer();
  const removeFavorite = useRemoveFavorite();
  const queryClient = useQueryClient();

  const { data: playlists } = useGetPlaylists();
  const addTrack = useAddTrackToPlaylist();
  const createPlaylist = useCreatePlaylist();

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

  const handleRemoveFavorite = (trackId: string) => {
    removeFavorite.mutate(
      { trackId },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getGetFavoritesQueryKey() });
          queryClient.invalidateQueries({ queryKey: getGetFavoriteIdsQueryKey() });
        }
      }
    );
  };

  const handlePlayAll = () => {
    if (favorites && favorites.length > 0) {
      play(favorites[0], favorites);
    }
  };

  if (isLoading) return <div className="text-muted-foreground animate-pulse p-8">Loading liked songs...</div>;

  return (
    <div className="space-y-8 pb-16">
      {/* Header */}
      <div className="flex items-end gap-6 mb-8 pt-8">
        <div className="w-48 h-48 sm:w-56 sm:h-56 bg-gradient-to-br from-purple-700 to-pink-500 shadow-2xl rounded-md overflow-hidden shrink-0 flex items-center justify-center">
          <Heart className="w-24 h-24 text-white" />
        </div>
        <div className="flex flex-col gap-2">
          <span className="text-xs font-bold uppercase tracking-wider text-white/70">Playlist</span>
          <h1 className="text-4xl sm:text-6xl font-black tracking-tighter text-white">Liked Songs</h1>
          <div className="text-sm text-white/70 mt-2 font-medium">
            {favorites?.length || 0} {(favorites?.length === 1) ? 'song' : 'songs'}
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-4 py-4">
        <button
          onClick={handlePlayAll}
          className="w-14 h-14 bg-primary text-primary-foreground rounded-full flex items-center justify-center hover:scale-105 transition-transform shadow-lg hover:bg-primary/90 disabled:opacity-50 disabled:hover:scale-100"
          disabled={!favorites || favorites.length === 0}
        >
          <Play className="w-6 h-6 fill-current ml-1" />
        </button>
      </div>

      {/* Tracklist */}
      <div className="mt-8">
        <div className="grid grid-cols-[16px_1fr_minmax(120px,200px)_minmax(120px,200px)_40px_40px] gap-4 px-4 py-2 border-b border-white/10 text-xs uppercase tracking-wider text-muted-foreground font-medium mb-4">
          <div className="text-right">#</div>
          <div>Title</div>
          <div className="hidden md:block">Album</div>
          <div className="hidden lg:block">Genre</div>
          <div className="text-right"><Clock className="w-4 h-4 ml-auto" /></div>
          <div></div>
        </div>

        {!favorites || favorites.length === 0 ? (
          <div className="text-center py-20 text-muted-foreground flex flex-col items-center gap-4">
            <Heart className="w-12 h-12 text-muted-foreground/30" />
            <p>Songs you like will appear here</p>
          </div>
        ) : (
          <div className="space-y-1">
            {favorites.map((track, i) => (
              <div key={track.id} className="grid grid-cols-[16px_1fr_minmax(120px,200px)_minmax(120px,200px)_40px_40px] gap-4 px-4 py-2 hover:bg-white/5 rounded-md group items-center transition-colors">
                <div className="text-right text-muted-foreground text-sm group-hover:hidden">{i + 1}</div>
                <button
                  onClick={() => play(track, favorites)}
                  className="w-4 text-center text-white hidden group-hover:block"
                >
                  <Play className="w-3 h-3 fill-current ml-0.5" />
                </button>

                <div className="flex items-center gap-3 overflow-hidden">
                  {track.artworkUrl ? (
                    <img src={track.artworkUrl} alt={track.title} className="w-10 h-10 rounded object-cover shadow-sm shrink-0" />
                  ) : (
                    <div className="w-10 h-10 rounded bg-white/10 shrink-0" />
                  )}
                  <div className="flex flex-col overflow-hidden">
                    <span className="text-white truncate font-medium text-sm">{track.title}</span>
                    <span className="text-muted-foreground truncate text-xs">{track.artist}</span>
                  </div>
                </div>

                <div className="hidden md:block text-muted-foreground text-sm truncate">{track.album}</div>
                <div className="hidden lg:block text-muted-foreground text-sm truncate">{track.genre || '-'}</div>

                <div className="text-right text-muted-foreground text-sm">
                  {formatDuration(track.duration)}
                </div>

                <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Dialog>
                    <DialogTrigger asChild>
                      <button className="text-muted-foreground hover:text-white transition-colors" title="Add to Playlist">
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

                  <button onClick={() => handleRemoveFavorite(track.id)} className="text-primary hover:text-primary/80 transition-colors" title="Remove from Liked Songs">
                    <Heart className="w-4 h-4 fill-current" />
                  </button>
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
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
