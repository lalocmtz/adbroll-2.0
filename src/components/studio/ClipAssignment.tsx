import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Film, Sparkles } from "lucide-react";

interface ClipAssignmentProps {
  assignments: any[];
  onAssign: () => void;
  onUpdate: (assignments: any[]) => void;
  brandId: string | null;
}

export function ClipAssignment({
  assignments,
  onAssign,
  onUpdate,
  brandId,
}: ClipAssignmentProps) {
  if (!brandId) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No hay marca seleccionada
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {assignments.length === 0 ? (
        <div className="text-center py-8">
          <Film className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
          <p className="text-muted-foreground mb-4">
            Aún no has asignado clips a tu guion
          </p>
          <Button onClick={onAssign} size="lg">
            <Sparkles className="w-4 h-4 mr-2" />
            Asignar Clips con IA
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          {assignments.map((assignment, index) => (
            <Card key={index} className="p-4">
              <div className="flex items-start gap-4">
                <div className="flex-1">
                  <h3 className="font-medium mb-2">
                    {assignment.section_type} - Sección {assignment.section_index + 1}
                  </h3>
                  <p className="text-sm text-muted-foreground mb-3">
                    "{assignment.section_text}"
                  </p>
                  
                  {assignment.suggested_clips?.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-xs font-medium">Clips sugeridos:</p>
                      {assignment.suggested_clips.map((clip: any, clipIndex: number) => (
                        <div
                          key={clipIndex}
                          className="flex items-center gap-2 p-2 bg-secondary rounded text-sm"
                        >
                          <Film className="w-4 h-4 text-primary" />
                          <div className="flex-1">
                            <p className="font-medium">Clip {clipIndex + 1}</p>
                            <p className="text-xs text-muted-foreground">
                              {clip.reason}
                            </p>
                          </div>
                          <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded">
                            {Math.round(clip.confidence * 100)}%
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </Card>
          ))}

          <Button onClick={onAssign} variant="outline" className="w-full">
            <Sparkles className="w-4 h-4 mr-2" />
            Reasignar Clips con IA
          </Button>
        </div>
      )}
    </div>
  );
}
