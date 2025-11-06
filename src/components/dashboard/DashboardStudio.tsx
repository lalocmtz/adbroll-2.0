import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Link2, Loader2, Package, Film, FolderOpen, History } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { ScriptTab } from "./tabs/ScriptTab";
import { ClipsTab } from "./tabs/ClipsTab";
import { VoiceTab } from "./tabs/VoiceTab";
import { VariantsTab } from "./tabs/VariantsTab";
import { ResultsTab } from "./tabs/ResultsTab";

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
  { message: "Solo enlaces de redes sociales soportadas" }
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
  duration?: number;
}

interface ClipAssignment {
  sectionId: string;
  clipId: string | null;
  folderId: string | null;
}

export function DashboardStudio() {
  const { user } = useAuth();
  const [state, setState] = useState<WorkflowState>("IDLE");
  const [videoUrl, setVideoUrl] = useState("");
  const [activeTab, setActiveTab] = useState("guion");
  const [analysisId, setAnalysisId] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<any>(null);
  const [sections, setSections] = useState<ScriptSection[]>([]);
  const [assignments, setAssignments] = useState<ClipAssignment[]>([]);
  const [selectedBrandId, setSelectedBrandId] = useState<string>("");
  const [selectedVoiceId, setSelectedVoiceId] = useState("EXAVITQu4vr4xnSDxMaL");
  const [variantCount, setVariantCount] = useState(1);
  const [projectId, setProjectId] = useState<string | null>(null);

  // Poll analysis status
  useEffect(() => {
    if (!analysisId || state !== "ANALYZING_LINK") return;
    
    const interval = setInterval(async () => {
      const { data, error } = await supabase
        .from("video_analyses")
        .select("*")
        .eq("id", analysisId)
        .single();
      
      if (error) {
        console.error("Error polling analysis:", error);
        return;
      }
      
      if (data.status === "completed") {
        setAnalysis(data);
        const structure = data.structure as any;
        const allSections = structure?.sections || [];
        setSections(allSections);
        setAssignments(
          allSections.map((_: any, i: number) => ({
            sectionId: `section-${i}`,
            clipId: null,
            folderId: null,
          }))
        );
        setState("SCRIPT_READY");
        toast.success(`¡Detectamos ${allSections.length} bloques! Hazlo tuyo.`);
      }
    }, 2000);
    
    return () => clearInterval(interval);
  }, [analysisId, state]);

  const handleAnalyze = async () => {
    const validation = urlSchema.safeParse(videoUrl);
    if (!validation.success) {
      toast.error(validation.error.errors[0].message);
      return;
    }

    setState("ANALYZING_LINK");

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error("Debes iniciar sesión");
        setState("IDLE");
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

      setAnalysisId(extractData.analysis_id);

      toast.info("Aplicando tu esencia...");
      await supabase.functions.invoke("analyze-video", {
        body: {
          analysis_id: extractData.analysis_id,
          brand_id: null,
        },
      });

    } catch (error: any) {
      console.error("Error analyzing video:", error);
      toast.error(error.message || "Error al analizar el video");
      setState("IDLE");
    }
  };

  const getHeaderText = () => {
    switch (state) {
      case "IDLE":
      case "ANALYZING_LINK":
        return "¿Qué creamos hoy?";
      case "SCRIPT_READY":
        return "Listo para adaptar. ¿Tu marca está lista para escalar?";
      case "CLIPS_ASSIGNED":
        return "Elige tu gancho perfecto. Sugerencias listas.";
      case "VOICE_READY":
        return "Haz que tu marca hable. Elige una voz.";
      case "VARIANTS_CONFIGURED":
        return "¿1 o 3? Vamos a vender sin grabar más.";
      case "DONE":
        return "¡Listo para brillar! Aquí tienes tus variantes.";
      default:
        return "¿Qué creamos hoy?";
    }
  };

  const showTemplates = state === "IDLE";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-2">{getHeaderText()}</h1>
          <p className="text-muted-foreground">
            {state === "IDLE" 
              ? "Convierte videos virales en variantes optimizadas para tu marca"
              : `${sections.length} secciones detectadas`}
          </p>
        </div>

        {/* Sidebar Triggers */}
        <div className="flex gap-2">
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline" size="sm">
                <Package className="w-4 h-4 mr-2" />
                Mis Marcas
              </Button>
            </SheetTrigger>
            <SheetContent>
              <SheetHeader>
                <SheetTitle>Mis Marcas</SheetTitle>
              </SheetHeader>
              <div className="mt-4">
                <p className="text-sm text-muted-foreground">Gestiona tus marcas aquí</p>
              </div>
            </SheetContent>
          </Sheet>

          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline" size="sm">
                <FolderOpen className="w-4 h-4 mr-2" />
                B-roll
              </Button>
            </SheetTrigger>
            <SheetContent>
              <SheetHeader>
                <SheetTitle>Biblioteca B-roll</SheetTitle>
              </SheetHeader>
              <div className="mt-4">
                <p className="text-sm text-muted-foreground">Tus clips organizados</p>
              </div>
            </SheetContent>
          </Sheet>

          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline" size="sm">
                <History className="w-4 h-4 mr-2" />
                Resultados
              </Button>
            </SheetTrigger>
            <SheetContent>
              <SheetHeader>
                <SheetTitle>Historial de Renders</SheetTitle>
              </SheetHeader>
              <div className="mt-4">
                <p className="text-sm text-muted-foreground">Tus variantes anteriores</p>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>

      {/* Main Content */}
      {state === "IDLE" && (
        <Card className="p-8">
          <div className="max-w-2xl mx-auto text-center space-y-6">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center mx-auto">
              <Link2 className="w-8 h-8 text-white" />
            </div>

            <div>
              <h2 className="text-2xl font-bold mb-2">Pega tu link</h2>
              <p className="text-muted-foreground">
                Pega el enlace de un video viral de cualquier red social
              </p>
            </div>

            <div className="bg-gradient-to-br from-primary/10 to-accent/10 border border-primary/20 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <div className="text-2xl">✨</div>
                <div className="space-y-2 flex-1 text-left">
                  <p className="font-semibold text-foreground">
                    Extracción automática habilitada
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Soportamos TikTok, Instagram, YouTube, Facebook, Threads, Vimeo, Reddit
                  </p>
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <Input
                type="url"
                placeholder="https://www.tiktok.com/@... o cualquier red social"
                value={videoUrl}
                onChange={(e) => setVideoUrl(e.target.value)}
                className="flex-1"
                onKeyDown={(e) => e.key === "Enter" && handleAnalyze()}
              />
              <Button onClick={handleAnalyze} disabled={!videoUrl} className="px-8">
                Analizar
              </Button>
            </div>

            <p className="text-xs text-muted-foreground">
              La IA detectará la estructura mágica y creará variantes optimizadas
            </p>
          </div>
        </Card>
      )}

      {state === "ANALYZING_LINK" && (
        <Card className="p-12">
          <div className="text-center space-y-4">
            <div className="inline-block h-12 w-12 animate-spin rounded-full border-4 border-solid border-primary border-r-transparent" />
            <div className="space-y-2">
              <p className="text-lg font-semibold">Aplicando tu esencia...</p>
              <p className="text-sm text-muted-foreground">
                Detectando estructura mágica
              </p>
            </div>
          </div>
        </Card>
      )}

      {(state === "SCRIPT_READY" || 
        state === "CLIPS_ASSIGNED" || 
        state === "VOICE_READY" || 
        state === "VARIANTS_CONFIGURED" ||
        state === "RENDERING" ||
        state === "DONE") && (
        <Card className="p-6">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-5 mb-6">
              <TabsTrigger value="guion">
                Guion
              </TabsTrigger>
              <TabsTrigger value="clips">
                Clips
              </TabsTrigger>
              <TabsTrigger value="voz">
                Voz & Subtítulos
              </TabsTrigger>
              <TabsTrigger value="variantes">
                Variantes & Render
              </TabsTrigger>
              <TabsTrigger value="resultados">
                Resultados
              </TabsTrigger>
            </TabsList>

            <TabsContent value="guion">
              <ScriptTab 
                sections={sections}
                analysis={analysis}
                onSectionsUpdate={setSections}
                onNext={() => {
                  setActiveTab("clips");
                }}
              />
            </TabsContent>

            <TabsContent value="clips">
              <ClipsTab
                sections={sections}
                assignments={assignments}
                selectedBrandId={selectedBrandId}
                onAssignmentsUpdate={setAssignments}
                onBrandSelect={setSelectedBrandId}
                onNext={() => {
                  setState("CLIPS_ASSIGNED");
                  setActiveTab("voz");
                  toast.success("Clips asignados");
                }}
              />
            </TabsContent>

            <TabsContent value="voz">
              <VoiceTab
                selectedBrandId={selectedBrandId}
                selectedVoiceId={selectedVoiceId}
                onBrandSelect={setSelectedBrandId}
                onVoiceSelect={setSelectedVoiceId}
                onNext={() => {
                  setState("VOICE_READY");
                  setActiveTab("variantes");
                  toast.success("Voiceover listo");
                }}
              />
            </TabsContent>

            <TabsContent value="variantes">
              <VariantsTab
                variantCount={variantCount}
                sections={sections}
                assignments={assignments}
                selectedBrandId={selectedBrandId}
                selectedVoiceId={selectedVoiceId}
                analysisId={analysisId}
                onVariantCountChange={setVariantCount}
                onRenderStart={(projectId) => {
                  setProjectId(projectId);
                  setState("RENDERING");
                  setActiveTab("resultados");
                }}
              />
            </TabsContent>

            <TabsContent value="resultados">
              <ResultsTab 
                projectId={projectId}
                onComplete={() => setState("DONE")}
              />
            </TabsContent>
          </Tabs>
        </Card>
      )}

      {/* Templates - only show when IDLE */}
      {showTemplates && (
        <div>
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold">Plantillas</h2>
              <p className="text-muted-foreground mt-1">
                Inspírate con nuestras plantillas ganadoras
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { name: "Unboxing", subtitle: "Plantilla clásica" },
              { name: "Problema + solución", subtitle: "Alto engagement" },
              { name: "Lista de beneficios", subtitle: "Conversión alta" },
              { name: "Urgencia", subtitle: "FOMO garantizado" },
            ].map((template, index) => (
              <Card
                key={index}
                className="group p-6 hover-lift cursor-pointer bg-secondary/30 border-border"
              >
                <div className="aspect-[3/4] bg-secondary/50 rounded-lg flex items-center justify-center mb-4">
                  <Film className="w-12 h-12 text-muted-foreground/30" />
                </div>
                <h3 className="text-sm font-semibold mb-1">{template.name}</h3>
                <p className="text-xs text-muted-foreground">{template.subtitle}</p>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
