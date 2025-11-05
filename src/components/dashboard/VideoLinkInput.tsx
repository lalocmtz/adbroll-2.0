import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Link2, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { z } from "zod";

const urlSchema = z.string().url("Ingresa una URL válida").refine(
  (url) => {
    return (
      url.includes("tiktok.com") ||
      url.includes("instagram.com") ||
      url.includes("youtube.com") ||
      url.includes("youtu.be") ||
      url.includes("facebook.com") ||
      url.includes("fb.watch") ||
      url.includes("threads.net") ||
      url.includes("vimeo.com") ||
      url.includes("reddit.com")
    );
  },
  { message: "Solo se permiten enlaces de redes sociales populares (TikTok, Instagram, YouTube, Facebook, Threads, Vimeo, Reddit)" }
);

interface VideoLinkInputProps {
  brandId: string | null;
  onAnalysisStart: (analysisId: string) => void;
}

export function VideoLinkInput({ brandId, onAnalysisStart }: VideoLinkInputProps) {
  const [videoUrl, setVideoUrl] = useState("");
  const [loading, setLoading] = useState(false);

  const handleAnalyze = async () => {
    if (!brandId) {
      toast.error("Selecciona una marca primero");
      return;
    }

    // Validate URL
    const validation = urlSchema.safeParse(videoUrl);
    if (!validation.success) {
      toast.error(validation.error.errors[0].message);
      return;
    }

    setLoading(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error("Debes iniciar sesión");
        return;
      }

      // Step 1: Extract audio and transcribe
      toast.info("Extrayendo audio del video...");
      const { data: extractData, error: extractError } = await supabase.functions.invoke(
        "extract-audio-from-link",
        {
          body: {
            video_url: videoUrl,
            brand_id: brandId,
          },
        }
      );

      if (extractError) throw extractError;

      // Step 2: Analyze narrative structure
      toast.info("Analizando estructura narrativa...");
      const { data: analyzeData, error: analyzeError } = await supabase.functions.invoke(
        "analyze-video",
        {
          body: {
            analysis_id: extractData.analysis_id,
            brand_id: brandId,
          },
        }
      );

      if (analyzeError) throw analyzeError;

      toast.success("¡Video analizado exitosamente!");
      onAnalysisStart(extractData.analysis_id);
      setVideoUrl("");
    } catch (error: any) {
      console.error("Error analyzing video:", error);
      toast.error(error.message || "Error al analizar el video");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="p-8">
      <div className="max-w-2xl mx-auto text-center">
        <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center mx-auto mb-4">
          <Link2 className="w-8 h-8 text-white" />
        </div>
        
        <h2 className="text-2xl font-bold mb-2">Pega tu link</h2>
        <p className="text-muted-foreground mb-4">
          Pega el enlace de un video viral de cualquier red social
        </p>
        
        <div className="bg-gradient-to-br from-primary/10 to-accent/10 border border-primary/20 rounded-lg p-4 mb-6">
          <div className="flex items-start gap-3">
            <div className="text-2xl">✨</div>
            <div className="space-y-2 flex-1">
              <p className="font-semibold text-foreground">
                Extracción automática habilitada
              </p>
              <p className="text-sm text-muted-foreground">
                Soportamos TikTok, Instagram, YouTube, Facebook, Threads, Vimeo, Reddit y más
              </p>
              <div className="flex flex-wrap gap-2 mt-3">
                <span className="text-xs bg-background/80 px-2 py-1 rounded">TikTok</span>
                <span className="text-xs bg-background/80 px-2 py-1 rounded">Instagram</span>
                <span className="text-xs bg-background/80 px-2 py-1 rounded">YouTube</span>
                <span className="text-xs bg-background/80 px-2 py-1 rounded">Facebook</span>
                <span className="text-xs bg-background/80 px-2 py-1 rounded">Threads</span>
                <span className="text-xs bg-background/80 px-2 py-1 rounded">Vimeo</span>
                <span className="text-xs bg-background/80 px-2 py-1 rounded">Reddit</span>
              </div>
            </div>
          </div>
        </div>

        <div className="flex gap-3 mb-4">
          <Input
            type="url"
            placeholder="https://www.tiktok.com/@... o cualquier red social"
            value={videoUrl}
            onChange={(e) => setVideoUrl(e.target.value)}
            disabled={loading || !brandId}
            className="flex-1"
          />
          <Button onClick={handleAnalyze} disabled={loading || !brandId || !videoUrl}>
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Analizando...
              </>
            ) : (
              "Analizar"
            )}
          </Button>
        </div>

        <p className="text-xs text-muted-foreground">
          La IA detectará la estructura mágica y creará variantes optimizadas
        </p>
      </div>
    </Card>
  );
}
