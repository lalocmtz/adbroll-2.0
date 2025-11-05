import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

interface VariantCountSelectorProps {
  count: number;
  onChange: (count: number) => void;
}

export function VariantCountSelector({ count, onChange }: VariantCountSelectorProps) {
  return (
    <div className="space-y-3">
      <Label className="text-base font-semibold">¿Cuántas variantes quieres?</Label>
      <div className="flex gap-2">
        <Button
          variant={count === 1 ? "default" : "outline"}
          onClick={() => onChange(1)}
          className="flex-1 h-12"
        >
          1 variante
        </Button>
        <Button
          variant={count === 3 ? "default" : "outline"}
          onClick={() => onChange(3)}
          className="flex-1 h-12"
        >
          3 variantes
        </Button>
      </div>
    </div>
  );
}
