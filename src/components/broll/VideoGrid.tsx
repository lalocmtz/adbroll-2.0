import { Play, Trash2, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useState } from "react";

interface BrollFile {
  id: string;
  name: string;
  file_url: string;
  thumbnail_url: string | null;
  duration: number | null;
  file_size: number | null;
  created_at: string;
}

interface VideoGridProps {
  files: BrollFile[];
  onDelete: (id: string) => void;
}

export function VideoGrid({ files, onDelete }: VideoGridProps) {
  const [previewFile, setPreviewFile] = useState<BrollFile | null>(null);

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return "—";
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(1)} MB`;
  };

  const formatDuration = (seconds: number | null) => {
    if (!seconds) return "—";
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  if (files.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">
          No hay archivos en esta carpeta. Sube tu primer video.
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {files.map((file) => (
          <Card
            key={file.id}
            className="group overflow-hidden hover-lift cursor-pointer"
            onClick={() => setPreviewFile(file)}
          >
            <div className="aspect-video bg-secondary relative overflow-hidden">
              {file.thumbnail_url ? (
                <img
                  src={file.thumbnail_url}
                  alt={file.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Play className="w-12 h-12 text-muted-foreground" />
                </div>
              )}
              
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <Play className="w-8 h-8 text-white" />
              </div>

              {file.duration && (
                <div className="absolute bottom-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {formatDuration(file.duration)}
                </div>
              )}
            </div>

            <div className="p-3">
              <p className="text-sm font-medium truncate mb-1">{file.name}</p>
              <p className="text-xs text-muted-foreground">
                {formatFileSize(file.file_size)}
              </p>
            </div>

            <div className="p-3 pt-0">
              <Button
                variant="ghost"
                size="sm"
                className="w-full text-red-500 hover:text-red-600 hover:bg-red-50"
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(file.id);
                }}
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Eliminar
              </Button>
            </div>
          </Card>
        ))}
      </div>

      {/* Preview Dialog */}
      <Dialog open={!!previewFile} onOpenChange={() => setPreviewFile(null)}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>{previewFile?.name}</DialogTitle>
          </DialogHeader>
          {previewFile && (
            <div className="space-y-4">
              <video
                src={previewFile.file_url}
                controls
                className="w-full rounded-lg"
                autoPlay
              />
              <div className="flex gap-4 text-sm text-muted-foreground">
                <span>Tamaño: {formatFileSize(previewFile.file_size)}</span>
                {previewFile.duration && (
                  <span>Duración: {formatDuration(previewFile.duration)}</span>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
