import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { 
  Link2, 
  Loader2, 
  FileText, 
  Mic, 
  Film,
  Sparkles,
  Package,
  FolderOpen,
  Menu
} from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { ScriptTab } from "./tabs/ScriptTab";
import { VoiceTab } from "./tabs/VoiceTab";
import { ClipsTab } from "./tabs/ClipsTab";
import { VariantsTab } from "./tabs/VariantsTab";

const urlSchema = z.string().url("Ingresa una URL válida").refine(
  (url) => {
    return (
      url.includes("tiktok.com") ||
      url.includes("instagram.com") ||
      url.includes("youtube.com") ||
      url.includes("youtu.be") ||
      url.includes("facebook.com") ||
      url.includes("fb.watch") ||
      url.includes("threads.net") ||
      url.includes("vimeo.com") ||
      url.includes("reddit.com")
    );
  },
  { message: "Solo enlaces de redes sociales (TikTok, Instagram, YouTube, Facebook, Threads, Vimeo, Reddit)" }
);

type WorkflowState = 
  | "IDLE" 
  | "ANALYZING_LINK" 
  | "SCRIPT_READY" 
  | "VOICE_READY" 
  | "CLIPS_READY"
  | "VARIANTS_READY";

interface ScriptSection {
  type: string;
  text: string;
  adaptedText?: string;
  start_time?: number;
  end_time?: number;
  duration?: number;
}

interface VoiceSettings {
  stability: number;
  similarity: number;
  style: number;
}

export function DashboardStudio() {
  const { user } = useAuth();
  
  // State machine
  const [workflowState, setWorkflowState] = useState<WorkflowState>("IDLE");
  const [activeTab, setActiveTab] = useState("guion");
  
  // Core data
  const [videoUrl, setVideoUrl] = useState("");
  const [analysisId, setAnalysisId] = useState<string | null>(null);
  const [projectId, setProjectId] = useState<string | null>(null);
  const [sections, setSections] = useState<ScriptSection[]>([]);
  
  // Selections
  const [selectedBrandId, setSelectedBrandId] = useState("");
  const [selectedVoiceId, setSelectedVoiceId] = useState("EXAVITQu4vr4xnSDxMaL");
  const [voiceSettings, setVoiceSettings] = useState<VoiceSettings>({
    stability: 0.5,
    similarity: 0.75,
    style: 0
  });
  const [voiceoverUrl, setVoiceoverUrl] = useState<string | null>(null);
  const [clipAssignments, setClipAssignments] = useState<{ [key: string]: string }>({});
  const [hookText, setHookText] = useState("");
  const [subtitleStyle, setSubtitleStyle] = useState("tiktokWhite");
  const [variantCount, setVariantCount] = useState(1);
  const [variantOptions, setVariantOptions] = useState({
    hookVisual: false,
    hookText: false,
    cta: false
  });
  
  // UI state
  const [loading, setLoading] = useState(false);

  // Fetch brands
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

  // Fetch analysis
  const { data: analysis, isLoading: isLoadingAnalysis } = useQuery({
    queryKey: ["video-analysis", analysisId],
    queryFn: async () => {
      if (!analysisId) return null;
      const { data, error } = await supabase
        .from("video_analyses")
        .select("*")
        .eq("id", analysisId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!analysisId,
    refetchInterval: (query) => {
      const data = query.state.data;
      return data?.status === "processing" ? 2000 : false;
    },
  });

  // Initialize sections when analysis completes
  useEffect(() => {
    if (sections.length > 0 && workflowState === "ANALYZING_LINK") {
      setWorkflowState("SCRIPT_READY");
    }
  }, [sections, workflowState]);

  useEffect(() => {
    const structure = analysis?.structure as any;
    if (structure?.sections && sections.length === 0) {
      setSections(structure.sections);
    }
  }, [analysis]);

  const handleAnalyze = async () => {
    const validation = urlSchema.safeParse(videoUrl);
    if (!validation.success) {
      toast.error(validation.error.errors[0].message);
      return;
    }

    setLoading(true);
    setWorkflowState("ANALYZING_LINK");

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error("Debes iniciar sesión");
        return;
      }

      toast.info("Extrayendo audio del video...");
      const { data: extractData, error: extractError } = await supabase.functions.invoke(
        "extract-audio-from-link",
        {
          body: {
            video_url: videoUrl,
            brand_id: null,
          },
        }
      );

      if (extractError) throw extractError;

      toast.info("Analizando estructura narrativa...");
      const { data: analyzeData, error: analyzeError } = await supabase.functions.invoke(
        "analyze-video",
        {
          body: {
            analysis_id: extractData.analysis_id,
            brand_id: null,
          },
        }
      );

      if (analyzeError) throw analyzeError;

      setAnalysisId(extractData.analysis_id);
      toast.success("¡Detectamos la estructura!");
    } catch (error: any) {
      console.error("Error analyzing video:", error);
      toast.error(error.message || "Error al analizar el video");
      setWorkflowState("IDLE");
    } finally {
      setLoading(false);
    }
  };

  const canAccessTab = (tab: string): boolean => {
    switch (tab) {
      case "guion":
        return workflowState !== "IDLE" && workflowState !== "ANALYZING_LINK";
      case "voz":
        return workflowState === "SCRIPT_READY" || workflowState === "VOICE_READY" || 
               workflowState === "CLIPS_READY" || workflowState === "VARIANTS_READY";
      case "brolls":
        return workflowState === "VOICE_READY" || workflowState === "CLIPS_READY" || 
               workflowState === "VARIANTS_READY";
      case "variantes":
        return workflowState === "CLIPS_READY" || workflowState === "VARIANTS_READY";
      default:
        return false;
    }
  };

  const getHeaderText = () => {
    if (!selectedBrandId && brands && brands.length > 0) {
      return "Selecciona una marca para comenzar";
    }
    
    switch (workflowState) {
      case "IDLE":
        return "¿Qué creamos hoy?";
      case "ANALYZING_LINK":
        return "Analizando video...";
      case "SCRIPT_READY":
        return "Estructura detectada";
      case "VOICE_READY":
        return "Selecciona la voz";
      case "CLIPS_READY":
        return "Asigna tus B-rolls";
      case "VARIANTS_READY":
        return "Configura tus variantes";
      default:
        return "¿Qué creamos hoy?";
    }
  };

  // Loading state
  if (loading || (analysisId && isLoadingAnalysis)) {
    return (
      <Card className="p-12">
        <div className="text-center space-y-4">
          <div className="inline-block h-12 w-12 animate-spin rounded-full border-4 border-solid border-primary border-r-transparent" />
          <div className="space-y-2">
            <p className="text-lg font-semibold">
              {loading ? "Aplicando tu esencia..." : "Detectando estructura mágica..."}
            </p>
            <p className="text-sm text-muted-foreground">
              Esto puede tomar unos segundos
            </p>
          </div>
        </div>
      </Card>
    );
  }

  // Initial input state
  if (workflowState === "IDLE") {
    return (
      <Card className="p-8">
        <div className="max-w-2xl mx-auto text-center">
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center mx-auto mb-4">
            <Link2 className="w-8 h-8 text-white" />
          </div>

          <h2 className="text-2xl font-bold mb-2">Pega tu link</h2>
          <p className="text-muted-foreground mb-4">
            Pega el enlace de un video viral de cualquier red social
          </p>

          <div className="bg-gradient-to-br from-primary/10 to-accent/10 border border-primary/20 rounded-lg p-4 mb-6">
            <div className="flex items-start gap-3">
              <div className="text-2xl">✨</div>
              <div className="space-y-2 flex-1 text-left">
                <p className="font-semibold text-foreground">
                  Extracción automática habilitada
                </p>
                <p className="text-sm text-muted-foreground">
                  Soportamos TikTok, Instagram, YouTube, Facebook, Threads, Vimeo, Reddit y más
                </p>
              </div>
            </div>
          </div>

          <div className="flex gap-3 mb-4">
            <Input
              type="url"
              placeholder="https://www.tiktok.com/@... o cualquier red social"
              value={videoUrl}
              onChange={(e) => setVideoUrl(e.target.value)}
              disabled={loading}
              className="flex-1"
              onKeyDown={(e) => e.key === "Enter" && handleAnalyze()}
            />
            <Button onClick={handleAnalyze} disabled={loading || !videoUrl}>
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Analizando...
                </>
              ) : (
                "Analizar"
              )}
            </Button>
          </div>

          <p className="text-xs text-muted-foreground">
            La IA detectará la estructura mágica y creará variantes optimizadas
          </p>
        </div>
      </Card>
    );
  }

  // Main workspace with tabs
  return (
    <div className="space-y-6">
      {/* Dynamic Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-2">{getHeaderText()}</h1>
          {sections.length > 0 && (
            <p className="text-muted-foreground">
              Detectamos {sections.length} secciones • {analysis?.source_url}
            </p>
          )}
        </div>

        {/* Sidebar Menu */}
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="outline" size="icon">
              <Menu className="w-5 h-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-80">
            <div className="space-y-6 mt-6">
              <div>
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <Package className="w-4 h-4" />
                  Mis Marcas
                </h3>
                <div className="space-y-2">
                  {brands?.map((brand) => (
                    <Button
                      key={brand.id}
                      variant={selectedBrandId === brand.id ? "default" : "outline"}
                      className="w-full justify-start"
                      onClick={() => setSelectedBrandId(brand.id)}
                    >
                      {brand.name}
                    </Button>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <FolderOpen className="w-4 h-4" />
                  Accesos rápidos
                </h3>
                <div className="space-y-2">
                  <Button variant="outline" className="w-full justify-start" asChild>
                    <a href="/templates">Plantillas</a>
                  </Button>
                  <Button variant="outline" className="w-full justify-start" asChild>
                    <a href="/broll">B-roll</a>
                  </Button>
                </div>
              </div>
            </div>
          </SheetContent>
        </Sheet>
      </div>

      {/* Main Workspace Card */}
      <Card className="p-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger 
              value="guion" 
              disabled={!canAccessTab("guion")}
              className="gap-2"
            >
              <FileText className="w-4 h-4" />
              Guion
            </TabsTrigger>
            <TabsTrigger 
              value="voz" 
              disabled={!canAccessTab("voz")}
              className="gap-2"
            >
              <Mic className="w-4 h-4" />
              Voz
            </TabsTrigger>
            <TabsTrigger 
              value="brolls" 
              disabled={!canAccessTab("brolls")}
              className="gap-2"
            >
              <Film className="w-4 h-4" />
              B-rolls y subtítulos
            </TabsTrigger>
            <TabsTrigger 
              value="variantes" 
              disabled={!canAccessTab("variantes")}
              className="gap-2"
            >
              <Sparkles className="w-4 h-4" />
              Variantes
            </TabsTrigger>
          </TabsList>

          <TabsContent value="guion" className="mt-6">
            <ScriptTab
              sections={sections}
              onSectionsChange={setSections}
              videoThumbnail={(analysis?.metadata as any)?.thumbnail_url}
              videoDuration={(analysis?.metadata as any)?.duration}
              detectedLanguage="es-MX"
              selectedBrandId={selectedBrandId}
              brands={brands || []}
              onBrandChange={setSelectedBrandId}
              onNext={() => {
                setActiveTab("voz");
                setWorkflowState("SCRIPT_READY");
                toast.success("Guion listo");
              }}
            />
          </TabsContent>

          <TabsContent value="voz" className="mt-6">
            <VoiceTab
              sections={sections}
              selectedVoiceId={selectedVoiceId}
              onVoiceChange={setSelectedVoiceId}
              voiceSettings={voiceSettings}
              onVoiceSettingsChange={setVoiceSettings}
              voiceoverUrl={voiceoverUrl}
              onVoiceoverGenerated={setVoiceoverUrl}
              onNext={() => {
                setActiveTab("brolls");
                setWorkflowState("VOICE_READY");
                toast.success("Voz lista");
              }}
            />
          </TabsContent>

          <TabsContent value="brolls" className="mt-6">
            <ClipsTab
              sections={sections}
              brandId={selectedBrandId}
              assignments={clipAssignments}
              onAssignmentsChange={setClipAssignments}
              hookText={hookText}
              onHookTextChange={setHookText}
              subtitleStyle={subtitleStyle}
              onSubtitleStyleChange={setSubtitleStyle}
              onNext={() => {
                setActiveTab("variantes");
                setWorkflowState("CLIPS_READY");
                toast.success("B-rolls asignados");
              }}
            />
          </TabsContent>

          <TabsContent value="variantes" className="mt-6">
            <VariantsTab
              variantCount={variantCount}
              onVariantCountChange={setVariantCount}
              variantOptions={variantOptions}
              onVariantOptionsChange={setVariantOptions}
              onRender={async () => {
                setWorkflowState("VARIANTS_READY");
                toast.success("Iniciando renderizado...");
                // Render logic will be implemented
              }}
            />
          </TabsContent>
        </Tabs>
      </Card>
    </div>
  );
}
