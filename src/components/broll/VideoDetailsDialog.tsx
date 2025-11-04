import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Clock, HardDrive, Calendar } from "lucide-react";

interface BrollFile {
  id: string;
  name: string;
  file_url: string;
  duration: number | null;
  file_size: number | null;
  created_at: string;
  mime_type: string | null;
}

interface VideoDetailsDialogProps {
  video: BrollFile | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function VideoDetailsDialog({ video, open, onOpenChange }: VideoDetailsDialogProps) {
  if (!video) return null;

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

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString("es-ES", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>{video.name}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Video Player */}
          <div className="bg-black rounded-lg overflow-hidden">
            <video
              src={video.file_url}
              controls
              className="w-full"
              controlsList="nodownload"
            >
              Tu navegador no soporta la reproducción de videos.
            </video>
          </div>

          {/* Metadata */}
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div className="flex items-center gap-2 text-muted-foreground">
              <HardDrive className="w-4 h-4" />
              <span>{formatFileSize(video.file_size)}</span>
            </div>
            {video.duration && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Clock className="w-4 h-4" />
                <span>{formatDuration(video.duration)}</span>
              </div>
            )}
            <div className="flex items-center gap-2 text-muted-foreground">
              <Calendar className="w-4 h-4" />
              <span>{formatDate(video.created_at)}</span>
            </div>
          </div>

          {/* Download Button */}
          <div className="flex justify-end">
            <Button
              variant="outline"
              onClick={() => {
                const a = document.createElement("a");
                a.href = video.file_url;
                a.download = video.name;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
              }}
            >
              Descargar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
