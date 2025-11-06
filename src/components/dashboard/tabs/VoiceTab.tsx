import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Play, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useQuery } from "@tanstack/react-query";

interface VoiceTabProps {
  selectedBrandId: string;
  selectedVoiceId: string;
  onBrandSelect: (brandId: string) => void;
  onVoiceSelect: (voiceId: string) => void;
  onNext: () => void;
}

const VOICES = [
  { id: "9BWtsMINqrJLrRacOk9x", name: "Aria", description: "Voz femenina cálida" },
  { id: "CwhRBWXzGAHq8TQ4Fs17", name: "Roger", description: "Voz masculina profesional" },
  { id: "EXAVITQu4vr4xnSDxMaL", name: "Sarah", description: "Voz femenina energética" },
  { id: "IKne3meq5aSn9XLyUdCD", name: "Charlie", description: "Voz masculina juvenil" },
  { id: "TX3LPaxmHKxFdv7VOQHJ", name: "Liam", description: "Voz masculina seria" },
  { id: "XB0fDUnXU5powFXDhCwa", name: "Charlotte", description: "Voz femenina británica" },
];

export function VoiceTab({
  selectedBrandId,
  selectedVoiceId,
  onBrandSelect,
  onVoiceSelect,
  onNext,
}: VoiceTabProps) {
  const [stability, setStability] = useState([50]);
  const [similarity, setSimilarity] = useState([75]);
  const [style, setStyle] = useState([0]);
  const [previewingVoice, setPreviewingVoice] = useState<string | null>(null);

  // Fetch brands
  const { data: brands } = useQuery({
    queryKey: ["brands"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("brands")
        .select("id, name")
        .order("name");
      if (error) throw error;
      return data;
    },
  });

  const handlePreviewVoice = async (voiceId: string) => {
    setPreviewingVoice(voiceId);
    try {
      const { data, error } = await supabase.functions.invoke("preview-voice", {
        body: {
          voice_id: voiceId,
          text: "Hola, soy tu voz de IA para variantes de video. Escucha cómo sueno.",
        },
      });

      if (error) throw error;

      if (data?.audio_url) {
        const audio = new Audio(data.audio_url);
        audio.play();
      }
    } catch (error: any) {
      toast.error("Error al previsualizar voz: " + error.message);
    } finally {
      setPreviewingVoice(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Brand Selection */}
      <div className="p-4 bg-secondary/30 rounded-lg">
        <label className="text-sm font-medium mb-2 block">
          Confirma tu marca
        </label>
        <Select value={selectedBrandId} onValueChange={onBrandSelect}>
          <SelectTrigger>
            <SelectValue placeholder="Elegir marca..." />
          </SelectTrigger>
          <SelectContent>
            {brands?.map((brand) => (
              <SelectItem key={brand.id} value={brand.id}>
                {brand.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Voice Selection */}
      <div>
        <h3 className="font-semibold mb-4">Escucha y elige tu voz</h3>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {VOICES.map((voice) => (
            <Card
              key={voice.id}
              className={`p-4 cursor-pointer transition-all ${
                selectedVoiceId === voice.id
                  ? "ring-2 ring-primary bg-primary/5"
                  : "hover:bg-secondary/50"
              }`}
              onClick={() => onVoiceSelect(voice.id)}
            >
              <div className="flex items-start justify-between mb-2">
                <div>
                  <h4 className="font-semibold">{voice.name}</h4>
                  <p className="text-xs text-muted-foreground">
                    {voice.description}
                  </p>
                </div>
                {selectedVoiceId === voice.id && (
                  <Badge>Seleccionada</Badge>
                )}
              </div>
              <Button
                variant="outline"
                size="sm"
                className="w-full mt-2"
                onClick={(e) => {
                  e.stopPropagation();
                  handlePreviewVoice(voice.id);
                }}
                disabled={previewingVoice === voice.id}
              >
                {previewingVoice === voice.id ? (
                  <>
                    <Loader2 className="w-3 h-3 mr-2 animate-spin" />
                    Cargando...
                  </>
                ) : (
                  <>
                    <Play className="w-3 h-3 mr-2" />
                    Preview
                  </>
                )}
              </Button>
            </Card>
          ))}
        </div>
      </div>

      {/* Voice Settings */}
      <div className="p-6 bg-secondary/30 rounded-lg space-y-6">
        <h3 className="font-semibold">Ajustes de voz</h3>

        <div>
          <div className="flex justify-between mb-2">
            <label className="text-sm font-medium">Estabilidad</label>
            <span className="text-sm text-muted-foreground">{stability[0]}%</span>
          </div>
          <Slider
            value={stability}
            onValueChange={setStability}
            max={100}
            step={1}
          />
          <p className="text-xs text-muted-foreground mt-1">
            Mayor estabilidad = voz más consistente
          </p>
        </div>

        <div>
          <div className="flex justify-between mb-2">
            <label className="text-sm font-medium">Similitud</label>
            <span className="text-sm text-muted-foreground">{similarity[0]}%</span>
          </div>
          <Slider
            value={similarity}
            onValueChange={setSimilarity}
            max={100}
            step={1}
          />
          <p className="text-xs text-muted-foreground mt-1">
            Mayor similitud = más fiel al original
          </p>
        </div>

        <div>
          <div className="flex justify-between mb-2">
            <label className="text-sm font-medium">Estilo</label>
            <span className="text-sm text-muted-foreground">{style[0]}%</span>
          </div>
          <Slider value={style} onValueChange={setStyle} max={100} step={1} />
          <p className="text-xs text-muted-foreground mt-1">
            Mayor estilo = más expresividad
          </p>
        </div>
      </div>

      <div className="flex justify-end pt-4 border-t">
        <Button onClick={onNext} disabled={!selectedBrandId || !selectedVoiceId}>
          Siguiente: Configurar Variantes
        </Button>
      </div>
    </div>
  );
}
