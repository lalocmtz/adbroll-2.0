import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { RefreshCw, Edit2, Check, X } from "lucide-react";

interface ScriptSectionProps {
  section: {
    id: string;
    type: string;
    title: string;
    expected_duration: number;
  };
  script: string;
  onUpdate: (newText: string) => void;
  onRegenerate: () => void;
  isRegenerating: boolean;
}

export function ScriptSection({
  section,
  script,
  onUpdate,
  onRegenerate,
  isRegenerating,
}: ScriptSectionProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedText, setEditedText] = useState(script);

  const handleSave = () => {
    onUpdate(editedText);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditedText(script);
    setIsEditing(false);
  };

  return (
    <div className="flex items-start gap-3 p-3 border border-border rounded-lg hover:bg-muted/30 transition-colors">
      {/* Section Badge */}
      <Badge className="bg-black text-white font-bold uppercase text-xs shrink-0 mt-0.5 px-2.5 py-1">
        {section.type}
      </Badge>

      {/* Script Text Area */}
      <div className="flex-1 min-w-0">
        {isEditing ? (
          <Textarea
            value={editedText}
            onChange={(e) => setEditedText(e.target.value)}
            className="min-h-[60px] text-sm resize-none"
            placeholder="Escribe el guión para esta sección..."
            autoFocus
          />
        ) : (
          <p className="text-sm leading-relaxed text-foreground">
            {script || "Generando texto..."}
          </p>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex gap-1 shrink-0">
        {!isEditing ? (
          <>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => setIsEditing(true)}
              disabled={isRegenerating}
            >
              <Edit2 className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={onRegenerate}
              disabled={isRegenerating}
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isRegenerating ? "animate-spin" : ""}`} />
            </Button>
          </>
        ) : (
          <>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={handleCancel}
            >
              <X className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="default"
              size="icon"
              className="h-7 w-7"
              onClick={handleSave}
            >
              <Check className="h-3.5 w-3.5" />
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
