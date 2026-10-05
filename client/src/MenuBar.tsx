import { useState, useEffect, useRef } from "react";
import type { DocumentoCDC2, UserStorageInfo } from "shared";
import "./MenuBar.css";
import { useAuth } from "./AuthContext";
import { getAvatarInitials, getAvatarColor } from "./utils/avatarUtils";

interface MenuBarProps {
  onNuevoProyecto: () => void;
  onCargarProyectoClick: () => void;
  onGuardarProyecto: () => void;
  onAbrirComoPlantillaClick?: () => void;
  onExportarPlantillaProyecto?: () => void;
  storageInfo?: UserStorageInfo | null;
  onOpenCloudProjects?: () => void;
  onOpenCloudTemplates?: () => void;
  onSaveCloudProject?: () => void;
  onSaveCloudProjectAs?: () => void;
  onSaveCloudTemplate?: () => void;
  onSaveCloudTemplateAs?: () => void;
  onImportarImagenesClick: () => void;
  onExportarPdf: () => void;
  exportandoPdf: boolean;
  onExportarPng?: () => void;
  exportandoPng?: boolean;
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
  onShowProjectColors?: () => void;
  onShowSymbolsGallery?: () => void;

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
  onAbrirComoPlantillaClick,
  onExportarPlantillaProyecto,
  onImportarImagenesClick,
  onExportarPdf,
  exportandoPdf,
  onExportarPng,
  exportandoPng,
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
  onShowProjectColors,
  onShowSymbolsGallery,
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
  storageInfo,
  onOpenCloudProjects,
  onOpenCloudTemplates,
  onSaveCloudProject,
  onSaveCloudProjectAs,
  onSaveCloudTemplate,
  onSaveCloudTemplateAs,
}: MenuBarProps) {
  const [editingDocId, setEditingDocId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState<string>("");
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const [activeSubmenu, setActiveSubmenu] = useState<string | null>(null);
  const menuBarRef = useRef<HTMLDivElement>(null);
  const submenuTimeoutRef = useRef<any>(null);

  const clearSubmenuTimer = () => {
    if (submenuTimeoutRef.current) {
      clearTimeout(submenuTimeoutRef.current);
      submenuTimeoutRef.current = null;
    }
  };

  const handleSubmenuEnter = (name: string) => {
    clearSubmenuTimer();
    setActiveSubmenu(name);
  };

  const handleSubmenuLeave = () => {
    clearSubmenuTimer();
    submenuTimeoutRef.current = setTimeout(() => {
      setActiveSubmenu(null);
    }, 180);
  };

  const handleCloseSubmenuImmediate = () => {
    clearSubmenuTimer();
    setActiveSubmenu(null);
  };

  // Cerrar menú al hacer click fuera
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuBarRef.current && !menuBarRef.current.contains(event.target as Node)) {
        setActiveDropdown(null);
        handleCloseSubmenuImmediate();
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      clearSubmenuTimer();
    };
  }, []);

  // Cerrar al pulsar Escape
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setActiveDropdown(null);
        handleCloseSubmenuImmediate();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  const handleMenuClick = (menuName: string) => {
    setActiveDropdown((prev) => (prev === menuName ? null : menuName));
    handleCloseSubmenuImmediate();
  };

  const handleMenuMouseEnter = (menuName: string) => {
    if (activeDropdown !== null) {
      setActiveDropdown(menuName);
      handleCloseSubmenuImmediate();
    }
  };

  const handleAction = (action: () => void) => {
    setActiveDropdown(null);
    handleCloseSubmenuImmediate();
    action();
  };

  // Autenticación de Usuario (SRS-062)
  const { user, setShowLoginModal, logout } = useAuth();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutsideUserMenu = (event: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setShowUserMenu(false);
      }
    };
    if (showUserMenu) {
      document.addEventListener("mousedown", handleClickOutsideUserMenu);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutsideUserMenu);
    };
  }, [showUserMenu]);

  return (
    <div className="menu-bar" ref={menuBarRef}>
      <div className="menu-bar-brand">
        <span className="brand-logo">🎴</span>
        <span className="brand-text">Card Deck Crafter v2.261005.1</span>
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
              <button
                className="menu-item"
                onClick={() => handleAction(onNuevoProyecto)}
                onMouseEnter={handleCloseSubmenuImmediate}
              >
                <span className="menu-item-icon">📄</span> Nuevo Proyecto
              </button>
              <button
                className="menu-item"
                onClick={() => handleAction(onAddDocumento)}
                onMouseEnter={handleCloseSubmenuImmediate}
              >
                <span className="menu-item-icon">➕</span> Nueva Página
              </button>

              <div className="menu-separator" />

              {/* Submenú: Abrir Proyecto */}
              <div
                className="menu-item-submenu"
                onMouseEnter={() => handleSubmenuEnter("abrir")}
                onMouseLeave={handleSubmenuLeave}
              >
                <div
                  className={`menu-item ${activeSubmenu === "abrir" ? "hover" : ""}`}
                  style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}
                >
                  <div style={{ display: "flex", alignItems: "center" }}>
                    <span className="menu-item-icon">📂</span> Abrir Proyecto
                  </div>
                  <span className="menu-item-arrow">▶</span>
                </div>
                {activeSubmenu === "abrir" && (
                  <div className="menu-submenu">
                    <button className="menu-item" onClick={() => handleAction(onCargarProyectoClick)}>
                      <span className="menu-item-icon">💻</span> Importar desde PC (.cdc2)...
                    </button>
                    <button
                      className="menu-item"
                      onClick={() => handleAction(onAbrirComoPlantillaClick || (() => {}))}
                    >
                      <span className="menu-item-icon">📐</span> Abrir desde PC como Plantilla (.cdc2)...
                    </button>
                    <button
                      className="menu-item"
                      style={{ opacity: user ? 1 : 0.6 }}
                      onClick={() =>
                        handleAction(() => {
                          if (user && onOpenCloudProjects) {
                            onOpenCloudProjects();
                          } else {
                            setShowLoginModal(true);
                          }
                        })
                      }
                    >
                      <span className="menu-item-icon">☁️</span> Abrir Proyecto desde la Nube... {!user && "🔒"}
                    </button>
                    <button
                      className="menu-item"
                      style={{ opacity: user ? 1 : 0.6 }}
                      onClick={() =>
                        handleAction(() => {
                          if (user && onOpenCloudTemplates) {
                            onOpenCloudTemplates();
                          } else {
                            setShowLoginModal(true);
                          }
                        })
                      }
                    >
                      <span className="menu-item-icon">📐☁️</span> Abrir Plantilla desde la Nube... {!user && "🔒"}
                    </button>
                  </div>
                )}
              </div>

              {/* Submenú: Guardar Proyecto */}
              <div
                className="menu-item-submenu"
                onMouseEnter={() => handleSubmenuEnter("guardar")}
                onMouseLeave={handleSubmenuLeave}
              >
                <div
                  className={`menu-item ${activeSubmenu === "guardar" ? "hover" : ""}`}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center"
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center" }}>
                    <span className="menu-item-icon">💾</span> Guardar Proyecto
                  </div>
                  <span className="menu-item-arrow">▶</span>
                </div>
                {activeSubmenu === "guardar" && (
                  <div className="menu-submenu">
                    <button className="menu-item" onClick={() => handleAction(onGuardarProyecto)}>
                      <span className="menu-item-icon">💻</span> Exportar a PC (.cdc2)
                    </button>
                    <button
                      className="menu-item"
                      onClick={() => handleAction(onExportarPlantillaProyecto || (() => {}))}
                    >
                      <span className="menu-item-icon">📐</span> Exportar Plantilla de Proyecto (.cdc2)
                    </button>
                    <button
                      className="menu-item"
                      style={{ opacity: user ? 1 : 0.6 }}
                      onClick={() =>
                        handleAction(() => {
                          if (user && onSaveCloudProject) {
                            onSaveCloudProject();
                          } else {
                            setShowLoginModal(true);
                          }
                        })
                      }
                    >
                      <span className="menu-item-icon">☁️</span> Guardar Proyecto en la Nube... {!user && "🔒"}
                    </button>
                    <button
                      className="menu-item"
                      style={{ opacity: user ? 1 : 0.6 }}
                      onClick={() =>
                        handleAction(() => {
                          if (user && onSaveCloudProjectAs) {
                            onSaveCloudProjectAs();
                          } else {
                            setShowLoginModal(true);
                          }
                        })
                      }
                    >
                      <span className="menu-item-icon">📑☁️</span> Guardar Proyecto en la Nube Como... {!user && "🔒"}
                    </button>
                    <button
                      className="menu-item"
                      style={{ opacity: user ? 1 : 0.6 }}
                      onClick={() =>
                        handleAction(() => {
                          if (user && onSaveCloudTemplate) {
                            onSaveCloudTemplate();
                          } else {
                            setShowLoginModal(true);
                          }
                        })
                      }
                    >
                      <span className="menu-item-icon">📐☁️</span> Guardar Plantilla en la Nube... {!user && "🔒"}
                    </button>
                    <button
                      className="menu-item"
                      style={{ opacity: user ? 1 : 0.6 }}
                      onClick={() =>
                        handleAction(() => {
                          if (user && onSaveCloudTemplateAs) {
                            onSaveCloudTemplateAs();
                          } else {
                            setShowLoginModal(true);
                          }
                        })
                      }
                    >
                      <span className="menu-item-icon">📑📐</span> Guardar Plantilla en la Nube Como... {!user && "🔒"}
                    </button>
                  </div>
                )}
              </div>

              <div className="menu-separator" />

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
              <button
                className="menu-item"
                onClick={() => handleAction(onExportarPng || (() => {}))}
                disabled={exportandoPng || cartasCount === 0}
              >
                <span className="menu-item-icon">{exportandoPng ? "⏳" : "🖼️"}</span> {exportandoPng ? "Exportando imágenes..." : "Exportar Imágenes (PNG)..."}
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
              <button
                className="menu-item"
                onClick={() => handleAction(onImportarPlantillaClick)}
              >
                <span className="menu-item-icon">📥</span> Importar Plantilla (.cdc2t)...
              </button>
              <button
                className="menu-item"
                onClick={() => handleAction(onShowProjectColors || (() => {}))}
              >
                <span className="menu-item-icon">🎨</span> Colores del Proyecto...
              </button>
              <button
                className="menu-item"
                onClick={() => handleAction(onShowSymbolsGallery || (() => {}))}
              >
                <span className="menu-item-icon">🧸</span> Galería de Símbolos...
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

      <div className="menu-bar-status" style={{ display: "flex", alignItems: "center" }}>
        <span className="status-badge info-badge">Hojas: {paginasCount}</span>
        <span className="status-badge">Cartas: {cartasCount}</span>
        <span className="status-badge info-badge">Zoom: {zoomFactor.toFixed(1)}x</span>

        {/* Sección de Usuario / Autenticación (SRS-062) */}
        {!user ? (
          <button
            type="button"
            className="btn-login-trigger"
            onClick={() => setShowLoginModal(true)}
            style={{
              marginLeft: "10px",
              padding: "4px 10px",
              borderRadius: "6px",
              backgroundColor: "var(--accent-primary, #6366f1)",
              color: "#fff",
              border: "none",
              fontSize: "12px",
              fontWeight: "600",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "5px"
            }}
          >
            <span>👤</span> Iniciar Sesión
          </button>
        ) : (
          <div style={{ position: "relative", marginLeft: "10px" }} ref={userMenuRef}>
            {(() => {
              const initials = getAvatarInitials(user.email);
              const { bg, text } = getAvatarColor(user.email);
              return (
                <button
                  type="button"
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  title={user.email}
                  style={{
                    width: "28px",
                    height: "28px",
                    borderRadius: "50%",
                    backgroundColor: bg,
                    color: text,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "11px",
                    fontWeight: "700",
                    border: "2px solid rgba(255,255,255,0.25)",
                    cursor: "pointer",
                    padding: 0,
                    boxShadow: "0 2px 4px rgba(0,0,0,0.3)"
                  }}
                >
                  {initials}
                </button>
              );
            })()}

            {showUserMenu && (
              <div
                style={{
                  position: "absolute",
                  top: "100%",
                  right: 0,
                  marginTop: "8px",
                  width: "220px",
                  backgroundColor: "var(--bg-secondary, #1e1e24)",
                  border: "1px solid var(--border-color, #333340)",
                  borderRadius: "8px",
                  boxShadow: "0 10px 25px rgba(0,0,0,0.5)",
                  padding: "12px",
                  zIndex: 9999,
                  display: "flex",
                  flexDirection: "column",
                  gap: "8px"
                }}
              >
                <div style={{ borderBottom: "1px solid var(--border-color, #333340)", paddingBottom: "8px" }}>
                  <div style={{ fontSize: "13px", fontWeight: "600", color: "#fff", wordBreak: "break-all" }}>
                    {user.email}
                  </div>
                  <div style={{ fontSize: "11px", color: user.role === "admin" ? "#a855f7" : "#a1a1aa", marginTop: "2px", fontWeight: "500" }}>
                    {user.role === "admin" ? "🛡️ Administrador" : "👤 Usuario"}
                  </div>
                </div>

                {/* Barra de Cuota de Almacenamiento (SRS-066) */}
                {storageInfo && (
                  <div style={{ padding: "6px 0", borderBottom: "1px solid var(--border-color, #333340)" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px", marginBottom: "4px" }}>
                      <span style={{ color: "#94a3b8" }}>Almacenamiento:</span>
                      <span style={{ fontWeight: "600", color: "#cbd5e1" }}>
                        {storageInfo.usedMb} MB / {storageInfo.quotaMb} MB
                      </span>
                    </div>
                    <div style={{ height: "5px", backgroundColor: "#2b2b38", borderRadius: "3px", overflow: "hidden" }}>
                      <div
                        style={{
                          height: "100%",
                          width: `${Math.min(100, storageInfo.percentUsed)}%`,
                          backgroundColor:
                            storageInfo.percentUsed >= 95
                              ? "#ef4444"
                              : storageInfo.percentUsed >= 80
                              ? "#f59e0b"
                              : "#38bdf8",
                          transition: "width 0.3s ease"
                        }}
                      />
                    </div>
                    <div style={{ fontSize: "10px", color: "#94a3b8", marginTop: "3px", textAlign: "right" }}>
                      {storageInfo.percentUsed}% ocupado
                    </div>
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => {
                    setShowUserMenu(false);
                    if (onOpenCloudProjects) onOpenCloudProjects();
                  }}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    padding: "6px 8px",
                    borderRadius: "4px",
                    backgroundColor: "transparent",
                    border: "none",
                    color: "#38bdf8",
                    fontSize: "12px",
                    fontWeight: "500",
                    cursor: "pointer",
                    textAlign: "left"
                  }}
                >
                  <span>☁️</span> Gestionar mi almacenamiento
                </button>

                {user.role === "admin" && (
                  <a
                    href="/admin"
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => setShowUserMenu(false)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                      padding: "6px 8px",
                      borderRadius: "4px",
                      color: "#e2e8f0",
                      textDecoration: "none",
                      fontSize: "12px",
                      fontWeight: "500",
                      backgroundColor: "rgba(168, 85, 247, 0.15)",
                      border: "1px solid rgba(168, 85, 247, 0.3)"
                    }}
                  >
                    <span>⚙️</span> Panel de Administrador
                  </a>
                )}

                <button
                  type="button"
                  onClick={() => {
                    setShowUserMenu(false);
                    logout();
                  }}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    padding: "6px 8px",
                    borderRadius: "4px",
                    backgroundColor: "transparent",
                    border: "none",
                    color: "#ef4444",
                    fontSize: "12px",
                    fontWeight: "500",
                    cursor: "pointer",
                    textAlign: "left"
                  }}
                >
                  <span>🚪</span> Cerrar Sesión
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

