import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Sparkles, Play } from "lucide-react";

interface VariantOptions {
  hookVisual: boolean;
  hookText: boolean;
  cta: boolean;
}

interface VariantsTabProps {
  variantCount: number;
  onVariantCountChange: (count: number) => void;
  variantOptions: VariantOptions;
  onVariantOptionsChange: (options: VariantOptions) => void;
  onRender: () => void;
}

export function VariantsTab({
  variantCount,
  onVariantCountChange,
  variantOptions,
  onVariantOptionsChange,
  onRender
}: VariantsTabProps) {
  const handleOptionChange = (key: keyof VariantOptions, value: boolean) => {
    onVariantOptionsChange({
      ...variantOptions,
      [key]: value
    });
  };

  const getVariantSummary = () => {
    if (variantCount === 1) {
      return "1 variante única";
    }

    const changes: string[] = [];
    if (variantOptions.hookVisual) changes.push("Hook visual");
    if (variantOptions.hookText) changes.push("Hook texto");
    if (variantOptions.cta) changes.push("CTA");

    if (changes.length === 0) {
      return `${variantCount} copias idénticas`;
    }

    return `${variantCount} variantes con: ${changes.join(", ")}`;
  };

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <div className="text-center space-y-3">
        <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center mx-auto mb-4">
          <Sparkles className="w-8 h-8 text-white" />
        </div>
        <h2 className="text-2xl font-bold">¿Cuántas variantes crear?</h2>
        <p className="text-muted-foreground">
          Más variantes = más pruebas A/B para encontrar tu ganador
        </p>
      </div>

      <Card className="p-6">
        <RadioGroup
          value={variantCount.toString()}
          onValueChange={(value) => onVariantCountChange(parseInt(value))}
          className="space-y-4"
        >
          <div className="flex items-center space-x-3 p-4 border rounded-lg hover:bg-secondary/50 transition-colors cursor-pointer">
            <RadioGroupItem value="1" id="variant-1" />
            <Label htmlFor="variant-1" className="flex-1 cursor-pointer">
              <div>
                <p className="font-medium">1 Variante</p>
                <p className="text-sm text-muted-foreground">
                  Perfecto para probar un concepto específico
                </p>
              </div>
            </Label>
            <span className="text-sm font-semibold text-muted-foreground">10 créditos</span>
          </div>

          <div className="flex items-center space-x-3 p-4 border-2 border-primary rounded-lg bg-primary/5 cursor-pointer">
            <RadioGroupItem value="2" id="variant-2" />
            <Label htmlFor="variant-2" className="flex-1 cursor-pointer">
              <div>
                <p className="font-medium">2 Variantes</p>
                <p className="text-sm text-muted-foreground">
                  Testing A/B básico
                </p>
              </div>
            </Label>
            <span className="text-sm font-semibold text-primary">20 créditos</span>
          </div>

          <div className="flex items-center space-x-3 p-4 border rounded-lg hover:bg-secondary/50 transition-colors cursor-pointer">
            <RadioGroupItem value="3" id="variant-3" />
            <Label htmlFor="variant-3" className="flex-1 cursor-pointer">
              <div>
                <p className="font-medium">3 Variantes</p>
                <p className="text-sm text-muted-foreground">
                  Máximo poder de testing A/B/C
                </p>
              </div>
            </Label>
            <span className="text-sm font-semibold text-muted-foreground">30 créditos</span>
          </div>
        </RadioGroup>
      </Card>

      {variantCount > 1 && (
        <Card className="p-6">
          <h3 className="font-semibold mb-4">¿Qué quieres variar?</h3>
          <div className="space-y-3">
            <div className="flex items-center space-x-3">
              <Checkbox
                id="hook-visual"
                checked={variantOptions.hookVisual}
                onCheckedChange={(checked) => 
                  handleOptionChange('hookVisual', checked as boolean)
                }
              />
              <Label htmlFor="hook-visual" className="cursor-pointer">
                <div>
                  <p className="font-medium">Hook visual</p>
                  <p className="text-sm text-muted-foreground">
                    Usa diferentes clips del pool de Hook
                  </p>
                </div>
              </Label>
            </div>

            <div className="flex items-center space-x-3">
              <Checkbox
                id="hook-text"
                checked={variantOptions.hookText}
                onCheckedChange={(checked) => 
                  handleOptionChange('hookText', checked as boolean)
                }
              />
              <Label htmlFor="hook-text" className="cursor-pointer">
                <div>
                  <p className="font-medium">Hook texto</p>
                  <p className="text-sm text-muted-foreground">
                    Alterna entre versiones del texto adaptado
                  </p>
                </div>
              </Label>
            </div>

            <div className="flex items-center space-x-3">
              <Checkbox
                id="cta"
                checked={variantOptions.cta}
                onCheckedChange={(checked) => 
                  handleOptionChange('cta', checked as boolean)
                }
              />
              <Label htmlFor="cta" className="cursor-pointer">
                <div>
                  <p className="font-medium">CTA</p>
                  <p className="text-sm text-muted-foreground">
                    Prueba diferentes llamados a la acción
                  </p>
                </div>
              </Label>
            </div>
          </div>
        </Card>
      )}

      <Card className="p-6 bg-gradient-to-br from-primary/10 to-accent/10 border-primary/20">
        <div className="flex items-start gap-3">
          <div className="text-2xl">✨</div>
          <div className="space-y-2 flex-1">
            <p className="font-semibold text-foreground">
              Resumen de configuración
            </p>
            <p className="text-sm text-muted-foreground">
              {getVariantSummary()}
            </p>
            <ul className="text-sm text-muted-foreground space-y-1 mt-3">
              <li>• Video vertical 9:16 optimizado</li>
              <li>• Voiceover sincronizado</li>
              <li>• Subtítulos automáticos</li>
              <li>• Formato listo para subir</li>
            </ul>
          </div>
        </div>
      </Card>

      <div className="flex justify-center pt-4">
        <Button 
          size="lg" 
          onClick={onRender}
          className="gap-2 px-8"
        >
          <Play className="w-5 h-5" />
          Generar variantes
        </Button>
      </div>
    </div>
  );
}
