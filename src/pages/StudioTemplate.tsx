import { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Loader2, RefreshCw, Sparkles, Volume2, Film } from "lucide-react";
import { VoiceSelection } from "@/components/studio/VoiceSelection";
import { ScriptSection } from "@/components/studio/ScriptSection";
import { VideoPreview } from "@/components/studio/VideoPreview";
import { RenderProgress } from "@/components/studio/RenderProgress";

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
  
  const [projectId, setProjectId] = useState<string | null>(null);
  const [selectedVoice, setSelectedVoice] = useState("EXAVITQu4vr4xnSDxMaL");
  const [voiceoverUrl, setVoiceoverUrl] = useState<string | null>(null);
  const [isGeneratingVoice, setIsGeneratingVoice] = useState(false);
  const [voiceSettings, setVoiceSettings] = useState({
    stability: 0.5,
    similarity_boost: 0.75,
    style: 0,
    use_speaker_boost: false,
  });

  const [isRendering, setIsRendering] = useState(false);
  const [generatedVariants, setGeneratedVariants] = useState<any[]>([]);
  const [variantSignedUrls, setVariantSignedUrls] = useState<Map<string, string>>(new Map());
  const [variantsProgress, setVariantsProgress] = useState<any[]>([]);
  const [numVariants, setNumVariants] = useState(3);
  const [varyHookVisual, setVaryHookVisual] = useState(false);

  useEffect(() => {
    if (!templateId || !brandId || !assignments) {
      navigate("/templates");
      return;
    }
    loadStudioData();
  }, []);

  // Subscribe to realtime updates for variants
  useEffect(() => {
    if (generatedVariants.length === 0) return;

    console.log("Setting up realtime subscription for variants:", generatedVariants.map(v => v.id));

    const channel = supabase
      .channel('variant-updates')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'variants',
          filter: `id=in.(${generatedVariants.map(v => v.id).join(',')})`,
        },
        (payload) => {
          console.log('Variant updated:', payload);
          const updatedVariant = payload.new;
          
          setVariantsProgress(prev => {
            const existing = prev.find(v => v.id === updatedVariant.id);
            const metadata = updatedVariant.metadata_json || {};
            
            const updated = {
              id: updatedVariant.id,
              status: updatedVariant.status,
              progress: metadata.progress_percent || (existing?.progress || 0),
              message: metadata.progress_message || (existing?.message || 'Procesando...'),
            };

            if (existing) {
              return prev.map(v => v.id === updatedVariant.id ? updated : v);
            } else {
              return [...prev, updated];
            }
          });

          // Update signed URLs when completed
          if (updatedVariant.status === 'completed' && updatedVariant.video_url) {
            supabase.storage
              .from("renders")
              .createSignedUrl(updatedVariant.video_url, 3600)
              .then(({ data, error }) => {
                if (!error && data?.signedUrl) {
                  setVariantSignedUrls(prev => {
                    const newMap = new Map(prev);
                    newMap.set(updatedVariant.id, data.signedUrl);
                    return newMap;
                  });
                }
              });
          }
        }
      )
      .subscribe();

    return () => {
      console.log("Cleaning up realtime subscription");
      supabase.removeChannel(channel);
    };
  }, [generatedVariants]);

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

      // Create project if it doesn't exist
      if (!projectId) {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) throw new Error("No authenticated");

        const { data: newProject, error: projectError } = await supabase
          .from("projects")
          .insert({
            user_id: user.id,
            brand_id: brandId,
            template_id: templateId,
            name: `${template?.name || "Proyecto"} - ${brand?.name || "Sin marca"}`,
            status: "draft",
          })
          .select()
          .single();

        if (projectError) throw projectError;

        console.log("Project created:", newProject.id);
        setProjectId(newProject.id);
      }

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
      setScripts((prev) => {
        const updated = prev.map((s) =>
          s.sectionId === sectionId
            ? { ...s, text: data.scripts[0]?.text || s.text }
            : s
        );
        console.log('Updated scripts:', updated);
        return updated;
      });

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

    console.log("Generating voiceover with script:", fullScript);
    console.log("Voice ID:", selectedVoice);
    console.log("Voice settings:", voiceSettings);

    try {
      setIsGeneratingVoice(true);

      const { data, error } = await supabase.functions.invoke(
        "generate-voiceover",
        {
          body: {
            script: fullScript,
            voiceId: selectedVoice,
            projectId: templateId,
            settings: voiceSettings,
          },
        }
      );

      if (error) throw error;

      console.log("Voiceover generated, response:", data);
      console.log("Audio URL:", data.audioUrl);

      setVoiceoverUrl(data.audioUrl);

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

    if (!projectId) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "No hay proyecto creado. Genera primero los guiones.",
      });
      return;
    }

    try {
      setIsRendering(true);

      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("No authenticated");

      console.log(`Creating ${numVariants} variants...`);
      const createdVariants = [];

      for (let i = 0; i < numVariants; i++) {
        // Create variant record
        const { data: variant, error: variantError} = await supabase
          .from("variants")
          .insert({
            user_id: user.id,
            project_id: projectId,
            status: "queued",
          })
          .select()
          .single();

        if (variantError) {
          console.error("Error creating variant:", variantError);
          throw variantError;
        }

        console.log("Variant created:", variant.id);

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
              scriptSections: scripts.map((s) => ({
                ...s,
                duration: sections.find((sec) => sec.id === s.sectionId)
                  ?.expected_duration || 3,
              })),
            },
          });

        if (renderError) {
          console.error("Error rendering variant:", renderError);
          throw renderError;
        }

        createdVariants.push({ ...variant, renderData });
      }

      setGeneratedVariants(createdVariants);
      
      // Initialize progress tracking for all variants
      setVariantsProgress(createdVariants.map(v => ({
        id: v.id,
        status: 'queued',
        progress: 0,
        message: 'En cola...',
      })));

      toast({
        title: `Renderizando ${numVariants} variantes`,
        description: "Sigue el progreso en tiempo real abajo",
      });
    } catch (error: any) {
      console.error("Error rendering video:", error);
      toast({
        variant: "destructive",
        title: "Error al renderizar",
        description: error.message,
      });
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
          <div className="space-y-2">
            {sections.map((section) => {
              const script = scripts.find((s) => s.sectionId === section.id);

              return (
                <ScriptSection
                  key={section.id}
                  section={section}
                  script={script?.text || ""}
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
          voiceSettings={voiceSettings}
          onVoiceSettingsChange={setVoiceSettings}
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

        <div className="space-y-6">
          <p className="text-sm text-muted-foreground">
            Una vez que hayas generado la voz y revisado los guiones, puedes
            renderizar el video final con subtítulos sincronizados.
          </p>

          {/* Variant Options */}
          <div className="space-y-4">
            <div>
              <Label className="text-sm font-medium mb-2 block">
                Número de variantes
              </Label>
              <div className="flex gap-4">
                {[3, 5].map((num) => (
                  <Button
                    key={num}
                    variant={numVariants === num ? "default" : "outline"}
                    onClick={() => setNumVariants(num)}
                    className="flex-1"
                    disabled={isRendering}
                  >
                    {num} variantes
                  </Button>
                ))}
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Las variantes tendrán guiones diferentes generados por IA
              </p>
            </div>

            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="varyHook"
                checked={varyHookVisual}
                onChange={(e) => setVaryHookVisual(e.target.checked)}
                className="rounded border-gray-300"
                disabled={isRendering}
              />
              <Label htmlFor="varyHook" className="text-sm font-normal cursor-pointer">
                Variar también el hook visual (video de entrada)
              </Label>
            </div>
          </div>

          <Button
            onClick={handleRenderVideo}
            disabled={!voiceoverUrl || isRendering}
            size="lg"
            className="w-full"
          >
            {isRendering ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin mr-2" />
                Generando {numVariants} variantes...
              </>
            ) : (
              <>
                <Film className="w-5 h-5 mr-2" />
                Generar {numVariants} Variantes
              </>
            )}
          </Button>

          {/* Real-time Progress Display */}
          {variantsProgress.length > 0 && (
            <div className="mt-6">
              <h3 className="font-semibold mb-4">
                Progreso de renderizado
              </h3>
              <RenderProgress
                isRendering={isRendering}
                onRender={handleRenderVideo}
                disabled={!voiceoverUrl}
                variantsProgress={variantsProgress}
              />
            </div>
          )}

          {/* Completed Variants */}
          {generatedVariants.length > 0 && variantsProgress.some(v => v.status === 'completed') && (
            <div className="mt-6">
              <h3 className="font-semibold mb-4">
                Videos completados
              </h3>
              <div className="space-y-3">
                {generatedVariants.map((variant, idx) => {
                  const progress = variantsProgress.find(v => v.id === variant.id);
                  if (progress?.status !== 'completed') return null;

                  return (
                    <Card key={idx} className="p-4 border-2 border-green-200">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <p className="font-medium">Variante #{idx + 1}</p>
                            <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
                              Listo
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            Video renderizado con subtítulos y audio
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              const url = variantSignedUrls.get(variant.id);
                              if (url) {
                                window.open(url, "_blank");
                              } else {
                                toast({
                                  variant: "destructive",
                                  title: "Error",
                                  description: "URL del video no disponible",
                                });
                              }
                            }}
                          >
                            Ver
                          </Button>
                          <Button
                            variant="default"
                            size="sm"
                            onClick={async () => {
                              const url = variantSignedUrls.get(variant.id);
                              if (url) {
                                const link = document.createElement("a");
                                link.href = url;
                                link.download = `variante-${idx + 1}.mp4`;
                                link.click();
                              } else {
                                toast({
                                  variant: "destructive",
                                  title: "Error",
                                  description: "URL del video no disponible",
                                });
                              }
                            }}
                          >
                            Descargar
                          </Button>
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
