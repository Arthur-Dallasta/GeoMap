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
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold">Minhas Propriedades</h1>
        <Link to="/properties/new" className={cn(buttonVariants())}>
          <Plus className="h-4 w-4 mr-2" />
          Nova propriedade
        </Link>
      </div>

      {isLoading && <p className="text-muted-foreground">Carregando...</p>}
      {error && <p className="text-destructive">{error}</p>}

      {!isLoading && !error && properties.length === 0 && (
        <div className="text-center py-16 text-muted-foreground">
          <p className="mb-4">Nenhuma propriedade cadastrada ainda.</p>
          <Link to="/properties/new" className={cn(buttonVariants())}>
            Cadastrar primeira propriedade
          </Link>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {properties.map((p) => (
          <PropertyCard key={p.id} property={p} />
        ))}
      </div>
    </AppLayout>
  );
}
