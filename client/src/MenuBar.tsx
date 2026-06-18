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
  zoomFactor: number;
  setZoomFactor: (zoom: number | ((prev: number) => number)) => void;
  lineasCorteContinuas: boolean;
  setLineasCorteContinuas: (val: boolean | ((prev: boolean) => boolean)) => void;
  marcasCorteEsquinas: boolean;
  setMarcasCorteEsquinas: (val: boolean | ((prev: boolean) => boolean)) => void;
  onFocusLienzoConfig: () => void;
  onFocusCartaConfig: () => void;
}

export default function MenuBar({
  onNuevoProyecto,
  onCargarProyectoClick,
  onGuardarProyecto,
  onImportarImagenesClick,
  onExportarPdf,
  exportandoPdf,
  cartasCount,
  zoomFactor,
  setZoomFactor,
  lineasCorteContinuas,
  setLineasCorteContinuas,
  marcasCorteEsquinas,
  setMarcasCorteEsquinas,
  onFocusLienzoConfig,
  onFocusCartaConfig,
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
                <span className="menu-item-icon">➕</span> Acercar Zoom
              </button>
              <button
                className="menu-item"
                onClick={() =>
                  handleAction(() => setZoomFactor((z) => Math.max(1.0, z - 0.2)))
                }
                disabled={zoomFactor <= 1.0}
              >
                <span className="menu-item-icon">➖</span> Alejar Zoom
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
        <span className="status-badge">Cartas: {cartasCount}</span>
        <span className="status-badge info-badge">Zoom: {zoomFactor.toFixed(1)}x</span>
      </div>
    </div>
  );
}
