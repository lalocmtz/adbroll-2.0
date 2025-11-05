import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Film, AlertCircle, CheckCircle2, Loader2 } from "lucide-react";

interface VariantProgress {
  id: string;
  status: string;
  progress: number;
  message: string;
}

interface RenderProgressProps {
  isRendering: boolean;
  onRender: () => void;
  disabled: boolean;
  variantsProgress: VariantProgress[];
}

export function RenderProgress({
  isRendering,
  onRender,
  disabled,
  variantsProgress,
}: RenderProgressProps) {
  return (
    <div className="space-y-4">
      {disabled && (
        <Card className="p-4 bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-amber-600" />
            <p className="text-sm text-amber-900 dark:text-amber-100">
              Genera primero la voz antes de renderizar
            </p>
          </div>
        </Card>
      )}

      {isRendering && variantsProgress.length > 0 ? (
        <div className="space-y-3">
          {variantsProgress.map((variant, idx) => (
            <Card key={variant.id} className="p-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {variant.status === "completed" ? (
                      <CheckCircle2 className="w-5 h-5 text-green-500" />
                    ) : variant.status === "failed" ? (
                      <AlertCircle className="w-5 h-5 text-red-500" />
                    ) : (
                      <Loader2 className="w-5 h-5 animate-spin text-primary" />
                    )}
                    <span className="font-medium">Variante #{idx + 1}</span>
                  </div>
                  <span className="text-sm font-semibold text-primary">
                    {variant.progress}%
                  </span>
                </div>
                
                <Progress value={variant.progress} className="w-full" />
                
                <p className="text-xs text-muted-foreground">
                  {variant.message}
                </p>
              </div>
            </Card>
          ))}
        </div>
      ) : !isRendering ? (
        <div className="text-center py-8">
          <Film className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
          <p className="text-muted-foreground mb-4">
            Todo listo para renderizar tus videos
          </p>
          <Button
            onClick={onRender}
            disabled={disabled}
            size="lg"
          >
            <Film className="w-5 h-5 mr-2" />
            Renderizar Videos
          </Button>
          <p className="text-xs text-muted-foreground mt-4">
            Renderizado profesional con Shotstack API
          </p>
        </div>
      ) : null}
    </div>
  );
}
