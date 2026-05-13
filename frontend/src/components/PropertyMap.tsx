// frontend/src/components/PropertyMap.tsx
import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { LocateFixed } from "lucide-react";
import type { AreaFeature, AreaListResponse } from "../types";

interface PropertyMapProps {
  areas: AreaListResponse;
  onAddArea: () => void;
  onAreaClick: (area: AreaFeature) => void;
  onMapReady?: (map: L.Map) => void;
}

function calcLabelFontSize(zoom: number): number {
  // Hide below zoom 11; scale from 8px to 16px above that
  if (zoom < 11) return 0;
  return Math.max(8, Math.min(16, zoom - 2));
}

function applyLabelFontSizes(zoom: number) {
  const fontSize = calcLabelFontSize(zoom);
  document.querySelectorAll<HTMLElement>(".area-label").forEach((el) => {
    el.style.fontSize = `${fontSize}px`;
  });
}

export default function PropertyMap({
  areas,
  onAddArea,
  onAreaClick,
  onMapReady,
}: PropertyMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const boundsRef = useRef<L.LatLngBounds | null>(null);
  const onAreaClickRef = useRef(onAreaClick);
  const onMapReadyRef = useRef(onMapReady);

  useEffect(() => {
    onAreaClickRef.current = onAreaClick;
  });

  useEffect(() => {
    onMapReadyRef.current = onMapReady;
  });

  // Inicializar mapa
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const map = L.map(containerRef.current, { attributionControl: false }).setView([-15, -52], 4);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "© OpenStreetMap contributors",
      crossOrigin: "",
    }).addTo(map);
    mapRef.current = map;
    onMapReadyRef.current?.(map);

    map.on("zoomend", () => applyLabelFontSizes(map.getZoom()));

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Atualizar camadas ao mudar áreas
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    map.eachLayer((layer) => {
      if (layer instanceof L.GeoJSON) map.removeLayer(layer);
    });

    const bounds: L.LatLngBounds[] = [];

    if (areas.boundary) {
      const boundaryFeature = areas.boundary;
      const layer = L.geoJSON(boundaryFeature as GeoJSON.Feature, {
        style: { color: "#4ade80", fillColor: "#2d7a4f", fillOpacity: 0.4, weight: 2 },
      }).addTo(map);
      layer.on("click", () => onAreaClickRef.current(boundaryFeature));
      bounds.push(layer.getBounds());
    }

    areas.internal.forEach((feature) => {
      const categoryColor = feature.properties.category_color;
      const categoryName = feature.properties.category_name;
      const fillColor = categoryColor ?? "#1e40af";
      const strokeColor = categoryColor ?? "#60a5fa";

      const layer = L.geoJSON(feature as GeoJSON.Feature, {
        style: { color: strokeColor, fillColor, fillOpacity: 0.4, weight: 1.5 },
      }).addTo(map);

      layer.on("click", () => onAreaClickRef.current(feature));
      bounds.push(layer.getBounds());

      if (categoryName) {
        layer.bindTooltip(categoryName, {
          permanent: true,
          direction: "center",
          className: "area-label",
        });
      }
    });

    if (bounds.length > 0) {
      const combined = bounds.reduce((acc, b) => acc.extend(b));
      boundsRef.current = combined;
      map.fitBounds(combined, { padding: [20, 20] });
    }

    setTimeout(() => applyLabelFontSizes(map.getZoom()), 0);
  }, [areas]);

  const isEmpty = !areas.boundary && areas.internal.length === 0;

  function handleRecenter() {
    if (mapRef.current && boundsRef.current) {
      mapRef.current.fitBounds(boundsRef.current, { padding: [20, 20] });
    }
  }

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
      <div className="absolute bottom-3 right-3 z-[400] flex flex-col gap-2">
        {!isEmpty && (
          <button
            onClick={handleRecenter}
            aria-label="Centralizar mapa"
            className="w-12 h-12 rounded-full bg-background/90 text-foreground border border-border flex items-center justify-center shadow hover:bg-background cursor-pointer transition-colors"
          >
            <LocateFixed className="w-4 h-4" />
          </button>
        )}
        <button
          onClick={onAddArea}
          aria-label="Adicionar área"
          className="w-12 h-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-lg hover:bg-primary/80 text-2xl leading-none cursor-pointer transition-colors"
        >
          +
        </button>
      </div>
    </div>
  );
}
