// frontend/src/hooks/useCategories.tsx
import { useCallback, useEffect, useState } from "react";
import { api } from "../lib/api";
import type { Category, CategoryCreate, CategoryUpdate } from "../types";

export function useCategories(propertyId: string) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchCategories = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.get<Category[]>(
        `/properties/${propertyId}/categories/`
      );
      setCategories(data);
    } finally {
      setLoading(false);
    }
  }, [propertyId]);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  const createCategory = useCallback(
    async (data: CategoryCreate) => {
      const cat = await api.post<Category>(
        `/properties/${propertyId}/categories/`,
        data
      );
      await fetchCategories();
      return cat;
    },
    [propertyId, fetchCategories]
  );

  const updateCategory = useCallback(
    async (catId: string, data: CategoryUpdate) => {
      const cat = await api.put<Category>(
        `/properties/${propertyId}/categories/${catId}`,
        data
      );
      await fetchCategories();
      return cat;
    },
    [propertyId, fetchCategories]
  );

  const deleteCategory = useCallback(
    async (catId: string) => {
      await api.delete(`/properties/${propertyId}/categories/${catId}`);
      await fetchCategories();
    },
    [propertyId, fetchCategories]
  );

  const assignToArea = useCallback(
    async (areaId: string, categoryId: string | null) => {
      await api.patch(`/properties/${propertyId}/areas/${areaId}`, {
        category_id: categoryId,
      });
    },
    [propertyId]
  );

  return {
    categories,
    loading,
    createCategory,
    updateCategory,
    deleteCategory,
    assignToArea,
  };
}
