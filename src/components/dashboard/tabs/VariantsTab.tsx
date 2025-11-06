import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Zap } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";

interface VariantsTabProps {
  variantCount: number;
  sections: any[];
  assignments: any[];
  selectedBrandId: string;
  selectedVoiceId: string;
  analysisId: string | null;
  onVariantCountChange: (count: number) => void;
  onRenderStart: (projectId: string) => void;
}

export function VariantsTab({
  variantCount,
  sections,
  assignments,
  selectedBrandId,
  selectedVoiceId,
  analysisId,
  onVariantCountChange,
  onRenderStart,
}: VariantsTabProps) {
  const { user } = useAuth();
  const creditsPerVariant = 10;
  const totalCredits = variantCount * creditsPerVariant;

  const handleCreateVariants = async () => {
    try {
      const slotsData: any = {};
      assignments.forEach((assignment, index) => {
        const section = sections[index];
        slotsData[`section-${index}`] = {
          type: section.type,
          clipId: assignment.clipId,
          text: section.text,
        };
      });

      const { data: project, error: projectError } = await supabase
        .from("projects")
        .insert({
          user_id: user?.id,
          name: `Proyecto ${new Date().toLocaleDateString()}`,
          brand_id: selectedBrandId,
          analysis_id: analysisId,
          generated_script: sections.map((s) => s.text).join("\n\n"),
          slots_data: slotsData,
          voice_id: selectedVoiceId,
          variant_count: variantCount,
          status: "draft",
        } as any)
        .select()
        .single();

      if (projectError) throw projectError;

      toast.success("3 variantes configuradas");
      onRenderStart(project.id);
    } catch (error: any) {
      console.error("Error creating project:", error);
      toast.error("Error al crear variantes: " + error.message);
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h3 className="text-2xl font-bold">¿1 o 3?</h3>
        <p className="text-muted-foreground">
          Vamos a vender sin grabar más
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-6 max-w-2xl mx-auto">
        {/* 1 Variant Option */}
        <Card
          className={`p-6 cursor-pointer transition-all ${
            variantCount === 1
              ? "ring-2 ring-primary bg-primary/5"
              : "hover:bg-secondary/50"
          }`}
          onClick={() => onVariantCountChange(1)}
        >
          <div className="text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center mx-auto">
              <span className="text-2xl font-bold text-white">1</span>
            </div>
            <div>
              <h4 className="font-bold text-lg mb-1">Una Variante</h4>
              <p className="text-sm text-muted-foreground">
                Prueba rápida con un solo video
              </p>
            </div>
            <div className="flex items-center justify-center gap-2">
              <Zap className="w-4 h-4 text-status-warning" />
              <span className="font-semibold">{creditsPerVariant} créditos</span>
            </div>
            {variantCount === 1 && (
              <Badge className="mx-auto">Seleccionado</Badge>
            )}
          </div>
        </Card>

        {/* 3 Variants Option */}
        <Card
          className={`p-6 cursor-pointer transition-all ${
            variantCount === 3
              ? "ring-2 ring-primary bg-primary/5"
              : "hover:bg-secondary/50"
          }`}
          onClick={() => onVariantCountChange(3)}
        >
          <div className="text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center mx-auto">
              <span className="text-2xl font-bold text-white">3</span>
            </div>
            <div>
              <h4 className="font-bold text-lg mb-1">Tres Variantes</h4>
              <p className="text-sm text-muted-foreground">
                Múltiples opciones para testear
              </p>
            </div>
            <div className="flex items-center justify-center gap-2">
              <Zap className="w-4 h-4 text-status-warning" />
              <span className="font-semibold">{totalCredits} créditos</span>
            </div>
            {variantCount === 3 && (
              <Badge className="mx-auto">Seleccionado</Badge>
            )}
          </div>
        </Card>
      </div>

      {/* Summary */}
      <div className="p-6 bg-secondary/30 rounded-lg max-w-2xl mx-auto space-y-3">
        <h4 className="font-semibold mb-4">Resumen del proyecto</h4>
        <div className="space-y-2 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Secciones</span>
            <span className="font-medium">{sections.length} bloques</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Clips asignados</span>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-green-500" />
              <span className="font-medium">{assignments.length}</span>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Voz seleccionada</span>
            <span className="font-medium">
              <CheckCircle2 className="w-4 h-4 text-green-500 inline mr-1" />
              Configurada
            </span>
          </div>
          <div className="flex items-center justify-between pt-2 border-t">
            <span className="font-medium">Variantes a crear</span>
            <span className="font-bold text-lg">{variantCount}</span>
          </div>
        </div>
      </div>

      <div className="flex justify-center pt-4">
        <Button size="lg" className="px-12" onClick={handleCreateVariants}>
          Crear mis variantes
        </Button>
      </div>
    </div>
  );
}
