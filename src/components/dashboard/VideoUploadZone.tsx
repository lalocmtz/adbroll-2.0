import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Upload, Link2, Loader2, FileVideo } from "lucide-react";
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

interface VideoUploadZoneProps {
  brandId: string | null;
  onAnalysisStart: (analysisId: string) => void;
}

export function VideoUploadZone({ brandId, onAnalysisStart }: VideoUploadZoneProps) {
  const [videoUrl, setVideoUrl] = useState("");
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);

  const handleAnalyzeUrl = async () => {
    if (!brandId) {
      toast.error("Selecciona una marca primero");
      return;
    }

    const validation = urlSchema.safeParse(videoUrl);
    if (!validation.success) {
      toast.error(validation.error.errors[0].message);
      return;
    }

    setUploading(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error("Debes iniciar sesión");
        return;
      }

      // Step 1: Transcribe video (creates analysis record)
      const { data: transcribeData, error: transcribeError } = await supabase.functions.invoke("transcribe-video", {
        body: {
          video_url: videoUrl,
          brand_id: brandId,
        },
      });

      if (transcribeError) throw transcribeError;

      const analysisId = transcribeData.analysis_id;
      onAnalysisStart(analysisId);

      // Step 2: Analyze video structure
      const { error: analyzeError } = await supabase.functions.invoke("analyze-video", {
        body: {
          video_url: videoUrl,
          brand_id: brandId,
          analysis_id: analysisId,
        },
      });

      if (analyzeError) throw analyzeError;

      toast.success("¡Video analizado exitosamente!");
      setVideoUrl("");
    } catch (error: any) {
      console.error("Error analyzing video:", error);
      toast.error(error.message || "Error al analizar el video");
    } finally {
      setUploading(false);
    }
  };

  const handleFileUpload = useCallback(async (file: File) => {
    if (!brandId) {
      toast.error("Selecciona una marca primero");
      return;
    }

    if (!file.type.startsWith('video/')) {
      toast.error("Solo se permiten archivos de video");
      return;
    }

    if (file.size > 100 * 1024 * 1024) { // 100MB limit
      toast.error("El archivo es demasiado grande (máximo 100MB)");
      return;
    }

    setUploading(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error("Debes iniciar sesión");
        return;
      }

      // Step 1: Upload to storage
      const fileName = `${session.user.id}/${Date.now()}-${file.name}`;
      const { error: uploadError } = await supabase.storage
        .from('uploaded-videos')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      // Step 2: Transcribe video (creates analysis record)
      const { data: transcribeData, error: transcribeError } = await supabase.functions.invoke("transcribe-video", {
        body: {
          video_file_path: fileName,
          brand_id: brandId,
        },
      });

      if (transcribeError) throw transcribeError;

      const analysisId = transcribeData.analysis_id;
      onAnalysisStart(analysisId);

      // Step 3: Analyze video structure
      const { error: analyzeError } = await supabase.functions.invoke("analyze-video", {
        body: {
          video_file_path: fileName,
          brand_id: brandId,
          analysis_id: analysisId,
        },
      });

      if (analyzeError) throw analyzeError;

      toast.success("¡Video subido y analizado exitosamente!");
    } catch (error: any) {
      console.error("Error uploading video:", error);
      toast.error(error.message || "Error al subir el video");
    } finally {
      setUploading(false);
    }
  }, [brandId, onAnalysisStart]);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  };

  return (
    <Card className="p-8">
      <div className="max-w-3xl mx-auto">
        {/* URL Input Section */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center mx-auto mb-4">
            <Link2 className="w-8 h-8 text-white" />
          </div>
          
          <h2 className="text-2xl font-bold mb-2">Sube tu video para análisis</h2>
          <p className="text-muted-foreground mb-6">
            Analiza videos de TikTok, Instagram, YouTube, Facebook subiendo el archivo .mp4
          </p>

          <div className="bg-muted/50 p-4 rounded-lg mb-6">
            <p className="text-sm text-muted-foreground">
              💡 <strong>Tip:</strong> Descarga el video desde la red social primero, luego súbelo aquí para obtener el análisis narrativo completo con transcripción.
            </p>
          </div>
        </div>

        {/* URL input and divider temporarily disabled - social media URLs require download */}
        <div className="hidden">
          <div className="flex gap-3 mb-4">
            <Input
              type="url"
              placeholder="https://www.tiktok.com/@..."
              value={videoUrl}
              onChange={(e) => setVideoUrl(e.target.value)}
              disabled={uploading || !brandId}
              className="flex-1"
            />
            <Button onClick={handleAnalyzeUrl} disabled={uploading || !brandId || !videoUrl}>
              {uploading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Analizando...
                </>
              ) : (
                "Analizar"
              )}
            </Button>
          </div>

          <div className="relative my-8">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-4 bg-background text-muted-foreground">o</span>
            </div>
          </div>
        </div>

        {/* File Upload Section */}
        <div
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          className={`
            border-2 border-dashed rounded-lg p-12 text-center transition-colors
            ${dragActive ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'}
            ${!brandId || uploading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
          `}
          onClick={() => {
            if (!brandId || uploading) return;
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = 'video/*';
            input.onchange = (e) => {
              const file = (e.target as HTMLInputElement).files?.[0];
              if (file) handleFileUpload(file);
            };
            input.click();
          }}
        >
          <div className="flex flex-col items-center gap-4">
            {uploading ? (
              <>
                <Loader2 className="w-12 h-12 text-primary animate-spin" />
                <p className="text-lg font-medium">Subiendo y analizando...</p>
              </>
            ) : (
              <>
                <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
                  {dragActive ? (
                    <FileVideo className="w-8 h-8 text-primary" />
                  ) : (
                    <Upload className="w-8 h-8 text-muted-foreground" />
                  )}
                </div>
                <div>
                  <p className="text-lg font-medium mb-1">
                    Arrastra tu video aquí o haz clic para seleccionar
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Formatos soportados: MP4, MOV, AVI (máximo 100MB)
                  </p>
                </div>
              </>
            )}
          </div>
        </div>

        <p className="text-xs text-muted-foreground text-center mt-6">
          💡 La IA detectará automáticamente la estructura narrativa y creará variantes optimizadas
        </p>
      </div>
    </Card>
  );
}