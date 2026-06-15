import React, { useState } from "react";
import { useRoute } from "wouter";
import { useGetPlaylist, useRemoveTrackFromPlaylist, useUpdatePlaylist, getGetPlaylistQueryKey } from "@workspace/api-client-react";
import { useMusicPlayer } from "@/contexts/MusicPlayerContext";
import { Play, Shuffle, Trash2, Edit2, Download, Clock } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

function formatDuration(ms: number) {
  const seconds = Math.floor(ms / 1000);
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export default function PlaylistDetail() {
  const [, params] = useRoute("/playlist/:id");
  const playlistId = Number(params?.id);
  
  const { data: playlist, isLoading } = useGetPlaylist(playlistId, { query: { enabled: !!playlistId } });
  const { play, toggleShuffle, isShuffled } = useMusicPlayer();
  const removeTrack = useRemoveTrackFromPlaylist();
  const updatePlaylist = useUpdatePlaylist();
  const queryClient = useQueryClient();

  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState("");

  if (isLoading) return <div className="text-muted-foreground">Loading playlist...</div>;
  if (!playlist) return <div className="text-muted-foreground">Playlist not found.</div>;

  const handlePlayAll = () => {
    if (playlist.tracks.length > 0) {
      if (isShuffled) toggleShuffle(); // ensure sequential play
      play(playlist.tracks[0], playlist.tracks);
    }
  };

  const handleShuffleAll = () => {
    if (playlist.tracks.length > 0) {
      if (!isShuffled) toggleShuffle(); // ensure shuffle mode
      const randomTrack = playlist.tracks[Math.floor(Math.random() * playlist.tracks.length)];
      play(randomTrack, playlist.tracks);
    }
  };

  const handleRemoveTrack = (trackId: string) => {
    removeTrack.mutate(
      { playlistId, trackId },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getGetPlaylistQueryKey(playlistId) });
        }
      }
    );
  };

  const handleSaveName = () => {
    if (!editName.trim() || editName === playlist.name) {
      setIsEditing(false);
      return;
    }
    updatePlaylist.mutate(
      { playlistId, data: { name: editName } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getGetPlaylistQueryKey(playlistId) });
          setIsEditing(false);
        }
      }
    );
  };

  const startEditing = () => {
    setEditName(playlist.name);
    setIsEditing(true);
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-end gap-6 mb-8 pt-8">
        <div className="w-48 h-48 sm:w-56 sm:h-56 bg-white/10 shadow-2xl rounded-md overflow-hidden shrink-0 flex items-center justify-center">
          {playlist.coverArt ? (
            <img src={playlist.coverArt} alt={playlist.name} className="w-full h-full object-cover" />
          ) : playlist.tracks[0]?.artworkUrl ? (
            <img src={playlist.tracks[0].artworkUrl} alt="Playlist Cover" className="w-full h-full object-cover" />
          ) : (
            <div className="text-white/20 font-bold text-4xl">M</div>
          )}
        </div>
        <div className="flex flex-col gap-2">
          <span className="text-xs font-bold uppercase tracking-wider text-white/70">Playlist</span>
          
          {isEditing ? (
            <div className="flex items-center gap-2">
              <Input 
                value={editName}
                onChange={e => setEditName(e.target.value)}
                className="text-4xl font-black bg-transparent border-b border-primary rounded-none px-0 h-auto focus-visible:ring-0 max-w-sm"
                autoFocus
                onKeyDown={e => e.key === 'Enter' && handleSaveName()}
                onBlur={handleSaveName}
              />
            </div>
          ) : (
            <h1 
              className="text-4xl sm:text-6xl font-black tracking-tighter text-white group cursor-pointer flex items-center gap-3"
              onClick={startEditing}
            >
              {playlist.name}
              <Edit2 className="w-6 h-6 opacity-0 group-hover:opacity-100 transition-opacity text-white/50" />
            </h1>
          )}
          
          <div className="text-sm text-white/70 mt-2 font-medium">
            {playlist.tracks.length} {playlist.tracks.length === 1 ? 'song' : 'songs'}
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-4 py-4">
        <button 
          onClick={handlePlayAll}
          className="w-14 h-14 bg-primary text-primary-foreground rounded-full flex items-center justify-center hover:scale-105 transition-transform shadow-lg hover:bg-primary/90"
          disabled={playlist.tracks.length === 0}
        >
          <Play className="w-6 h-6 fill-current ml-1" />
        </button>
        <button 
          onClick={handleShuffleAll}
          className="w-10 h-10 text-muted-foreground hover:text-white transition-colors"
          disabled={playlist.tracks.length === 0}
        >
          <Shuffle className="w-6 h-6" />
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

        {playlist.tracks.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            This playlist is empty. Go find some tracks to add!
          </div>
        ) : (
          <div className="space-y-1">
            {playlist.tracks.map((track, i) => (
              <div key={`${track.id}-${i}`} className="grid grid-cols-[16px_1fr_minmax(120px,200px)_minmax(120px,200px)_40px_40px] gap-4 px-4 py-2 hover:bg-white/5 rounded-md group items-center transition-colors">
                <div className="text-right text-muted-foreground text-sm group-hover:hidden">{i + 1}</div>
                <button 
                  onClick={() => play(track, playlist.tracks)} 
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

                <div className="hidden md:block text-muted-foreground text-sm truncate">{track.album}</div>
                <div className="hidden lg:block text-muted-foreground text-sm truncate">{track.genre || '-'}</div>
                
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
                      });
                    }} className="text-muted-foreground hover:text-white" title="Download">
                      <Download className="w-4 h-4" />
                    </button>
                  )}
                  <button onClick={() => handleRemoveTrack(track.id)} className="text-muted-foreground hover:text-destructive transition-colors" title="Remove from playlist">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}