import { useRef, useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ChevronDown, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { formatZipCode } from "@/lib/utils";

const STATES = [
  { name: "Acre", abbr: "AC" },
  { name: "Alagoas", abbr: "AL" },
  { name: "Amapá", abbr: "AP" },
  { name: "Amazonas", abbr: "AM" },
  { name: "Bahia", abbr: "BA" },
  { name: "Ceará", abbr: "CE" },
  { name: "Distrito Federal", abbr: "DF" },
  { name: "Espírito Santo", abbr: "ES" },
  { name: "Goiás", abbr: "GO" },
  { name: "Maranhão", abbr: "MA" },
  { name: "Mato Grosso", abbr: "MT" },
  { name: "Mato Grosso do Sul", abbr: "MS" },
  { name: "Minas Gerais", abbr: "MG" },
  { name: "Pará", abbr: "PA" },
  { name: "Paraíba", abbr: "PB" },
  { name: "Paraná", abbr: "PR" },
  { name: "Pernambuco", abbr: "PE" },
  { name: "Piauí", abbr: "PI" },
  { name: "Rio de Janeiro", abbr: "RJ" },
  { name: "Rio Grande do Norte", abbr: "RN" },
  { name: "Rio Grande do Sul", abbr: "RS" },
  { name: "Rondônia", abbr: "RO" },
  { name: "Roraima", abbr: "RR" },
  { name: "Santa Catarina", abbr: "SC" },
  { name: "São Paulo", abbr: "SP" },
  { name: "Sergipe", abbr: "SE" },
  { name: "Tocantins", abbr: "TO" },
];

interface StateSelectProps {
  value: string;
  onChange: (abbr: string) => void;
  error?: string;
}

function StateSelect({ value, onChange, error }: StateSelectProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const filtered = STATES.filter(
    (s) =>
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.abbr.toLowerCase().includes(search.toLowerCase())
  );

  const selected = STATES.find((s) => s.abbr === value);

  useEffect(() => {
    if (open) searchRef.current?.focus();
    else setSearch("");
  }, [open]);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={cn(
          "flex w-full items-center justify-between rounded-md border bg-background px-3 py-2 text-sm transition-colors",
          error ? "border-destructive" : "border-input",
          "hover:border-primary/50 focus:outline-none focus:ring-2 focus:ring-ring"
        )}
      >
        <span className={selected ? "text-foreground" : "text-muted-foreground"}>
          {selected ? `${selected.name} — ${selected.abbr}` : "Selecione o estado..."}
        </span>
        <ChevronDown className={cn("w-4 h-4 text-muted-foreground transition-transform", open && "rotate-180")} />
      </button>

      {open && (
        <div className="absolute z-50 mt-1 w-full rounded-md border border-border bg-background shadow-lg">
          <div className="p-2 border-b border-border">
            <input
              ref={searchRef}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar estado..."
              className="w-full rounded-sm bg-muted/40 px-2 py-1.5 text-sm focus:outline-none placeholder:text-muted-foreground"
            />
          </div>
          <ul className="max-h-48 overflow-y-auto py-1">
            {filtered.length === 0 && (
              <li className="px-3 py-2 text-sm text-muted-foreground">Nenhum resultado</li>
            )}
            {filtered.map((s) => {
              const isSelected = s.abbr === value;
              return (
                <li
                  key={s.abbr}
                  onClick={() => { onChange(s.abbr); setOpen(false); }}
                  className={cn(
                    "flex items-center justify-between px-3 py-2 text-sm cursor-pointer transition-colors",
                    isSelected ? "bg-primary/10 text-primary font-medium" : "hover:bg-muted/60"
                  )}
                >
                  <span>{s.name} — {s.abbr}</span>
                  {isSelected && <Check className="w-3.5 h-3.5" />}
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}

const schema = z
  .object({
    name: z.string().min(1, "Nome é obrigatório"),
    location: z.string().min(1, "Localização é obrigatória"),
    municipality: z.string().min(1, "Município é obrigatório"),
    state: z.string().length(2, "Selecione um estado"),
    zip_code: z
      .string()
      .regex(/^\d{5}-\d{3}$/, "CEP deve estar no formato XXXXX-XXX"),
    total_area_ha: z.preprocess((v) => Number(v), z.number().positive("Deve ser maior que zero")),
    own_area_ha: z.preprocess((v) => Number(v), z.number().min(0, "Deve ser maior ou igual a zero")),
    leased_area_ha: z.preprocess((v) => Number(v), z.number().min(0)),
    protected_area_ha: z.preprocess((v) => Number(v), z.number().min(0)),
    people_count: z.preprocess((v) => Number(v), z.number().int().positive("Deve ser pelo menos 1")),
    crop_area_ha: z.preprocess((v) => Number(v), z.number().min(0)),
  })
  .superRefine((data, ctx) => {
    const total = data.total_area_ha;
    const fields = [
      { key: "own_area_ha", label: "Área própria" },
      { key: "leased_area_ha", label: "Área arrendada" },
      { key: "protected_area_ha", label: "Área protegida" },
      { key: "crop_area_ha", label: "Área de produção vegetal" },
    ] as const;
    for (const { key, label } of fields) {
      if (data[key] > total) {
        ctx.addIssue({
          code: z.ZodIssueCode.too_big,
          maximum: total,
          inclusive: true,
          origin: "number",
          path: [key],
          message: `${label} não pode ser maior que a área total (${total} ha)`,
        });
      }
    }
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
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<PropertyFormData>({
    resolver: zodResolver(schema) as any,
    defaultValues,
  });

  const zipValue = watch("zip_code", defaultValues?.zip_code ?? "");
  const stateValue = watch("state", defaultValues?.state ?? "");

  function handleZipChange(e: React.ChangeEvent<HTMLInputElement>) {
    setValue("zip_code", formatZipCode(e.target.value), { shouldValidate: true });
  }

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
            <Label>Estado</Label>
            <StateSelect
              value={stateValue}
              onChange={(abbr) => setValue("state", abbr, { shouldValidate: true })}
              error={errors.state?.message}
            />
            {errors.state && <p className="text-sm text-destructive">{errors.state.message}</p>}
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="zip_code">CEP</Label>
          <Input id="zip_code" placeholder="00000-000" maxLength={9} value={zipValue} onChange={handleZipChange} />
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
            {errors.own_area_ha && <p className="text-sm text-destructive">{errors.own_area_ha.message}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="leased_area_ha">Área arrendada (ha)</Label>
            <Input id="leased_area_ha" type="number" step="0.0001" {...register("leased_area_ha")} />
            {errors.leased_area_ha && <p className="text-sm text-destructive">{errors.leased_area_ha.message}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="protected_area_ha">Área protegida (ha)</Label>
            <Input
              id="protected_area_ha"
              type="number"
              step="0.0001"
              {...register("protected_area_ha")}
            />
            {errors.protected_area_ha && <p className="text-sm text-destructive">{errors.protected_area_ha.message}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="crop_area_ha">Área de produção vegetal (ha)</Label>
            <Input id="crop_area_ha" type="number" step="0.0001" {...register("crop_area_ha")} />
            {errors.crop_area_ha && <p className="text-sm text-destructive">{errors.crop_area_ha.message}</p>}
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
