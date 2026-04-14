import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { AreaListResponse } from "../types";

interface PropertyMapProps {
  areas: AreaListResponse;
  onAddArea: () => void;
}

export default function PropertyMap({ areas, onAddArea }: PropertyMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);

  // Inicializar mapa
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const map = L.map(containerRef.current).setView([-15, -52], 4);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "© OpenStreetMap contributors",
    }).addTo(map);
    mapRef.current = map;
    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Atualizar camadas ao mudar áreas
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    // Remover camadas GeoJSON existentes
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
      const layer = L.geoJSON(feature as GeoJSON.Feature, {
        style: { color: "#60a5fa", fillColor: "#1e40af", fillOpacity: 0.4, weight: 1.5 },
      }).addTo(map);
      bounds.push(layer.getBounds());
    });

    if (bounds.length > 0) {
      const combined = bounds.reduce((acc, b) => acc.extend(b));
      map.fitBounds(combined, { padding: [20, 20] });
    }
  }, [areas]);

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
