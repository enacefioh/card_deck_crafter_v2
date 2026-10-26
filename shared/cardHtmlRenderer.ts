import {
  isVerticalLayout,
  isHorizontalLayout,
  isFlexLayout,
  getContainerFlexCssString,
  calculateAutoDimensionsForFreeContainer
} from "./layoutEngine.js";
import type { ProyectoCDC2, Carta, PlantillaCDC2 } from "./layoutEngine.js";

export const MM_TO_PX = 3.779527559;

export function sanitizarNombreCarpeta(nombre: string, index: number): string {
  if (!nombre) return `Documento_${index + 1}`;
  let clean = nombre.trim().replace(/[\\/:*?"<>|]/g, "_").replace(/\s+/g, "_");
  clean = clean.replace(/^_+|_+$/g, "");
  return clean || `Documento_${index + 1}`;
}

export function parseMarkdownToHtml(text: string): string {
  if (!text) return "";
  let escaped = text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
  escaped = escaped.replace(/\n/g, "<br />");
  escaped = escaped.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  escaped = escaped.replace(/\*([^*]+)\*/g, "<em>$1</em>");
  escaped = escaped.replace(/__([^_]+)__/g, "<u>$1</u>");

  // Procesar escalado de texto con ++ (SRS-058)
  while (/(\+{2,})([^+]+)\1/.test(escaped)) {
    escaped = escaped.replace(/(\+{2,})([^+]+)\1/g, (_match, pluses, content) => {
      const count = pluses.length;
      const factor = Math.pow(1.25, count - 1);
      const percentStr = (factor * 100).toFixed(2).replace(/\.00$/, "");
      return `<span style="font-size: ${percentStr}%;">${content}</span>`;
    });
  }

  return escaped;
}

export function parsearTextoConSimbolos(
  text: string,
  projectSymbols: any[],
  resolverSymbolSrc?: (src: string) => string
): string {
  if (!text) return "";
  return text.replace(/\{([^}]+)\}/g, (match, tag) => {
    const sym = projectSymbols?.find(s => s.tag === tag);
    if (sym && sym.src) {
      const resolvedSrc = resolverSymbolSrc ? resolverSymbolSrc(sym.src) : sym.src;
      return `<img src="${resolvedSrc}" class="symbol-inline-icon" alt="${tag}" style="height: 1em; width: auto; vertical-align: middle; display: inline-block;" />`;
    }
    return match;
  });
}

export function renderizarTextoCapa(
  capa: any,
  valoresCampos?: Record<string, string>,
  capasDePlantilla?: any[]
): string {
  let texto = capa.contenidoRaw || "";
  if (valoresCampos && valoresCampos[capa.id] !== undefined) {
    texto = valoresCampos[capa.id];
  }
  if (valoresCampos) {
    texto = texto.replace(/\{([^}]+)\}/g, (match: string, clave: string) => {
      const trimmedClave = clave.trim();
      if (valoresCampos[trimmedClave] !== undefined) {
        return valoresCampos[trimmedClave];
      }
      if (capasDePlantilla) {
        const targetCapa = capasDePlantilla.find(c => c.nombre === trimmedClave);
        if (targetCapa && valoresCampos[targetCapa.id] !== undefined) {
          return valoresCampos[targetCapa.id];
        }
      }
      return match;
    });
  }
  return texto;
}

export function renderCardFaceContentHtml(
  cardData: Carta,
  esTrasera: boolean,
  doc: any,
  proyecto: ProyectoCDC2,
  resolverAssetPath?: (src: string | null) => string,
  resolverSymbolSrc?: (src: string) => string
): string {
  const cardConfig = doc.cardConfig || { anchoMm: 63.5, altoMm: 88.9 };

  let plantilla: PlantillaCDC2 | undefined = esTrasera ? cardData.plantillaTrasera : cardData.plantilla;
  if (!plantilla) {
    const plantillaId = esTrasera ? cardData.plantillaTraseraId : cardData.plantillaId;
    if (plantillaId && proyecto.templates && proyecto.templates[plantillaId]) {
      plantilla = proyecto.templates[plantillaId];
    }
  }

  let staticImgSrc: string | null = null;
  if (esTrasera) {
    if (doc.modoTraseras === "comun") {
      staticImgSrc = cardData.imagenTrasera || doc.imagenTraseraComun;
    } else if (doc.modoTraseras === "individual") {
      staticImgSrc = cardData.imagenTrasera || doc.imagenTraseraComun;
    }
  } else {
    staticImgSrc = cardData.imagenFrontal || null;
  }

  const resolvePath = (src: string | null): string => {
    if (!src) return "";
    if (resolverAssetPath) return resolverAssetPath(src);
    return src;
  };

  if (plantilla) {
    const capas = plantilla.capas || [];
    const renderCapaRecursiva = (parentId: string | null): string => {
      const filteredLayers = capas.filter((c: any) => {
        if (parentId === null) {
          return !c.parentCapaId;
        }
        return c.parentCapaId === parentId;
      });

      return filteredLayers.map((capa: any) => {
        const overrides = esTrasera ? cardData.capasOverridesTrasera?.[capa.id] : cardData.capasOverrides?.[capa.id];
        const resolvedCapa = overrides ? { ...capa, ...overrides } : capa;

        const parentCapa = capas.find((p: any) => p.id === resolvedCapa.parentCapaId);
        const isParentFlex = parentCapa && isFlexLayout(parentCapa.layout);

        const positionCss = isParentFlex ? "position: relative;" : "position: absolute;";
        
        let leftPx = "";
        let topPx = "";
        const isParentVertical = parentCapa && isVerticalLayout(parentCapa.layout);
        const isParentHorizontal = parentCapa && isHorizontalLayout(parentCapa.layout);

        if (!isParentFlex) {
          leftPx = `left: ${resolvedCapa.xMm * MM_TO_PX}px;`;
          topPx = `top: ${resolvedCapa.yMm * MM_TO_PX}px;`;
        } else {
          if (isParentVertical) {
            leftPx = `left: ${resolvedCapa.xMm * MM_TO_PX}px;`;
          }
          if (isParentHorizontal) {
            topPx = `top: ${resolvedCapa.yMm * MM_TO_PX}px;`;
          }
        }

        const isFreeContainer = (resolvedCapa.tipo === "container" || resolvedCapa.tipo === "list") && !isFlexLayout(resolvedCapa.layout);
        const currentOverrides = esTrasera ? cardData.capasOverridesTrasera : cardData.capasOverrides;
        const autoDims = isFreeContainer ? calculateAutoDimensionsForFreeContainer(resolvedCapa, capas, currentOverrides) : null;

        const widthPx = resolvedCapa.anchoMm === "auto"
          ? (autoDims ? `${autoDims.autoWidthMm * MM_TO_PX}px` : "fit-content")
          : `${resolvedCapa.anchoMm * MM_TO_PX}px`;
        const heightPx = resolvedCapa.altoMm === "auto"
          ? (autoDims ? `${autoDims.autoHeightMm * MM_TO_PX}px` : "fit-content")
          : `${resolvedCapa.altoMm * MM_TO_PX}px`;

        const activeVisibility = resolvedCapa.visibility || "visible";
        let visStyle = "";
        if (activeVisibility === "hidden") {
          visStyle = "visibility: hidden;";
        } else if (activeVisibility === "collapsed") {
          visStyle = "display: none;";
        }

        const rotationStyle = resolvedCapa.rotacion ? `transform: rotate(${resolvedCapa.rotacion}deg); transform-origin: center center;` : "";
        const baseStyle = `${positionCss} ${leftPx} ${topPx} width: ${widthPx}; height: ${heightPx}; pointer-events: none; box-sizing: border-box; flex-shrink: 0; ${visStyle} ${rotationStyle}`;

        if (resolvedCapa.tipo === "background") {
          const colorFill = resolvedCapa.colorFill || "#ffffff";
          return `<div style="position: absolute; left: 0; top: 0; width: 100%; height: 100%; background-color: ${colorFill};"></div>`;
        }

        if (capa.tipo === "block") {
          const borderTopPx = (resolvedCapa.borderTopWidth || 0) * MM_TO_PX;
          const borderRightPx = (resolvedCapa.borderRightWidth || 0) * MM_TO_PX;
          const borderBottomPx = (resolvedCapa.borderBottomWidth || 0) * MM_TO_PX;
          const borderLeftPx = (resolvedCapa.borderLeftWidth || 0) * MM_TO_PX;

          const radiusTopLeftPx = (resolvedCapa.borderTopLeftRadius || 0) * MM_TO_PX;
          const radiusTopRightPx = (resolvedCapa.borderTopRightRadius || 0) * MM_TO_PX;
          const radiusBottomRightPx = (resolvedCapa.borderBottomRightRadius || 0) * MM_TO_PX;
          const radiusBottomLeftPx = (resolvedCapa.borderBottomLeftRadius || 0) * MM_TO_PX;

          const borderTopStyle = borderTopPx > 0 ? `border-top: ${borderTopPx}px solid ${resolvedCapa.borderTopColor || "#000000"};` : "border-top: none;";
          const borderRightStyle = borderRightPx > 0 ? `border-right: ${borderRightPx}px solid ${resolvedCapa.borderRightColor || "#000000"};` : "border-right: none;";
          const borderBottomStyle = borderBottomPx > 0 ? `border-bottom: ${borderBottomPx}px solid ${resolvedCapa.borderBottomColor || "#000000"};` : "border-bottom: none;";
          const borderLeftStyle = borderLeftPx > 0 ? `border-left: ${borderLeftPx}px solid ${resolvedCapa.borderLeftColor || "#000000"};` : "border-left: none;";

          const borderRadiusStyle = `border-top-left-radius: ${radiusTopLeftPx}px; border-top-right-radius: ${radiusTopRightPx}px; border-bottom-right-radius: ${radiusBottomRightPx}px; border-bottom-left-radius: ${radiusBottomLeftPx}px;`;
          const borderCornersCss = `${borderTopStyle} ${borderRightStyle} ${borderBottomStyle} ${borderLeftStyle} ${borderRadiusStyle}`;

          return `<div style="${baseStyle} background-color: ${resolvedCapa.backgroundColor || 'transparent'}; overflow: hidden; ${borderCornersCss}"></div>`;
        }

        if (capa.tipo === "container" || capa.tipo === "list") {
          const borderTopPx = (resolvedCapa.borderTopWidth || 0) * MM_TO_PX;
          const borderRightPx = (resolvedCapa.borderRightWidth || 0) * MM_TO_PX;
          const borderBottomPx = (resolvedCapa.borderBottomWidth || 0) * MM_TO_PX;
          const borderLeftPx = (resolvedCapa.borderLeftWidth || 0) * MM_TO_PX;

          const radiusTopLeftPx = (resolvedCapa.borderTopLeftRadius || 0) * MM_TO_PX;
          const radiusTopRightPx = (resolvedCapa.borderTopRightRadius || 0) * MM_TO_PX;
          const radiusBottomRightPx = (resolvedCapa.borderBottomRightRadius || 0) * MM_TO_PX;
          const radiusBottomLeftPx = (resolvedCapa.borderBottomLeftRadius || 0) * MM_TO_PX;

          const borderTopStyle = borderTopPx > 0 ? `border-top: ${borderTopPx}px solid ${resolvedCapa.borderTopColor || "#000000"};` : "border-top: none;";
          const borderRightStyle = borderRightPx > 0 ? `border-right: ${borderRightPx}px solid ${resolvedCapa.borderRightColor || "#000000"};` : "border-right: none;";
          const borderBottomStyle = borderBottomPx > 0 ? `border-bottom: ${borderBottomPx}px solid ${resolvedCapa.borderBottomColor || "#000000"};` : "border-bottom: none;";
          const borderLeftStyle = borderLeftPx > 0 ? `border-left: ${borderLeftPx}px solid ${resolvedCapa.borderLeftColor || "#000000"};` : "border-left: none;";

          const borderRadiusStyle = `border-top-left-radius: ${radiusTopLeftPx}px; border-top-right-radius: ${radiusTopRightPx}px; border-bottom-right-radius: ${radiusBottomRightPx}px; border-bottom-left-radius: ${radiusBottomLeftPx}px;`;
          const borderCornersCss = `${borderTopStyle} ${borderRightStyle} ${borderBottomStyle} ${borderLeftStyle} ${borderRadiusStyle}`;

          const isFlex = isFlexLayout(resolvedCapa.layout);
          const flexStyle = isFlex ? getContainerFlexCssString(resolvedCapa.layout) : "";

          const innerContentHtml = renderCapaRecursiva(capa.id);
          const displayStyle = activeVisibility === "collapsed" ? "display: none;" : (isFlex ? "display: flex;" : "");

          return `
            <div style="${baseStyle} background-color: ${resolvedCapa.backgroundColor || 'transparent'}; overflow: hidden; ${borderCornersCss} ${flexStyle} ${displayStyle}">
              ${innerContentHtml}
            </div>
          `;
        }

        if (capa.tipo === "text") {
          const valores = esTrasera ? cardData.valoresCamposTrasera : cardData.valoresCampos;
          const textoInterp = renderizarTextoCapa(resolvedCapa, valores, plantilla?.capas);
          const htmlTextWithMarkdown = parseMarkdownToHtml(textoInterp);
          const htmlText = parsearTextoConSimbolos(htmlTextWithMarkdown, proyecto.projectSymbols || [], resolverSymbolSrc);
          const fontSizePt = resolvedCapa.fontSizePt || 12;
          const align = resolvedCapa.alineacion === "center" ? "center" : resolvedCapa.alineacion === "right" ? "right" : resolvedCapa.alineacion === "justify" ? "justify" : "left";
          const weight = resolvedCapa.bold ? "bold" : "normal";
          const styleOpt = resolvedCapa.italic ? "italic" : "normal";
          const decoration = resolvedCapa.underline ? "underline" : "none";
          
          const fontSizePx = fontSizePt * 0.352778 * MM_TO_PX;

          const borderTopPx = (resolvedCapa.borderTopWidth || 0) * MM_TO_PX;
          const borderRightPx = (resolvedCapa.borderRightWidth || 0) * MM_TO_PX;
          const borderBottomPx = (resolvedCapa.borderBottomWidth || 0) * MM_TO_PX;
          const borderLeftPx = (resolvedCapa.borderLeftWidth || 0) * MM_TO_PX;

          const radiusTopLeftPx = (resolvedCapa.borderTopLeftRadius || 0) * MM_TO_PX;
          const radiusTopRightPx = (resolvedCapa.borderTopRightRadius || 0) * MM_TO_PX;
          const radiusBottomRightPx = (resolvedCapa.borderBottomRightRadius || 0) * MM_TO_PX;
          const radiusBottomLeftPx = (resolvedCapa.borderBottomLeftRadius || 0) * MM_TO_PX;

          const borderTopStyle = borderTopPx > 0 ? `border-top: ${borderTopPx}px solid ${resolvedCapa.borderTopColor || "#000000"};` : "border-top: none;";
          const borderRightStyle = borderRightPx > 0 ? `border-right: ${borderRightPx}px solid ${resolvedCapa.borderRightColor || "#000000"};` : "border-right: none;";
          const borderBottomStyle = borderBottomPx > 0 ? `border-bottom: ${borderBottomPx}px solid ${resolvedCapa.borderBottomColor || "#000000"};` : "border-bottom: none;";
          const borderLeftStyle = borderLeftPx > 0 ? `border-left: ${borderLeftPx}px solid ${resolvedCapa.borderLeftColor || "#000000"};` : "border-left: none;";

          const borderRadiusStyle = `border-top-left-radius: ${radiusTopLeftPx}px; border-top-right-radius: ${radiusTopRightPx}px; border-bottom-right-radius: ${radiusBottomRightPx}px; border-bottom-left-radius: ${radiusBottomLeftPx}px;`;
          const borderCornersCss = `${borderTopStyle} ${borderRightStyle} ${borderBottomStyle} ${borderLeftStyle} ${borderRadiusStyle}`;

          const paddingTopMm = resolvedCapa.paddingTopMm !== undefined ? resolvedCapa.paddingTopMm : 0;
          const paddingRightMm = resolvedCapa.paddingRightMm !== undefined ? resolvedCapa.paddingRightMm : 0;
          const paddingBottomMm = resolvedCapa.paddingBottomMm !== undefined ? resolvedCapa.paddingBottomMm : 0;
          const paddingLeftMm = resolvedCapa.paddingLeftMm !== undefined ? resolvedCapa.paddingLeftMm : 0;

          const paddingCss = (paddingTopMm > 0 || paddingRightMm > 0 || paddingBottomMm > 0 || paddingLeftMm > 0)
            ? `padding: ${paddingTopMm}mm ${paddingRightMm}mm ${paddingBottomMm}mm ${paddingLeftMm}mm;`
            : "padding: 2px;";

          const textOutlinePx = (resolvedCapa.textOutlineWidth || 0) * MM_TO_PX;
          const textOutlineCss = textOutlinePx > 0
            ? `-webkit-text-stroke-width: ${textOutlinePx}px; -webkit-text-stroke-color: ${resolvedCapa.textOutlineColor || '#000000'}; paint-order: stroke fill;`
            : '';
          const lineH = typeof resolvedCapa.lineHeight === "number" && resolvedCapa.lineHeight > 0 ? resolvedCapa.lineHeight : 1.2;
          const vAlign = resolvedCapa.alineacionVertical === "bottom" ? "flex-end" : resolvedCapa.alineacionVertical === "center" ? "center" : "flex-start";

          return `<div style="${baseStyle} display: flex; flex-direction: column; justify-content: ${vAlign}; font-family: ${resolvedCapa.fontFamily === 'sans-serif' || !resolvedCapa.fontFamily ? "'Inter', 'Segoe UI', sans-serif" : resolvedCapa.fontFamily}; font-size: ${fontSizePx}px; color: ${resolvedCapa.color || '#000000'}; background-color: ${resolvedCapa.backgroundColor || 'transparent'}; font-weight: ${weight}; font-style: ${styleOpt}; text-decoration: ${decoration}; white-space: pre-wrap; word-break: break-word; line-height: ${lineH}; ${paddingCss} ${borderCornersCss} ${textOutlineCss}"><div style="width: 100%; text-align: ${align};">${htmlText}</div></div>`;
        }

        if (capa.tipo === "image" || capa.tipo === "image-switch") {
          const rawSrc = resolvedCapa.src;
          const imgPath = resolvePath(rawSrc);

          const borderTopPx = (resolvedCapa.borderTopWidth || 0) * MM_TO_PX;
          const borderRightPx = (resolvedCapa.borderRightWidth || 0) * MM_TO_PX;
          const borderBottomPx = (resolvedCapa.borderBottomWidth || 0) * MM_TO_PX;
          const borderLeftPx = (resolvedCapa.borderLeftWidth || 0) * MM_TO_PX;

          const radiusTopLeftPx = (resolvedCapa.borderTopLeftRadius || 0) * MM_TO_PX;
          const radiusTopRightPx = (resolvedCapa.borderTopRightRadius || 0) * MM_TO_PX;
          const radiusBottomRightPx = (resolvedCapa.borderBottomRightRadius || 0) * MM_TO_PX;
          const radiusBottomLeftPx = (resolvedCapa.borderBottomLeftRadius || 0) * MM_TO_PX;

          const borderTopStyle = borderTopPx > 0 ? `border-top: ${borderTopPx}px solid ${resolvedCapa.borderTopColor || "#000000"};` : "border-top: none;";
          const borderRightStyle = borderRightPx > 0 ? `border-right: ${borderRightPx}px solid ${resolvedCapa.borderRightColor || "#000000"};` : "border-right: none;";
          const borderBottomStyle = borderBottomPx > 0 ? `border-bottom: ${borderBottomPx}px solid ${resolvedCapa.borderBottomColor || "#000000"};` : "border-bottom: none;";
          const borderLeftStyle = borderLeftPx > 0 ? `border-left: ${borderLeftPx}px solid ${resolvedCapa.borderLeftColor || "#000000"};` : "border-left: none;";

          const borderRadiusStyle = `border-top-left-radius: ${radiusTopLeftPx}px; border-top-right-radius: ${radiusTopRightPx}px; border-bottom-right-radius: ${radiusBottomRightPx}px; border-bottom-left-radius: ${radiusBottomLeftPx}px;`;
          const borderCornersCss = `${borderTopStyle} ${borderRightStyle} ${borderBottomStyle} ${borderLeftStyle} ${borderRadiusStyle}`;

          if (imgPath) {
            const objectFit = resolvedCapa.modoAjuste === "stretch" ? "fill" : (resolvedCapa.modoAjuste || "cover");
            return `
              <div style="${baseStyle} background-color: ${resolvedCapa.backgroundColor || 'transparent'}; ${borderCornersCss}">
                <img src="${imgPath}" style="width: 100%; height: 100%; object-fit: ${objectFit}; display: block; border-radius: inherit;" />
              </div>
            `;
          } else {
            const emojiSize = Math.min(resolvedCapa.anchoMm, resolvedCapa.altoMm) * 0.4 * MM_TO_PX;
            return `
              <div style="${baseStyle} background-color: #e2e8f0; border: 1px dashed #cbd5e1; display: flex; align-items: center; justify-content: center; ${borderCornersCss}">
                <span style="font-size: ${emojiSize}px; line-height: 1; font-family: sans-serif;">🖼️</span>
              </div>
            `;
          }
        }

        return "";
      }).join("\n");
    };

    return renderCapaRecursiva(null);
  }

  const imgPath = resolvePath(staticImgSrc);
  if (imgPath) {
    const fitMode = cardConfig.modoAjuste || "cover";
    const objectFit = fitMode === "cover" ? "cover" : "contain";
    return `<img src="${imgPath}" style="width: 100%; height: 100%; object-fit: ${objectFit}; display: block;" />`;
  }

  return "";
}
