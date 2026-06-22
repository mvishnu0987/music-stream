import React from "react";
import { Sidebar } from "./Sidebar";
import { PlayerBar } from "./PlayerBar";
import RealtimeWidgets from "./RealtimeWidgets";
import { useMusicPlayer } from "@/contexts/MusicPlayerContext";
import { Link, useLocation } from "wouter";
import { Home, Search, Library, Heart } from "lucide-react";

export function Layout({ children }: { children: React.ReactNode }) {
  const { isWidgetOpen, activeWidgetTab } = useMusicPlayer();
  const [location] = useLocation();

  return (
    <div className="flex flex-col h-[100dvh] w-full bg-background overflow-hidden text-foreground">
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-y-auto bg-gradient-to-b from-card/40 to-background pb-36 md:pb-24">
          <div className="p-4 sm:p-8">
            {children}
          </div>
        </main>
        {isWidgetOpen && (
          <aside className="w-80 h-full hidden lg:block shrink-0 animate-in slide-in-from-right duration-300 pb-24 z-40">
            <RealtimeWidgets activeTab={activeWidgetTab} />
          </aside>
        )}
      </div>
      
      {/* Player Bar: bottom-16 on mobile to float above Bottom Navigation */}
      <div className="absolute bottom-16 md:bottom-0 left-0 right-0 z-50">
        <PlayerBar />
      </div>

      {/* Mobile Bottom Navigation Bar */}
      <nav className="fixed bottom-0 left-0 right-0 h-16 bg-card border-t border-border flex items-center justify-around z-50 md:hidden px-4">
        <Link href="/" className={`flex flex-col items-center justify-center gap-1 text-[10px] transition-colors ${location === '/' ? 'text-primary font-bold' : 'text-muted-foreground hover:text-white'}`}>
          <Home className="w-5 h-5" />
          <span>Home</span>
        </Link>
        <Link href="/search" className={`flex flex-col items-center justify-center gap-1 text-[10px] transition-colors ${location === '/search' ? 'text-primary font-bold' : 'text-muted-foreground hover:text-white'}`}>
          <Search className="w-5 h-5" />
          <span>Search</span>
        </Link>
        <Link href="/playlists" className={`flex flex-col items-center justify-center gap-1 text-[10px] transition-colors ${location.startsWith('/playlists') || location.startsWith('/playlist/') ? 'text-primary font-bold' : 'text-muted-foreground hover:text-white'}`}>
          <Library className="w-5 h-5" />
          <span>Library</span>
        </Link>
        <Link href="/liked-songs" className={`flex flex-col items-center justify-center gap-1 text-[10px] transition-colors ${location === '/liked-songs' ? 'text-primary font-bold' : 'text-muted-foreground hover:text-white'}`}>
          <Heart className="w-5 h-5" />
          <span>Liked</span>
        </Link>
      </nav>
    </div>
  );
}