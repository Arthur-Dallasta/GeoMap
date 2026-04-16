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

  it("chama fetchAreas após o upload, independente de categoryId", async () => {
    const { result } = renderHook(() => useAreas("prop-1"));
    const file = new File(["{}"], "area.geojson");
    await act(async () => {
      await result.current.uploadArea(file, "boundary");
    });
    // api.get is called once on mount, once after upload = 2 calls total
    expect(api.get).toHaveBeenCalledTimes(2);
  });
});
