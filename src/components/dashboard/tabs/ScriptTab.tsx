import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { CheckCircle2 } from "lucide-react";

interface ScriptSection {
  type: string;
  text: string;
  duration?: number;
}

interface ScriptTabProps {
  sections: ScriptSection[];
  analysis: any;
  onSectionsUpdate: (sections: ScriptSection[]) => void;
  onNext: () => void;
}

export function ScriptTab({ sections, analysis, onSectionsUpdate, onNext }: ScriptTabProps) {
  const structure = analysis?.structure as any;
  const hook = structure?.hook;

  const handleSectionTextChange = (index: number, newText: string) => {
    onSectionsUpdate(
      sections.map((section, i) => (i === index ? { ...section, text: newText } : section))
    );
  };

  return (
    <div className="space-y-6">
      <div className="grid md:grid-cols-2 gap-6">
        {/* Original Script */}
        <div>
          <h3 className="font-semibold mb-4 flex items-center gap-2">
            <span>Guion Original</span>
            <Badge variant="secondary">Completo</Badge>
          </h3>
          <div className="p-4 bg-secondary/30 rounded-lg max-h-[600px] overflow-y-auto">
            <p className="text-sm leading-relaxed whitespace-pre-wrap">
              {analysis?.transcription || "Sin transcripción disponible"}
            </p>
          </div>
        </div>

        {/* Structured Script */}
        <div>
          <h3 className="font-semibold mb-4 flex items-center gap-2">
            <span>Estructura Auto-detectada</span>
            <Badge>{sections.length} bloques</Badge>
          </h3>
          <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2">
            {hook && (
              <div className="p-4 bg-accent/10 border border-accent/20 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Badge className="bg-accent text-white">Hook</Badge>
                  <span className="text-xs text-muted-foreground">
                    {hook.type}
                  </span>
                </div>
                <Textarea
                  value={hook.text}
                  className="min-h-[80px] bg-background/50 border-accent/20"
                  readOnly
                />
              </div>
            )}

            {sections.map((section, index) => (
              <div key={index} className="p-4 bg-secondary/50 rounded-lg">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{section.type}</Badge>
                    {section.duration && (
                      <span className="text-xs text-muted-foreground">
                        {section.duration}s
                      </span>
                    )}
                  </div>
                  <CheckCircle2 className="w-4 h-4 text-muted-foreground" />
                </div>
                <Textarea
                  value={section.text}
                  onChange={(e) => handleSectionTextChange(index, e.target.value)}
                  className="min-h-[100px] bg-background/50"
                  placeholder="Edita el texto de esta sección..."
                />
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="flex justify-end gap-3 pt-4 border-t">
        <Button variant="outline" disabled>
          Adaptar a mi marca
        </Button>
        <Button onClick={onNext}>
          Siguiente: Asignar Clips
        </Button>
      </div>
    </div>
  );
}
