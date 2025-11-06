import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

interface SaveTemplateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  analysis: any;
}

export function SaveTemplateDialog({
  open,
  onOpenChange,
  analysis,
}: SaveTemplateDialogProps) {
  const [templateName, setTemplateName] = useState("");
  const [selectedBrandId, setSelectedBrandId] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const { data: brands, isLoading: brandsLoading } = useQuery({
    queryKey: ["brands"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("brands")
        .select("id, name")
        .order("name");

      if (error) throw error;
      return data;
    },
  });

  const handleSave = async () => {
    if (!templateName.trim()) {
      toast.error("Por favor ingresa un nombre para la plantilla");
      return;
    }

    if (!selectedBrandId) {
      toast.error("Por favor selecciona una marca");
      return;
    }

    setIsSaving(true);

    try {
      const structure = analysis.structure as any;
      const sections = structure.sections || [];

      // Create template
      const { data: template, error: templateError } = await supabase
        .from("templates")
        .insert({
          name: templateName,
          description: `Plantilla generada desde video analizado (Marca: ${brands?.find(b => b.id === selectedBrandId)?.name})`,
          use_case: structure.hook?.type || "General",
          is_public: false,
        })
        .select()
        .single();

      if (templateError) throw templateError;

      // Create sections
      const templateSections = sections.map((section: any, index: number) => ({
        template_id: template.id,
        type: section.type,
        title: section.type,
        description: null,
        expected_duration: section.duration || section.end_time - section.start_time,
        text_prompt: section.text,
        order_index: index,
      }));

      const { error: sectionsError } = await supabase
        .from("template_sections")
        .insert(templateSections);

      if (sectionsError) throw sectionsError;

      toast.success("Plantilla guardada exitosamente");
      onOpenChange(false);
      setTemplateName("");
      setSelectedBrandId("");
    } catch (error: any) {
      console.error("Error saving template:", error);
      toast.error("Error al guardar la plantilla: " + error.message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Guardar como plantilla</DialogTitle>
          <DialogDescription>
            Esta plantilla se guardará y podrás reutilizarla para futuros videos
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="template-name">Nombre de la plantilla</Label>
            <Input
              id="template-name"
              placeholder="Ej: Hook + Problema + CTA"
              value={templateName}
              onChange={(e) => setTemplateName(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="brand-select">Asignar a marca</Label>
            {brandsLoading ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="w-4 h-4 animate-spin" />
              </div>
            ) : (
              <Select value={selectedBrandId} onValueChange={setSelectedBrandId}>
                <SelectTrigger id="brand-select">
                  <SelectValue placeholder="Selecciona una marca..." />
                </SelectTrigger>
                <SelectContent>
                  {brands?.map((brand) => (
                    <SelectItem key={brand.id} value={brand.id}>
                      {brand.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Guardar plantilla
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
