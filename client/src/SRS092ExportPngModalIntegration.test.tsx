// @vitest-environment happy-dom
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, fireEvent, cleanup, screen, waitFor } from "@testing-library/react";
import App from "./App";
import * as clientPngExportService from "./services/clientPngExportService";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("SRS-092: ExportPngModal Integration in App", () => {
  const mockModuleJson = {
    plantillas: [
      { id: "template_png_test", archivo: "template_png_test.json" },
    ],
  };

  const mockTemplateJson = {
    id: "template_png_test",
    nombre: "Plantilla PNG Test",
    capas: [
      {
        id: "layer_title_png",
        tipo: "text",
        nombre: "Título",
        contenidoRaw: "Test PNG Title",
        parentCapaId: null,
      },
    ],
    camposConfig: [],
  };

  const setupAppWithCards = async () => {
    let capturedOptions: clientPngExportService.ClientPngExportOptions | null = null;

    vi.spyOn(clientPngExportService, "exportarProyectoPngEnCliente").mockImplementation((options) => {
      capturedOptions = options;
      return Promise.resolve(new Blob(["mock-zip-content"], { type: "application/zip" }));
    });

    vi.spyOn(global, "fetch").mockImplementation((url) => {
      const urlStr = typeof url === "string" ? url : (url as any).url || "";
      if (urlStr.endsWith("module.json")) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockModuleJson),
        } as Response);
      }
      if (urlStr.endsWith("template_png_test.json")) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockTemplateJson),
        } as Response);
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({}),
      } as Response);
    });

    // Mock URL.createObjectURL and revokeObjectURL
    if (!window.URL.createObjectURL) {
      window.URL.createObjectURL = vi.fn().mockReturnValue("blob:mock-url");
    }
    if (!window.URL.revokeObjectURL) {
      window.URL.revokeObjectURL = vi.fn();
    }

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
      expect(screen.getByText("Plantilla PNG Test")).toBeTruthy();
    });

    fireEvent.click(screen.getByText("Plantilla PNG Test"));

    await waitFor(() => {
      expect(container.querySelector(".card-slot")).toBeTruthy();
    });

    return {
      container,
      getCapturedOptions: () => capturedOptions,
    };
  };

  it("abre el modal ExportPngModal al hacer clic en 'Exportar Imágenes (PNG)...' del menú Archivo", async () => {
    await setupAppWithCards();

    // Abrir menú Archivo
    const archivoMenuBtn = screen.getByText("Archivo");
    fireEvent.click(archivoMenuBtn);

    // Buscar opción Exportar Imágenes (PNG)...
    const exportPngMenuItem = screen.getByText(/Exportar Imágenes \(PNG\)\.\.\./i);
    expect(exportPngMenuItem).toBeTruthy();
    fireEvent.click(exportPngMenuItem);

    // El modal debe abrirse
    await waitFor(() => {
      expect(screen.getByText("Opciones de Exportación PNG")).toBeTruthy();
    });

    expect(screen.getByText("Alcance de Documentos")).toBeTruthy();
    expect(screen.getByText(/Cartas a Incluir/i)).toBeTruthy();
    expect(screen.getByText("Caras a Renderizar")).toBeTruthy();
    expect(screen.getByText(/Solo Anversos/i)).toBeTruthy();
  });

  it("permite configurar opciones de caras y rangos, y llama a exportarProyectoPngEnCliente", async () => {
    const { getCapturedOptions } = await setupAppWithCards();

    // Abrir menú Archivo y pulsar Exportar Imágenes
    const archivoMenuBtn = screen.getByText("Archivo");
    fireEvent.click(archivoMenuBtn);

    const exportPngMenuItem = screen.getByText(/Exportar Imágenes \(PNG\)\.\.\./i);
    fireEvent.click(exportPngMenuItem);

    await waitFor(() => {
      expect(screen.getByText("Opciones de Exportación PNG")).toBeTruthy();
    });

    // Seleccionar 'Solo anversos'
    const anversosRadio = screen.getByRole("radio", { name: /Solo Anversos/i });
    fireEvent.click(anversosRadio);

    // Seleccionar 'Personalizado'
    const personalizadoRadio = screen.getByRole("radio", { name: /Rango personalizado/i });
    fireEvent.click(personalizadoRadio);

    const rangeInput = screen.getByPlaceholderText(/ej\. 1-5/i);
    fireEvent.change(rangeInput, { target: { value: "1" } });

    // Click en Exportar PNGs
    const exportSubmitBtn = screen.getByRole("button", { name: /Exportar PNGs/i });
    expect(exportSubmitBtn).toBeTruthy();
    fireEvent.click(exportSubmitBtn);

    // El modal de opciones debe cerrarse inmediatamente
    await waitFor(() => {
      expect(screen.queryByText("Opciones de Exportación PNG")).toBeNull();
    });

    // Esperar a que se invoque el servicio
    await waitFor(() => {
      expect(getCapturedOptions()).not.toBeNull();
    });

    const options = getCapturedOptions()!;
    expect(options.exportOptions).toBeDefined();
    expect(options.exportOptions?.docScope).toBe("documento_activo");
    expect(options.exportOptions?.cardScope).toBe("personalizado");
    expect(options.exportOptions?.facesScope).toBe("anversos");
    expect(options.exportOptions?.selectedCardIndices).toEqual([1]);
  });
});
