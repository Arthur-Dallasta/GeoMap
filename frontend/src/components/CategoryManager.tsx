// frontend/src/components/CategoryManager.tsx
import { useState } from "react";
import { Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import CategoryModal from "./CategoryModal";
import type { Category, CategoryCreate, CategoryUpdate } from "../types";

interface CategoryManagerProps {
  categories: Category[];
  onCreateCategory: (data: CategoryCreate) => Promise<void>;
  onUpdateCategory: (id: string, data: CategoryUpdate) => Promise<void>;
  onDeleteCategory: (id: string) => Promise<void>;
}

export default function CategoryManager({
  categories,
  onCreateCategory,
  onUpdateCategory,
  onDeleteCategory,
}: CategoryManagerProps) {
  const [modalOpen, setModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);

  function openCreate() {
    setEditingCategory(null);
    setModalOpen(true);
  }

  function openEdit(cat: Category) {
    setEditingCategory(cat);
    setModalOpen(true);
  }

  async function handleSave(data: CategoryCreate | CategoryUpdate) {
    if (editingCategory) {
      await onUpdateCategory(editingCategory.id, data as CategoryUpdate);
    } else {
      await onCreateCategory(data as CategoryCreate);
    }
  }

  async function handleDelete(cat: Category) {
    if (!window.confirm(`Excluir categoria "${cat.name}"? As áreas associadas voltarão para a cor padrão.`)) return;
    await onDeleteCategory(cat.id);
  }

  return (
    <div className="mt-6">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-base font-semibold">Categorias</h2>
        <Button size="sm" onClick={openCreate}>
          Nova categoria
        </Button>
      </div>

      {categories.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nenhuma categoria cadastrada</p>
      ) : (
        <ul className="space-y-2">
          {categories.map((cat) => (
            <li
              key={cat.id}
              className="flex items-center gap-3 rounded-lg border border-border px-3 py-2"
            >
              <span
                className="w-4 h-4 rounded-full shrink-0"
                style={{ backgroundColor: cat.color }}
              />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{cat.name}</p>
                {cat.description && (
                  <p className="text-xs text-muted-foreground truncate">{cat.description}</p>
                )}
              </div>
              <div className="flex gap-1 shrink-0">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => openEdit(cat)}
                  aria-label={`Editar ${cat.name}`}
                >
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDelete(cat)}
                  aria-label={`Excluir ${cat.name}`}
                  className="text-destructive hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <CategoryModal
        open={modalOpen}
        mode={editingCategory ? "edit" : "create"}
        initialValues={
          editingCategory
            ? {
                name: editingCategory.name,
                color: editingCategory.color,
                description: editingCategory.description,
              }
            : undefined
        }
        onSave={handleSave}
        onClose={() => setModalOpen(false)}
      />
    </div>
  );
}
