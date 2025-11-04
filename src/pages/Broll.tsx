import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FileUploadZone } from "@/components/broll/FileUploadZone";
import { FolderSidebar } from "@/components/broll/FolderSidebar";
import { VideoGrid } from "@/components/broll/VideoGrid";

interface Brand {
  id: string;
  name: string;
}

interface BrollFile {
  id: string;
  name: string;
  file_url: string;
  thumbnail_url: string | null;
  duration: number | null;
  file_size: number | null;
  folder: string;
  created_at: string;
}

const Broll = () => {
  const [selectedBrand, setSelectedBrand] = useState<string | null>(null);
  const [currentFolder, setCurrentFolder] = useState("General");
  const queryClient = useQueryClient();

  // Fetch brands
  const { data: brands } = useQuery({
    queryKey: ["brands"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("brands")
        .select("id, name")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as Brand[];
    },
  });

  // Fetch broll files
  const { data: files, isLoading } = useQuery({
    queryKey: ["broll-files", selectedBrand, currentFolder],
    queryFn: async () => {
      if (!selectedBrand) return [];

      const { data, error } = await supabase
        .from("broll_files")
        .select("*")
        .eq("brand_id", selectedBrand)
        .eq("folder", currentFolder)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as BrollFile[];
    },
    enabled: !!selectedBrand,
  });

  // Get unique folders
  const { data: allFiles } = useQuery({
    queryKey: ["all-broll-files", selectedBrand],
    queryFn: async () => {
      if (!selectedBrand) return [];

      const { data, error } = await supabase
        .from("broll_files")
        .select("folder")
        .eq("brand_id", selectedBrand);

      if (error) throw error;
      return data;
    },
    enabled: !!selectedBrand,
  });

  const folders = ["General", ...new Set(allFiles?.map((f) => f.folder).filter((f) => f !== "General") || [])];

  const handleFolderCreate = (name: string) => {
    setCurrentFolder(name);
    toast.success(`Carpeta "${name}" creada`);
  };

  const handleFolderDelete = async (name: string) => {
    // Check if folder has files
    const folderFiles = await supabase
      .from("broll_files")
      .select("id")
      .eq("brand_id", selectedBrand!)
      .eq("folder", name);

    if (folderFiles.data && folderFiles.data.length > 0) {
      toast.error("No puedes eliminar una carpeta con archivos");
      return;
    }

    setCurrentFolder("General");
    toast.success(`Carpeta "${name}" eliminada`);
  };

  const handleFileDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from("broll_files")
        .delete()
        .eq("id", id);

      if (error) throw error;

      toast.success("Archivo eliminado");
      queryClient.invalidateQueries({ queryKey: ["broll-files"] });
    } catch (error: any) {
      toast.error(error.message || "Error al eliminar el archivo");
    }
  };

  // Set first brand as selected by default
  if (brands && brands.length > 0 && !selectedBrand) {
    setSelectedBrand(brands[0].id);
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">B-roll Library</h1>
        <p className="text-muted-foreground mt-2">
          Organiza tus videos por carpetas tipo frame.io
        </p>
      </div>

      {/* Brand Selector */}
      <div className="flex items-center gap-4">
        <label className="text-sm font-medium">Marca:</label>
        <Select value={selectedBrand || ""} onValueChange={setSelectedBrand}>
          <SelectTrigger className="w-64">
            <SelectValue placeholder="Selecciona una marca" />
          </SelectTrigger>
          <SelectContent>
            {brands?.map((brand) => (
              <SelectItem key={brand.id} value={brand.id}>
                {brand.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {selectedBrand ? (
        <div className="flex gap-6 min-h-[600px]">
          {/* Folder Sidebar */}
          <FolderSidebar
            folders={folders}
            currentFolder={currentFolder}
            onFolderSelect={setCurrentFolder}
            onFolderCreate={handleFolderCreate}
            onFolderDelete={handleFolderDelete}
          />

          {/* Main Content */}
          <div className="flex-1 space-y-6">
            {/* Upload Zone */}
            <FileUploadZone
              brandId={selectedBrand}
              currentFolder={currentFolder}
            />

            {/* Video Grid */}
            {isLoading ? (
              <div className="text-center py-12">
                <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent" />
                <p className="mt-4 text-muted-foreground">Cargando archivos...</p>
              </div>
            ) : (
              <VideoGrid files={files || []} onDelete={handleFileDelete} />
            )}
          </div>
        </div>
      ) : (
        <div className="text-center py-12">
          <p className="text-muted-foreground">
            Selecciona o crea una marca para comenzar a subir B-roll
          </p>
        </div>
      )}
    </div>
  );
};

export default Broll;
