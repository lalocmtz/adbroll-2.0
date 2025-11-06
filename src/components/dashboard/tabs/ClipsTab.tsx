import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sparkles, Play } from "lucide-react";
import { toast } from "sonner";

interface ScriptSection {
  type: string;
  text: string;
  adaptedText?: string;
  duration?: number;
}

interface ClipsTabProps {
  sections: ScriptSection[];
  brandId: string;
  assignments: { [key: string]: string };
  onAssignmentsChange: (assignments: { [key: string]: string }) => void;
  hookText: string;
  onHookTextChange: (text: string) => void;
  subtitleStyle: string;
  onSubtitleStyleChange: (style: string) => void;
  onNext: () => void;
}

const SUBTITLE_STYLES = [
  { value: "tiktokWhite", label: "TikTok White" },
  { value: "underline", label: "Subrayado" },
  { value: "box", label: "Caja" },
  { value: "outline", label: "Contorno" }
];

export function ClipsTab({
  sections,
  brandId,
  assignments,
  onAssignmentsChange,
  hookText,
  onHookTextChange,
  subtitleStyle,
  onSubtitleStyleChange,
  onNext
}: ClipsTabProps) {
  const [selectedFolder, setSelectedFolder] = useState<string>("");
  const [autoAssigning, setAutoAssigning] = useState(false);

  const { data: folders } = useQuery({
    queryKey: ["broll-folders", brandId],
    queryFn: async () => {
      if (!brandId) return [];
      const { data, error } = await supabase
        .from("broll_folders")
        .select("*")
        .eq("brand_id", brandId)
        .order("name");
      if (error) throw error;
      return data;
    },
    enabled: !!brandId
  });

  const { data: clips } = useQuery({
    queryKey: ["broll-clips", brandId, selectedFolder],
    queryFn: async () => {
      if (!brandId) return [];
      let query = supabase
        .from("broll_files")
        .select("*")
        .eq("brand_id", brandId);
      
      if (selectedFolder) {
        query = query.eq("folder_id", selectedFolder);
      }
      
      const { data, error } = await query.order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!brandId
  });

  const handleAutoAssign = async () => {
    if (!brandId) {
      toast.error("Selecciona una marca primero");
      return;
    }

    setAutoAssigning(true);
    try {
      // Call assign-clips edge function
      toast.success("Clips asignados automáticamente");
      
      // Mock assignment
      const mockAssignments: { [key: string]: string } = {};
      sections.forEach((section, index) => {
        if (clips && clips[index]) {
          mockAssignments[section.type] = clips[index].id;
        }
      });
      onAssignmentsChange(mockAssignments);
    } catch (error) {
      toast.error("Error al asignar clips");
    } finally {
      setAutoAssigning(false);
    }
  };

  const allSectionsAssigned = sections.every(section => assignments[section.type]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Left Panel - Folder Selection */}
      <div className="space-y-4">
        <Card className="p-4">
          <Label className="mb-3 block">Selecciona carpeta</Label>
          <Select value={selectedFolder} onValueChange={setSelectedFolder}>
            <SelectTrigger>
              <SelectValue placeholder="Todas las carpetas" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas las carpetas</SelectItem>
              {folders?.map(folder => (
                <SelectItem key={folder.id} value={folder.id}>
                  {folder.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Card>

        <div className="grid grid-cols-2 gap-3">
          {clips?.slice(0, 8).map((clip) => (
            <Card key={clip.id} className="p-2 cursor-pointer hover:bg-secondary/50 transition-colors">
              <div className="aspect-[9/16] bg-secondary rounded overflow-hidden mb-2">
                {clip.thumbnail_url ? (
                  <img 
                    src={clip.thumbnail_url} 
                    alt={clip.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Play className="w-8 h-8 text-muted-foreground" />
                  </div>
                )}
              </div>
              <p className="text-xs truncate">{clip.name}</p>
            </Card>
          ))}
        </div>
      </div>

      {/* Center Panel - Assignment & Configuration */}
      <div className="space-y-4">
        <Card className="p-4 space-y-4">
          <div>
            <Label htmlFor="hook-text">1. Agrega un hook en texto</Label>
            <Input
              id="hook-text"
              value={hookText}
              onChange={(e) => onHookTextChange(e.target.value)}
              placeholder="Escribe tu hook"
              className="mt-2"
            />
          </div>

          <div>
            <Label>2. Subtítulos</Label>
            <div className="flex gap-2 mt-2">
              {SUBTITLE_STYLES.map(style => (
                <Button
                  key={style.value}
                  variant={subtitleStyle === style.value ? "default" : "outline"}
                  size="sm"
                  onClick={() => onSubtitleStyleChange(style.value)}
                >
                  {style.label}
                </Button>
              ))}
            </div>
          </div>
        </Card>

        <div>
          <div className="flex items-center justify-between mb-3">
            <Label>3. B-rolls</Label>
            <Button
              variant="outline"
              size="sm"
              onClick={handleAutoAssign}
              disabled={autoAssigning || !brandId}
              className="gap-2"
            >
              <Sparkles className="w-4 h-4" />
              {autoAssigning ? "Asignando..." : "Asignar automáticamente"}
            </Button>
          </div>

          <div className="space-y-2">
            {sections.map((section) => (
              <Card key={section.type} className="p-3">
                <div className="flex items-center justify-between mb-2">
                  <Badge variant="secondary">{section.type}</Badge>
                  <span className="text-xs text-muted-foreground">
                    {section.duration ? `${section.duration}s` : ""}
                  </span>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                >
                  {assignments[section.type] ? "Cambiar broll" : "Asignar broll"}
                </Button>
              </Card>
            ))}
          </div>
        </div>
      </div>

      {/* Right Panel - Video Preview */}
      <div>
        <Card className="p-4">
          <h4 className="font-semibold mb-3">Preview del video</h4>
          <div className="aspect-[9/16] bg-secondary rounded-lg flex items-center justify-center mb-4">
            {hookText && (
              <div className="text-center p-4">
                <p className="text-lg font-bold">{hookText}</p>
              </div>
            )}
            {!hookText && (
              <p className="text-sm text-muted-foreground">Hook escrito</p>
            )}
          </div>
          
          <div className="space-y-2">
            <Label className="text-sm">Duración: 24 s</Label>
            {/* Slider for duration adjustment would go here */}
          </div>
        </Card>

        <div className="flex justify-end pt-4 border-t mt-4">
          <Button 
            onClick={onNext} 
            size="lg"
            disabled={!allSectionsAssigned}
          >
            Continuar
          </Button>
        </div>
      </div>
    </div>
  );
}
