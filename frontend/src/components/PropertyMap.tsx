// frontend/src/components/PropertyMap.tsx
import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { AreaListResponse, Category } from "../types";

interface PropertyMapProps {
  areas: AreaListResponse;
  categories: Category[];
  onAddArea: () => void;
  onAssignCategory: (areaId: string, categoryId: string | null) => void;
  onMapReady?: (map: L.Map) => void;
}

function buildCategoryPopup(
  categories: Category[],
  currentCategoryId: string | null
): HTMLElement {
  const div = document.createElement("div");
  div.style.minWidth = "180px";

  const title = document.createElement("p");
  title.style.cssText = "font-size:13px;font-weight:600;margin:0 0 8px 0;color:#f1f5f9";
  title.textContent = "Atribuir categoria";
  div.appendChild(title);

  if (categories.length === 0) {
    const empty = document.createElement("p");
    empty.style.cssText = "font-size:12px;color:#94a3b8";
    empty.textContent = "Nenhuma categoria cadastrada";
    div.appendChild(empty);
    return div;
  }

  const grid = document.createElement("div");
  grid.style.cssText = "display:grid;grid-template-columns:1fr 1fr;gap:4px;margin-bottom:8px";

  categories.forEach((cat) => {
    const btn = document.createElement("button");
    btn.dataset.catId = cat.id;
    btn.style.cssText = `
      display:flex;align-items:center;gap:6px;padding:5px 8px;
      border-radius:4px;border:1px solid ${cat.id === currentCategoryId ? "#e2e8f0" : "#334155"};
      background:transparent;cursor:pointer;font-size:12px;color:#f1f5f9;
      text-align:left;
    `;
    const swatch = document.createElement("span");
    swatch.style.cssText = `
      width:10px;height:10px;border-radius:50%;
      background:${cat.color};flex-shrink:0;
    `;
    btn.appendChild(swatch);
    btn.appendChild(document.createTextNode(cat.name));
    grid.appendChild(btn);
  });

  div.appendChild(grid);

  if (currentCategoryId) {
    const removeBtn = document.createElement("button");
    removeBtn.dataset.remove = "true";
    removeBtn.style.cssText =
      "font-size:12px;color:#f87171;background:transparent;border:none;cursor:pointer;padding:2px 0;display:block";
    removeBtn.textContent = "Remover categoria";
    div.appendChild(removeBtn);
  }

  return div;
}

export default function PropertyMap({
  areas,
  categories,
  onAddArea,
  onAssignCategory,
  onMapReady,
}: PropertyMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const onAssignCategoryRef = useRef(onAssignCategory);
  const onMapReadyRef = useRef(onMapReady);

  useEffect(() => {
    onAssignCategoryRef.current = onAssignCategory;
  });

  useEffect(() => {
    onMapReadyRef.current = onMapReady;
  });

  // Inicializar mapa
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const map = L.map(containerRef.current).setView([-15, -52], 4);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "© OpenStreetMap contributors",
      crossOrigin: "",
    }).addTo(map);
    mapRef.current = map;
    onMapReadyRef.current?.(map);
    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Atualizar camadas ao mudar áreas ou categorias
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    map.eachLayer((layer) => {
      if (layer instanceof L.GeoJSON) map.removeLayer(layer);
    });

    const bounds: L.LatLngBounds[] = [];

    if (areas.boundary) {
      const layer = L.geoJSON(areas.boundary as GeoJSON.Feature, {
        style: { color: "#4ade80", fillColor: "#2d7a4f", fillOpacity: 0.4, weight: 2 },
      }).addTo(map);
      bounds.push(layer.getBounds());
    }

    areas.internal.forEach((feature) => {
      const areaId = feature.properties.id;
      const categoryColor = feature.properties.category_color;
      const currentCategoryId = feature.properties.category_id;
      const fillColor = categoryColor ?? "#1e40af";
      const strokeColor = categoryColor ?? "#60a5fa";

      const layer = L.geoJSON(feature as GeoJSON.Feature, {
        style: { color: strokeColor, fillColor, fillOpacity: 0.4, weight: 1.5 },
      }).addTo(map);

      layer.on("click", (e: L.LeafletMouseEvent) => {
        const popupEl = buildCategoryPopup(categories, currentCategoryId);

        const popup = L.popup({ minWidth: 200 })
          .setLatLng(e.latlng)
          .setContent(popupEl);

        popup.on("add", () => {
          popupEl.querySelectorAll<HTMLButtonElement>("[data-cat-id]").forEach((btn) => {
            btn.addEventListener("click", () => {
              onAssignCategoryRef.current(areaId, btn.dataset.catId!);
              map.closePopup();
            });
          });
          const removeBtn = popupEl.querySelector<HTMLButtonElement>("[data-remove]");
          removeBtn?.addEventListener("click", () => {
            onAssignCategoryRef.current(areaId, null);
            map.closePopup();
          });
        });

        popup.openOn(map);
      });

      bounds.push(layer.getBounds());
    });

    if (bounds.length > 0) {
      const combined = bounds.reduce((acc, b) => acc.extend(b));
      map.fitBounds(combined, { padding: [20, 20] });
    }
  }, [areas, categories]);

  const isEmpty = !areas.boundary && areas.internal.length === 0;

  return (
    <div className="relative">
      <div
        ref={containerRef}
        data-testid="map-container"
        style={{ aspectRatio: "4/3" }}
        className="w-full rounded-lg overflow-hidden border border-border"
      />
      {isEmpty && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <p className="text-muted-foreground text-sm bg-background/80 px-3 py-1 rounded">
            Nenhuma área cadastrada
          </p>
        </div>
      )}
      <button
        onClick={onAddArea}
        aria-label="Adicionar área"
        className="absolute bottom-3 right-3 z-[400] w-9 h-9 rounded-full bg-blue-600 text-white flex items-center justify-center shadow-lg hover:bg-blue-500 text-xl leading-none"
      >
        +
      </button>
    </div>
  );
}
