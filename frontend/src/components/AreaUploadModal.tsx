import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface AreaUploadModalProps {
  open: boolean;
  hasBoundary: boolean;
  onClose: () => void;
  onUpload: (file: File, type: "boundary" | "internal") => Promise<void>;
}

export default function AreaUploadModal({
  open,
  hasBoundary,
  onClose,
  onUpload,
}: AreaUploadModalProps) {
  const [areaType, setAreaType] = useState<"boundary" | "internal">("boundary");
  const [file, setFile] = useState<File | null>(null);
  const [dragging, setDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  if (!open) return null;

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
      await onUpload(file, areaType);
      setFile(null);
      setAreaType("boundary");
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao fazer upload");
    } finally {
      setLoading(false);
    }
  }

  function handleClose() {
    setFile(null);
    setError(null);
    setAreaType("boundary");
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-background border border-border rounded-lg p-6 w-full max-w-md shadow-xl">
        <h2 className="text-lg font-semibold mb-4">Adicionar Área</h2>

        {/* Seletor de tipo */}
        <div className="mb-4">
          <p className="text-sm text-muted-foreground mb-2">Tipo de área</p>
          <div className="flex gap-2">
            <button
              onClick={() => setAreaType("boundary")}
              className={cn(
                "px-4 py-2 rounded-md text-sm border transition-colors",
                areaType === "boundary"
                  ? "border-blue-500 bg-blue-950 text-blue-300"
                  : "border-border text-muted-foreground hover:border-blue-500/50",
              )}
            >
              Contorno geral
            </button>
            <button
              onClick={() => setAreaType("internal")}
              className={cn(
                "px-4 py-2 rounded-md text-sm border transition-colors",
                areaType === "internal"
                  ? "border-blue-500 bg-blue-950 text-blue-300"
                  : "border-border text-muted-foreground hover:border-blue-500/50",
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

        {error && <p className="text-sm text-destructive mt-2">{error}</p>}

        {/* Ações */}
        <div className="flex gap-2 justify-end mt-4">
          <Button variant="outline" onClick={handleClose} disabled={loading}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={loading || !file}>
            {loading ? "Enviando..." : "Fazer upload"}
          </Button>
        </div>
      </div>
    </div>
  );
}
