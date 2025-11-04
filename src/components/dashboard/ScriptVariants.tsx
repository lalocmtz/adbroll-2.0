import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Check, Edit2 } from "lucide-react";
import { toast } from "sonner";

interface ScriptVariant {
  variant_name: string;
  hook_type: string;
  estimated_duration: number;
  sections: Array<{
    type: string;
    text: string;
    duration: number;
  }>;
}

interface ScriptVariantsProps {
  variants: ScriptVariant[];
  onApprove: (variantIndex: number, editedVariant: ScriptVariant) => void;
}

export function ScriptVariants({ variants, onApprove }: ScriptVariantsProps) {
  const [selectedVariant, setSelectedVariant] = useState(0);
  const [isEditing, setIsEditing] = useState(false);
  const [editedVariant, setEditedVariant] = useState<ScriptVariant>(variants[0]);

  const handleSectionEdit = (sectionIndex: number, newText: string) => {
    const updated = { ...editedVariant };
    updated.sections[sectionIndex].text = newText;
    setEditedVariant(updated);
  };

  const handleApprove = () => {
    onApprove(selectedVariant, editedVariant);
    toast.success("Guion aprobado. ¡Listo para generar variantes!");
  };

  const currentVariant = isEditing ? editedVariant : variants[selectedVariant];

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-xl font-bold mb-2">Guiones Generados</h3>
            <p className="text-sm text-muted-foreground">
              Revisa y edita antes de aprobar
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant={isEditing ? "outline" : "default"}
              size="sm"
              onClick={() => setIsEditing(!isEditing)}
            >
              <Edit2 className="w-4 h-4 mr-2" />
              {isEditing ? "Vista Previa" : "Editar"}
            </Button>
            <Button onClick={handleApprove}>
              <Check className="w-4 h-4 mr-2" />
              Aprobar y Generar
            </Button>
          </div>
        </div>

        {/* Variant Selector */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
          {variants.map((variant, index) => (
            <Button
              key={index}
              variant={selectedVariant === index ? "default" : "outline"}
              size="sm"
              onClick={() => {
                setSelectedVariant(index);
                setEditedVariant(variant);
              }}
            >
              {variant.variant_name}
            </Button>
          ))}
        </div>

        {/* Variant Details */}
        <div className="space-y-4">
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <Badge>{currentVariant.hook_type}</Badge>
            <span>Duración estimada: {currentVariant.estimated_duration}s</span>
            <span>{currentVariant.sections.length} secciones</span>
          </div>

          {/* Sections */}
          <div className="space-y-3">
            {currentVariant.sections.map((section, index) => (
              <div key={index} className="p-4 bg-secondary/30 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{section.type}</Badge>
                    <span className="text-xs text-muted-foreground">
                      {section.duration}s
                    </span>
                  </div>
                </div>
                {isEditing ? (
                  <Textarea
                    value={section.text}
                    onChange={(e) => handleSectionEdit(index, e.target.value)}
                    className="min-h-[80px] mt-2"
                  />
                ) : (
                  <p className="text-sm">{section.text}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      </Card>

      <Card className="p-6 bg-accent/5 border-accent/20">
        <div className="flex gap-4">
          <div className="flex-shrink-0">
            <div className="w-10 h-10 rounded-full bg-accent/10 flex items-center justify-center">
              <span className="text-xl">💡</span>
            </div>
          </div>
          <div>
            <h4 className="font-medium mb-1">Próximo Paso</h4>
            <p className="text-sm text-muted-foreground">
              Una vez apruebes el guion, la IA asignará automáticamente clips de tu B-roll
              y generará la voz con ElevenLabs.
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}
