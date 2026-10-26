// @vitest-environment happy-dom
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { ExportPdfModal } from "./ExportPdfModal";

afterEach(() => {
  cleanup();
});

describe("ExportPdfModal Component (SRS-091)", () => {
  const defaultProps = {
    documentoNombre: "Mazo Principal",
    totalCartas: 18,
    totalPaginasEstimadas: 4,
    tieneReversos: true,
    selectedCardIds: ["card_1", "card_2"],
    cartasPorPagina: 9,
    isExporting: false,
    onExport: vi.fn(),
    onClose: vi.fn(),
  };

  it("renderiza el modal con todas las opciones y selecciona 'todas' por defecto", () => {
    render(<ExportPdfModal {...defaultProps} />);

    expect(screen.getByText("Opciones de Exportación PDF")).toBeTruthy();
    expect(screen.getByText("Mazo Principal")).toBeTruthy();
    expect(screen.getByText("Todas las páginas")).toBeTruthy();
    expect(screen.getByText("Solo anversos (caras frontales)")).toBeTruthy();
    expect(screen.getByText("Solo reversos (caras traseras)")).toBeTruthy();
    expect(screen.getByText("Cartas seleccionadas")).toBeTruthy();
    expect(screen.getByText("Personalizado (Páginas físicas del PDF)")).toBeTruthy();

    const submitBtn = screen.getByRole("button", { name: /Exportar PDF/i });
    expect(submitBtn.hasAttribute("disabled")).toBe(false);
  });

  it("deshabilita la opción 'Solo reversos' si el documento no tiene caras traseras", () => {
    render(<ExportPdfModal {...defaultProps} tieneReversos={false} />);

    const radioReversos = screen.getByRole("radio", { name: /Solo reversos/i }) as HTMLInputElement;
    expect(radioReversos.disabled).toBe(true);
  });

  it("deshabilita la opción 'Cartas seleccionadas' si no hay cartas seleccionadas", () => {
    render(<ExportPdfModal {...defaultProps} selectedCardIds={[]} />);

    const radioSeleccion = screen.getByRole("radio", { name: /Cartas seleccionadas/i }) as HTMLInputElement;
    expect(radioSeleccion.disabled).toBe(true);
  });

  it("permite seleccionar 'Cartas seleccionadas' y emite payload correcto", () => {
    const handleExport = vi.fn();
    render(<ExportPdfModal {...defaultProps} onExport={handleExport} />);

    const radioSeleccion = screen.getByRole("radio", { name: /Cartas seleccionadas/i });
    fireEvent.click(radioSeleccion);

    expect(screen.getByText(/Se compactarán 2 cartas seleccionadas/i)).toBeTruthy();

    const submitBtn = screen.getByRole("button", { name: /Exportar PDF/i });
    fireEvent.click(submitBtn);

    expect(handleExport).toHaveBeenCalledWith(
      expect.objectContaining({
        scopeType: "seleccion",
        selectedCardIds: ["card_1", "card_2"],
      })
    );
  });

  it("valida el campo de texto cuando se elige 'Personalizado'", () => {
    const handleExport = vi.fn();
    render(<ExportPdfModal {...defaultProps} onExport={handleExport} />);

    const radioPersonalizado = screen.getByRole("radio", { name: /Personalizado/i });
    fireEvent.click(radioPersonalizado);

    const submitBtn = screen.getByRole("button", { name: /Exportar PDF/i });
    // Inicialmente vacío -> deshabilitado
    expect(submitBtn.hasAttribute("disabled")).toBe(true);

    const input = screen.getByPlaceholderText(/ej\. 1, 3, 5-4/i) as HTMLInputElement;
    expect(input).toBeTruthy();

    // Rango inválido (página 99 supera total 4)
    fireEvent.change(input, { target: { value: "1, 99" } });
    expect(submitBtn.hasAttribute("disabled")).toBe(true);
    expect(screen.getAllByText(/supera el máximo de páginas/i).length).toBeGreaterThanOrEqual(1);

    // Rango válido (1-2)
    fireEvent.change(input, { target: { value: "1-2, 4" } });
    expect(submitBtn.hasAttribute("disabled")).toBe(false);

    fireEvent.click(submitBtn);
    expect(handleExport).toHaveBeenCalledWith(
      expect.objectContaining({
        scopeType: "personalizado",
        customRangeText: "1-2, 4",
        pageRangesResolved: "1-2,4",
        paginasSeleccionadas: [1, 2, 4],
      })
    );
  });

  it("exporta solo anversos con pageRanges impares", () => {
    const handleExport = vi.fn();
    render(<ExportPdfModal {...defaultProps} onExport={handleExport} />);

    const radioAnversos = screen.getByRole("radio", { name: /Solo anversos/i });
    fireEvent.click(radioAnversos);

    const submitBtn = screen.getByRole("button", { name: /Exportar PDF/i });
    fireEvent.click(submitBtn);

    expect(handleExport).toHaveBeenCalledWith(
      expect.objectContaining({
        scopeType: "anversos",
        pageRangesResolved: "1,3",
        paginasSeleccionadas: [1, 3],
      })
    );
  });
});
