import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Upload, ChevronRight, AlertCircle, FolderPlus } from "lucide-react";
import { toast } from "sonner";
import { FolderCard } from "@/components/broll/FolderCard";
import { VideoCard } from "@/components/broll/VideoCard";
import { VideoUploadDialog } from "@/components/broll/VideoUploadDialog";
import { VideoDetailsDialog } from "@/components/broll/VideoDetailsDialog";
import { MoveVideoDialog } from "@/components/broll/MoveVideoDialog";
import { CreateFolderDialog } from "@/components/broll/CreateFolderDialog";
import { useAuth } from "@/hooks/useAuth";

interface Brand {
  id: string;
  name: string;
}

interface Folder {
  id: string;
  name: string;
  brand_id: string | null;
  is_default: boolean;
}

interface BrollFile {
  id: string;
  name: string;
  file_url: string;
  duration: number | null;
  file_size: number | null;
  created_at: string;
  folder_id: string | null;
  brand_id: string | null;
  mime_type: string | null;
}

export default function Broll() {
  const [selectedBrand, setSelectedBrand] = useState<string | null>(null);
  const [selectedFolder, setSelectedFolder] = useState<Folder | null>(null);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [createFolderOpen, setCreateFolderOpen] = useState(false);
  const [selectedVideo, setSelectedVideo] = useState<BrollFile | null>(null);
  const [videoToMove, setVideoToMove] = useState<BrollFile | null>(null);
  const [videoToDelete, setVideoToDelete] = useState<BrollFile | null>(null);
  const [folderToDelete, setFolderToDelete] = useState<Folder | null>(null);
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const { data: brands, isLoading: brandsLoading } = useQuery({
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

  const { data: folders = [] } = useQuery({
    queryKey: ["broll-folders", selectedBrand],
    queryFn: async () => {
      if (!selectedBrand || !user) return [];
      
      const { data, error } = await supabase
        .from("broll_folders")
        .select("*")
        .eq("brand_id", selectedBrand)
        .order("is_default", { ascending: false });
      
      if (error) throw error;
      
      // If brand has no folders, create default ones
      if (data.length === 0) {
        const defaultFolders = [
          { user_id: user.id, brand_id: selectedBrand, name: 'Hook', is_default: true },
          { user_id: user.id, brand_id: selectedBrand, name: 'CTA', is_default: true },
          { user_id: user.id, brand_id: selectedBrand, name: 'Usando el producto', is_default: true },
          { user_id: user.id, brand_id: selectedBrand, name: 'Social proof', is_default: true },
          { user_id: user.id, brand_id: selectedBrand, name: 'Uso diario', is_default: true },
        ];
        
        const { data: newFolders, error: insertError } = await supabase
          .from("broll_folders")
          .insert(defaultFolders)
          .select();
        
        if (insertError) {
          console.error("Error creating default folders:", insertError);
          return [];
        }
        
        return newFolders as Folder[];
      }
      
      return data as Folder[];
    },
    enabled: !!selectedBrand && !!user,
  });

  const { data: files = [] } = useQuery({
    queryKey: ["broll-files", selectedBrand],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("broll_files")
        .select("*")
        .eq("brand_id", selectedBrand)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as BrollFile[];
    },
    enabled: !!selectedBrand,
  });

  const { data: unassignedFiles = [] } = useQuery({
    queryKey: ["broll-files-unassigned"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("broll_files")
        .select("*")
        .is("brand_id", null)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as BrollFile[];
    },
  });

  const handleAssignBrand = async (fileId: string, brandId: string) => {
    try {
      const { error } = await supabase
        .from("broll_files")
        .update({ brand_id: brandId })
        .eq("id", fileId);

      if (error) throw error;

      toast.success("Video asignado a marca");
      queryClient.invalidateQueries({ queryKey: ["broll-files"] });
      queryClient.invalidateQueries({ queryKey: ["broll-files-unassigned"] });
    } catch (error: any) {
      toast.error("Error al asignar marca");
    }
  };

  const handleDeleteVideo = async () => {
    if (!videoToDelete) return;

    try {
      const fileName = videoToDelete.file_url.split("/").pop();
      if (fileName) {
        await supabase.storage.from("broll").remove([fileName]);
      }

      const { error } = await supabase
        .from("broll_files")
        .delete()
        .eq("id", videoToDelete.id);

      if (error) throw error;

      toast.success("Video eliminado");
      queryClient.invalidateQueries({ queryKey: ["broll-files"] });
      setVideoToDelete(null);
    } catch (error: any) {
      console.error("Error deleting:", error);
      toast.error("Error al eliminar");
    }
  };

  const handleDeleteFolder = async () => {
    if (!folderToDelete) return;

    // Check if folder has videos
    const folderVideos = getFolderVideos(folderToDelete.id);
    if (folderVideos.length > 0) {
      toast.error("No puedes eliminar una carpeta con videos");
      setFolderToDelete(null);
      return;
    }

    try {
      const { error } = await supabase
        .from("broll_folders")
        .delete()
        .eq("id", folderToDelete.id);

      if (error) throw error;

      toast.success("Carpeta eliminada");
      queryClient.invalidateQueries({ queryKey: ["broll-folders"] });
      setFolderToDelete(null);
      
      // If we were viewing this folder, go back to main view
      if (selectedFolder?.id === folderToDelete.id) {
        setSelectedFolder(null);
      }
    } catch (error: any) {
      console.error("Error deleting folder:", error);
      toast.error("Error al eliminar carpeta");
    }
  };

  const getFolderVideos = (folderId: string) => {
    return files.filter((f) => f.folder_id === folderId);
  };

  const currentFolderFiles = selectedFolder
    ? getFolderVideos(selectedFolder.id)
    : [];

  if (brandsLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">Cargando...</div>
      </div>
    );
  }

  if (!brands || brands.length === 0) {
    return (
      <div className="container mx-auto p-8">
        <Card className="p-12 text-center">
          <AlertCircle className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
          <h2 className="text-2xl font-bold mb-2">No hay marcas creadas</h2>
          <p className="text-muted-foreground mb-6">
            Primero necesitas crear una marca para organizar tus videos
          </p>
          <Button onClick={() => (window.location.href = "/brands")}>
            Crear mi primera marca
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-4xl font-bold mb-2">Librería B-Roll</h1>
          <p className="text-muted-foreground">
            Organiza tus videos por marca y carpetas temáticas
          </p>
        </div>
        <div className="flex gap-2">
          {selectedBrand && (
            <Button variant="outline" onClick={() => setCreateFolderOpen(true)}>
              <FolderPlus className="w-4 h-4 mr-2" />
              Nueva Carpeta
            </Button>
          )}
          <Button onClick={() => setUploadDialogOpen(true)}>
            <Upload className="w-4 h-4 mr-2" />
            Subir Video
          </Button>
        </div>
      </div>

      {/* Brand Selector */}
      <div className="mb-6">
        <Select value={selectedBrand || ""} onValueChange={setSelectedBrand}>
          <SelectTrigger className="w-[300px] bg-background">
            <SelectValue placeholder="Selecciona una marca" />
          </SelectTrigger>
          <SelectContent className="bg-background z-50">
            {brands.map((brand) => (
              <SelectItem key={brand.id} value={brand.id}>
                {brand.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Unassigned Videos Section */}
      {unassignedFiles.length > 0 && !selectedFolder && (
        <Card className="p-6 mb-6 bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800">
          <div className="flex items-start gap-4">
            <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5" />
            <div className="flex-1">
              <h3 className="font-semibold mb-2">Videos sin marca asignada</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Tienes {unassignedFiles.length} video{unassignedFiles.length !== 1 ? "s" : ""} sin asignar
              </p>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {unassignedFiles.map((file) => (
                  <Card key={file.id} className="p-3">
                    <p className="text-sm font-medium truncate mb-2">{file.name}</p>
                    <Select onValueChange={(brandId) => handleAssignBrand(file.id, brandId)}>
                      <SelectTrigger className="w-full bg-background">
                        <SelectValue placeholder="Asignar marca" />
                      </SelectTrigger>
                      <SelectContent className="bg-background z-50">
                        {brands.map((brand) => (
                          <SelectItem key={brand.id} value={brand.id}>
                            {brand.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Card>
                ))}
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Breadcrumb */}
      {selectedBrand && (
        <Breadcrumb className="mb-6">
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink
                onClick={() => setSelectedFolder(null)}
                className="cursor-pointer"
              >
                {brands.find((b) => b.id === selectedBrand)?.name}
              </BreadcrumbLink>
            </BreadcrumbItem>
            {selectedFolder && (
              <>
                <BreadcrumbSeparator>
                  <ChevronRight className="w-4 h-4" />
                </BreadcrumbSeparator>
                <BreadcrumbItem>
                  <BreadcrumbPage>{selectedFolder.name}</BreadcrumbPage>
                </BreadcrumbItem>
              </>
            )}
          </BreadcrumbList>
        </Breadcrumb>
      )}

      {/* Content */}
      {selectedBrand && !selectedFolder && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {folders.map((folder) => (
            <FolderCard
              key={folder.id}
              name={folder.name}
              videoCount={getFolderVideos(folder.id).length}
              isDefault={folder.is_default}
              onClick={() => setSelectedFolder(folder)}
              onDelete={() => setFolderToDelete(folder)}
            />
          ))}
        </div>
      )}

      {selectedFolder && (
        <div>
          {currentFolderFiles.length === 0 ? (
            <Card className="p-12 text-center">
              <p className="text-muted-foreground mb-4">
                Esta carpeta está vacía
              </p>
              <Button onClick={() => setUploadDialogOpen(true)}>
                <Upload className="w-4 h-4 mr-2" />
                Subir primer video
              </Button>
            </Card>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {currentFolderFiles.map((file) => (
                <VideoCard
                  key={file.id}
                  file={file}
                  onPlay={() => setSelectedVideo(file)}
                  onMove={() => setVideoToMove(file)}
                  onDelete={() => setVideoToDelete(file)}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Dialogs */}
      <VideoUploadDialog
        open={uploadDialogOpen}
        onOpenChange={setUploadDialogOpen}
        brandId={selectedBrand}
        folders={folders}
        defaultFolderId={selectedFolder?.id}
      />

      <CreateFolderDialog
        open={createFolderOpen}
        onOpenChange={setCreateFolderOpen}
        brandId={selectedBrand || ""}
        userId={user?.id || ""}
      />

      <VideoDetailsDialog
        video={selectedVideo}
        open={!!selectedVideo}
        onOpenChange={(open) => !open && setSelectedVideo(null)}
      />

      <MoveVideoDialog
        open={!!videoToMove}
        onOpenChange={(open) => !open && setVideoToMove(null)}
        videoId={videoToMove?.id || null}
        videoName={videoToMove?.name || ""}
        currentFolderId={videoToMove?.folder_id || null}
        folders={folders}
      />

      <AlertDialog open={!!videoToDelete} onOpenChange={(open) => !open && setVideoToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar video?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. El video "{videoToDelete?.name}" será eliminado permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteVideo} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!folderToDelete} onOpenChange={(open) => !open && setFolderToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar carpeta?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. La carpeta "{folderToDelete?.name}" será eliminada permanentemente.
              {getFolderVideos(folderToDelete?.id || "").length > 0 && (
                <span className="block mt-2 text-amber-600 font-medium">
                  Advertencia: Esta carpeta contiene videos. Mueve o elimina los videos antes de eliminar la carpeta.
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteFolder} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
