import { useState, useEffect, useRef } from "react";
import type { DocumentoCDC2 } from "shared";
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
  onImportarPlantillaClick: () => void;
  onShowProjectGallery?: () => void;
  onShowProjectConfig?: () => void;
  onShowProjectFonts?: () => void;
  onShowTemplatesManager?: () => void;

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
  onAddCardFromTemplate: () => void;
  onEditCardSelected: () => void;

  // Multidocumento Props
  documentos: DocumentoCDC2[];
  activeDocumentoId: string;
  onSetActiveDocumentoId: (id: string) => void;
  onAddDocumento: () => void;
  onDeleteDocumento: (id: string) => void;
  onRenameDocumento: (id: string, nuevoNombre: string) => void;
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
  onImportarPlantillaClick,
  onShowProjectGallery,
  onShowProjectConfig,
  onShowProjectFonts,
  onShowTemplatesManager,
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
  onAddCardFromTemplate,
  onEditCardSelected,
  documentos,
  activeDocumentoId,
  onSetActiveDocumentoId,
  onAddDocumento,
  onDeleteDocumento,
  onRenameDocumento,
}: MenuBarProps) {
  const [editingDocId, setEditingDocId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState<string>("");
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
              <button className="menu-item" onClick={() => handleAction(onAddDocumento)}>
                <span className="menu-item-icon">➕</span> Nueva Página
              </button>
              <button className="menu-item" onClick={() => handleAction(onCargarProyectoClick)}>
                <span className="menu-item-icon">📂</span> Abrir Proyecto...
              </button>
              <button className="menu-item" onClick={() => handleAction(onImportarPlantillaClick)}>
                <span className="menu-item-icon">📥</span> Importar Plantilla (.cdc2t)...
              </button>
              <button
                className="menu-item"
                onClick={() => handleAction(onGuardarProyecto)}
                disabled={cartasCount === 0}
              >
                <span className="menu-item-icon">💾</span> Guardar Proyecto
              </button>

              <button
                className="menu-item"
                onClick={() => handleAction(onShowProjectConfig || (() => {}))}
              >
                <span className="menu-item-icon">⚙️</span> Configuración del Proyecto...
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
              <button className="menu-item" onClick={() => handleAction(onAddCardFromTemplate)}>
                <span className="menu-item-icon">✨</span> Añadir Carta desde Plantilla...
              </button>
              <button className="menu-item" onClick={() => handleAction(onEditCardSelected)} disabled={selectedCount !== 1}>
                <span className="menu-item-icon">✏️</span> Editar Carta Seleccionada...
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

        {/* Menú Recursos */}
        <div className={`menu-group ${activeDropdown === "recursos" ? "active" : ""}`}>
          <button
            className="menu-trigger"
            onClick={() => handleMenuClick("recursos")}
            onMouseEnter={() => handleMenuMouseEnter("recursos")}
          >
            Recursos
          </button>
          {activeDropdown === "recursos" && (
            <div className="menu-dropdown">
              <button
                className="menu-item"
                onClick={() => handleAction(onShowProjectGallery || (() => {}))}
              >
                <span className="menu-item-icon">🖼️</span> Galería del Proyecto...
              </button>
              <button
                className="menu-item"
                onClick={() => handleAction(onShowProjectFonts || (() => {}))}
              >
                <span className="menu-item-icon">🔤</span> Tipografías del Proyecto...
              </button>
              <button
                className="menu-item"
                onClick={() => handleAction(onShowTemplatesManager || (() => {}))}
              >
                <span className="menu-item-icon">📋</span> Gestor de Plantillas...
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
                  handleAction(() => setZoomFactor((z) => Math.min(9.0, z + 0.2)))
                }
                disabled={zoomFactor >= 9.0}
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

      {/* Pestañas de documentos en el centro */}
      <div className="menu-bar-documents">
        <div className="documents-scroll-container">
          {documentos.map((doc) => {
            const isActive = doc.id === activeDocumentoId;
            const isEditing = editingDocId === doc.id;

            return (
              <div
                key={doc.id}
                className={`document-tab ${isActive ? "active" : ""}`}
                title={doc.nombre}
                onClick={() => !isEditing && onSetActiveDocumentoId(doc.id)}
                onDoubleClick={() => {
                  if (isActive) {
                    setEditingDocId(doc.id);
                    setRenameValue(doc.nombre);
                  }
                }}
              >
                <span className="document-tab-icon">📄</span>
                {isEditing ? (
                  <input
                    type="text"
                    className="document-tab-rename-input"
                    value={renameValue}
                    onChange={(e) => setRenameValue(e.target.value)}
                    onBlur={() => {
                      if (renameValue.trim()) {
                        onRenameDocumento(doc.id, renameValue.trim());
                      }
                      setEditingDocId(null);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        if (renameValue.trim()) {
                          onRenameDocumento(doc.id, renameValue.trim());
                        }
                        setEditingDocId(null);
                      } else if (e.key === "Escape") {
                        setEditingDocId(null);
                      }
                    }}
                    autoFocus
                  />
                ) : (
                  <span className="document-tab-label">{doc.nombre}</span>
                )}
                {documentos.length > 1 && !isEditing && (
                  <button
                    type="button"
                    className="document-tab-close-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (confirm(`¿Estás seguro de eliminar el documento "${doc.nombre}"?`)) {
                        onDeleteDocumento(doc.id);
                      }
                    }}
                    title="Eliminar documento"
                  >
                    ×
                  </button>
                )}
              </div>
            );
          })}
          <button
            type="button"
            className="document-tab-add-btn"
            onClick={onAddDocumento}
            title="Añadir nuevo documento"
          >
            ➕
          </button>
        </div>
      </div>

      <div className="menu-bar-status">
        <span className="status-badge info-badge">Hojas: {paginasCount}</span>
        <span className="status-badge">Cartas: {cartasCount}</span>
        <span className="status-badge info-badge">Zoom: {zoomFactor.toFixed(1)}x</span>
      </div>
    </div>
  );
}

