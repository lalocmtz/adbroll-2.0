import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Play, Zap } from "lucide-react";

interface VariantsTabProps {
  variantCount: number;
  onVariantCountChange: (count: number) => void;
  onRender: () => void;
}

export function VariantsTab({ variantCount, onVariantCountChange, onRender }: VariantsTabProps) {
  return (
    <div className="space-y-8">
      <div className="text-center space-y-3">
        <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center mx-auto mb-4">
          <Zap className="w-8 h-8 text-white" />
        </div>
        <h2 className="text-2xl font-bold">¿Cuántas variantes quieres crear?</h2>
        <p className="text-muted-foreground">
          Más variantes = más pruebas A/B para maximizar conversiones
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
            <RadioGroupItem value="3" id="variant-3" />
            <Label htmlFor="variant-3" className="flex-1 cursor-pointer">
              <div>
                <p className="font-medium">3 Variantes</p>
                <p className="text-sm text-muted-foreground">
                  Recomendado para testing A/B óptimo
                </p>
              </div>
            </Label>
            <span className="text-sm font-semibold text-primary">30 créditos</span>
          </div>
        </RadioGroup>
      </Card>

      <Card className="p-6 bg-gradient-to-br from-primary/10 to-accent/10 border-primary/20">
        <div className="flex items-start gap-3">
          <div className="text-2xl">✨</div>
          <div className="space-y-2 flex-1">
            <p className="font-semibold text-foreground">
              ¿Qué incluye cada variante?
            </p>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• Clips seleccionados con orden aleatorio</li>
              <li>• Voiceover adaptado a tu marca</li>
              <li>• Subtítulos automáticos sincronizados</li>
              <li>• Exportación en formato vertical (9:16)</li>
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
          🎬 Crear mis variantes
        </Button>
      </div>
    </div>
  );
}
