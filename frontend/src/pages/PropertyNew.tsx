import { useState } from "react";
import { useNavigate } from "react-router-dom";
import AppLayout from "../components/AppLayout";
import PropertyForm, { type PropertyFormData } from "../components/PropertyForm";
import { Button } from "@/components/ui/button";
import { api } from "../lib/api";
import type { Property } from "../types";

export default function PropertyNew() {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(data: PropertyFormData) {
    setError(null);
    try {
      const created = await api.post<Property>("/properties/", data);
      navigate(`/properties/${created.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao criar propriedade");
    }
  }

  return (
    <AppLayout>
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-semibold">Nova Propriedade</h1>
          <Button variant="outline" size="sm" onClick={() => navigate("/dashboard")}>
            Cancelar
          </Button>
        </div>
        {error && <p className="text-destructive mb-4">{error}</p>}
        <PropertyForm onSubmit={onSubmit} submitLabel="Cadastrar propriedade" />
      </div>
    </AppLayout>
  );
}
