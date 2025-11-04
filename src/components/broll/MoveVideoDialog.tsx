import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";

interface Folder {
  id: string;
  name: string;
}

interface MoveVideoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  videoId: string | null;
  videoName: string;
  currentFolderId: string | null;
  folders: Folder[];
}

export function MoveVideoDialog({
  open,
  onOpenChange,
  videoId,
  videoName,
  currentFolderId,
  folders,
}: MoveVideoDialogProps) {
  const [selectedFolderId, setSelectedFolderId] = useState(currentFolderId || "");
  const [moving, setMoving] = useState(false);
  const queryClient = useQueryClient();

  const handleMove = async () => {
    if (!videoId || !selectedFolderId || selectedFolderId === currentFolderId) {
      return;
    }

    setMoving(true);
    try {
      const { error } = await supabase
        .from("broll_files")
        .update({ folder_id: selectedFolderId })
        .eq("id", videoId);

      if (error) throw error;

      toast.success("Video movido exitosamente");
      queryClient.invalidateQueries({ queryKey: ["broll-files"] });
      onOpenChange(false);
    } catch (error: any) {
      console.error("Error moving video:", error);
      toast.error(error.message || "Error al mover el video");
    } finally {
      setMoving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle>Mover Video</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Mover <span className="font-medium text-foreground">"{videoName}"</span> a:
          </p>

          <div className="space-y-2">
            <Label htmlFor="folder">Carpeta destino</Label>
            <Select value={selectedFolderId} onValueChange={setSelectedFolderId}>
              <SelectTrigger className="bg-background">
                <SelectValue placeholder="Selecciona una carpeta" />
              </SelectTrigger>
              <SelectContent className="bg-background z-50">
                {folders.map((folder) => (
                  <SelectItem
                    key={folder.id}
                    value={folder.id}
                    disabled={folder.id === currentFolderId}
                  >
                    {folder.name}
                    {folder.id === currentFolderId && " (actual)"}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex gap-2 pt-4">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleMove}
              disabled={!selectedFolderId || selectedFolderId === currentFolderId || moving}
              className="flex-1"
            >
              {moving ? "Moviendo..." : "Mover"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
