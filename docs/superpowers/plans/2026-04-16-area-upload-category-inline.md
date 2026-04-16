# Area Upload — Categoria Inline Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ao importar um GeoJSON de área interna, o usuário define a categoria (existente ou nova) no próprio modal de upload, e ela é atribuída automaticamente ao polígono criado.

**Architecture:** O `AreaUploadModal` recebe a lista de categorias e um callback `onCreateCategory`. Ao submeter, cria a categoria se necessária, resolve o `categoryId`, e repassa para `onUpload`. O `uploadArea` em `useAreas` recebe o `categoryId` opcional e faz o PATCH de atribuição logo após o upload.

**Tech Stack:** React 19, TypeScript 5, Vitest, @testing-library/react, FastAPI (sem mudanças no backend)

---

## Arquivos modificados

| Arquivo | Ação | Responsabilidade |
|---------|------|-----------------|
| `src/hooks/useAreas.tsx` | Modificar | Aceitar `categoryId?` em `uploadArea` e chamar PATCH após upload |
| `src/components/AreaUploadModal.tsx` | Modificar | Adicionar seção de categoria para áreas internas |
| `src/pages/PropertyDetail.tsx` | Modificar | Passar `categories` e `createCategory` para `AreaUploadModal` |
| `src/tests/AreaUploadModal.test.tsx` | Criar | Testes do comportamento de categoria no modal |

---

## Task 1: Estender `uploadArea` para atribuir categoria

**Files:**
- Modify: `src/hooks/useAreas.tsx`

- [ ] **Step 1: Escrever o teste do hook (unit)**

Crie `src/tests/useAreas.test.tsx` com o seguinte conteúdo:

```tsx
import { renderHook, act } from "@testing-library/react";
import { vi, describe, it, expect, beforeEach } from "vitest";

vi.mock("../lib/api", () => ({
  api: {
    get: vi.fn(),
    upload: vi.fn(),
    patch: vi.fn(),
  },
}));

import { useAreas } from "../hooks/useAreas";
import { api } from "../lib/api";

const mockUploadResult = { id: "area-123", type: "internal", property_id: "prop-1" };
const mockAreas = { boundary: null, internal: [] };

describe("useAreas.uploadArea", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (api.get as ReturnType<typeof vi.fn>).mockResolvedValue(mockAreas);
    (api.upload as ReturnType<typeof vi.fn>).mockResolvedValue(mockUploadResult);
    (api.patch as ReturnType<typeof vi.fn>).mockResolvedValue({});
  });

  it("não chama PATCH quando categoryId não é fornecido", async () => {
    const { result } = renderHook(() => useAreas("prop-1"));
    const file = new File(["{}"], "area.geojson");
    await act(async () => {
      await result.current.uploadArea(file, "boundary");
    });
    expect(api.patch).not.toHaveBeenCalled();
  });

  it("chama PATCH com category_id quando categoryId é fornecido", async () => {
    const { result } = renderHook(() => useAreas("prop-1"));
    const file = new File(["{}"], "area.geojson");
    await act(async () => {
      await result.current.uploadArea(file, "internal", "cat-999");
    });
    expect(api.patch).toHaveBeenCalledWith(
      "/properties/prop-1/areas/area-123",
      { category_id: "cat-999" }
    );
  });
});
```

- [ ] **Step 2: Rodar o teste e confirmar FAIL**

```bash
cd GeoMap/frontend && npx vitest run src/tests/useAreas.test.tsx
```

Esperado: FAIL — `uploadArea` não aceita terceiro argumento ainda.

- [ ] **Step 3: Atualizar `uploadArea` em `src/hooks/useAreas.tsx`**

Substitua a função `uploadArea` (linhas 29-42) por:

```typescript
const uploadArea = useCallback(
  async (file: File, type: "boundary" | "internal", categoryId?: string) => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("type", type);
    const result = await api.upload<AreaUploadResponse>(
      `/properties/${propertyId}/areas/`,
      formData,
    );
    if (categoryId) {
      await api.patch(`/properties/${propertyId}/areas/${result.id}`, {
        category_id: categoryId,
      });
    }
    await fetchAreas();
    return result;
  },
  [propertyId, fetchAreas],
);
```

- [ ] **Step 4: Rodar o teste e confirmar PASS**

```bash
cd GeoMap/frontend && npx vitest run src/tests/useAreas.test.tsx
```

Esperado: PASS (2 testes)

- [ ] **Step 5: Commit**

```bash
cd GeoMap/frontend && git add src/hooks/useAreas.tsx src/tests/useAreas.test.tsx
git commit -m "feat: uploadArea accepts categoryId and assigns it after upload"
```

---

## Task 2: Testes para seção de categoria no `AreaUploadModal`

**Files:**
- Create: `src/tests/AreaUploadModal.test.tsx`

- [ ] **Step 1: Criar `src/tests/AreaUploadModal.test.tsx`**

```tsx
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { vi, describe, it, expect, beforeEach } from "vitest";
import AreaUploadModal from "../components/AreaUploadModal";
import type { Category } from "../types";

const CATEGORIES: Category[] = [
  {
    id: "cat-1",
    property_id: "prop-1",
    name: "Soja",
    color: "#22c55e",
    description: null,
    created_at: "2026-01-01",
  },
  {
    id: "cat-2",
    property_id: "prop-1",
    name: "Pastagem",
    color: "#eab308",
    description: null,
    created_at: "2026-01-01",
  },
];

const NEW_CAT: Category = {
  id: "cat-new",
  property_id: "prop-1",
  name: "Soja Nova",
  color: "#ef4444",
  description: null,
  created_at: "2026-01-01",
};

function makeFile(name = "area.geojson") {
  return new File(['{"type":"FeatureCollection","features":[]}'], name, {
    type: "application/json",
  });
}

function selectFile(file: File) {
  const input = document.querySelector('input[type="file"]') as HTMLInputElement;
  fireEvent.change(input, { target: { files: [file] } });
}

describe("AreaUploadModal — categoria", () => {
  const onClose = vi.fn();
  const onUpload = vi.fn().mockResolvedValue(undefined);
  const onCreateCategory = vi.fn().mockResolvedValue(NEW_CAT);

  const defaultProps = {
    open: true,
    hasBoundary: false,
    categories: CATEGORIES,
    onClose,
    onUpload,
    onCreateCategory,
  };

  beforeEach(() => {
    onClose.mockClear();
    onUpload.mockClear();
    onCreateCategory.mockClear();
  });

  it("não exibe seção de categoria para tipo 'Contorno geral'", () => {
    render(<AreaUploadModal {...defaultProps} />);
    expect(screen.queryByLabelText("Categoria *")).not.toBeInTheDocument();
  });

  it("exibe seção de categoria ao selecionar 'Área interna'", () => {
    render(<AreaUploadModal {...defaultProps} />);
    fireEvent.click(screen.getByText("Área interna"));
    expect(screen.getByLabelText("Categoria *")).toBeInTheDocument();
  });

  it("exibe categorias existentes e opção '+ Nova categoria...' no select", () => {
    render(<AreaUploadModal {...defaultProps} />);
    fireEvent.click(screen.getByText("Área interna"));
    expect(screen.getByRole("option", { name: "Soja" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Pastagem" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "+ Nova categoria..." })).toBeInTheDocument();
  });

  it("botão de upload fica desabilitado com arquivo selecionado mas sem categoria", () => {
    render(<AreaUploadModal {...defaultProps} />);
    fireEvent.click(screen.getByText("Área interna"));
    selectFile(makeFile());
    expect(screen.getByText("Fazer upload")).toBeDisabled();
  });

  it("botão de upload fica habilitado com arquivo + categoria existente selecionada", () => {
    render(<AreaUploadModal {...defaultProps} />);
    fireEvent.click(screen.getByText("Área interna"));
    selectFile(makeFile());
    fireEvent.change(screen.getByRole("combobox"), { target: { value: "cat-1" } });
    expect(screen.getByText("Fazer upload")).not.toBeDisabled();
  });

  it("exibe campos inline ao selecionar '+ Nova categoria...'", () => {
    render(<AreaUploadModal {...defaultProps} />);
    fireEvent.click(screen.getByText("Área interna"));
    fireEvent.change(screen.getByRole("combobox"), { target: { value: "new" } });
    expect(screen.getByPlaceholderText("Ex: Plantio de soja")).toBeInTheDocument();
  });

  it("botão desabilitado quando '+ Nova categoria...' selecionado mas nome vazio", () => {
    render(<AreaUploadModal {...defaultProps} />);
    fireEvent.click(screen.getByText("Área interna"));
    selectFile(makeFile());
    fireEvent.change(screen.getByRole("combobox"), { target: { value: "new" } });
    // nome vazio — ainda desabilitado
    expect(screen.getByText("Fazer upload")).toBeDisabled();
  });

  it("chama onUpload com categoryId ao submeter com categoria existente", async () => {
    render(<AreaUploadModal {...defaultProps} />);
    fireEvent.click(screen.getByText("Área interna"));
    selectFile(makeFile());
    fireEvent.change(screen.getByRole("combobox"), { target: { value: "cat-1" } });
    fireEvent.click(screen.getByText("Fazer upload"));
    await waitFor(() =>
      expect(onUpload).toHaveBeenCalledWith(expect.any(File), "internal", "cat-1")
    );
    expect(onCreateCategory).not.toHaveBeenCalled();
  });

  it("chama onCreateCategory e onUpload com id retornado ao criar nova categoria", async () => {
    render(<AreaUploadModal {...defaultProps} />);
    fireEvent.click(screen.getByText("Área interna"));
    selectFile(makeFile());
    fireEvent.change(screen.getByRole("combobox"), { target: { value: "new" } });
    fireEvent.change(screen.getByPlaceholderText("Ex: Plantio de soja"), {
      target: { value: "Soja Nova" },
    });
    fireEvent.click(screen.getByText("Fazer upload"));
    await waitFor(() =>
      expect(onCreateCategory).toHaveBeenCalledWith(
        expect.objectContaining({ name: "Soja Nova" })
      )
    );
    await waitFor(() =>
      expect(onUpload).toHaveBeenCalledWith(expect.any(File), "internal", "cat-new")
    );
  });

  it("não passa categoryId ao submeter contorno geral", async () => {
    render(<AreaUploadModal {...defaultProps} />);
    // tipo padrão é "boundary"
    selectFile(makeFile());
    fireEvent.click(screen.getByText("Fazer upload"));
    await waitFor(() =>
      expect(onUpload).toHaveBeenCalledWith(expect.any(File), "boundary", undefined)
    );
    expect(onCreateCategory).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Rodar e confirmar FAIL**

```bash
cd GeoMap/frontend && npx vitest run src/tests/AreaUploadModal.test.tsx
```

Esperado: FAIL — props `categories` e `onCreateCategory` não existem ainda.

---

## Task 3: Implementar seção de categoria em `AreaUploadModal`

**Files:**
- Modify: `src/components/AreaUploadModal.tsx`

- [ ] **Step 1: Substituir o conteúdo de `AreaUploadModal.tsx`**

```tsx
import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { Category, CategoryCreate } from "../types";

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
      setError(e instanceof Error ? e.message : "Erro ao fazer upload");
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

        {/* Categoria — apenas para área interna */}
        {areaType === "internal" && (
          <div className="mt-4">
            <label className="text-sm font-medium block mb-1">Categoria *</label>
            <select
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
                  <label className="text-sm font-medium block mb-1">Nome *</label>
                  <input
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
                    {PALETTE.map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setNewCatColor(c)}
                        className={cn(
                          "w-8 h-8 rounded-full transition-transform hover:scale-110",
                          newCatColor === c && "ring-2 ring-offset-2 ring-white scale-110",
                        )}
                        style={{ backgroundColor: c }}
                        aria-label={c}
                      />
                    ))}
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium block mb-1">
                    Descrição (opcional)
                  </label>
                  <textarea
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
```

- [ ] **Step 2: Rodar os testes e confirmar PASS**

```bash
cd GeoMap/frontend && npx vitest run src/tests/AreaUploadModal.test.tsx
```

Esperado: PASS (todos os testes da Task 2)

- [ ] **Step 3: Commit**

```bash
cd GeoMap/frontend && git add src/components/AreaUploadModal.tsx src/tests/AreaUploadModal.test.tsx
git commit -m "feat: categoria inline no modal de import de área interna"
```

---

## Task 4: Atualizar `PropertyDetail` para passar as novas props

**Files:**
- Modify: `src/pages/PropertyDetail.tsx`

- [ ] **Step 1: Atualizar o uso de `AreaUploadModal` em `PropertyDetail.tsx`**

Localize o bloco `<AreaUploadModal ... />` (linhas 118-123) e substitua por:

```tsx
<AreaUploadModal
  open={modalOpen}
  hasBoundary={areas.boundary !== null}
  categories={categories}
  onClose={() => setModalOpen(false)}
  onUpload={uploadArea}
  onCreateCategory={createCategory}
/>
```

- [ ] **Step 2: Rodar toda a suíte para confirmar sem regressões**

```bash
cd GeoMap/frontend && npx vitest run
```

Esperado: todos os testes passam — `useAreas`, `AreaUploadModal`, `PropertyMap`, `MapExportButtons`, `utils`.

- [ ] **Step 3: Commit**

```bash
cd GeoMap/frontend && git add src/pages/PropertyDetail.tsx
git commit -m "feat: wire PropertyDetail to pass categories to AreaUploadModal"
```
