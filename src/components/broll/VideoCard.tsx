import { useState, useRef, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreVertical, Play, Clock, Edit, FolderInput, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";

interface BrollFile {
  id: string;
  name: string;
  file_url: string;
  duration: number | null;
  file_size: number | null;
  created_at: string;
  folder_id: string | null;
}

interface VideoCardProps {
  file: BrollFile;
  onPlay: () => void;
  onMove: () => void;
  onDelete: () => void;
}

export function VideoCard({ file, onPlay, onMove, onDelete }: VideoCardProps) {
  const [thumbnail, setThumbnail] = useState<string>("");
  const [isRenaming, setIsRenaming] = useState(false);
  const [newName, setNewName] = useState(file.name);
  const videoRef = useRef<HTMLVideoElement>(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.currentTime = 1;
    }
  }, []);

  const handleLoadedData = () => {
    if (videoRef.current) {
      const canvas = document.createElement("canvas");
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.drawImage(videoRef.current, 0, 0);
        setThumbnail(canvas.toDataURL());
      }
    }
  };

  const handleRename = async () => {
    if (!newName.trim() || newName === file.name) {
      setIsRenaming(false);
      return;
    }

    try {
      const { error } = await supabase
        .from("broll_files")
        .update({ name: newName.trim() })
        .eq("id", file.id);

      if (error) throw error;

      toast.success("Video renombrado");
      queryClient.invalidateQueries({ queryKey: ["broll-files"] });
      setIsRenaming(false);
    } catch (error: any) {
      console.error("Error renaming:", error);
      toast.error("Error al renombrar");
      setNewName(file.name);
    }
  };

  const formatDuration = (seconds: number | null) => {
    if (!seconds) return null;
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return "";
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(1)} MB`;
  };

  return (
    <Card className="group overflow-hidden hover-lift cursor-pointer transition-all">
      {/* Thumbnail */}
      <div className="aspect-video bg-secondary relative overflow-hidden" onClick={onPlay}>
        {thumbnail ? (
          <img src={thumbnail} alt={file.name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Play className="w-12 h-12 text-muted-foreground" />
          </div>
        )}

        <video
          ref={videoRef}
          src={file.file_url}
          className="hidden"
          onLoadedData={handleLoadedData}
          preload="metadata"
        />

        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
          <Play className="w-12 h-12 text-white" />
        </div>

        {file.duration && (
          <div className="absolute bottom-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {formatDuration(file.duration)}
          </div>
        )}
      </div>

      {/* Info */}
      <div className="p-3">
        {isRenaming ? (
          <Input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onBlur={handleRename}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleRename();
              if (e.key === "Escape") {
                setNewName(file.name);
                setIsRenaming(false);
              }
            }}
            autoFocus
            className="mb-1"
          />
        ) : (
          <p className="text-sm font-medium truncate mb-1">{file.name}</p>
        )}
        <p className="text-xs text-muted-foreground">{formatFileSize(file.file_size)}</p>
      </div>

      {/* Actions */}
      <div className="px-3 pb-3 flex gap-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="flex-1">
              <MoreVertical className="w-4 h-4 mr-2" />
              Acciones
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="bg-background z-50">
            <DropdownMenuItem onClick={() => setIsRenaming(true)}>
              <Edit className="w-4 h-4 mr-2" />
              Renombrar
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onMove}>
              <FolderInput className="w-4 h-4 mr-2" />
              Mover a carpeta
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onDelete} className="text-destructive">
              <Trash2 className="w-4 h-4 mr-2" />
              Eliminar
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </Card>
  );
}
