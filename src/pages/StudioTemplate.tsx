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
import { VariantCountSelector } from "@/components/studio/VariantCountSelector";
import { VariationTypeSelector } from "@/components/studio/VariationTypeSelector";
import { HookVariantTypeSelector } from "@/components/studio/HookVariantTypeSelector";
import { HookSelector } from "@/components/studio/HookSelector";
import { HookPreview } from "@/components/studio/HookPreview";

interface SectionScript {
  sectionId: string;
  text: string;
}

interface Assignment {
  sectionId: string;
  clipId: string;
  folderId: string;
}

interface HookConfig {
  variantIndex: number;
  clipId: string;
  folderId?: string;
  skipVariant?: boolean;
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
  const [numVariants, setNumVariants] = useState(1);
  const [variationType, setVariationType] = useState<"hook" | "full">("hook");
  const [hookVariantType, setHookVariantType] = useState<"text" | "visual">("text");
  const [hookConfigs, setHookConfigs] = useState<HookConfig[]>([]);

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
    console.log("🚀 [FRONTEND] handleRenderVideo called");
    console.log("📊 [FRONTEND] Initial state:", {
      voiceoverUrl: !!voiceoverUrl,
      projectId,
      numVariants,
      assignmentsCount: assignments.length,
      scriptsCount: scripts.length,
    });

    if (!voiceoverUrl) {
      console.error("❌ [FRONTEND] No voiceover URL available");
      toast({
        variant: "destructive",
        title: "Falta voiceover",
        description: "Genera primero la narración de voz",
      });
      return;
    }

    if (!projectId) {
      console.error("❌ [FRONTEND] No project ID available");
      toast({
        variant: "destructive",
        title: "Error",
        description: "No hay proyecto creado. Genera primero los guiones.",
      });
      return;
    }

    console.log("✅ [FRONTEND] Validation passed, starting render process...");

    try {
      setIsRendering(true);
      console.log("⏳ [FRONTEND] isRendering set to true");

      const {
        data: { user },
      } = await supabase.auth.getUser();
      
      console.log("👤 [FRONTEND] User fetched:", user?.id);
      
      if (!user) {
        console.error("❌ [FRONTEND] No authenticated user");
        throw new Error("No authenticated");
      }

      console.log(`📝 [FRONTEND] Creating ${numVariants} variants...`);
      const createdVariants = [];

      for (let i = 0; i < numVariants; i++) {
        console.log(`🔄 [FRONTEND] Creating variant ${i + 1}/${numVariants}`);
        
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
          console.error("❌ [FRONTEND] Error creating variant:", variantError);
          throw variantError;
        }

        console.log(`✅ [FRONTEND] Variant created: ${variant.id}`);

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
        console.log(`🎬 [FRONTEND] Invoking render-variant for variant ${variant.id}`);
        console.log(`📦 [FRONTEND] Payload:`, {
          variantId: variant.id,
          clipAssignmentsCount: clipAssignments.length,
          hasVoiceoverUrl: !!voiceoverUrl,
          scriptSectionsCount: scripts.length,
        });

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

        console.log(`📡 [FRONTEND] Render-variant response:`, { renderData, renderError });

        if (renderError) {
          console.error("❌ [FRONTEND] Error rendering variant:", renderError);
          
          // Update variant status to failed in DB
          await supabase
            .from("variants")
            .update({
              status: "failed",
              error_message: renderError.message || "Error al invocar función de renderizado",
            })
            .eq("id", variant.id);
          
          throw renderError;
        }

        console.log(`✅ [FRONTEND] Variant ${variant.id} render invoked successfully`);
        createdVariants.push({ ...variant, renderData });
      }

      console.log(`🎉 [FRONTEND] All ${createdVariants.length} variants created and invoked`);
      
      setGeneratedVariants(createdVariants);
      
      // Initialize progress tracking for all variants
      setVariantsProgress(createdVariants.map(v => ({
        id: v.id,
        status: 'queued',
        progress: 0,
        message: 'En cola...',
      })));

      console.log("📊 [FRONTEND] Progress tracking initialized for variants:", createdVariants.map(v => v.id));

      toast({
        title: `Renderizando ${numVariants} variantes`,
        description: "Sigue el progreso en tiempo real abajo",
      });
    } catch (error: any) {
      console.error("❌❌❌ [FRONTEND] CRITICAL ERROR in handleRenderVideo:", error);
      console.error("❌ [FRONTEND] Error stack:", error.stack);
      console.error("❌ [FRONTEND] Error message:", error.message);
      console.error("❌ [FRONTEND] Full error object:", JSON.stringify(error, null, 2));
      
      toast({
        variant: "destructive",
        title: "Error al renderizar",
        description: error.message || "Error desconocido al renderizar video",
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

      {/* Variant Configuration */}
      <Card className="p-6">
        <VariantCountSelector count={numVariants} onChange={setNumVariants} />
      </Card>

      {numVariants === 3 && (
        <Card className="p-6">
          <VariationTypeSelector 
            type={variationType} 
            onChange={(newType) => {
              setVariationType(newType);
              // Clear previous configurations when switching
              setHookConfigs([]);
            }} 
          />
        </Card>
      )}

      {/* Hook Variation Section */}
      {numVariants === 3 && variationType === "hook" && brandId && (
        <Card className="p-6">
          <div className="space-y-4">
            <HookVariantTypeSelector
              type={hookVariantType}
              onChange={setHookVariantType}
            />

            {hookVariantType === "text" && (
              <Card className="p-6 border-dashed bg-muted/30">
                <div className="text-center space-y-2">
                  <p className="font-medium">Variantes de texto 📝</p>
                  <p className="text-sm text-muted-foreground">
                    Se generarán 3 textos diferentes como hook con el mismo clip visual
                  </p>
                </div>
              </Card>
            )}

            {hookVariantType === "visual" && (
              <div className="space-y-3">
                <div>
                  <p className="text-sm font-medium mb-1">Tus hooks para esta campaña 🎯</p>
                  <p className="text-xs text-muted-foreground">
                    Esto es lo que verá tu cliente en los primeros 3 segundos
                  </p>
                </div>
                <HookSelector
                  brandId={brandId}
                  numVariants={numVariants}
                  hooks={hookConfigs}
                  onChange={setHookConfigs}
                />
              </div>
            )}
          </div>
        </Card>
      )}

      {/* Full Script Variation Section */}
      {numVariants === 3 && variationType === "full" && (
        <Card className="p-6">
          <div className="space-y-4">
            <div>
              <p className="text-sm font-medium mb-1">Tus guiones para esta campaña ✨</p>
              <p className="text-xs text-muted-foreground">
                Cada variante tendrá un guión único y optimizado
              </p>
            </div>
            <Card className="p-6 border-dashed bg-muted/30">
              <div className="text-center space-y-2">
                <Sparkles className="w-8 h-8 text-primary/50 mx-auto" />
                <p className="text-sm text-muted-foreground">
                  Los guiones se generarán automáticamente al renderizar las variantes
                </p>
                <p className="text-xs text-muted-foreground">
                  Cada uno estará optimizado para diferentes ángulos creativos
                </p>
              </div>
            </Card>
          </div>
        </Card>
      )}

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

          <Button
            onClick={() => {
              console.log("🖱️ [FRONTEND] Render button clicked!");
              console.log("📊 [FRONTEND] Button state:", {
                voiceoverUrl: !!voiceoverUrl,
                isRendering,
                disabled: !voiceoverUrl || isRendering,
              });
              handleRenderVideo();
            }}
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
