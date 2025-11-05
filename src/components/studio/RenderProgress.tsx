import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Film, AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

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
          {variantsProgress.map((variant, idx) => {
            const isCompleted = variant.status === "completed";
            const isFailed = variant.status === "failed";
            const isProcessing = !isCompleted && !isFailed;
            
            return (
              <Card 
                key={variant.id} 
                className={cn(
                  "p-5 animate-fade-in transition-all duration-300",
                  isCompleted && "border-green-500/50 bg-green-50/50 dark:bg-green-950/20",
                  isFailed && "border-destructive/50 bg-destructive/5 dark:bg-destructive/10",
                  isProcessing && "border-primary/50"
                )}
              >
                <div className="space-y-4">
                  {/* Header */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {isCompleted ? (
                        <div className="flex items-center justify-center w-10 h-10 rounded-full bg-green-500/10 animate-scale-in">
                          <CheckCircle2 className="w-6 h-6 text-green-600 dark:text-green-400" />
                        </div>
                      ) : isFailed ? (
                        <div className="flex items-center justify-center w-10 h-10 rounded-full bg-destructive/10 animate-scale-in">
                          <AlertCircle className="w-6 h-6 text-destructive" />
                        </div>
                      ) : (
                        <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary/10">
                          <Loader2 className="w-6 h-6 animate-spin text-primary" />
                        </div>
                      )}
                      <div>
                        <span className="font-semibold text-base">Variante #{idx + 1}</span>
                        <p className={cn(
                          "text-xs font-medium mt-0.5",
                          isCompleted && "text-green-600 dark:text-green-400",
                          isFailed && "text-destructive",
                          isProcessing && "text-primary"
                        )}>
                          {isCompleted ? "Completado" : isFailed ? "Error" : "Procesando..."}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className={cn(
                        "text-3xl font-bold tabular-nums transition-colors duration-300",
                        isCompleted && "text-green-600 dark:text-green-400",
                        isFailed && "text-destructive",
                        isProcessing && "text-primary"
                      )}>
                        {variant.progress}%
                      </div>
                    </div>
                  </div>
                  
                  {/* Progress Bar */}
                  <div className="relative w-full h-3 bg-muted rounded-full overflow-hidden">
                    <div 
                      className={cn(
                        "absolute top-0 left-0 h-full rounded-full transition-all duration-500 ease-out",
                        isCompleted && "bg-gradient-to-r from-green-500 to-green-600",
                        isFailed && "bg-gradient-to-r from-destructive to-destructive/80",
                        isProcessing && "bg-gradient-to-r from-primary to-primary/80 animate-pulse"
                      )}
                      style={{ width: `${variant.progress}%` }}
                    >
                      {isProcessing && (
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-slide-in-right" />
                      )}
                    </div>
                  </div>
                  
                  {/* Status Message */}
                  <div className="flex items-start gap-2">
                    <div className={cn(
                      "flex-1 text-sm leading-relaxed",
                      isCompleted && "text-green-700 dark:text-green-300",
                      isFailed && "text-destructive",
                      isProcessing && "text-muted-foreground"
                    )}>
                      {variant.message || (isCompleted ? "Video renderizado exitosamente" : isFailed ? "Error al renderizar video" : "Esperando...")}
                    </div>
                  </div>
                </div>
              </Card>
            );
          })}
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
