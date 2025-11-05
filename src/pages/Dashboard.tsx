import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Video } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { VideoLinkInput } from "@/components/dashboard/VideoLinkInput";
import { AnalysisResult } from "@/components/dashboard/AnalysisResult";
import { ScriptVariants } from "@/components/dashboard/ScriptVariants";
import { toast } from "sonner";

interface Brand {
  id: string;
  name: string;
}

const Dashboard = () => {
  const [selectedBrand, setSelectedBrand] = useState<string | null>(null);
  const [currentAnalysisId, setCurrentAnalysisId] = useState<string | null>(null);
  const [scriptVariants, setScriptVariants] = useState<any[] | null>(null);
  const [generatingScripts, setGeneratingScripts] = useState(false);

  // Fetch brands
  const { data: brands } = useQuery({
    queryKey: ["brands"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("brands")
        .select("id, name")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as Brand[];
    },
  });

  // Set first brand as selected by default
  if (brands && brands.length > 0 && !selectedBrand) {
    setSelectedBrand(brands[0].id);
  }

  const handleAnalysisStart = (analysisId: string) => {
    setCurrentAnalysisId(analysisId);
    setScriptVariants(null);
  };

  const handleGenerateScripts = async (analysisId: string) => {
    setGeneratingScripts(true);
    
    try {
      const { data, error } = await supabase.functions.invoke("generate-script", {
        body: {
          analysis_id: analysisId,
          variant_count: 3,
        },
      });

      if (error) throw error;

      setScriptVariants(data.variants);
      toast.success("¡Guiones generados exitosamente!");
    } catch (error: any) {
      console.error("Error generating scripts:", error);
      toast.error(error.message || "Error al generar guiones");
    } finally {
      setGeneratingScripts(false);
    }
  };

  const handleApproveScript = async (variantIndex: number, editedVariant: any) => {
    toast.success("Guion aprobado. El renderizado se implementará en la siguiente fase.");
    console.log("Approved variant:", editedVariant);
  };

  const templates = [
    { name: "Unboxing", subtitle: "Plantilla clásica" },
    { name: "Problema + solución", subtitle: "Alto engagement" },
    { name: "Lista de beneficios", subtitle: "Conversión alta" },
    { name: "Urgencia", subtitle: "FOMO garantizado" },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold mb-2">¿Qué creamos hoy?</h1>
        <p className="text-muted-foreground">
          Convierte videos virales en variantes optimizadas para tu marca
        </p>
      </div>

      {/* Brand Selector */}
      {brands && brands.length > 0 && (
        <div className="flex items-center gap-4">
          <label className="text-sm font-medium">Marca activa:</label>
          <Select value={selectedBrand || ""} onValueChange={setSelectedBrand}>
            <SelectTrigger className="w-64">
              <SelectValue placeholder="Selecciona una marca" />
            </SelectTrigger>
            <SelectContent>
              {brands.map((brand) => (
                <SelectItem key={brand.id} value={brand.id}>
                  {brand.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Main Workflow */}
      <div className="space-y-6">
        {/* Step 1: Paste Video Link */}
        <VideoLinkInput
          brandId={selectedBrand}
          onAnalysisStart={handleAnalysisStart}
        />

        {/* Step 2: Show Analysis Results */}
        {currentAnalysisId && !scriptVariants && (
          <AnalysisResult
            analysisId={currentAnalysisId}
            onGenerateScripts={handleGenerateScripts}
          />
        )}

        {/* Step 3: Script Variants */}
        {generatingScripts && (
          <Card className="p-8">
            <div className="text-center">
              <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent" />
              <p className="mt-4 text-muted-foreground">
                Generando guiones con IA...
              </p>
            </div>
          </Card>
        )}

        {scriptVariants && (
          <ScriptVariants
            variants={scriptVariants}
            onApprove={handleApproveScript}
          />
        )}
      </div>

      {/* Templates Section */}
      <div>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold">Plantillas</h2>
            <p className="text-muted-foreground mt-1">
              Inspírate con nuestras plantillas ganadoras
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {templates.map((template, index) => (
            <Card
              key={index}
              className="group p-6 hover-lift cursor-pointer bg-secondary/30 border-border"
            >
              <div className="aspect-[3/4] bg-secondary/50 rounded-lg flex items-center justify-center mb-4">
                <Video className="w-12 h-12 text-muted-foreground/30" />
              </div>
              <h3 className="text-sm font-semibold mb-1">{template.name}</h3>
              <p className="text-xs text-muted-foreground">{template.subtitle}</p>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
