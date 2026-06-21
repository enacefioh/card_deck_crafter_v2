import React, { useState, useEffect } from "react";
import type { CardConfig, Carta } from "shared";
import "./EditCardModal.css";

interface EditCardModalProps {
  carta: Carta;
  cardConfig: CardConfig;
  templatesMap: Record<string, any>;
  generarReversos: boolean;
  imagenTraseraComun: string | null;
  onSave: (valoresCampos: Record<string, string>, capasOverrides: Record<string, any>) => void;
  onClose: () => void;
}

function renderizarTextoCapa(capa: any, valoresCampos?: Record<string, string>): string {
  let texto = capa.contenidoRaw || "";
  if (valoresCampos) {
    Object.entries(valoresCampos).forEach(([key, val]) => {
      texto = texto.replace(new RegExp(`\\{\\{\\s*${key}\\s*\\}\\}`, "g"), val);
    });
  }
  return texto;
}

export default function EditCardModal({
  carta,
  cardConfig,
  templatesMap,
  generarReversos,
  imagenTraseraComun,
  onSave,
  onClose,
}: EditCardModalProps) {
  const plantilla = carta.plantillaId ? templatesMap[carta.plantillaId] : null;

  // --- Estados locales temporales ---
  const [tempValoresCampos, setTempValoresCampos] = useState<Record<string, string>>(() => ({
    ...(carta.valoresCampos || {}),
  }));
  const [tempCapasOverrides, setTempCapasOverrides] = useState<Record<string, any>>(() => ({
    ...(carta.capasOverrides || {}),
  }));
  const [selectedLayerId, setSelectedLayerId] = useState<string | null>(null);
  const [hoveredLayerId, setHoveredLayerId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"frontal" | "trasera">("frontal");

  // Escala fija para la edición interactiva en el modal
  const scale = 3.5;

  // --- Comprobar si hay cambios sin guardar ---
  const hasChanges = () => {
    const originalValores = carta.valoresCampos || {};
    const originalOverrides = carta.capasOverrides || {};

    // Comprobar diferencias en valoresCampos
    const keysValores = Array.from(new Set([...Object.keys(tempValoresCampos), ...Object.keys(originalValores)]));
    for (const k of keysValores) {
      if ((tempValoresCampos[k] || "") !== (originalValores[k] || "")) {
        return true;
      }
    }

    // Comprobar diferencias en capasOverrides
    const layers = plantilla?.capas || [];
    for (const capa of layers) {
      const tempColor = tempCapasOverrides[capa.id]?.colorFill;
      const originalColor = originalOverrides[capa.id]?.colorFill;
      if ((tempColor || "") !== (originalColor || "")) {
        return true;
      }
    }

    return false;
  };

  // --- Manejo de la acción de cancelar/cerrar ---
  const handleCancel = () => {
    if (hasChanges()) {
      const confirmDiscard = window.confirm(
        "Tienes cambios sin guardar. ¿Seguro que deseas salir y descartar las modificaciones?"
      );
      if (confirmDiscard) {
        onClose();
      }
    } else {
      onClose();
    }
  };

  // --- Escucha de la tecla Escape ---
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        handleCancel();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [tempValoresCampos, tempCapasOverrides]);

  // --- Escucha de la tecla Tabulador para navegar entre capas ---
  useEffect(() => {
    if (activeTab !== "frontal") return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Tab") {
        const capas = plantilla?.capas || [];
        if (capas.length === 0) return;

        // Prevenir la navegación de foco nativa que saca al usuario del panel
        e.preventDefault();

        const currentIndex = capas.findIndex((c: any) => c.id === selectedLayerId);

        if (e.shiftKey) {
          // Shift + Tab: seleccionar capa anterior
          let prevIndex = currentIndex - 1;
          if (prevIndex < 0) {
            prevIndex = capas.length - 1;
          }
          setSelectedLayerId(capas[prevIndex].id);
        } else {
          // Tab: seleccionar capa siguiente
          let nextIndex = currentIndex + 1;
          if (nextIndex >= capas.length || currentIndex === -1) {
            nextIndex = 0;
          }
          setSelectedLayerId(capas[nextIndex].id);
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [selectedLayerId, plantilla, activeTab]);

  // --- Foco automático en el input del inspector al cambiar de capa ---
  useEffect(() => {
    if (!selectedLayerId) return;

    const focusTimer = setTimeout(() => {
      const input = document.querySelector<HTMLInputElement | HTMLTextAreaElement>(
        ".inspector-textarea, .inspector-input, .color-picker-input, .color-hex-input"
      );
      if (input) {
        input.focus();
        if (input instanceof HTMLInputElement && input.type !== "color") {
          input.select();
        } else if (input instanceof HTMLTextAreaElement) {
          input.select();
        }
      }
    }, 50);

    return () => clearTimeout(focusTimer);
  }, [selectedLayerId]);

  // --- Manejo de Guardar ---
  const handleSave = () => {
    onSave(tempValoresCampos, tempCapasOverrides);
  };

  // --- Obtener la capa actualmente seleccionada ---
  const selectedCapa = plantilla?.capas?.find((c: any) => c.id === selectedLayerId);

  // --- Obtener el campo de variables asociado a la capa de texto ---
  const getFieldKeyForCapa = (capa: any): string | null => {
    if (!capa || capa.tipo !== "text" || !capa.contenidoRaw) return null;
    const match = capa.contenidoRaw.match(/\{\{\s*(\w+)\s*\}\}/);
    return match ? match[1] : null;
  };

  const fieldKey = selectedCapa ? getFieldKeyForCapa(selectedCapa) : null;
  const campoConfig = fieldKey
    ? plantilla?.camposConfig?.find((f: any) => f.clave === fieldKey)
    : null;

  // Reverso a renderizar
  const traseraUrl = carta.imagenTrasera || imagenTraseraComun;

  return (
    <div className="edit-modal-backdrop" onClick={handleCancel}>
      <div className="edit-modal-container" onClick={(e) => e.stopPropagation()}>
        
        {/* Cabecera del modal */}
        <header className="edit-modal-header">
          <div className="edit-modal-title-area">
            <h2>Editor de Carta: {carta.nombre}</h2>
            {generarReversos && (
              <div className="edit-modal-tabs">
                <button
                  type="button"
                  className={`tab-btn ${activeTab === "frontal" ? "active" : ""}`}
                  onClick={() => {
                    setActiveTab("frontal");
                    setSelectedLayerId(null);
                  }}
                >
                  Cara Frontal
                </button>
                <button
                  type="button"
                  className={`tab-btn ${activeTab === "trasera" ? "active" : ""}`}
                  onClick={() => {
                    setActiveTab("trasera");
                    setSelectedLayerId(null);
                  }}
                >
                  Cara Trasera
                </button>
              </div>
            )}
          </div>
          <div className="edit-modal-actions">
            <button type="button" className="btn-secondary" onClick={handleCancel}>
              Cancelar
            </button>
            <button type="button" className="btn-primary" onClick={handleSave}>
              Guardar Cambios
            </button>
          </div>
        </header>

        {/* Cuerpo del modal (3 Columnas) */}
        <div className="edit-modal-body">
          
          {/* COLUMNA 1: Explorador de Jerarquía */}
          <aside className="hierarchy-column">
            <div className="column-title">Explorador de Capas</div>
            <div className="column-content">
              {activeTab === "frontal" ? (
                !plantilla || !plantilla.capas || plantilla.capas.length === 0 ? (
                  <div className="empty-message-inline">Nada que editar</div>
                ) : (
                  <div className="hierarchy-list">
                    {plantilla.capas.map((capa: any) => (
                      <div
                        key={capa.id}
                        className={`hierarchy-item ${selectedLayerId === capa.id ? "selected" : ""} ${
                          hoveredLayerId === capa.id ? "hovered" : ""
                        }`}
                        onClick={() => setSelectedLayerId(capa.id)}
                        onMouseEnter={() => setHoveredLayerId(capa.id)}
                        onMouseLeave={() => setHoveredLayerId(null)}
                      >
                        <span className="hierarchy-icon">
                          {capa.tipo === "background" ? "🎨" : "📝"}
                        </span>
                        <span className="hierarchy-label">{capa.nombre}</span>
                      </div>
                    ))}
                  </div>
                )
              ) : (
                <div className="hierarchy-list-empty-info">
                  El reverso no posee capas editables en plantilla.
                </div>
              )}
            </div>
          </aside>

          {/* COLUMNA 2: Previsualización de Carta */}
          <main className="preview-column">
            <div className="column-title">Previsualización</div>
            <div className="column-content preview-canvas-wrapper">
              <div
                className="edit-card-preview-frame"
                style={{
                  width: `${cardConfig.anchoMm * scale}px`,
                  height: `${cardConfig.altoMm * scale}px`,
                  border: `${
                    cardConfig.bordeCorteMm > 0 ? cardConfig.bordeCorteMm * scale : 1
                  }px solid ${cardConfig.bordeCorteColor || "#000000"}`,
                  position: "relative",
                  overflow: "hidden",
                  boxShadow: "0 10px 25px rgba(0, 0, 0, 0.4)",
                  backgroundColor: "#ffffff",
                }}
              >
                {activeTab === "frontal" ? (
                  !plantilla || !plantilla.capas || plantilla.capas.length === 0 ? (
                    <div className="preview-empty-text">Nada que editar</div>
                  ) : (
                    plantilla.capas.map((capa: any) => {
                      const isSelected = selectedLayerId === capa.id;
                      const isHovered = hoveredLayerId === capa.id;

                      const layerStyle: React.CSSProperties = {
                        position: "absolute",
                        left: `${capa.xMm * scale}px`,
                        top: `${capa.yMm * scale}px`,
                        width: `${capa.anchoMm * scale}px`,
                        height: `${capa.altoMm * scale}px`,
                        cursor: "pointer",
                        boxSizing: "border-box",
                        transition: "outline 0.1s ease",
                        outline: isSelected
                          ? "2px solid var(--accent-primary)"
                          : isHovered
                          ? "2px dashed var(--accent-primary-half, rgba(139, 92, 246, 0.5))"
                          : "none",
                        outlineOffset: "-1px",
                        zIndex: isSelected ? 10 : isHovered ? 9 : 1,
                      };

                      if (capa.tipo === "background") {
                        const colorFill = tempCapasOverrides[capa.id]?.colorFill || capa.colorFill || "#ffffff";
                        return (
                          <div
                            key={capa.id}
                            style={{
                              ...layerStyle,
                              backgroundColor: colorFill,
                            }}
                            onClick={() => setSelectedLayerId(capa.id)}
                            onMouseEnter={() => setHoveredLayerId(capa.id)}
                            onMouseLeave={() => setHoveredLayerId(null)}
                          />
                        );
                      }

                      if (capa.tipo === "text") {
                        const textoInterp = renderizarTextoCapa(capa, tempValoresCampos);
                        const fontSizePx = (capa.fontSizePt || 12) * 0.352778 * scale;
                        return (
                          <div
                            key={capa.id}
                            style={{
                              ...layerStyle,
                              fontFamily: capa.fontFamily || "sans-serif",
                              fontSize: `${fontSizePx}px`,
                              color: capa.color || "#000000",
                              textAlign: (capa.alineacion === "center"
                                ? "center"
                                : capa.alineacion === "right"
                                ? "right"
                                : "left") as any,
                              fontWeight: capa.bold ? "bold" : "normal",
                              fontStyle: capa.italic ? "italic" : "normal",
                              whiteSpace: "pre-wrap",
                              wordBreak: "break-word",
                              lineHeight: 1.2,
                              padding: "2px",
                              userSelect: "none",
                            }}
                            onClick={() => setSelectedLayerId(capa.id)}
                            onMouseEnter={() => setHoveredLayerId(capa.id)}
                            onMouseLeave={() => setHoveredLayerId(null)}
                          >
                            {textoInterp}
                          </div>
                        );
                      }

                      return null;
                    })
                  )
                ) : traseraUrl ? (
                  <div
                    style={{
                      width: "100%",
                      height: "100%",
                      backgroundImage: `url(${traseraUrl})`,
                      backgroundSize: cardConfig.modoAjuste || "cover",
                      backgroundRepeat: "no-repeat",
                      backgroundPosition: "center",
                    }}
                  />
                ) : (
                  <div className="preview-empty-text">Sin reverso configurado</div>
                )}
              </div>
            </div>
          </main>

          {/* COLUMNA 3: Inspector de Propiedades */}
          <aside className="inspector-column">
            <div className="column-title">Inspector de Propiedades</div>
            <div className="column-content">
              {activeTab === "frontal" ? (
                selectedLayerId && selectedCapa ? (
                  <div className="inspector-panel">
                    <div className="inspector-layer-header">
                      <span className="inspector-layer-icon">
                        {selectedCapa.tipo === "background" ? "🎨" : "📝"}
                      </span>
                      <h3>{selectedCapa.nombre}</h3>
                    </div>
                    <hr className="inspector-separator" />

                    {/* Controles para capas de Fondo */}
                    {selectedCapa.tipo === "background" && (
                      <div className="inspector-section">
                        <label className="inspector-label">Color de Relleno</label>
                        <div className="color-picker-group">
                          <input
                            type="color"
                            className="color-picker-input"
                            value={tempCapasOverrides[selectedCapa.id]?.colorFill || selectedCapa.colorFill || "#ffffff"}
                            onChange={(e) => {
                              setTempCapasOverrides((prev) => ({
                                ...prev,
                                [selectedCapa.id]: {
                                  ...(prev[selectedCapa.id] || {}),
                                  colorFill: e.target.value,
                                },
                              }));
                            }}
                          />
                          <input
                            type="text"
                            className="color-hex-input"
                            value={tempCapasOverrides[selectedCapa.id]?.colorFill || selectedCapa.colorFill || "#ffffff"}
                            onChange={(e) => {
                              const val = e.target.value;
                              if (/^#[0-9A-F]{6}$/i.test(val)) {
                                setTempCapasOverrides((prev) => ({
                                  ...prev,
                                  [selectedCapa.id]: {
                                    ...(prev[selectedCapa.id] || {}),
                                    colorFill: val,
                                  },
                                }));
                              }
                            }}
                          />
                        </div>
                      </div>
                    )}

                    {/* Controles para capas de Texto */}
                    {selectedCapa.tipo === "text" && (
                      <div className="inspector-section">
                        {fieldKey ? (
                          <>
                            <label className="inspector-label">
                              {campoConfig?.nombreLegible || fieldKey} (Valor Dinámico)
                            </label>
                            {fieldKey === "texto" ? (
                              <textarea
                                className="inspector-textarea"
                                value={tempValoresCampos[fieldKey] || ""}
                                rows={6}
                                onChange={(e) => {
                                  setTempValoresCampos((prev) => ({
                                    ...prev,
                                    [fieldKey]: e.target.value,
                                  }));
                                }}
                              />
                            ) : (
                              <input
                                type="text"
                                className="inspector-input"
                                value={tempValoresCampos[fieldKey] || ""}
                                onChange={(e) => {
                                  setTempValoresCampos((prev) => ({
                                    ...prev,
                                    [fieldKey]: e.target.value,
                                  }));
                                }}
                              />
                            )}
                          </>
                        ) : (
                          <div className="inspector-notice">
                            Esta capa de texto utiliza un contenido estático sin variables editables.
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="inspector-guide">
                    Selecciona una capa de la lista o haz clic directamente sobre la carta para editar sus valores.
                  </div>
                )
              ) : (
                <div className="inspector-guide">
                  El reverso no posee propiedades editables para esta carta.
                </div>
              )}
            </div>
          </aside>

        </div>
      </div>
    </div>
  );
}
