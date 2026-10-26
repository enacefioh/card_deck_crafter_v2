// @vitest-environment happy-dom
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, fireEvent, cleanup, screen, waitFor } from "@testing-library/react";
import App from "./App";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("SRS-091: ExportPdfModal Integration in App", () => {
  const mockModuleJson = {
    plantillas: [
      { id: "template_pdf_test", archivo: "template_pdf_test.json" },
    ],
  };

  const mockTemplateJson = {
    id: "template_pdf_test",
    nombre: "Plantilla PDF Test",
    capas: [
      {
        id: "layer_title_pdf",
        tipo: "text",
        nombre: "Título",
        contenidoRaw: "Test Title",
        parentCapaId: null,
      },
    ],
    camposConfig: [],
  };

  const setupAppWithCards = async () => {
    let capturedFormData: FormData | null = null;

    vi.spyOn(global, "fetch").mockImplementation((url, init) => {
      const urlStr = typeof url === "string" ? url : (url as any).url || "";
      if (urlStr.endsWith("module.json")) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockModuleJson),
        } as Response);
      }
      if (urlStr.endsWith("template_pdf_test.json")) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockTemplateJson),
        } as Response);
      }
      if (urlStr.includes("/api/exportar/pdf")) {
        capturedFormData = init?.body as FormData;
        return Promise.resolve({
          ok: true,
          blob: () => Promise.resolve(new Blob(["%PDF-1.4 mock"], { type: "application/pdf" })),
        } as Response);
      }
      // Silenciar otras llamadas
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({}),
      } as Response);
    });

    const { container } = render(<App />);

    // Crear Proyecto desde Welcome Hub
    const openCreateBtn = screen.getByText("Crear Nuevo Proyecto");
    fireEvent.click(openCreateBtn);

    const createProjectBtn = screen.getByText("✨ Crear Proyecto");
    fireEvent.click(createProjectBtn);

    // Añadir Carta desde Plantilla
    await waitFor(() => {
      expect(screen.getByText("Añadir Carta desde Plantilla")).toBeTruthy();
    });

    fireEvent.click(screen.getByText("Añadir Carta desde Plantilla"));

    await waitFor(() => {
      expect(screen.getByText("Plantilla PDF Test")).toBeTruthy();
    });

    fireEvent.click(screen.getByText("Plantilla PDF Test"));

    await waitFor(() => {
      expect(container.querySelector(".card-slot")).toBeTruthy();
    });

    return {
      container,
      getCapturedFormData: () => capturedFormData,
    };
  };

  it("abre el modal de opciones de exportación al pulsar 'Exportar PDF' en el menú Archivo", async () => {
    await setupAppWithCards();

    // Abrir menú Archivo
    const archivoMenuBtn = screen.getByText("Archivo");
    fireEvent.click(archivoMenuBtn);

    // Buscar opción Exportar PDF
    const exportPdfMenuItem = screen.getByText(/Exportar PDF/i);
    expect(exportPdfMenuItem).toBeTruthy();
    fireEvent.click(exportPdfMenuItem);

    // El modal debe abrirse
    await waitFor(() => {
      expect(screen.getByText("Opciones de Exportación PDF")).toBeTruthy();
    });

    expect(screen.getByText("Todas las páginas")).toBeTruthy();
    expect(screen.getByText("Solo anversos (caras frontales)")).toBeTruthy();
  });

  it("envía las opciones de exportación seleccionadas al endpoint /api/exportar/pdf", async () => {
    const { container, getCapturedFormData } = await setupAppWithCards();

    // Seleccionar la carta para habilitar 'Cartas seleccionadas'
    const slot = container.querySelector(".card-slot")!;
    fireEvent.click(slot);

    // Abrir menú Archivo y pulsar Exportar PDF
    const archivoMenuBtn = screen.getByText("Archivo");
    fireEvent.click(archivoMenuBtn);

    const exportPdfMenuItem = screen.getByText(/Exportar PDF/i);
    fireEvent.click(exportPdfMenuItem);

    await waitFor(() => {
      expect(screen.getByText("Opciones de Exportación PDF")).toBeTruthy();
    });

    // Seleccionar 'Solo anversos'
    const radioAnversos = screen.getByRole("radio", { name: /Solo anversos/i });
    fireEvent.click(radioAnversos);

    // Click en Exportar PDF dentro del modal
    const submitBtn = screen.getByRole("button", { name: /Exportar PDF/i });
    fireEvent.click(submitBtn);

    // Esperar a que se realice la petición
    await waitFor(() => {
      expect(getCapturedFormData()).not.toBeNull();
    });

    const formData = getCapturedFormData()!;
    expect(formData.get("archivoProyecto")).toBeTruthy();
    
    const opcionesStr = formData.get("opcionesExportacion") as string;
    expect(opcionesStr).toBeTruthy();
    
    const parsedOptions = JSON.parse(opcionesStr);
    expect(parsedOptions.scopeType).toBe("anversos");
    expect(parsedOptions.pageRangesResolved).toBeTruthy();

    // El modal se cierra tras la exportación
    await waitFor(() => {
      expect(screen.queryByText("Opciones de Exportación PDF")).toBeNull();
    });
  });
});
