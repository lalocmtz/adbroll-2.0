import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, ExternalLink, Briefcase } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { BrandForm } from "@/components/brands/BrandForm";
import { toast } from "sonner";

interface Brand {
  id: string;
  name: string;
  website_url: string | null;
  product_description: string | null;
  main_promise: string | null;
  created_at: string;
}

const Brands = () => {
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const queryClient = useQueryClient();

  const { data: brands, isLoading } = useQuery({
    queryKey: ["brands"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("brands")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as Brand[];
    },
  });

  const handleSuccess = () => {
    setShowCreateDialog(false);
    queryClient.invalidateQueries({ queryKey: ["brands"] });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent" />
          <p className="mt-4 text-muted-foreground">Cargando marcas...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Mis Marcas</h1>
          <p className="text-muted-foreground mt-2">
            Crea y gestiona las marcas para tus campañas publicitarias
          </p>
        </div>
        <Button onClick={() => setShowCreateDialog(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Nueva Marca
        </Button>
      </div>

      {/* Empty State */}
      {brands?.length === 0 && (
        <Card className="p-12 text-center">
          <div className="w-16 h-16 rounded-full bg-accent/10 flex items-center justify-center mx-auto mb-4">
            <Briefcase className="w-8 h-8 text-accent" />
          </div>
          <h3 className="text-xl font-bold mb-2">¡Crea tu primera marca!</h3>
          <p className="text-muted-foreground mb-6 max-w-md mx-auto">
            Necesitas crear una marca antes de poder generar variantes de video. 
            La IA usará esta información para crear guiones personalizados.
          </p>
          <Button onClick={() => setShowCreateDialog(true)} size="lg">
            <Plus className="w-4 h-4 mr-2" />
            Crear Primera Marca
          </Button>
        </Card>
      )}

      {/* Brands Grid */}
      {brands && brands.length > 0 && (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {brands.map((brand) => (
            <Card key={brand.id} className="p-6 hover-lift">
              <div className="flex items-start justify-between mb-4">
                <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center">
                  <span className="text-xl font-bold text-white">
                    {brand.name.charAt(0).toUpperCase()}
                  </span>
                </div>
                {brand.website_url && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => window.open(brand.website_url!, "_blank")}
                  >
                    <ExternalLink className="w-4 h-4" />
                  </Button>
                )}
              </div>

              <h3 className="font-bold text-lg mb-2">{brand.name}</h3>
              
              {brand.product_description && (
                <p className="text-sm text-muted-foreground line-clamp-2 mb-4">
                  {brand.product_description}
                </p>
              )}

              {brand.main_promise && (
                <div className="p-3 bg-secondary/50 rounded-lg mb-4">
                  <p className="text-xs font-medium text-muted-foreground mb-1">Promesa</p>
                  <p className="text-sm line-clamp-2">{brand.main_promise}</p>
                </div>
              )}

              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" size="sm">
                  Ver Detalles
                </Button>
                <Button variant="default" className="flex-1" size="sm">
                  Usar Marca
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Create Brand Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Crear Nueva Marca</DialogTitle>
          </DialogHeader>
          <BrandForm 
            onSuccess={handleSuccess}
            onCancel={() => setShowCreateDialog(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Brands;
