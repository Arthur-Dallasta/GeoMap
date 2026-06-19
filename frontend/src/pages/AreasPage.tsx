import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ChevronLeft } from "lucide-react";
import AppLayout from "../components/AppLayout";
import AreaGrid from "../components/AreaGrid";
import AreaDetailPanel from "../components/AreaDetailPanel";
import AreaUploadModal from "../components/AreaUploadModal";
import { Button } from "@/components/ui/button";
import { api } from "../lib/api";
import { useAreas } from "../hooks/useAreas";
import { useCategories } from "../hooks/useCategories";
import { useSubcategories } from "../hooks/useSubcategories";
import type { AreaFeature, Property } from "../types";

export default function AreasPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [property, setProperty] = useState<Property | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
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
    api.get<Property>(`/properties/${id}`).then(setProperty).catch(() => null);
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

  return (
    <AppLayout>
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate(`/properties/${id}`)}
              className="text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <h1 className="text-2xl font-heading font-semibold">
              Minhas Áreas
              {property && (
                <span className="text-muted-foreground font-normal text-base ml-2">
                  — {property.name}
                </span>
              )}
            </h1>
          </div>
          <Button size="sm" onClick={() => setModalOpen(true)}>
            Importar Área
          </Button>
        </div>

        <AreaGrid
          areas={areas.internal}
          categories={categories}
          subcategories={subcategories}
          onEdit={(areaId) => setSelectedAreaId(areaId)}
          onDelete={handleDeleteArea}
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

        <AreaUploadModal
          open={modalOpen}
          hasBoundary={areas.boundary !== null}
          categories={categories}
          subcategories={subcategories}
          onClose={() => setModalOpen(false)}
          onUpload={uploadArea}
        />
      </div>
    </AppLayout>
  );
}
