import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowLeft, Play, Download } from "lucide-react";
import { toast } from "sonner";
import { ClipAssignment } from "@/components/studio/ClipAssignment";
import { VoiceSelection } from "@/components/studio/VoiceSelection";
import { RenderProgress } from "@/components/studio/RenderProgress";

export default function Studio() {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const [selectedVoice, setSelectedVoice] = useState("EXAVITQu4vr4xnSDxMaL"); // Sarah by default
  const [clipAssignments, setClipAssignments] = useState<any[]>([]);
  const [isGeneratingVoice, setIsGeneratingVoice] = useState(false);
  const [voiceoverUrl, setVoiceoverUrl] = useState<string | null>(null);
  const [isRendering, setIsRendering] = useState(false);

  const { data: project, isLoading } = useQuery({
    queryKey: ["project", projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("projects")
        .select(`
          *,
          brands(id, name),
          video_analyses(structure)
        `)
        .eq("id", projectId)
        .single();

      if (error) throw error;
      return data;
    },
  });

  const { data: variants } = useQuery({
    queryKey: ["variants", projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("variants")
        .select("*")
        .eq("project_id", projectId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
  });

  const handleGenerateVoiceover = async () => {
    if (!project?.generated_script) {
      toast.error("No hay guion generado");
      return;
    }

    setIsGeneratingVoice(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-voiceover", {
        body: {
          script: project.generated_script,
          voiceId: selectedVoice,
          projectId: project.id,
        },
      });

      if (error) throw error;

      setVoiceoverUrl(data.audioUrl);
      toast.success("Voiceover generado exitosamente");
    } catch (error: any) {
      console.error("Error generating voiceover:", error);
      toast.error(error.message || "Error al generar voiceover");
    } finally {
      setIsGeneratingVoice(false);
    }
  };

  const handleAssignClips = async () => {
    if (!project?.brand_id) return;

    try {
      const scriptSections = JSON.parse(project.generated_script || "[]");

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("No autenticado");

      const { data, error } = await supabase.functions.invoke("assign-clips", {
        body: {
          scriptSections,
          brandId: project.brand_id,
          userId: user.id,
        },
      });

      if (error) throw error;

      setClipAssignments(data.assignments || []);
      toast.success("Clips asignados automáticamente");
    } catch (error: any) {
      console.error("Error assigning clips:", error);
      toast.error(error.message || "Error al asignar clips");
    }
  };

  const handleRender = async () => {
    if (!voiceoverUrl || clipAssignments.length === 0) {
      toast.error("Necesitas generar el voiceover y asignar clips primero");
      return;
    }

    setIsRendering(true);
    try {
      const scriptSections = JSON.parse(project?.generated_script || "[]");

      // Create variant
      const { data: variant, error: variantError } = await supabase
        .from("variants")
        .insert({
          project_id: projectId,
          user_id: (await supabase.auth.getUser()).data.user?.id,
          status: "queued",
        })
        .select()
        .single();

      if (variantError) throw variantError;

      // Trigger render
      const { data, error } = await supabase.functions.invoke("render-variant", {
        body: {
          variantId: variant.id,
          clipAssignments,
          voiceoverUrl,
          scriptSections,
        },
      });

      if (error) throw error;

      toast.success("Video renderizado exitosamente (Placeholder)");
      
      // Refresh variants list
      window.location.reload();
    } catch (error: any) {
      console.error("Error rendering:", error);
      toast.error(error.message || "Error al renderizar");
    } finally {
      setIsRendering(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">Cargando proyecto...</div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="container mx-auto p-8">
        <Card className="p-12 text-center">
          <h2 className="text-2xl font-bold mb-2">Proyecto no encontrado</h2>
          <Button onClick={() => navigate("/dashboard")}>Volver al Dashboard</Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-8">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <Button
          variant="ghost"
          onClick={() => navigate("/dashboard")}
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Volver
        </Button>
        <div className="flex-1">
          <h1 className="text-4xl font-bold">{project.name}</h1>
          <p className="text-muted-foreground">
            Marca: {project.brands?.name}
          </p>
        </div>
      </div>

      {/* Workflow Steps */}
      <div className="grid gap-6 mb-8">
        {/* Step 1: Voice Selection */}
        <Card className="p-6">
          <h2 className="text-2xl font-bold mb-4">1. Seleccionar Voz</h2>
          <VoiceSelection
            selectedVoice={selectedVoice}
            onVoiceSelect={setSelectedVoice}
            onGenerate={handleGenerateVoiceover}
            isGenerating={isGeneratingVoice}
            voiceoverUrl={voiceoverUrl}
          />
        </Card>

        {/* Step 2: Clip Assignment */}
        <Card className="p-6">
          <h2 className="text-2xl font-bold mb-4">2. Asignar Clips</h2>
          <ClipAssignment
            assignments={clipAssignments}
            onAssign={handleAssignClips}
            onUpdate={setClipAssignments}
            brandId={project.brand_id}
          />
        </Card>

        {/* Step 3: Render */}
        <Card className="p-6">
          <h2 className="text-2xl font-bold mb-4">3. Renderizar Video</h2>
          <RenderProgress
            isRendering={isRendering}
            onRender={handleRender}
            disabled={!voiceoverUrl || clipAssignments.length === 0}
          />
        </Card>
      </div>

      {/* Generated Variants */}
      {variants && variants.length > 0 && (
        <Card className="p-6">
          <h2 className="text-2xl font-bold mb-4">Variantes Generadas</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {variants.map((variant) => (
              <Card key={variant.id} className="p-4">
                <div className="aspect-video bg-secondary rounded-lg mb-3 flex items-center justify-center">
                  <Play className="w-12 h-12 text-muted-foreground" />
                </div>
                <div className="space-y-2">
                  <p className="text-sm font-medium">
                    Estado: <span className="capitalize">{variant.status}</span>
                  </p>
                  {variant.completed_at && (
                    <p className="text-xs text-muted-foreground">
                      Completado: {new Date(variant.completed_at).toLocaleDateString()}
                    </p>
                  )}
                  {variant.status === "completed" && (
                    <Button size="sm" className="w-full">
                      <Download className="w-4 h-4 mr-2" />
                      Descargar
                    </Button>
                  )}
                  {variant.status === "failed" && (
                    <p className="text-xs text-destructive">{variant.error_message}</p>
                  )}
                </div>
              </Card>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
