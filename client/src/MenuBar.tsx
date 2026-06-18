import { useState, useEffect, useRef } from "react";
import "./MenuBar.css";

interface MenuBarProps {
  onNuevoProyecto: () => void;
  onCargarProyectoClick: () => void;
  onGuardarProyecto: () => void;
  onImportarImagenesClick: () => void;
  onExportarPdf: () => void;
  exportandoPdf: boolean;
  cartasCount: number;
  paginasCount: number;
  zoomFactor: number;
  setZoomFactor: (zoom: number | ((prev: number) => number)) => void;
  lineasCorteContinuas: boolean;
  setLineasCorteContinuas: (val: boolean | ((prev: boolean) => boolean)) => void;
  marcasCorteEsquinas: boolean;
  setMarcasCorteEsquinas: (val: boolean | ((prev: boolean) => boolean)) => void;
  onFocusLienzoConfig: () => void;
  onFocusCartaConfig: () => void;

  // Acciones de Selección
  selectedCount: number;
  puedeMoverArriba: boolean;
  puedeMoverAbajo: boolean;
  onSelectAll: () => void;
  onDeselectAll: () => void;
  onInvertSelection: () => void;
  onDuplicarSeleccion: () => void;
  onEliminarSeleccion: () => void;
  onMoverSeleccionArriba: () => void;
  onMoverSeleccionAbajo: () => void;
}

export default function MenuBar({
  onNuevoProyecto,
  onCargarProyectoClick,
  onGuardarProyecto,
  onImportarImagenesClick,
  onExportarPdf,
  exportandoPdf,
  cartasCount,
  paginasCount,
  zoomFactor,
  setZoomFactor,
  lineasCorteContinuas,
  setLineasCorteContinuas,
  marcasCorteEsquinas,
  setMarcasCorteEsquinas,
  onFocusLienzoConfig,
  onFocusCartaConfig,
  selectedCount,
  puedeMoverArriba,
  puedeMoverAbajo,
  onSelectAll,
  onDeselectAll,
  onInvertSelection,
  onDuplicarSeleccion,
  onEliminarSeleccion,
  onMoverSeleccionArriba,
  onMoverSeleccionAbajo,
}: MenuBarProps) {
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const menuBarRef = useRef<HTMLDivElement>(null);

  // Cerrar menú al hacer click fuera
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuBarRef.current && !menuBarRef.current.contains(event.target as Node)) {
        setActiveDropdown(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Cerrar al pulsar Escape
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setActiveDropdown(null);
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  const handleMenuClick = (menuName: string) => {
    setActiveDropdown((prev) => (prev === menuName ? null : menuName));
  };

  const handleMenuMouseEnter = (menuName: string) => {
    if (activeDropdown !== null) {
      setActiveDropdown(menuName);
    }
  };

  const handleAction = (action: () => void) => {
    setActiveDropdown(null);
    action();
  };

  return (
    <div className="menu-bar" ref={menuBarRef}>
      <div className="menu-bar-brand">
        <span className="brand-logo">🎴</span>
        <span className="brand-text">Card Deck Crafter v2</span>
      </div>

      <nav className="menu-bar-nav">
        {/* Menú Archivo */}
        <div className={`menu-group ${activeDropdown === "archivo" ? "active" : ""}`}>
          <button
            className="menu-trigger"
            onClick={() => handleMenuClick("archivo")}
            onMouseEnter={() => handleMenuMouseEnter("archivo")}
          >
            Archivo
          </button>
          {activeDropdown === "archivo" && (
            <div className="menu-dropdown">
              <button className="menu-item" onClick={() => handleAction(onNuevoProyecto)}>
                <span className="menu-item-icon">📄</span> Nuevo Proyecto
              </button>
              <button className="menu-item" onClick={() => handleAction(onCargarProyectoClick)}>
                <span className="menu-item-icon">📂</span> Abrir Proyecto...
              </button>
              <button
                className="menu-item"
                onClick={() => handleAction(onGuardarProyecto)}
                disabled={cartasCount === 0}
              >
                <span className="menu-item-icon">💾</span> Guardar Proyecto
              </button>
              <div className="menu-separator" />
              <button className="menu-item" onClick={() => handleAction(onImportarImagenesClick)}>
                <span className="menu-item-icon">📥</span> Importar Ilustraciones...
              </button>
              <button
                className="menu-item menu-item-primary"
                onClick={() => handleAction(onExportarPdf)}
                disabled={exportandoPdf || cartasCount === 0}
              >
                <span className="menu-item-icon">{exportandoPdf ? "⏳" : "📥"}</span> Exportar PDF
              </button>
            </div>
          )}
        </div>

        {/* Menú Edición */}
        <div className={`menu-group ${activeDropdown === "edicion" ? "active" : ""}`}>
          <button
            className="menu-trigger"
            onClick={() => handleMenuClick("edicion")}
            onMouseEnter={() => handleMenuMouseEnter("edicion")}
          >
            Edición
          </button>
          {activeDropdown === "edicion" && (
            <div className="menu-dropdown">
              <button className="menu-item" onClick={() => handleAction(onSelectAll)} disabled={cartasCount === 0}>
                <span className="menu-item-icon">☑️</span> Seleccionar Todo <span className="menu-item-shortcut">Ctrl+A</span>
              </button>
              <button className="menu-item" onClick={() => handleAction(onDeselectAll)} disabled={selectedCount === 0}>
                <span className="menu-item-icon">⬜</span> Deseleccionar Todo <span className="menu-item-shortcut">Esc</span>
              </button>
              <button className="menu-item" onClick={() => handleAction(onInvertSelection)} disabled={cartasCount === 0}>
                <span className="menu-item-icon">🔄</span> Invertir Selección <span className="menu-item-shortcut">Ctrl+I</span>
              </button>
              <div className="menu-separator" />
              <button className="menu-item" onClick={() => handleAction(onDuplicarSeleccion)} disabled={selectedCount === 0}>
                <span className="menu-item-icon">👥</span> Duplicar Selección <span className="menu-item-shortcut">Ctrl+D</span>
              </button>
              <button className="menu-item" onClick={() => handleAction(onEliminarSeleccion)} disabled={selectedCount === 0}>
                <span className="menu-item-icon">🗑️</span> Eliminar Selección <span className="menu-item-shortcut">Supr</span>
              </button>
              <div className="menu-separator" />
              <button className="menu-item" onClick={() => handleAction(onMoverSeleccionArriba)} disabled={!puedeMoverArriba}>
                <span className="menu-item-icon">⬆️</span> Mover Selección Arriba <span className="menu-item-shortcut">Alt+↑</span>
              </button>
              <button className="menu-item" onClick={() => handleAction(onMoverSeleccionAbajo)} disabled={!puedeMoverAbajo}>
                <span className="menu-item-icon">⬇️</span> Mover Selección Abajo <span className="menu-item-shortcut">Alt+↓</span>
              </button>
              <div className="menu-separator" />
              <button className="menu-item" onClick={() => handleAction(onFocusLienzoConfig)}>
                <span className="menu-item-icon">⚙️</span> Configurar Hoja / Lienzo
              </button>
              <button className="menu-item" onClick={() => handleAction(onFocusCartaConfig)}>
                <span className="menu-item-icon">📏</span> Configurar Dimensiones de Carta
              </button>
            </div>
          )}
        </div>

        {/* Menú Ver */}
        <div className={`menu-group ${activeDropdown === "ver" ? "active" : ""}`}>
          <button
            className="menu-trigger"
            onClick={() => handleMenuClick("ver")}
            onMouseEnter={() => handleMenuMouseEnter("ver")}
          >
            Ver
          </button>
          {activeDropdown === "ver" && (
            <div className="menu-dropdown">
              <button
                className="menu-item"
                onClick={() =>
                  handleAction(() => setZoomFactor((z) => Math.min(4.5, z + 0.2)))
                }
                disabled={zoomFactor >= 4.5}
              >
                <span className="menu-item-icon">➕</span> Acercar Zoom <span className="menu-item-shortcut">Alt+Plus</span>
              </button>
              <button
                className="menu-item"
                onClick={() =>
                  handleAction(() => setZoomFactor((z) => Math.max(1.0, z - 0.2)))
                }
                disabled={zoomFactor <= 1.0}
              >
                <span className="menu-item-icon">➖</span> Alejar Zoom <span className="menu-item-shortcut">Alt+Minus</span>
              </button>
              <div className="menu-separator" />
              <button
                className="menu-item checkbox-item"
                onClick={() => setLineasCorteContinuas((prev) => !prev)}
              >
                <span className="menu-item-checkbox">{lineasCorteContinuas ? "✓" : ""}</span>
                Líneas de Corte Continuas
              </button>
              <button
                className="menu-item checkbox-item"
                onClick={() => setMarcasCorteEsquinas((prev) => !prev)}
              >
                <span className="menu-item-checkbox">{marcasCorteEsquinas ? "✓" : ""}</span>
                Marcas de Corte en Esquinas
              </button>
            </div>
          )}
        </div>
      </nav>

      <div className="menu-bar-status">
        <span className="status-badge info-badge">Hojas: {paginasCount}</span>
        <span className="status-badge">Cartas: {cartasCount}</span>
        <span className="status-badge info-badge">Zoom: {zoomFactor.toFixed(1)}x</span>
      </div>
    </div>
  );
}

