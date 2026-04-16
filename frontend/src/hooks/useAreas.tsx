import { useCallback, useEffect, useState } from "react";
import { api } from "../lib/api";
import type { AreaListResponse, AreaUploadResponse } from "../types";

const EMPTY_AREAS: AreaListResponse = { boundary: null, internal: [] };

export function useAreas(propertyId: string) {
  const [areas, setAreas] = useState<AreaListResponse>(EMPTY_AREAS);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAreas = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.get<AreaListResponse>(`/properties/${propertyId}/areas/`);
      setAreas(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao carregar áreas");
    } finally {
      setLoading(false);
    }
  }, [propertyId]);

  useEffect(() => {
    fetchAreas();
  }, [fetchAreas]);

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

  const deleteArea = useCallback(
    async (areaId: string) => {
      await api.delete(`/properties/${propertyId}/areas/${areaId}`);
      await fetchAreas();
    },
    [propertyId, fetchAreas],
  );

  return { areas, loading, error, uploadArea, deleteArea, refetch: fetchAreas };
}
