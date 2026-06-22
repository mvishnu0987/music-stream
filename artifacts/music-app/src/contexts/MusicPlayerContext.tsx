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
  const [currentTrack, setCurrentTrackState] = useState<Track | null>(null);
  const [queue, setQueueState] = useState<Track[]>([]);
  const [originalQueue, setOriginalQueueState] = useState<Track[]>([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentIndex, setCurrentIndexState] = useState(-1);
  const [isShuffled, setIsShuffledState] = useState(false);
  const [repeatMode, setRepeatModeState] = useState<"none" | "one" | "all">("none");
  const [currentTime, setCurrentTime] = useState(0);
  const [volume, setVolumeState] = useState(1);
  const [activeWidgetTab, setWidgetTab] = useState<"lyrics" | "visualizer">("visualizer");
  const [isWidgetOpen, setIsWidgetOpen] = useState(false);

  const toggleWidget = useCallback(() => setIsWidgetOpen(prev => !prev), []);

  const currentTrackRef = useRef<Track | null>(null);
  const queueRef = useRef<Track[]>([]);
  const originalQueueRef = useRef<Track[]>([]);
  const currentIndexRef = useRef<number>(-1);
  const isShuffledRef = useRef<boolean>(false);
  const repeatModeRef = useRef<"none" | "one" | "all">("none");

  const setCurrentTrack = useCallback((track: Track | null) => {
    setCurrentTrackState(track);
    currentTrackRef.current = track;
  }, []);

  const setQueue = useCallback((newQueue: Track[]) => {
    setQueueState(newQueue);
    queueRef.current = newQueue;
  }, []);

  const setOriginalQueue = useCallback((newOrigQueue: Track[]) => {
    setOriginalQueueState(newOrigQueue);
    originalQueueRef.current = newOrigQueue;
  }, []);

  const setCurrentIndex = useCallback((index: number) => {
    setCurrentIndexState(index);
    currentIndexRef.current = index;
  }, []);

  const setIsShuffled = useCallback((value: boolean) => {
    setIsShuffledState(value);
    isShuffledRef.current = value;
  }, []);

  const setRepeatMode = useCallback((mode: "none" | "one" | "all") => {
    setRepeatModeState(mode);
    repeatModeRef.current = mode;
  }, []);

  const audioRef = useRef<HTMLAudioElement | null>(null);

  const pause = useCallback(() => {
    audioRef.current?.pause();
  }, []);

  const next = useCallback(() => {
    const q = queueRef.current;
    const idx = currentIndexRef.current;
    const rep = repeatModeRef.current;

    if (q.length === 0) return;
    
    if (idx < q.length - 1) {
      const nextTrack = q[idx + 1];
      setCurrentIndex(idx + 1);
      setCurrentTrack(nextTrack);
      if (audioRef.current && nextTrack.previewUrl) {
        audioRef.current.src = nextTrack.previewUrl;
        audioRef.current.play().catch(console.error);
      }
    } else if (rep === "all") {
      setCurrentIndex(0);
      setCurrentTrack(q[0]);
      if (audioRef.current && q[0].previewUrl) {
        audioRef.current.src = q[0].previewUrl;
        audioRef.current.play().catch(console.error);
      }
    } else {
      pause();
      setCurrentTime(0);
      if (audioRef.current) audioRef.current.currentTime = 0;
    }
  }, [pause, setCurrentIndex, setCurrentTrack]);

  const prev = useCallback(() => {
    const q = queueRef.current;
    const idx = currentIndexRef.current;
    const currentAudioTime = audioRef.current ? audioRef.current.currentTime : 0;

    if (q.length === 0) return;

    if (currentAudioTime > 3 || idx === 0) {
      if (audioRef.current) audioRef.current.currentTime = 0;
    } else {
      const prevTrack = q[idx - 1];
      setCurrentIndex(idx - 1);
      setCurrentTrack(prevTrack);
      if (audioRef.current && prevTrack.previewUrl) {
        audioRef.current.src = prevTrack.previewUrl;
        audioRef.current.play().catch(console.error);
      }
    }
  }, [setCurrentIndex, setCurrentTrack]);

  useEffect(() => {
    if (!audioRef.current) {
      audioRef.current = new Audio();
      audioRef.current.volume = volume;
    }

    const audio = audioRef.current;

    const handleTimeUpdate = () => setCurrentTime(audio.currentTime);
    const handleEnded = () => {
      if (repeatModeRef.current === "one") {
        audio.currentTime = 0;
        audio.play().catch(console.error);
      } else {
        next();
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
  }, [next]);

  const play = useCallback((track: Track, newQueue?: Track[], forceShuffle?: boolean) => {
    const shouldShuffle = forceShuffle !== undefined ? forceShuffle : isShuffledRef.current;
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
    } else if (queueRef.current.length === 0) {
      setQueue([track]);
      setOriginalQueue([track]);
      setCurrentIndex(0);
    }
    
    setCurrentTrack(track);
    if (audioRef.current && track.previewUrl) {
      audioRef.current.src = track.previewUrl;
      audioRef.current.play().catch(console.error);
    }
  }, [setQueue, setOriginalQueue, setCurrentIndex, setCurrentTrack]);

  const resume = useCallback(() => {
    if (currentTrackRef.current?.previewUrl) {
      audioRef.current?.play().catch(console.error);
    }
  }, []);

  const toggleShuffle = useCallback(() => {
    const nextShuffled = !isShuffledRef.current;
    setIsShuffled(nextShuffled);
    const q = queueRef.current;
    const origQ = originalQueueRef.current;
    const curr = currentTrackRef.current;

    if (nextShuffled) {
      const shuffled = [...q].sort(() => Math.random() - 0.5);
      setQueue(shuffled);
      if (curr) {
        setCurrentIndex(shuffled.findIndex(t => t.id === curr.id));
      }
    } else {
      setQueue(origQ);
      if (curr) {
        setCurrentIndex(origQ.findIndex(t => t.id === curr.id));
      }
    }
  }, [setIsShuffled, setQueue, setCurrentIndex]);

  const toggleRepeat = useCallback(() => {
    const cur = repeatModeRef.current;
    const nextMode = cur === "none" ? "all" : cur === "all" ? "one" : "none";
    setRepeatMode(nextMode);
  }, [setRepeatMode]);

  const addToQueue = useCallback((track: Track) => {
    setQueue([...queueRef.current, track]);
    setOriginalQueue([...originalQueueRef.current, track]);
  }, [setQueue, setOriginalQueue]);

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