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
      url.includes("facebook.com")
    );
  },
  { message: "Solo se permiten enlaces de TikTok, Instagram, YouTube o Facebook" }
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
        <p className="text-muted-foreground mb-6">
          Pega el enlace de un video viral de YouTube, TikTok o Instagram
        </p>
        <p className="text-xs text-muted-foreground mb-4">
          ⚠️ Nota: Para TikTok e Instagram, necesitarás descargar el video primero usando{" "}
          <a 
            href="https://snaptik.app" 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-primary underline hover:text-primary/80"
          >
            SnapTik
          </a>
          {" "}y luego subirlo en la sección "Subir Video"
        </p>

        <div className="flex gap-3 mb-4">
          <Input
            type="url"
            placeholder="https://www.tiktok.com/@..."
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
