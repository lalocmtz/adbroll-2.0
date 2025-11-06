import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Download, Copy, FolderOpen, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface ResultsTabProps {
  projectId: string | null;
}

export function ResultsTab({ projectId }: ResultsTabProps) {
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
  });

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
      toast.success("Descargando video...");
    } catch (error) {
      toast.error("Error al descargar el video");
    }
  };

  if (isLoading) {
    return (
      <div className="text-center py-12">
        <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" />
        <p className="text-muted-foreground">Cargando resultados...</p>
      </div>
    );
  }

  if (!variants || variants.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground mb-4">
          No hay variantes aún. Completa el flujo para generar tus videos.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold">¡Listo para brillar!</h2>
        <p className="text-muted-foreground">
          Aquí tienes tus {variants.length} variantes listas para publicar
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {variants.map((variant, index) => (
          <Card key={variant.id} className="overflow-hidden">
            <div className="aspect-[9/16] bg-secondary relative">
              {variant.video_url ? (
                <video
                  src={variant.video_url}
                  controls
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="flex items-center justify-center h-full">
                  <Loader2 className="w-8 h-8 animate-spin" />
                </div>
              )}
              <div className="absolute top-2 left-2">
                <Badge>Variante {String.fromCharCode(65 + index)}</Badge>
              </div>
              <div className="absolute top-2 right-2">
                <Badge variant={variant.status === "completed" ? "default" : "secondary"}>
                  {variant.status}
                </Badge>
              </div>
            </div>
            
            <div className="p-4 space-y-3">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>
                  {new Date(variant.created_at).toLocaleDateString("es-MX", {
                    day: "numeric",
                    month: "short",
                  })}
                </span>
                <span>{variant.credits_used} créditos</span>
              </div>
              
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="flex-1"
                  onClick={() => variant.video_url && handleDownload(variant.video_url, variant.id)}
                  disabled={!variant.video_url}
                >
                  <Download className="w-4 h-4 mr-1" />
                  Descargar
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => toast.info("Función próximamente")}
                >
                  <Copy className="w-4 h-4" />
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => toast.info("Función próximamente")}
                >
                  <FolderOpen className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
