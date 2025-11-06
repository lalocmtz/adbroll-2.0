import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertTriangle, CheckCircle2, X } from "lucide-react";
import { SectionClipAssignment } from "@/components/templates/SectionClipAssignment";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

interface ApplyToBrandSectionProps {
  analysis: any;
  onClose: () => void;
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

export function ApplyToBrandSection({
  analysis,
  onClose,
}: ApplyToBrandSectionProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [selectedBrandId, setSelectedBrandId] = useState("");
  const [folders, setFolders] = useState<BrollFolder[]>([]);
  const [assignments, setAssignments] = useState<SectionAssignment[]>([]);
  const [validationWarnings, setValidationWarnings] = useState<string[]>([]);

  const { data: brands } = useQuery({
    queryKey: ["brands"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("brands")
        .select("id, name, product_description, tone_of_voice")
        .order("name");

      if (error) throw error;
      return data;
    },
  });

  // Fetch full analysis if only ID is provided
  const { data: fullAnalysis, isLoading: isLoadingAnalysis } = useQuery({
    queryKey: ["video-analysis", analysis.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("video_analyses")
        .select("*")
        .eq("id", analysis.id)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !analysis.structure, // Only fetch if structure is not provided
  });

  const analysisData = fullAnalysis || analysis;
  const structure = analysisData.structure as any;
  const sections = structure?.sections || [];

  useEffect(() => {
    // Initialize assignments for each section
    setAssignments(
      sections.map((section: any, index: number) => ({
        sectionId: `section-${index}`,
        clipId: null,
        folderId: null,
      }))
    );
  }, []);

  useEffect(() => {
    if (selectedBrandId) {
      loadBrandFolders();
    }
  }, [selectedBrandId]);

  useEffect(() => {
    if (folders.length > 0) {
      validateBrollAvailability();
    }
  }, [folders]);

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
      toast.error("Error al cargar carpetas: " + error.message);
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
    if (totalClips < sections.length) {
      warnings.push(
        `Este video requiere al menos ${sections.length} clips, pero solo tienes ${totalClips} disponibles.`
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

  const handleProceed = async () => {
    const unassigned = assignments.filter((a) => !a.clipId);

    if (unassigned.length > 0) {
      toast.error(`Faltan asignar clips a ${unassigned.length} sección(es)`);
      return;
    }

    try {
      // Create slots_data from assignments
      const slotsData: any = {};
      assignments.forEach((assignment, index) => {
        const section = sections[index];
        slotsData[`section-${index}`] = {
          type: section.type,
          clipId: assignment.clipId,
          text: section.text,
        };
      });

      // Create project with analysis
      const { data: project, error: projectError } = await supabase
        .from("projects")
        .insert({
          user_id: user?.id,
          name: `Proyecto - ${brands?.find(b => b.id === selectedBrandId)?.name || "Sin nombre"}`,
          brand_id: selectedBrandId,
          analysis_id: analysisData.id,
          generated_script: sections.map((s: any) => s.text).join("\n\n"),
          slots_data: slotsData,
          status: "draft",
        } as any)
        .select()
        .single();

      if (projectError) throw projectError;

      toast.success("Proyecto creado exitosamente");
      navigate(`/studio/${project.id}`);
    } catch (error: any) {
      console.error("Error creating project:", error);
      toast.error("Error al crear el proyecto: " + error.message);
    }
  };

  const allAssigned = assignments.every((a) => a.clipId !== null);
  const hasWarnings = validationWarnings.length > 0;

  if (isLoadingAnalysis) {
    return (
      <Card className="p-8">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent" />
          <p className="mt-4 text-muted-foreground">Cargando análisis...</p>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6 mt-6 space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Aplicar a mi marca</h3>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="w-4 h-4" />
        </Button>
      </div>

      {/* Brand Selection */}
      <div className="space-y-2">
        <Label>1. Selecciona tu marca</Label>
        <Select value={selectedBrandId} onValueChange={setSelectedBrandId}>
          <SelectTrigger>
            <SelectValue placeholder="Elige una marca..." />
          </SelectTrigger>
          <SelectContent>
            {brands?.map((brand) => (
              <SelectItem key={brand.id} value={brand.id}>
                {brand.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {brands?.length === 0 && (
          <Alert>
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
      </div>

      {/* Validation Warnings */}
      {selectedBrandId && hasWarnings && (
        <Alert variant="destructive">
          <AlertTriangle className="w-4 h-4" />
          <AlertDescription>
            <div className="font-semibold mb-2">Advertencias de B-Roll:</div>
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
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Label>2. Asigna clips de B-Roll a cada sección</Label>
            {allAssigned && (
              <div className="flex items-center gap-2 text-sm text-green-600">
                <CheckCircle2 className="w-4 h-4" />
                <span>Todas las secciones asignadas</span>
              </div>
            )}
          </div>

          <div className="space-y-4">
            {sections.map((section: any, index: number) => {
              const sectionData = {
                id: `section-${index}`,
                template_id: analysis.id,
                type: section.type,
                title: section.type,
                description: null,
                expected_duration: section.duration || section.end_time - section.start_time,
                text_prompt: section.text,
                order_index: index,
              };

              return (
                <SectionClipAssignment
                  key={sectionData.id}
                  section={sectionData}
                  brandId={selectedBrandId}
                  folders={folders}
                  assignment={
                    assignments.find((a) => a.sectionId === sectionData.id) || {
                      sectionId: sectionData.id,
                      clipId: null,
                      folderId: null,
                    }
                  }
                  onAssignmentChange={handleAssignmentChange}
                />
              );
            })}
          </div>
        </div>
      )}

      {/* Action Buttons */}
      {selectedBrandId && (
        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button disabled={!allAssigned} onClick={handleProceed}>
            Continuar al Studio
          </Button>
        </div>
      )}
    </Card>
  );
}
