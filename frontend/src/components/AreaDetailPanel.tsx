import { useState } from "react";
import { X, Trash2, MapPin, Layers } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { AreaFeature, Category, Subcategory } from "../types";

interface AreaDetailPanelProps {
  area: AreaFeature;
  categories: Category[];
  subcategories: Subcategory[];
  onClose: () => void;
  onAssignCategory: (areaId: string, categoryId: string | null) => Promise<void>;
  onAssignSubcategory: (areaId: string, subcategoryId: string | null) => Promise<void>;
  onDelete: (areaId: string) => Promise<void>;
}

function getGeomInfo(geometry: GeoJSON.Geometry): { type: string; vertices: number } {
  if (geometry.type === "Polygon") {
    return { type: "Polígono", vertices: geometry.coordinates[0].length - 1 };
  }
  if (geometry.type === "MultiPolygon") {
    const vertices = (geometry as GeoJSON.MultiPolygon).coordinates.reduce(
      (sum, poly) => sum + poly[0].length - 1,
      0
    );
    return { type: "MultiPolígono", vertices };
  }
  return { type: geometry.type, vertices: 0 };
}

export default function AreaDetailPanel({
  area,
  categories,
  subcategories,
  onClose,
  onAssignCategory,
  onAssignSubcategory,
  onDelete,
}: AreaDetailPanelProps) {
  const [loading, setLoading] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const isBoundary = area.properties.type === "boundary";
  const currentCategoryId = area.properties.category_id;
  const currentSubcategoryId = area.properties.subcategory_id;
  const currentCategory = categories.find((c) => c.id === currentCategoryId) ?? null;
  const { type: geomType, vertices } = getGeomInfo(area.geometry);

  const relevantSubcategories = currentCategoryId
    ? subcategories.filter((s) => s.category_id === currentCategoryId)
    : [];

  async function handleAssignCategory(catId: string | null) {
    setLoading(true);
    try {
      await onAssignCategory(area.properties.id, catId);
      if (catId !== currentCategoryId) {
        await onAssignSubcategory(area.properties.id, null);
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleAssignSubcategory(subId: string | null) {
    setLoading(true);
    try {
      await onAssignSubcategory(area.properties.id, subId);
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete() {
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    setLoading(true);
    try {
      await onDelete(area.properties.id);
      onClose();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[1001] flex items-center justify-center bg-black/50">
      <div className="bg-background border border-border rounded-lg w-full max-w-lg shadow-xl overflow-hidden">

        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-md bg-primary/10 flex items-center justify-center">
              {isBoundary
                ? <MapPin className="w-4 h-4 text-primary" />
                : <Layers className="w-4 h-4 text-primary" />}
            </div>
            <div>
              <h2 className="text-base font-semibold">
                {isBoundary ? "Contorno Geral" : "Área Interna"}
              </h2>
              <p className="text-xs text-muted-foreground">
                {geomType} · {vertices} vértices
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="cursor-pointer text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-6 py-5 space-y-5 max-h-[70vh] overflow-y-auto">

          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-2">
              Informações do arquivo
            </p>
            <div className="bg-muted/40 rounded-md border border-border divide-y divide-border text-sm">
              <div className="flex justify-between px-4 py-2.5">
                <span className="text-muted-foreground">Formato</span>
                <span className="font-medium">GeoJSON</span>
              </div>
              <div className="flex justify-between px-4 py-2.5">
                <span className="text-muted-foreground">Geometria</span>
                <span className="font-medium">{geomType}</span>
              </div>
              <div className="flex justify-between px-4 py-2.5">
                <span className="text-muted-foreground">Vértices</span>
                <span className="font-medium">{vertices}</span>
              </div>
              <div className="flex justify-between px-4 py-2.5">
                <span className="text-muted-foreground">Tipo de área</span>
                <span className="font-medium">
                  {isBoundary ? "Contorno geral" : "Área interna"}
                </span>
              </div>
            </div>
          </div>

          {!isBoundary && (
            <>
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-2">
                  Categoria
                </p>

                {currentCategory ? (
                  <div className="flex items-center gap-3 bg-card border border-border rounded-md px-4 py-3 mb-3">
                    <div
                      className="w-5 h-5 rounded-full shrink-0 ring-2 ring-offset-1 ring-border"
                      style={{ backgroundColor: currentCategory.color }}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold">{currentCategory.name}</p>
                      {currentCategory.description && (
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {currentCategory.description}
                        </p>
                      )}
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground mb-3">Nenhuma categoria atribuída.</p>
                )}

                <div className="grid grid-cols-2 gap-2">
                  {categories.map((cat) => {
                    const isSelected = cat.id === currentCategoryId;
                    return (
                      <button
                        key={cat.id}
                        onClick={() => handleAssignCategory(cat.id)}
                        disabled={loading}
                        className={cn(
                          "flex items-center gap-2 px-3 py-2.5 rounded-md border text-sm text-left cursor-pointer transition-colors",
                          isSelected
                            ? "border-primary bg-primary/10"
                            : "border-border hover:border-primary/50 hover:bg-muted/50"
                        )}
                      >
                        <div
                          className="w-3 h-3 rounded-full shrink-0"
                          style={{ backgroundColor: cat.color }}
                        />
                        <span className={cn("truncate flex-1", isSelected && "font-medium text-primary")}>
                          {cat.name}
                        </span>
                        {isSelected && (
                          <svg className="w-3.5 h-3.5 shrink-0 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </button>
                    );
                  })}
                </div>

                {currentCategoryId && (
                  <button
                    onClick={() => handleAssignCategory(null)}
                    disabled={loading}
                    className="mt-3 text-xs text-destructive cursor-pointer hover:underline"
                  >
                    Remover categoria
                  </button>
                )}
              </div>

              {currentCategoryId && (
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-2">
                    Subcategoria
                  </p>

                  {relevantSubcategories.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      Nenhuma subcategoria cadastrada para esta categoria.
                    </p>
                  ) : (
                    <div className="grid grid-cols-2 gap-2">
                      {relevantSubcategories.map((sub) => {
                        const isSelected = sub.id === currentSubcategoryId;
                        return (
                          <button
                            key={sub.id}
                            onClick={() => handleAssignSubcategory(sub.id)}
                            disabled={loading}
                            className={cn(
                              "flex items-center gap-2 px-3 py-2.5 rounded-md border text-sm text-left cursor-pointer transition-colors",
                              isSelected
                                ? "border-primary bg-primary/10"
                                : "border-border hover:border-primary/50 hover:bg-muted/50"
                            )}
                          >
                            <span className={cn("truncate flex-1", isSelected && "font-medium text-primary")}>
                              {sub.name}
                            </span>
                            {isSelected && (
                              <svg className="w-3.5 h-3.5 shrink-0 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                              </svg>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {currentSubcategoryId && (
                    <button
                      onClick={() => handleAssignSubcategory(null)}
                      disabled={loading}
                      className="mt-3 text-xs text-destructive cursor-pointer hover:underline"
                    >
                      Remover subcategoria
                    </button>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        <div className="flex items-center justify-between px-6 py-4 border-t border-border">
          <Button
            variant="destructive"
            size="sm"
            onClick={handleDelete}
            disabled={loading}
          >
            <Trash2 className="w-4 h-4 mr-2" />
            {confirmDelete ? "Confirmar exclusão" : "Excluir área"}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => { setConfirmDelete(false); onClose(); }}
            disabled={loading}
          >
            Fechar
          </Button>
        </div>
      </div>
    </div>
  );
}
