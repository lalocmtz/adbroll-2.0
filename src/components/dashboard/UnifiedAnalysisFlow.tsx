import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Link2, 
  Loader2, 
  Wand2, 
  Film, 
  Mic, 
  Save,
  CheckCircle2,
  AlertTriangle,
  Play,
  X
} from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { useNavigate } from "react-router-dom";
import { SaveTemplateDialog } from "./SaveTemplateDialog";

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

interface BrollFolder {
  id: string;
  name: string;
  brand_id: string | null;
  filesCount: number;
}

interface BrollFile {
  id: string;
  name: string;
  file_url: string;
  thumbnail_url: string | null;
  duration: number | null;
}

interface SectionAssignment {
  sectionId: string;
  clipId: string | null;
  folderId: string | null;
}

interface ScriptSection {
  type: string;
  text: string;
  start_time?: number;
  end_time?: number;
  duration?: number;
}

export function UnifiedAnalysisFlow() {
  const { user } = useAuth();
  const navigate = useNavigate();
  
  // Step state
  const [videoUrl, setVideoUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [analysisId, setAnalysisId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("script");
  
  // Brand and voice state
  const [selectedBrandId, setSelectedBrandId] = useState("");
  const [selectedVoiceId, setSelectedVoiceId] = useState("EXAVITQu4vr4xnSDxMaL");
  
  // Script editing state
  const [editedSections, setEditedSections] = useState<ScriptSection[]>([]);
  
  // Clip assignment state
  const [folders, setFolders] = useState<BrollFolder[]>([]);
  const [assignments, setAssignments] = useState<SectionAssignment[]>([]);
  const [selectedFolderForSection, setSelectedFolderForSection] = useState<{ [key: string]: string }>({});
  const [folderClips, setFolderClips] = useState<{ [key: string]: BrollFile[] }>({});
  
  // Dialog state
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [hoveredClipId, setHoveredClipId] = useState<string | null>(null);

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
    refetchOnWindowFocus: false,
    refetchInterval: (query) => {
      // Poll every 2s if status is processing
      const data = query.state.data;
      return data?.status === "processing" ? 2000 : false;
    },
  });

  const structure = analysis?.structure as any;
  const sections = structure?.sections || [];

  // Initialize edited sections when analysis is loaded
  useEffect(() => {
    if (sections.length > 0 && editedSections.length === 0) {
      setEditedSections(sections);
      setAssignments(
        sections.map((section: any, index: number) => ({
          sectionId: `section-${index}`,
          clipId: null,
          folderId: null,
        }))
      );
    }
  }, [sections]);

  // Load brand folders when brand is selected
  useEffect(() => {
    if (selectedBrandId) {
      loadBrandFolders();
    }
  }, [selectedBrandId]);

  const loadBrandFolders = async () => {
    try {
      const { data: foldersData, error: foldersError } = await supabase
        .from("broll_folders")
        .select("id, name, brand_id")
        .eq("brand_id", selectedBrandId);

      if (foldersError) throw foldersError;

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

  const loadFolderClips = async (folderId: string) => {
    if (folderClips[folderId]) return; // Already loaded

    try {
      const { data, error } = await supabase
        .from("broll_files")
        .select("id, name, file_url, thumbnail_url, duration")
        .eq("folder_id", folderId);

      if (error) throw error;
      
      setFolderClips((prev) => ({ ...prev, [folderId]: data || [] }));
    } catch (error: any) {
      toast.error("Error al cargar clips: " + error.message);
    }
  };

  const handleAnalyze = async () => {
    const validation = urlSchema.safeParse(videoUrl);
    if (!validation.success) {
      toast.error(validation.error.errors[0].message);
      return;
    }

    setLoading(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error("Debes iniciar sesión");
        return;
      }

      // Create a temporary brand_id for analysis (we'll apply to real brand later)
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
    } finally {
      setLoading(false);
    }
  };

  const handleSectionTextChange = (index: number, newText: string) => {
    setEditedSections((prev) =>
      prev.map((section, i) => (i === index ? { ...section, text: newText } : section))
    );
  };

  const handleFolderSelect = (sectionId: string, folderId: string) => {
    setSelectedFolderForSection((prev) => ({ ...prev, [sectionId]: folderId }));
    loadFolderClips(folderId);
  };

  const handleClipAssign = (sectionId: string, clipId: string, folderId: string) => {
    setAssignments((prev) =>
      prev.map((a) =>
        a.sectionId === sectionId ? { ...a, clipId, folderId } : a
      )
    );
    toast.success("Clip asignado");
  };

  const handleCreateProject = async () => {
    if (!selectedBrandId) {
      toast.error("Selecciona una marca primero");
      setActiveTab("voice");
      return;
    }

    const unassigned = assignments.filter((a) => !a.clipId);
    if (unassigned.length > 0) {
      toast.error(`Faltan asignar clips a ${unassigned.length} sección(es)`);
      setActiveTab("clips");
      return;
    }

    try {
      const slotsData: any = {};
      assignments.forEach((assignment, index) => {
        const section = editedSections[index];
        slotsData[`section-${index}`] = {
          type: section.type,
          clipId: assignment.clipId,
          text: section.text,
        };
      });

      const { data: project, error: projectError } = await supabase
        .from("projects")
        .insert({
          user_id: user?.id,
          name: `Proyecto - ${brands?.find((b) => b.id === selectedBrandId)?.name || "Sin nombre"}`,
          brand_id: selectedBrandId,
          analysis_id: analysisId,
          generated_script: editedSections.map((s) => s.text).join("\n\n"),
          slots_data: slotsData,
          voice_id: selectedVoiceId,
          status: "draft",
        } as any)
        .select()
        .single();

      if (projectError) throw projectError;

      toast.success("¡Listo! Tu marca está en acción.");
      navigate(`/studio/${project.id}`);
    } catch (error: any) {
      console.error("Error creating project:", error);
      toast.error("Error al crear el proyecto: " + error.message);
    }
  };

  const allAssigned = assignments.length > 0 && assignments.every((a) => a.clipId !== null);
  const hasWarnings = selectedBrandId && folders.length === 0;

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

  // Input state - no analysis yet
  if (!analysisId || !analysis || analysis.status !== "completed") {
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

  // Main analysis workflow with tabs
  return (
    <>
      <Card className="p-6">
        <div className="flex items-start justify-between mb-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle2 className="w-5 h-5 text-green-500" />
              <h3 className="text-xl font-bold">¡Video Analizado!</h3>
            </div>
            <p className="text-sm text-muted-foreground">
              Detectamos {editedSections.length} secciones • Hazlo tuyo. Dale voz a tu marca.
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setShowSaveDialog(true)}>
              <Save className="w-4 h-4 mr-2" />
              Guardar plantilla
            </Button>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="script" className="gap-2">
              <Wand2 className="w-4 h-4" />
              Script
            </TabsTrigger>
            <TabsTrigger value="clips" className="gap-2">
              <Film className="w-4 h-4" />
              B-Rolls
            </TabsTrigger>
            <TabsTrigger value="voice" className="gap-2">
              <Mic className="w-4 h-4" />
              Voz & Marca
            </TabsTrigger>
          </TabsList>

          {/* Script Editor Tab */}
          <TabsContent value="script" className="space-y-4 mt-6">
            {structure.hook && (
              <div className="p-4 bg-secondary/50 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Badge>Hook</Badge>
                  <span className="text-xs text-muted-foreground">
                    {structure.hook.type}
                  </span>
                </div>
                <Textarea
                  value={structure.hook.text}
                  className="min-h-[80px] bg-background"
                  readOnly
                />
              </div>
            )}

            {editedSections.map((section, index) => (
              <div key={index} className="p-4 bg-secondary/30 rounded-lg">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{section.type}</Badge>
                    <span className="text-xs text-muted-foreground">
                      {section.duration || (section.end_time && section.start_time ? section.end_time - section.start_time : 0)}s
                    </span>
                  </div>
                  {assignments[index]?.clipId && (
                    <CheckCircle2 className="w-4 h-4 text-green-500" />
                  )}
                </div>
                <Textarea
                  value={section.text}
                  onChange={(e) => handleSectionTextChange(index, e.target.value)}
                  className="min-h-[100px] bg-background"
                  placeholder="Edita el texto de esta sección..."
                />
              </div>
            ))}

            <div className="flex justify-end">
              <Button onClick={() => setActiveTab("clips")}>
                Siguiente: Asignar B-Rolls
              </Button>
            </div>
          </TabsContent>

          {/* B-Rolls Assignment Tab */}
          <TabsContent value="clips" className="space-y-4 mt-6">
            {!selectedBrandId ? (
              <Alert>
                <AlertTriangle className="w-4 h-4" />
                <AlertDescription>
                  Selecciona una marca en la pestaña "Voz & Marca" para asignar clips
                </AlertDescription>
              </Alert>
            ) : hasWarnings ? (
              <Alert variant="destructive">
                <AlertTriangle className="w-4 h-4" />
                <AlertDescription>
                  <p className="font-semibold mb-2">No tienes carpetas de B-Roll</p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigate("/broll")}
                  >
                    Ir a B-Roll Library
                  </Button>
                </AlertDescription>
              </Alert>
            ) : (
              <>
                {editedSections.map((section, index) => {
                  const sectionId = `section-${index}`;
                  const assignment = assignments.find((a) => a.sectionId === sectionId);
                  const selectedFolder = selectedFolderForSection[sectionId];
                  const clips = selectedFolder ? folderClips[selectedFolder] || [] : [];
                  const assignedClip = clips.find((c) => c.id === assignment?.clipId);

                  return (
                    <div key={sectionId} className="p-4 bg-secondary/30 rounded-lg space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">{section.type}</Badge>
                          {assignment?.clipId && (
                            <Badge className="bg-green-500">
                              <CheckCircle2 className="w-3 h-3 mr-1" />
                              Asignado
                            </Badge>
                          )}
                        </div>
                      </div>

                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {section.text}
                      </p>

                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-2">
                          <Label>Carpeta</Label>
                          <Select
                            value={selectedFolder || ""}
                            onValueChange={(value) => handleFolderSelect(sectionId, value)}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Selecciona carpeta..." />
                            </SelectTrigger>
                            <SelectContent>
                              {folders.map((folder) => (
                                <SelectItem key={folder.id} value={folder.id}>
                                  {folder.name} ({folder.filesCount})
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-2">
                          <Label>Clip</Label>
                          <Select
                            value={assignment?.clipId || ""}
                            onValueChange={(value) =>
                              handleClipAssign(sectionId, value, selectedFolder!)
                            }
                            disabled={!selectedFolder}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Selecciona clip..." />
                            </SelectTrigger>
                            <SelectContent>
                              {clips.map((clip) => (
                                <SelectItem
                                  key={clip.id}
                                  value={clip.id}
                                  onMouseEnter={() => setHoveredClipId(clip.id)}
                                  onMouseLeave={() => setHoveredClipId(null)}
                                >
                                  <div className="flex items-center gap-2">
                                    {clip.thumbnail_url && (
                                      <img
                                        src={clip.thumbnail_url}
                                        alt={clip.name}
                                        className="w-8 h-8 object-cover rounded"
                                      />
                                    )}
                                    <span className="truncate">{clip.name}</span>
                                    {clip.duration && (
                                      <span className="text-xs text-muted-foreground">
                                        {clip.duration}s
                                      </span>
                                    )}
                                  </div>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      {assignedClip && (
                        <div className="flex items-center gap-2 p-2 bg-background rounded border">
                          {assignedClip.thumbnail_url && (
                            <img
                              src={assignedClip.thumbnail_url}
                              alt={assignedClip.name}
                              className="w-16 h-16 object-cover rounded"
                            />
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">
                              {assignedClip.name}
                            </p>
                            {assignedClip.duration && (
                              <p className="text-xs text-muted-foreground">
                                Duración: {assignedClip.duration}s
                              </p>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}

                <div className="flex justify-between">
                  <Button variant="outline" onClick={() => setActiveTab("script")}>
                    Anterior
                  </Button>
                  <Button
                    onClick={() => setActiveTab("voice")}
                    disabled={!allAssigned}
                  >
                    Siguiente: Voz & Marca
                  </Button>
                </div>
              </>
            )}
          </TabsContent>

          {/* Voice & Brand Tab */}
          <TabsContent value="voice" className="space-y-4 mt-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Marca</Label>
                <Select value={selectedBrandId} onValueChange={setSelectedBrandId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona tu marca..." />
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

              <div className="space-y-2">
                <Label>Voz</Label>
                <Select value={selectedVoiceId} onValueChange={setSelectedVoiceId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona una voz..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="EXAVITQu4vr4xnSDxMaL">Sarah (Suave)</SelectItem>
                    <SelectItem value="pNInz6obpgDQGcFmaJgB">Adam (Profunda)</SelectItem>
                    <SelectItem value="21m00Tcm4TlvDq8ikWAM">Rachel (Cálida)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {selectedBrandId && (
                <Alert>
                  <CheckCircle2 className="w-4 h-4" />
                  <AlertDescription>
                    <p className="font-semibold">Todo listo para crear tus variantes</p>
                    <p className="text-sm mt-1">
                      Se aplicará el tono y estilo de{" "}
                      <strong>{brands?.find((b) => b.id === selectedBrandId)?.name}</strong>
                    </p>
                  </AlertDescription>
                </Alert>
              )}
            </div>

            <div className="flex justify-between pt-4 border-t">
              <Button variant="outline" onClick={() => setActiveTab("clips")}>
                Anterior
              </Button>
              <Button
                onClick={handleCreateProject}
                disabled={!selectedBrandId || !allAssigned}
                className="bg-gradient-to-r from-primary to-accent hover:opacity-90"
              >
                <Wand2 className="w-4 h-4 mr-2" />
                🎬 Crear mis variantes
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </Card>

      <SaveTemplateDialog
        open={showSaveDialog}
        onOpenChange={setShowSaveDialog}
        analysis={analysis}
      />
    </>
  );
}
