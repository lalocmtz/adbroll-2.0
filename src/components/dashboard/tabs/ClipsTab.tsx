import { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CheckCircle2, AlertTriangle, Play } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useQuery } from "@tanstack/react-query";

interface ScriptSection {
  type: string;
  text: string;
  duration?: number;
}

interface ClipAssignment {
  sectionId: string;
  clipId: string | null;
  folderId: string | null;
}

interface ClipsTabProps {
  sections: ScriptSection[];
  assignments: ClipAssignment[];
  selectedBrandId: string;
  onAssignmentsUpdate: (assignments: ClipAssignment[]) => void;
  onBrandSelect: (brandId: string) => void;
  onNext: () => void;
}

interface BrollFile {
  id: string;
  name: string;
  file_url: string;
  thumbnail_url: string | null;
  duration: number | null;
}

export function ClipsTab({
  sections,
  assignments,
  selectedBrandId,
  onAssignmentsUpdate,
  onBrandSelect,
  onNext,
}: ClipsTabProps) {
  const [selectedFolders, setSelectedFolders] = useState<{ [key: string]: string }>({});
  const [folderClips, setFolderClips] = useState<{ [key: string]: BrollFile[] }>({});
  const [hoveredClipId, setHoveredClipId] = useState<string | null>(null);

  // Fetch brands
  const { data: brands } = useQuery({
    queryKey: ["brands"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("brands")
        .select("id, name")
        .order("name");
      if (error) throw error;
      return data;
    },
  });

  // Fetch folders for selected brand
  const { data: folders } = useQuery({
    queryKey: ["broll-folders", selectedBrandId],
    queryFn: async () => {
      if (!selectedBrandId) return [];
      const { data, error } = await supabase
        .from("broll_folders")
        .select("id, name")
        .eq("brand_id", selectedBrandId);
      if (error) throw error;
      return data;
    },
    enabled: !!selectedBrandId,
  });

  const loadFolderClips = async (folderId: string) => {
    if (folderClips[folderId]) return;

    try {
      const { data, error } = await supabase
        .from("broll_files")
        .select("id, name, file_url, thumbnail_url, duration")
        .eq("folder_id", folderId);

      if (error) throw error;
      setFolderClips((prev) => ({ ...prev, [folderId]: data || [] }));
    } catch (error: any) {
      toast.error("Error al cargar clips: " + error.message);
    }
  };

  const handleFolderSelect = (sectionId: string, folderId: string) => {
    setSelectedFolders((prev) => ({ ...prev, [sectionId]: folderId }));
    loadFolderClips(folderId);
  };

  const handleClipAssign = (sectionId: string, clipId: string, folderId: string) => {
    onAssignmentsUpdate(
      assignments.map((a) =>
        a.sectionId === sectionId ? { ...a, clipId, folderId } : a
      )
    );
  };

  const allAssigned = assignments.every((a) => a.clipId !== null);
  const hasWarnings = selectedBrandId && (!folders || folders.length === 0);

  return (
    <div className="space-y-6">
      {/* Brand Selection */}
      <div className="p-4 bg-secondary/30 rounded-lg">
        <label className="text-sm font-medium mb-2 block">
          Selecciona una marca para cargar B-roll
        </label>
        <Select value={selectedBrandId} onValueChange={onBrandSelect}>
          <SelectTrigger>
            <SelectValue placeholder="Elegir marca..." />
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

      {hasWarnings && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Esta marca no tiene carpetas de B-roll. Ve a la sección de B-roll para crear carpetas.
          </AlertDescription>
        </Alert>
      )}

      {/* Clip Assignments */}
      {selectedBrandId && folders && folders.length > 0 && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">
              Arrastra clips hacia cada bloque
            </h3>
            <div className="text-sm text-muted-foreground">
              {assignments.filter((a) => a.clipId).length} / {assignments.length} asignados
            </div>
          </div>

          <div className="grid gap-6">
            {sections.map((section, index) => {
              const assignment = assignments[index];
              const selectedFolder = selectedFolders[assignment.sectionId];
              const clips = selectedFolder ? folderClips[selectedFolder] || [] : [];
              const assignedClip = clips.find((c) => c.id === assignment.clipId);

              return (
                <div key={assignment.sectionId} className="p-6 bg-secondary/30 rounded-lg">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant="outline">{section.type}</Badge>
                        {assignment.clipId && (
                          <CheckCircle2 className="w-4 h-4 text-green-500" />
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {section.text}
                      </p>
                    </div>
                  </div>

                  <div className="grid md:grid-cols-2 gap-4">
                    {/* Folder Selector */}
                    <div>
                      <label className="text-xs font-medium mb-2 block">
                        Carpeta
                      </label>
                      <Select
                        value={selectedFolder || ""}
                        onValueChange={(folderId) =>
                          handleFolderSelect(assignment.sectionId, folderId)
                        }
                      >
                        <SelectTrigger className="h-9">
                          <SelectValue placeholder="Seleccionar carpeta..." />
                        </SelectTrigger>
                        <SelectContent>
                          {folders?.map((folder) => (
                            <SelectItem key={folder.id} value={folder.id}>
                              {folder.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Clip Selector */}
                    <div>
                      <label className="text-xs font-medium mb-2 block">
                        Clip
                      </label>
                      <Select
                        value={assignment.clipId || ""}
                        onValueChange={(clipId) =>
                          handleClipAssign(assignment.sectionId, clipId, selectedFolder)
                        }
                        disabled={!selectedFolder || clips.length === 0}
                      >
                        <SelectTrigger className="h-9">
                          <SelectValue placeholder="Seleccionar clip..." />
                        </SelectTrigger>
                        <SelectContent>
                          {clips.map((clip) => (
                            <SelectItem key={clip.id} value={clip.id}>
                              <div className="flex items-center gap-2">
                                <Play className="w-3 h-3" />
                                {clip.name}
                                {clip.duration && (
                                  <span className="text-xs text-muted-foreground">
                                    ({clip.duration}s)
                                  </span>
                                )}
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Assigned Clip Preview */}
                  {assignedClip && (
                    <div className="mt-4 p-3 bg-background/50 rounded-lg">
                      <div className="flex items-center gap-3">
                        {assignedClip.thumbnail_url ? (
                          <img
                            src={assignedClip.thumbnail_url}
                            alt={assignedClip.name}
                            className="w-16 h-16 object-cover rounded"
                          />
                        ) : (
                          <div className="w-16 h-16 bg-secondary rounded flex items-center justify-center">
                            <Play className="w-6 h-6 text-muted-foreground" />
                          </div>
                        )}
                        <div className="flex-1">
                          <p className="text-sm font-medium">{assignedClip.name}</p>
                          {assignedClip.duration && (
                            <p className="text-xs text-muted-foreground">
                              {assignedClip.duration}s de duración
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="flex justify-end pt-4 border-t">
        <Button onClick={onNext} disabled={!allAssigned}>
          {allAssigned
            ? "Siguiente: Seleccionar Voz"
            : `Asigna los ${assignments.filter((a) => !a.clipId).length} clips restantes`}
        </Button>
      </div>
    </div>
  );
}
