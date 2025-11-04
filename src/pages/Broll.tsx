import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Video, Plus, Upload } from "lucide-react";

const Broll = () => {
  const categories = [
    "Todos",
    "Hooks",
    "Unboxing",
    "Problema",
    "CTA",
    "Prueba social",
    "Producto",
    "Solución",
    "Uso",
  ];

  const bins = [
    { name: "Hooks", count: 0 },
    { name: "Unboxing", count: 0 },
    { name: "Problema", count: 0 },
    { name: "CTA", count: 0 },
    { name: "Prueba social", count: 0 },
    { name: "Producto", count: 0 },
    { name: "Solución", count: 0 },
    { name: "Uso", count: 0 },
    { name: "hook", count: 1, hasClip: true },
  ];

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="mb-2">Biblioteca de broll</h1>
          <p className="text-muted-foreground">
            Organiza clips por bloques para que la IA los use mejor
          </p>
        </div>
        <Button className="btn-primary gap-2">
          <Upload className="w-4 h-4" />
          Subir clips
        </Button>
      </div>

      {/* Category Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {categories.map((category, index) => (
          <Button
            key={index}
            variant={index === 0 ? "default" : "outline"}
            className={index === 0 ? "bg-primary text-primary-foreground" : ""}
          >
            {category}
          </Button>
        ))}
        <Button variant="outline" className="gap-2">
          <Plus className="w-4 h-4" />
          crear carpeta
        </Button>
      </div>

      {/* Bins Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-6">
        {bins.map((bin, index) => (
          <Card
            key={index}
            className={`group p-6 cursor-pointer transition-smooth ${
              bin.hasClip ? "bg-secondary" : "bg-secondary/30"
            } hover:bg-secondary`}
          >
            <div className="aspect-square bg-background/50 rounded-lg flex flex-col items-center justify-center mb-4 relative">
              {bin.hasClip ? (
                <>
                  <Video className="w-16 h-16 text-foreground" />
                  <div className="absolute top-2 right-2 bg-accent text-white text-xs font-semibold px-2 py-1 rounded">
                    {bin.count}
                  </div>
                </>
              ) : (
                <Video className="w-12 h-12 text-muted-foreground/30" />
              )}
            </div>
            <div className="text-center">
              <p className="text-sm text-muted-foreground mb-1">Carpeta vacía</p>
              <Button
                variant="ghost"
                size="icon"
                className="w-8 h-8 mx-auto rounded-full bg-secondary-foreground/10 hover:bg-secondary-foreground/20"
              >
                <Plus className="w-4 h-4" />
              </Button>
            </div>
            <div className="mt-3 text-center">
              <h3 className="text-sm font-semibold">{bin.name}</h3>
              <p className="text-xs text-muted-foreground">{bin.count} clips</p>
            </div>
            {bin.hasClip && (
              <Button variant="default" size="sm" className="w-full mt-3 bg-accent">
                Custom
              </Button>
            )}
          </Card>
        ))}
      </div>
    </div>
  );
};

export default Broll;
