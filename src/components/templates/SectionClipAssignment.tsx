import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Video, Clock, CheckCircle2 } from "lucide-react";
import { useSignedUrl } from "@/hooks/useSignedUrl";

interface TemplateSection {
  id: string;
  type: string;
  title: string;
  description: string | null;
  expected_duration: number;
}

interface BrollFolder {
  id: string;
  name: string;
  filesCount: number;
}

interface BrollFile {
  id: string;
  name: string;
  duration: number | null;
  storage_path: string | null;
  thumbnail_url: string | null;
}

interface SectionAssignment {
  sectionId: string;
  clipId: string | null;
  folderId: string | null;
}

interface SectionClipAssignmentProps {
  section: TemplateSection;
  brandId: string;
  folders: BrollFolder[];
  assignment: SectionAssignment;
  onAssignmentChange: (
    sectionId: string,
    clipId: string | null,
    folderId: string | null
  ) => void;
}

export const SectionClipAssignment = ({
  section,
  brandId,
  folders,
  assignment,
  onAssignmentChange,
}: SectionClipAssignmentProps) => {
  const [selectedFolderId, setSelectedFolderId] = useState<string>(
    assignment.folderId || ""
  );
  const [clips, setClips] = useState<BrollFile[]>([]);
  const [selectedClipId, setSelectedClipId] = useState<string>(
    assignment.clipId || ""
  );
  const [isLoadingClips, setIsLoadingClips] = useState(false);

  const selectedClip = clips.find((c) => c.id === selectedClipId);
  const { signedUrl } = useSignedUrl(selectedClip?.storage_path || null);

  useEffect(() => {
    if (selectedFolderId) {
      loadClips();
    } else {
      setClips([]);
      setSelectedClipId("");
    }
  }, [selectedFolderId]);

  const loadClips = async () => {
    try {
      setIsLoadingClips(true);
      const { data, error } = await supabase
        .from("broll_files")
        .select("id, name, duration, storage_path, thumbnail_url")
        .eq("folder_id", selectedFolderId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setClips(data || []);
    } catch (error) {
      console.error("Error loading clips:", error);
      setClips([]);
    } finally {
      setIsLoadingClips(false);
    }
  };

  const handleFolderChange = (folderId: string) => {
    setSelectedFolderId(folderId);
    setSelectedClipId("");
    onAssignmentChange(section.id, null, folderId);
  };

  const handleClipChange = (clipId: string) => {
    setSelectedClipId(clipId);
    onAssignmentChange(section.id, clipId, selectedFolderId);
  };

  const isAssigned = !!assignment.clipId;

  return (
    <Card className={`p-4 ${isAssigned ? "border-green-500/50" : ""}`}>
      <div className="flex items-start gap-4">
        <div className="flex-1 space-y-3">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="font-mono text-xs">
              {section.type}
            </Badge>
            <h3 className="font-semibold">{section.title}</h3>
            {isAssigned && (
              <CheckCircle2 className="w-4 h-4 text-green-600" />
            )}
          </div>

          {section.description && (
            <p className="text-sm text-muted-foreground">
              {section.description}
            </p>
          )}

          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Clock className="w-3 h-3" />
            <span>Duración esperada: {section.expected_duration}s</span>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium mb-1 block">
                Carpeta de B-Roll
              </label>
              <Select value={selectedFolderId} onValueChange={handleFolderChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona carpeta..." />
                </SelectTrigger>
                <SelectContent>
                  {folders.map((folder) => (
                    <SelectItem key={folder.id} value={folder.id}>
                      {folder.name} ({folder.filesCount} clips)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-xs font-medium mb-1 block">
                Clip de video
              </label>
              <Select
                value={selectedClipId}
                onValueChange={handleClipChange}
                disabled={!selectedFolderId || clips.length === 0}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona clip..." />
                </SelectTrigger>
                <SelectContent>
                  {isLoadingClips ? (
                    <SelectItem value="loading" disabled>
                      Cargando...
                    </SelectItem>
                  ) : clips.length === 0 ? (
                    <SelectItem value="empty" disabled>
                      No hay clips
                    </SelectItem>
                  ) : (
                    clips.map((clip) => (
                      <SelectItem key={clip.id} value={clip.id}>
                        {clip.name}
                        {clip.duration && ` (${clip.duration}s)`}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Preview */}
        <div className="w-32 h-32 bg-secondary/30 rounded-lg flex items-center justify-center overflow-hidden flex-shrink-0">
          {selectedClip?.thumbnail_url ? (
            <img
              src={selectedClip.thumbnail_url}
              alt={selectedClip.name}
              className="w-full h-full object-cover"
            />
          ) : signedUrl ? (
            <video
              src={signedUrl}
              className="w-full h-full object-cover"
              muted
            />
          ) : (
            <Video className="w-8 h-8 text-muted-foreground/30" />
          )}
        </div>
      </div>
    </Card>
  );
};
