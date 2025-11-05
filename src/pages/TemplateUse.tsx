import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowLeft, AlertTriangle, CheckCircle2, Loader2 } from "lucide-react";
import { SectionClipAssignment } from "@/components/templates/SectionClipAssignment";

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
  sections?: TemplateSection[];
}

interface Brand {
  id: string;
  name: string;
  product_description: string | null;
  tone_of_voice: string | null;
}

interface BrollFolder {
  id: string;
  name: string;
  brand_id: string | null;
  filesCount: number;
}

interface SectionAssignment {
  sectionId: string;
  clipId: string | null;
  folderId: string | null;
}

const TemplateUse = () => {
  const { templateId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [template, setTemplate] = useState<Template | null>(null);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [selectedBrandId, setSelectedBrandId] = useState<string>("");
  const [folders, setFolders] = useState<BrollFolder[]>([]);
  const [assignments, setAssignments] = useState<SectionAssignment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [validationWarnings, setValidationWarnings] = useState<string[]>([]);

  useEffect(() => {
    loadData();
  }, [templateId]);

  useEffect(() => {
    if (selectedBrandId) {
      loadBrandFolders();
    }
  }, [selectedBrandId]);

  useEffect(() => {
    if (template?.sections && folders.length > 0) {
      validateBrollAvailability();
    }
  }, [folders, template]);

  const loadData = async () => {
    try {
      setIsLoading(true);

      // Load template with sections
      const { data: templateData, error: templateError } = await supabase
        .from("templates")
        .select("*")
        .eq("id", templateId)
        .single();

      if (templateError) throw templateError;

      const { data: sections, error: sectionsError } = await supabase
        .from("template_sections")
        .select("*")
        .eq("template_id", templateId)
        .order("order_index");

      if (sectionsError) throw sectionsError;

      setTemplate({ ...templateData, sections: sections || [] });

      // Initialize assignments
      setAssignments(
        (sections || []).map((section) => ({
          sectionId: section.id,
          clipId: null,
          folderId: null,
        }))
      );

      // Load user brands
      const { data: brandsData, error: brandsError } = await supabase
        .from("brands")
        .select("id, name, product_description, tone_of_voice")
        .order("created_at", { ascending: false });

      if (brandsError) throw brandsError;
      setBrands(brandsData || []);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error al cargar plantilla",
        description: error.message,
      });
      navigate("/templates");
    } finally {
      setIsLoading(false);
    }
  };

  const loadBrandFolders = async () => {
    try {
      const { data: foldersData, error: foldersError } = await supabase
        .from("broll_folders")
        .select("id, name, brand_id")
        .eq("brand_id", selectedBrandId);

      if (foldersError) throw foldersError;

      // Count files in each folder
      const foldersWithCounts = await Promise.all(
        (foldersData || []).map(async (folder) => {
          const { count } = await supabase
            .from("broll_files")
            .select("*", { count: "exact", head: true })
            .eq("folder_id", folder.id);

          return { ...folder, filesCount: count || 0 };
        })
      );

      setFolders(foldersWithCounts);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error al cargar carpetas",
        description: error.message,
      });
    }
  };

  const validateBrollAvailability = () => {
    const warnings: string[] = [];

    if (folders.length === 0) {
      warnings.push(
        "No tienes carpetas de B-Roll creadas. Necesitas organizar tus videos primero."
      );
    }

    const emptyFolders = folders.filter((f) => f.filesCount === 0);
    if (emptyFolders.length > 0) {
      warnings.push(
        `Tienes ${emptyFolders.length} carpeta(s) vacía(s): ${emptyFolders.map((f) => f.name).join(", ")}`
      );
    }

    const totalClips = folders.reduce((sum, f) => sum + f.filesCount, 0);
    const requiredSections = template?.sections?.length || 0;

    if (totalClips < requiredSections) {
      warnings.push(
        `Esta plantilla requiere al menos ${requiredSections} clips, pero solo tienes ${totalClips} disponibles.`
      );
    }

    setValidationWarnings(warnings);
  };

  const handleAssignmentChange = (
    sectionId: string,
    clipId: string | null,
    folderId: string | null
  ) => {
    setAssignments((prev) =>
      prev.map((a) =>
        a.sectionId === sectionId ? { ...a, clipId, folderId } : a
      )
    );
  };

  const handleProceed = () => {
    const unassigned = assignments.filter((a) => !a.clipId);
    
    if (unassigned.length > 0) {
      toast({
        variant: "destructive",
        title: "Asignación incompleta",
        description: `Faltan asignar clips a ${unassigned.length} sección(es)`,
      });
      return;
    }

    // Navigate to Studio with assignments
    navigate("/studio/template", {
      state: {
        templateId: template?.id,
        brandId: selectedBrandId,
        assignments: assignments,
      },
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!template) {
    return null;
  }

  const allAssigned = assignments.every((a) => a.clipId !== null);
  const hasWarnings = validationWarnings.length > 0;

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate("/templates")}
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h1 className="mb-1">Usar plantilla: {template.name}</h1>
          <p className="text-muted-foreground text-sm">
            {template.description}
          </p>
        </div>
      </div>

      {/* Brand Selection */}
      <Card className="p-6">
        <h2 className="text-lg font-semibold mb-4">1. Selecciona tu marca</h2>
        <Select value={selectedBrandId} onValueChange={setSelectedBrandId}>
          <SelectTrigger className="w-full max-w-md">
            <SelectValue placeholder="Elige una marca..." />
          </SelectTrigger>
          <SelectContent>
            {brands.map((brand) => (
              <SelectItem key={brand.id} value={brand.id}>
                {brand.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {brands.length === 0 && (
          <Alert className="mt-4">
            <AlertTriangle className="w-4 h-4" />
            <AlertDescription>
              No tienes marcas creadas.{" "}
              <Button
                variant="link"
                className="p-0 h-auto"
                onClick={() => navigate("/brands")}
              >
                Crear una marca
              </Button>
            </AlertDescription>
          </Alert>
        )}
      </Card>

      {/* Validation Warnings */}
      {selectedBrandId && hasWarnings && (
        <Alert variant="destructive">
          <AlertTriangle className="w-4 h-4" />
          <AlertDescription>
            <div className="font-semibold mb-2">
              Advertencias de B-Roll:
            </div>
            <ul className="list-disc list-inside space-y-1">
              {validationWarnings.map((warning, idx) => (
                <li key={idx} className="text-sm">
                  {warning}
                </li>
              ))}
            </ul>
            <Button
              variant="outline"
              size="sm"
              className="mt-3"
              onClick={() => navigate("/broll")}
            >
              Ir a B-Roll Library
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Clip Assignment */}
      {selectedBrandId && (
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">
              2. Asigna clips a cada sección
            </h2>
            {allAssigned && (
              <div className="flex items-center gap-2 text-sm text-green-600">
                <CheckCircle2 className="w-4 h-4" />
                <span>Todas las secciones asignadas</span>
              </div>
            )}
          </div>

          <div className="space-y-4">
            {template.sections?.map((section) => (
              <SectionClipAssignment
                key={section.id}
                section={section}
                brandId={selectedBrandId}
                folders={folders}
                assignment={
                  assignments.find((a) => a.sectionId === section.id) || {
                    sectionId: section.id,
                    clipId: null,
                    folderId: null,
                  }
                }
                onAssignmentChange={handleAssignmentChange}
              />
            ))}
          </div>
        </Card>
      )}

      {/* Action Buttons */}
      {selectedBrandId && (
        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={() => navigate("/templates")}>
            Cancelar
          </Button>
          <Button
            className="btn-primary"
            disabled={!allAssigned}
            onClick={handleProceed}
          >
            Continuar al Studio
          </Button>
        </div>
      )}
    </div>
  );
};

export default TemplateUse;
