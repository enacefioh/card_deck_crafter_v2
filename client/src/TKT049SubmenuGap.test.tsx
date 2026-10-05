// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, act, cleanup } from "@testing-library/react";
import MenuBar from "./MenuBar";
import { AuthContext } from "./AuthContext";

describe("TKT-049: Submenús Desplegables con margen de gracia y puente hover", () => {
  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  beforeEach(() => {
    vi.useFakeTimers();
  });

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

  it("mantiene el submenú abierto durante el margen de gracia al salir del contenedor y se cancela si vuelve a entrar", () => {
    render(
      <AuthContext.Provider value={mockAuthValue}>
        <MenuBar
          {...({
            onNuevoProyecto: vi.fn(),
            onCargarProyectoClick: vi.fn(),
            onImportarPlantillaClick: vi.fn(),
            onGuardarProyecto: vi.fn(),
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

    // 1. Abrir menú Archivo
    fireEvent.click(screen.getByText("Archivo"));

    // 2. Entrar con el ratón en "Abrir Proyecto"
    const abrirItem = screen.getByText("Abrir Proyecto").closest(".menu-item-submenu")!;
    fireEvent.mouseEnter(abrirItem);

    // Debe mostrar las opciones del submenú
    expect(screen.getByText("Importar desde PC (.cdc2)...")).toBeTruthy();

    // 3. Simular que el ratón sale brevemente (mouseleave) cruzando el gap hacia el submenú
    fireEvent.mouseLeave(abrirItem);

    // Inmediatamente (0ms transcurridos), el submenú NO debe cerrarse debido al margen de gracia
    expect(screen.getByText("Importar desde PC (.cdc2)...")).toBeTruthy();

    // Avanzar 100ms (menos de los 180ms de gracia): sigue abierto
    act(() => {
      vi.advanceTimersByTime(100);
    });
    expect(screen.getByText("Importar desde PC (.cdc2)...")).toBeTruthy();

    // Re-entrar al submenú antes de que expire el temporizador: cancela el cierre
    fireEvent.mouseEnter(abrirItem);
    act(() => {
      vi.advanceTimersByTime(150);
    });
    expect(screen.getByText("Importar desde PC (.cdc2)...")).toBeTruthy();

    // Ahora salir definitivamente y dejar pasar el tiempo completo (>180ms)
    fireEvent.mouseLeave(abrirItem);
    act(() => {
      vi.advanceTimersByTime(200);
    });

    // Ahora sí debe haberse cerrado
    expect(screen.queryByText("Importar desde PC (.cdc2)...")).toBeNull();
  });

  it("cierra el submenú inmediatamente al pasar el cursor a otro elemento regular del menú principal", () => {
    render(
      <AuthContext.Provider value={mockAuthValue}>
        <MenuBar
          {...({
            onNuevoProyecto: vi.fn(),
            onCargarProyectoClick: vi.fn(),
            onImportarPlantillaClick: vi.fn(),
            onGuardarProyecto: vi.fn(),
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

    // Abrir menú Archivo y entrar en Guardar Proyecto
    fireEvent.click(screen.getByText("Archivo"));
    const guardarItem = screen.getByText("Guardar Proyecto").closest(".menu-item-submenu")!;
    fireEvent.mouseEnter(guardarItem);
    expect(screen.getByText("Exportar a PC (.cdc2)")).toBeTruthy();

    // Al pasar el cursor a "Nuevo Proyecto", se debe cerrar inmediatamente sin esperar
    const nuevoProyectoBtn = screen.getByText("Nuevo Proyecto");
    fireEvent.mouseEnter(nuevoProyectoBtn);

    expect(screen.queryByText("Exportar a PC (.cdc2)")).toBeNull();
  });
});
