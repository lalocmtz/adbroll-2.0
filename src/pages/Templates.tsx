import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Video, Plus, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

interface TemplateSection {
  id: string;
  template_id: string;
  type: string;
  title: string;
  description: string | null;
  expected_duration: number;
  text_prompt: string;
  order_index: number;
}

interface Template {
  id: string;
  name: string;
  description: string | null;
  use_case: string | null;
  preview_video_url: string | null;
  is_public: boolean;
  sections?: TemplateSection[];
}

const Templates = () => {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState("Todas");
  const { toast } = useToast();
  const navigate = useNavigate();

  const templateCategories = [
    "Todas",
    "Problema + solución",
    "Demo producto",
    "Retargeting",
    "Urgencia",
    "Ofertas",
  ];

  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    try {
      setIsLoading(true);
      const { data: templatesData, error: templatesError } = await supabase
        .from("templates")
        .select("*")
        .eq("is_public", true);

      if (templatesError) throw templatesError;

      // Load sections for each template
      const templatesWithSections = await Promise.all(
        (templatesData || []).map(async (template) => {
          const { data: sections } = await supabase
            .from("template_sections")
            .select("*")
            .eq("template_id", template.id)
            .order("order_index");

          return { ...template, sections: sections || [] };
        })
      );

      setTemplates(templatesWithSections);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error al cargar plantillas",
        description: error.message,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleUseTemplate = (template: Template) => {
    // Navigate to Studio with template selected
    navigate("/studio", { state: { templateId: template.id } });
  };

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
        {templateCategories.map((category) => (
          <Button
            key={category}
            variant={selectedCategory === category ? "default" : "outline"}
            onClick={() => setSelectedCategory(category)}
          >
            {category}
          </Button>
        ))}
      </div>

      {/* Templates Grid */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {templates.map((template) => (
            <Card
              key={template.id}
              className="group p-6 hover-lift cursor-pointer bg-secondary/30"
            >
              <div className="aspect-[3/4] bg-secondary/50 rounded-lg flex items-center justify-center mb-4">
                <Video className="w-12 h-12 text-muted-foreground/30" />
              </div>
              <div className="space-y-2 mb-4">
                <h3 className="text-sm font-semibold">{template.name}</h3>
                <p className="text-xs text-muted-foreground line-clamp-2">
                  {template.description}
                </p>
                <p className="text-xs text-accent font-medium">
                  {template.use_case}
                </p>
                {template.sections && template.sections.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {template.sections.slice(0, 3).map((section) => (
                      <span
                        key={section.id}
                        className="text-xs bg-accent/10 text-accent px-2 py-1 rounded"
                      >
                        {section.title}
                      </span>
                    ))}
                    {template.sections.length > 3 && (
                      <span className="text-xs text-muted-foreground px-2 py-1">
                        +{template.sections.length - 3}
                      </span>
                    )}
                  </div>
                )}
              </div>
              <Button
                variant="outline"
                size="sm"
                className="w-full"
                onClick={() => handleUseTemplate(template)}
              >
                Usar con mi marca
              </Button>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default Templates;
