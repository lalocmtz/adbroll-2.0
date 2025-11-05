import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Film, FileText } from "lucide-react";

interface VariationTypeSelectorProps {
  type: "hook" | "full";
  onChange: (type: "hook" | "full") => void;
}

export function VariationTypeSelector({ type, onChange }: VariationTypeSelectorProps) {
  return (
    <div className="space-y-3">
      <Label className="text-base font-semibold">¿Qué te gustaría variar?</Label>
      <div className="grid grid-cols-2 gap-3">
        <Card
          className={`p-4 cursor-pointer transition-all hover:shadow-md ${
            type === "hook" 
              ? "border-primary bg-primary/5 ring-2 ring-primary" 
              : "border-border hover:border-primary/50"
          }`}
          onClick={() => onChange("hook")}
        >
          <div className="flex items-start gap-3">
            <Film className="w-5 h-5 mt-0.5 shrink-0" />
            <div>
              <p className="font-medium mb-1">Solo el hook</p>
              <p className="text-xs text-muted-foreground">Varía solo los primeros segundos</p>
            </div>
          </div>
        </Card>

        <Card
          className={`p-4 cursor-pointer transition-all hover:shadow-md ${
            type === "full" 
              ? "border-primary bg-primary/5 ring-2 ring-primary" 
              : "border-border hover:border-primary/50"
          }`}
          onClick={() => onChange("full")}
        >
          <div className="flex items-start gap-3">
            <FileText className="w-5 h-5 mt-0.5 shrink-0" />
            <div>
              <p className="font-medium mb-1">Todo el guión</p>
              <p className="text-xs text-muted-foreground">Varía el contenido completo</p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
