import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useState } from "react";

const brandSchema = z.object({
  name: z.string().trim().min(1, "Nombre requerido").max(100, "Nombre muy largo"),
  website_url: z.string().url("URL inválida").optional().or(z.literal("")),
  product_description: z.string().trim().min(10, "Describe tu producto (mínimo 10 caracteres)").max(500),
  main_promise: z.string().trim().min(10, "Promesa principal requerida (mínimo 10 caracteres)").max(300),
  ideal_customer: z.string().trim().min(10, "Describe tu cliente ideal (mínimo 10 caracteres)").max(300),
  main_benefit: z.string().trim().min(10, "Beneficio clave requerido (mínimo 10 caracteres)").max(300),
  main_objection: z.string().trim().min(10, "Objeción principal requerida (mínimo 10 caracteres)").max(300),
  tone_of_voice: z.string().min(1, "Selecciona un tono"),
});

type BrandFormData = z.infer<typeof brandSchema>;

interface BrandFormProps {
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function BrandForm({ onSuccess, onCancel }: BrandFormProps) {
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<BrandFormData>({
    resolver: zodResolver(brandSchema),
    defaultValues: {
      tone_of_voice: "professional",
    },
  });

  const toneOfVoice = watch("tone_of_voice");

  const onSubmit = async (data: BrandFormData) => {
    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        toast.error("Debes iniciar sesión");
        return;
      }

      const { error } = await supabase.from("brands").insert({
        user_id: user.id,
        name: data.name,
        website_url: data.website_url || null,
        product_description: data.product_description,
        main_promise: data.main_promise,
        ideal_customer: data.ideal_customer,
        main_benefit: data.main_benefit,
        main_objection: data.main_objection,
        tone_of_voice: data.tone_of_voice,
      });

      if (error) throw error;

      toast.success("¡Marca creada exitosamente!");
      onSuccess?.();
    } catch (error: any) {
      toast.error(error.message || "Error al crear la marca");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <Card className="p-6">
        <h3 className="text-lg font-bold mb-4">Información Básica</h3>
        <div className="space-y-4">
          <div>
            <Label htmlFor="name">Nombre de la marca *</Label>
            <Input
              id="name"
              placeholder="Ej: Mi Tienda Online"
              {...register("name")}
              className="mt-1.5"
            />
            {errors.name && (
              <p className="text-sm text-red-500 mt-1">{errors.name.message}</p>
            )}
          </div>

          <div>
            <Label htmlFor="website_url">Sitio web (opcional)</Label>
            <Input
              id="website_url"
              type="url"
              placeholder="https://tutienda.com"
              {...register("website_url")}
              className="mt-1.5"
            />
            {errors.website_url && (
              <p className="text-sm text-red-500 mt-1">{errors.website_url.message}</p>
            )}
          </div>
        </div>
      </Card>

      <Card className="p-6">
        <h3 className="text-lg font-bold mb-2">Contexto para IA</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Esta información ayuda a la IA a crear guiones perfectos para tu marca
        </p>
        
        <div className="space-y-4">
          <div>
            <Label htmlFor="product_description">¿Qué vendes? *</Label>
            <Textarea
              id="product_description"
              placeholder="Ej: Vendemos cremas faciales naturales para piel sensible..."
              {...register("product_description")}
              className="mt-1.5 min-h-[80px]"
            />
            {errors.product_description && (
              <p className="text-sm text-red-500 mt-1">{errors.product_description.message}</p>
            )}
          </div>

          <div>
            <Label htmlFor="main_promise">Promesa principal *</Label>
            <Textarea
              id="main_promise"
              placeholder="Ej: Piel radiante en 7 días sin químicos agresivos"
              {...register("main_promise")}
              className="mt-1.5 min-h-[60px]"
            />
            {errors.main_promise && (
              <p className="text-sm text-red-500 mt-1">{errors.main_promise.message}</p>
            )}
          </div>

          <div>
            <Label htmlFor="ideal_customer">Cliente ideal *</Label>
            <Textarea
              id="ideal_customer"
              placeholder="Ej: Mujeres de 25-40 años preocupadas por el envejecimiento prematuro"
              {...register("ideal_customer")}
              className="mt-1.5 min-h-[60px]"
            />
            {errors.ideal_customer && (
              <p className="text-sm text-red-500 mt-1">{errors.ideal_customer.message}</p>
            )}
          </div>

          <div>
            <Label htmlFor="main_benefit">Beneficio clave *</Label>
            <Textarea
              id="main_benefit"
              placeholder="Ej: Ingredientes 100% naturales que realmente funcionan"
              {...register("main_benefit")}
              className="mt-1.5 min-h-[60px]"
            />
            {errors.main_benefit && (
              <p className="text-sm text-red-500 mt-1">{errors.main_benefit.message}</p>
            )}
          </div>

          <div>
            <Label htmlFor="main_objection">Objeción principal *</Label>
            <Textarea
              id="main_objection"
              placeholder="Ej: Los productos naturales no funcionan tan rápido"
              {...register("main_objection")}
              className="mt-1.5 min-h-[60px]"
            />
            {errors.main_objection && (
              <p className="text-sm text-red-500 mt-1">{errors.main_objection.message}</p>
            )}
          </div>

          <div>
            <Label htmlFor="tone_of_voice">Tono de voz *</Label>
            <Select
              value={toneOfVoice}
              onValueChange={(value) => setValue("tone_of_voice", value)}
            >
              <SelectTrigger className="mt-1.5">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="professional">Profesional</SelectItem>
                <SelectItem value="friendly">Amigable y cercano</SelectItem>
                <SelectItem value="enthusiastic">Entusiasta y energético</SelectItem>
                <SelectItem value="authoritative">Autoritario y confiable</SelectItem>
                <SelectItem value="casual">Casual y relajado</SelectItem>
              </SelectContent>
            </Select>
            {errors.tone_of_voice && (
              <p className="text-sm text-red-500 mt-1">{errors.tone_of_voice.message}</p>
            )}
          </div>
        </div>
      </Card>

      <div className="flex gap-3 justify-end">
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel} disabled={loading}>
            Cancelar
          </Button>
        )}
        <Button type="submit" disabled={loading}>
          {loading ? "Creando marca..." : "Crear Marca"}
        </Button>
      </div>
    </form>
  );
}
