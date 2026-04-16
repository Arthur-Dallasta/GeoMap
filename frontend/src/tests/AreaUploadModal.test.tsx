import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { vi, describe, it, expect, beforeEach } from "vitest";
import AreaUploadModal from "../components/AreaUploadModal";
import type { Category } from "../types";

const CATEGORIES: Category[] = [
  {
    id: "cat-1",
    property_id: "prop-1",
    name: "Soja",
    color: "#22c55e",
    description: null,
    created_at: "2026-01-01",
  },
  {
    id: "cat-2",
    property_id: "prop-1",
    name: "Pastagem",
    color: "#eab308",
    description: null,
    created_at: "2026-01-01",
  },
];

const NEW_CAT: Category = {
  id: "cat-new",
  property_id: "prop-1",
  name: "Soja Nova",
  color: "#ef4444",
  description: null,
  created_at: "2026-01-01",
};

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
  const onCreateCategory = vi.fn().mockResolvedValue(NEW_CAT);

  const defaultProps = {
    open: true,
    hasBoundary: false,
    categories: CATEGORIES,
    onClose,
    onUpload,
    onCreateCategory,
  };

  beforeEach(() => {
    onClose.mockClear();
    onUpload.mockClear();
    onCreateCategory.mockClear();
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

  it("exibe categorias existentes e opção '+ Nova categoria...' no select", () => {
    render(<AreaUploadModal {...defaultProps} />);
    fireEvent.click(screen.getByText("Área interna"));
    expect(screen.getByRole("option", { name: "Soja" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Pastagem" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "+ Nova categoria..." })).toBeInTheDocument();
  });

  it("botão de upload fica desabilitado com arquivo selecionado mas sem categoria", () => {
    render(<AreaUploadModal {...defaultProps} />);
    fireEvent.click(screen.getByText("Área interna"));
    selectFile(makeFile());
    expect(screen.getByText("Fazer upload")).toBeDisabled();
  });

  it("botão de upload fica habilitado com arquivo + categoria existente selecionada", () => {
    render(<AreaUploadModal {...defaultProps} />);
    fireEvent.click(screen.getByText("Área interna"));
    selectFile(makeFile());
    fireEvent.change(screen.getByRole("combobox"), { target: { value: "cat-1" } });
    expect(screen.getByText("Fazer upload")).not.toBeDisabled();
  });

  it("exibe campos inline ao selecionar '+ Nova categoria...'", () => {
    render(<AreaUploadModal {...defaultProps} />);
    fireEvent.click(screen.getByText("Área interna"));
    fireEvent.change(screen.getByRole("combobox"), { target: { value: "new" } });
    expect(screen.getByPlaceholderText("Ex: Plantio de soja")).toBeInTheDocument();
  });

  it("botão desabilitado quando '+ Nova categoria...' selecionado mas nome vazio", () => {
    render(<AreaUploadModal {...defaultProps} />);
    fireEvent.click(screen.getByText("Área interna"));
    selectFile(makeFile());
    fireEvent.change(screen.getByRole("combobox"), { target: { value: "new" } });
    expect(screen.getByText("Fazer upload")).toBeDisabled();
  });

  it("chama onUpload com categoryId ao submeter com categoria existente", async () => {
    render(<AreaUploadModal {...defaultProps} />);
    fireEvent.click(screen.getByText("Área interna"));
    selectFile(makeFile());
    fireEvent.change(screen.getByRole("combobox"), { target: { value: "cat-1" } });
    fireEvent.click(screen.getByText("Fazer upload"));
    await waitFor(() =>
      expect(onUpload).toHaveBeenCalledWith(expect.any(File), "internal", "cat-1")
    );
    expect(onCreateCategory).not.toHaveBeenCalled();
  });

  it("chama onCreateCategory e onUpload com id retornado ao criar nova categoria", async () => {
    render(<AreaUploadModal {...defaultProps} />);
    fireEvent.click(screen.getByText("Área interna"));
    selectFile(makeFile());
    fireEvent.change(screen.getByRole("combobox"), { target: { value: "new" } });
    fireEvent.change(screen.getByPlaceholderText("Ex: Plantio de soja"), {
      target: { value: "Soja Nova" },
    });
    fireEvent.click(screen.getByText("Fazer upload"));
    await waitFor(() =>
      expect(onCreateCategory).toHaveBeenCalledWith(
        expect.objectContaining({ name: "Soja Nova" })
      )
    );
    await waitFor(() =>
      expect(onUpload).toHaveBeenCalledWith(expect.any(File), "internal", "cat-new")
    );
  });

  it("não passa categoryId ao submeter contorno geral", async () => {
    render(<AreaUploadModal {...defaultProps} />);
    selectFile(makeFile());
    fireEvent.click(screen.getByText("Fazer upload"));
    await waitFor(() =>
      expect(onUpload).toHaveBeenCalledWith(expect.any(File), "boundary", undefined)
    );
    expect(onCreateCategory).not.toHaveBeenCalled();
  });

  it("exibe erro e não chama onUpload quando onCreateCategory falha", async () => {
    const failingCreate = vi.fn().mockRejectedValue(new Error("Servidor indisponível"));
    render(<AreaUploadModal {...defaultProps} onCreateCategory={failingCreate} />);
    fireEvent.click(screen.getByText("Área interna"));
    selectFile(makeFile());
    fireEvent.change(screen.getByRole("combobox"), { target: { value: "new" } });
    fireEvent.change(screen.getByPlaceholderText("Ex: Plantio de soja"), {
      target: { value: "Soja Nova" },
    });
    fireEvent.click(screen.getByText("Fazer upload"));
    await waitFor(() =>
      expect(screen.getByText("Servidor indisponível")).toBeInTheDocument()
    );
    expect(onUpload).not.toHaveBeenCalled();
  });
});
