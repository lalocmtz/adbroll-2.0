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
import { ApplyToBrandSection } from "@/components/dashboard/ApplyToBrandSection";
import { Button } from "@/components/ui/button";

interface Brand {
  id: string;
  name: string;
}

const Dashboard = () => {
  const [selectedBrand, setSelectedBrand] = useState<string | null>(null);
  const [currentStep, setCurrentStep] = useState<"input" | "analysis" | "apply">("input");
  const [currentAnalysisId, setCurrentAnalysisId] = useState<string | null>(null);
  const [showApplySection, setShowApplySection] = useState(false);

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
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    staleTime: Infinity,
  });

  // Set first brand as selected by default
  if (brands && brands.length > 0 && !selectedBrand) {
    setSelectedBrand(brands[0].id);
  }

  const handleAnalysisStart = (analysisId: string) => {
    setCurrentAnalysisId(analysisId);
    setCurrentStep("analysis");
    setShowApplySection(false);
  };

  const handleApplyToBrand = () => {
    setShowApplySection(true);
  };

  const handleCloseApply = () => {
    setShowApplySection(false);
  };

  const handleNewVideo = () => {
    setCurrentStep("input");
    setCurrentAnalysisId(null);
    setShowApplySection(false);
  };

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

      {/* Main Workflow - Step-based */}
      <div className="space-y-6">
        {currentStep === "input" && (
          <VideoLinkInput
            brandId={selectedBrand}
            onAnalysisStart={handleAnalysisStart}
          />
        )}

        {currentStep === "analysis" && currentAnalysisId && (
          <>
            {!showApplySection ? (
              <div className="space-y-4">
                <AnalysisResult
                  analysisId={currentAnalysisId}
                  onApplyToBrand={handleApplyToBrand}
                />
                <div className="flex justify-center">
                  <Button variant="outline" onClick={handleNewVideo}>
                    Analizar otro video
                  </Button>
                </div>
              </div>
            ) : (
              <ApplyToBrandSection
                analysis={{ id: currentAnalysisId }}
                onClose={handleCloseApply}
              />
            )}
          </>
        )}
      </div>

      {/* Templates Section - Only show when on input step */}
      {currentStep === "input" && (
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
            {[
              { name: "Unboxing", subtitle: "Plantilla clásica" },
              { name: "Problema + solución", subtitle: "Alto engagement" },
              { name: "Lista de beneficios", subtitle: "Conversión alta" },
              { name: "Urgencia", subtitle: "FOMO garantizado" },
            ].map((template, index) => (
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
      )}
    </div>
  );
};

export default Dashboard;
