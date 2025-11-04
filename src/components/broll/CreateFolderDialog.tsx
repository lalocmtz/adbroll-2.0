import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";

interface CreateFolderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  brandId: string;
  userId: string;
}

export function CreateFolderDialog({
  open,
  onOpenChange,
  brandId,
  userId,
}: CreateFolderDialogProps) {
  const [folderName, setFolderName] = useState("");
  const [creating, setCreating] = useState(false);
  const queryClient = useQueryClient();

  const handleCreate = async () => {
    if (!folderName.trim()) {
      toast.error("Por favor ingresa un nombre para la carpeta");
      return;
    }

    setCreating(true);
    try {
      const { error } = await supabase
        .from("broll_folders")
        .insert({
          user_id: userId,
          brand_id: brandId,
          name: folderName.trim(),
          is_default: false,
        });

      if (error) throw error;

      toast.success("Carpeta creada exitosamente");
      queryClient.invalidateQueries({ queryKey: ["broll-folders"] });
      onOpenChange(false);
      setFolderName("");
    } catch (error: any) {
      console.error("Error creating folder:", error);
      toast.error(error.message || "Error al crear la carpeta");
    } finally {
      setCreating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle>Nueva Carpeta</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="folder-name">Nombre de la carpeta</Label>
            <Input
              id="folder-name"
              value={folderName}
              onChange={(e) => setFolderName(e.target.value)}
              placeholder="Ej: Testimonios"
              onKeyDown={(e) => {
                if (e.key === "Enter") handleCreate();
              }}
              autoFocus
            />
          </div>

          <div className="flex gap-2 pt-4">
            <Button
              variant="outline"
              onClick={() => {
                onOpenChange(false);
                setFolderName("");
              }}
              className="flex-1"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleCreate}
              disabled={!folderName.trim() || creating}
              className="flex-1"
            >
              {creating ? "Creando..." : "Crear Carpeta"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
