import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Upload, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";

interface Folder {
  id: string;
  name: string;
}

interface VideoUploadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  brandId: string | null;
  folders: Folder[];
  defaultFolderId?: string;
}

export function VideoUploadDialog({
  open,
  onOpenChange,
  brandId,
  folders,
  defaultFolderId,
}: VideoUploadDialogProps) {
  const [file, setFile] = useState<File | null>(null);
  const [name, setName] = useState("");
  const [folderId, setFolderId] = useState(defaultFolderId || "");
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const queryClient = useQueryClient();

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  const handleFileSelect = (selectedFile: File) => {
    if (!selectedFile.type.startsWith("video/")) {
      toast.error("Por favor selecciona un archivo de video");
      return;
    }
    if (selectedFile.size > 500 * 1024 * 1024) {
      toast.error("El archivo es demasiado grande (máx. 500MB)");
      return;
    }
    setFile(selectedFile);
    if (!name) {
      setName(selectedFile.name.replace(/\.[^/.]+$/, ""));
    }
  };

  const handleUpload = async () => {
    if (!file || !name.trim() || !folderId) {
      toast.error("Por favor completa todos los campos");
      return;
    }

    setUploading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("No autenticado");

      const fileExt = file.name.split(".").pop();
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("broll")
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from("broll")
        .getPublicUrl(fileName);

      const { data: insertData, error: dbError } = await supabase
        .from("broll_files")
        .insert({
          user_id: user.id,
          brand_id: brandId,
          folder_id: folderId,
          name: name.trim(),
          file_url: urlData.publicUrl,
          mime_type: file.type,
          file_size: file.size,
        })
        .select()
        .single();

      if (dbError) throw dbError;

      // Generate thumbnail in background
      if (insertData) {
        supabase.functions
          .invoke("generate-thumbnail", {
            body: {
              fileId: insertData.id,
              fileUrl: urlData.publicUrl,
              fileName: file.name,
            },
          })
          .then(({ error: thumbError }) => {
            if (thumbError) {
              console.error("Thumbnail generation error:", thumbError);
            } else {
              queryClient.invalidateQueries({ queryKey: ["broll-files"] });
            }
          });
      }

      toast.success("Video subido exitosamente");
      queryClient.invalidateQueries({ queryKey: ["broll-files"] });
      onOpenChange(false);
      resetForm();
    } catch (error: any) {
      console.error("Error uploading:", error);
      toast.error(error.message || "Error al subir el video");
    } finally {
      setUploading(false);
    }
  };

  const resetForm = () => {
    setFile(null);
    setName("");
    setFolderId(defaultFolderId || "");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Subir Video</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* File Upload Zone */}
          <div
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
              dragActive ? "border-primary bg-primary/5" : "border-border"
            }`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
          >
            {file ? (
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2 p-3 bg-secondary rounded">
                  <span className="text-sm truncate">{file.name}</span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={() => setFile(null)}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ) : (
              <>
                <Upload className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-sm text-muted-foreground mb-2">
                  Arrastra tu video aquí o
                </p>
                <Button
                  variant="outline"
                  onClick={() => document.getElementById("file-input")?.click()}
                >
                  Seleccionar archivo
                </Button>
                <input
                  id="file-input"
                  type="file"
                  accept="video/*"
                  className="hidden"
                  onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
                />
                <p className="text-xs text-muted-foreground mt-2">
                  MP4, MOV, AVI (máx. 500MB)
                </p>
              </>
            )}
          </div>

          {/* Video Name */}
          <div className="space-y-2">
            <Label htmlFor="name">Nombre del video *</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ej: Video presentación producto"
            />
          </div>

          {/* Folder Selection */}
          <div className="space-y-2">
            <Label htmlFor="folder">Carpeta destino *</Label>
            <Select value={folderId} onValueChange={setFolderId}>
              <SelectTrigger className="bg-background">
                <SelectValue placeholder="Selecciona una carpeta" />
              </SelectTrigger>
              <SelectContent className="bg-background z-50">
                {folders.map((folder) => (
                  <SelectItem key={folder.id} value={folder.id}>
                    {folder.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-4">
            <Button
              variant="outline"
              onClick={() => {
                onOpenChange(false);
                resetForm();
              }}
              className="flex-1"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleUpload}
              disabled={!file || !name.trim() || !folderId || uploading}
              className="flex-1"
            >
              {uploading ? "Subiendo..." : "Subir Video"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
