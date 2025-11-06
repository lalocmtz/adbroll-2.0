import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Globe, Save } from "lucide-react";
import { toast } from "sonner";

interface ScriptSection {
  type: string;
  text: string;
  adaptedText?: string;
  duration?: number;
}

interface ScriptTabProps {
  sections: ScriptSection[];
  onSectionsChange: (sections: ScriptSection[]) => void;
  videoThumbnail?: string;
  videoDuration?: number;
  detectedLanguage?: string;
  selectedBrandId: string;
  brands: Array<{ id: string; name: string }>;
  onBrandChange: (brandId: string) => void;
  onNext: () => void;
}

export function ScriptTab({
  sections,
  onSectionsChange,
  videoThumbnail,
  videoDuration,
  detectedLanguage = "es-MX",
  selectedBrandId,
  brands,
  onBrandChange,
  onNext
}: ScriptTabProps) {
  const [templateName, setTemplateName] = useState("");
  const [showSaveTemplate, setShowSaveTemplate] = useState(false);
  const [isAdapting, setIsAdapting] = useState(false);

  const handleAdaptScript = async () => {
    if (!selectedBrandId) {
      toast.error("Selecciona una marca primero");
      return;
    }

    setIsAdapting(true);
    try {
      // Call AI adaptation logic here
      toast.success("Guion adaptado a tu marca");
      
      // Mock adaptation - in real implementation, call edge function
      const adapted = sections.map(section => ({
        ...section,
        adaptedText: section.text // This would be the AI-adapted version
      }));
      onSectionsChange(adapted);
    } catch (error) {
      toast.error("Error al adaptar el guion");
    } finally {
      setIsAdapting(false);
    }
  };

  const handleSaveTemplate = () => {
    if (!templateName.trim()) {
      toast.error("Ingresa un nombre para la plantilla");
      return;
    }
    // Save template logic here
    toast.success("Plantilla guardada");
    setShowSaveTemplate(false);
    setTemplateName("");
  };

  const handleTextChange = (index: number, field: 'text' | 'adaptedText', value: string) => {
    const updated = [...sections];
    updated[index] = { ...updated[index], [field]: value };
    onSectionsChange(updated);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Left Panel - Video Info & Controls */}
      <div className="space-y-4">
        <Card className="p-4">
          {videoThumbnail && (
            <img 
              src={videoThumbnail} 
              alt="Video thumbnail"
              className="w-full rounded-lg mb-4"
            />
          )}
          {videoDuration && (
            <div className="text-sm text-muted-foreground mb-4">
              Duración: {Math.floor(videoDuration / 60)}:{(videoDuration % 60).toString().padStart(2, '0')}
            </div>
          )}
        </Card>

        <Card className="p-4 space-y-4">
          <div>
            <Label className="flex items-center gap-2 mb-2">
              <Globe className="w-4 h-4" />
              Idioma detectado
            </Label>
            <Input value={detectedLanguage} disabled />
          </div>

          <div>
            <Label>Selecciona la marca</Label>
            <Select value={selectedBrandId} onValueChange={onBrandChange}>
              <SelectTrigger>
                <SelectValue placeholder="Selecciona la marca" />
              </SelectTrigger>
              <SelectContent>
                {brands.map(brand => (
                  <SelectItem key={brand.id} value={brand.id}>
                    {brand.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Button
            onClick={handleAdaptScript}
            disabled={!selectedBrandId || isAdapting}
            className="w-full gap-2"
          >
            <Sparkles className="w-4 h-4" />
            {isAdapting ? "Adaptando..." : "Adaptar por IA"}
          </Button>
        </Card>

        {showSaveTemplate ? (
          <Card className="p-4 space-y-3">
            <Label>Nombre de la plantilla</Label>
            <Input
              value={templateName}
              onChange={(e) => setTemplateName(e.target.value)}
              placeholder="Ej: Hook + Problema + CTA"
            />
            <div className="flex gap-2">
              <Button onClick={handleSaveTemplate} size="sm" className="flex-1">
                Guardar
              </Button>
              <Button 
                onClick={() => setShowSaveTemplate(false)} 
                variant="outline" 
                size="sm"
              >
                Cancelar
              </Button>
            </div>
          </Card>
        ) : (
          <Button
            variant="outline"
            onClick={() => setShowSaveTemplate(true)}
            className="w-full gap-2"
          >
            <Save className="w-4 h-4" />
            Guardar plantilla
          </Button>
        )}
      </div>

      {/* Right Panel - Script Sections */}
      <div className="lg:col-span-2 space-y-6">
        <div className="mb-6">
          <h3 className="text-lg font-semibold mb-2">Estructura detectada</h3>
          <div className="flex flex-wrap gap-2">
            {sections.map((section, index) => (
              <Badge key={index} variant="outline">
                {section.type}
              </Badge>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <h4 className="font-semibold mb-3">Original</h4>
            <div className="space-y-3">
              {sections.map((section, index) => (
                <Card key={index} className="p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge variant="secondary" className="text-xs">
                      {section.type}
                    </Badge>
                  </div>
                  <Textarea
                    value={section.text}
                    onChange={(e) => handleTextChange(index, 'text', e.target.value)}
                    className="min-h-[80px] resize-none"
                  />
                </Card>
              ))}
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-semibold">Adaptado por IA</h4>
              <span className="text-xs text-muted-foreground">Puedes editarlo</span>
            </div>
            <div className="space-y-3">
              {sections.map((section, index) => (
                <Card key={index} className="p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge variant="default" className="text-xs">
                      {section.type}
                    </Badge>
                  </div>
                  <Textarea
                    value={section.adaptedText || section.text}
                    onChange={(e) => handleTextChange(index, 'adaptedText', e.target.value)}
                    className="min-h-[80px] resize-none"
                    placeholder="Adaptación por IA aparecerá aquí"
                  />
                </Card>
              ))}
            </div>
          </div>
        </div>

        <div className="flex justify-end pt-4 border-t">
          <Button onClick={onNext} size="lg">
            Continuar
          </Button>
        </div>
      </div>
    </div>
  );
}
