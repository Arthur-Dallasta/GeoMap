import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Plus } from "lucide-react";
import AppLayout from "../components/AppLayout";
import PropertyCard from "../components/PropertyCard";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { api } from "../lib/api";
import type { Property } from "../types";

export default function Dashboard() {
  const [properties, setProperties] = useState<Property[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .get<Property[]>("/properties/")
      .then(setProperties)
      .catch((e) => setError(e instanceof Error ? e.message : "Erro ao carregar"))
      .finally(() => setIsLoading(false));
  }, []);

  return (
    <AppLayout>
      <div className="flex items-center justify-between mb-8 anim-in">
        <div>
          <h1 className="text-2xl font-heading font-semibold text-foreground">Minhas Propriedades</h1>
          {!isLoading && !error && properties.length > 0 && (
            <p className="text-sm text-muted-foreground mt-0.5">
              {properties.length} {properties.length === 1 ? "propriedade cadastrada" : "propriedades cadastradas"}
            </p>
          )}
        </div>
        <Link to="/properties/new" className={cn(buttonVariants({ size: "sm" }), "gap-1.5")}>
          <Plus className="h-3.5 w-3.5" />
          Nova propriedade
        </Link>
      </div>

      {isLoading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-44 rounded-lg bg-muted animate-pulse" />
          ))}
        </div>
      )}
      {error && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {!isLoading && !error && properties.length === 0 && (
        <div className="text-center py-20 anim-in-1">
          <div className="w-16 h-16 mx-auto mb-5 rounded-full bg-primary/10 flex items-center justify-center">
            <Plus className="h-8 w-8 text-primary" />
          </div>
          <h3 className="font-heading text-lg font-semibold text-foreground mb-1">
            Nenhuma propriedade cadastrada
          </h3>
          <p className="text-sm text-muted-foreground mb-6">
            Adicione sua primeira propriedade para começar a visualizar seus dados.
          </p>
          <Link to="/properties/new" className={cn(buttonVariants())}>
            <Plus className="h-4 w-4 mr-2" />
            Cadastrar propriedade
          </Link>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {properties.map((p, i) => (
          <div key={p.id} className={`anim-in-${Math.min(i + 1, 4) as 1 | 2 | 3 | 4}`}>
            <PropertyCard property={p} />
          </div>
        ))}
      </div>
    </AppLayout>
  );
}
