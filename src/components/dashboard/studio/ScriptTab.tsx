import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2 } from "lucide-react";

interface ScriptSection {
  type: string;
  text: string;
  start_time?: number;
  end_time?: number;
  duration?: number;
}

interface ScriptTabProps {
  sections: ScriptSection[];
  onSectionsChange: (sections: ScriptSection[]) => void;
  onNext: () => void;
}

export function ScriptTab({ sections, onSectionsChange, onNext }: ScriptTabProps) {
  const handleTextChange = (index: number, newText: string) => {
    const updated = [...sections];
    updated[index] = { ...updated[index], text: newText };
    onSectionsChange(updated);
  };

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        {sections.map((section, index) => (
          <div key={index} className="p-4 bg-secondary/30 rounded-lg hover:bg-secondary/40 transition-colors">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="font-mono text-xs">
                  {section.type}
                </Badge>
                <span className="text-xs text-muted-foreground">
                  {section.duration || (section.end_time && section.start_time ? section.end_time - section.start_time : 0)}s
                </span>
              </div>
              <CheckCircle2 className="w-4 h-4 text-muted-foreground" />
            </div>
            <Textarea
              value={section.text}
              onChange={(e) => handleTextChange(index, e.target.value)}
              className="min-h-[100px] bg-background resize-none"
              placeholder="Edita el texto de esta sección..."
            />
          </div>
        ))}
      </div>

      <div className="flex justify-end pt-4 border-t">
        <Button size="lg" onClick={onNext}>
          Siguiente: Asignar Clips
        </Button>
      </div>
    </div>
  );
}
