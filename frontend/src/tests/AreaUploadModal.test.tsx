import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { vi, describe, it, expect, beforeEach } from "vitest";
import AreaUploadModal from "../components/AreaUploadModal";
import type { Category } from "../types";

const CATEGORIES: Category[] = [
  {
    id: "cat-1",
    key: "app",
    name: "APP",
    color: "#22c55e",
    description: "Área de Preservação Permanente",
    created_at: "2026-01-01",
  },
  {
    id: "cat-2",
    key: "benfeitoria",
    name: "Benfeitoria",
    color: "#f97316",
    description: null,
    created_at: "2026-01-01",
  },
  {
    id: "cat-3",
    key: "area_cultivo",
    name: "Área de cultivo",
    color: "#eab308",
    description: null,
    created_at: "2026-01-01",
  },
];

function makeFile(name = "area.geojson") {
  return new File(['{"type":"FeatureCollection","features":[]}'], name, {
    type: "application/json",
  });
}

function selectFile(file: File) {
  const input = document.querySelector('input[type="file"]') as HTMLInputElement;
  fireEvent.change(input, { target: { files: [file] } });
}

describe("AreaUploadModal — categoria", () => {
  const onClose = vi.fn();
  const onUpload = vi.fn().mockResolvedValue(undefined);

  const defaultProps = {
    open: true,
    hasBoundary: false,
    categories: CATEGORIES,
    subcategories: [],
    onClose,
    onUpload,
  };

  beforeEach(() => {
    onClose.mockClear();
    onUpload.mockClear();
  });

  it("não exibe seção de categoria para tipo 'Contorno geral'", () => {
    render(<AreaUploadModal {...defaultProps} />);
    expect(screen.queryByLabelText("Categoria *")).not.toBeInTheDocument();
  });

  it("exibe seção de categoria ao selecionar 'Área interna'", () => {
    render(<AreaUploadModal {...defaultProps} />);
    fireEvent.click(screen.getByText("Área interna"));
    expect(screen.getByLabelText("Categoria *")).toBeInTheDocument();
  });

  it("exibe as 3 categorias do sistema no select", () => {
    render(<AreaUploadModal {...defaultProps} />);
    fireEvent.click(screen.getByText("Área interna"));
    expect(screen.getByRole("option", { name: "APP" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Benfeitoria" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Área de cultivo" })).toBeInTheDocument();
  });

  it("não exibe opção '+ Nova categoria...' no select", () => {
    render(<AreaUploadModal {...defaultProps} />);
    fireEvent.click(screen.getByText("Área interna"));
    expect(screen.queryByRole("option", { name: "+ Nova categoria..." })).not.toBeInTheDocument();
  });

  it("botão de upload fica desabilitado com arquivo selecionado mas sem categoria", () => {
    render(<AreaUploadModal {...defaultProps} />);
    fireEvent.click(screen.getByText("Área interna"));
    selectFile(makeFile());
    expect(screen.getByText("Fazer upload")).toBeDisabled();
  });

  it("botão de upload fica habilitado com arquivo + categoria selecionada", () => {
    render(<AreaUploadModal {...defaultProps} />);
    fireEvent.click(screen.getByText("Área interna"));
    selectFile(makeFile());
    fireEvent.change(screen.getByRole("combobox"), { target: { value: "cat-1" } });
    expect(screen.getByText("Fazer upload")).not.toBeDisabled();
  });

  it("chama onUpload com categoryId ao submeter com categoria selecionada", async () => {
    render(<AreaUploadModal {...defaultProps} />);
    fireEvent.click(screen.getByText("Área interna"));
    selectFile(makeFile());
    fireEvent.change(screen.getByRole("combobox"), { target: { value: "cat-1" } });
    fireEvent.click(screen.getByText("Fazer upload"));
    await waitFor(() =>
      expect(onUpload).toHaveBeenCalledWith(expect.any(File), "internal", "cat-1")
    );
  });

  it("não passa categoryId ao submeter contorno geral", async () => {
    render(<AreaUploadModal {...defaultProps} />);
    selectFile(makeFile());
    fireEvent.click(screen.getByText("Fazer upload"));
    await waitFor(() =>
      expect(onUpload).toHaveBeenCalledWith(expect.any(File), "boundary", undefined)
    );
  });
});
