import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import AppLayout from "../components/AppLayout";
import PropertyForm, { type PropertyFormData } from "../components/PropertyForm";
import { api } from "../lib/api";
import type { Property } from "../types";

export default function PropertyEdit() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [property, setProperty] = useState<Property | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .get<Property>(`/properties/${id}`)
      .then(setProperty)
      .catch((e) => setError(e instanceof Error ? e.message : "Erro ao carregar"))
      .finally(() => setIsLoading(false));
  }, [id]);

  async function onSubmit(data: PropertyFormData) {
    setError(null);
    try {
      await api.put<Property>(`/properties/${id}`, data);
      navigate(`/properties/${id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao salvar");
    }
  }

  if (isLoading) return <AppLayout><p>Carregando...</p></AppLayout>;
  if (!property) return <AppLayout><p className="text-destructive">{error}</p></AppLayout>;

  const defaultValues: Partial<PropertyFormData> = {
    name: property.name,
    location: property.location,
    municipality: property.municipality,
    state: property.state,
    zip_code: property.zip_code,
    total_area_ha: Number(property.total_area_ha),
    own_area_ha: Number(property.own_area_ha),
    leased_area_ha: Number(property.leased_area_ha),
    protected_area_ha: Number(property.protected_area_ha),
    people_count: property.people_count,
    crop_area_ha: Number(property.crop_area_ha),
  };

  return (
    <AppLayout>
      <div className="max-w-2xl">
        <h1 className="text-2xl font-semibold mb-6">Editar: {property.name}</h1>
        {error && <p className="text-destructive mb-4">{error}</p>}
        <PropertyForm defaultValues={defaultValues} onSubmit={onSubmit} submitLabel="Salvar alterações" />
      </div>
    </AppLayout>
  );
}
