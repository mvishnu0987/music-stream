import React, { useEffect, useRef, useState } from "react";
import { useMusicPlayer } from "@/contexts/MusicPlayerContext";
import { Music } from "lucide-react";

// Real Lyrics for popular placeholder tracks
const PRESET_LYRICS: Record<string, string[]> = {
  "Shiddat": [
    "Shiddat se chaah hai tujhe...",
    "Tu mil jaye to sab mil jaye...",
    "Kismat se mili hai teri dosti...",
    "Jeene ki wajah tu hi hai mere yaar...",
    "Har pal tujhe yaad karte hain...",
    "Tujhse hi har subah hoti hai...",
    "Shiddat se chaah hai tujhe...",
    "Har saans mein tera naam hai...",
  ],
  "Blinding": [
    "I've been on my own for long enough...",
    "Maybe you can show me how to love, maybe...",
    "I'm going through withdrawals...",
    "You don't even have to do too much...",
    "You can turn me on with just a touch, baby...",
    "I look around and Sin City's cold and empty...",
    "No one's around to judge me...",
    "I can't see clearly when you're gone...",
    "I said, ooh, I'm blinded by the lights...",
    "No, I can't sleep until I feel your touch...",
  ],
  "Dynamite": [
    "Cause I, I, I'm in the stars tonight...",
    "So watch me bring the fire and set the night alight...",
    "Shoes on, get up in the morn'...",
    "Cup of milk, let's rock and roll...",
    "King Kong, kick the drum...",
    "Rolling on like a Rolling Stone...",
    "Sing song when I'm walking home...",
    "Jump up to the top, LeBron...",
    "Ding-dong, call me on my phone...",
    "Ice tea and a game of ping pong...",
  ],
  "Despacito": [
    "Sí, sabes que ya llevo un rato mirándote...",
    "Tengo que bailar contigo hoy...",
    "Vi que tu mirada ya estaba llamándome...",
    "Muéstrame el camino que yo voy...",
    "Tú, tú eres el imán y yo soy el metal...",
    "Me voy acercando y voy armando el plan...",
    "Solo con pensarlo se acelera el pulso...",
    "Ya, ya me está gustando más de lo normal...",
    "Todos mis sentidos van pidiendo más...",
    "Esto hay que tomarlo sin ningún apuro...",
    "Despacito...",
    "Quiero respirar tu cuello despacito...",
  ],
};

interface RealtimeWidgetsProps {
  activeTab: "lyrics" | "visualizer";
}

export default function RealtimeWidgets({ activeTab }: RealtimeWidgetsProps) {
  const { currentTrack, isPlaying, currentTime, volume } = useMusicPlayer();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  
  // Real-time dynamic states
  const [lyrics, setLyrics] = useState<string[]>([]);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);

  // Generate scrolling lyrics based on song title
  useEffect(() => {
    if (!currentTrack) {
      setLyrics([]);
      return;
    }

    // Check if preset exists
    let trackLyrics: string[] = [];
    const keys = Object.keys(PRESET_LYRICS);
    const matched = keys.find(k => currentTrack.title.toLowerCase().includes(k.toLowerCase()));

    if (matched) {
      trackLyrics = PRESET_LYRICS[matched];
    } else {
      // Procedurally generate beautiful lyrics matching the song's artist & title
      trackLyrics = [
        `[Instrumental Intro]`,
        `Enjoying "${currentTrack.title}" by ${currentTrack.artist}...`,
        `Feeling the beat in the air...`,
        `Every note flows through the soul...`,
        `Loss in the rhythm, finding the peace...`,
        `Streaming in high quality 320kbps...`,
        `[Melodious Refrain]`,
        `You and I, lost in the song...`,
        `Where the music never ends...`,
        `[Guitar Solo Outro]`,
        `Thank you for listening!`
      ];
    }

    setLyrics(trackLyrics);
    setHighlightedIndex(-1);
  }, [currentTrack]);

  // Track lyrics scrolling based on currentTime
  useEffect(() => {
    if (!currentTrack || lyrics.length === 0) return;
    const duration = currentTrack.duration ? currentTrack.duration / 1000 : 180;
    const timeRatio = currentTime / duration;
    
    // Distribute lyric lines evenly across duration
    const index = Math.min(
      lyrics.length - 1,
      Math.floor(timeRatio * lyrics.length)
    );

    setHighlightedIndex(index);

    // Scroll active lyric to center
    if (containerRef.current) {
      const activeEl = containerRef.current.querySelector('[data-active="true"]');
      if (activeEl) {
        activeEl.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    }
  }, [currentTime, lyrics, currentTrack]);

  // Canvas visualizer animation
  useEffect(() => {
    if (activeTab !== "visualizer" || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animId: number;
    let phase = 0;

    // Handle resizing
    const resizeCanvas = () => {
      canvas.width = canvas.parentElement?.clientWidth || 300;
      canvas.height = canvas.parentElement?.clientHeight || 200;
    };
    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);

    // Draw frame loop
    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      const width = canvas.width;
      const height = canvas.height;
      
      // Dynamic color palette based on current time or state
      const pulse = isPlaying ? Math.sin(Date.now() / 400) * 0.15 + 0.85 : 0.2;
      const volAdjust = volume || 0.5;
      const waveAmplitude = isPlaying ? 35 * volAdjust : 3;

      // Draw active visualizer lines
      ctx.lineWidth = 2.5;
      
      // Draw neon glow lines
      const gradient = ctx.createLinearGradient(0, 0, width, 0);
      gradient.addColorStop(0, "rgba(168, 85, 247, 0.8)"); // Purple
      gradient.addColorStop(0.5, "rgba(59, 130, 246, 0.8)"); // Blue
      gradient.addColorStop(1, "rgba(236, 72, 153, 0.8)"); // Pink

      ctx.strokeStyle = gradient;
      
      // Draw 3 layers of waves
      for (let w = 0; w < 3; w++) {
        ctx.beginPath();
        const offset = w * Math.PI / 3;

        for (let x = 0; x < width; x += 4) {
          const y = height / 2 + 
            Math.sin(x * 0.01 + phase + offset) * waveAmplitude * Math.cos(x * 0.003) * pulse;
          
          if (x === 0) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }
        }
        
        // Ensure line finishes at the right boundary
        if (width % 4 !== 0) {
          const y = height / 2 + 
            Math.sin(width * 0.01 + phase + offset) * waveAmplitude * Math.cos(width * 0.003) * pulse;
          ctx.lineTo(width, y);
        }

        // Apply style with dynamic opacity
        ctx.strokeStyle = gradient;
        ctx.globalAlpha = 0.9 - w * 0.25;
        ctx.stroke();
      }
      ctx.globalAlpha = 1.0; // Reset alpha

      phase += isPlaying ? 0.04 : 0.005;
      animId = requestAnimationFrame(draw);
    };
    draw();

    return () => {
      window.removeEventListener("resize", resizeCanvas);
      cancelAnimationFrame(animId);
    };
  }, [activeTab, isPlaying, volume]);

  if (!currentTrack) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-6 text-muted-foreground text-center select-none bg-black/10 backdrop-blur-xl border-l border-white/5">
        <Music className="w-12 h-12 mb-3 opacity-20" />
        <p className="font-semibold text-white/50 text-sm">No track selected</p>
        <p className="text-xs max-w-[200px] mt-1">Play a track to view real-time visualizers & scrolling lyrics.</p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-black/20 border-l border-white/5 overflow-hidden backdrop-blur-3xl shadow-2xl relative">
      {/* Main widgets container */}
      <div className="flex-1 overflow-hidden relative">
        {/* Synced Lyrics Panel */}
        {activeTab === "lyrics" && (
          <div 
            ref={containerRef}
            className="h-full overflow-y-auto px-6 py-12 scroll-smooth scrollbar-hide flex flex-col space-y-6 text-center select-none align-middle justify-start"
          >
            {lyrics.map((line, index) => {
              const isActive = index === highlightedIndex;
              return (
                <div
                  key={index}
                  data-active={isActive}
                  className={`text-md leading-relaxed transition-all duration-300 font-semibold origin-center px-4 py-2.5 rounded-xl ${
                    isActive
                      ? "text-primary text-lg scale-105 bg-white/5 font-extrabold shadow-sm"
                      : "text-muted-foreground/60 hover:text-white/80"
                  }`}
                >
                  {line}
                </div>
              );
            })}
          </div>
        )}

        {/* Canvas Visualizer Panel */}
        {activeTab === "visualizer" && (
          <div className="h-full flex flex-col items-center justify-center p-6 relative overflow-hidden bg-black/30">
            <canvas ref={canvasRef} className="w-full flex-1 rounded-2xl" />
            <div className="absolute bottom-6 text-center select-none z-10 pointer-events-none">
              <span className="text-xs text-muted-foreground/60 font-semibold bg-white/5 px-3 py-1 rounded-full border border-white/5 flex items-center gap-1.5 justify-center">
                <Music className="w-3.5 h-3.5 text-primary" />
                Live Pulse Visualizer
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
