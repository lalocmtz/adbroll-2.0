import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Video, Upload } from "lucide-react";
import { toast } from "sonner";

const Dashboard = () => {
  const [videoUrl, setVideoUrl] = useState("");

  const handleCloneVideo = () => {
    if (!videoUrl) {
      toast.error("Por favor ingresa un link de video");
      return;
    }
    toast.success("¡Detectamos magia en ese link!");
    // TODO: Process video
  };

  const templates = [
    { name: "Unboxing", subtitle: "Tha adlgd gummies" },
    { name: "Problema + solución", subtitle: "Tha adlgd gummies" },
    { name: "Lista de beneficios", subtitle: "Tha adlgd gummies" },
    { name: "Urgencia", subtitle: "Tha adlgd gummies" },
  ];

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      {/* Hero Section */}
      <div>
        <h1 className="mb-2">¿Qué creamos hoy?</h1>
        <p className="text-muted-foreground text-lg mb-6">Pega tu link de video</p>
        <p className="text-sm text-muted-foreground mb-4">
          Soportamos TikTok, Instagram, YouTube y más
        </p>

        <div className="flex gap-3 max-w-2xl">
          <Input
            placeholder="Pegar link de tiktok/meta/Youtube"
            value={videoUrl}
            onChange={(e) => setVideoUrl(e.target.value)}
            className="flex-1"
          />
          <Button onClick={handleCloneVideo} className="btn-primary">
            Clonar este video
          </Button>
        </div>

        <Button variant="ghost" className="mt-4 gap-2">
          <Upload className="w-4 h-4" />
          Subir video
        </Button>
      </div>

      {/* Templates Section */}
      <div>
        <div className="flex items-center justify-between mb-6">
          <h2>Plantillas</h2>
          <Button variant="link" className="text-sm">
            Ver todas
          </Button>
        </div>
        <p className="text-muted-foreground mb-6">
          Inspírate con nuestras plantillas ganadoras
        </p>

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
