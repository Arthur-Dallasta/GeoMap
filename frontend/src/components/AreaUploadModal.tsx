import { useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { Category, CategoryCreate } from "../types";
import { CategoryAssignmentError } from "../hooks/useAreas";

const PALETTE = [
  "#ef4444", "#f97316", "#eab308", "#22c55e",
  "#14b8a6", "#3b82f6", "#6366f1", "#a855f7",
  "#ec4899", "#f43f5e", "#84cc16", "#06b6d4",
];

interface AreaUploadModalProps {
  open: boolean;
  hasBoundary: boolean;
  categories: Category[];
  onClose: () => void;
  onUpload: (file: File, type: "boundary" | "internal", categoryId?: string) => Promise<void>;
  onCreateCategory: (data: CategoryCreate) => Promise<Category>;
}

export default function AreaUploadModal({
  open,
  hasBoundary,
  categories,
  onClose,
  onUpload,
  onCreateCategory,
}: AreaUploadModalProps) {
  const [areaType, setAreaType] = useState<"boundary" | "internal">("boundary");
  const [file, setFile] = useState<File | null>(null);
  const [dragging, setDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [selectedCategoryId, setSelectedCategoryId] = useState<string>("");
  const [newCatName, setNewCatName] = useState("");
  const [newCatColor, setNewCatColor] = useState(PALETTE[0]);
  const [newCatDescription, setNewCatDescription] = useState("");

  const inputRef = useRef<HTMLInputElement>(null);

  if (!open) return null;

  const isNewCategory = selectedCategoryId === "new";

  const categoryReady =
    areaType === "boundary" ||
    (selectedCategoryId !== "" &&
      (selectedCategoryId !== "new" || newCatName.trim() !== ""));

  function handleFile(f: File) {
    if (!f.name.endsWith(".geojson") && !f.name.endsWith(".json")) {
      setError("Selecione um arquivo .geojson ou .json");
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
      let categoryId: string | undefined;
      if (areaType === "internal") {
        if (isNewCategory) {
          const cat = await onCreateCategory({
            name: newCatName.trim(),
            color: newCatColor,
            description: newCatDescription.trim() || null,
          });
          categoryId = cat.id;
        } else {
          categoryId = selectedCategoryId;
        }
      }
      await onUpload(file, areaType, categoryId);
      handleClose();
    } catch (e) {
      if (e instanceof CategoryAssignmentError) {
        toast.warning(e.message);
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
    setNewCatName("");
    setNewCatColor(PALETTE[0]);
    setNewCatDescription("");
    onClose();
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
            accept=".geojson,.json"
            className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
          />
          {file ? (
            <p className="text-sm text-blue-300">{file.name}</p>
          ) : (
            <p className="text-sm text-muted-foreground">
              Arraste um arquivo <strong>.geojson</strong> ou{" "}
              <span className="text-blue-400">clique para selecionar</span>
            </p>
          )}
        </div>

        {/* Categoria — apenas para área interna */}
        {areaType === "internal" && (
          <div className="mt-4">
            <label htmlFor="category-select" className="text-sm font-medium block mb-1">Categoria *</label>
            <select
              id="category-select"
              value={selectedCategoryId}
              onChange={(e) => setSelectedCategoryId(e.target.value)}
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Selecione uma categoria...</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
              <option value="new">+ Nova categoria...</option>
            </select>

            {isNewCategory && (
              <div className="mt-3 space-y-3 border border-border rounded-md p-3">
                <div>
                  <label htmlFor="new-cat-name" className="text-sm font-medium block mb-1">Nome *</label>
                  <input
                    id="new-cat-name"
                    type="text"
                    value={newCatName}
                    onChange={(e) => setNewCatName(e.target.value)}
                    placeholder="Ex: Plantio de soja"
                    className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium block mb-2">Cor</label>
                  <div className="grid grid-cols-6 gap-2">
                    {PALETTE.map((c, index) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setNewCatColor(c)}
                        className={cn(
                          "w-8 h-8 rounded-full transition-all hover:scale-110 cursor-pointer relative flex items-center justify-center",
                          newCatColor === c && "ring-2 ring-offset-2 ring-gray-800 dark:ring-white scale-110",
                        )}
                        style={{ backgroundColor: c }}
                        title={c}
                        aria-label={`Cor ${index + 1}`}
                      >
                        {newCatColor === c && (
                          <svg className="w-4 h-4 text-white drop-shadow" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label htmlFor="new-cat-description" className="text-sm font-medium block mb-1">
                    Descrição (opcional)
                  </label>
                  <textarea
                    id="new-cat-description"
                    value={newCatDescription}
                    onChange={(e) => setNewCatDescription(e.target.value)}
                    placeholder="Ex: Área destinada ao cultivo de soja"
                    rows={2}
                    className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  />
                </div>
              </div>
            )}
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
