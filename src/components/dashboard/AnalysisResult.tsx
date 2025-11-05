import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Save, Wand2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { SaveTemplateDialog } from "./SaveTemplateDialog";
import { ApplyToBrandSection } from "./ApplyToBrandSection";

interface AnalysisResultProps {
  analysisId: string;
}

export function AnalysisResult({ analysisId }: AnalysisResultProps) {
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [showApplySection, setShowApplySection] = useState(false);
  const { data: analysis, isLoading } = useQuery({
    queryKey: ["video-analysis", analysisId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("video_analyses")
        .select("*")
        .eq("id", analysisId)
        .single();

      if (error) throw error;
      return data;
    },
  });

  if (isLoading) {
    return (
      <Card className="p-8">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent" />
          <p className="mt-4 text-muted-foreground">
            Detectando estructura mágica...
          </p>
        </div>
      </Card>
    );
  }

  if (!analysis || analysis.status !== "completed") {
    return null;
  }

  const structure = analysis.structure as any;
  const sections = structure.sections || [];

  return (
    <>
      <Card className="p-6">
        <div className="flex items-start justify-between mb-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle2 className="w-5 h-5 text-green-500" />
              <h3 className="text-xl font-bold">¡Video Analizado!</h3>
            </div>
            <p className="text-sm text-muted-foreground">
              Detectamos {sections.length} secciones con guion completo
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setShowSaveDialog(true)}>
              <Save className="w-4 h-4 mr-2" />
              Guardar como plantilla
            </Button>
            <Button onClick={() => setShowApplySection(true)}>
              <Wand2 className="w-4 h-4 mr-2" />
              Aplicar a mi marca
            </Button>
          </div>
        </div>

      {/* Hook */}
      {structure.hook && (
        <div className="mb-4 p-4 bg-secondary/50 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <Badge>Hook</Badge>
            <span className="text-xs text-muted-foreground">
              {structure.hook.type}
            </span>
          </div>
          <p className="text-sm">{structure.hook.text}</p>
        </div>
      )}

      {/* Complete Script Sections */}
      <div className="space-y-3">
        {sections.map((section: any, index: number) => (
          <div key={index} className="p-4 bg-secondary/30 rounded-lg">
            <div className="flex items-center gap-2 mb-3">
              <Badge variant="outline">{section.type}</Badge>
              <span className="text-xs text-muted-foreground">
                {section.duration || section.end_time - section.start_time}s
              </span>
            </div>
            <div className="space-y-2">
              <h4 className="text-sm font-semibold">Guion completo:</h4>
              <p className="text-sm leading-relaxed whitespace-pre-wrap">
                {section.text}
              </p>
            </div>
          </div>
        ))}
      </div>
      </Card>

      <SaveTemplateDialog
        open={showSaveDialog}
        onOpenChange={setShowSaveDialog}
        analysis={analysis}
      />

      {showApplySection && analysis && (
        <ApplyToBrandSection
          analysis={analysis}
          onClose={() => setShowApplySection(false)}
        />
      )}
    </>
  );
}
