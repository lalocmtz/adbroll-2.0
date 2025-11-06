import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Download, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface ResultsTabProps {
  projectId: string | null;
  onComplete: () => void;
}

export function ResultsTab({ projectId, onComplete }: ResultsTabProps) {
  const { data: variants, isLoading } = useQuery({
    queryKey: ["variants", projectId],
    queryFn: async () => {
      if (!projectId) return [];
      const { data, error } = await supabase
        .from("variants")
        .select("*")
        .eq("project_id", projectId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!projectId,
    refetchInterval: (query) => {
      const data = query.state.data;
      const hasProcessing = data?.some((v: any) => 
        v.status === "queued" || v.status === "processing"
      );
      return hasProcessing ? 3000 : false;
    },
  });

  useEffect(() => {
    if (variants && variants.length > 0) {
      const allCompleted = variants.every((v: any) => 
        v.status === "completed" || v.status === "failed"
      );
      if (allCompleted) {
        onComplete();
        toast.success("¡Listo para brillar! Aquí tienes tus variantes.");
      }
    }
  }, [variants, onComplete]);

  if (isLoading || !variants) {
    return (
      <div className="text-center py-12 space-y-4">
        <div className="inline-block h-12 w-12 animate-spin rounded-full border-4 border-solid border-primary border-r-transparent" />
        <p className="text-lg font-semibold">Preparando tus variantes...</p>
      </div>
    );
  }

  if (variants.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">
          No hay variantes disponibles todavía
        </p>
      </div>
    );
  }

  const handleDownload = async (videoUrl: string, variantId: string) => {
    try {
      const response = await fetch(videoUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `variant-${variantId}.mp4`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.success("Descarga iniciada");
    } catch (error) {
      toast.error("Error al descargar");
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h3 className="text-2xl font-bold mb-2">
          ¡Listo para brillar!
        </h3>
        <p className="text-muted-foreground">
          Aquí tienes tus {variants.length} variantes
        </p>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {variants.map((variant: any, index: number) => (
          <Card key={variant.id} className="p-4 space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-semibold">Variante {index + 1}</h4>
              {variant.status === "completed" && (
                <Badge className="bg-green-500">
                  <CheckCircle2 className="w-3 h-3 mr-1" />
                  Completado
                </Badge>
              )}
              {variant.status === "processing" && (
                <Badge variant="secondary">
                  <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                  Procesando
                </Badge>
              )}
              {variant.status === "queued" && (
                <Badge variant="outline">En cola</Badge>
              )}
              {variant.status === "failed" && (
                <Badge variant="destructive">
                  <AlertCircle className="w-3 h-3 mr-1" />
                  Error
                </Badge>
              )}
            </div>

            {variant.video_url && (
              <div className="aspect-[9/16] bg-secondary rounded-lg overflow-hidden">
                <video
                  src={variant.video_url}
                  controls
                  className="w-full h-full object-cover"
                />
              </div>
            )}

            {!variant.video_url && variant.status === "processing" && (
              <div className="aspect-[9/16] bg-secondary rounded-lg flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
              </div>
            )}

            {variant.status === "completed" && variant.video_url && (
              <div className="space-y-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={() => handleDownload(variant.video_url, variant.id)}
                >
                  <Download className="w-4 h-4 mr-2" />
                  Descargar MP4
                </Button>
                {variant.srt_url && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={() => window.open(variant.srt_url, "_blank")}
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Descargar SRT
                  </Button>
                )}
              </div>
            )}

            {variant.error_message && (
              <p className="text-xs text-destructive">
                {variant.error_message}
              </p>
            )}

            <div className="text-xs text-muted-foreground">
              {new Date(variant.created_at).toLocaleString()}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
