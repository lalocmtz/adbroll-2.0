import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Volume2, Play, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface VoiceSelectionProps {
  selectedVoice: string;
  onVoiceSelect: (voiceId: string) => void;
  onGenerate: () => void;
  isGenerating: boolean;
  voiceoverUrl: string | null;
  voiceSettings?: VoiceSettings;
  onVoiceSettingsChange: (settings: VoiceSettings) => void;
}

export interface VoiceSettings {
  stability: number;
  similarity_boost: number;
  style: number;
  use_speaker_boost: boolean;
}

const VOICES = [
  { id: "EXAVITQu4vr4xnSDxMaL", name: "Sarah", description: "Femenina, amigable", language: "es" },
  { id: "FGY2WhTYpPnrIDTdsKH5", name: "Laura", description: "Femenina, profesional", language: "es" },
  { id: "IKne3meq5aSn9XLyUdCD", name: "Charlie", description: "Masculina, cálida", language: "es" },
  { id: "JBFqnCBsd6RMkjVDRZzb", name: "George", description: "Masculina, autoritaria", language: "es" },
  { id: "9BWtsMINqrJLrRacOk9x", name: "Aria", description: "Femenina, versátil", language: "es" },
  { id: "CwhRBWXzGAHq8TQ4Fs17", name: "Roger", description: "Masculina, confiable", language: "es" },
];

const PREVIEW_TEXT = "Hola, soy una voz de prueba para tu proyecto. ¿Te gusta cómo sueno?";

export function VoiceSelection({
  selectedVoice,
  onVoiceSelect,
  onGenerate,
  isGenerating,
  voiceoverUrl,
  voiceSettings = {
    stability: 0.5,
    similarity_boost: 0.75,
    style: 0,
    use_speaker_boost: false,
  },
  onVoiceSettingsChange,
}: VoiceSelectionProps) {
  const [previewingVoice, setPreviewingVoice] = useState<string | null>(null);
  const { toast } = useToast();

  const handlePreviewVoice = async (voiceId: string) => {
    setPreviewingVoice(voiceId);
    
    try {
      const { data, error } = await supabase.functions.invoke(
        "preview-voice",
        {
          body: {
            text: PREVIEW_TEXT,
            voiceId,
            settings: voiceSettings,
          },
        }
      );

      if (error) throw error;

      console.log("Preview voice response:", data);

      // Play audio preview - create full URL from Supabase storage
      const audio = new Audio(data.audioUrl);
      
      audio.onerror = (e) => {
        console.error("Audio playback error:", e);
        toast({
          variant: "destructive",
          title: "Error al reproducir audio",
          description: "No se pudo reproducir el preview de la voz",
        });
        setPreviewingVoice(null);
      };

      audio.onended = () => {
        console.log("Audio preview ended");
        setPreviewingVoice(null);
      };

      await audio.play();
      console.log("Audio playing...");
      
    } catch (error: any) {
      console.error("Error previewing voice:", error);
      toast({
        variant: "destructive",
        title: "Error al previsualizar voz",
        description: error.message,
      });
      setPreviewingVoice(null);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Volume2 className="w-5 h-5" />
          Selecciona la voz
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {VOICES.map((voice) => (
            <Card
              key={voice.id}
              className={`p-3 cursor-pointer transition-all ${
                selectedVoice === voice.id
                  ? "ring-2 ring-primary bg-primary/5"
                  : "hover:bg-secondary"
              }`}
              onClick={() => onVoiceSelect(voice.id)}
            >
              <div className="space-y-2">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <p className="font-medium text-sm">{voice.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {voice.description}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-8 w-8 p-0"
                    onClick={(e) => {
                      e.stopPropagation();
                      handlePreviewVoice(voice.id);
                    }}
                    disabled={previewingVoice === voice.id}
                  >
                    {previewingVoice === voice.id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Play className="w-4 h-4" />
                    )}
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>

      {/* Voice Settings */}
      <Card className="p-4">
        <h4 className="font-medium mb-4">Configuración de voz</h4>
        <div className="space-y-4">
          <div>
            <div className="flex justify-between mb-2">
              <Label className="text-sm">Estabilidad</Label>
              <span className="text-xs text-muted-foreground">
                {voiceSettings.stability.toFixed(2)}
              </span>
            </div>
            <Slider
              value={[voiceSettings.stability]}
              onValueChange={([value]) =>
                onVoiceSettingsChange({ ...voiceSettings, stability: value })
              }
              min={0}
              max={1}
              step={0.01}
              className="w-full"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Menos variable ← → Más estable
            </p>
          </div>

          <div>
            <div className="flex justify-between mb-2">
              <Label className="text-sm">Similitud</Label>
              <span className="text-xs text-muted-foreground">
                {voiceSettings.similarity_boost.toFixed(2)}
              </span>
            </div>
            <Slider
              value={[voiceSettings.similarity_boost]}
              onValueChange={([value]) =>
                onVoiceSettingsChange({
                  ...voiceSettings,
                  similarity_boost: value,
                })
              }
              min={0}
              max={1}
              step={0.01}
              className="w-full"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Bajo ← → Alto
            </p>
          </div>

          <div>
            <div className="flex justify-between mb-2">
              <Label className="text-sm">Exageración de estilo</Label>
              <span className="text-xs text-muted-foreground">
                {voiceSettings.style.toFixed(2)}
              </span>
            </div>
            <Slider
              value={[voiceSettings.style]}
              onValueChange={([value]) =>
                onVoiceSettingsChange({ ...voiceSettings, style: value })
              }
              min={0}
              max={1}
              step={0.01}
              className="w-full"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Ninguno ← → Exagerado
            </p>
          </div>
        </div>
      </Card>

      {/* Generate Button */}
      <div className="space-y-4">
        <Button
          onClick={onGenerate}
          disabled={isGenerating}
          size="lg"
          className="w-full"
        >
          {isGenerating ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Generando voiceover...
            </>
          ) : (
            "Generar Voiceover Completo"
          )}
        </Button>

        {voiceoverUrl && (
          <Card className="p-4">
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Volume2 className="w-5 h-5 text-primary" />
                <p className="font-medium">Voiceover generado</p>
              </div>
              <audio 
                key={voiceoverUrl}
                src={voiceoverUrl} 
                controls 
                className="w-full"
                onError={(e) => {
                  console.error("Audio error in voiceover player:", e);
                  console.error("Failed URL:", voiceoverUrl);
                }}
                onCanPlay={() => console.log("Voiceover audio can play:", voiceoverUrl)}
              />
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
