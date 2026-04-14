import { render, screen, fireEvent } from "@testing-library/react";
import { vi, describe, it, expect, beforeEach } from "vitest";
import type { AreaListResponse } from "../types";

// Mock completo do leaflet — não funciona em jsdom
vi.mock("leaflet", () => {
  const mockLayer = {
    addTo: vi.fn().mockReturnThis(),
    getBounds: vi.fn().mockReturnValue({
      extend: vi.fn().mockReturnThis(),
    }),
  };
  const mockMap = {
    setView: vi.fn().mockReturnThis(),
    remove: vi.fn(),
    eachLayer: vi.fn((cb: (l: unknown) => void) => {}),
    fitBounds: vi.fn(),
  };
  return {
    default: {
      map: vi.fn().mockReturnValue(mockMap),
      tileLayer: vi.fn().mockReturnValue({ addTo: vi.fn() }),
      geoJSON: vi.fn().mockReturnValue(mockLayer),
      GeoJSON: class {},
    },
  };
});

import PropertyMap from "../components/PropertyMap";

const EMPTY_AREAS: AreaListResponse = { boundary: null, internal: [] };

const AREAS_WITH_BOUNDARY: AreaListResponse = {
  boundary: {
    type: "Feature",
    geometry: {
      type: "Polygon",
      coordinates: [[[-47.9, -21.2], [-47.8, -21.2], [-47.8, -21.1], [-47.9, -21.1], [-47.9, -21.2]]],
    },
    properties: { id: "abc123", type: "boundary" },
  },
  internal: [],
};

describe("PropertyMap", () => {
  const onAddArea = vi.fn();

  beforeEach(() => {
    onAddArea.mockClear();
  });

  it("renderiza o container do mapa", () => {
    render(<PropertyMap areas={EMPTY_AREAS} onAddArea={onAddArea} />);
    expect(screen.getByTestId("map-container")).toBeInTheDocument();
  });

  it("exibe placeholder quando não há áreas", () => {
    render(<PropertyMap areas={EMPTY_AREAS} onAddArea={onAddArea} />);
    expect(screen.getByText("Nenhuma área cadastrada")).toBeInTheDocument();
  });

  it("não exibe placeholder quando há áreas", () => {
    render(<PropertyMap areas={AREAS_WITH_BOUNDARY} onAddArea={onAddArea} />);
    expect(screen.queryByText("Nenhuma área cadastrada")).not.toBeInTheDocument();
  });

  it("chama onAddArea ao clicar no botão +", () => {
    render(<PropertyMap areas={EMPTY_AREAS} onAddArea={onAddArea} />);
    fireEvent.click(screen.getByLabelText("Adicionar área"));
    expect(onAddArea).toHaveBeenCalledTimes(1);
  });
});
