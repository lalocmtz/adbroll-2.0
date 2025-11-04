import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Plus } from "lucide-react";

const Brands = () => {
  const brands = [
    {
      name: "feelink",
      type: "Sitio web",
      clips: 0,
      projects: 0,
      color: "bg-orange-600",
      initials: "F",
    },
  ];

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="mb-2">Mis Marcas</h1>
          <p className="text-muted-foreground">
            Gestiona tus marcas y proyectos de video
          </p>
        </div>
        <Button className="btn-primary gap-2">
          <Plus className="w-4 h-4" />
          Nueva Marca
        </Button>
      </div>

      {/* Brands Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {brands.map((brand, index) => (
          <Card
            key={index}
            className="group p-6 hover-lift cursor-pointer bg-card"
          >
            <div className="flex items-start gap-4">
              <div
                className={`w-12 h-12 rounded-full ${brand.color} flex items-center justify-center text-white font-bold text-xl`}
              >
                {brand.initials}
              </div>
              <div className="flex-1">
                <h3 className="font-semibold mb-1">{brand.name}</h3>
                <p className="text-sm text-muted-foreground mb-3">
                  {brand.type}
                </p>
                <div className="flex gap-4 text-sm text-muted-foreground">
                  <span>{brand.clips} clips</span>
                  <span>{brand.projects} proyectos</span>
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default Brands;
