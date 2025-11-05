import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { SectionTooltip } from "./SectionTooltip";
import { 
  CheckCircle2, 
  Clock, 
  Sparkles, 
  ThumbsUp, 
  ThumbsDown,
  Wand2
} from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

interface Section {
  section: string;
  start_time: string;
  end_time: string;
  summary: string;
  purpose: string;
  transcript_segment: string;
  confidence_score: number;
  explanation: string;
}

interface VideoAnalysisResultProps {
  analysisId: string;
  onAdaptToBrand: () => void;
}

const purposeLabels: Record<string, string> = {
  captar_atencion: "Captar Atención",
  generar_empatia: "Generar Empatía",
  educar: "Educar",
  validar_socialmente: "Validación Social",
  mostrar_producto: "Mostrar Producto",
  conversion: "Conversión",
  cierre_emocional: "Cierre Emocional"
};

export function VideoAnalysisResult({ analysisId, onAdaptToBrand }: VideoAnalysisResultProps) {
  const [feedback, setFeedback] = useState<string>("");
  const [rating, setRating] = useState<number | null>(null);

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
    refetchInterval: (query) => {
      // Poll every 3 seconds if still processing
      return query.state.data?.status === "processing" ? 3000 : false;
    },
  });

  const handleSubmitFeedback = async () => {
    if (!rating) {
      toast.error("Por favor califica el análisis primero");
      return;
    }

    try {
      const { error } = await supabase
        .from("video_analyses")
        .update({
          analysis_quality_score: rating * 20, // Convert 1-5 to 20-100
          user_feedback: feedback || null,
          feedback_timestamp: new Date().toISOString()
        })
        .eq("id", analysisId);

      if (error) throw error;

      toast.success("¡Gracias por tu feedback!");
      setFeedback("");
      setRating(null);
    } catch (error: any) {
      console.error("Error submitting feedback:", error);
      toast.error("Error al enviar feedback");
    }
  };

  if (isLoading || !analysis || analysis.status === "processing") {
    return (
      <Card className="p-8">
        <div className="flex items-center justify-center gap-3">
          <Clock className="w-5 h-5 animate-spin text-primary" />
          <p className="text-muted-foreground">Analizando video...</p>
        </div>
      </Card>
    );
  }

  if (analysis.status === "failed") {
    return (
      <Card className="p-8 border-destructive">
        <div className="text-center">
          <h3 className="text-lg font-semibold text-destructive mb-2">Error en el análisis</h3>
          <p className="text-sm text-muted-foreground">{analysis.error_message}</p>
        </div>
      </Card>
    );
  }

  if (analysis.status !== "completed") {
    return null;
  }

  const structure = analysis.structure as { sections?: Section[]; overall_narrative_score?: number; key_insights?: string[] };
  const sections = structure?.sections || [];
  const narrativeScore = (structure?.overall_narrative_score || 0) * 100;

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="p-6">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle2 className="w-6 h-6 text-green-500" />
              <h3 className="text-2xl font-bold">Análisis Completado</h3>
            </div>
            <p className="text-muted-foreground mb-4">
              Detectamos {sections.length} secciones narrativas en tu video
            </p>
            
            {/* Narrative Score */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Calidad Narrativa</span>
                <span className="font-semibold">{Math.round(narrativeScore)}%</span>
              </div>
              <Progress value={narrativeScore} className="h-2" />
            </div>
          </div>

          <Button onClick={onAdaptToBrand} size="lg" className="ml-4">
            <Wand2 className="w-4 h-4 mr-2" />
            Adaptar a mi Marca
          </Button>
        </div>
      </Card>

      {/* Sections Timeline */}
      <Card className="p-6">
        <h4 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Sparkles className="w-5 h-5" />
          Estructura Narrativa Detectada
        </h4>

        <div className="space-y-4">
          {sections.map((section, index) => (
            <div
              key={index}
              className="border rounded-lg p-4 hover:border-primary transition-colors"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <h5 className="font-semibold text-lg">{section.section}</h5>
                  <SectionTooltip explanation={section.explanation} />
                  <Badge variant="outline" className="ml-2">
                    {purposeLabels[section.purpose] || section.purpose}
                  </Badge>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Clock className="w-4 h-4" />
                  <span>{section.start_time} - {section.end_time}</span>
                </div>
              </div>

              <p className="text-sm text-muted-foreground mb-3">
                {section.summary}
              </p>

              <div className="bg-muted rounded p-3 text-sm italic">
                "{section.transcript_segment}"
              </div>

              {/* Confidence Score */}
              <div className="mt-3 flex items-center gap-2">
                <span className="text-xs text-muted-foreground">Confianza:</span>
                <Progress 
                  value={section.confidence_score * 100} 
                  className="h-1.5 w-24" 
                />
                <span className="text-xs font-medium">
                  {Math.round(section.confidence_score * 100)}%
                </span>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Key Insights */}
      {structure.key_insights && structure.key_insights.length > 0 && (
        <Card className="p-6">
          <h4 className="text-lg font-semibold mb-3">💡 Insights Clave</h4>
          <ul className="space-y-2">
            {structure.key_insights.map((insight, index) => (
              <li key={index} className="flex items-start gap-2 text-sm">
                <span className="text-primary mt-0.5">•</span>
                <span>{insight}</span>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {/* Feedback Section */}
      <Card className="p-6">
        <h4 className="text-lg font-semibold mb-4">¿Qué te pareció este análisis?</h4>
        
        <div className="flex gap-3 mb-4">
          {[1, 2, 3, 4, 5].map((score) => (
            <button
              key={score}
              onClick={() => setRating(score)}
              className={`
                flex-1 p-3 rounded-lg border-2 transition-all
                ${rating === score 
                  ? 'border-primary bg-primary/10' 
                  : 'border-border hover:border-primary/50'
                }
              `}
            >
              {score >= 4 ? (
                <ThumbsUp className={`w-5 h-5 mx-auto ${rating === score ? 'text-primary' : 'text-muted-foreground'}`} />
              ) : (
                <ThumbsDown className={`w-5 h-5 mx-auto ${rating === score ? 'text-primary' : 'text-muted-foreground'}`} />
              )}
              <span className="text-xs mt-1 block">{score}</span>
            </button>
          ))}
        </div>

        <Textarea
          placeholder="¿Algo que podamos mejorar? (opcional)"
          value={feedback}
          onChange={(e) => setFeedback(e.target.value)}
          className="mb-3"
          rows={3}
        />

        <Button 
          onClick={handleSubmitFeedback} 
          disabled={!rating}
          className="w-full"
        >
          Enviar Feedback
        </Button>
      </Card>
    </div>
  );
}