import React, { useEffect } from "react";
import type { CardConfig } from "shared";
import { isVerticalLayout, isHorizontalLayout, isFlexLayout, getContainerFlexStyle } from "shared";
import { parsearTextoConSimbolos, parseMarkdownToHtml } from "../utils/projectUtils";

interface TemplatePreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  plantilla: any | null;
  cardConfig: CardConfig;
  projectSymbols?: any[];
  onSelectTemplate: (plantilla: any) => void;
}

function renderizarTextoCapa(capa: any, valoresCampos?: Record<string, string>): string {
  let texto = capa.contenidoRaw || capa.texto || capa.nombre || "";
  if (valoresCampos) {
    for (const [clave, valor] of Object.entries(valoresCampos)) {
      texto = texto.replace(new RegExp(`\\{${clave}\\}`, "g"), valor || "");
    }
  }
  return texto;
}

export const TemplatePreviewModal: React.FC<TemplatePreviewModalProps> = ({
  isOpen,
  onClose,
  plantilla,
  cardConfig,
  projectSymbols = [],
  onSelectTemplate,
}) => {
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !plantilla) return null;

  const widthMm = plantilla.id === "vacia" ? cardConfig.anchoMm : (plantilla.anchoMm || cardConfig.anchoMm || 63.5);
  const heightMm = plantilla.id === "vacia" ? cardConfig.altoMm : (plantilla.altoMm || cardConfig.altoMm || 88.9);
  const isMismatch =
    plantilla.id !== "vacia" &&
    (Math.abs(widthMm - cardConfig.anchoMm) > 0.1 || Math.abs(heightMm - cardConfig.altoMm) > 0.1);

  // Escala para previsualización a gran tamaño (acotando tanto por ancho como por alto)
  const previewScale = Math.min(4.5, 460 / widthMm, 420 / heightMm);
  const cardWidthPx = widthMm * previewScale;
  const cardHeightPx = heightMm * previewScale;

  // Extraer valores por defecto de la plantilla
  const defaultValores: Record<string, string> = {};
  if (Array.isArray(plantilla.camposConfig)) {
    for (const campo of plantilla.camposConfig) {
      if (campo.clave) {
        defaultValores[campo.clave] = campo.valorDefecto || `[${campo.nombre || campo.clave}]`;
      }
    }
  }

  const capas = Array.isArray(plantilla.capas) ? plantilla.capas : [];

  const renderCapaRecursiva = (parentId: string | null): React.ReactNode => {
    const capasFiltradas = capas.filter((c: any) => {
      if (parentId === null) {
        return !c.parentCapaId;
      }
      return c.parentCapaId === parentId;
    });

    return capasFiltradas.map((capa: any) => {
      if (capa.visible === false || capa.visibility === "hidden" || capa.visibility === "collapsed") {
        return null;
      }

      const parentCapa = capas.find((p: any) => p.id === capa.parentCapaId);
      const isParentFlex = parentCapa && isFlexLayout(parentCapa.layout);
      const isParentVertical = parentCapa && isVerticalLayout(parentCapa.layout);
      const isParentHorizontal = parentCapa && isHorizontalLayout(parentCapa.layout);

      const layerX = (capa.xMm || 0) * previewScale;
      const layerY = (capa.yMm || 0) * previewScale;
      const layerW = capa.anchoMm === "auto" ? "fit-content" : `${(capa.anchoMm || widthMm) * previewScale}px`;
      const layerH = capa.altoMm === "auto" ? "fit-content" : `${(capa.altoMm || heightMm) * previewScale}px`;

      const rot = capa.rotacion ?? capa.rotation;
      const layerStyle: React.CSSProperties = {
        position: isParentFlex ? "relative" : "absolute",
        left: isParentFlex ? (isParentVertical ? `${layerX}px` : undefined) : `${layerX}px`,
        top: isParentFlex ? (isParentHorizontal ? `${layerY}px` : undefined) : `${layerY}px`,
        width: layerW,
        height: layerH,
        opacity: typeof capa.opacity === "number" ? capa.opacity : 1,
        transform: rot ? `rotate(${rot}deg)` : undefined,
        transformOrigin: rot ? "center center" : undefined,
        boxSizing: "border-box",
        overflow: "hidden",
        flexShrink: 0,
      };

      if (capa.tipo === "background") {
        const colorFill = capa.colorFill || capa.backgroundColor || "#ffffff";
        return (
          <div
            key={capa.id}
            style={{
              ...layerStyle,
              position: "absolute",
              left: 0,
              top: 0,
              width: "100%",
              height: "100%",
              backgroundColor: colorFill,
            }}
          />
        );
      }

      if (capa.tipo === "block" || capa.tipo === "shape") {
        const radiusPx = (capa.borderRadius ?? capa.borderTopLeftRadius ?? 0) * previewScale;
        const borderWidthPx = (capa.borderWidth ?? capa.borderTopWidth ?? 0) * previewScale;
        return (
          <div
            key={capa.id}
            style={{
              ...layerStyle,
              backgroundColor: capa.backgroundColor || capa.colorFill || "transparent",
              border: borderWidthPx > 0 ? `${borderWidthPx}px solid ${capa.borderColor || capa.borderTopColor || "#000"}` : undefined,
              borderRadius: `${radiusPx}px`,
            }}
          />
        );
      }

      if (capa.tipo === "container" || capa.tipo === "list") {
        const radiusPx = (capa.borderRadius ?? capa.borderTopLeftRadius ?? 0) * previewScale;
        const borderWidthPx = (capa.borderWidth ?? capa.borderTopWidth ?? 0) * previewScale;
        const isFlex = isFlexLayout(capa.layout);
        const flexStyle: React.CSSProperties = isFlex
          ? (getContainerFlexStyle(capa.layout) || {})
          : {};

        return (
          <div
            key={capa.id}
            style={{
              ...layerStyle,
              ...flexStyle,
              backgroundColor: capa.backgroundColor || capa.colorFill || "transparent",
              border: borderWidthPx > 0 ? `${borderWidthPx}px solid ${capa.borderColor || capa.borderTopColor || "#000"}` : undefined,
              borderRadius: `${radiusPx}px`,
            }}
          >
            {renderCapaRecursiva(capa.id)}
          </div>
        );
      }

      if (capa.tipo === "image" || capa.tipo === "image-switch") {
        let src = capa.src;
        if (capa.tipo === "image-switch" && Array.isArray(capa.options) && capa.options.length > 0) {
          const opt = capa.options.find((o: any) => o.id === capa.selectedOptionId) || capa.options[0];
          if (opt && opt.src) src = opt.src;
        }

        return (
          <div key={capa.id} style={layerStyle}>
            {src ? (
              <img
                src={src}
                alt={capa.nombre}
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: capa.modoAjuste === "stretch" ? "fill" : (capa.modoAjuste || "cover"),
                  display: "block",
                }}
              />
            ) : (
              <div
                style={{
                  width: "100%",
                  height: "100%",
                  backgroundColor: "#f1f5f9",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "14px",
                  color: "#94a3b8",
                }}
              >
                🖼️
              </div>
            )}
          </div>
        );
      }

      if (capa.tipo === "text") {
        const rawText = renderizarTextoCapa(capa, defaultValores);
        const htmlText = parsearTextoConSimbolos(parseMarkdownToHtml(rawText), projectSymbols);
        const fontSizePx = Math.max(6, (capa.fontSizePt || 12) * 0.352778 * previewScale);

        return (
          <div
            key={capa.id}
            style={{
              ...layerStyle,
              fontFamily: capa.fontFamily || "sans-serif",
              fontSize: `${fontSizePx}px`,
              color: capa.color || "#000000",
              backgroundColor: capa.backgroundColor || "transparent",
              textAlign: (capa.alineacion === "center" ? "center" : capa.alineacion === "right" ? "right" : "left") as any,
              fontWeight: capa.bold ? "bold" : "normal",
              fontStyle: capa.italic ? "italic" : "normal",
              textDecoration: capa.underline ? "underline" : "none",
              lineHeight: "1.2",
              padding: "2px",
              wordBreak: "break-word",
            }}
            dangerouslySetInnerHTML={{ __html: htmlText }}
          />
        );
      }

      return null;
    });
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(0, 0, 0, 0.75)",
        backdropFilter: "blur(4px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 10000,
        padding: "20px",
        boxSizing: "border-box",
      }}
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: "#18181f",
          border: "1px solid #333342",
          borderRadius: "12px",
          width: "100%",
          maxWidth: "560px",
          maxHeight: "92vh",
          display: "flex",
          flexDirection: "column",
          boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.7)",
          color: "#f1f5f9",
          overflow: "hidden",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Cabecera */}
        <div
          style={{
            padding: "16px 20px",
            borderBottom: "1px solid #2a2a38",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span style={{ fontSize: "20px" }}>👁️</span>
              <h3 style={{ margin: 0, fontSize: "17px", color: "#ffffff", fontWeight: "600" }}>
                {plantilla.nombre || "Plantilla"}
              </h3>
            </div>
            <div style={{ fontSize: "12px", color: "#94a3b8", marginTop: "3px" }}>
              {widthMm} x {heightMm} mm ({capas.length} {capas.length === 1 ? "capa" : "capas"})
            </div>
          </div>
          <button
            onClick={onClose}
            title="Cerrar previsualización"
            style={{
              background: "transparent",
              border: "none",
              color: "#94a3b8",
              cursor: "pointer",
              fontSize: "18px",
              padding: "4px 8px",
              borderRadius: "4px",
            }}
          >
            ✕
          </button>
        </div>

        {/* Aviso de compatibilidad si difiere de las dimensiones */}
        {isMismatch && (
          <div
            style={{
              backgroundColor: "rgba(217, 119, 6, 0.15)",
              borderBottom: "1px solid rgba(217, 119, 6, 0.3)",
              padding: "8px 16px",
              fontSize: "12px",
              color: "#fbbf24",
              display: "flex",
              alignItems: "center",
              gap: "8px",
            }}
          >
            <span>⚠️</span>
            <span>
              El tamaño de esta plantilla ({widthMm}x{heightMm} mm) no coincide con el documento activo ({cardConfig.anchoMm}x{cardConfig.altoMm} mm).
            </span>
          </div>
        )}

        {/* Lienzo Central de Previsualización */}
        <div
          style={{
            flex: 1,
            overflowY: "auto",
            padding: "24px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: "#0d0d12",
          }}
        >
          <div
            style={{
              width: `${cardWidthPx}px`,
              height: `${cardHeightPx}px`,
              position: "relative",
              backgroundColor: "#ffffff",
              borderRadius: `${3 * previewScale}px`,
              boxShadow: "0 15px 35px rgba(0, 0, 0, 0.6), 0 0 0 1px rgba(255, 255, 255, 0.1)",
              overflow: "hidden",
            }}
          >
            {renderCapaRecursiva(null)}
          </div>
        </div>

        {/* Pie de modal con acciones */}
        <div
          style={{
            padding: "14px 20px",
            borderTop: "1px solid #2a2a38",
            display: "flex",
            justifyContent: "flex-end",
            gap: "10px",
            backgroundColor: "#18181f",
          }}
        >
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: "8px 16px",
              borderRadius: "6px",
              border: "1px solid #3f3f4e",
              backgroundColor: "transparent",
              color: "#cbd5e1",
              fontSize: "13px",
              cursor: "pointer",
            }}
          >
            Cerrar
          </button>
          <button
            type="button"
            onClick={() => {
              onSelectTemplate(plantilla);
              onClose();
            }}
            style={{
              padding: "8px 18px",
              borderRadius: "6px",
              border: "none",
              backgroundColor: "#6366f1",
              color: "#ffffff",
              fontSize: "13px",
              fontWeight: "600",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "6px",
            }}
          >
            <span>✨</span>
            <span>Seleccionar esta plantilla</span>
          </button>
        </div>
      </div>
    </div>
  );
};
