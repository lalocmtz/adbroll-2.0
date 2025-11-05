import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { RefreshCw, Edit2, Check, X } from "lucide-react";
import { useSignedUrl } from "@/hooks/useSignedUrl";

interface ScriptSectionProps {
  section: {
    id: string;
    type: string;
    title: string;
    expected_duration: number;
  };
  script: string;
  clip: any;
  onUpdate: (newText: string) => void;
  onRegenerate: () => void;
  isRegenerating: boolean;
}

export function ScriptSection({
  section,
  script,
  clip,
  onUpdate,
  onRegenerate,
  isRegenerating,
}: ScriptSectionProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedText, setEditedText] = useState(script);
  const { signedUrl } = useSignedUrl(clip?.storage_path || null);

  const handleSave = () => {
    onUpdate(editedText);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditedText(script);
    setIsEditing(false);
  };

  return (
    <Card className="p-4 space-y-3">
      {/* Section Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Badge className="bg-black text-white font-semibold px-3 py-1">
            {section.type.toUpperCase()}
          </Badge>
          <span className="text-sm font-medium">{section.title}</span>
          <span className="text-xs text-muted-foreground">
            ({section.expected_duration}s)
          </span>
        </div>
        <div className="flex items-center gap-2">
          {!isEditing && (
            <>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsEditing(true)}
              >
                <Edit2 className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={onRegenerate}
                disabled={isRegenerating}
              >
                <RefreshCw
                  className={`w-4 h-4 ${isRegenerating ? "animate-spin" : ""}`}
                />
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Video Preview */}
      {clip && (
        <div className="w-full h-32 bg-secondary/30 rounded-lg overflow-hidden">
          {clip.thumbnail_url ? (
            <img
              src={clip.thumbnail_url}
              alt={clip.name}
              className="w-full h-full object-cover"
            />
          ) : signedUrl ? (
            <video
              src={signedUrl}
              className="w-full h-full object-cover"
              muted
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-muted-foreground">
              Cargando...
            </div>
          )}
        </div>
      )}

      {/* Script Text */}
      {isEditing ? (
        <div className="space-y-2">
          <Textarea
            value={editedText}
            onChange={(e) => setEditedText(e.target.value)}
            rows={4}
            className="resize-none"
          />
          <div className="flex justify-end gap-2">
            <Button variant="outline" size="sm" onClick={handleCancel}>
              <X className="w-4 h-4 mr-1" />
              Cancelar
            </Button>
            <Button size="sm" onClick={handleSave}>
              <Check className="w-4 h-4 mr-1" />
              Guardar
            </Button>
          </div>
        </div>
      ) : (
        <p className="text-sm leading-relaxed">{script}</p>
      )}
    </Card>
  );
}
