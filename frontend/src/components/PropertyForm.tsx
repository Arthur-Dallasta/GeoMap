import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const schema = z.object({
  name: z.string().min(1, "Nome é obrigatório"),
  location: z.string().min(1, "Localização é obrigatória"),
  municipality: z.string().min(1, "Município é obrigatório"),
  state: z.string().length(2, "Use a sigla do estado (2 letras)"),
  zip_code: z
    .string()
    .regex(/^\d{5}-\d{3}$/, "CEP deve estar no formato XXXXX-XXX"),
  total_area_ha: z.preprocess((v) => Number(v), z.number().positive("Deve ser maior que zero")),
  own_area_ha: z.preprocess((v) => Number(v), z.number().min(0, "Deve ser maior ou igual a zero")),
  leased_area_ha: z.preprocess((v) => Number(v), z.number().min(0)),
  protected_area_ha: z.preprocess((v) => Number(v), z.number().min(0)),
  people_count: z.preprocess((v) => Number(v), z.number().int().positive("Deve ser pelo menos 1")),
  crop_area_ha: z.preprocess((v) => Number(v), z.number().min(0)),
});

export type PropertyFormData = {
  name: string;
  location: string;
  municipality: string;
  state: string;
  zip_code: string;
  total_area_ha: number;
  own_area_ha: number;
  leased_area_ha: number;
  protected_area_ha: number;
  people_count: number;
  crop_area_ha: number;
};

interface PropertyFormProps {
  defaultValues?: Partial<PropertyFormData>;
  onSubmit: (data: PropertyFormData) => Promise<void>;
  submitLabel?: string;
}

export default function PropertyForm({
  defaultValues,
  onSubmit,
  submitLabel = "Salvar",
}: PropertyFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } = useForm<PropertyFormData>({
    resolver: zodResolver(schema) as any,
    defaultValues,
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <section className="space-y-4">
        <h3 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">
          Identificação
        </h3>
        <div className="space-y-2">
          <Label htmlFor="name">Nome da propriedade</Label>
          <Input id="name" {...register("name")} />
          {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
        </div>
      </section>

      <section className="space-y-4">
        <h3 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">
          Localização
        </h3>
        <div className="space-y-2">
          <Label htmlFor="location">Endereço / localização</Label>
          <Input id="location" {...register("location")} />
          {errors.location && <p className="text-sm text-destructive">{errors.location.message}</p>}
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="municipality">Município</Label>
            <Input id="municipality" {...register("municipality")} />
            {errors.municipality && (
              <p className="text-sm text-destructive">{errors.municipality.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="state">Estado (sigla)</Label>
            <Input id="state" maxLength={2} {...register("state")} />
            {errors.state && <p className="text-sm text-destructive">{errors.state.message}</p>}
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="zip_code">CEP</Label>
          <Input id="zip_code" placeholder="00000-000" maxLength={9} {...register("zip_code")} />
          {errors.zip_code && <p className="text-sm text-destructive">{errors.zip_code.message}</p>}
        </div>
      </section>

      <section className="space-y-4">
        <h3 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">
          Áreas (hectares)
        </h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="total_area_ha">Área total (ha)</Label>
            <Input id="total_area_ha" type="number" step="0.0001" {...register("total_area_ha")} />
            {errors.total_area_ha && (
              <p className="text-sm text-destructive">{errors.total_area_ha.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="own_area_ha">Área própria (ha)</Label>
            <Input id="own_area_ha" type="number" step="0.0001" {...register("own_area_ha")} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="leased_area_ha">Área arrendada (ha)</Label>
            <Input id="leased_area_ha" type="number" step="0.0001" {...register("leased_area_ha")} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="protected_area_ha">Área protegida (ha)</Label>
            <Input
              id="protected_area_ha"
              type="number"
              step="0.0001"
              {...register("protected_area_ha")}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="crop_area_ha">Área de produção vegetal (ha)</Label>
            <Input id="crop_area_ha" type="number" step="0.0001" {...register("crop_area_ha")} />
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <h3 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">
          Pessoas
        </h3>
        <div className="space-y-2">
          <Label htmlFor="people_count">Pessoas envolvidas na produção</Label>
          <Input id="people_count" type="number" min={1} {...register("people_count")} />
          {errors.people_count && (
            <p className="text-sm text-destructive">{errors.people_count.message}</p>
          )}
        </div>
      </section>

      <Button type="submit" disabled={isSubmitting} className="min-h-[44px]">
        {isSubmitting ? "Salvando..." : submitLabel}
      </Button>
    </form>
  );
}
