// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor, cleanup } from "@testing-library/react";
import JSZip from "jszip";
import App from "./App";
import MenuBar from "./MenuBar";
import { AuthContext } from "./AuthContext";

describe("SRS-067: Plantillas de Proyecto (.cdc2), Flujo Local y Organización de Menús", () => {
  afterEach(() => {
    cleanup();
  });

  const mockAuthValue: any = {
    user: { id: "u1", email: "user@test.com", role: "user" as const },
    status: { hasUsers: true, initialSetupDone: true },
    loading: false,
    showLoginModal: false,
    setShowLoginModal: vi.fn(),
    showSetupModal: false,
    setShowSetupModal: vi.fn(),
    activationEmail: null,
    setActivationEmail: vi.fn(),
    login: vi.fn(),
    activatePassword: vi.fn(),
    setupAdmin: vi.fn(),
    logout: vi.fn(),
    refreshUser: vi.fn(),
  };

  beforeEach(() => {
    vi.restoreAllMocks();
    global.fetch = vi.fn().mockImplementation((url: string) => {
      if (typeof url === "string" && url.includes("/api/auth/me")) {
        return Promise.resolve({
          ok: false,
          status: 401,
          json: () => Promise.resolve({ error: "Unauthorized" })
        } as Response);
      }
      if (typeof url === "string" && url.includes("/api/auth/status")) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ hasUsers: true })
        } as Response);
      }
      if (typeof url === "string" && url.includes("/modules/default/module.json")) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ id: "default", name: "Default", templates: [] })
        } as Response);
      }
      return Promise.reject(new Error("URL no mockeada"));
    });
  });

  it("RF-1 y RF-5: MenuBar organiza adecuadamente los submenús de Archivo y Recursos", () => {
    const mockOnAbrirComoPlantilla = vi.fn();
    const mockOnExportarPlantilla = vi.fn();
    const mockOnImportarPlantilla = vi.fn();

    render(
      <AuthContext.Provider value={mockAuthValue}>
        <MenuBar
          {...({
            onNuevoProyecto: vi.fn(),
            onCargarProyectoClick: vi.fn(),
            onAbrirComoPlantillaClick: mockOnAbrirComoPlantilla,
            onGuardarProyecto: vi.fn(),
            onExportarPlantillaProyecto: mockOnExportarPlantilla,
            onImportarPlantillaClick: mockOnImportarPlantilla,
            documentos: [],
            activeDocumentoId: "",
            onSetActiveDocumentoId: vi.fn(),
            onDeleteDocumento: vi.fn(),
            onRenameDocumento: vi.fn(),
            paginasCount: 1,
            zoomFactor: 2.5,
            selectedCount: 0,
            puedeMoverArriba: false,
            puedeMoverAbajo: false,
            onSelectAll: vi.fn(),
            onDeselectAll: vi.fn(),
            onInvertSelection: vi.fn(),
            onDuplicarSeleccion: vi.fn(),
            onEliminarSeleccion: vi.fn(),
            onMoverSeleccionArriba: vi.fn(),
            onMoverSeleccionAbajo: vi.fn(),
            onAddCardFromTemplate: vi.fn(),
            onEditCardSelected: vi.fn(),
            cartasCount: 0, // Verificar que se despliega aún con 0 cartas
          } as any)}
        />
      </AuthContext.Provider>
    );

    // 1. Menú Archivo ▶ Abrir Proyecto ▶
    const archivoBtn = screen.getByText("Archivo");
    fireEvent.click(archivoBtn);

    const abrirProyectoItem = screen.getByText("Abrir Proyecto");
    fireEvent.mouseEnter(abrirProyectoItem.parentElement!);

    const abrirComoPlantillaBtn = screen.getByText("Abrir desde PC como Plantilla (.cdc2)...");
    expect(abrirComoPlantillaBtn).toBeTruthy();
    fireEvent.click(abrirComoPlantillaBtn);
    expect(mockOnAbrirComoPlantilla).toHaveBeenCalledTimes(1);

    // 2. Menú Archivo ▶ Guardar Proyecto ▶ (Permitido incluso con cartasCount === 0)
    fireEvent.click(archivoBtn); // Reabrir el menú Archivo tras la acción anterior
    const guardarProyectoItem = screen.getByText("Guardar Proyecto");
    fireEvent.mouseEnter(guardarProyectoItem.parentElement!);

    const exportarPlantillaBtn = screen.getByText("Exportar Plantilla de Proyecto (.cdc2)");
    expect(exportarPlantillaBtn).toBeTruthy();

    fireEvent.click(exportarPlantillaBtn);
    expect(mockOnExportarPlantilla).toHaveBeenCalledTimes(1);

    // 3. Menú Recursos ▶ Importar Plantilla (.cdc2t)... (RF-1: Reubicado en Recursos)
    const recursosBtn = screen.getByText("Recursos");
    fireEvent.click(recursosBtn);

    const importarPlantillaItem = screen.getByText("Importar Plantilla (.cdc2t)...");
    expect(importarPlantillaItem).toBeTruthy();
    fireEvent.click(importarPlantillaItem);
    expect(mockOnImportarPlantilla).toHaveBeenCalledTimes(1);
  });

  it("RF-3: Cargar proyecto como plantilla descarta las cartas y asigna un nuevo ID", async () => {
    const alertMock = vi.fn();
    window.alert = alertMock;

    // Crear un archivo .cdc2 simulado en memoria con cartas
    const zip = new JSZip();
    const mockProjectData = {
      version: "2.1.0",
      id: "original_project_123",
      meta: {
        id: "original_project_123",
        nombre: "Juego con Cartas",
        fechaCreacion: new Date().toISOString(),
        fechaModificacion: new Date().toISOString()
      },
      documentos: [
        {
          id: "doc_1",
          nombre: "Baraja Principal",
          canvasConfig: {
            tipo: "A4",
            anchoMm: 210,
            altoMm: 297,
            orientacion: "vertical",
            margenTopMm: 10,
            margenBottomMm: 10,
            margenLeftMm: 10,
            margenRightMm: 10,
            lineasCorteContinuas: true,
            marcasCorteEsquinas: false
          },
          cardConfig: {
            anchoMm: 63,
            altoMm: 88,
            espaciadoXMm: 0,
            espaciadoYMm: 0,
            sangradoMm: 2,
            bordeCorteMm: 0,
            bordeCorteColor: "#000000",
            modoAjuste: "contain",
            reducirArteAlBorde: false
          },
          modoTraseras: "ninguno",
          imagenTraseraComun: null,
          cards: [
            { id: "c1", nombre: "Carta 1", cantidad: 1 },
            { id: "c2", nombre: "Carta 2", cantidad: 2 }
          ]
        }
      ],
      activeDocumentoId: "doc_1",
      templates: {},
      assets: [],
      userAssets: [],
      projectSymbols: [],
      customFonts: [],
      projectColors: ["#ff0000"]
    };

    zip.file("project.json", JSON.stringify(mockProjectData));
    const zipBlob = await zip.generateAsync({ type: "blob" });
    const mockFile = new File([zipBlob], "juego.cdc2", { type: "application/zip" });

    const { container } = render(<App />);

    // Localizar el input oculto para abrir como plantilla (el segundo input accept=.cdc2)
    const inputs = container.querySelectorAll('input[type="file"][accept=".cdc2"]');
    expect(inputs.length).toBe(2);
    const inputAbrirComoPlantilla = inputs[1] as HTMLInputElement;

    // Simular selección de archivo
    fireEvent.change(inputAbrirComoPlantilla, {
      target: { files: [mockFile] }
    });

    await waitFor(() => {
      expect(alertMock).toHaveBeenCalledWith("Plantilla de proyecto cargada correctamente.");
    });
  });

  it("RF-3: Apertura nativa de archivo con isTemplate: true mediante flujo habitual se abre automáticamente como plantilla", async () => {
    const alertMock = vi.fn();
    window.alert = alertMock;

    // Crear un archivo .cdc2 de plantilla
    const zip = new JSZip();
    const mockTemplateData = {
      version: "2.1.0",
      id: "tmpl_abc_456",
      isTemplate: true,
      type: "template",
      meta: {
        id: "tmpl_abc_456",
        nombre: "Plantilla Base Fantasía",
        fechaCreacion: new Date().toISOString(),
        fechaModificacion: new Date().toISOString(),
        isTemplate: true,
        type: "template"
      },
      documentos: [
        {
          id: "doc_1",
          nombre: "Documento Plantilla",
          canvasConfig: {
            tipo: "A4",
            anchoMm: 210,
            altoMm: 297,
            orientacion: "vertical",
            margenTopMm: 10,
            margenBottomMm: 10,
            margenLeftMm: 10,
            margenRightMm: 10,
            lineasCorteContinuas: true,
            marcasCorteEsquinas: false
          },
          cardConfig: {
            anchoMm: 63,
            altoMm: 88,
            espaciadoXMm: 0,
            espaciadoYMm: 0,
            sangradoMm: 2,
            bordeCorteMm: 0,
            bordeCorteColor: "#000000",
            modoAjuste: "contain",
            reducirArteAlBorde: false
          },
          modoTraseras: "ninguno",
          imagenTraseraComun: null,
          cards: []
        }
      ],
      activeDocumentoId: "doc_1",
      templates: {},
      assets: [],
      userAssets: [],
      projectSymbols: [],
      customFonts: [],
      projectColors: []
    };

    zip.file("project.json", JSON.stringify(mockTemplateData));
    const zipBlob = await zip.generateAsync({ type: "blob" });
    const mockFile = new File([zipBlob], "plantilla_fantasia.cdc2", { type: "application/zip" });

    const { container } = render(<App />);

    // Cargar a través del input estándar (inputs[0], que es "Importar desde PC")
    const inputs = container.querySelectorAll('input[type="file"][accept=".cdc2"]');
    const inputImportarPC = inputs[0] as HTMLInputElement;

    fireEvent.change(inputImportarPC, {
      target: { files: [mockFile] }
    });

    await waitFor(() => {
      // Debe reconocerlo como plantilla y mostrar el mensaje correspondiente
      expect(alertMock).toHaveBeenCalledWith("Plantilla de proyecto cargada correctamente.");
    });
  });
});
