import React from "react";
import { Sidebar } from "./Sidebar";
import { PlayerBar } from "./PlayerBar";
import RealtimeWidgets from "./RealtimeWidgets";
import { useMusicPlayer } from "@/contexts/MusicPlayerContext";

export function Layout({ children }: { children: React.ReactNode }) {
  const { isWidgetOpen, activeWidgetTab } = useMusicPlayer();

  return (
    <div className="flex flex-col h-[100dvh] w-full bg-background overflow-hidden text-foreground">
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-y-auto bg-gradient-to-b from-card/40 to-background pb-24">
          <div className="p-8">
            {children}
          </div>
        </main>
        {isWidgetOpen && (
          <aside className="w-80 h-full hidden lg:block shrink-0 animate-in slide-in-from-right duration-300 pb-24 z-40">
            <RealtimeWidgets activeTab={activeWidgetTab} />
          </aside>
        )}
      </div>
      <div className="absolute bottom-0 left-0 right-0 z-50">
        <PlayerBar />
      </div>
    </div>
  );
}