// @vitest-environment happy-dom
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { ExportProgressModal } from "./ExportProgressModal";
import type { ExportProgressInfo } from "../services/clientPngExportService";

describe("ExportProgressModal Component (SRS-089)", () => {
  afterEach(() => {
    cleanup();
  });
  it("no renderiza nada si isOpen es false", () => {
    const { container } = render(
      <ExportProgressModal isOpen={false} progress={null} onCancel={() => {}} />
    );
    expect(container.firstChild).toBeNull();
  });

  it("renderiza el título, porcentaje, mensaje descriptivo y contador de cartas", () => {
    const progress: ExportProgressInfo = {
      documentoActual: "Página 1",
      indiceDoc: 1,
      totalDocs: 1,
      cartaActual: 15,
      totalCartas: 50,
      porcentaje: 30,
      mensaje: "Renderizando carta 015..."
    };

    render(
      <ExportProgressModal isOpen={true} progress={progress} onCancel={() => {}} />
    );

    expect(screen.getByText("Exportando Imágenes PNG")).toBeDefined();
    expect(screen.getByText("30%")).toBeDefined();
    expect(screen.getByText("Renderizando carta 015...")).toBeDefined();
    expect(screen.getByText("15 / 50")).toBeDefined();
  });

  it("ejecuta onCancel al pulsar el botón de cancelar", () => {
    const onCancelMock = vi.fn();

    render(
      <ExportProgressModal isOpen={true} progress={null} onCancel={onCancelMock} />
    );

    const btnCancel = screen.getByText("Cancelar Exportación");
    fireEvent.click(btnCancel);

    expect(onCancelMock).toHaveBeenCalledTimes(1);
  });
});
