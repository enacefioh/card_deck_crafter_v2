import { calcularDistribucion } from "../../shared/layoutEngine.js";
import type { CanvasConfig, CardConfig, Carta, ProyectoCDC2 } from "../../shared/layoutEngine.js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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

function generarHtmlImpresion(
  canvasConfig: CanvasConfig,
  cardConfig: any,
  paginasFrontales: any[],
  paginasTraseras: any[],
  tempDir: string,
  proyecto: ProyectoCDC2
): string {
  const activeDoc = proyecto.documentos?.find((d: any) => d.id === proyecto.activeDocumentoId) || proyecto.documentos?.[0] || (proyecto as any);
  // Recopilar todas las tipografías para inyectarlas como data URIs base64
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
  } else if ((proyecto as any).cards) {
    for (const card of (proyecto as any).cards) {
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

  const fontRules = Array.from(tipografiasMap.values()).map((font) => `
    @font-face {
      font-family: '${font.nombre}';
      src: url('data:${font.type};base64,${font.data}');
    }
  `).join("\n");

  const wMm = canvasConfig.anchoMm;
  const hMm = canvasConfig.altoMm;
  
  const resolverAssetPath = (src: string | null) => {
    if (!src) return "";
    if (src.startsWith("project_asset://")) {
      return src.replace("project_asset://", "project_assets/");
    }
    if (src.startsWith("asset://")) {
      return src.replace("asset://", "assets/");
    }
    return src;
  };

  const paginasHtml: string[] = [];

  const renderSlots = (slots: any[]) => {
    return slots.map((slot: any) => {
      const width = slot.anchoMm;
      const height = slot.altoMm;
      const x = slot.xMm;
      const y = slot.yMm;
      const sangrado = slot.sangradoMm;
      const borderMm = slot.bordeCorteMm;
      const borderColor = slot.bordeCorteColor || "#000000";

      const noOverlap = borderMm > 0;
      const scaleX = noOverlap ? (width - 2 * borderMm) / width : 1;
      const scaleY = noOverlap ? (height - 2 * borderMm) / height : 1;

      // Para plantillas
      const templateLeft = noOverlap ? (borderMm - sangrado * scaleX) : -sangrado;
      const templateTop = noOverlap ? (borderMm - sangrado * scaleY) : -sangrado;
      const templateWidth = width + 2 * sangrado;
      const templateHeight = height + 2 * sangrado;

      // Para imágenes normales
      let imgLeft = -sangrado;
      let imgTop = -sangrado;
      let imgWidth = width + 2 * sangrado;
      let imgHeight = height + 2 * sangrado;

      if (noOverlap) {
        imgLeft = borderMm - sangrado;
        imgTop = borderMm - sangrado;
        imgWidth = width - 2 * borderMm + 2 * sangrado;
        imgHeight = height - 2 * borderMm + 2 * sangrado;
      }

      let marksHtml = "";
      if (canvasConfig.marcasCorteEsquinas) {
        marksHtml = `
          <div class="corner-cut-mark top-left" style="left: 0; top: 0;"></div>
          <div class="corner-cut-mark top-right" style="right: 0; top: 0;"></div>
          <div class="corner-cut-mark bottom-left" style="left: 0; bottom: 0;"></div>
          <div class="corner-cut-mark bottom-right" style="right: 0; bottom: 0;"></div>
        `;
      }

      let borderHtml = "";
      if (borderMm > 0) {
        borderHtml = `
          <div class="card-border-cut" style="border-width: ${borderMm}mm; border-color: ${borderColor}; border-style: solid;"></div>
        `;
      }

      const cardData = (activeDoc.cards || []).find((c: any) => c.id === slot.cartaId);
      if (cardData && cardData.plantillaId && proyecto.templates && proyecto.templates[cardData.plantillaId]) {
        const plantilla = proyecto.templates[cardData.plantillaId];
        
        const renderCapaRecursiva = (parentId: string | null): string => {
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

            const isFlexParent = isParentFlex;
            const positionCss = isFlexParent ? "position: relative;" : "position: absolute;";
            
            let leftMm = "";
            let topMm = "";
            const isParentVertical = parentCapa && parentCapa.layout === "vertical";
            const isParentHorizontal = parentCapa && parentCapa.layout === "horizontal";

            if (!isFlexParent) {
              const xMmVal = capa.xMm + (parentId === null ? sangrado : 0);
              const yMmVal = capa.yMm + (parentId === null ? sangrado : 0);
              leftMm = `left: ${xMmVal}mm;`;
              topMm = `top: ${yMmVal}mm;`;
            } else {
              if (isParentVertical) {
                leftMm = `left: ${capa.xMm}mm;`;
              }
              if (isParentHorizontal) {
                topMm = `top: ${capa.yMm}mm;`;
              }
            }

            const widthMm = `${capa.anchoMm}mm`;
            const heightMm = `${capa.altoMm}mm`;

            const baseStyle = `${positionCss} ${leftMm} ${topMm} width: ${widthMm}; height: ${heightMm}; pointer-events: none; box-sizing: border-box; flex-shrink: 0;`;

            if (capa.tipo === "background") {
              const colorFill = cardData.capasOverrides?.[capa.id]?.colorFill || capa.colorFill || "#ffffff";
              return `
                <div style="${baseStyle} background-color: ${colorFill};"></div>
              `;
            }

            if (capa.tipo === "block") {
              const overrides = cardData.capasOverrides?.[capa.id];
              const resolvedCapa = overrides ? { ...capa, ...overrides } : capa;

              // Bordes y Esquinas (SRS-024)
              const borderTopMm = resolvedCapa.borderTopWidth || 0;
              const borderRightMm = resolvedCapa.borderRightWidth || 0;
              const borderBottomMm = resolvedCapa.borderBottomWidth || 0;
              const borderLeftMm = resolvedCapa.borderLeftWidth || 0;

              const radiusTopLeftMm = resolvedCapa.borderTopLeftRadius || 0;
              const radiusTopRightMm = resolvedCapa.borderTopRightRadius || 0;
              const radiusBottomRightMm = resolvedCapa.borderBottomRightRadius || 0;
              const radiusBottomLeftMm = resolvedCapa.borderBottomLeftRadius || 0;

              const borderTopStyle = borderTopMm > 0 ? `border-top: ${borderTopMm}mm solid ${resolvedCapa.borderTopColor || "#000000"};` : "border-top: none;";
              const borderRightStyle = borderRightMm > 0 ? `border-right: ${borderRightMm}mm solid ${resolvedCapa.borderRightColor || "#000000"};` : "border-right: none;";
              const borderBottomStyle = borderBottomMm > 0 ? `border-bottom: ${borderBottomMm}mm solid ${resolvedCapa.borderBottomColor || "#000000"};` : "border-bottom: none;";
              const borderLeftStyle = borderLeftMm > 0 ? `border-left: ${borderLeftMm}mm solid ${resolvedCapa.borderLeftColor || "#000000"};` : "border-left: none;";

              const borderRadiusStyle = `border-top-left-radius: ${radiusTopLeftMm}mm; border-top-right-radius: ${radiusTopRightMm}mm; border-bottom-right-radius: ${radiusBottomRightMm}mm; border-bottom-left-radius: ${radiusBottomLeftMm}mm;`;
              const borderCornersCss = `${borderTopStyle} ${borderRightStyle} ${borderBottomStyle} ${borderLeftStyle} ${borderRadiusStyle}`;

              return `
                <div style="${baseStyle} background-color: ${resolvedCapa.backgroundColor || 'transparent'}; overflow: hidden; ${borderCornersCss}"></div>
              `;
            }

            if (capa.tipo === "container") {
              const overrides = cardData.capasOverrides?.[capa.id];
              const resolvedCapa = overrides ? { ...capa, ...overrides } : capa;

              // Bordes y Esquinas (SRS-024)
              const borderTopMm = resolvedCapa.borderTopWidth || 0;
              const borderRightMm = resolvedCapa.borderRightWidth || 0;
              const borderBottomMm = resolvedCapa.borderBottomWidth || 0;
              const borderLeftMm = resolvedCapa.borderLeftWidth || 0;

              const radiusTopLeftMm = resolvedCapa.borderTopLeftRadius || 0;
              const radiusTopRightMm = resolvedCapa.borderTopRightRadius || 0;
              const radiusBottomRightMm = resolvedCapa.borderBottomRightRadius || 0;
              const radiusBottomLeftMm = resolvedCapa.borderBottomLeftRadius || 0;

              const borderTopStyle = borderTopMm > 0 ? `border-top: ${borderTopMm}mm solid ${resolvedCapa.borderTopColor || "#000000"};` : "border-top: none;";
              const borderRightStyle = borderRightMm > 0 ? `border-right: ${borderRightMm}mm solid ${resolvedCapa.borderRightColor || "#000000"};` : "border-right: none;";
              const borderBottomStyle = borderBottomMm > 0 ? `border-bottom: ${borderBottomMm}mm solid ${resolvedCapa.borderBottomColor || "#000000"};` : "border-bottom: none;";
              const borderLeftStyle = borderLeftMm > 0 ? `border-left: ${borderLeftMm}mm solid ${resolvedCapa.borderLeftColor || "#000000"};` : "border-left: none;";

              const borderRadiusStyle = `border-top-left-radius: ${radiusTopLeftMm}mm; border-top-right-radius: ${radiusTopRightMm}mm; border-bottom-right-radius: ${radiusBottomRightMm}mm; border-bottom-left-radius: ${radiusBottomLeftMm}mm;`;
              const borderCornersCss = `${borderTopStyle} ${borderRightStyle} ${borderBottomStyle} ${borderLeftStyle} ${borderRadiusStyle}`;

              const isFlex = resolvedCapa.layout === "vertical" || resolvedCapa.layout === "horizontal";
              const flexStyle = isFlex ? `display: flex; flex-direction: ${resolvedCapa.layout === "vertical" ? "column" : "row"};` : "";

              const innerContentHtml = renderCapaRecursiva(capa.id);

              return `
                <div style="${baseStyle} background-color: ${resolvedCapa.backgroundColor || 'transparent'}; overflow: hidden; ${borderCornersCss} ${flexStyle}">
                  ${innerContentHtml}
                </div>
              `;
            }

            if (capa.tipo === "text") {
              const overrides = cardData.capasOverrides?.[capa.id];
              const resolvedCapa = overrides ? { ...capa, ...overrides } : capa;
              const textoInterp = renderizarTextoCapa(resolvedCapa, cardData.valoresCampos);
              const htmlText = parseMarkdownToHtml(textoInterp);
              const fontSizePt = resolvedCapa.fontSizePt || 12;
              const align = resolvedCapa.alineacion === "center" ? "center" : resolvedCapa.alineacion === "right" ? "right" : resolvedCapa.alineacion === "justify" ? "justify" : "left";
              const weight = resolvedCapa.bold ? "bold" : "normal";
              const styleOpt = resolvedCapa.italic ? "italic" : "normal";
              const decoration = resolvedCapa.underline ? "underline" : "none";

              // Bordes y Esquinas (SRS-024)
              const borderTopMm = resolvedCapa.borderTopWidth || 0;
              const borderRightMm = resolvedCapa.borderRightWidth || 0;
              const borderBottomMm = resolvedCapa.borderBottomWidth || 0;
              const borderLeftMm = resolvedCapa.borderLeftWidth || 0;

              const radiusTopLeftMm = resolvedCapa.borderTopLeftRadius || 0;
              const radiusTopRightMm = resolvedCapa.borderTopRightRadius || 0;
              const radiusBottomRightMm = resolvedCapa.borderBottomRightRadius || 0;
              const radiusBottomLeftMm = resolvedCapa.borderBottomLeftRadius || 0;

              const borderTopStyle = borderTopMm > 0 ? `border-top: ${borderTopMm}mm solid ${resolvedCapa.borderTopColor || "#000000"};` : "border-top: none;";
              const borderRightStyle = borderRightMm > 0 ? `border-right: ${borderRightMm}mm solid ${resolvedCapa.borderRightColor || "#000000"};` : "border-right: none;";
              const borderBottomStyle = borderBottomMm > 0 ? `border-bottom: ${borderBottomMm}mm solid ${resolvedCapa.borderBottomColor || "#000000"};` : "border-bottom: none;";
              const borderLeftStyle = borderLeftMm > 0 ? `border-left: ${borderLeftMm}mm solid ${resolvedCapa.borderLeftColor || "#000000"};` : "border-left: none;";

              const borderRadiusStyle = `border-top-left-radius: ${radiusTopLeftMm}mm; border-top-right-radius: ${radiusTopRightMm}mm; border-bottom-right-radius: ${radiusBottomRightMm}mm; border-bottom-left-radius: ${radiusBottomLeftMm}mm;`;
              const borderCornersCss = `${borderTopStyle} ${borderRightStyle} ${borderBottomStyle} ${borderLeftStyle} ${borderRadiusStyle}`;

              return `
                <div style="${baseStyle} font-family: ${resolvedCapa.fontFamily || 'sans-serif'}; font-size: ${fontSizePt * 0.352778}mm; color: ${resolvedCapa.color || '#000000'}; background-color: ${resolvedCapa.backgroundColor || 'transparent'}; text-align: ${align}; font-weight: ${weight}; font-style: ${styleOpt}; text-decoration: ${decoration}; white-space: pre-wrap; word-break: break-word; line-height: 1.2; pointer-events: none; ${borderCornersCss}">
                  ${htmlText}
                </div>
              `;
            }

            if (capa.tipo === "image" || capa.tipo === "image-switch") {
              const overrides = cardData.capasOverrides?.[capa.id];
              const resolvedCapa = overrides ? { ...capa, ...overrides } : capa;
              const rawSrc = resolvedCapa.src;
              const imgPath = resolverAssetPath(rawSrc);

              // Bordes y Esquinas (SRS-024)
              const borderTopMm = resolvedCapa.borderTopWidth || 0;
              const borderRightMm = resolvedCapa.borderRightWidth || 0;
              const borderBottomMm = resolvedCapa.borderBottomWidth || 0;
              const borderLeftMm = resolvedCapa.borderLeftWidth || 0;

              const radiusTopLeftMm = resolvedCapa.borderTopLeftRadius || 0;
              const radiusTopRightMm = resolvedCapa.borderTopRightRadius || 0;
              const radiusBottomRightMm = resolvedCapa.borderBottomRightRadius || 0;
              const radiusBottomLeftMm = resolvedCapa.borderBottomLeftRadius || 0;

              const borderTopStyle = borderTopMm > 0 ? `border-top: ${borderTopMm}mm solid ${resolvedCapa.borderTopColor || "#000000"};` : "border-top: none;";
              const borderRightStyle = borderRightMm > 0 ? `border-right: ${borderRightMm}mm solid ${resolvedCapa.borderRightColor || "#000000"};` : "border-right: none;";
              const borderBottomStyle = borderBottomMm > 0 ? `border-bottom: ${borderBottomMm}mm solid ${resolvedCapa.borderBottomColor || "#000000"};` : "border-bottom: none;";
              const borderLeftStyle = borderLeftMm > 0 ? `border-left: ${borderLeftMm}mm solid ${resolvedCapa.borderLeftColor || "#000000"};` : "border-left: none;";

              const borderRadiusStyle = `border-top-left-radius: ${radiusTopLeftMm}mm; border-top-right-radius: ${radiusTopRightMm}mm; border-bottom-right-radius: ${radiusBottomRightMm}mm; border-bottom-left-radius: ${radiusBottomLeftMm}mm;`;
              const borderCornersCss = `${borderTopStyle} ${borderRightStyle} ${borderBottomStyle} ${borderLeftStyle} ${borderRadiusStyle}`;

              if (imgPath) {
                const objectFit = resolvedCapa.modoAjuste === "stretch" ? "fill" : (resolvedCapa.modoAjuste || "cover");
                return `
                  <div style="${baseStyle} background-color: ${resolvedCapa.backgroundColor || 'transparent'}; ${borderCornersCss}">
                    <img src="${imgPath}" style="width: 100%; height: 100%; object-fit: ${objectFit}; display: block; border-radius: inherit;" />
                  </div>
                `;
              } else {
                const emojiSize = Math.min(resolvedCapa.anchoMm, resolvedCapa.altoMm) * 0.4;
                return `
                  <div style="${baseStyle} background-color: #e2e8f0; border: 1px dashed #cbd5e1; display: flex; align-items: center; justify-content: center; ${borderCornersCss}">
                    <span style="font-size: ${emojiSize}mm; line-height: 1; font-family: sans-serif;">🖼️</span>
                  </div>
                `;
              }
            }

            return "";
          }).join("\n");
        };
        const layersHtml = renderCapaRecursiva(null);

        return `
          <div class="card-slot" style="left: ${x}mm; top: ${y}mm; width: ${width}mm; height: ${height}mm;">
            <div class="card-template-render-wrapper" style="position: absolute; left: ${templateLeft}mm; top: ${templateTop}mm; width: ${templateWidth}mm; height: ${templateHeight}mm; overflow: hidden; background-color: #ffffff; ${noOverlap ? `transform: scale(${scaleX}, ${scaleY}); transform-origin: top left;` : ""}">
              ${layersHtml}
            </div>
            ${borderHtml}
            ${marksHtml}
          </div>
        `;
      }

      const imgPath = resolverAssetPath(slot.imagenSrc);
      const fitMode = cardConfig.modoAjuste || "cover";
      const bgImgStyle = imgPath ? `background-image: url('${imgPath}'); background-size: ${fitMode}; background-repeat: no-repeat; background-position: center;` : "";

      return `
        <div class="card-slot" style="left: ${x}mm; top: ${y}mm; width: ${width}mm; height: ${height}mm;">
          <div class="card-image-render" style="left: ${imgLeft}mm; top: ${imgTop}mm; width: ${imgWidth}mm; height: ${imgHeight}mm; ${bgImgStyle}"></div>
          ${borderHtml}
          ${marksHtml}
        </div>
      `;
    }).join("\n");
  };

  for (let i = 0; i < paginasFrontales.length; i++) {
    paginasHtml.push(`
      <div class="page">
        ${renderSlots(paginasFrontales[i].slots)}
      </div>
    `);
  }

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        ${fontRules}
        @page { size: ${wMm}mm ${hMm}mm; margin: 0; }
        body { margin: 0; padding: 0; background-color: #ffffff; }
        .page { width: ${wMm}mm; height: ${hMm}mm; position: relative; page-break-after: always; overflow: hidden; }
        .card-slot { position: absolute; overflow: hidden; }
      </style>
    </head>
    <body>
      ${paginasHtml.join("\n")}
    </body>
    </html>
  `;
}

function debug() {
  const proyectoPrueba: ProyectoCDC2 = {
    version: "2.0.0",
    meta: { nombre: "Test", fechaCreacion: "", fechaModificacion: "" },
    canvasConfig: { tipo: "A4", anchoMm: 210, altoMm: 297, orientacion: "vertical", margenTopMm: 10, margenBottomMm: 10, margenLeftMm: 10, margenRightMm: 10, lineasCorteContinuas: true, marcasCorteEsquinas: true },
    cardConfig: { anchoMm: 63.5, altoMm: 88.9, espaciadoXMm: 2, espaciadoYMm: 2, sangradoMm: 2, bordeCorteMm: 0.5, bordeCorteColor: "#ff0000" },
    modoTraseras: "ninguno",
    imagenTraseraComun: null,
    templates: {
      simple: {
        id: "simple",
        nombre: "Plantilla Simple",
        capas: [
          { id: "background", nombre: "Fondo Blanco", tipo: "background", xMm: 0, yMm: 0, anchoMm: 63.5, altoMm: 88.9, colorFill: "#ffffff" },
          { id: "titulo", nombre: "Título", tipo: "text", xMm: 5, yMm: 5, anchoMm: 53.5, altoMm: 8, contenidoRaw: "{{titulo}}", fontFamily: "sans-serif", fontSizePt: 14, color: "#000000", alineacion: "center", bold: true },
          { id: "texto", nombre: "Texto", tipo: "text", xMm: 5, yMm: 15, anchoMm: 53.5, altoMm: 68.9, contenidoRaw: "{{texto}}", fontFamily: "sans-serif", fontSizePt: 10, color: "#333333", alineacion: "left" }
        ]
      }
    },
    cards: [
      {
        id: "carta-1",
        nombre: "Carta de Prueba 1",
        cantidad: 1,
        plantillaId: "simple",
        valoresCampos: { titulo: "Título de la carta", texto: "Texto de la carta" },
        capasOverrides: {
          background: { colorFill: "#ffffff" }
        },
        imagenTrasera: null
      }
    ]
  };

  const { paginasFrontales, paginasTraseras } = calcularDistribucion(
    proyectoPrueba.canvasConfig,
    proyectoPrueba.cardConfig,
    proyectoPrueba.cards,
    proyectoPrueba.modoTraseras,
    proyectoPrueba.imagenTraseraComun
  );

  const html = generarHtmlImpresion(proyectoPrueba.canvasConfig, proyectoPrueba.cardConfig, paginasFrontales, paginasTraseras, "", proyectoPrueba);
  const outPath = path.join(__dirname, "../temp_debug_print.html");
  fs.writeFileSync(outPath, html, "utf8");
  console.log("HTML de depuración generado con éxito en:", outPath);
}

debug();
