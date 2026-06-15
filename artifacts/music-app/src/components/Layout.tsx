import React, { useState } from "react";
import { Sidebar } from "./Sidebar";
import { PlayerBar } from "./PlayerBar";

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col h-[100dvh] w-full bg-background overflow-hidden text-foreground">
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-y-auto bg-gradient-to-b from-card/40 to-background pb-24">
          <div className="p-8">
            {children}
          </div>
        </main>
      </div>
      <div className="absolute bottom-0 left-0 right-0 z-50">
        <PlayerBar />
      </div>
    </div>
  );
}