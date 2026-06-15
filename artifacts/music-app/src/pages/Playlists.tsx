import React, { useState } from "react";
import { Link } from "wouter";
import { useGetPlaylists, useCreatePlaylist, useDeletePlaylist, getGetPlaylistsQueryKey } from "@workspace/api-client-react";
import { Plus, Trash2, Library } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default function Playlists() {
  const { data: playlists, isLoading } = useGetPlaylists();
  const createPlaylist = useCreatePlaylist();
  const deletePlaylist = useDeletePlaylist();
  const queryClient = useQueryClient();
  
  const [newPlaylistName, setNewPlaylistName] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const handleCreate = () => {
    if (!newPlaylistName.trim()) return;
    createPlaylist.mutate(
      { data: { name: newPlaylistName } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getGetPlaylistsQueryKey() });
          setNewPlaylistName("");
          setIsDialogOpen(false);
        }
      }
    );
  };

  const handleDelete = (e: React.MouseEvent, id: number) => {
    e.preventDefault();
    deletePlaylist.mutate(
      { playlistId: id },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getGetPlaylistsQueryKey() });
        }
      }
    );
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Your Library</h1>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="w-4 h-4" /> New Playlist
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-card text-card-foreground border-border">
            <DialogHeader>
              <DialogTitle>Create Playlist</DialogTitle>
            </DialogHeader>
            <div className="py-4">
              <Input 
                placeholder="My Awesome Playlist" 
                value={newPlaylistName}
                onChange={(e) => setNewPlaylistName(e.target.value)}
                className="bg-background border-input"
              />
            </div>
            <DialogFooter>
              <DialogClose asChild>
                <Button variant="ghost">Cancel</Button>
              </DialogClose>
              <Button onClick={handleCreate} disabled={createPlaylist.isPending || !newPlaylistName.trim()}>
                {createPlaylist.isPending ? "Creating..." : "Create"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="text-muted-foreground">Loading playlists...</div>
      ) : playlists?.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <Library className="w-16 h-16 text-muted-foreground mb-4 opacity-20" />
          <h2 className="text-xl font-medium mb-2">No playlists yet</h2>
          <p className="text-muted-foreground">Create your first playlist to start saving your favorite tracks.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
          {playlists?.map((playlist) => (
            <Link key={playlist.id} href={`/playlist/${playlist.id}`}>
              <div className="bg-white/5 p-4 rounded-xl hover:bg-white/10 transition-colors group cursor-pointer relative">
                <button 
                  onClick={(e) => handleDelete(e, playlist.id)}
                  className="absolute top-2 right-2 p-2 bg-black/60 rounded-full opacity-0 group-hover:opacity-100 hover:bg-destructive transition-all z-10"
                >
                  <Trash2 className="w-4 h-4 text-white" />
                </button>
                <div className="relative aspect-square mb-4 shadow-lg rounded-md overflow-hidden bg-black/40 flex items-center justify-center">
                  {playlist.coverArt ? (
                    <img src={playlist.coverArt} alt={playlist.name} className="w-full h-full object-cover" />
                  ) : (
                    <Library className="w-12 h-12 text-white/20" />
                  )}
                </div>
                <div className="font-semibold text-white truncate">{playlist.name}</div>
                <div className="text-sm text-muted-foreground truncate mt-1">{playlist.trackCount} {playlist.trackCount === 1 ? 'track' : 'tracks'}</div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}