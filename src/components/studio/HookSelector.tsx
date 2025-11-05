import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

interface HookConfig {
  variantIndex: number;
  clipId: string;
  headlineStyle: "text-over-black" | "text-over-video" | "none";
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

  useEffect(() => {
    loadHookClips();
  }, [brandId]);

  useEffect(() => {
    // Initialize hooks if empty
    if (hooks.length === 0 && numVariants > 0) {
      const initialHooks = Array.from({ length: numVariants }, (_, i) => ({
        variantIndex: i,
        clipId: hookClips[0]?.id || "",
        headlineStyle: "text-over-black" as const,
      }));
      onChange(initialHooks);
    }
  }, [numVariants, hookClips]);

  const loadHookClips = async () => {
    try {
      const { data: folders } = await supabase
        .from("broll_folders")
        .select("id")
        .eq("brand_id", brandId)
        .eq("name", "Hook")
        .single();

      if (!folders) return;

      const { data: clips } = await supabase
        .from("broll_files")
        .select("*")
        .eq("folder_id", folders.id);

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
      console.error("Error loading hook clips:", error);
    }
  };

  const updateHook = (variantIndex: number, field: keyof HookConfig, value: any) => {
    const updated = hooks.map((h) =>
      h.variantIndex === variantIndex ? { ...h, [field]: value } : h
    );
    onChange(updated);
  };

  if (numVariants === 0 || hookClips.length === 0) {
    return null;
  }

  return (
    <div className="space-y-4">
      <div>
        <Label className="text-base font-semibold">Ganchos visuales y titulares</Label>
        <p className="text-sm text-muted-foreground mt-1">
          Selecciona el clip y estilo de headline para cada variante
        </p>
      </div>

      <div className="grid gap-4">
        {Array.from({ length: numVariants }, (_, i) => i).map((variantIndex) => {
          const hook = hooks.find((h) => h.variantIndex === variantIndex);
          const selectedClip = hookClips.find((c) => c.id === hook?.clipId);

          return (
            <Card key={variantIndex} className="p-4">
              <div className="flex items-start gap-4">
                {/* Variant Badge */}
                <Badge className="shrink-0 mt-1">V{variantIndex + 1}</Badge>

                {/* Thumbnail Preview */}
                <div className="w-24 h-24 bg-muted rounded-lg overflow-hidden shrink-0">
                  {selectedClip && signedUrls.get(selectedClip.id) ? (
                    <video
                      src={signedUrls.get(selectedClip.id)}
                      className="w-full h-full object-cover"
                      muted
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-xs text-muted-foreground">
                      Sin clip
                    </div>
                  )}
                </div>

                {/* Selectors */}
                <div className="flex-1 space-y-3">
                  <div>
                    <Label className="text-xs text-muted-foreground mb-1.5 block">
                      Clip de hook
                    </Label>
                    <Select
                      value={hook?.clipId || ""}
                      onValueChange={(value) => updateHook(variantIndex, "clipId", value)}
                    >
                      <SelectTrigger className="h-9">
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
                  </div>

                  <div>
                    <Label className="text-xs text-muted-foreground mb-1.5 block">
                      Estilo de headline
                    </Label>
                    <Select
                      value={hook?.headlineStyle || "text-over-black"}
                      onValueChange={(value) => updateHook(variantIndex, "headlineStyle", value)}
                    >
                      <SelectTrigger className="h-9">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="text-over-black">
                          Texto orgánico en fondo negro
                        </SelectItem>
                        <SelectItem value="text-over-video">
                          Texto blanco sobre video
                        </SelectItem>
                        <SelectItem value="none">Sin texto</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
