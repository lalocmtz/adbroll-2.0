import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { FileText, Video } from "lucide-react";

interface HookVariantTypeSelectorProps {
  type: "text" | "visual";
  onChange: (type: "text" | "visual") => void;
}

export function HookVariantTypeSelector({ type, onChange }: HookVariantTypeSelectorProps) {
  return (
    <div className="space-y-3">
      <Label className="text-base font-semibold">¿Cómo quieres variar el hook?</Label>
      <div className="grid grid-cols-2 gap-3">
        <Card
          className={`p-4 cursor-pointer transition-all hover:shadow-md ${
            type === "text" 
              ? "border-primary bg-primary/5 ring-2 ring-primary" 
              : "border-border hover:border-primary/50"
          }`}
          onClick={() => onChange("text")}
        >
          <div className="flex items-start gap-3">
            <FileText className="w-5 h-5 mt-0.5 shrink-0" />
            <div>
              <p className="font-medium mb-1">Variante de texto</p>
              <p className="text-xs text-muted-foreground">3 textos diferentes como hook</p>
            </div>
          </div>
        </Card>

        <Card
          className={`p-4 cursor-pointer transition-all hover:shadow-md ${
            type === "visual" 
              ? "border-primary bg-primary/5 ring-2 ring-primary" 
              : "border-border hover:border-primary/50"
          }`}
          onClick={() => onChange("visual")}
        >
          <div className="flex items-start gap-3">
            <Video className="w-5 h-5 mt-0.5 shrink-0" />
            <div>
              <p className="font-medium mb-1">Variante visual</p>
              <p className="text-xs text-muted-foreground">3 clips diferentes de hook</p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
