import React from "react";
import { useMusicPlayer } from "@/contexts/MusicPlayerContext";
import { Play, Pause, SkipBack, SkipForward, Shuffle, Repeat, Repeat1, Volume2, Heart, Download } from "lucide-react";
import { Slider } from "@/components/ui/slider";

function formatTime(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export function PlayerBar() {
  const { 
    currentTrack, isPlaying, currentTime, volume, 
    isShuffled, repeatMode, 
    resume, pause, next, prev, seek, setVolume, toggleShuffle, toggleRepeat 
  } = useMusicPlayer();

  if (!currentTrack) return null;

  const duration = 30; // Previews are generally 30 seconds

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
    <div className="h-24 bg-card border-t border-border flex items-center justify-between px-4 w-full shrink-0 z-50">
      <div className="flex items-center w-[30%] min-w-[180px]">
        <img src={currentTrack.artworkUrl} alt={currentTrack.title} className="w-14 h-14 rounded shadow-md object-cover mr-4" />
        <div className="flex flex-col overflow-hidden mr-4">
          <span className="text-sm text-white font-medium truncate">{currentTrack.title}</span>
          <span className="text-xs text-muted-foreground truncate">{currentTrack.artist}</span>
        </div>
        <button className="text-muted-foreground hover:text-white transition-colors">
          <Heart className="w-4 h-4" />
        </button>
      </div>

      <div className="flex flex-col items-center max-w-[40%] w-full">
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

      <div className="flex items-center w-[30%] justify-end gap-4 min-w-[180px]">
        {currentTrack.previewUrl && (
          <button onClick={handleDownload} className="text-muted-foreground hover:text-white transition-colors" title="Download Preview">
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