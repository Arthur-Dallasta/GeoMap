# Phase 4: Map Export (PNG + PDF) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Allow producers to export the interactive property map (with colored category areas) as a PNG image or PDF document.

**Architecture:** Pure client-side export using `leaflet-image` to capture the Leaflet map canvas and `jsPDF` to wrap the PNG in a PDF. `PropertyMap` gains an `onMapReady` prop that exposes the Leaflet map instance to its parent. A new `MapExportButtons` component sits below the map in `PropertyDetail`. The tile layer gets `crossOrigin: ""` so the canvas isn't tainted by CORS and can be exported.

**Tech Stack:** leaflet-image 0.4.x (canvas capture), jsPDF 2.x (PDF generation), Leaflet 1.9.x, React 19, TypeScript 5, Vitest + Testing Library

---

## File Map

**New frontend files:**
- `frontend/src/components/MapExportButtons.tsx` — PNG/PDF export buttons using leaflet-image + jsPDF
- `frontend/src/types/leaflet-image.d.ts` — TypeScript declaration for leaflet-image (no bundled types)
- `frontend/src/tests/MapExportButtons.test.tsx` — 4 test cases

**Modified frontend files:**
- `frontend/vite.config.ts` — add `optimizeDeps.include: ['leaflet-image']` for CJS compat
- `frontend/src/components/PropertyMap.tsx` — add `crossOrigin: ""` to tile layer; add `onMapReady` prop
- `frontend/src/tests/PropertyMap.test.tsx` — add 1 test for `onMapReady` callback
- `frontend/src/pages/PropertyDetail.tsx` — add `mapInstance` state + wire `MapExportButtons`

---

## Task 1: Install dependencies + Vite config + type declaration

**Files:**
- Modify: `frontend/vite.config.ts`
- Create: `frontend/src/types/leaflet-image.d.ts`

- [ ] **Step 1: Install leaflet-image and jsPDF**

Run from `frontend/`:
```bash
npm install leaflet-image jspdf
```

Expected output: both added to `dependencies` in `package.json`.

- [ ] **Step 2: Add `optimizeDeps` to `vite.config.ts`**

`leaflet-image` is a CommonJS module. Without this, Vite may fail to pre-bundle it.

Replace the full content of `frontend/vite.config.ts`:

```typescript
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  optimizeDeps: {
    include: ["leaflet-image"],
  },
  server: { port: 5173 },
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: ["./src/test-setup.ts"],
  },
});
```

- [ ] **Step 3: Create the type declaration for leaflet-image**

Create `frontend/src/types/leaflet-image.d.ts`:

```typescript
// frontend/src/types/leaflet-image.d.ts
import type L from "leaflet";

declare module "leaflet-image" {
  function leafletImage(
    map: L.Map,
    callback: (err: Error | null, canvas: HTMLCanvasElement) => void
  ): void;
  export default leafletImage;
}
```

- [ ] **Step 4: Commit**

```bash
git add frontend/package.json frontend/package-lock.json frontend/vite.config.ts frontend/src/types/leaflet-image.d.ts
git commit -m "feat: install leaflet-image + jsPDF; add Vite optimizeDeps + type declaration"
```

---

## Task 2: Update `PropertyMap` — `crossOrigin` + `onMapReady` prop

**Files:**
- Modify: `frontend/src/components/PropertyMap.tsx`
- Modify: `frontend/src/tests/PropertyMap.test.tsx`

Without `crossOrigin: ""` on the tile layer the HTML5 canvas becomes "tainted" by CORS and `canvas.toDataURL()` throws a `SecurityError`. The `onMapReady` prop lets the parent hold a reference to the Leaflet map instance needed by the export logic.

- [ ] **Step 1: Write the failing test**

Add to the `describe("PropertyMap")` block in `frontend/src/tests/PropertyMap.test.tsx` (before the closing `}`):

```typescript
it("chama onMapReady com a instância do mapa ao montar", () => {
  const onMapReady = vi.fn();
  render(
    <PropertyMap
      areas={EMPTY_AREAS}
      categories={[]}
      onAddArea={vi.fn()}
      onAssignCategory={vi.fn()}
      onMapReady={onMapReady}
    />
  );
  expect(onMapReady).toHaveBeenCalledTimes(1);
  expect(onMapReady).toHaveBeenCalledWith(
    expect.objectContaining({ setView: expect.any(Function) })
  );
});
```

- [ ] **Step 2: Run the test to confirm it fails**

```bash
cd frontend && npx vitest run src/tests/PropertyMap.test.tsx
```

Expected: `TypeError` — `onMapReady` prop not accepted / called zero times.

- [ ] **Step 3: Update `PropertyMap.tsx`**

Replace the full content of `frontend/src/components/PropertyMap.tsx`:

```tsx
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
```

- [ ] **Step 4: Run tests to confirm 7 pass**

```bash
cd frontend && npx vitest run src/tests/PropertyMap.test.tsx
```

Expected: `7 passed`

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/PropertyMap.tsx frontend/src/tests/PropertyMap.test.tsx
git commit -m "feat: PropertyMap exposes onMapReady prop; tile layer sets crossOrigin for canvas export"
```

---

## Task 3: `MapExportButtons` component + tests

**Files:**
- Create: `frontend/src/components/MapExportButtons.tsx`
- Create: `frontend/src/tests/MapExportButtons.test.tsx`

- [ ] **Step 1: Write the test file**

Create `frontend/src/tests/MapExportButtons.test.tsx`:

```tsx
// frontend/src/tests/MapExportButtons.test.tsx
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { vi, describe, it, expect, beforeEach } from "vitest";
import type L from "leaflet";

// Mock leaflet-image — canvas capture doesn't work in jsdom
vi.mock("leaflet-image", () => ({
  default: vi.fn((_map: unknown, callback: (err: null, canvas: HTMLCanvasElement) => void) => {
    const canvas = document.createElement("canvas");
    canvas.width = 800;
    canvas.height = 600;
    canvas.toDataURL = vi.fn().mockReturnValue("data:image/png;base64,abc123");
    callback(null, canvas);
  }),
}));

// Mock jsPDF
const mockSave = vi.fn();
const mockAddImage = vi.fn();
vi.mock("jspdf", () => ({
  jsPDF: vi.fn().mockImplementation(() => ({
    addImage: mockAddImage,
    save: mockSave,
    internal: {
      pageSize: { getWidth: () => 297, getHeight: () => 210 },
    },
  })),
}));

import MapExportButtons from "../components/MapExportButtons";

const fakeMap = { _leaflet_id: 1 } as unknown as L.Map;

describe("MapExportButtons", () => {
  beforeEach(() => {
    mockSave.mockClear();
    mockAddImage.mockClear();
  });

  it("renderiza botões de exportação PNG e PDF", () => {
    render(<MapExportButtons mapInstance={fakeMap} propertyName="Fazenda Teste" />);
    expect(screen.getByText("Exportar PNG")).toBeInTheDocument();
    expect(screen.getByText("Exportar PDF")).toBeInTheDocument();
  });

  it("botões ficam desabilitados quando mapInstance é null", () => {
    render(<MapExportButtons mapInstance={null} propertyName="Fazenda Teste" />);
    expect(screen.getByText("Exportar PNG")).toBeDisabled();
    expect(screen.getByText("Exportar PDF")).toBeDisabled();
  });

  it("exportar PNG aciona download com nome correto", async () => {
    const clickSpy = vi
      .spyOn(HTMLAnchorElement.prototype, "click")
      .mockImplementation(() => {});
    render(<MapExportButtons mapInstance={fakeMap} propertyName="Fazenda Teste" />);
    fireEvent.click(screen.getByText("Exportar PNG"));
    await waitFor(() => expect(clickSpy).toHaveBeenCalledTimes(1));
    clickSpy.mockRestore();
  });

  it("exportar PDF chama pdf.save com nome correto", async () => {
    render(<MapExportButtons mapInstance={fakeMap} propertyName="Fazenda Teste" />);
    fireEvent.click(screen.getByText("Exportar PDF"));
    await waitFor(() =>
      expect(mockSave).toHaveBeenCalledWith("Fazenda Teste-mapa.pdf")
    );
  });
});
```

- [ ] **Step 2: Run to confirm all 4 tests fail**

```bash
cd frontend && npx vitest run src/tests/MapExportButtons.test.tsx
```

Expected: `ERROR` — `Cannot find module '../components/MapExportButtons'`

- [ ] **Step 3: Write the component**

Create `frontend/src/components/MapExportButtons.tsx`:

```tsx
// frontend/src/components/MapExportButtons.tsx
import { useState } from "react";
import L from "leaflet";
import leafletImage from "leaflet-image";
import { jsPDF } from "jspdf";
import { Button } from "@/components/ui/button";

interface MapExportButtonsProps {
  mapInstance: L.Map | null;
  propertyName: string;
}

function getCanvas(map: L.Map): Promise<HTMLCanvasElement> {
  return new Promise((resolve, reject) => {
    leafletImage(map, (err, canvas) => {
      if (err) reject(err);
      else resolve(canvas);
    });
  });
}

export default function MapExportButtons({
  mapInstance,
  propertyName,
}: MapExportButtonsProps) {
  const [exporting, setExporting] = useState(false);

  async function exportPng() {
    if (!mapInstance) return;
    setExporting(true);
    try {
      const canvas = await getCanvas(mapInstance);
      const dataUrl = canvas.toDataURL("image/png");
      const link = document.createElement("a");
      link.download = `${propertyName}-mapa.png`;
      link.href = dataUrl;
      link.click();
    } finally {
      setExporting(false);
    }
  }

  async function exportPdf() {
    if (!mapInstance) return;
    setExporting(true);
    try {
      const canvas = await getCanvas(mapInstance);
      const dataUrl = canvas.toDataURL("image/png");
      const w = canvas.width;
      const h = canvas.height;
      const orientation = w >= h ? "landscape" : "portrait";
      const pdf = new jsPDF({ orientation, unit: "px", format: [w, h] });
      pdf.addImage(dataUrl, "PNG", 0, 0, w, h);
      pdf.save(`${propertyName}-mapa.pdf`);
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className="flex gap-2 mt-3">
      <Button
        variant="outline"
        size="sm"
        onClick={exportPng}
        disabled={exporting || !mapInstance}
      >
        {exporting ? "Exportando..." : "Exportar PNG"}
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={exportPdf}
        disabled={exporting || !mapInstance}
      >
        {exporting ? "Exportando..." : "Exportar PDF"}
      </Button>
    </div>
  );
}
```

- [ ] **Step 4: Run tests to confirm 4 pass**

```bash
cd frontend && npx vitest run src/tests/MapExportButtons.test.tsx
```

Expected: `4 passed`

- [ ] **Step 5: Run full test suite**

```bash
cd frontend && npx vitest run
```

Expected: all tests pass (7 PropertyMap + 4 MapExportButtons + any other existing tests)

- [ ] **Step 6: Commit**

```bash
git add frontend/src/components/MapExportButtons.tsx frontend/src/tests/MapExportButtons.test.tsx
git commit -m "feat: MapExportButtons component — PNG and PDF export via leaflet-image + jsPDF"
```

---

## Task 4: Wire `MapExportButtons` into `PropertyDetail`

**Files:**
- Modify: `frontend/src/pages/PropertyDetail.tsx`

- [ ] **Step 1: Update `PropertyDetail.tsx`**

Replace the full content of `frontend/src/pages/PropertyDetail.tsx`:

```tsx
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
          onClose={() => setModalOpen(false)}
          onUpload={uploadArea}
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
```

- [ ] **Step 2: Run full test suite**

```bash
cd frontend && npx vitest run
```

Expected: all tests pass.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/pages/PropertyDetail.tsx
git commit -m "feat: PropertyDetail wires MapExportButtons below the map"
```

---

## Final verification

- [ ] **Start the dev server and smoke-test export**

```bash
cd frontend && npm run dev
```

Open a property with at least one uploaded area. Then:
1. Wait for the map to fully load tiles
2. Click "Exportar PNG" — browser downloads `<property-name>-mapa.png` containing the colored map
3. Click "Exportar PDF" — browser downloads `<property-name>-mapa.pdf` with the map embedded

> **Note:** If tiles appear blank in the export, it means they haven't finished loading. Wait until tiles are fully rendered before exporting.

- [ ] **Run full test suite one final time**

```bash
cd frontend && npx vitest run
```

Expected: all tests pass (7 PropertyMap + 4 MapExportButtons + other existing tests)
