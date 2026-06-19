import { Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { AreaFeature, Category, Subcategory } from "../types";

interface AreaGridProps {
  areas: AreaFeature[];
  categories: Category[];
  subcategories: Subcategory[];
  onEdit: (areaId: string) => void;
  onDelete: (areaId: string) => Promise<void>;
}

function extractCoords(geometry: GeoJSON.Geometry): [number, number][] {
  if (geometry.type === "Polygon") return geometry.coordinates[0] as [number, number][];
  if (geometry.type === "MultiPolygon")
    return geometry.coordinates.flatMap((poly) => poly[0]) as [number, number][];
  return [];
}

function PolygonPreview({ geometry, color }: { geometry: GeoJSON.Geometry; color: string }) {
  const coords = extractCoords(geometry);
  if (coords.length < 3) return null;

  const xs = coords.map(([lng]) => lng);
  const ys = coords.map(([, lat]) => lat);
  const minX = Math.min(...xs), maxX = Math.max(...xs);
  const minY = Math.min(...ys), maxY = Math.max(...ys);
  const rangeX = maxX - minX || 1;
  const rangeY = maxY - minY || 1;
  const pad = 8;
  const size = 100;

  const points = coords
    .map(([lng, lat]) => {
      const x = pad + ((lng - minX) / rangeX) * (size - 2 * pad);
      const y = pad + ((maxY - lat) / rangeY) * (size - 2 * pad);
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <svg viewBox={`0 0 ${size} ${size}`} className="w-full h-full">
      <polygon
        points={points}
        fill={color}
        fillOpacity={0.75}
        stroke={color}
        strokeWidth={1.5}
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function AreaGrid({ areas, categories, subcategories, onEdit, onDelete }: AreaGridProps) {
  if (areas.length === 0) {
    return <p className="text-sm text-muted-foreground">Nenhuma área interna cadastrada.</p>;
  }

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      {areas.map((area) => {
        const category = categories.find((c) => c.id === area.properties.category_id);
        const subcategory = subcategories.find((s) => s.id === area.properties.subcategory_id);
        const color = category?.color ?? "#1e40af";

        return (
          <div key={area.properties.id} className="border border-border rounded-lg overflow-hidden bg-card">
            <div className="aspect-square bg-muted/20 p-3">
              <PolygonPreview geometry={area.geometry} color={color} />
            </div>
            <div className="px-3 py-2 space-y-0.5">
              {category ? (
                <div className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: color }} />
                  <p className="text-sm font-medium truncate">{category.name}</p>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground italic">Sem categoria</p>
              )}
              {subcategory && (
                <p className="text-xs text-muted-foreground truncate pl-4">{subcategory.name}</p>
              )}
              <div className="flex gap-1 pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 h-7 text-xs"
                  onClick={() => onEdit(area.properties.id)}
                >
                  <Pencil className="w-3 h-3 mr-1" />
                  Editar
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  className="flex-1 h-7 text-xs"
                  onClick={() => onDelete(area.properties.id)}
                >
                  <Trash2 className="w-3 h-3 mr-1" />
                  Excluir
                </Button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
