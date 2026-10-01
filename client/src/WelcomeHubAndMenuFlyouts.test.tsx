// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor, cleanup } from "@testing-library/react";
import App from "./App";
import MenuBar from "./MenuBar";
import { AuthContext } from "./AuthContext";

describe("SRS-066: Welcome Hub and MenuBar Flyouts", () => {
  afterEach(() => {
    cleanup();
  });

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

  it("renderiza el Welcome Hub con las 4 opciones cuadradas para usuario anónimo", () => {
    render(<App />);

    // 1. Título del Hub
    expect(screen.getByText("Card Deck Crafter")).toBeTruthy();
    expect(screen.getByText("Selecciona una opción para comenzar a trabajar en tus cartas")).toBeTruthy();

    // 2. Opción 1: Iniciar Sesión (para anónimo en el Hub y en el menú)
    expect(screen.getAllByText("Iniciar Sesión").length).toBeGreaterThanOrEqual(1);

    // 3. Opción 2: Abrir desde PC
    expect(screen.getByText("Abrir desde PC")).toBeTruthy();

    // 4. Opción 3: Abrir desde la Nube
    expect(screen.getByText("Abrir desde la Nube")).toBeTruthy();
    expect(screen.getByText("🔒 Requiere Login")).toBeTruthy();

    // 5. Opción 4: Crear Nuevo Proyecto
    const createProjectCard = screen.getByText("Crear Nuevo Proyecto");
    expect(createProjectCard).toBeTruthy();

    // Al hacer clic en Crear Nuevo Proyecto se abre el formulario secundario
    fireEvent.click(createProjectCard);
    expect(screen.getByText("Ajustes de Página")).toBeTruthy();
    expect(screen.getByText("Dimensiones de Carta")).toBeTruthy();

    // El botón '← Volver' permite regresar al Hub de bienvenida
    const backBtn = screen.getByText("← Volver");
    expect(backBtn).toBeTruthy();
    fireEvent.click(backBtn);

    // Debe volver al Hub de bienvenida
    expect(screen.getByText("Card Deck Crafter")).toBeTruthy();
    expect(screen.getByText("Abrir desde PC")).toBeTruthy();
  });

  it("renderiza MenuBar con submenús en cascada (flyouts) para Abrir y Guardar Proyecto", () => {
    const mockOnNuevoProyecto = vi.fn();
    const mockOnCargar = vi.fn();
    const mockOnGuardar = vi.fn();

    const mockAuthValue: any = {
      user: { id: "u1", email: "card@test.com", role: "user" as const },
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

    render(
      <AuthContext.Provider value={mockAuthValue}>
        <MenuBar
          {...({
            onNuevoProyecto: mockOnNuevoProyecto,
            onCargarProyectoClick: mockOnCargar,
            onImportarPlantillaClick: vi.fn(),
            onGuardarProyecto: mockOnGuardar,
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
            cartasCount: 5,
          } as any)}
        />
      </AuthContext.Provider>
    );

    // Abrir menú Archivo
    const archivoBtn = screen.getByText("Archivo");
    fireEvent.click(archivoBtn);

    // Opciones del submenú
    const abrirProyectoItem = screen.getByText("Abrir Proyecto");
    expect(abrirProyectoItem).toBeTruthy();

    const guardarProyectoItem = screen.getByText("Guardar Proyecto");
    expect(guardarProyectoItem).toBeTruthy();

    // Pasar el ratón por Abrir Proyecto debe activar el flyout submenu
    fireEvent.mouseEnter(abrirProyectoItem.parentElement!);
    expect(screen.getByText("Importar desde PC (.cdc2)...")).toBeTruthy();
    expect(screen.getByText("Abrir desde la Nube...")).toBeTruthy();

    // Pasar el ratón por Guardar Proyecto debe activar su submenu
    fireEvent.mouseEnter(guardarProyectoItem.parentElement!);
    expect(screen.getByText("Exportar a PC (.cdc2)")).toBeTruthy();
    expect(screen.getByText("Guardar en la Nube...")).toBeTruthy();
  });

  it("renderiza 'Hola, usuario' cuando el usuario está logueado y no es admin", async () => {
    global.fetch = vi.fn().mockImplementation((url: string) => {
      if (typeof url === "string" && url.includes("/api/auth/me")) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ user: { id: "u2", email: "jugador@test.com", role: "user" } })
        } as Response);
      }
      if (typeof url === "string" && url.includes("/api/auth/status")) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ hasUsers: true })
        } as Response);
      }
      if (typeof url === "string" && url.includes("/api/user/storage")) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ quotaMb: 100, quotaBytes: 104857600, usedBytes: 10485760, usedMb: 10, availableBytes: 94371840, availableMb: 90, percentUsed: 10 })
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

    render(<App />);

    await waitFor(() => {
      expect(screen.getByText("Hola, jugador")).toBeTruthy();
    });
  });

  it("renderiza 'Panel de Administración' cuando el usuario está logueado como admin", async () => {
    global.fetch = vi.fn().mockImplementation((url: string) => {
      if (typeof url === "string" && url.includes("/api/auth/me")) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ user: { id: "admin1", email: "jefe@test.com", role: "admin" } })
        } as Response);
      }
      if (typeof url === "string" && url.includes("/api/auth/status")) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ hasUsers: true })
        } as Response);
      }
      if (typeof url === "string" && url.includes("/api/user/storage")) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ quotaMb: 100, quotaBytes: 104857600, usedBytes: 0, usedMb: 0, availableBytes: 104857600, availableMb: 100, percentUsed: 0 })
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

    render(<App />);

    await waitFor(() => {
      expect(screen.getByText("Panel de Administración")).toBeTruthy();
    });
  });

  it("al pulsar Nuevo Proyecto desde el menú superior, abre el popup de configuración de proyecto directamente", async () => {
    window.confirm = vi.fn().mockReturnValue(true);
    render(<App />);

    // 1. Crear proyecto inicial desde el Hub
    fireEvent.click(screen.getByText("Crear Nuevo Proyecto"));
    fireEvent.click(screen.getByText("✨ Crear Proyecto"));

    // El editor ya está visible
    expect(screen.queryByText("Card Deck Crafter")).toBeNull();

    // 2. Abrir menú Archivo y pulsar Nuevo Proyecto
    const archivoBtn = screen.getByText("Archivo");
    fireEvent.click(archivoBtn);

    const nuevoProyectoItem = screen.getByText("Nuevo Proyecto");
    fireEvent.click(nuevoProyectoItem);

    // Debe abrir directamente el popup de crear nuevo proyecto
    expect(screen.getByText("Datos del Proyecto")).toBeTruthy();
    expect(screen.getByText("Ajustes de Página")).toBeTruthy();
    expect(screen.getByText("✨ Crear Proyecto")).toBeTruthy();
    expect(screen.queryByText("Selecciona una opción para comenzar a trabajar en tus cartas")).toBeNull();
  });
});
