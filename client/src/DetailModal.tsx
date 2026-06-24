import { useEffect } from "react";
import "./DetailModal.css";
import type { CanvasConfig, CardConfig, Carta } from "shared";

function renderizarTextoCapa(capa: any, valoresCampos?: Record<string, string>): string {
  let texto = capa.contenidoRaw || "";
  if (valoresCampos) {
    Object.entries(valoresCampos).forEach(([key, val]) => {
      texto = texto.replace(new RegExp(`\\{\\{\\s*${key}\\s*\\}\\}`, "g"), val);
    });
  }
  return texto;
}

interface DetailModalProps {
  carta: Carta;
  generarReversos: boolean;
  imagenTraseraComun: string | null;
  canvasConfig: CanvasConfig;
  cardConfig: CardConfig;
  onClose: () => void;
  templatesMap?: Record<string, any>;
}

export default function DetailModal({
  carta,
  generarReversos,
  imagenTraseraComun,
  canvasConfig,
  cardConfig,
  onClose,
  templatesMap = {},
}: DetailModalProps) {
  // Cerrar al presionar Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose]);

  // Imagen trasera a usar: individual si existe, si no, la común
  const traseraUrl = carta.imagenTrasera || imagenTraseraComun;

  return (
    <div className="detail-modal-backdrop" onClick={onClose}>
      <div className="detail-modal-container" onClick={(e) => e.stopPropagation()}>
        <header className="detail-modal-header">
          <h2>Ficha de Carta: {carta.nombre}</h2>
          <button className="detail-modal-close" onClick={onClose} title="Cerrar modal">
            ✕
          </button>
        </header>

        <div className="detail-modal-body">
          <div className="previews-container">
            <div className="preview-box">
              <span className="preview-label">Cara Frontal</span>
              <div
                className="preview-image"
                style={{
                  position: "relative",
                  width: `${cardConfig.anchoMm * 2.5}px`,
                  height: `${cardConfig.altoMm * 2.5}px`,
                  border: `${cardConfig.bordeCorteMm > 0 ? cardConfig.bordeCorteMm * 2.5 : 1}px solid ${cardConfig.bordeCorteColor || "#000"}`,
                  overflow: "hidden",
                  backgroundColor: "#ffffff",
                }}
              >
                {carta.plantillaId ? (
                  (() => {
                    const plantilla = templatesMap[carta.plantillaId];
                    return plantilla ? (
                      <div
                        className="card-template-render"
                        style={{
                          position: "absolute",
                          left: 0,
                          top: 0,
                          width: "100%",
                          height: "100%",
                          overflow: "hidden",
                        }}
                      >
                        {plantilla.capas.map((capa: any) => {
                          const style: React.CSSProperties = {
                            position: "absolute",
                            left: `${capa.xMm * 2.5}px`,
                            top: `${capa.yMm * 2.5}px`,
                            width: `${capa.anchoMm * 2.5}px`,
                            height: `${capa.altoMm * 2.5}px`,
                            pointerEvents: "none",
                          };

                          if (capa.tipo === "background") {
                            const colorFill = carta.capasOverrides?.[capa.id]?.colorFill || capa.colorFill || "#ffffff";
                            return (
                              <div
                                key={capa.id}
                                style={{
                                  ...style,
                                  backgroundColor: colorFill,
                                }}
                              />
                            );
                          }

                          if (capa.tipo === "image" || capa.tipo === "image-switch") {
                            const src = carta.capasOverrides?.[capa.id]?.src !== undefined
                              ? carta.capasOverrides[capa.id]?.src
                              : capa.src;
                            
                            const showPlaceholder = !src;

                            return (
                              <div
                                key={capa.id}
                                style={{
                                  ...style,
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  overflow: "hidden",
                                  backgroundColor: showPlaceholder ? "#e2e8f0" : "transparent",
                                  border: showPlaceholder ? "1px dashed #cbd5e1" : "none",
                                }}
                              >
                                {showPlaceholder ? (
                                  <span style={{ fontSize: `${Math.min(capa.anchoMm, capa.altoMm) * 0.4 * 2.5}px`, userSelect: "none" }}>
                                    🖼️
                                  </span>
                                ) : (
                                  <img
                                    src={src}
                                    alt={capa.nombre}
                                    style={{
                                      width: "100%",
                                      height: "100%",
                                      objectFit: capa.modoAjuste === "stretch" ? "fill" : (capa.modoAjuste || "cover") as any,
                                    }}
                                  />
                                )}
                              </div>
                            );
                          }

                          if (capa.tipo === "text") {
                            const textoInterp = renderizarTextoCapa(capa, carta.valoresCampos);
                            const fontSizePx = (capa.fontSizePt || 12) * 0.352778 * 2.5;
                            return (
                              <div
                                key={capa.id}
                                style={{
                                  ...style,
                                  fontFamily: capa.fontFamily || "sans-serif",
                                  fontSize: `${fontSizePx}px`,
                                  color: capa.color || "#000000",
                                  textAlign: (capa.alineacion === "center" ? "center" : capa.alineacion === "right" ? "right" : "left") as any,
                                  fontWeight: capa.bold ? "bold" : "normal",
                                  fontStyle: capa.italic ? "italic" : "normal",
                                  whiteSpace: "pre-wrap",
                                  wordBreak: "break-word",
                                  lineHeight: 1.2,
                                }}
                              >
                                {textoInterp}
                              </div>
                            );
                          }

                          return null;
                        })}
                      </div>
                    ) : (
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", width: "100%", height: "100%", color: "#c62828" }}>
                        Cargando plantilla...
                      </div>
                    );
                  })()
                ) : (
                  <div
                    style={{
                      position: "absolute",
                      left: 0,
                      top: 0,
                      width: "100%",
                      height: "100%",
                      backgroundImage: `url(${carta.imagenFrontal})`,
                      backgroundSize: cardConfig.modoAjuste || "cover",
                      backgroundRepeat: "no-repeat",
                      backgroundPosition: "center",
                    }}
                  />
                )}
              </div>
            </div>

            {generarReversos && (
              <div className="preview-box">
                <span className="preview-label">Cara Trasera</span>
                {traseraUrl ? (
                  <div
                    className="preview-image"
                    style={{
                      backgroundImage: `url(${traseraUrl})`,
                      width: `${cardConfig.anchoMm * 2.5}px`,
                      height: `${cardConfig.altoMm * 2.5}px`,
                      border: `${cardConfig.bordeCorteMm > 0 ? cardConfig.bordeCorteMm * 2.5 : 1}px solid ${cardConfig.bordeCorteColor || "#000"}`,
                    }}
                  />
                ) : (
                  <div
                    className="preview-image placeholder-back"
                    style={{
                      width: `${cardConfig.anchoMm * 2.5}px`,
                      height: `${cardConfig.altoMm * 2.5}px`,
                    }}
                  >
                    <span>Sin reverso configurado</span>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="metadata-container">
            <h3>Ficha Técnica e Impresión</h3>
            <div className="metadata-grid">
              <div className="metadata-item">
                <span className="metadata-label">Dimensiones de Carta:</span>
                <span className="metadata-value">
                  {cardConfig.anchoMm} x {cardConfig.altoMm} mm
                </span>
              </div>
              <div className="metadata-item">
                <span className="metadata-label">Sangrado (Bleed):</span>
                <span className="metadata-value">{cardConfig.sangradoMm} mm</span>
              </div>
              <div className="metadata-item">
                <span className="metadata-label">Borde de Corte:</span>
                <span className="metadata-value">
                  {cardConfig.bordeCorteMm} mm (Color:{" "}
                  <code style={{ color: cardConfig.bordeCorteColor }}>
                    {cardConfig.bordeCorteColor}
                  </code>
                  )
                </span>
              </div>
              <div className="metadata-item">
                <span className="metadata-label">Ajuste de Ilustración:</span>
                <span className="metadata-value" style={{ textTransform: "capitalize" }}>
                  {cardConfig.modoAjuste}
                </span>
              </div>
              <div className="metadata-item">
                <span className="metadata-label">Tamaño de Hoja de Impresión:</span>
                <span className="metadata-value">
                  {canvasConfig.tipo === "Custom"
                    ? `${canvasConfig.anchoMm} x ${canvasConfig.altoMm} mm (Personalizado)`
                    : `${canvasConfig.tipo} (${canvasConfig.anchoMm} x ${canvasConfig.altoMm} mm)`}
                </span>
              </div>
              <div className="metadata-item">
                <span className="metadata-label">Cantidad en Baraja:</span>
                <span className="metadata-value highlight">{carta.cantidad} copias</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
