import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Video, Plus } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

const Templates = () => {
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  const templateCategories = [
    "Todas",
    "Unboxing",
    "Problema + solución",
    "Lista de beneficios",
    "Urgencia",
    "Mini historia",
    "Antes y después",
  ];

  const templates = [
    { name: "Unboxing", subtitle: "Tha adlgd gummies", category: "Unboxing" },
    { name: "Problema + solución", subtitle: "Tha adlgd gummies", category: "Problema + solución" },
    { name: "Lista de beneficios", subtitle: "Tha adlgd gummies", category: "Lista de beneficios" },
    { name: "Urgencia", subtitle: "Tha adlgd gummies", category: "Urgencia" },
  ];

  const blocks = [
    { name: "HOOK", duration: 3 },
    { name: "Problema", duration: 5 },
    { name: "CTA", duration: 3 },
  ];

  const availableBlocks = [
    "Prueba social",
    "Unboxing",
    "Frustracion",
    "Aplicacion",
  ];

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="mb-2">Plantillas</h1>
          <p className="text-muted-foreground">
            Elige una estructura probada y úsala con tu marca
          </p>
        </div>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button className="btn-primary">Crear mi propia plantilla</Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-2xl">Crear plantilla</DialogTitle>
            </DialogHeader>
            
            <div className="space-y-6 py-4">
              <div className="flex gap-4">
                <Button variant="outline">Manual</Button>
                <Button variant="ghost">Convertir video en plantilla</Button>
              </div>

              <div>
                <h3 className="font-semibold mb-4">
                  Arrastra los bloques en el orden que quieras y haz tu propia plantilla
                </h3>
                
                <div className="grid grid-cols-2 gap-8">
                  <div>
                    <h4 className="text-sm font-semibold mb-3">Estructura del video</h4>
                    <div className="space-y-3">
                      {blocks.map((block, index) => (
                        <div
                          key={index}
                          className="flex items-center gap-3 p-4 rounded-lg bg-accent/10 border border-accent/20"
                        >
                          <span className="flex-1 font-medium">{block.name}</span>
                          <span className="text-sm text-muted-foreground">
                            {block.duration}s
                          </span>
                        </div>
                      ))}
                      <Button variant="outline" className="w-full gap-2">
                        <Plus className="w-4 h-4" />
                        Agregar bloque
                      </Button>
                    </div>
                    <p className="text-sm text-muted-foreground mt-3">
                      11 segundos durará el video
                    </p>
                  </div>

                  <div>
                    <h4 className="text-sm font-semibold mb-3">Bloques disponibles</h4>
                    <div className="flex flex-wrap gap-2">
                      {availableBlocks.map((block, index) => (
                        <Badge
                          key={index}
                          variant="outline"
                          className="px-4 py-2 cursor-pointer hover:bg-accent/10"
                        >
                          {block}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <Input placeholder="Asigna un nombre a la plantilla" className="flex-1" />
                <Button className="btn-primary">Guardar plantilla</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Category Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {templateCategories.map((category, index) => (
          <Button
            key={index}
            variant={index === 0 ? "default" : "outline"}
            className={index === 0 ? "bg-primary text-primary-foreground" : ""}
          >
            {category}
          </Button>
        ))}
      </div>

      {/* Templates Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {templates.map((template, index) => (
          <Card
            key={index}
            className="group p-6 hover-lift cursor-pointer bg-secondary/30"
          >
            <div className="aspect-[3/4] bg-secondary/50 rounded-lg flex items-center justify-center mb-4">
              <Video className="w-12 h-12 text-muted-foreground/30" />
            </div>
            <h3 className="text-sm font-semibold mb-1">{template.name}</h3>
            <p className="text-xs text-muted-foreground">{template.subtitle}</p>
            <Button variant="outline" size="sm" className="w-full mt-4">
              Usar con mi marca
            </Button>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default Templates;
