import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Play, Loader2, Wand2 } from "lucide-react";
import { toast } from "sonner";

interface ScriptSection {
  type: string;
  text: string;
  adaptedText?: string;
}

interface VoiceSettings {
  stability: number;
  similarity: number;
  style: number;
}

interface VoiceTabProps {
  sections: ScriptSection[];
  selectedVoiceId: string;
  onVoiceChange: (voiceId: string) => void;
  voiceSettings: VoiceSettings;
  onVoiceSettingsChange: (settings: VoiceSettings) => void;
  voiceoverUrl: string | null;
  onVoiceoverGenerated: (url: string) => void;
  onNext: () => void;
}

const VOICES = [
  { id: "EXAVITQu4vr4xnSDxMaL", name: "Sarah", description: "Voz femenina y suave" },
  { id: "TX3LPaxmHKxFdv7VOQHJ", name: "Liam", description: "Voz masculina y clara" },
  { id: "pFZP5JQG7iQjIQuC4Bku", name: "Lily", description: "Voz femenina y juvenil" },
  { id: "onwK4e9ZLuTAKqWW03F9", name: "Daniel", description: "Voz masculina y profunda" },
  { id: "cgSgspJ2msm6clMCkdW9", name: "Jessica", description: "Voz femenina y profesional" }
];

export function VoiceTab({
  sections,
  selectedVoiceId,
  onVoiceChange,
  voiceSettings,
  onVoiceSettingsChange,
  voiceoverUrl,
  onVoiceoverGenerated,
  onNext
}: VoiceTabProps) {
  const [previewingVoice, setPreviewingVoice] = useState<string | null>(null);
  const [generatingVoiceover, setGeneratingVoiceover] = useState(false);

  const fullScript = sections
    .map(s => s.adaptedText || s.text)
    .join('\n\n');

  const handlePreviewVoice = async (voiceId: string) => {
    setPreviewingVoice(voiceId);
    try {
      // Preview first section only
      const previewText = sections[0]?.adaptedText || sections[0]?.text || "";
      
      // Call preview-voice edge function
      toast.info("Generando preview...");
      
      // Mock preview - in real implementation, play audio
      setTimeout(() => {
        toast.success("Preview listo");
        setPreviewingVoice(null);
      }, 2000);
    } catch (error) {
      toast.error("Error al generar preview");
      setPreviewingVoice(null);
    }
  };

  const handleGenerateVoiceover = async () => {
    setGeneratingVoiceover(true);
    try {
      // Call generate-voiceover edge function
      toast.info("Generando locución completa...");
      
      // Mock generation
      setTimeout(() => {
        onVoiceoverGenerated("mock-voiceover-url");
        toast.success("Locución generada");
        setGeneratingVoiceover(false);
      }, 3000);
    } catch (error) {
      toast.error("Error al generar locución");
      setGeneratingVoiceover(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Left Panel - Final Script */}
      <div>
        <h3 className="text-lg font-semibold mb-4">Guion final</h3>
        <Card className="p-4">
          <div className="space-y-3">
            {sections.map((section, index) => (
              <div key={index} className="space-y-1">
                <Badge variant="outline" className="text-xs">
                  {section.type}
                </Badge>
                <p className="text-sm leading-relaxed">
                  {section.adaptedText || section.text}
                </p>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Right Panel - Voice Selection */}
      <div className="space-y-6">
        <div>
          <h3 className="text-lg font-semibold mb-4">Selecciona la voz</h3>
          <div className="space-y-2">
            {VOICES.map((voice) => (
              <Card
                key={voice.id}
                className={`p-4 cursor-pointer transition-colors ${
                  selectedVoiceId === voice.id 
                    ? 'border-primary bg-primary/5' 
                    : 'hover:bg-secondary/50'
                }`}
                onClick={() => onVoiceChange(voice.id)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="font-semibold">{voice.name}</div>
                    <div className="text-sm text-muted-foreground">
                      {voice.description}
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
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
              </Card>
            ))}
          </div>
        </div>

        <Card className="p-4 space-y-4">
          <h4 className="font-semibold">Configuración de voz</h4>
          
          <div>
            <Label className="text-xs mb-2 flex justify-between">
              <span>Estabilidad</span>
              <span className="text-muted-foreground">{voiceSettings.stability.toFixed(2)}</span>
            </Label>
            <Slider
              value={[voiceSettings.stability]}
              onValueChange={([value]) => 
                onVoiceSettingsChange({ ...voiceSettings, stability: value })
              }
              min={0}
              max={1}
              step={0.01}
            />
            <p className="text-xs text-muted-foreground mt-1">
              Menos variable = más estable
            </p>
          </div>

          <div>
            <Label className="text-xs mb-2 flex justify-between">
              <span>Similitud</span>
              <span className="text-muted-foreground">{voiceSettings.similarity.toFixed(2)}</span>
            </Label>
            <Slider
              value={[voiceSettings.similarity]}
              onValueChange={([value]) => 
                onVoiceSettingsChange({ ...voiceSettings, similarity: value })
              }
              min={0}
              max={1}
              step={0.01}
            />
            <p className="text-xs text-muted-foreground mt-1">
              Más alto = más fiel
            </p>
          </div>

          <div>
            <Label className="text-xs mb-2 flex justify-between">
              <span>Exageración de estilo</span>
              <span className="text-muted-foreground">{voiceSettings.style.toFixed(2)}</span>
            </Label>
            <Slider
              value={[voiceSettings.style]}
              onValueChange={([value]) => 
                onVoiceSettingsChange({ ...voiceSettings, style: value })
              }
              min={0}
              max={1}
              step={0.01}
            />
            <p className="text-xs text-muted-foreground mt-1">
              0 ligero → 1 exagerado
            </p>
          </div>
        </Card>

        {voiceoverUrl ? (
          <div className="p-4 bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg">
            <p className="text-sm text-green-800 dark:text-green-200">
              ✓ Locución completa generada
            </p>
          </div>
        ) : (
          <Button
            onClick={handleGenerateVoiceover}
            disabled={generatingVoiceover}
            className="w-full gap-2"
            size="lg"
          >
            {generatingVoiceover ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Generando...
              </>
            ) : (
              <>
                <Wand2 className="w-4 h-4" />
                Generar locución completa
              </>
            )}
          </Button>
        )}

        <div className="flex justify-end pt-4 border-t">
          <Button 
            onClick={onNext} 
            size="lg"
            disabled={!voiceoverUrl}
          >
            Continuar
          </Button>
        </div>
      </div>
    </div>
  );
}
