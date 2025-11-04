import { useCallback, useState } from "react";
import { Upload } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";

interface FileUploadZoneProps {
  brandId: string | null;
  currentFolder: string;
}

export function FileUploadZone({ brandId, currentFolder }: FileUploadZoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const queryClient = useQueryClient();

  const uploadFile = async (file: File) => {
    if (!brandId) {
      toast.error("Selecciona una marca primero");
      return;
    }

    // Validate file type
    const validTypes = ["video/mp4", "video/quicktime", "video/x-msvideo", "video/x-matroska"];
    if (!validTypes.includes(file.type)) {
      toast.error("Solo se permiten archivos de video (MP4, MOV, AVI, MKV)");
      return;
    }

    // Validate file size (max 500MB)
    if (file.size > 524288000) {
      toast.error("El archivo es demasiado grande (máximo 500MB)");
      return;
    }

    try {
      setUploading(true);
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        toast.error("Debes iniciar sesión");
        return;
      }

      // Upload to storage
      const fileName = `${Date.now()}-${file.name}`;
      const filePath = `${user.id}/${currentFolder}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("broll")
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from("broll")
        .getPublicUrl(filePath);

      // Create database record
      const { error: dbError } = await supabase.from("broll_files").insert({
        user_id: user.id,
        brand_id: brandId,
        file_url: publicUrl,
        folder: currentFolder,
        name: file.name,
        file_size: file.size,
        mime_type: file.type,
      });

      if (dbError) throw dbError;

      toast.success(`${file.name} subido exitosamente`);
      queryClient.invalidateQueries({ queryKey: ["broll-files"] });
    } catch (error: any) {
      toast.error(error.message || "Error al subir el archivo");
    } finally {
      setUploading(false);
    }
  };

  const handleFiles = async (files: FileList) => {
    const filesArray = Array.from(files);
    for (const file of filesArray) {
      await uploadFile(file);
    }
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    if (e.dataTransfer.files) {
      handleFiles(e.dataTransfer.files);
    }
  }, [brandId, currentFolder]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setIsDragging(false);
  }, []);

  return (
    <div
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      className={`
        border-2 border-dashed rounded-lg p-12 text-center transition-all
        ${isDragging ? "border-primary bg-primary/5" : "border-border"}
        ${uploading ? "opacity-50 pointer-events-none" : ""}
      `}
    >
      <div className="w-16 h-16 rounded-full bg-accent/10 flex items-center justify-center mx-auto mb-4">
        <Upload className="w-8 h-8 text-accent" />
      </div>
      
      <h3 className="font-bold text-lg mb-2">
        {uploading ? "Subiendo archivos..." : "Arrastra tus videos aquí"}
      </h3>
      
      <p className="text-sm text-muted-foreground mb-4">
        o haz clic para seleccionar archivos
      </p>
      
      <input
        type="file"
        multiple
        accept="video/*"
        onChange={(e) => e.target.files && handleFiles(e.target.files)}
        className="hidden"
        id="file-upload"
        disabled={uploading || !brandId}
      />
      
      <label
        htmlFor="file-upload"
        className="inline-block px-6 py-2 bg-primary text-primary-foreground rounded-lg cursor-pointer hover:bg-primary/90 transition-smooth"
      >
        Seleccionar Videos
      </label>
      
      <p className="text-xs text-muted-foreground mt-4">
        MP4, MOV, AVI, MKV • Máximo 500MB por archivo
      </p>
    </div>
  );
}
