import { useState, useEffect, useCallback } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Pencil, Trash2 } from "lucide-react";
import L from "leaflet";
import AppLayout from "../components/AppLayout";
import PropertyMap from "../components/PropertyMap";
import AreaUploadModal from "../components/AreaUploadModal";
import AreaDetailPanel from "../components/AreaDetailPanel";
import CategoryManager from "../components/CategoryManager";
import MapExportButtons from "../components/MapExportButtons";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { api } from "../lib/api";
import { useAreas } from "../hooks/useAreas";
import { useCategories } from "../hooks/useCategories";
import { useSubcategories } from "../hooks/useSubcategories";
import type { AreaFeature, Property } from "../types";

export default function PropertyDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [property, setProperty] = useState<Property | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [mapInstance, setMapInstance] = useState<L.Map | null>(null);

  const [selectedAreaId, setSelectedAreaId] = useState<string | null>(null);
  const { areas, uploadArea, deleteArea, refetch: refetchAreas } = useAreas(id!);
  const { categories, assignToArea: assignCategoryToArea } = useCategories(id!);
  const {
    subcategories,
    createSubcategory,
    updateSubcategory,
    deleteSubcategory,
    assignToArea: assignSubcategoryToArea,
  } = useSubcategories(id!);

  const selectedArea: AreaFeature | null = selectedAreaId
    ? ([...(areas.boundary ? [areas.boundary] : []), ...areas.internal].find(
        (a) => a.properties.id === selectedAreaId
      ) ?? null)
    : null;

  useEffect(() => {
    api
      .get<Property>(`/properties/${id}`)
      .then(setProperty)
      .catch((e) => setError(e instanceof Error ? e.message : "Erro ao carregar"))
      .finally(() => setIsLoading(false));
  }, [id]);

  const handleAssignCategory = useCallback(
    async (areaId: string, categoryId: string | null) => {
      await assignCategoryToArea(areaId, categoryId);
      await refetchAreas();
    },
    [assignCategoryToArea, refetchAreas]
  );

  const handleAssignSubcategory = useCallback(
    async (areaId: string, subcategoryId: string | null) => {
      await assignSubcategoryToArea(areaId, subcategoryId);
      await refetchAreas();
    },
    [assignSubcategoryToArea, refetchAreas]
  );

  const handleDeleteArea = useCallback(
    async (areaId: string) => {
      await deleteArea(areaId);
      setSelectedAreaId(null);
    },
    [deleteArea]
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
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-heading font-semibold">{property.name}</h1>
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
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Excluir
            </Button>
          </div>
        </div>

        <div className="bg-card border rounded-lg p-4 mb-4 space-y-2 text-sm anim-in-1">
          <Row label="Localização" value={property.location} />
          <Row label="Município" value={`${property.municipality} — ${property.state}`} />
          <Row label="CEP" value={property.zip_code} />
        </div>

        <div className="grid grid-cols-2 gap-3 mb-6 anim-in-2">
          <StatCard label="Área total" value={`${Number(property.total_area_ha).toLocaleString("pt-BR")} ha`} accent />
          <StatCard label="Área própria" value={`${Number(property.own_area_ha).toLocaleString("pt-BR")} ha`} />
          <StatCard label="Área arrendada" value={`${Number(property.leased_area_ha).toLocaleString("pt-BR")} ha`} />
          <StatCard label="Área protegida" value={`${Number(property.protected_area_ha).toLocaleString("pt-BR")} ha`} />
          <StatCard label="Produção vegetal" value={`${Number(property.crop_area_ha).toLocaleString("pt-BR")} ha`} />
          <StatCard label="Pessoas na produção" value={String(property.people_count)} />
        </div>

        <PropertyMap
          areas={areas}
          onAddArea={() => setModalOpen(true)}
          onAreaClick={(area) => setSelectedAreaId(area.properties.id)}
          onMapReady={setMapInstance}
        />

        {selectedArea && (
          <AreaDetailPanel
            area={selectedArea}
            categories={categories}
            subcategories={subcategories}
            onClose={() => setSelectedAreaId(null)}
            onAssignCategory={handleAssignCategory}
            onAssignSubcategory={handleAssignSubcategory}
            onDelete={handleDeleteArea}
          />
        )}

        <MapExportButtons mapInstance={mapInstance} propertyName={property.name} />

        <CategoryManager
          categories={categories}
          subcategories={subcategories}
          onCreateSubcategory={createSubcategory}
          onUpdateSubcategory={updateSubcategory}
          onDeleteSubcategory={deleteSubcategory}
        />

        <AreaUploadModal
          open={modalOpen}
          hasBoundary={areas.boundary !== null}
          categories={categories}
          onClose={() => setModalOpen(false)}
          onUpload={uploadArea}
        />
      </div>
    </AppLayout>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-4 py-1.5">
      <span className="font-medium text-muted-foreground w-36 shrink-0 text-xs uppercase tracking-wide">{label}</span>
      <span className="text-foreground">{value}</span>
    </div>
  );
}

function StatCard({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className={`rounded-lg border px-4 py-3 ${accent ? "bg-primary text-primary-foreground border-primary" : "bg-card"}`}>
      <p className={`text-xs uppercase tracking-wide mb-1 ${accent ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
        {label}
      </p>
      <p className={`text-lg font-heading font-semibold ${accent ? "text-primary-foreground" : "text-foreground"}`}>
        {value}
      </p>
    </div>
  );
}
