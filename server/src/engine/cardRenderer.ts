import path from "path";
import {
  isVerticalLayout,
  isHorizontalLayout,
  isFlexLayout,
  getContainerFlexCssString,
  calculateAutoDimensionsForFreeContainer
} from "shared";
import type { ProyectoCDC2, Carta, PlantillaCDC2 } from "shared";

const MM_TO_PX = 3.779527559;

export function sanitizarNombreCarpeta(nombre: string, index: number): string {
  if (!nombre) return `Documento_${index + 1}`;
  let clean = nombre.trim().replace(/[\\/:*?"<>|]/g, "_").replace(/\s+/g, "_");
  clean = clean.replace(/^_+|_+$/g, "");
  return clean || `Documento_${index + 1}`;
}

export function parsearTextoConSimbolos(text: string, projectSymbols: any[], tempDir?: string): string {
  if (!text) return "";
  return text.replace(/\{([^}]+)\}/g, (match, tag) => {
    const sym = projectSymbols?.find(s => s.tag === tag);
    if (sym && sym.src) {
      let resolvedSrc = sym.src;
      if (resolvedSrc.startsWith("symbol_asset://")) {
        const filename = resolvedSrc.replace("symbol_asset://", "");
        if (tempDir) {
          const absPath = path.join(tempDir, "symbols", filename);
          resolvedSrc = `file:///${absPath.replace(/\\/g, "/")}`;
        } else {
          resolvedSrc = `/api/symbols/raw/${filename}`;
        }
      }
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
    texto = texto.replace(/\{\{([^}]+)\}\}/g, (match: string, clave: string) => {
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

export function renderCardFaceContentHtml(
  cardData: Carta,
  esTrasera: boolean,
  doc: any,
  tempDir: string,
  proyecto: ProyectoCDC2
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

  const resolverAssetPath = (src: string | null) => {
    if (!src) return "";
    if (src.startsWith("symbol_asset://")) {
      const filename = src.replace("symbol_asset://", "");
      const absPath = path.join(tempDir, "symbols", filename);
      return `file:///${absPath.replace(/\\/g, "/")}`;
    }
    if (src.startsWith("user_asset://")) {
      const filename = src.replace("user_asset://", "");
      const absPath = path.join(tempDir, "user_assets", filename);
      return `file:///${absPath.replace(/\\/g, "/")}`;
    }
    if (src.startsWith("project_asset://")) {
      const filename = src.replace("project_asset://", "");
      const absPath = path.join(tempDir, "project_assets", filename);
      return `file:///${absPath.replace(/\\/g, "/")}`;
    }
    if (src.startsWith("asset://")) {
      const filename = src.replace("asset://", "");
      const absPath = path.join(tempDir, "assets", filename);
      return `file:///${absPath.replace(/\\/g, "/")}`;
    }
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
          const htmlText = parsearTextoConSimbolos(htmlTextWithMarkdown, proyecto.projectSymbols || [], tempDir);
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

          return `<div style="${baseStyle} font-family: ${resolvedCapa.fontFamily === 'sans-serif' || !resolvedCapa.fontFamily ? "'Inter', 'Segoe UI', sans-serif" : resolvedCapa.fontFamily}; font-size: ${fontSizePx}px; color: ${resolvedCapa.color || '#000000'}; background-color: ${resolvedCapa.backgroundColor || 'transparent'}; text-align: ${align}; font-weight: ${weight}; font-style: ${styleOpt}; text-decoration: ${decoration}; white-space: pre-wrap; word-break: break-word; line-height: 1.2; ${paddingCss} ${borderCornersCss} ${textOutlineCss}">${htmlText}</div>`;
        }

        if (capa.tipo === "image" || capa.tipo === "image-switch") {
          const rawSrc = resolvedCapa.src;
          const imgPath = resolverAssetPath(rawSrc);

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

  const imgPath = resolverAssetPath(staticImgSrc);
  if (imgPath) {
    const fitMode = cardConfig.modoAjuste || "cover";
    const objectFit = fitMode === "cover" ? "cover" : "contain";
    return `<img src="${imgPath}" style="width: 100%; height: 100%; object-fit: ${objectFit}; display: block;" />`;
  }

  return "";
}

export function generarHtmlExportacionPng(
  proyecto: ProyectoCDC2,
  tempDir: string
): {
  html: string;
  metadataDoc: Array<{
    docIndex: number;
    docName: string;
    folderName: string;
    cardItems: Array<{ cardIndexStr: string; hasFront: boolean; hasBack: boolean }>;
    cardConfig: any;
    uniqueCardsCount: number;
    totalCardsCount: number;
  }>;
} {
  const tipografiasMap = new Map<string, { nombre: string; type: string; data: string }>();

  if (proyecto.customFonts) {
    for (const font of proyecto.customFonts) {
      if (font.nombre && font.data) {
        tipografiasMap.set(font.nombre, { nombre: font.nombre, type: font.type, data: font.data });
      }
    }
  }

  if (proyecto.templates) {
    for (const template of Object.values(proyecto.templates)) {
      if (template && (template as any).customFonts) {
        for (const font of (template as any).customFonts) {
          if (font.nombre && font.data) {
            tipografiasMap.set(font.nombre, { nombre: font.nombre, type: font.type, data: font.data });
          }
        }
      }
    }
  }

  if (proyecto.documentos) {
    for (const doc of proyecto.documentos) {
      if (doc.cards) {
        for (const card of doc.cards) {
          if (card.plantilla && card.plantilla.customFonts) {
            for (const font of card.plantilla.customFonts) {
              if (font.nombre && font.data) {
                tipografiasMap.set(font.nombre, { nombre: font.nombre, type: font.type, data: font.data });
              }
            }
          }
          if (card.plantillaTrasera && card.plantillaTrasera.customFonts) {
            for (const font of card.plantillaTrasera.customFonts) {
              if (font.nombre && font.data) {
                tipografiasMap.set(font.nombre, { nombre: font.nombre, type: font.type, data: font.data });
              }
            }
          }
        }
      }
    }
  }

  const fontRules = Array.from(tipografiasMap.values()).map((font) => `
    @font-face {
      font-family: '${font.nombre}';
      src: url('data:${font.type};base64,${font.data}');
    }
  `).join("\n");

  const metadataDoc: Array<{
    docIndex: number;
    docName: string;
    folderName: string;
    cardItems: Array<{ cardIndexStr: string; hasFront: boolean; hasBack: boolean }>;
    cardConfig: any;
    uniqueCardsCount: number;
    totalCardsCount: number;
  }> = [];

  const cardsContainersHtml: string[] = [];
  const usedFolderNames = new Set<string>();

  const documentos = proyecto.documentos || [];
  documentos.forEach((doc: any, dIndex: number) => {
    let folderName = sanitizarNombreCarpeta(doc.nombre, dIndex);
    let altSuffix = 1;
    let baseFolderName = folderName;
    while (usedFolderNames.has(folderName)) {
      altSuffix++;
      folderName = `${baseFolderName}_${altSuffix}`;
    }
    usedFolderNames.add(folderName);

    const cardConfig = doc.cardConfig || { anchoMm: 63.5, altoMm: 88.9, sangradoMm: 0.5 };
    const anchoPx = Math.round((cardConfig.anchoMm / 25.4) * 300);
    const altoPx = Math.round((cardConfig.altoMm / 25.4) * 300);
    const cssWidthPx = anchoPx / 3.125;
    const cssHeightPx = altoPx / 3.125;

    const cards = doc.cards || [];
    const uniqueCardsCount = cards.length;
    let totalCardsCount = 0;

    const cardItems: Array<{ cardIndexStr: string; hasFront: boolean; hasBack: boolean }> = [];
    let physicalCardIndex = 1;

    cards.forEach((card: Carta) => {
      const count = Math.max(1, card.cantidad || 1);
      for (let c = 0; c < count; c++) {
        totalCardsCount++;
        const cardIndexStr = String(physicalCardIndex).padStart(3, "0");
        physicalCardIndex++;

        // Render Front
        const frontContentHtml = renderCardFaceContentHtml(card, false, doc, tempDir, proyecto);
        const frontContainerId = `card_${dIndex}_${cardIndexStr}_D`;
        cardsContainersHtml.push(`
          <div id="${frontContainerId}" class="card-export-frame" style="width: ${cssWidthPx}px; height: ${cssHeightPx}px;">
            ${frontContentHtml}
          </div>
        `);

        // Check if Back exists
        let hasBack = false;
        if (doc.modoTraseras === "comun") {
          hasBack = true;
        } else if (doc.modoTraseras === "individual") {
          let plantillaT = card.plantillaTrasera;
          if (!plantillaT && card.plantillaTraseraId && proyecto.templates) {
            plantillaT = proyecto.templates[card.plantillaTraseraId];
          }
          if (plantillaT || card.imagenTrasera || doc.imagenTraseraComun) {
            hasBack = true;
          }
        }

        if (hasBack) {
          const backContentHtml = renderCardFaceContentHtml(card, true, doc, tempDir, proyecto);
          const backContainerId = `card_${dIndex}_${cardIndexStr}_T`;
          cardsContainersHtml.push(`
            <div id="${backContainerId}" class="card-export-frame" style="width: ${cssWidthPx}px; height: ${cssHeightPx}px;">
              ${backContentHtml}
            </div>
          `);
        }

        cardItems.push({
          cardIndexStr,
          hasFront: true,
          hasBack
        });
      }
    });

    metadataDoc.push({
      docIndex: dIndex,
      docName: doc.nombre || `Documento ${dIndex + 1}`,
      folderName,
      cardItems,
      cardConfig,
      uniqueCardsCount,
      totalCardsCount
    });
  });

  const fullHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <link rel="preconnect" href="https://fonts.googleapis.com">
      <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Outfit:wght@400;500;600;700;800&display=swap" rel="stylesheet">
      <style>
        ${fontRules}
        * {
          box-sizing: border-box;
        }
        html, body {
          margin: 0;
          padding: 0;
          background-color: transparent;
        }
        .card-export-frame {
          position: relative;
          overflow: hidden;
          background-color: #ffffff;
        }
      </style>
    </head>
    <body>
      ${cardsContainersHtml.join("\n")}
    </body>
    </html>
  `;

  return {
    html: fullHtml,
    metadataDoc
  };
}
