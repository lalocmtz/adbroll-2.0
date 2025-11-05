import { Card } from "@/components/ui/card";
import { Film, Play } from "lucide-react";
import { useSignedUrl } from "@/hooks/useSignedUrl";

interface VideoPreviewProps {
  sections: any[];
  assignments: any[];
  clips: Map<string, any>;
  voiceoverUrl: string | null;
}

export function VideoPreview({
  sections,
  assignments,
  clips,
  voiceoverUrl,
}: VideoPreviewProps) {
  return (
    <Card className="p-6">
      <div className="flex items-center gap-2 mb-4">
        <Film className="w-5 h-5 text-primary" />
        <h2 className="text-lg font-semibold">Preview del video</h2>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
        {sections.map((section, idx) => {
          const assignment = assignments.find(
            (a: any) => a.sectionId === section.id
          );
          const clip = assignment ? clips.get(assignment.clipId) : null;

          return (
            <PreviewFrame
              key={section.id}
              section={section}
              clip={clip}
              index={idx}
            />
          );
        })}
      </div>

      {voiceoverUrl && (
        <div className="mt-4 pt-4 border-t">
          <div className="flex items-center gap-3">
            <Play className="w-5 h-5 text-primary" />
            <div className="flex-1">
              <p className="text-sm font-medium mb-2">
                Narración de voz generada
              </p>
              <audio src={voiceoverUrl} controls className="w-full" />
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}

function PreviewFrame({
  section,
  clip,
  index,
}: {
  section: any;
  clip: any;
  index: number;
}) {
  const { signedUrl } = useSignedUrl(clip?.storage_path || null);

  return (
    <div className="space-y-2">
      <div className="aspect-[9/16] bg-secondary/30 rounded-lg overflow-hidden relative group">
        {clip?.thumbnail_url ? (
          <img
            src={clip.thumbnail_url}
            alt={section.title}
            className="w-full h-full object-cover"
          />
        ) : signedUrl ? (
          <video
            src={signedUrl}
            className="w-full h-full object-cover"
            muted
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Film className="w-8 h-8 text-muted-foreground/30" />
          </div>
        )}
        
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
        
        <div className="absolute bottom-2 left-2 right-2">
          <div className="bg-black/80 text-white text-xs px-2 py-1 rounded font-mono">
            {section.type.toUpperCase()}
          </div>
        </div>
      </div>
      
      <div className="space-y-1">
        <p className="text-xs font-medium truncate">{section.title}</p>
        <p className="text-xs text-muted-foreground">
          {section.expected_duration}s
        </p>
      </div>
    </div>
  );
}
