import { useCallback, useEffect, useState } from "react";
import { api } from "../lib/api";
import type { Subcategory, SubcategoryCreate, SubcategoryUpdate } from "../types";

export function useSubcategories(propertyId: string) {
  const [subcategories, setSubcategories] = useState<Subcategory[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchSubcategories = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.get<Subcategory[]>(
        `/properties/${propertyId}/subcategories/`
      );
      setSubcategories(data);
    } finally {
      setLoading(false);
    }
  }, [propertyId]);

  useEffect(() => {
    fetchSubcategories();
  }, [fetchSubcategories]);

  const createSubcategory = useCallback(
    async (data: SubcategoryCreate) => {
      const sub = await api.post<Subcategory>(
        `/properties/${propertyId}/subcategories/`,
        data
      );
      await fetchSubcategories();
      return sub;
    },
    [propertyId, fetchSubcategories]
  );

  const updateSubcategory = useCallback(
    async (subId: string, data: SubcategoryUpdate) => {
      const sub = await api.put<Subcategory>(
        `/properties/${propertyId}/subcategories/${subId}`,
        data
      );
      await fetchSubcategories();
      return sub;
    },
    [propertyId, fetchSubcategories]
  );

  const deleteSubcategory = useCallback(
    async (subId: string) => {
      await api.delete(`/properties/${propertyId}/subcategories/${subId}`);
      await fetchSubcategories();
    },
    [propertyId, fetchSubcategories]
  );

  const assignToArea = useCallback(
    async (areaId: string, subcategoryId: string | null) => {
      await api.patch(`/properties/${propertyId}/areas/${areaId}`, {
        subcategory_id: subcategoryId,
      });
    },
    [propertyId]
  );

  return {
    subcategories,
    loading,
    createSubcategory,
    updateSubcategory,
    deleteSubcategory,
    assignToArea,
  };
}
