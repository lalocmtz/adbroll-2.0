import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface AnalysisResultProps {
  analysisId: string;
  onGenerateScripts: (analysisId: string) => void;
}

export function AnalysisResult({ analysisId, onGenerateScripts }: AnalysisResultProps) {
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
    <Card className="p-6">
      <div className="flex items-start justify-between mb-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle2 className="w-5 h-5 text-green-500" />
            <h3 className="text-xl font-bold">¡Video Analizado!</h3>
          </div>
          <p className="text-sm text-muted-foreground">
            Detectamos {sections.length} secciones en tu video
          </p>
        </div>
        <Button onClick={() => onGenerateScripts(analysisId)}>
          <Sparkles className="w-4 h-4 mr-2" />
          Generar Guiones
        </Button>
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

      {/* Sections */}
      <div className="space-y-3">
        {sections.map((section: any, index: number) => (
          <div key={index} className="p-4 bg-secondary/30 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <Badge variant="outline">{section.type}</Badge>
              <span className="text-xs text-muted-foreground">
                {section.duration || section.end_time - section.start_time}s
              </span>
            </div>
            <p className="text-sm">{section.text}</p>
          </div>
        ))}
      </div>

      {/* Key Phrases */}
      {structure.key_phrases && structure.key_phrases.length > 0 && (
        <div className="mt-6 pt-6 border-t">
          <h4 className="text-sm font-medium mb-3">Frases Ganadoras</h4>
          <div className="flex flex-wrap gap-2">
            {structure.key_phrases.map((phrase: string, index: number) => (
              <Badge key={index} variant="secondary">
                {phrase}
              </Badge>
            ))}
          </div>
        </div>
      )}
    </Card>
  );
}
