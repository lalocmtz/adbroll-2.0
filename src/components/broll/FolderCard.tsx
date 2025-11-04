import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Folder, Play, MoreVertical, Trash2 } from "lucide-react";

interface FolderCardProps {
  name: string;
  videoCount: number;
  thumbnail?: string;
  isDefault?: boolean;
  onClick: () => void;
  onDelete?: () => void;
}

export function FolderCard({ name, videoCount, thumbnail, isDefault, onClick, onDelete }: FolderCardProps) {
  return (
    <Card className="group hover-lift transition-all overflow-hidden relative">
      {/* Thumbnail/Preview */}
      <div 
        className="aspect-video bg-secondary relative overflow-hidden cursor-pointer"
        onClick={onClick}
      >
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
        <div className="flex items-center justify-between gap-2 mb-2">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <Folder className="w-4 h-4 text-primary flex-shrink-0" />
            <h3 className="font-medium truncate">{name}</h3>
          </div>
          
          {!isDefault && onDelete && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100">
                  <MoreVertical className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="bg-background z-50">
                <DropdownMenuItem 
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete();
                  }}
                  className="text-destructive"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Eliminar carpeta
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
        <p className="text-sm text-muted-foreground">
          {videoCount === 0 ? "Sin videos" : `${videoCount} video${videoCount !== 1 ? "s" : ""}`}
        </p>
      </div>
    </Card>
  );
}
