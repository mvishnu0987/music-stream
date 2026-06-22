import React from "react";
import { useMusicPlayer } from "@/contexts/MusicPlayerContext";
import { Play, Pause, SkipBack, SkipForward, Shuffle, Repeat, Repeat1, Volume2, Heart, Download, Activity, FileText } from "lucide-react";
import { Slider } from "@/components/ui/slider";
import { useAddFavorite, useRemoveFavorite, useGetFavoriteIds, getGetFavoriteIdsQueryKey, getGetFavoritesQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";

function formatTime(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export function PlayerBar() {
  const { 
    currentTrack, isPlaying, currentTime, volume, 
    isShuffled, repeatMode, 
    resume, pause, next, prev, seek, setVolume, toggleShuffle, toggleRepeat,
    activeWidgetTab, isWidgetOpen, toggleWidget, setWidgetTab
  } = useMusicPlayer();

  const queryClient = useQueryClient();
  const { data: favoriteIds } = useGetFavoriteIds({ query: { queryKey: getGetFavoriteIdsQueryKey() } });
  const addFavorite = useAddFavorite();
  const removeFavorite = useRemoveFavorite();

  if (!currentTrack) return null;

  const duration = currentTrack.duration ? Math.floor(currentTrack.duration / 1000) : 0;
  const isFav = favoriteIds?.includes(currentTrack.id) ?? false;

  const handleFavoriteClick = () => {
    if (isFav) {
      removeFavorite.mutate(
        { trackId: currentTrack.id },
        {
          onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: getGetFavoriteIdsQueryKey() });
            queryClient.invalidateQueries({ queryKey: getGetFavoritesQueryKey() });
          }
        }
      );
    } else {
      addFavorite.mutate(
        { 
          data: { 
            trackId: currentTrack.id, 
            title: currentTrack.title, 
            artist: currentTrack.artist, 
            album: currentTrack.album, 
            duration: currentTrack.duration, 
            previewUrl: currentTrack.previewUrl, 
            artworkUrl: currentTrack.artworkUrl, 
            genre: currentTrack.genre, 
            releaseYear: currentTrack.releaseYear 
          } 
        },
        {
          onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: getGetFavoriteIdsQueryKey() });
            queryClient.invalidateQueries({ queryKey: getGetFavoritesQueryKey() });
          }
        }
      );
    }
  };

  const handleDownload = async () => {
    if (!currentTrack.previewUrl) return;
    try {
      const response = await fetch(currentTrack.previewUrl);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${currentTrack.artist} - ${currentTrack.title}.mp3`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Failed to download track", err);
    }
  };

  return (
    <div className="h-20 md:h-24 bg-card border-t border-border flex items-center justify-between px-4 w-full shrink-0 z-50 relative">
      {/* Mobile Progress Bar (active tracking) */}
      <div className="absolute top-0 left-0 right-0 h-0.5 bg-white/10 md:hidden overflow-hidden">
        <div 
          className="h-full bg-primary transition-all duration-300"
          style={{ width: `${duration > 0 ? (currentTime / duration) * 100 : 0}%` }}
        />
      </div>

      <div className="flex items-center w-full md:w-[25%] min-w-0 md:min-w-[180px]">
        <img src={currentTrack.artworkUrl} alt={currentTrack.title} className="w-12 h-12 md:w-14 md:h-14 rounded shadow-md object-cover mr-3 md:mr-4 shrink-0" />
        <div className="flex flex-col overflow-hidden mr-3 min-w-0 flex-1">
          <span className="text-sm text-white font-medium truncate">{currentTrack.title}</span>
          <span className="text-xs text-muted-foreground truncate">{currentTrack.artist}</span>
        </div>
        <button 
          onClick={handleFavoriteClick}
          className={`transition-colors shrink-0 mr-3 md:mr-0 ${isFav ? 'text-primary fill-current' : 'text-muted-foreground hover:text-white'}`}
        >
          <Heart className={`w-4 h-4 ${isFav ? 'fill-current' : ''}`} />
        </button>

        {/* Mobile Play/Pause and Next controls */}
        <div className="flex md:hidden items-center gap-3 shrink-0 ml-auto">
          <button onClick={isPlaying ? pause : resume} className="w-9 h-9 rounded-full bg-white text-black flex items-center justify-center transition-transform hover:scale-105 active:scale-95">
            {isPlaying ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current ml-0.5" />}
          </button>
          <button onClick={next} className="text-muted-foreground hover:text-white transition-colors p-1">
            <SkipForward className="w-5 h-5 fill-current" />
          </button>
        </div>
      </div>

      <div className="hidden md:flex flex-col items-center max-w-[40%] w-full">
        <div className="flex items-center gap-6 mb-2">
          <button onClick={toggleShuffle} className={`transition-colors ${isShuffled ? 'text-primary' : 'text-muted-foreground hover:text-white'}`}>
            <Shuffle className="w-4 h-4" />
          </button>
          <button onClick={prev} className="text-muted-foreground hover:text-white transition-colors">
            <SkipBack className="w-5 h-5 fill-current" />
          </button>
          <button onClick={isPlaying ? pause : resume} className="w-8 h-8 rounded-full bg-white text-black flex items-center justify-center hover:scale-105 transition-transform">
            {isPlaying ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current ml-0.5" />}
          </button>
          <button onClick={next} className="text-muted-foreground hover:text-white transition-colors">
            <SkipForward className="w-5 h-5 fill-current" />
          </button>
          <button onClick={toggleRepeat} className={`transition-colors ${repeatMode !== 'none' ? 'text-primary' : 'text-muted-foreground hover:text-white'}`}>
            {repeatMode === 'one' ? <Repeat1 className="w-4 h-4" /> : <Repeat className="w-4 h-4" />}
          </button>
        </div>
        
        <div className="flex items-center w-full gap-2 text-xs text-muted-foreground">
          <span>{formatTime(currentTime)}</span>
          <Slider 
            value={[currentTime]} 
            max={duration} 
            step={1} 
            className="w-full" 
            onValueChange={(val) => seek(val[0])}
          />
          <span>{formatTime(duration)}</span>
        </div>
      </div>

      <div className="hidden md:flex items-center w-[40%] justify-end gap-4 min-w-[220px]">
        {/* Toggle Real-time Widgets */}
        <div className="flex items-center gap-1 border-r border-white/10 pr-3">
          <button 
            onClick={() => {
              if (isWidgetOpen && activeWidgetTab === "visualizer") {
                toggleWidget();
              } else {
                if (!isWidgetOpen) toggleWidget();
                setWidgetTab("visualizer");
              }
            }}
            className={`p-2 rounded-lg transition-colors hover:bg-white/5 ${isWidgetOpen && activeWidgetTab === "visualizer" ? 'text-primary' : 'text-muted-foreground hover:text-white'}`}
            title="Live Visualizer"
          >
            <Activity className="w-4 h-4" />
          </button>
          
          <button 
            onClick={() => {
              if (isWidgetOpen && activeWidgetTab === "lyrics") {
                toggleWidget();
              } else {
                if (!isWidgetOpen) toggleWidget();
                setWidgetTab("lyrics");
              }
            }}
            className={`p-2 rounded-lg transition-colors hover:bg-white/5 ${isWidgetOpen && activeWidgetTab === "lyrics" ? 'text-primary' : 'text-muted-foreground hover:text-white'}`}
            title="Lyrics"
          >
            <FileText className="w-4 h-4" />
          </button>
        </div>

        {currentTrack.previewUrl && (
          <button onClick={handleDownload} className="text-muted-foreground hover:text-white transition-colors" title="Download Song">
            <Download className="w-4 h-4" />
          </button>
        )}
        <Volume2 className="w-4 h-4 text-muted-foreground" />
        <div className="w-24">
          <Slider 
            value={[volume * 100]} 
            max={100} 
            step={1} 
            onValueChange={(val) => setVolume(val[0] / 100)} 
          />
        </div>
      </div>
    </div>
  );
}