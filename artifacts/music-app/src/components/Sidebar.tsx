import React from "react";
import { Link, useLocation } from "wouter";
import { Home, Search, Library, Plus, Heart } from "lucide-react";
import { useGetPlaylists, useCreatePlaylist, getGetPlaylistsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";

export function Sidebar() {
  const [location] = useLocation();
  const { data: playlists } = useGetPlaylists();
  const createPlaylist = useCreatePlaylist();
  const queryClient = useQueryClient();

  const handleCreatePlaylist = () => {
    createPlaylist.mutate(
      { data: { name: `My Playlist #${(playlists?.length || 0) + 1}` } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getGetPlaylistsQueryKey() });
        }
      }
    );
  };

  return (
    <div className="w-64 bg-black flex flex-col h-full shrink-0 border-r border-border">
      <div className="p-6">
        <h1 className="text-2xl font-bold text-primary mb-8 tracking-tighter">Melodify</h1>
        
        <nav className="space-y-4">
          <Link href="/" className={`flex items-center gap-4 font-medium transition-colors hover:text-white ${location === '/' ? 'text-white' : 'text-muted-foreground'}`}>
            <Home className="w-6 h-6" /> Home
          </Link>
          <Link href="/search" className={`flex items-center gap-4 font-medium transition-colors hover:text-white ${location === '/search' ? 'text-white' : 'text-muted-foreground'}`}>
            <Search className="w-6 h-6" /> Search
          </Link>
          <Link href="/playlists" className={`flex items-center gap-4 font-medium transition-colors hover:text-white ${location === '/playlists' ? 'text-white' : 'text-muted-foreground'}`}>
            <Library className="w-6 h-6" /> Your Library
          </Link>
          <Link href="/liked-songs" className={`flex items-center gap-4 font-medium transition-colors hover:text-white ${location === '/liked-songs' ? 'text-white' : 'text-muted-foreground'}`}>
            <Heart className="w-6 h-6" /> Liked Songs
          </Link>
        </nav>
      </div>

      <div className="px-6 py-4 flex-1 overflow-y-auto">
        <div className="flex items-center justify-between mb-4 text-muted-foreground">
          <span className="text-xs font-bold uppercase tracking-wider">Playlists</span>
          <button onClick={handleCreatePlaylist} className="hover:text-white transition-colors" data-testid="button-create-playlist">
            <Plus className="w-4 h-4" />
          </button>
        </div>
        
        <div className="space-y-3">
          {playlists?.map((playlist) => (
            <Link key={playlist.id} href={`/playlist/${playlist.id}`} className="block text-sm text-muted-foreground hover:text-white truncate transition-colors" data-testid={`link-playlist-${playlist.id}`}>
              {playlist.name}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}