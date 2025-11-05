import { Card } from "@/components/ui/card";
import { Sparkles } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

interface HookPreviewProps {
  clipId: string | null;
  headlineStyle: "text-over-black" | "text-over-video" | "none";
}

export function HookPreview({ clipId, headlineStyle }: HookPreviewProps) {
  const [videoUrl, setVideoUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!clipId) return;

    const loadVideo = async () => {
      const { data: clip } = await supabase
        .from("broll_files")
        .select("storage_path")
        .eq("id", clipId)
        .single();

      if (clip?.storage_path) {
        const { data } = await supabase.storage
          .from("broll")
          .createSignedUrl(clip.storage_path, 3600);
        
        if (data?.signedUrl) {
          setVideoUrl(data.signedUrl);
        }
      }
    };

    loadVideo();
  }, [clipId]);

  if (!clipId) return null;

  return (
    <Card className="p-6 bg-gradient-to-br from-primary/5 to-transparent border-primary/20">
      <div className="flex items-center gap-2 mb-4">
        <Sparkles className="w-4 h-4 text-primary" />
        <p className="text-sm font-medium">Así empieza tu historia… ✨</p>
      </div>
      
      <div className="relative aspect-[9/16] max-w-[200px] mx-auto rounded-lg overflow-hidden bg-black">
        {videoUrl && (
          <video
            src={videoUrl}
            className="w-full h-full object-cover"
            muted
            autoPlay
            loop
          />
        )}
        
        {/* Headline overlay demo */}
        {headlineStyle !== "none" && (
          <div className={`absolute inset-0 flex items-center justify-center p-4 ${
            headlineStyle === "text-over-black" ? "bg-black/60" : ""
          }`}>
            <p className={`text-center font-bold text-lg ${
              headlineStyle === "text-over-black" 
                ? "text-white" 
                : "text-white drop-shadow-lg"
            }`}>
              Tu headline aquí
            </p>
          </div>
        )}
      </div>
      
      <p className="text-xs text-muted-foreground text-center mt-3">
        Vista previa del gancho con {
          headlineStyle === "text-over-black" ? "texto sobre fondo negro" :
          headlineStyle === "text-over-video" ? "texto sobre video" :
          "sin headline"
        }
      </p>
    </Card>
  );
}
