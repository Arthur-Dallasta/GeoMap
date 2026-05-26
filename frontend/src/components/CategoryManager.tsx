import { useState } from "react";
import { ChevronDown, ChevronRight, Pencil, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import SubcategoryModal from "./CategoryModal";
import type { Category, Subcategory, SubcategoryCreate, SubcategoryUpdate } from "../types";

interface CategoryManagerProps {
  categories: Category[];
  subcategories: Subcategory[];
  onCreateSubcategory: (data: SubcategoryCreate) => Promise<Subcategory>;
  onUpdateSubcategory: (id: string, data: SubcategoryUpdate) => Promise<Subcategory>;
  onDeleteSubcategory: (id: string) => Promise<void>;
}

export default function CategoryManager({
  categories,
  subcategories,
  onCreateSubcategory,
  onUpdateSubcategory,
  onDeleteSubcategory,
}: CategoryManagerProps) {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [modalOpen, setModalOpen] = useState(false);
  const [editingSub, setEditingSub] = useState<Subcategory | null>(null);
  const [activeCategoryId, setActiveCategoryId] = useState<string | null>(null);

  function openCreate(catId: string) {
    setActiveCategoryId(catId);
    setEditingSub(null);
    setModalOpen(true);
  }

  function openEdit(sub: Subcategory) {
    setActiveCategoryId(sub.category_id);
    setEditingSub(sub);
    setModalOpen(true);
  }

  async function handleSave(data: SubcategoryCreate | SubcategoryUpdate) {
    if (editingSub) {
      await onUpdateSubcategory(editingSub.id, data as SubcategoryUpdate);
    } else if (activeCategoryId) {
      await onCreateSubcategory({
        ...(data as SubcategoryCreate),
        category_id: activeCategoryId,
      });
    }
  }

  async function handleDelete(sub: Subcategory) {
    if (!window.confirm(`Excluir subcategoria "${sub.name}"? Áreas associadas perderão a subcategoria.`)) return;
    await onDeleteSubcategory(sub.id);
  }

  function toggleExpand(catId: string) {
    setExpanded((prev) => ({ ...prev, [catId]: !(prev[catId] ?? true) }));
  }

  return (
    <div className="mt-6">
      <h2 className="text-base font-semibold mb-3">Categorias e Subcategorias</h2>

      <div className="space-y-2">
        {categories.map((cat) => {
          const catSubs = subcategories.filter((s) => s.category_id === cat.id);
          const isExpanded = expanded[cat.id] ?? true;

          return (
            <div key={cat.id} className="border border-border rounded-lg overflow-hidden">
              <div
                className="flex items-center gap-3 px-3 py-2.5 cursor-pointer hover:bg-muted/30 transition-colors"
                onClick={() => toggleExpand(cat.id)}
              >
                <span
                  className="w-3 h-3 rounded-full shrink-0"
                  style={{ backgroundColor: cat.color }}
                />
                <span className="text-sm font-semibold flex-1">{cat.name}</span>
                {cat.description && (
                  <span className="text-xs text-muted-foreground hidden sm:block truncate max-w-[160px]">
                    {cat.description}
                  </span>
                )}
                {catSubs.length > 0 && (
                  <span className="text-xs text-muted-foreground">{catSubs.length}</span>
                )}
                {isExpanded
                  ? <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />
                  : <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />}
              </div>

              {isExpanded && (
                <div className="border-t border-border">
                  {catSubs.length === 0 ? (
                    <p className="text-xs text-muted-foreground px-4 py-2.5">
                      Nenhuma subcategoria cadastrada
                    </p>
                  ) : (
                    <ul className="divide-y divide-border">
                      {catSubs.map((sub) => (
                        <li key={sub.id} className="flex items-center gap-3 px-4 py-2">
                          <span
                            className="w-2 h-2 rounded-full shrink-0 opacity-60"
                            style={{ backgroundColor: cat.color }}
                          />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm truncate">{sub.name}</p>
                            {sub.description && (
                              <p className="text-xs text-muted-foreground truncate">
                                {sub.description}
                              </p>
                            )}
                          </div>
                          <div className="flex gap-1 shrink-0">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openEdit(sub)}
                              aria-label={`Editar ${sub.name}`}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDelete(sub)}
                              className="text-destructive hover:text-destructive"
                              aria-label={`Excluir ${sub.name}`}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                  <div className="px-3 py-2 border-t border-border">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openCreate(cat.id)}
                      className="h-7 text-xs gap-1.5"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Nova subcategoria
                    </Button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <SubcategoryModal
        open={modalOpen}
        mode={editingSub ? "edit" : "create"}
        initialValues={
          editingSub
            ? { name: editingSub.name, description: editingSub.description }
            : undefined
        }
        onSave={handleSave}
        onClose={() => setModalOpen(false)}
      />
    </div>
  );
}
