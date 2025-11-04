import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Volume2, Play } from "lucide-react";

interface VoiceSelectionProps {
  selectedVoice: string;
  onVoiceSelect: (voiceId: string) => void;
  onGenerate: () => void;
  isGenerating: boolean;
  voiceoverUrl: string | null;
}

const VOICES = [
  { id: "EXAVITQu4vr4xnSDxMaL", name: "Sarah", description: "Femenina, amigable" },
  { id: "FGY2WhTYpPnrIDTdsKH5", name: "Laura", description: "Femenina, profesional" },
  { id: "IKne3meq5aSn9XLyUdCD", name: "Charlie", description: "Masculina, cálida" },
  { id: "JBFqnCBsd6RMkjVDRZzb", name: "George", description: "Masculina, autoritaria" },
  { id: "9BWtsMINqrJLrRacOk9x", name: "Aria", description: "Femenina, versátil" },
  { id: "CwhRBWXzGAHq8TQ4Fs17", name: "Roger", description: "Masculina, confiable" },
];

export function VoiceSelection({
  selectedVoice,
  onVoiceSelect,
  onGenerate,
  isGenerating,
  voiceoverUrl,
}: VoiceSelectionProps) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {VOICES.map((voice) => (
          <Card
            key={voice.id}
            className={`p-4 cursor-pointer transition-all ${
              selectedVoice === voice.id
                ? "ring-2 ring-primary bg-primary/5"
                : "hover:bg-secondary"
            }`}
            onClick={() => onVoiceSelect(voice.id)}
          >
            <div className="flex items-center gap-3">
              <Volume2 className="w-5 h-5 text-primary" />
              <div>
                <p className="font-medium">{voice.name}</p>
                <p className="text-xs text-muted-foreground">
                  {voice.description}
                </p>
              </div>
            </div>
          </Card>
        ))}
      </div>

      <div className="flex gap-4 items-center">
        <Button
          onClick={onGenerate}
          disabled={isGenerating}
          size="lg"
        >
          {isGenerating ? "Generando..." : "Generar Voiceover"}
        </Button>

        {voiceoverUrl && (
          <Card className="p-4 flex-1">
            <div className="flex items-center gap-4">
              <Play className="w-5 h-5 text-primary" />
              <div className="flex-1">
                <p className="text-sm font-medium">Voiceover generado</p>
                <audio src={voiceoverUrl} controls className="w-full mt-2" />
              </div>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
