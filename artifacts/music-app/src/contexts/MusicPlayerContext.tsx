import React, { createContext, useContext, useRef, useState, useEffect, useCallback } from "react";
import type { Track } from "@workspace/api-client-react";

interface MusicPlayerContextType {
  currentTrack: Track | null;
  queue: Track[];
  isPlaying: boolean;
  currentIndex: number;
  isShuffled: boolean;
  repeatMode: "none" | "one" | "all";
  currentTime: number;
  play: (track: Track, newQueue?: Track[], forceShuffle?: boolean) => void;
  pause: () => void;
  resume: () => void;
  next: () => void;
  prev: () => void;
  toggleShuffle: () => void;
  setIsShuffled: (value: boolean) => void;
  toggleRepeat: () => void;
  addToQueue: (track: Track) => void;
  seek: (time: number) => void;
  setVolume: (volume: number) => void;
  volume: number;
  activeWidgetTab: "lyrics" | "visualizer";
  isWidgetOpen: boolean;
  toggleWidget: () => void;
  setWidgetTab: (tab: "lyrics" | "visualizer") => void;
}

const MusicPlayerContext = createContext<MusicPlayerContextType | null>(null);

export function MusicPlayerProvider({ children }: { children: React.ReactNode }) {
  const [currentTrack, setCurrentTrack] = useState<Track | null>(null);
  const [queue, setQueue] = useState<Track[]>([]);
  const [originalQueue, setOriginalQueue] = useState<Track[]>([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(-1);
  const [isShuffled, setIsShuffled] = useState(false);
  const [repeatMode, setRepeatMode] = useState<"none" | "one" | "all">("none");
  const [currentTime, setCurrentTime] = useState(0);
  const [volume, setVolumeState] = useState(1);
  const [activeWidgetTab, setWidgetTab] = useState<"lyrics" | "visualizer">("visualizer");
  const [isWidgetOpen, setIsWidgetOpen] = useState(false);

  const toggleWidget = useCallback(() => setIsWidgetOpen(prev => !prev), []);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const nextRef = useRef<() => void>(() => {});

  useEffect(() => {
    if (!audioRef.current) {
      audioRef.current = new Audio();
      audioRef.current.volume = volume;
    }

    const audio = audioRef.current;

    const handleTimeUpdate = () => setCurrentTime(audio.currentTime);
    const handleEnded = () => {
      if (repeatMode === "one") {
        audio.currentTime = 0;
        audio.play().catch(console.error);
      } else {
        nextRef.current();
      }
    };
    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);

    audio.addEventListener("timeupdate", handleTimeUpdate);
    audio.addEventListener("ended", handleEnded);
    audio.addEventListener("play", handlePlay);
    audio.addEventListener("pause", handlePause);

    return () => {
      audio.removeEventListener("timeupdate", handleTimeUpdate);
      audio.removeEventListener("ended", handleEnded);
      audio.removeEventListener("play", handlePlay);
      audio.removeEventListener("pause", handlePause);
    };
  }, [repeatMode]);

  const play = useCallback((track: Track, newQueue?: Track[], forceShuffle?: boolean) => {
    const shouldShuffle = forceShuffle !== undefined ? forceShuffle : isShuffled;
    if (newQueue) {
      setOriginalQueue(newQueue);
      if (shouldShuffle) {
        const shuffled = [...newQueue].sort(() => Math.random() - 0.5);
        setQueue(shuffled);
        setCurrentIndex(shuffled.findIndex(t => t.id === track.id));
      } else {
        setQueue(newQueue);
        setCurrentIndex(newQueue.findIndex(t => t.id === track.id));
      }
    } else if (queue.length === 0) {
      setQueue([track]);
      setOriginalQueue([track]);
      setCurrentIndex(0);
    }
    
    setCurrentTrack(track);
    if (audioRef.current && track.previewUrl) {
      audioRef.current.src = track.previewUrl;
      audioRef.current.play().catch(console.error);
    }
  }, [queue, isShuffled]);

  const pause = useCallback(() => {
    audioRef.current?.pause();
  }, []);

  const resume = useCallback(() => {
    if (currentTrack?.previewUrl) {
      audioRef.current?.play().catch(console.error);
    }
  }, [currentTrack]);

  const next = useCallback(() => {
    if (queue.length === 0) return;
    
    if (currentIndex < queue.length - 1) {
      const nextTrack = queue[currentIndex + 1];
      setCurrentIndex(currentIndex + 1);
      setCurrentTrack(nextTrack);
      if (audioRef.current && nextTrack.previewUrl) {
        audioRef.current.src = nextTrack.previewUrl;
        audioRef.current.play().catch(console.error);
      }
    } else if (repeatMode === "all") {
      setCurrentIndex(0);
      setCurrentTrack(queue[0]);
      if (audioRef.current && queue[0].previewUrl) {
        audioRef.current.src = queue[0].previewUrl;
        audioRef.current.play().catch(console.error);
      }
    } else {
      pause();
      setCurrentTime(0);
      if (audioRef.current) audioRef.current.currentTime = 0;
    }
  }, [queue, currentIndex, repeatMode, pause]);

  useEffect(() => {
    nextRef.current = next;
  }, [next]);

  const prev = useCallback(() => {
    if (queue.length === 0) return;

    if (currentTime > 3 || currentIndex === 0) {
      if (audioRef.current) audioRef.current.currentTime = 0;
    } else {
      const prevTrack = queue[currentIndex - 1];
      setCurrentIndex(currentIndex - 1);
      setCurrentTrack(prevTrack);
      if (audioRef.current && prevTrack.previewUrl) {
        audioRef.current.src = prevTrack.previewUrl;
        audioRef.current.play().catch(console.error);
      }
    }
  }, [queue, currentIndex, currentTime]);

  const toggleShuffle = useCallback(() => {
    setIsShuffled(prev => {
      const nextShuffled = !prev;
      if (nextShuffled) {
        const shuffled = [...queue].sort(() => Math.random() - 0.5);
        setQueue(shuffled);
        if (currentTrack) {
          setCurrentIndex(shuffled.findIndex(t => t.id === currentTrack.id));
        }
      } else {
        setQueue(originalQueue);
        if (currentTrack) {
          setCurrentIndex(originalQueue.findIndex(t => t.id === currentTrack.id));
        }
      }
      return nextShuffled;
    });
  }, [queue, originalQueue, currentTrack]);

  const toggleRepeat = useCallback(() => {
    setRepeatMode(prev => prev === "none" ? "all" : prev === "all" ? "one" : "none");
  }, []);

  const addToQueue = useCallback((track: Track) => {
    setQueue(prev => [...prev, track]);
    setOriginalQueue(prev => [...prev, track]);
  }, []);

  const seek = useCallback((time: number) => {
    if (audioRef.current) {
      audioRef.current.currentTime = time;
      setCurrentTime(time);
    }
  }, []);

  const setVolume = useCallback((newVolume: number) => {
    if (audioRef.current) {
      audioRef.current.volume = newVolume;
    }
    setVolumeState(newVolume);
  }, []);

  // Media Session API Integration for Mobile Background Playback and Controls
  useEffect(() => {
    if (typeof window === "undefined" || !("mediaSession" in navigator) || typeof MediaMetadata === "undefined" || !currentTrack) return;

    try {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: currentTrack.title,
        artist: currentTrack.artist,
        album: currentTrack.album || "Melodify",
        artwork: currentTrack.artworkUrl ? [
          { src: currentTrack.artworkUrl, sizes: "500x500", type: "image/jpeg" }
        ] : []
      });
    } catch (e) {
      console.error("Failed to set media session metadata", e);
    }
  }, [currentTrack]);

  useEffect(() => {
    if (typeof window === "undefined" || !("mediaSession" in navigator)) return;
    navigator.mediaSession.playbackState = isPlaying ? "playing" : "paused";
  }, [isPlaying]);

  useEffect(() => {
    if (typeof window === "undefined" || !("mediaSession" in navigator)) return;

    try {
      navigator.mediaSession.setActionHandler("play", resume);
      navigator.mediaSession.setActionHandler("pause", pause);
      navigator.mediaSession.setActionHandler("previoustrack", prev);
      navigator.mediaSession.setActionHandler("nexttrack", next);
    } catch (e) {
      console.error("Failed to set media session action handlers", e);
    }

    return () => {
      try {
        navigator.mediaSession.setActionHandler("play", null);
        navigator.mediaSession.setActionHandler("pause", null);
        navigator.mediaSession.setActionHandler("previoustrack", null);
        navigator.mediaSession.setActionHandler("nexttrack", null);
      } catch (e) {
        // ignore
      }
    };
  }, [resume, pause, prev, next]);

  return (
    <MusicPlayerContext.Provider
      value={{
        currentTrack,
        queue,
        isPlaying,
        currentIndex,
        isShuffled,
        repeatMode,
        currentTime,
        play,
        pause,
        resume,
        next,
        prev,
        toggleShuffle,
        setIsShuffled,
        toggleRepeat,
        addToQueue,
        seek,
        setVolume,
        volume,
        activeWidgetTab,
        isWidgetOpen,
        toggleWidget,
        setWidgetTab,
      }}
    >
      {children}
    </MusicPlayerContext.Provider>
  );
}

export function useMusicPlayer() {
  const context = useContext(MusicPlayerContext);
  if (!context) throw new Error("useMusicPlayer must be used within MusicPlayerProvider");
  return context;
}