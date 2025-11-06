import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Volume2, Play, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface VoiceTabProps {
  selectedVoiceId: string;
  onVoiceChange: (voiceId: string) => void;
  selectedBrandId: string;
  brands: Array<{ id: string; name: string }>;
  onBrandChange: (brandId: string) => void;
  onNext: () => void;
}

const VOICES = [
  { id: "EXAVITQu4vr4xnSDxMaL", name: "Sarah", description: "Femenina, amigable" },
  { id: "FGY2WhTYpPnrIDTdsKH5", name: "Laura", description: "Femenina, profesional" },
  { id: "IKne3meq5aSn9XLyUdCD", name: "Charlie", description: "Masculina, cálida" },
  { id: "JBFqnCBsd6RMkjVDRZzb", name: "George", description: "Masculina, autoritaria" },
  { id: "9BWtsMINqrJLrRacOk9x", name: "Aria", description: "Femenina, versátil" },
  { id: "CwhRBWXzGAHq8TQ4Fs17", name: "Roger", description: "Masculina, confiable" },
];

const PREVIEW_TEXT = "Hola, soy una voz de prueba para tu proyecto. ¿Te gusta cómo sueno?";

export function VoiceTab({ 
  selectedVoiceId, 
  onVoiceChange, 
  selectedBrandId,
  brands,
  onBrandChange,
  onNext 
}: VoiceTabProps) {
  const [previewingVoice, setPreviewingVoice] = useState<string | null>(null);
  const [voiceSettings, setVoiceSettings] = useState({
    stability: 0.5,
    similarity_boost: 0.75,
    style: 0.0,
  });

  const handlePreviewVoice = async (voiceId: string) => {
    setPreviewingVoice(voiceId);
    
    try {
      const { data, error } = await supabase.functions.invoke("preview-voice", {
        body: {
          text: PREVIEW_TEXT,
          voiceId,
          settings: voiceSettings,
        },
      });

      if (error) throw error;

      const audio = new Audio(data.audioUrl);
      audio.onended = () => setPreviewingVoice(null);
      await audio.play();
    } catch (error: any) {
      console.error("Error previewing voice:", error);
      toast.error("Error al previsualizar voz: " + error.message);
      setPreviewingVoice(null);
    }
  };

  return (
    <div className="space-y-8">
      {/* Brand Selection */}
      <div className="space-y-3">
        <Label className="text-lg font-semibold">Selecciona tu marca</Label>
        <Select value={selectedBrandId} onValueChange={onBrandChange}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Elige una marca..." />
          </SelectTrigger>
          <SelectContent>
            {brands.map((brand) => (
              <SelectItem key={brand.id} value={brand.id}>
                {brand.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Voice Selection */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Volume2 className="w-5 h-5" />
          Selecciona la voz
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {VOICES.map((voice) => (
            <Card
              key={voice.id}
              className={`p-3 cursor-pointer transition-all ${
                selectedVoiceId === voice.id
                  ? "ring-2 ring-primary bg-primary/5"
                  : "hover:bg-secondary"
              }`}
              onClick={() => onVoiceChange(voice.id)}
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
      <Card className="p-6">
        <h4 className="font-semibold mb-4">Configuración de voz</h4>
        <div className="space-y-6">
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
                setVoiceSettings({ ...voiceSettings, stability: value })
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
                setVoiceSettings({ ...voiceSettings, similarity_boost: value })
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
                setVoiceSettings({ ...voiceSettings, style: value })
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

      <div className="flex justify-end pt-4 border-t">
        <Button 
          size="lg" 
          onClick={onNext}
          disabled={!selectedBrandId}
        >
          Siguiente: Configurar Variantes
        </Button>
      </div>
    </div>
  );
}
