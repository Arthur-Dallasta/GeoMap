import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { Category, Subcategory } from "../types";
import { CategoryAssignmentError } from "../hooks/useAreas";

interface AreaUploadModalProps {
  open: boolean;
  hasBoundary: boolean;
  categories: Category[];
  subcategories: Subcategory[];
  onClose: () => void;
  onUpload: (file: File, type: "boundary" | "internal", categoryId?: string, subcategoryId?: string) => Promise<unknown>;
}

export default function AreaUploadModal({
  open,
  hasBoundary,
  categories,
  subcategories,
  onClose,
  onUpload,
}: AreaUploadModalProps) {
  const [areaType, setAreaType] = useState<"boundary" | "internal">("boundary");
  const [file, setFile] = useState<File | null>(null);
  const [dragging, setDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>("");
  const [selectedSubcategoryId, setSelectedSubcategoryId] = useState<string>("");

  const inputRef = useRef<HTMLInputElement>(null);

  if (!open) return null;

  const categoryReady =
    areaType === "boundary" || selectedCategoryId !== "";

  function handleFile(f: File) {
    const name = f.name.toLowerCase();
    const isGeoJson = name.endsWith(".geojson") || name.endsWith(".json");
    const isZip = name.endsWith(".zip");
    if (!isGeoJson && !(isZip && areaType === "boundary")) {
      setError(
        areaType === "boundary"
          ? "Selecione um arquivo .geojson, .json ou .zip (CAR)"
          : "Selecione um arquivo .geojson ou .json"
      );
      return;
    }
    setFile(f);
    setError(null);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  }

  async function handleSubmit() {
    if (!file) {
      setError("Selecione um arquivo");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const categoryId = areaType === "internal" ? selectedCategoryId : undefined;
      const subcategoryId = areaType === "internal" && selectedSubcategoryId ? selectedSubcategoryId : undefined;
      await onUpload(file, areaType, categoryId, subcategoryId);
      handleClose();
    } catch (e) {
      if (e instanceof CategoryAssignmentError) {
        handleClose();
      } else {
        setError(e instanceof Error ? e.message : "Erro ao fazer upload");
      }
    } finally {
      setLoading(false);
    }
  }

  function handleClose() {
    setFile(null);
    setError(null);
    setAreaType("boundary");
    setSelectedCategoryId("");
    setSelectedSubcategoryId("");
    onClose();
  }

  function handleCategoryChange(catId: string) {
    setSelectedCategoryId(catId);
    setSelectedSubcategoryId("");
  }

  return (
    <div className="fixed inset-0 z-[1001] flex items-center justify-center bg-black/50">
      <div className="bg-background border border-border rounded-lg p-6 w-full max-w-md shadow-xl">
        <h2 className="text-lg font-semibold mb-4">Adicionar Área</h2>

        {/* Seletor de tipo */}
        <div className="mb-4">
          <p className="text-sm text-muted-foreground mb-2">Tipo de área</p>
          <div className="flex gap-2">
            <button
              onClick={() => setAreaType("boundary")}
              className={cn(
                "px-4 py-2 rounded-md text-sm border transition-colors cursor-pointer",
                areaType === "boundary"
                  ? "border-primary bg-primary/15 text-primary"
                  : "border-border text-muted-foreground hover:border-primary/50",
              )}
            >
              Contorno geral
            </button>
            <button
              onClick={() => setAreaType("internal")}
              className={cn(
                "px-4 py-2 rounded-md text-sm border transition-colors cursor-pointer",
                areaType === "internal"
                  ? "border-primary bg-primary/15 text-primary"
                  : "border-border text-muted-foreground hover:border-primary/50",
              )}
            >
              Área interna
            </button>
          </div>
          {areaType === "boundary" && hasBoundary && (
            <p className="text-xs text-yellow-500 mt-2">
              ⚠️ Isso substituirá o contorno atual da propriedade.
            </p>
          )}
        </div>

        {/* Drop zone */}
        <div
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          onClick={() => inputRef.current?.click()}
          className={cn(
            "border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors",
            dragging ? "border-blue-500 bg-blue-950/30" : "border-border hover:border-blue-500/50",
          )}
        >
          <input
            ref={inputRef}
            type="file"
            accept={areaType === "boundary" ? ".geojson,.json,.zip" : ".geojson,.json"}
            className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
          />
          {file ? (
            <p className="text-sm text-blue-300">{file.name}</p>
          ) : (
            <p className="text-sm text-muted-foreground">
              {areaType === "boundary" ? (
                <>Arraste <strong>.geojson</strong> ou <strong>.zip</strong> (CAR) ou{" "}</>
              ) : (
                <>Arraste um arquivo <strong>.geojson</strong> ou{" "}</>
              )}
              <span className="text-blue-400">clique para selecionar</span>
            </p>
          )}
        </div>

        {/* Categoria e Subcategoria — apenas para área interna */}
        {areaType === "internal" && (
          <div className="mt-4 space-y-3">
            <div>
              <label htmlFor="category-select" className="text-sm font-medium block mb-1">
                Categoria *
              </label>
              <select
                id="category-select"
                value={selectedCategoryId}
                onChange={(e) => handleCategoryChange(e.target.value)}
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Selecione uma categoria...</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>

            {selectedCategoryId && (() => {
              const relevant = subcategories.filter((s) => s.category_id === selectedCategoryId);
              if (relevant.length === 0) return null;
              return (
                <div>
                  <label htmlFor="subcategory-select" className="text-sm font-medium block mb-1">
                    Subcategoria <span className="text-muted-foreground font-normal">(opcional)</span>
                  </label>
                  <select
                    id="subcategory-select"
                    value={selectedSubcategoryId}
                    onChange={(e) => setSelectedSubcategoryId(e.target.value)}
                    className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Nenhuma subcategoria</option>
                    {relevant.map((sub) => (
                      <option key={sub.id} value={sub.id}>
                        {sub.name}
                      </option>
                    ))}
                  </select>
                </div>
              );
            })()}
          </div>
        )}

        {error && <p className="text-sm text-destructive mt-2">{error}</p>}

        {/* Ações */}
        <div className="flex gap-2 justify-end mt-4">
          <Button variant="outline" onClick={handleClose} disabled={loading}>
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={loading || !file || !categoryReady}
          >
            {loading ? "Enviando..." : "Fazer upload"}
          </Button>
        </div>
      </div>
    </div>
  );
}
