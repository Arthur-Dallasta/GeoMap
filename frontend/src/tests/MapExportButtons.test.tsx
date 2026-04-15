// frontend/src/tests/MapExportButtons.test.tsx
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { vi, describe, it, expect, beforeEach } from "vitest";
import type L from "leaflet";

// Mock leaflet-image — canvas capture doesn't work in jsdom
vi.mock("leaflet-image", () => ({
  default: vi.fn((_map: unknown, callback: (err: null, canvas: HTMLCanvasElement) => void) => {
    const canvas = document.createElement("canvas");
    canvas.width = 800;
    canvas.height = 600;
    canvas.toDataURL = vi.fn().mockReturnValue("data:image/png;base64,abc123");
    callback(null, canvas);
  }),
}));

// Mock jsPDF
const mockSave = vi.fn();
const mockAddImage = vi.fn();
vi.mock("jspdf", () => ({
  jsPDF: vi.fn().mockImplementation(function () {
    return {
      addImage: mockAddImage,
      save: mockSave,
      internal: {
        pageSize: { getWidth: () => 297, getHeight: () => 210 },
      },
    };
  }),
}));

import MapExportButtons from "../components/MapExportButtons";

const fakeMap = { _leaflet_id: 1 } as unknown as L.Map;

describe("MapExportButtons", () => {
  beforeEach(() => {
    mockSave.mockClear();
    mockAddImage.mockClear();
  });

  it("renderiza botões de exportação PNG e PDF", () => {
    render(<MapExportButtons mapInstance={fakeMap} propertyName="Fazenda Teste" />);
    expect(screen.getByText("Exportar PNG")).toBeInTheDocument();
    expect(screen.getByText("Exportar PDF")).toBeInTheDocument();
  });

  it("botões ficam desabilitados quando mapInstance é null", () => {
    render(<MapExportButtons mapInstance={null} propertyName="Fazenda Teste" />);
    expect(screen.getByText("Exportar PNG")).toBeDisabled();
    expect(screen.getByText("Exportar PDF")).toBeDisabled();
  });

  it("exportar PNG aciona download com nome correto", async () => {
    const clickSpy = vi
      .spyOn(HTMLAnchorElement.prototype, "click")
      .mockImplementation(() => {});
    render(<MapExportButtons mapInstance={fakeMap} propertyName="Fazenda Teste" />);
    fireEvent.click(screen.getByText("Exportar PNG"));
    await waitFor(() => expect(clickSpy).toHaveBeenCalledTimes(1));
    clickSpy.mockRestore();
  });

  it("exportar PDF chama pdf.save com nome correto", async () => {
    render(<MapExportButtons mapInstance={fakeMap} propertyName="Fazenda Teste" />);
    fireEvent.click(screen.getByText("Exportar PDF"));
    await waitFor(() =>
      expect(mockSave).toHaveBeenCalledWith("Fazenda Teste-mapa.pdf")
    );
  });
});
