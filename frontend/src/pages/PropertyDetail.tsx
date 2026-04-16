// frontend/src/pages/PropertyDetail.tsx
import { useState, useEffect, useCallback } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Pencil, Trash2 } from "lucide-react";
import L from "leaflet";
import AppLayout from "../components/AppLayout";
import PropertyMap from "../components/PropertyMap";
import AreaUploadModal from "../components/AreaUploadModal";
import CategoryManager from "../components/CategoryManager";
import MapExportButtons from "../components/MapExportButtons";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { api } from "../lib/api";
import { useAreas } from "../hooks/useAreas";
import { useCategories } from "../hooks/useCategories";
import type { Property } from "../types";

export default function PropertyDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [property, setProperty] = useState<Property | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [mapInstance, setMapInstance] = useState<L.Map | null>(null);

  const { areas, uploadArea, refetch: refetchAreas } = useAreas(id!);
  const { categories, createCategory, updateCategory, deleteCategory, assignToArea } =
    useCategories(id!);

  useEffect(() => {
    api
      .get<Property>(`/properties/${id}`)
      .then(setProperty)
      .catch((e) => setError(e instanceof Error ? e.message : "Erro ao carregar"))
      .finally(() => setIsLoading(false));
  }, [id]);

  const handleAssignCategory = useCallback(
    async (areaId: string, categoryId: string | null) => {
      await assignToArea(areaId, categoryId);
      await refetchAreas();
    },
    [assignToArea, refetchAreas]
  );

  async function handleDelete() {
    if (!confirm("Deseja excluir esta propriedade? Esta ação não pode ser desfeita.")) return;
    try {
      await api.delete(`/properties/${id}`);
      navigate("/dashboard");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao excluir");
    }
  }

  if (isLoading) return <AppLayout><p>Carregando...</p></AppLayout>;
  if (error) return <AppLayout><p className="text-destructive">{error}</p></AppLayout>;
  if (!property) return null;

  return (
    <AppLayout>
      <div className="max-w-2xl">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-semibold">{property.name}</h1>
          <div className="flex gap-2">
            <Link
              to={`/properties/${id}/edit`}
              className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
            >
              <Pencil className="h-4 w-4 mr-2" />
              Editar
            </Link>
            <Button
              variant="destructive"
              size="sm"
              onClick={handleDelete}
              className="min-h-[44px]"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Excluir
            </Button>
          </div>
        </div>

        <div className="space-y-4 text-sm mb-6">
          <Row label="Localização" value={property.location} />
          <Row label="Município" value={`${property.municipality} — ${property.state}`} />
          <Row label="CEP" value={property.zip_code} />
          <Row label="Área total" value={`${Number(property.total_area_ha).toLocaleString("pt-BR")} ha`} />
          <Row label="Área própria" value={`${Number(property.own_area_ha).toLocaleString("pt-BR")} ha`} />
          <Row label="Área arrendada" value={`${Number(property.leased_area_ha).toLocaleString("pt-BR")} ha`} />
          <Row label="Área protegida" value={`${Number(property.protected_area_ha).toLocaleString("pt-BR")} ha`} />
          <Row label="Área de produção vegetal" value={`${Number(property.crop_area_ha).toLocaleString("pt-BR")} ha`} />
          <Row label="Pessoas na produção" value={String(property.people_count)} />
        </div>

        <PropertyMap
          areas={areas}
          categories={categories}
          onAddArea={() => setModalOpen(true)}
          onAssignCategory={handleAssignCategory}
          onMapReady={setMapInstance}
        />

        <MapExportButtons mapInstance={mapInstance} propertyName={property.name} />

        <CategoryManager
          categories={categories}
          onCreateCategory={createCategory}
          onUpdateCategory={updateCategory}
          onDeleteCategory={async (catId) => {
            await deleteCategory(catId);
            await refetchAreas();
          }}
        />

        <AreaUploadModal
          open={modalOpen}
          hasBoundary={areas.boundary !== null}
          categories={categories}
          onClose={() => setModalOpen(false)}
          onUpload={uploadArea}
          onCreateCategory={createCategory}
        />
      </div>
    </AppLayout>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-4 py-2 border-b">
      <span className="font-medium w-48 shrink-0">{label}</span>
      <span className="text-muted-foreground">{value}</span>
    </div>
  );
}
