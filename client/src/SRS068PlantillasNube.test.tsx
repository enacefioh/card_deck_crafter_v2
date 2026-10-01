// @vitest-environment happy-dom
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor, cleanup } from "@testing-library/react";
import MenuBar from "./MenuBar";
import { CloudProjectsModal } from "./components/CloudProjectsModal";
import { SaveCloudModal } from "./components/SaveCloudModal";
import { AuthContext } from "./AuthContext";
import type { CloudProjectMetadata, CloudTemplateMetadata, UserStorageInfo } from "shared";

describe("SRS-068: Plantillas de Proyecto en la Nube y Almacenamiento Separado", () => {
  afterEach(() => {
    cleanup();
  });

  const mockUser = { id: "u1", email: "user@test.com", role: "user" as const };
  const mockAuthValue: any = {
    user: mockUser,
    status: { hasUsers: true, initialSetupDone: true },
    loading: false,
    setShowLoginModal: vi.fn(),
    logout: vi.fn()
  };

  const mockStorageInfo: UserStorageInfo = {
    usedBytes: 1048576,
    usedMb: 1,
    quotaBytes: 52428800,
    quotaMb: 50,
    availableBytes: 51380224,
    availableMb: 49,
    percentUsed: 2
  };

  const mockTemplates: CloudTemplateMetadata[] = [
    {
      id: "tmpl_1",
      userId: "u1",
      filename: "tmpl_1.cdc2",
      name: "Plantilla Criaturas Fantásticas",
      description: "Diseño para cartas de criaturas y bestias",
      documentCount: 1,
      templateCount: 3,
      fileSizeBytes: 204800,
      createdAt: "2026-10-01T12:00:00Z",
      updatedAt: "2026-10-01T12:00:00Z"
    }
  ];

  const mockProjects: CloudProjectMetadata[] = [
    {
      id: "proj_1",
      userId: "u1",
      filename: "proj_1.cdc2",
      name: "Baraja Hechizos v1",
      description: "Proyecto con cartas completas",
      cardCount: 20,
      documentCount: 1,
      fileSizeBytes: 524288,
      createdAt: "2026-10-01T10:00:00Z",
      updatedAt: "2026-10-01T10:00:00Z"
    }
  ];

  it("RF-5: MenuBar ofrece opciones para abrir y guardar plantillas en la nube", () => {
    const onOpenCloudTemplates = vi.fn();
    const onSaveCloudTemplate = vi.fn();
    const onSaveCloudTemplateAs = vi.fn();

    render(
      <AuthContext.Provider value={mockAuthValue}>
        <MenuBar
          {...({
            onNuevoProyecto: vi.fn(),
            onCargarProyectoClick: vi.fn(),
            onGuardarProyecto: vi.fn(),
            onOpenCloudTemplates,
            onSaveCloudTemplate,
            onSaveCloudTemplateAs,
            documentos: [],
            activeDocumentoId: "",
            onSetActiveDocumentoId: vi.fn(),
            onDeleteDocumento: vi.fn(),
            onRenameDocumento: vi.fn(),
            cartasCount: 0,
            paginasCount: 1,
            zoomFactor: 1,
            setZoomFactor: vi.fn(),
            lineasCorteContinuas: false,
            setLineasCorteContinuas: vi.fn(),
            marcasCorteEsquinas: false,
            setMarcasCorteEsquinas: vi.fn(),
            onFocusLienzoConfig: vi.fn(),
            onFocusCartaConfig: vi.fn(),
            onImportarPlantillaClick: vi.fn(),
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
            onAddDocumento: vi.fn(),
            onImportarImagenesClick: vi.fn(),
            onExportarPdf: vi.fn(),
            exportandoPdf: false
          } as any)}
        />
      </AuthContext.Provider>
    );

    // Abrir menú Archivo
    fireEvent.click(screen.getByText("Archivo"));

    // Submenú Abrir Proyecto
    const abrirSubmenu = screen.getByText("Abrir Proyecto");
    fireEvent.mouseEnter(abrirSubmenu);

    // Debe existir "Abrir Plantilla desde la Nube..."
    const abrirPlantillaBtn = screen.getByText(/Abrir Plantilla desde la Nube/i);
    expect(abrirPlantillaBtn).toBeDefined();
    fireEvent.click(abrirPlantillaBtn);
    expect(onOpenCloudTemplates).toHaveBeenCalled();

    // Reabrir Archivo para probar Guardar Proyecto
    fireEvent.click(screen.getByText("Archivo"));
    const guardarSubmenu = screen.getByText("Guardar Proyecto");
    fireEvent.mouseEnter(guardarSubmenu);

    // Debe existir "Guardar Plantilla en la Nube..." y "Guardar Plantilla en la Nube Como..."
    const guardarPlantillaBtn = screen.getByText(/Guardar Plantilla en la Nube\.\.\./i);
    expect(guardarPlantillaBtn).toBeDefined();
    fireEvent.click(guardarPlantillaBtn);
    expect(onSaveCloudTemplate).toHaveBeenCalled();

    fireEvent.click(screen.getByText("Archivo"));
    fireEvent.mouseEnter(screen.getByText("Guardar Proyecto"));
    const guardarPlantillaComoBtn = screen.getByText(/Guardar Plantilla en la Nube Como\.\.\./i);
    expect(guardarPlantillaComoBtn).toBeDefined();
    fireEvent.click(guardarPlantillaComoBtn);
    expect(onSaveCloudTemplateAs).toHaveBeenCalled();
  });

  it("RF-6: CloudProjectsModal permite cambiar a la pestaña 'Mis Plantillas' y muestra acciones dedicadas", async () => {
    vi.stubGlobal("fetch", vi.fn().mockImplementation((url: string) => {
      if (url.includes("/api/user/projects")) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ projects: mockProjects })
        });
      }
      if (url.includes("/api/user/templates")) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ templates: mockTemplates })
        });
      }
      return Promise.reject(new Error("URL no mockeada"));
    }));

    const mockOnUseTemplate = vi.fn();
    const mockOnExportTemplate = vi.fn();

    render(
      <CloudProjectsModal
        isOpen={true}
        onClose={vi.fn()}
        storageInfo={mockStorageInfo}
        initialTab="templates"
        onOpenProject={vi.fn()}
        onExportProject={vi.fn()}
        onUseTemplate={mockOnUseTemplate}
        onExportTemplate={mockOnExportTemplate}
        onStorageUpdated={vi.fn()}
      />
    );

    // Comprobar que ambas pestañas existen
    expect(screen.getByText(/Mis Proyectos/i)).toBeDefined();
    expect(screen.getByText(/Mis Plantillas/i)).toBeDefined();

    // Esperar a que cargue la lista de plantillas
    await waitFor(() => {
      expect(screen.getByText("Plantilla Criaturas Fantásticas")).toBeDefined();
    });

    // Comprobar detalles de la plantilla
    expect(screen.getByText(/3 diseños/i)).toBeDefined();
    expect(screen.getByText(/0 cartas/i)).toBeDefined();

    // Botón "Usar Plantilla"
    const useBtn = screen.getByText(/Usar Plantilla/i);
    expect(useBtn).toBeDefined();
    fireEvent.click(useBtn);

    expect(mockOnUseTemplate).toHaveBeenCalledWith(mockTemplates[0]);
  });

  it("RF-5: SaveCloudModal en modo plantilla muestra datos limpios y ejecuta guardado", async () => {
    const mockOnConfirmSave = vi.fn().mockResolvedValue(undefined);

    render(
      <SaveCloudModal
        isOpen={true}
        onClose={vi.fn()}
        initialName="Plantilla de Prueba"
        cardCount={15} // En el proyecto hay 15 cartas
        documentCount={2}
        templateCount={4}
        isTemplateMode={true} // Pero en modo plantilla se limpia
        storageInfo={mockStorageInfo}
        isSaving={false}
        estimatedSizeBytes={262144} // 0.25 MB real
        onConfirmSave={mockOnConfirmSave}
        onExportLocal={vi.fn()}
      />
    );

    // Título específico de plantilla
    expect(screen.getByRole("heading", { name: /Guardar Plantilla en la Nube/i })).toBeDefined();
    // Indicador de 0 cartas (plantilla limpia)
    expect(screen.getByText("🧼 0 cartas (plantilla limpia)")).toBeDefined();
    expect(screen.getByText(/4 diseños/i)).toBeDefined();
    expect(screen.getByText(/0\.25 MB/i)).toBeDefined();

    // Enviar formulario
    const submitBtn = screen.getByRole("button", { name: /Guardar Plantilla en la Nube/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(mockOnConfirmSave).toHaveBeenCalledWith({
        name: "Plantilla de Prueba",
        description: ""
      });
    });
  });

  it("RF-3: SaveCloudModal detecta cuota insuficiente y deshabilita el guardado ofreciendo exportar localmente", () => {
    const mockOnExportLocal = vi.fn();
    const storageInfoCasiLleno: UserStorageInfo = {
      usedBytes: 52000000,
      usedMb: 49.5,
      quotaBytes: 52428800,
      quotaMb: 50,
      availableBytes: 428800, // Solo ~0.4 MB libres
      availableMb: 0.4,
      percentUsed: 99
    };

    render(
      <SaveCloudModal
        isOpen={true}
        onClose={vi.fn()}
        initialName="Proyecto Muy Pesado"
        cardCount={30}
        documentCount={3}
        isTemplateMode={false}
        storageInfo={storageInfoCasiLleno}
        isSaving={false}
        estimatedSizeBytes={10485760} // Ocupa 10 MB (supera los 0.4 MB libres)
        onConfirmSave={vi.fn()}
        onExportLocal={mockOnExportLocal}
      />
    );

    // Debe mostrar aviso de cuota insuficiente
    expect(screen.getByText(/Cuota de Almacenamiento Insuficiente/i)).toBeDefined();
    expect(screen.getByText(/10\.00 MB y solo dispones de 0\.4 MB libres/i)).toBeDefined();

    // Botón de guardar debe estar deshabilitado
    const submitBtn = screen.getByRole("button", { name: /Guardar en la Nube/i });
    expect((submitBtn as HTMLButtonElement).disabled).toBe(true);

    // Botón de exportar a PC local
    const exportLocalBtn = screen.getByText(/Exportar a mi PC en su lugar/i);
    expect(exportLocalBtn).toBeDefined();
    fireEvent.click(exportLocalBtn);
    expect(mockOnExportLocal).toHaveBeenCalled();
  });
});
