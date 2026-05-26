import { useCallback, useEffect, useState } from "react";
import { api } from "../lib/api";
import type { Category } from "../types";

export function useCategories(propertyId: string) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchCategories = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.get<Category[]>("/categories/");
      setCategories(data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  const assignToArea = useCallback(
    async (areaId: string, categoryId: string | null) => {
      await api.patch(`/properties/${propertyId}/areas/${areaId}`, {
        category_id: categoryId,
      });
    },
    [propertyId]
  );

  return { categories, loading, assignToArea };
}
