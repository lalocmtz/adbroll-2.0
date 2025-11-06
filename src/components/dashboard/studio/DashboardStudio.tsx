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
  Wand2, 
  Film, 
  Mic, 
  Play,
  Package,
  FolderOpen,
  CheckCircle,
  Menu
} from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { ScriptTab } from "./ScriptTab";
import { ClipsTab } from "./ClipsTab";
import { VoiceTab } from "./VoiceTab";
import { VariantsTab } from "./VariantsTab";
import { ResultsTab } from "./ResultsTab";

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
  | "CLIPS_ASSIGNED" 
  | "VOICE_READY" 
  | "VARIANTS_CONFIGURED" 
  | "RENDERING" 
  | "DONE";

interface ScriptSection {
  type: string;
  text: string;
  start_time?: number;
  end_time?: number;
  duration?: number;
}

export function DashboardStudio() {
  const { user } = useAuth();
  
  // State machine
  const [workflowState, setWorkflowState] = useState<WorkflowState>("IDLE");
  const [activeTab, setActiveTab] = useState("script");
  
  // Core data
  const [videoUrl, setVideoUrl] = useState("");
  const [analysisId, setAnalysisId] = useState<string | null>(null);
  const [projectId, setProjectId] = useState<string | null>(null);
  const [editedSections, setEditedSections] = useState<ScriptSection[]>([]);
  
  // Selections
  const [selectedBrandId, setSelectedBrandId] = useState("");
  const [selectedVoiceId, setSelectedVoiceId] = useState("EXAVITQu4vr4xnSDxMaL");
  const [clipAssignments, setClipAssignments] = useState<{ [key: string]: string }>({});
  const [variantCount, setVariantCount] = useState(3);
  
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

  const structure = analysis?.structure as any;
  const sections = structure?.sections || [];

  // Initialize sections when analysis completes
  useEffect(() => {
    if (sections.length > 0 && editedSections.length === 0) {
      setEditedSections(sections);
      setWorkflowState("SCRIPT_READY");
    }
  }, [sections]);

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

      const tempBrandId = brands?.[0]?.id || null;

      toast.info("Extrayendo audio del video...");
      const { data: extractData, error: extractError } = await supabase.functions.invoke(
        "extract-audio-from-link",
        {
          body: {
            video_url: videoUrl,
            brand_id: tempBrandId,
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
            brand_id: tempBrandId,
          },
        }
      );

      if (analyzeError) throw analyzeError;

      setAnalysisId(extractData.analysis_id);
      toast.success("¡Detectamos magia en ese link!");
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
      case "script":
        return workflowState !== "IDLE" && workflowState !== "ANALYZING_LINK";
      case "clips":
        return workflowState === "SCRIPT_READY" || workflowState === "CLIPS_ASSIGNED" || 
               workflowState === "VOICE_READY" || workflowState === "VARIANTS_CONFIGURED" ||
               workflowState === "RENDERING" || workflowState === "DONE";
      case "voice":
        return workflowState === "CLIPS_ASSIGNED" || workflowState === "VOICE_READY" ||
               workflowState === "VARIANTS_CONFIGURED" || workflowState === "RENDERING" ||
               workflowState === "DONE";
      case "variants":
        return workflowState === "VOICE_READY" || workflowState === "VARIANTS_CONFIGURED" ||
               workflowState === "RENDERING" || workflowState === "DONE";
      case "results":
        return workflowState === "DONE";
      default:
        return false;
    }
  };

  const getHeaderText = () => {
    switch (workflowState) {
      case "IDLE":
        return "¿Qué creamos hoy?";
      case "ANALYZING_LINK":
        return "Analizando video...";
      case "SCRIPT_READY":
        return "Listo para adaptar. ¿Tu marca está lista para escalar?";
      case "CLIPS_ASSIGNED":
        return "Elige tu gancho perfecto. Sugerencias listas.";
      case "VOICE_READY":
        return "Haz que tu marca hable. Elige una voz.";
      case "VARIANTS_CONFIGURED":
        return "¿1 o 3? Vamos a vender sin grabar más.";
      case "RENDERING":
        return "Creando magia...";
      case "DONE":
        return "¡Listo para brillar! Aquí tienes tus variantes.";
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
          {editedSections.length > 0 && (
            <p className="text-muted-foreground">
              Detectamos {editedSections.length} secciones • {analysis?.source_url}
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
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger 
              value="script" 
              disabled={!canAccessTab("script")}
              className="gap-2"
            >
              <Wand2 className="w-4 h-4" />
              Guion
            </TabsTrigger>
            <TabsTrigger 
              value="clips" 
              disabled={!canAccessTab("clips")}
              className="gap-2"
            >
              <Film className="w-4 h-4" />
              Clips
            </TabsTrigger>
            <TabsTrigger 
              value="voice" 
              disabled={!canAccessTab("voice")}
              className="gap-2"
            >
              <Mic className="w-4 h-4" />
              Voz & Subtítulos
            </TabsTrigger>
            <TabsTrigger 
              value="variants" 
              disabled={!canAccessTab("variants")}
              className="gap-2"
            >
              <Play className="w-4 h-4" />
              Variantes
            </TabsTrigger>
            <TabsTrigger 
              value="results" 
              disabled={!canAccessTab("results")}
              className="gap-2"
            >
              <CheckCircle className="w-4 h-4" />
              Resultados
            </TabsTrigger>
          </TabsList>

          <TabsContent value="script" className="mt-6">
            <ScriptTab
              sections={editedSections}
              onSectionsChange={setEditedSections}
              onNext={() => {
                setActiveTab("clips");
                setWorkflowState("SCRIPT_READY");
              }}
            />
          </TabsContent>

          <TabsContent value="clips" className="mt-6">
            <ClipsTab
              sections={editedSections}
              brandId={selectedBrandId}
              assignments={clipAssignments}
              onAssignmentsChange={setClipAssignments}
              onNext={() => {
                setActiveTab("voice");
                setWorkflowState("CLIPS_ASSIGNED");
              }}
            />
          </TabsContent>

          <TabsContent value="voice" className="mt-6">
            <VoiceTab
              selectedVoiceId={selectedVoiceId}
              onVoiceChange={setSelectedVoiceId}
              selectedBrandId={selectedBrandId}
              brands={brands || []}
              onBrandChange={setSelectedBrandId}
              onNext={() => {
                setActiveTab("variants");
                setWorkflowState("VOICE_READY");
              }}
            />
          </TabsContent>

          <TabsContent value="variants" className="mt-6">
            <VariantsTab
              variantCount={variantCount}
              onVariantCountChange={setVariantCount}
              onRender={async () => {
                setWorkflowState("RENDERING");
                // Render logic here
                toast.success("Render iniciado");
                setTimeout(() => {
                  setWorkflowState("DONE");
                  setActiveTab("results");
                }, 3000);
              }}
            />
          </TabsContent>

          <TabsContent value="results" className="mt-6">
            <ResultsTab projectId={projectId} />
          </TabsContent>
        </Tabs>
      </Card>
    </div>
  );
}
