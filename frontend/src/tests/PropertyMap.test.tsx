import { render, screen, fireEvent } from "@testing-library/react";
import { vi, describe, it, expect, beforeEach } from "vitest";
import type { AreaListResponse } from "../types";

// Mock completo do leaflet — não funciona em jsdom
// IMPORTANT: mockLayer/mockMap must be defined INSIDE the factory
// because vi.mock is hoisted before variable declarations in the module.
vi.mock("leaflet", () => {
  const mockLayer = {
    addTo: vi.fn().mockReturnThis(),
    getBounds: vi.fn().mockReturnValue({ extend: vi.fn().mockReturnThis() }),
    on: vi.fn(),
  };
  const mockMap = {
    setView: vi.fn().mockReturnThis(),
    remove: vi.fn(),
    eachLayer: vi.fn((_cb: (l: unknown) => void) => {}),
    fitBounds: vi.fn(),
    closePopup: vi.fn(),
  };
  return {
    default: {
      map: vi.fn().mockReturnValue(mockMap),
      tileLayer: vi.fn().mockReturnValue({ addTo: vi.fn() }),
      geoJSON: vi.fn().mockReturnValue(mockLayer),
      GeoJSON: class {},
      popup: vi.fn().mockReturnValue({
        setLatLng: vi.fn().mockReturnThis(),
        setContent: vi.fn().mockReturnThis(),
        on: vi.fn(),
        openOn: vi.fn(),
      }),
    },
  };
});

import L from "leaflet";
import PropertyMap from "../components/PropertyMap";

const EMPTY_AREAS: AreaListResponse = { boundary: null, internal: [] };

const AREAS_WITH_BOUNDARY: AreaListResponse = {
  boundary: {
    type: "Feature",
    geometry: {
      type: "Polygon",
      coordinates: [[[-47.9, -21.2], [-47.8, -21.2], [-47.8, -21.1], [-47.9, -21.1], [-47.9, -21.2]]],
    },
    properties: { id: "b1", type: "boundary", category_id: null, category_color: null },
  },
  internal: [],
};

const AREAS_WITH_INTERNAL: AreaListResponse = {
  boundary: null,
  internal: [
    {
      type: "Feature",
      geometry: {
        type: "Polygon",
        coordinates: [[[-47.9, -21.2], [-47.8, -21.2], [-47.8, -21.1], [-47.9, -21.1], [-47.9, -21.2]]],
      },
      properties: { id: "i1", type: "internal", category_id: null, category_color: null },
    },
  ],
};

const AREAS_WITH_CATEGORY: AreaListResponse = {
  boundary: null,
  internal: [
    {
      type: "Feature",
      geometry: {
        type: "Polygon",
        coordinates: [[[-47.9, -21.2], [-47.8, -21.2], [-47.8, -21.1], [-47.9, -21.1], [-47.9, -21.2]]],
      },
      properties: { id: "i2", type: "internal", category_id: "cat-1", category_color: "#ef4444" },
    },
  ],
};

describe("PropertyMap", () => {
  const onAddArea = vi.fn();
  const onAreaClick = vi.fn();

  beforeEach(() => {
    onAddArea.mockClear();
    onAreaClick.mockClear();
    (L.geoJSON as ReturnType<typeof vi.fn>).mockClear();
  });

  it("renderiza o container do mapa", () => {
    render(<PropertyMap areas={EMPTY_AREAS} onAddArea={onAddArea} onAreaClick={onAreaClick} />);
    expect(screen.getByTestId("map-container")).toBeInTheDocument();
  });

  it("exibe placeholder quando não há áreas", () => {
    render(<PropertyMap areas={EMPTY_AREAS} onAddArea={onAddArea} onAreaClick={onAreaClick} />);
    expect(screen.getByText("Nenhuma área cadastrada")).toBeInTheDocument();
  });

  it("não exibe placeholder quando há áreas", () => {
    render(<PropertyMap areas={AREAS_WITH_BOUNDARY} onAddArea={onAddArea} onAreaClick={onAreaClick} />);
    expect(screen.queryByText("Nenhuma área cadastrada")).not.toBeInTheDocument();
  });

  it("chama onAddArea ao clicar no botão +", () => {
    render(<PropertyMap areas={EMPTY_AREAS} onAddArea={onAddArea} onAreaClick={onAreaClick} />);
    fireEvent.click(screen.getByLabelText("Adicionar área"));
    expect(onAddArea).toHaveBeenCalledTimes(1);
  });

  it("área interna sem categoria usa cor padrão (#60a5fa stroke, #1e40af fill)", () => {
    render(<PropertyMap areas={AREAS_WITH_INTERNAL} onAddArea={onAddArea} onAreaClick={onAreaClick} />);
    const calls = (L.geoJSON as ReturnType<typeof vi.fn>).mock.calls;
    const styleArg = calls[calls.length - 1]?.[1]?.style;
    expect(styleArg?.color).toBe("#60a5fa");
    expect(styleArg?.fillColor).toBe("#1e40af");
  });

  it("área interna com category_color usa a cor da categoria para stroke e fill", () => {
    render(<PropertyMap areas={AREAS_WITH_CATEGORY} onAddArea={onAddArea} onAreaClick={onAreaClick} />);
    const calls = (L.geoJSON as ReturnType<typeof vi.fn>).mock.calls;
    const styleArg = calls[calls.length - 1]?.[1]?.style;
    expect(styleArg?.color).toBe("#ef4444");
    expect(styleArg?.fillColor).toBe("#ef4444");
  });

  it("chama onMapReady com a instância do mapa ao montar", () => {
    const onMapReady = vi.fn();
    render(
      <PropertyMap
        areas={EMPTY_AREAS}
        onAddArea={vi.fn()}
        onAreaClick={vi.fn()}
        onMapReady={onMapReady}
      />
    );
    expect(onMapReady).toHaveBeenCalledTimes(1);
    expect(onMapReady).toHaveBeenCalledWith(
      expect.objectContaining({ setView: expect.any(Function) })
    );
  });
});
