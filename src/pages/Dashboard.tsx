import { Card } from "@/components/ui/card";
import { Video } from "lucide-react";
import { UnifiedAnalysisFlow } from "@/components/dashboard/UnifiedAnalysisFlow";

const Dashboard = () => {
  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold mb-2">¿Qué creamos hoy?</h1>
        <p className="text-muted-foreground">
          Convierte videos virales en variantes optimizadas para tu marca
        </p>
      </div>

      {/* Unified Workflow */}
      <UnifiedAnalysisFlow />

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
    </div>
  );
};

export default Dashboard;
