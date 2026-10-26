// @vitest-environment happy-dom
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { ExportPngModal } from "./ExportPngModal";
import type { DocumentoCDC2 } from "shared";

afterEach(() => {
  cleanup();
});

describe("ExportPngModal Component (SRS-092)", () => {
  const mockDocs: DocumentoCDC2[] = [
    {
      id: "doc_1",
      nombre: "Mazo Fuego",
      canvasConfig: {} as any,
      cardConfig: {} as any,
      modoTraseras: "comun",
      imagenTraseraComun: "back.png",
      cards: [
        { id: "c1", nombre: "Dragon", cantidad: 1, valoresCampos: {}, capasOverrides: {}, imagenTrasera: null },
        { id: "c2", nombre: "Fénix", cantidad: 1, valoresCampos: {}, capasOverrides: {}, imagenTrasera: null },
        { id: "c3", nombre: "Salamandra", cantidad: 1, valoresCampos: {}, capasOverrides: {}, imagenTrasera: null },
      ],
    },
    {
      id: "doc_2",
      nombre: "Mazo Agua",
      canvasConfig: {} as any,
      cardConfig: {} as any,
      modoTraseras: "ninguno",
      imagenTraseraComun: null,
      cards: [
        { id: "c4", nombre: "Sirena", cantidad: 1, valoresCampos: {}, capasOverrides: {}, imagenTrasera: null },
      ],
    },
  ];

  const defaultProps = {
    documentos: mockDocs,
    activeDocumentoId: "doc_1",
    selectedCardIds: ["c1", "c2"],
    isExporting: false,
    onExport: vi.fn(),
    onClose: vi.fn(),
  };

  it("renderiza el modal con las opciones de Nivel 1 y Nivel 2", () => {
    render(<ExportPngModal {...defaultProps} />);

    expect(screen.getByText("Opciones de Exportación PNG")).toBeTruthy();
    expect(screen.getByText(/Solo "Mazo Fuego"/i)).toBeTruthy();
    expect(screen.getByText(/Todos los Documentos \(2\)/i)).toBeTruthy();
    expect(screen.getByText("Todas las cartas del documento")).toBeTruthy();
    expect(screen.getByText("Cartas seleccionadas en la mesa")).toBeTruthy();
    expect(screen.getByText(/Ambas Caras/i)).toBeTruthy();
  });

  it("oculta las opciones de cartas individuales cuando se selecciona 'Todos los documentos'", () => {
    render(<ExportPngModal {...defaultProps} />);

    expect(screen.getByText("Cartas a Incluir")).toBeTruthy();

    const radioTodosDocs = screen.getByRole("radio", { name: /Todos los Documentos/i });
    fireEvent.click(radioTodosDocs);

    expect(screen.queryByText("Cartas a Incluir")).toBeNull();
  });

  it("deshabilita la opción 'Cartas seleccionadas' si no hay cartas seleccionadas", () => {
    render(<ExportPngModal {...defaultProps} selectedCardIds={[]} />);

    const radioSeleccion = screen.getByRole("radio", { name: /Cartas seleccionadas/i }) as HTMLInputElement;
    expect(radioSeleccion.disabled).toBe(true);
  });

  it("valida el campo de texto cuando se elige rango 'Personalizado'", () => {
    const handleExport = vi.fn();
    render(<ExportPngModal {...defaultProps} onExport={handleExport} />);

    const radioPersonalizado = screen.getByRole("radio", { name: /Rango personalizado/i });
    fireEvent.click(radioPersonalizado);

    const submitBtn = screen.getByRole("button", { name: /Exportar PNGs/i });
    expect(submitBtn.hasAttribute("disabled")).toBe(true);

    const input = screen.getByPlaceholderText(/ej\. 1-5, 8/i) as HTMLInputElement;
    expect(input).toBeTruthy();

    // Rango inválido (carta 99 supera total 3)
    fireEvent.change(input, { target: { value: "1, 99" } });
    expect(submitBtn.hasAttribute("disabled")).toBe(true);
    expect(screen.getAllByText(/supera el total de cartas/i).length).toBeGreaterThanOrEqual(1);

    // Rango válido (1-2)
    fireEvent.change(input, { target: { value: "1-2" } });
    expect(submitBtn.hasAttribute("disabled")).toBe(false);

    // Cambiar a 'Solo Anversos'
    const radioAnversos = screen.getByRole("radio", { name: /Solo Anversos/i });
    fireEvent.click(radioAnversos);

    fireEvent.click(submitBtn);

    expect(handleExport).toHaveBeenCalledWith(
      expect.objectContaining({
        docScope: "documento_activo",
        cardScope: "personalizado",
        facesScope: "anversos",
        customCardRangeText: "1-2",
        selectedCardIndices: [1, 2],
      })
    );
  });

  it("permite exportar cartas seleccionadas con ambas caras", () => {
    const handleExport = vi.fn();
    render(<ExportPngModal {...defaultProps} onExport={handleExport} />);

    const radioSeleccion = screen.getByRole("radio", { name: /Cartas seleccionadas/i });
    fireEvent.click(radioSeleccion);

    const submitBtn = screen.getByRole("button", { name: /Exportar PNGs/i });
    fireEvent.click(submitBtn);

    expect(handleExport).toHaveBeenCalledWith(
      expect.objectContaining({
        docScope: "documento_activo",
        cardScope: "seleccion",
        facesScope: "ambas",
        selectedCardIds: ["c1", "c2"],
      })
    );
  });
});
