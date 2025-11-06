import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CheckCircle2, AlertTriangle, Play, X } from "lucide-react";
import { toast } from "sonner";
import { useSignedUrl } from "@/hooks/useSignedUrl";

interface ScriptSection {
  type: string;
  text: string;
  duration?: number;
}

interface ClipsTabProps {
  sections: ScriptSection[];
  brandId: string;
  assignments: { [key: string]: string };
  onAssignmentsChange: (assignments: { [key: string]: string }) => void;
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
  brandId, 
  assignments, 
  onAssignmentsChange, 
  onNext 
}: ClipsTabProps) {
  const [selectedFolderId, setSelectedFolderId] = useState<string>("");
  const [hoveredClipId, setHoveredClipId] = useState<string | null>(null);

  // Fetch folders
  const { data: folders } = useQuery({
    queryKey: ["broll-folders", brandId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("broll_folders")
        .select("id, name")
        .eq("brand_id", brandId);
      if (error) throw error;
      return data;
    },
    enabled: !!brandId,
  });

  // Fetch clips from selected folder
  const { data: clips } = useQuery({
    queryKey: ["broll-clips", selectedFolderId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("broll_files")
        .select("id, name, file_url, thumbnail_url, duration")
        .eq("folder_id", selectedFolderId);
      if (error) throw error;
      return data;
    },
    enabled: !!selectedFolderId,
  });

  const handleAssign = (sectionIndex: number, clipId: string) => {
    onAssignmentsChange({
      ...assignments,
      [sectionIndex]: clipId,
    });
    toast.success("Clip asignado");
  };

  const handleUnassign = (sectionIndex: number) => {
    const updated = { ...assignments };
    delete updated[sectionIndex];
    onAssignmentsChange(updated);
    toast.info("Clip desasignado");
  };

  const allAssigned = sections.every((_, idx) => assignments[idx]);

  if (!brandId) {
    return (
      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          Selecciona una marca desde el menú lateral para acceder a tus clips
        </AlertDescription>
      </Alert>
    );
  }

  if (!folders || folders.length === 0) {
    return (
      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          No tienes carpetas de B-roll. Ve a la sección B-roll para crear carpetas y subir videos.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      {/* Folder Selector */}
      <div>
        <label className="text-sm font-medium mb-2 block">
          Selecciona una carpeta de B-roll
        </label>
        <Select value={selectedFolderId} onValueChange={setSelectedFolderId}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Elige una carpeta..." />
          </SelectTrigger>
          <SelectContent>
            {folders.map((folder) => (
              <SelectItem key={folder.id} value={folder.id}>
                {folder.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Clips Grid */}
      {selectedFolderId && clips && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {clips.map((clip) => (
            <ClipCard
              key={clip.id}
              clip={clip}
              isHovered={hoveredClipId === clip.id}
              onHover={() => setHoveredClipId(clip.id)}
              onLeave={() => setHoveredClipId(null)}
              isAssigned={Object.values(assignments).includes(clip.id)}
            />
          ))}
        </div>
      )}

      {/* Section Assignments */}
      <div className="border-t pt-6 space-y-4">
        <h3 className="font-semibold text-lg">Asignar clips a secciones</h3>
        {sections.map((section, idx) => {
          const assignedClipId = assignments[idx];
          const assignedClip = clips?.find((c) => c.id === assignedClipId);

          return (
            <div key={idx} className="p-4 bg-secondary/30 rounded-lg">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge variant="outline">{section.type}</Badge>
                    <span className="text-xs text-muted-foreground">
                      {section.duration || 0}s
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {section.text}
                  </p>
                </div>
                
                <div className="flex items-center gap-2">
                  {assignedClip ? (
                    <>
                      <div className="text-right">
                        <p className="text-sm font-medium">{assignedClip.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {assignedClip.duration}s
                        </p>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleUnassign(idx)}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                      <CheckCircle2 className="w-5 h-5 text-green-500" />
                    </>
                  ) : (
                    <Select
                      value={assignedClipId || ""}
                      onValueChange={(clipId) => handleAssign(idx, clipId)}
                    >
                      <SelectTrigger className="w-[200px]">
                        <SelectValue placeholder="Asignar clip..." />
                      </SelectTrigger>
                      <SelectContent>
                        {clips?.map((clip) => (
                          <SelectItem key={clip.id} value={clip.id}>
                            {clip.name} ({clip.duration}s)
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex justify-end pt-4 border-t">
        <Button 
          size="lg" 
          onClick={onNext}
          disabled={!allAssigned}
        >
          {allAssigned ? "Siguiente: Voz" : `Faltan ${sections.length - Object.keys(assignments).length} clips`}
        </Button>
      </div>
    </div>
  );
}

interface ClipCardProps {
  clip: BrollFile;
  isHovered: boolean;
  onHover: () => void;
  onLeave: () => void;
  isAssigned: boolean;
}

function ClipCard({ clip, isHovered, onHover, onLeave, isAssigned }: ClipCardProps) {
  const { signedUrl } = useSignedUrl(clip.thumbnail_url);
  const { signedUrl: videoUrl } = useSignedUrl(clip.file_url);

  return (
    <div
      className="group relative aspect-[9/16] bg-secondary rounded-lg overflow-hidden cursor-pointer border-2 transition-all"
      style={{ borderColor: isAssigned ? "hsl(var(--primary))" : "transparent" }}
      onMouseEnter={onHover}
      onMouseLeave={onLeave}
    >
      {signedUrl && (
        <img
          src={signedUrl}
          alt={clip.name}
          className="w-full h-full object-cover"
        />
      )}
      
      {isHovered && videoUrl && (
        <video
          src={videoUrl}
          autoPlay
          loop
          muted
          className="absolute inset-0 w-full h-full object-cover"
        />
      )}

      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
      
      <div className="absolute bottom-0 left-0 right-0 p-3 text-white opacity-0 group-hover:opacity-100 transition-opacity">
        <p className="text-sm font-medium truncate">{clip.name}</p>
        <p className="text-xs text-white/80">{clip.duration}s</p>
      </div>

      {isAssigned && (
        <div className="absolute top-2 right-2 bg-primary rounded-full p-1">
          <CheckCircle2 className="w-4 h-4 text-primary-foreground" />
        </div>
      )}

      <div className="absolute top-2 left-2 opacity-0 group-hover:opacity-100 transition-opacity">
        <Play className="w-6 h-6 text-white" />
      </div>
    </div>
  );
}
