import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import type { SubcategoryCreate, SubcategoryUpdate } from "../types";

interface SubcategoryModalProps {
  open: boolean;
  mode: "create" | "edit";
  initialValues?: { name: string; description: string | null };
  onSave: (data: SubcategoryCreate | SubcategoryUpdate) => Promise<void>;
  onClose: () => void;
}

export default function SubcategoryModal({
  open,
  mode,
  initialValues,
  onSave,
  onClose,
}: SubcategoryModalProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setName(initialValues?.name ?? "");
      setDescription(initialValues?.description ?? "");
      setError(null);
    }
  }, [open]);

  if (!open) return null;

  async function handleSave() {
    if (!name.trim()) {
      setError("Nome é obrigatório");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await onSave({ name: name.trim(), description: description.trim() || null });
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao salvar");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[1002] flex items-center justify-center bg-black/50">
      <div className="bg-background border border-border rounded-lg p-6 w-full max-w-sm shadow-xl">
        <h2 className="text-base font-semibold mb-4">
          {mode === "create" ? "Nova subcategoria" : "Editar subcategoria"}
        </h2>

        <div className="mb-4">
          <label htmlFor="sub-name" className="text-sm font-medium block mb-1">
            Nome *
          </label>
          <input
            id="sub-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ex: Casa"
            className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="mb-4">
          <label htmlFor="sub-desc" className="text-sm font-medium block mb-1">
            Descrição (opcional)
          </label>
          <textarea
            id="sub-desc"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Ex: Residência principal da propriedade"
            rows={2}
            className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
          />
        </div>

        {error && <p className="text-sm text-destructive mb-3">{error}</p>}

        <div className="flex gap-2 justify-end">
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={loading || !name.trim()}>
            {loading ? "Salvando..." : "Salvar"}
          </Button>
        </div>
      </div>
    </div>
  );
}
