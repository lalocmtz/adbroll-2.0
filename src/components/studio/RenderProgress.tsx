import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Film, AlertCircle } from "lucide-react";

interface RenderProgressProps {
  isRendering: boolean;
  onRender: () => void;
  disabled: boolean;
}

export function RenderProgress({
  isRendering,
  onRender,
  disabled,
}: RenderProgressProps) {
  return (
    <div className="space-y-4">
      {disabled && (
        <Card className="p-4 bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-amber-600" />
            <p className="text-sm text-amber-900 dark:text-amber-100">
              Completa los pasos anteriores antes de renderizar
            </p>
          </div>
        </Card>
      )}

      {isRendering ? (
        <Card className="p-6">
          <div className="text-center space-y-4">
            <Film className="w-16 h-16 mx-auto animate-pulse text-primary" />
            <div>
              <h3 className="font-bold mb-2">Renderizando tu video...</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Esto puede tomar algunos minutos
              </p>
            </div>
            <Progress value={65} className="w-full" />
            <p className="text-xs text-muted-foreground">
              Concatenando clips y generando subtítulos...
            </p>
          </div>
        </Card>
      ) : (
        <div className="text-center py-8">
          <Film className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
          <p className="text-muted-foreground mb-4">
            Todo listo para renderizar tu video
          </p>
          <Button
            onClick={onRender}
            disabled={disabled}
            size="lg"
          >
            Renderizar Video
          </Button>
          <p className="text-xs text-muted-foreground mt-4">
            Nota: Esta es una versión placeholder. La versión de producción usará FFmpeg.
          </p>
        </div>
      )}
    </div>
  );
}
