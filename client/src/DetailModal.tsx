import { useEffect } from "react";
import "./DetailModal.css";
import type { CanvasConfig, CardConfig, Carta } from "shared";

function renderizarTextoCapa(capa: any, valoresCampos?: Record<string, string>): string {
  if (valoresCampos && valoresCampos[capa.nombre] !== undefined) {
    return valoresCampos[capa.nombre];
  }
  return capa.contenidoRaw || "";
}

function parseMarkdownToHtml(text: string): string {
  if (!text) return "";
  let escaped = text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
  escaped = escaped.replace(/\n/g, "<br />");
  escaped = escaped.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  escaped = escaped.replace(/\*([^*]+)\*/g, "<em>$1</em>");
  escaped = escaped.replace(/__([^_]+)__/g, "<u>$1</u>");
  return escaped;
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
                    const borderMm = cardConfig.bordeCorteMm;
                    const noOverlap = borderMm > 0;
                    const scaleX = noOverlap ? (cardConfig.anchoMm - 2 * borderMm) / cardConfig.anchoMm : 1;
                    const scaleY = noOverlap ? (cardConfig.altoMm - 2 * borderMm) / cardConfig.altoMm : 1;
                    return plantilla ? (
                      <div
                        className="card-template-render"
                        style={{
                          position: "absolute",
                          left: noOverlap ? `${borderMm * 2.5}px` : 0,
                          top: noOverlap ? `${borderMm * 2.5}px` : 0,
                          width: `${cardConfig.anchoMm * 2.5}px`,
                          height: `${cardConfig.altoMm * 2.5}px`,
                          overflow: "hidden",
                          transform: noOverlap ? `scale(${scaleX}, ${scaleY})` : "none",
                          transformOrigin: "top left",
                        }}
                      >
                        {(() => {
                          const renderCapaRecursiva = (parentId: string | null): React.ReactNode => {
                            const layers = plantilla.capas || [];
                            const filteredLayers = layers.filter((c: any) => {
                              if (parentId === null) {
                                return !c.parentCapaId;
                              }
                              return c.parentCapaId === parentId;
                            });

                            return filteredLayers.map((capa: any) => {
                              const parentCapa = layers.find((p: any) => p.id === capa.parentCapaId);
                              const isParentFlex = parentCapa && (parentCapa.layout === "vertical" || parentCapa.layout === "horizontal");

                              const style: React.CSSProperties = {
                                position: isParentFlex ? "relative" : "absolute",
                                left: isParentFlex ? undefined : `${capa.xMm * 2.5}px`,
                                top: isParentFlex ? undefined : `${capa.yMm * 2.5}px`,
                                width: `${capa.anchoMm * 2.5}px`,
                                height: `${capa.altoMm * 2.5}px`,
                                pointerEvents: "none",
                                boxSizing: "border-box",
                                flexShrink: 0,
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

                              if (capa.tipo === "container") {
                                const overrides = carta.capasOverrides?.[capa.id];
                                const resolvedCapa = overrides ? { ...capa, ...overrides } : capa;

                                // Bordes y Esquinas (SRS-024)
                                const borderTopPx = (resolvedCapa.borderTopWidth || 0) * 2.5;
                                const borderRightPx = (resolvedCapa.borderRightWidth || 0) * 2.5;
                                const borderBottomPx = (resolvedCapa.borderBottomWidth || 0) * 2.5;
                                const borderLeftPx = (resolvedCapa.borderLeftWidth || 0) * 2.5;

                                const radiusTopLeftPx = (resolvedCapa.borderTopLeftRadius || 0) * 2.5;
                                const radiusTopRightPx = (resolvedCapa.borderTopRightRadius || 0) * 2.5;
                                const radiusBottomRightPx = (resolvedCapa.borderBottomRightRadius || 0) * 2.5;
                                const radiusBottomLeftPx = (resolvedCapa.borderBottomLeftRadius || 0) * 2.5;

                                const borderCornersStyle = {
                                  borderTop: borderTopPx > 0 ? `${borderTopPx}px solid ${resolvedCapa.borderTopColor || "#000000"}` : "none",
                                  borderRight: borderRightPx > 0 ? `${borderRightPx}px solid ${resolvedCapa.borderRightColor || "#000000"}` : "none",
                                  borderBottom: borderBottomPx > 0 ? `${borderBottomPx}px solid ${resolvedCapa.borderBottomColor || "#000000"}` : "none",
                                  borderLeft: borderLeftPx > 0 ? `${borderLeftPx}px solid ${resolvedCapa.borderLeftColor || "#000000"}` : "none",
                                  borderTopLeftRadius: `${radiusTopLeftPx}px`,
                                  borderTopRightRadius: `${radiusTopRightPx}px`,
                                  borderBottomRightRadius: `${radiusBottomRightPx}px`,
                                  borderBottomLeftRadius: `${radiusBottomLeftPx}px`,
                                };

                                const isFlex = resolvedCapa.layout === "vertical" || resolvedCapa.layout === "horizontal";
                                const flexStyle: React.CSSProperties = isFlex ? {
                                  display: "flex",
                                  flexDirection: resolvedCapa.layout === "vertical" ? "column" : "row",
                                } : {
                                  position: "relative" as any,
                                };

                                return (
                                  <div
                                    key={capa.id}
                                    style={{
                                      ...style,
                                      ...borderCornersStyle,
                                      ...flexStyle,
                                      backgroundColor: resolvedCapa.backgroundColor || "transparent",
                                      overflow: "hidden",
                                    }}
                                  >
                                    {renderCapaRecursiva(capa.id)}
                                  </div>
                                );
                              }

                              if (capa.tipo === "image" || capa.tipo === "image-switch") {
                                const overrides = carta.capasOverrides?.[capa.id];
                                const resolvedCapa = overrides ? { ...capa, ...overrides } : capa;
                                const src = resolvedCapa.src;
                                const showPlaceholder = !src;

                                // Bordes y Esquinas (SRS-024)
                                const borderTopPx = (resolvedCapa.borderTopWidth || 0) * 2.5;
                                const borderRightPx = (resolvedCapa.borderRightWidth || 0) * 2.5;
                                const borderBottomPx = (resolvedCapa.borderBottomWidth || 0) * 2.5;
                                const borderLeftPx = (resolvedCapa.borderLeftWidth || 0) * 2.5;

                                const radiusTopLeftPx = (resolvedCapa.borderTopLeftRadius || 0) * 2.5;
                                const radiusTopRightPx = (resolvedCapa.borderTopRightRadius || 0) * 2.5;
                                const radiusBottomRightPx = (resolvedCapa.borderBottomRightRadius || 0) * 2.5;
                                const radiusBottomLeftPx = (resolvedCapa.borderBottomLeftRadius || 0) * 2.5;

                                const borderCornersStyle = {
                                  borderTop: borderTopPx > 0 ? `${borderTopPx}px solid ${resolvedCapa.borderTopColor || "#000000"}` : "none",
                                  borderRight: borderRightPx > 0 ? `${borderRightPx}px solid ${resolvedCapa.borderRightColor || "#000000"}` : "none",
                                  borderBottom: borderBottomPx > 0 ? `${borderBottomPx}px solid ${resolvedCapa.borderBottomColor || "#000000"}` : "none",
                                  borderLeft: borderLeftPx > 0 ? `${borderLeftPx}px solid ${resolvedCapa.borderLeftColor || "#000000"}` : "none",
                                  borderTopLeftRadius: `${radiusTopLeftPx}px`,
                                  borderTopRightRadius: `${radiusTopRightPx}px`,
                                  borderBottomRightRadius: `${radiusBottomRightPx}px`,
                                  borderBottomLeftRadius: `${radiusBottomLeftPx}px`,
                                  boxSizing: "border-box" as const,
                                  overflow: "hidden" as const,
                                };

                                return (
                                  <div
                                    key={capa.id}
                                    style={{
                                      ...style,
                                      ...borderCornersStyle,
                                      display: "flex",
                                      alignItems: "center",
                                      justifyContent: "center",
                                      backgroundColor: showPlaceholder ? "#e2e8f0" : (resolvedCapa.backgroundColor || "transparent"),
                                      border: showPlaceholder ? "1px dashed #cbd5e1" : undefined,
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
                                          objectFit: resolvedCapa.modoAjuste === "stretch" ? "fill" : (resolvedCapa.modoAjuste || "cover") as any,
                                          borderRadius: "inherit",
                                        }}
                                      />
                                    )}
                                  </div>
                                );
                              }

                              if (capa.tipo === "text") {
                                const overrides = carta.capasOverrides?.[capa.id];
                                const resolvedCapa = overrides ? { ...capa, ...overrides } : capa;
                                const textoInterp = renderizarTextoCapa(resolvedCapa, carta.valoresCampos);
                                const htmlText = parseMarkdownToHtml(textoInterp);
                                const fontSizePx = (resolvedCapa.fontSizePt || 12) * 0.352778 * 2.5;

                                // Bordes y Esquinas (SRS-024)
                                const borderTopPx = (resolvedCapa.borderTopWidth || 0) * 2.5;
                                const borderRightPx = (resolvedCapa.borderRightWidth || 0) * 2.5;
                                const borderBottomPx = (resolvedCapa.borderBottomWidth || 0) * 2.5;
                                const borderLeftPx = (resolvedCapa.borderLeftWidth || 0) * 2.5;

                                const radiusTopLeftPx = (resolvedCapa.borderTopLeftRadius || 0) * 2.5;
                                const radiusTopRightPx = (resolvedCapa.borderTopRightRadius || 0) * 2.5;
                                const radiusBottomRightPx = (resolvedCapa.borderBottomRightRadius || 0) * 2.5;
                                const radiusBottomLeftPx = (resolvedCapa.borderBottomLeftRadius || 0) * 2.5;

                                const borderCornersStyle = {
                                  borderTop: borderTopPx > 0 ? `${borderTopPx}px solid ${resolvedCapa.borderTopColor || "#000000"}` : "none",
                                  borderRight: borderRightPx > 0 ? `${borderRightPx}px solid ${resolvedCapa.borderRightColor || "#000000"}` : "none",
                                  borderBottom: borderBottomPx > 0 ? `${borderBottomPx}px solid ${resolvedCapa.borderBottomColor || "#000000"}` : "none",
                                  borderLeft: borderLeftPx > 0 ? `${borderLeftPx}px solid ${resolvedCapa.borderLeftColor || "#000000"}` : "none",
                                  borderTopLeftRadius: `${radiusTopLeftPx}px`,
                                  borderTopRightRadius: `${radiusTopRightPx}px`,
                                  borderBottomRightRadius: `${radiusBottomRightPx}px`,
                                  borderBottomLeftRadius: `${radiusBottomLeftPx}px`,
                                  boxSizing: "border-box" as const,
                                  overflow: "hidden" as const,
                                };

                                return (
                                  <div
                                    key={capa.id}
                                    style={{
                                      ...style,
                                      ...borderCornersStyle,
                                      fontFamily: resolvedCapa.fontFamily || "sans-serif",
                                      fontSize: `${fontSizePx}px`,
                                      color: resolvedCapa.color || "#000000",
                                      backgroundColor: resolvedCapa.backgroundColor || "transparent",
                                      textAlign: (resolvedCapa.alineacion === "center" ? "center" : resolvedCapa.alineacion === "right" ? "right" : "left") as any,
                                      fontWeight: resolvedCapa.bold ? "bold" : "normal",
                                      fontStyle: resolvedCapa.italic ? "italic" : "normal",
                                      textDecoration: resolvedCapa.underline ? "underline" : "none",
                                      whiteSpace: "pre-wrap",
                                      wordBreak: "break-word",
                                      lineHeight: 1.2,
                                    }}
                                    dangerouslySetInnerHTML={{ __html: htmlText }}
                                  />
                                );
                              }

                              return null;
                            });
                          };
                          return renderCapaRecursiva(null);
                        })()}
                      </div>
                    ) : (
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", width: "100%", height: "100%", color: "#c62828" }}>
                        Cargando plantilla...
                      </div>
                    );
                  })()
                ) : (
                  (() => {
                    const borderMm = cardConfig.bordeCorteMm;
                    const noOverlap = borderMm > 0;
                    const imgLeft = noOverlap ? borderMm : 0;
                    const imgTop = noOverlap ? borderMm : 0;
                    const imgWidth = noOverlap ? (cardConfig.anchoMm - 2 * borderMm) : cardConfig.anchoMm;
                    const imgHeight = noOverlap ? (cardConfig.altoMm - 2 * borderMm) : cardConfig.altoMm;
                    return (
                      <div
                        style={{
                          position: "absolute",
                          left: `${imgLeft * 2.5}px`,
                          top: `${imgTop * 2.5}px`,
                          width: `${imgWidth * 2.5}px`,
                          height: `${imgHeight * 2.5}px`,
                          backgroundImage: `url(${carta.imagenFrontal})`,
                          backgroundSize: cardConfig.modoAjuste || "cover",
                          backgroundRepeat: "no-repeat",
                          backgroundPosition: "center",
                        }}
                      />
                    );
                  })()
                )}
              </div>
            </div>

            {generarReversos && (
              <div className="preview-box">
                <span className="preview-label">Cara Trasera</span>
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
                  {carta.plantillaTraseraId ? (
                    (() => {
                      const plantilla = templatesMap[carta.plantillaTraseraId];
                      const borderMm = cardConfig.bordeCorteMm;
                      const noOverlap = borderMm > 0;
                      const scaleX = noOverlap ? (cardConfig.anchoMm - 2 * borderMm) / cardConfig.anchoMm : 1;
                      const scaleY = noOverlap ? (cardConfig.altoMm - 2 * borderMm) / cardConfig.altoMm : 1;
                      return plantilla ? (
                        <div
                          className="card-template-render"
                          style={{
                            position: "absolute",
                            left: noOverlap ? `${borderMm * 2.5}px` : 0,
                            top: noOverlap ? `${borderMm * 2.5}px` : 0,
                            width: `${cardConfig.anchoMm * 2.5}px`,
                            height: `${cardConfig.altoMm * 2.5}px`,
                            overflow: "hidden",
                            transform: noOverlap ? `scale(${scaleX}, ${scaleY})` : "none",
                            transformOrigin: "top left",
                          }}
                        >
                        {(() => {
                          const renderCapaRecursiva = (parentId: string | null): React.ReactNode => {
                            const layers = plantilla.capas || [];
                            const filteredLayers = layers.filter((c: any) => {
                              if (parentId === null) {
                                return !c.parentCapaId;
                              }
                              return c.parentCapaId === parentId;
                            });

                            return filteredLayers.map((capa: any) => {
                              const parentCapa = layers.find((p: any) => p.id === capa.parentCapaId);
                              const isParentFlex = parentCapa && (parentCapa.layout === "vertical" || parentCapa.layout === "horizontal");

                              const style: React.CSSProperties = {
                                position: isParentFlex ? "relative" : "absolute",
                                left: isParentFlex ? undefined : `${capa.xMm * 2.5}px`,
                                top: isParentFlex ? undefined : `${capa.yMm * 2.5}px`,
                                width: `${capa.anchoMm * 2.5}px`,
                                height: `${capa.altoMm * 2.5}px`,
                                pointerEvents: "none",
                                boxSizing: "border-box",
                                flexShrink: 0,
                              };

                              if (capa.tipo === "background") {
                                const colorFill = carta.capasOverridesTrasera?.[capa.id]?.colorFill || capa.colorFill || "#ffffff";
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

                              if (capa.tipo === "container") {
                                const overrides = carta.capasOverridesTrasera?.[capa.id];
                                const resolvedCapa = overrides ? { ...capa, ...overrides } : capa;

                                // Bordes y Esquinas (SRS-024)
                                const borderTopPx = (resolvedCapa.borderTopWidth || 0) * 2.5;
                                const borderRightPx = (resolvedCapa.borderRightWidth || 0) * 2.5;
                                const borderBottomPx = (resolvedCapa.borderBottomWidth || 0) * 2.5;
                                const borderLeftPx = (resolvedCapa.borderLeftWidth || 0) * 2.5;

                                const radiusTopLeftPx = (resolvedCapa.borderTopLeftRadius || 0) * 2.5;
                                const radiusTopRightPx = (resolvedCapa.borderTopRightRadius || 0) * 2.5;
                                const radiusBottomRightPx = (resolvedCapa.borderBottomRightRadius || 0) * 2.5;
                                const radiusBottomLeftPx = (resolvedCapa.borderBottomLeftRadius || 0) * 2.5;

                                const borderCornersStyle = {
                                  borderTop: borderTopPx > 0 ? `${borderTopPx}px solid ${resolvedCapa.borderTopColor || "#000000"}` : "none",
                                  borderRight: borderRightPx > 0 ? `${borderRightPx}px solid ${resolvedCapa.borderRightColor || "#000000"}` : "none",
                                  borderBottom: borderBottomPx > 0 ? `${borderBottomPx}px solid ${resolvedCapa.borderBottomColor || "#000000"}` : "none",
                                  borderLeft: borderLeftPx > 0 ? `${borderLeftPx}px solid ${resolvedCapa.borderLeftColor || "#000000"}` : "none",
                                  borderTopLeftRadius: `${radiusTopLeftPx}px`,
                                  borderTopRightRadius: `${radiusTopRightPx}px`,
                                  borderBottomRightRadius: `${radiusBottomRightPx}px`,
                                  borderBottomLeftRadius: `${radiusBottomLeftPx}px`,
                                };

                                const isFlex = resolvedCapa.layout === "vertical" || resolvedCapa.layout === "horizontal";
                                const flexStyle: React.CSSProperties = isFlex ? {
                                  display: "flex",
                                  flexDirection: resolvedCapa.layout === "vertical" ? "column" : "row",
                                } : {
                                  position: "relative" as any,
                                };

                                return (
                                  <div
                                    key={capa.id}
                                    style={{
                                      ...style,
                                      ...borderCornersStyle,
                                      ...flexStyle,
                                      backgroundColor: resolvedCapa.backgroundColor || "transparent",
                                      overflow: "hidden",
                                    }}
                                  >
                                    {renderCapaRecursiva(capa.id)}
                                  </div>
                                );
                              }

                              if (capa.tipo === "image" || capa.tipo === "image-switch") {
                                const overrides = carta.capasOverridesTrasera?.[capa.id];
                                const resolvedCapa = overrides ? { ...capa, ...overrides } : capa;
                                const src = resolvedCapa.src;
                                const showPlaceholder = !src;

                                // Bordes y Esquinas (SRS-024)
                                const borderTopPx = (resolvedCapa.borderTopWidth || 0) * 2.5;
                                const borderRightPx = (resolvedCapa.borderRightWidth || 0) * 2.5;
                                const borderBottomPx = (resolvedCapa.borderBottomWidth || 0) * 2.5;
                                const borderLeftPx = (resolvedCapa.borderLeftWidth || 0) * 2.5;

                                const radiusTopLeftPx = (resolvedCapa.borderTopLeftRadius || 0) * 2.5;
                                const radiusTopRightPx = (resolvedCapa.borderTopRightRadius || 0) * 2.5;
                                const radiusBottomRightPx = (resolvedCapa.borderBottomRightRadius || 0) * 2.5;
                                const radiusBottomLeftPx = (resolvedCapa.borderBottomLeftRadius || 0) * 2.5;

                                const borderCornersStyle = {
                                  borderTop: borderTopPx > 0 ? `${borderTopPx}px solid ${resolvedCapa.borderTopColor || "#000000"}` : "none",
                                  borderRight: borderRightPx > 0 ? `${borderRightPx}px solid ${resolvedCapa.borderRightColor || "#000000"}` : "none",
                                  borderBottom: borderBottomPx > 0 ? `${borderBottomPx}px solid ${resolvedCapa.borderBottomColor || "#000000"}` : "none",
                                  borderLeft: borderLeftPx > 0 ? `${borderLeftPx}px solid ${resolvedCapa.borderLeftColor || "#000000"}` : "none",
                                  borderTopLeftRadius: `${radiusTopLeftPx}px`,
                                  borderTopRightRadius: `${radiusTopRightPx}px`,
                                  borderBottomRightRadius: `${radiusBottomRightPx}px`,
                                  borderBottomLeftRadius: `${radiusBottomLeftPx}px`,
                                  boxSizing: "border-box" as const,
                                  overflow: "hidden" as const,
                                };

                                return (
                                  <div
                                    key={capa.id}
                                    style={{
                                      ...style,
                                      ...borderCornersStyle,
                                      display: "flex",
                                      alignItems: "center",
                                      justifyContent: "center",
                                      backgroundColor: showPlaceholder ? "#e2e8f0" : (resolvedCapa.backgroundColor || "transparent"),
                                      border: showPlaceholder ? "1px dashed #cbd5e1" : undefined,
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
                                          objectFit: resolvedCapa.modoAjuste === "stretch" ? "fill" : (resolvedCapa.modoAjuste || "cover") as any,
                                          borderRadius: "inherit",
                                        }}
                                      />
                                    )}
                                  </div>
                                );
                              }

                              if (capa.tipo === "text") {
                                const overrides = carta.capasOverridesTrasera?.[capa.id];
                                const resolvedCapa = overrides ? { ...capa, ...overrides } : capa;
                                const textoInterp = renderizarTextoCapa(resolvedCapa, carta.valoresCamposTrasera);
                                const htmlText = parseMarkdownToHtml(textoInterp);
                                const fontSizePx = (resolvedCapa.fontSizePt || 12) * 0.352778 * 2.5;

                                // Bordes y Esquinas (SRS-024)
                                const borderTopPx = (resolvedCapa.borderTopWidth || 0) * 2.5;
                                const borderRightPx = (resolvedCapa.borderRightWidth || 0) * 2.5;
                                const borderBottomPx = (resolvedCapa.borderBottomWidth || 0) * 2.5;
                                const borderLeftPx = (resolvedCapa.borderLeftWidth || 0) * 2.5;

                                const radiusTopLeftPx = (resolvedCapa.borderTopLeftRadius || 0) * 2.5;
                                const radiusTopRightPx = (resolvedCapa.borderTopRightRadius || 0) * 2.5;
                                const radiusBottomRightPx = (resolvedCapa.borderBottomRightRadius || 0) * 2.5;
                                const radiusBottomLeftPx = (resolvedCapa.borderBottomLeftRadius || 0) * 2.5;

                                const borderCornersStyle = {
                                  borderTop: borderTopPx > 0 ? `${borderTopPx}px solid ${resolvedCapa.borderTopColor || "#000000"}` : "none",
                                  borderRight: borderRightPx > 0 ? `${borderRightPx}px solid ${resolvedCapa.borderRightColor || "#000000"}` : "none",
                                  borderBottom: borderBottomPx > 0 ? `${borderBottomPx}px solid ${resolvedCapa.borderBottomColor || "#000000"}` : "none",
                                  borderLeft: borderLeftPx > 0 ? `${borderLeftPx}px solid ${resolvedCapa.borderLeftColor || "#000000"}` : "none",
                                  borderTopLeftRadius: `${radiusTopLeftPx}px`,
                                  borderTopRightRadius: `${radiusTopRightPx}px`,
                                  borderBottomRightRadius: `${radiusBottomRightPx}px`,
                                  borderBottomLeftRadius: `${radiusBottomLeftPx}px`,
                                  boxSizing: "border-box" as const,
                                  overflow: "hidden" as const,
                                };

                                return (
                                  <div
                                    key={capa.id}
                                    style={{
                                      ...style,
                                      ...borderCornersStyle,
                                      fontFamily: resolvedCapa.fontFamily || "sans-serif",
                                      fontSize: `${fontSizePx}px`,
                                      color: resolvedCapa.color || "#000000",
                                      backgroundColor: resolvedCapa.backgroundColor || "transparent",
                                      textAlign: (resolvedCapa.alineacion === "center" ? "center" : resolvedCapa.alineacion === "right" ? "right" : "left") as any,
                                      fontWeight: resolvedCapa.bold ? "bold" : "normal",
                                      fontStyle: resolvedCapa.italic ? "italic" : "normal",
                                      textDecoration: resolvedCapa.underline ? "underline" : "none",
                                      whiteSpace: "pre-wrap",
                                      wordBreak: "break-word",
                                      lineHeight: 1.2,
                                    }}
                                    dangerouslySetInnerHTML={{ __html: htmlText }}
                                  />
                                );
                              }

                              return null;
                            });
                          };
                          return renderCapaRecursiva(null);
                        })()}
                        </div>
                      ) : (
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", width: "100%", height: "100%", color: "#c62828" }}>
                          Cargando plantilla...
                        </div>
                      );
                    })()
                  ) : traseraUrl ? (
                    (() => {
                      const borderMm = cardConfig.bordeCorteMm;
                      const noOverlap = borderMm > 0;
                      const imgLeft = noOverlap ? borderMm : 0;
                      const imgTop = noOverlap ? borderMm : 0;
                      const imgWidth = noOverlap ? (cardConfig.anchoMm - 2 * borderMm) : cardConfig.anchoMm;
                      const imgHeight = noOverlap ? (cardConfig.altoMm - 2 * borderMm) : cardConfig.altoMm;
                      return (
                        <div
                          style={{
                            position: "absolute",
                            left: `${imgLeft * 2.5}px`,
                            top: `${imgTop * 2.5}px`,
                            width: `${imgWidth * 2.5}px`,
                            height: `${imgHeight * 2.5}px`,
                            backgroundImage: `url(${traseraUrl})`,
                            backgroundSize: cardConfig.modoAjuste || "cover",
                            backgroundRepeat: "no-repeat",
                            backgroundPosition: "center",
                          }}
                        />
                      );
                    })()
                  ) : (
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        width: "100%",
                        height: "100%",
                        color: "#94a3b8",
                      }}
                    >
                      <span>Sin reverso configurado</span>
                    </div>
                  )}
                </div>
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
