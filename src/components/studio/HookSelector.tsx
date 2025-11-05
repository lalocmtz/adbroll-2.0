import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Plus } from "lucide-react";

interface HookConfig {
  variantIndex: number;
  clipId: string;
  folderId?: string;
  skipVariant?: boolean;
}

interface HookSelectorProps {
  brandId: string;
  numVariants: number;
  hooks: HookConfig[];
  onChange: (hooks: HookConfig[]) => void;
}

export function HookSelector({ brandId, numVariants, hooks, onChange }: HookSelectorProps) {
  const [hookClips, setHookClips] = useState<any[]>([]);
  const [signedUrls, setSignedUrls] = useState<Map<string, string>>(new Map());
  const [folders, setFolders] = useState<any[]>([]);
  const [defaultHookFolderId, setDefaultHookFolderId] = useState<string>("");

  useEffect(() => {
    loadFoldersAndClips();
  }, [brandId]);

  useEffect(() => {
    // Initialize hooks if empty
    if (hooks.length === 0 && numVariants > 0 && hookClips.length > 0) {
      const initialHooks = Array.from({ length: numVariants }, (_, i) => ({
        variantIndex: i,
        clipId: i === 0 ? hookClips[0]?.id || "" : "",
        folderId: defaultHookFolderId,
        skipVariant: i !== 0,
      }));
      onChange(initialHooks);
    }
  }, [numVariants, hookClips, defaultHookFolderId]);

  const loadFoldersAndClips = async () => {
    try {
      // Load all folders
      const { data: allFolders } = await supabase
        .from("broll_folders")
        .select("*")
        .eq("brand_id", brandId)
        .order("name");

      if (allFolders) {
        setFolders(allFolders);
        
        // Find Hook folder
        const hookFolder = allFolders.find(f => f.name === "Hook");
        if (hookFolder) {
          setDefaultHookFolderId(hookFolder.id);
          await loadClipsFromFolder(hookFolder.id);
        }
      }
    } catch (error) {
      console.error("Error loading folders:", error);
    }
  };

  const loadClipsFromFolder = async (folderId: string) => {
    try {
      const { data: clips } = await supabase
        .from("broll_files")
        .select("*")
        .eq("folder_id", folderId);

      if (clips && clips.length > 0) {
        setHookClips(clips);

        // Load signed URLs for thumbnails
        const urls = new Map();
        for (const clip of clips) {
          if (clip.storage_path) {
            const { data } = await supabase.storage
              .from("broll")
              .createSignedUrl(clip.storage_path, 3600);
            if (data?.signedUrl) {
              urls.set(clip.id, data.signedUrl);
            }
          }
        }
        setSignedUrls(urls);
      }
    } catch (error) {
      console.error("Error loading clips:", error);
    }
  };

  const updateHook = (variantIndex: number, field: keyof HookConfig, value: any) => {
    const updated = hooks.map((h) =>
      h.variantIndex === variantIndex ? { ...h, [field]: value } : h
    );
    onChange(updated);

    // If folder changed, reload clips
    if (field === "folderId") {
      loadClipsFromFolder(value);
    }
  };

  if (numVariants === 0) {
    return null;
  }

  return (
    <div className="space-y-4">
      <Label className="text-base font-semibold">Tus hooks para esta campaña 🎯</Label>
      
      <div className="grid grid-cols-3 gap-4">
        {Array.from({ length: numVariants }, (_, i) => i).map((variantIndex) => {
          const hook = hooks.find((h) => h.variantIndex === variantIndex);
          const selectedClip = hookClips.find((c) => c.id === hook?.clipId);
          const isSkipped = hook?.skipVariant;

          if (variantIndex === 0) {
            // First hook - already selected
            return (
              <Card key={variantIndex} className="p-0 overflow-hidden border-primary/40 bg-primary/5">
                <div className="relative aspect-[9/16] bg-muted">
                  {selectedClip && signedUrls.get(selectedClip.id) ? (
                    <video
                      src={signedUrls.get(selectedClip.id)}
                      className="w-full h-full object-cover"
                      muted
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Plus className="w-8 h-8 text-muted-foreground" />
                    </div>
                  )}
                  <div className="absolute bottom-2 left-2 bg-black/60 text-white text-xs px-2 py-1 rounded">
                    Hook
                  </div>
                </div>
                <div className="p-3 space-y-2">
                  <p className="text-sm font-medium">{selectedClip?.name || "Hook"}</p>
                  <p className="text-xs text-muted-foreground">
                    {selectedClip?.duration ? `${selectedClip.duration}s` : "-"}
                  </p>
                </div>
              </Card>
            );
          }

          // Additional hook slots
          return (
            <Card key={variantIndex} className="p-0 overflow-hidden">
              {isSkipped ? (
                // Empty state - click to add
                <button
                  className="w-full h-full p-6 flex flex-col items-center justify-center gap-3 hover:bg-muted/50 transition-colors"
                  onClick={() => updateHook(variantIndex, "skipVariant", false)}
                >
                  <div className="w-full aspect-[9/16] border-2 border-dashed border-muted-foreground/30 rounded-lg flex items-center justify-center">
                    <Plus className="w-12 h-12 text-muted-foreground/50" />
                  </div>
                  <p className="text-sm text-center text-muted-foreground">
                    Haz click para elegir la variante {variantIndex + 1} de hook visual
                  </p>
                </button>
              ) : (
                // Selection state
                <div>
                  <div className="relative aspect-[9/16] bg-muted">
                    {selectedClip && signedUrls.get(selectedClip.id) ? (
                      <video
                        src={signedUrls.get(selectedClip.id)}
                        className="w-full h-full object-cover"
                        muted
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Plus className="w-8 h-8 text-muted-foreground" />
                      </div>
                    )}
                  </div>
                  <div className="p-3 space-y-2">
                    <Select
                      value={hook?.folderId || defaultHookFolderId}
                      onValueChange={(value) => updateHook(variantIndex, "folderId", value)}
                    >
                      <SelectTrigger className="h-9 text-sm">
                        <SelectValue placeholder="Elegir carpeta" />
                      </SelectTrigger>
                      <SelectContent>
                        {folders.map((folder) => (
                          <SelectItem key={folder.id} value={folder.id}>
                            {folder.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    <Select
                      value={hook?.clipId || ""}
                      onValueChange={(value) => updateHook(variantIndex, "clipId", value)}
                    >
                      <SelectTrigger className="h-9 text-sm">
                        <SelectValue placeholder="Seleccionar clip" />
                      </SelectTrigger>
                      <SelectContent>
                        {hookClips.map((clip) => (
                          <SelectItem key={clip.id} value={clip.id}>
                            {clip.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    <div className="flex gap-2 pt-1">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1 h-8 text-xs"
                        onClick={() => updateHook(variantIndex, "skipVariant", true)}
                      >
                        No quiero variante visual
                      </Button>
                      <Button
                        size="sm"
                        className="h-8 text-xs px-4"
                        disabled={!hook?.clipId}
                      >
                        Listo
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}
