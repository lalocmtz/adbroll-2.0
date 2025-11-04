import { Card } from "@/components/ui/card";
import { Folder, Play } from "lucide-react";

interface FolderCardProps {
  name: string;
  videoCount: number;
  thumbnail?: string;
  onClick: () => void;
}

export function FolderCard({ name, videoCount, thumbnail, onClick }: FolderCardProps) {
  return (
    <Card
      className="group cursor-pointer hover-lift transition-all overflow-hidden"
      onClick={onClick}
    >
      {/* Thumbnail/Preview */}
      <div className="aspect-video bg-secondary relative overflow-hidden">
        {thumbnail ? (
          <img src={thumbnail} alt={name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Folder className="w-16 h-16 text-muted-foreground/30" />
          </div>
        )}

        {thumbnail && (
          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
            <Play className="w-12 h-12 text-white" />
          </div>
        )}
      </div>

      {/* Info */}
      <div className="p-4">
        <div className="flex items-center gap-2 mb-2">
          <Folder className="w-4 h-4 text-primary flex-shrink-0" />
          <h3 className="font-medium truncate">{name}</h3>
        </div>
        <p className="text-sm text-muted-foreground">
          {videoCount === 0 ? "Sin videos" : `${videoCount} video${videoCount !== 1 ? "s" : ""}`}
        </p>
      </div>
    </Card>
  );
}
