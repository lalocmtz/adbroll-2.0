import { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowLeft, Loader2, RefreshCw, Sparkles, Volume2, Film } from "lucide-react";
import { VoiceSelection } from "@/components/studio/VoiceSelection";
import { ScriptSection } from "@/components/studio/ScriptSection";
import { VideoPreview } from "@/components/studio/VideoPreview";

interface SectionScript {
  sectionId: string;
  text: string;
}

interface Assignment {
  sectionId: string;
  clipId: string;
  folderId: string;
}

export default function StudioTemplate() {
  const location = useLocation();
  const navigate = useNavigate();
  const { toast } = useToast();

  const { templateId, brandId, assignments } = location.state || {};

  const [template, setTemplate] = useState<any>(null);
  const [brand, setBrand] = useState<any>(null);
  const [sections, setSections] = useState<any[]>([]);
  const [clips, setClips] = useState<Map<string, any>>(new Map());
  
  const [scripts, setScripts] = useState<SectionScript[]>([]);
  const [isGeneratingScripts, setIsGeneratingScripts] = useState(false);
  const [isRegeneratingSection, setIsRegeneratingSection] = useState<string | null>(null);
  
  const [selectedVoice, setSelectedVoice] = useState("EXAVITQu4vr4xnSDxMaL");
  const [voiceoverUrl, setVoiceoverUrl] = useState<string | null>(null);
  const [isGeneratingVoice, setIsGeneratingVoice] = useState(false);

  const [isRendering, setIsRendering] = useState(false);
  const [generatedVariants, setGeneratedVariants] = useState<any[]>([]);

  useEffect(() => {
    if (!templateId || !brandId || !assignments) {
      navigate("/templates");
      return;
    }
    loadStudioData();
  }, []);

  const loadStudioData = async () => {
    try {
      // Load template
      const { data: templateData, error: templateError } = await supabase
        .from("templates")
        .select("*")
        .eq("id", templateId)
        .single();

      if (templateError) throw templateError;
      setTemplate(templateData);

      // Load sections
      const { data: sectionsData, error: sectionsError } = await supabase
        .from("template_sections")
        .select("*")
        .eq("template_id", templateId)
        .order("order_index");

      if (sectionsError) throw sectionsError;
      setSections(sectionsData || []);

      // Load brand
      const { data: brandData, error: brandError } = await supabase
        .from("brands")
        .select("*")
        .eq("id", brandId)
        .single();

      if (brandError) throw brandError;
      setBrand(brandData);

      // Load assigned clips
      const clipIds = assignments.map((a: Assignment) => a.clipId);
      const { data: clipsData, error: clipsError } = await supabase
        .from("broll_files")
        .select("*")
        .in("id", clipIds);

      if (clipsError) throw clipsError;

      const clipsMap = new Map();
      clipsData?.forEach((clip) => clipsMap.set(clip.id, clip));
      setClips(clipsMap);

      // Auto-generate scripts
      await generateScripts(sectionsData || []);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error al cargar Studio",
        description: error.message,
      });
      navigate("/templates");
    }
  };

  const generateScripts = async (sectionsToUse?: any[]) => {
    const sectionsData = sectionsToUse || sections;
    
    if (sectionsData.length === 0) return;

    try {
      setIsGeneratingScripts(true);

      const { data, error } = await supabase.functions.invoke(
        "generate-script-sections",
        {
          body: {
            templateId,
            brandId,
            sections: sectionsData,
          },
        }
      );

      if (error) throw error;

      setScripts(data.scripts || []);

      toast({
        title: "Guiones generados",
        description: "Los textos han sido generados con IA",
      });
    } catch (error: any) {
      console.error("Error generating scripts:", error);
      toast({
        variant: "destructive",
        title: "Error al generar guiones",
        description: error.message,
      });
    } finally {
      setIsGeneratingScripts(false);
    }
  };

  const regenerateSection = async (sectionId: string) => {
    const section = sections.find((s) => s.id === sectionId);
    if (!section) return;

    try {
      setIsRegeneratingSection(sectionId);

      const { data, error } = await supabase.functions.invoke(
        "generate-script-sections",
        {
          body: {
            templateId,
            brandId,
            sections: [section],
          },
        }
      );

      if (error) throw error;

      // Update just this section
      setScripts((prev) =>
        prev.map((s) =>
          s.sectionId === sectionId
            ? { ...s, text: data.scripts[0].text }
            : s
        )
      );

      toast({
        title: "Sección regenerada",
        description: `Nueva variante para ${section.title}`,
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error al regenerar",
        description: error.message,
      });
    } finally {
      setIsRegeneratingSection(null);
    }
  };

  const updateScriptText = (sectionId: string, newText: string) => {
    setScripts((prev) =>
      prev.map((s) => (s.sectionId === sectionId ? { ...s, text: newText } : s))
    );
  };

  const handleGenerateVoiceover = async () => {
    const fullScript = scripts.map((s) => s.text).join(" ");

    try {
      setIsGeneratingVoice(true);

      const { data, error } = await supabase.functions.invoke(
        "generate-voiceover",
        {
          body: {
            script: fullScript,
            voiceId: selectedVoice,
            projectId: templateId,
          },
        }
      );

      if (error) throw error;

      setVoiceoverUrl(data.voiceoverUrl);

      toast({
        title: "Voiceover generado",
        description: "La narración está lista",
      });
    } catch (error: any) {
      console.error("Error generating voiceover:", error);
      toast({
        variant: "destructive",
        title: "Error al generar voz",
        description: error.message,
      });
    } finally {
      setIsGeneratingVoice(false);
    }
  };

  const handleRenderVideo = async () => {
    if (!voiceoverUrl) {
      toast({
        variant: "destructive",
        title: "Falta voiceover",
        description: "Genera primero la narración de voz",
      });
      return;
    }

    try {
      setIsRendering(true);

      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("No authenticated");

      // Create variant record
      const { data: variant, error: variantError } = await supabase
        .from("variants")
        .insert({
          user_id: user.id,
          project_id: templateId,
          status: "queued",
        })
        .select()
        .single();

      if (variantError) throw variantError;

      // Prepare clip assignments with scripts
      const clipAssignments = assignments.map((a: Assignment) => {
        const clip = clips.get(a.clipId);
        const script = scripts.find((s) => s.sectionId === a.sectionId);
        const section = sections.find((s) => s.id === a.sectionId);

        return {
          sectionId: a.sectionId,
          clipId: a.clipId,
          clipUrl: clip?.storage_path,
          sectionType: section?.type,
          sectionTitle: section?.title,
          duration: section?.expected_duration,
          script: script?.text || "",
        };
      });

      // Call render function
      const { data: renderData, error: renderError } =
        await supabase.functions.invoke("render-variant", {
          body: {
            variantId: variant.id,
            clipAssignments,
            voiceoverUrl,
            scriptSections: scripts,
          },
        });

      if (renderError) throw renderError;

      toast({
        title: "Video renderizado",
        description: "Tu video está listo para descargar",
      });

      setGeneratedVariants((prev) => [renderData, ...prev]);
    } catch (error: any) {
      console.error("Error rendering video:", error);
      toast({
        variant: "destructive",
        title: "Error al renderizar",
        description: error.message,
      });
    } finally {
      setIsRendering(false);
    }
  };

  if (!template || !brand || sections.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-12">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate("/templates")}
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h1 className="mb-1">Studio: {template.name}</h1>
          <p className="text-muted-foreground text-sm">
            Marca: {brand.name}
          </p>
        </div>
      </div>

      {/* Video Preview */}
      <VideoPreview
        sections={sections}
        assignments={assignments}
        clips={clips}
        voiceoverUrl={voiceoverUrl}
      />

      {/* Script Generation */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-semibold">Guiones generados con IA</h2>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => generateScripts()}
            disabled={isGeneratingScripts}
          >
            {isGeneratingScripts ? (
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
            ) : (
              <RefreshCw className="w-4 h-4 mr-2" />
            )}
            Regenerar todos
          </Button>
        </div>

        {isGeneratingScripts ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">
                Generando guiones con IA...
              </p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {sections.map((section) => {
              const script = scripts.find((s) => s.sectionId === section.id);
              const assignment = assignments.find(
                (a: Assignment) => a.sectionId === section.id
              );
              const clip = assignment ? clips.get(assignment.clipId) : null;

              return (
                <ScriptSection
                  key={section.id}
                  section={section}
                  script={script?.text || ""}
                  clip={clip}
                  onUpdate={(newText) => updateScriptText(section.id, newText)}
                  onRegenerate={() => regenerateSection(section.id)}
                  isRegenerating={isRegeneratingSection === section.id}
                />
              );
            })}
          </div>
        )}
      </Card>

      {/* Voice Selection */}
      <Card className="p-6">
        <div className="flex items-center gap-2 mb-6">
          <Volume2 className="w-5 h-5 text-primary" />
          <h2 className="text-lg font-semibold">Selecciona la voz</h2>
        </div>

        <VoiceSelection
          selectedVoice={selectedVoice}
          onVoiceSelect={setSelectedVoice}
          onGenerate={handleGenerateVoiceover}
          isGenerating={isGeneratingVoice}
          voiceoverUrl={voiceoverUrl}
        />
      </Card>

      {/* Render Video */}
      <Card className="p-6">
        <div className="flex items-center gap-2 mb-6">
          <Film className="w-5 h-5 text-primary" />
          <h2 className="text-lg font-semibold">Renderizar video</h2>
        </div>

        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Una vez que hayas generado la voz y revisado los guiones, puedes
            renderizar el video final con subtítulos sincronizados.
          </p>

          <Button
            onClick={handleRenderVideo}
            disabled={!voiceoverUrl || isRendering}
            size="lg"
            className="w-full"
          >
            {isRendering ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin mr-2" />
                Renderizando...
              </>
            ) : (
              <>
                <Film className="w-5 h-5 mr-2" />
                Generar Video Final
              </>
            )}
          </Button>

          {generatedVariants.length > 0 && (
            <div className="mt-6">
              <h3 className="font-semibold mb-3">Videos generados</h3>
              <div className="space-y-2">
                {generatedVariants.map((variant, idx) => (
                  <Card key={idx} className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">Video #{idx + 1}</p>
                        <p className="text-sm text-muted-foreground">
                          {variant.note}
                        </p>
                      </div>
                      <Button variant="outline" size="sm">
                        Descargar
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
