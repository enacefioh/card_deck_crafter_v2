import express from "express";
import multer from "multer";
import cors from "cors";
import puppeteer from "puppeteer";
import AdmZip from "adm-zip";
import fs from "fs-extra";
import path from "path";
import { fileURLToPath } from "url";
import { randomUUID } from "crypto";
import { calcularDistribucion } from "shared";
import type { CanvasConfig, ProyectoCDC2, Carta } from "shared";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = process.env.PORT || 3000;

// Configurar CORS
app.use(cors());
app.use(express.json());

// Directorio para cargas temporales
const UPLOADS_DIR = path.join(__dirname, "../temp/uploads");
const EXPORTS_DIR = path.join(__dirname, "../temp/exports");

fs.ensureDirSync(UPLOADS_DIR);
fs.ensureDirSync(EXPORTS_DIR);

const upload = multer({ dest: UPLOADS_DIR });

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

// Función para mapear la distribución y generar HTML
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
  
  // Constante de conversión a píxeles virtuales (basado en 96 DPI estándar)
  const MM_TO_PX = 3.779527559;
  const wPx = wMm * MM_TO_PX;
  const hPx = hMm * MM_TO_PX;

  const resolverAssetPath = (src: string | null) => {
    if (!src) return "";
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

  const paginasHtml: string[] = [];

  const renderSlots = (slots: any[], esTrasera: boolean) => {
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
          <div class="card-border-cut" style="border-width: ${borderMm * MM_TO_PX}px; border-color: ${borderColor}; border-style: solid;"></div>
        `;
      }

      // Buscar si es una carta de plantilla
      const cardData = (activeDoc.cards || []).find((c: Carta) => c.id === slot.cartaId);
      if (cardData) {
        let plantilla = esTrasera ? cardData.plantillaTrasera : cardData.plantilla;
        if (!plantilla) {
          const plantillaId = esTrasera ? cardData.plantillaTraseraId : cardData.plantillaId;
          if (plantillaId && proyecto.templates && proyecto.templates[plantillaId]) {
            plantilla = proyecto.templates[plantillaId];
          }
        }

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
              const parentCapa = capas.find((p: any) => p.id === capa.parentCapaId);
              const isParentFlex = parentCapa && (parentCapa.layout === "vertical" || parentCapa.layout === "horizontal");

              const isFlexParent = isParentFlex;
              const positionCss = isFlexParent ? "position: relative;" : "position: absolute;";
              
              let leftPx = "";
              let topPx = "";
              const isParentVertical = parentCapa && parentCapa.layout === "vertical";
              const isParentHorizontal = parentCapa && parentCapa.layout === "horizontal";

              if (!isFlexParent) {
                const xMmVal = capa.xMm + (parentId === null ? sangrado : 0);
                const yMmVal = capa.yMm + (parentId === null ? sangrado : 0);
                leftPx = `left: ${xMmVal * MM_TO_PX}px;`;
                topPx = `top: ${yMmVal * MM_TO_PX}px;`;
              } else {
                if (isParentVertical) {
                  leftPx = `left: ${capa.xMm * MM_TO_PX}px;`;
                }
                if (isParentHorizontal) {
                  topPx = `top: ${capa.yMm * MM_TO_PX}px;`;
                }
              }

              const widthPx = `${capa.anchoMm * MM_TO_PX}px`;
              const heightPx = `${capa.altoMm * MM_TO_PX}px`;

              const baseStyle = `${positionCss} ${leftPx} ${topPx} width: ${widthPx}; height: ${heightPx}; pointer-events: none; box-sizing: border-box; flex-shrink: 0;`;

              if (capa.tipo === "background") {
                const overrides = esTrasera ? cardData.capasOverridesTrasera : cardData.capasOverrides;
                const colorFill = overrides?.[capa.id]?.colorFill || capa.colorFill || "#ffffff";
                return `
                  <div style="${baseStyle} background-color: ${colorFill};"></div>
                `;
              }

              if (capa.tipo === "block") {
                const overrides = esTrasera ? cardData.capasOverridesTrasera?.[capa.id] : cardData.capasOverrides?.[capa.id];
                const resolvedCapa = overrides ? { ...capa, ...overrides } : capa;

                // Bordes y Esquinas (SRS-024)
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

                return `
                  <div style="${baseStyle} background-color: ${resolvedCapa.backgroundColor || 'transparent'}; overflow: hidden; ${borderCornersCss}"></div>
                `;
              }

              if (capa.tipo === "container") {
                const overrides = esTrasera ? cardData.capasOverridesTrasera?.[capa.id] : cardData.capasOverrides?.[capa.id];
                const resolvedCapa = overrides ? { ...capa, ...overrides } : capa;

                // Bordes y Esquinas (SRS-024)
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
                const valores = esTrasera ? cardData.valoresCamposTrasera : cardData.valoresCampos;
                const overrides = esTrasera ? cardData.capasOverridesTrasera?.[capa.id] : cardData.capasOverrides?.[capa.id];
                const resolvedCapa = overrides ? { ...capa, ...overrides } : capa;
                const textoInterp = renderizarTextoCapa(resolvedCapa, valores);
                const htmlText = parseMarkdownToHtml(textoInterp);
                const fontSizePt = resolvedCapa.fontSizePt || 12;
                const align = resolvedCapa.alineacion === "center" ? "center" : resolvedCapa.alineacion === "right" ? "right" : resolvedCapa.alineacion === "justify" ? "justify" : "left";
                const weight = resolvedCapa.bold ? "bold" : "normal";
                const styleOpt = resolvedCapa.italic ? "italic" : "normal";
                const decoration = resolvedCapa.underline ? "underline" : "none";
                
                const fontSizePx = fontSizePt * 0.352778 * MM_TO_PX;

                // Bordes y Esquinas (SRS-024)
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

                return `<div style="${baseStyle} font-family: ${resolvedCapa.fontFamily === 'sans-serif' || !resolvedCapa.fontFamily ? "'Inter', 'Segoe UI', sans-serif" : resolvedCapa.fontFamily}; font-size: ${fontSizePx}px; color: ${resolvedCapa.color || '#000000'}; background-color: ${resolvedCapa.backgroundColor || 'transparent'}; text-align: ${align}; font-weight: ${weight}; font-style: ${styleOpt}; text-decoration: ${decoration}; white-space: pre-wrap; word-break: break-word; line-height: 1.2; padding: 2px; ${borderCornersCss}">${htmlText}</div>`;
              }

              if (capa.tipo === "image" || capa.tipo === "image-switch") {
                const overrides = esTrasera ? cardData.capasOverridesTrasera?.[capa.id] : cardData.capasOverrides?.[capa.id];
                const resolvedCapa = overrides ? { ...capa, ...overrides } : capa;
                const rawSrc = resolvedCapa.src;
                const imgPath = resolverAssetPath(rawSrc);

                // Bordes y Esquinas (SRS-024)
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
          const layersHtml = renderCapaRecursiva(null);

        return `
          <div class="card-slot" style="left: ${x * MM_TO_PX}px; top: ${y * MM_TO_PX}px; width: ${width * MM_TO_PX}px; height: ${height * MM_TO_PX}px;">
            <div class="card-template-render-wrapper" style="position: absolute; left: ${templateLeft * MM_TO_PX}px; top: ${templateTop * MM_TO_PX}px; width: ${templateWidth * MM_TO_PX}px; height: ${templateHeight * MM_TO_PX}px; overflow: hidden; background-color: #ffffff; ${noOverlap ? `transform: scale(${scaleX}, ${scaleY}); transform-origin: top left;` : ""}">
              ${layersHtml}
            </div>
            ${borderHtml}
            ${marksHtml}
          </div>
        `;
        }
      }

      // Si no es plantilla, renderizar imagen normal
      const imgPath = resolverAssetPath(slot.imagenSrc);
      const fitMode = cardConfig.modoAjuste || "cover";
      const objectFit = fitMode === "cover" ? "cover" : "contain";
      const imgHtml = imgPath ? `<img src="${imgPath}" style="width: 100%; height: 100%; object-fit: ${objectFit}; display: block;" />` : "";

      return `
        <div class="card-slot" style="left: ${x * MM_TO_PX}px; top: ${y * MM_TO_PX}px; width: ${width * MM_TO_PX}px; height: ${height * MM_TO_PX}px;">
          <div class="card-image-render" style="left: ${imgLeft * MM_TO_PX}px; top: ${imgTop * MM_TO_PX}px; width: ${imgWidth * MM_TO_PX}px; height: ${imgHeight * MM_TO_PX}px; overflow: hidden;">
            ${imgHtml}
          </div>
          ${borderHtml}
          ${marksHtml}
        </div>
      `;
    }).join("\n");
  };

  const renderContinuousCutLines = () => {
    if (!canvasConfig.lineasCorteContinuas || paginasFrontales.length === 0) return "";
    
    const horizLines = new Set<number>();
    const vertLines = new Set<number>();
    const slots = paginasFrontales[0].slots; // coordinadas idénticas en todas las hojas
    
    for (const slot of slots) {
      horizLines.add(slot.yMm);
      horizLines.add(slot.yMm + slot.altoMm);
      vertLines.add(slot.xMm);
      vertLines.add(slot.xMm + slot.anchoMm);
    }

    const linesHtml: string[] = [];
    for (const y of horizLines) {
      linesHtml.push(`<div class="page-cut-line horizontal" style="top: ${y * MM_TO_PX}px;"></div>`);
    }
    for (const x of vertLines) {
      linesHtml.push(`<div class="page-cut-line vertical" style="left: ${x * MM_TO_PX}px;"></div>`);
    }
    return linesHtml.join("\n");
  };

  const cutLinesHtml = renderContinuousCutLines();

  for (let i = 0; i < paginasFrontales.length; i++) {
    // Página frontal
    paginasHtml.push(`
      <div class="page">
        ${renderSlots(paginasFrontales[i].slots, false)}
        ${cutLinesHtml}
      </div>
    `);

    // Página trasera correspondiente
    if (paginasTraseras[i]) {
      paginasHtml.push(`
        <div class="page">
          ${renderSlots(paginasTraseras[i].slots, true)}
          ${cutLinesHtml}
        </div>
      `);
    }
  }

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <link rel="preconnect" href="https://fonts.googleapis.com">
      <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Outfit:wght@400;500;600;700;800&display=swap" rel="stylesheet">
      <style>
        ${fontRules}
        @page {
          size: ${wMm}mm ${hMm}mm;
          margin: 0;
        }
        * {
          box-sizing: border-box;
        }
        html, body {
          margin: 0;
          padding: 0;
          background-color: #ffffff;
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
          -webkit-text-size-adjust: 100%;
          text-size-adjust: 100%;
        }
        .page {
          width: ${wPx}px;
          height: ${hPx}px;
          position: relative;
          page-break-after: always;
          overflow: hidden;
          background-color: #ffffff;
        }
        .page:last-child {
          page-break-after: avoid;
        }
        .card-slot {
          position: absolute;
          overflow: hidden;
        }
        .card-image-render {
          position: absolute;
          background-size: cover;
          background-position: center;
          background-repeat: no-repeat;
        }
        .card-border-cut {
          position: absolute;
          left: 0;
          top: 0;
          right: 0;
          bottom: 0;
          pointer-events: none;
        }
        .corner-cut-mark {
          position: absolute;
          width: ${10 * MM_TO_PX}px;
          height: ${10 * MM_TO_PX}px;
          border-color: #000000;
          border-style: solid;
          pointer-events: none;
          z-index: 4;
        }
        .corner-cut-mark.top-left {
          border-width: ${0.1 * MM_TO_PX}px 0 0 ${0.1 * MM_TO_PX}px;
        }
        .corner-cut-mark.top-right {
          border-width: ${0.1 * MM_TO_PX}px ${0.1 * MM_TO_PX}px 0 0;
        }
        .corner-cut-mark.bottom-left {
          border-width: 0 0 ${0.1 * MM_TO_PX}px ${0.1 * MM_TO_PX}px;
        }
        .corner-cut-mark.bottom-right {
          border-width: 0 ${0.1 * MM_TO_PX}px ${0.1 * MM_TO_PX}px 0;
        }
        .page-cut-line {
          position: absolute;
          pointer-events: none;
          z-index: 5;
        }
        .page-cut-line.horizontal {
          left: 0;
          right: 0;
          height: ${0.1 * MM_TO_PX}px;
          border-top: ${0.1 * MM_TO_PX}px dashed rgba(0, 0, 0, 0.4);
        }
        .page-cut-line.vertical {
          top: 0;
          bottom: 0;
          width: ${0.1 * MM_TO_PX}px;
          border-left: ${0.1 * MM_TO_PX}px dashed rgba(0, 0, 0, 0.4);
        }
      </style>
    </head>
    <body>
      ${paginasHtml.join("\n")}
    </body>
    </html>
  `;
}

// Endpoint de exportación a PDF
app.post("/api/exportar/pdf", upload.single("archivoProyecto"), async (req, res) => {
  const sessionUuid = randomUUID();
  const tempDir = path.join(EXPORTS_DIR, sessionUuid);
  const zipPath = req.file?.path;

  if (!zipPath) {
    return res.status(400).json({ error: "Archivo de proyecto .cdc2 no recibido." });
  }

  try {
    // 1. Crear carpeta temporal para la extracción
    await fs.ensureDir(tempDir);

    // 2. Extraer el zip usando adm-zip
    const zip = new AdmZip(zipPath);
    zip.extractAllTo(tempDir, true);

    // 3. Cargar y parsear project.json
    const projectJsonPath = path.join(tempDir, "project.json");
    if (!(await fs.pathExists(projectJsonPath))) {
      throw new Error("El archivo .cdc2 no contiene un project.json válido.");
    }
    let proyecto: ProyectoCDC2 = await fs.readJson(projectJsonPath);

    // Asegurar compatibilidad convirtiendo a 2.1.0 si es necesario
    if (!proyecto.documentos || proyecto.documentos.length === 0) {
      const documentoId = "doc_default";
      const doc = {
        id: documentoId,
        nombre: "Documento 1",
        canvasConfig: (proyecto as any).canvasConfig || {
          tipo: "A4",
          anchoMm: 210,
          altoMm: 297,
          orientacion: "vertical",
          margenTopMm: 8,
          margenBottomMm: 8,
          margenLeftMm: 8,
          margenRightMm: 8,
          lineasCorteContinuas: true,
          marcasCorteEsquinas: true
        },
        cardConfig: (proyecto as any).cardConfig || {
          anchoMm: 63.5,
          altoMm: 88.9,
          espaciadoXMm: 0,
          espaciadoYMm: 0,
          sangradoMm: 0,
          bordeCorteMm: 0,
          bordeCorteColor: "#000000",
          modoAjuste: "cover",
          reducirArteAlBorde: false
        },
        modoTraseras: (proyecto as any).modoTraseras || "ninguno",
        imagenTraseraComun: (proyecto as any).imagenTraseraComun || null,
        cards: (proyecto as any).cards || []
      };

      proyecto = {
        version: "2.1.0",
        meta: proyecto.meta || {
          nombre: "Proyecto Migrado",
          fechaCreacion: new Date().toISOString(),
          fechaModificacion: new Date().toISOString()
        },
        documentos: [doc],
        activeDocumentoId: documentoId,
        templates: (proyecto as any).templates || {},
        assets: (proyecto as any).assets || [],
        customFonts: proyecto.customFonts || []
      };
    }

    // 4. Calcular distribución de slots del documento activo
    const activeDoc = proyecto.documentos.find((d: any) => d.id === proyecto.activeDocumentoId) || proyecto.documentos[0];
    const { paginasFrontales, paginasTraseras } = calcularDistribucion(
      activeDoc.canvasConfig,
      activeDoc.cardConfig,
      activeDoc.cards || [],
      activeDoc.modoTraseras,
      activeDoc.imagenTraseraComun
    );

    // 5. Generar el HTML de impresión y guardarlo como archivo físico temporal para que Chromium lo acceda de forma nativa sin restricciones de seguridad
    const html = generarHtmlImpresion(activeDoc.canvasConfig, activeDoc.cardConfig, paginasFrontales, paginasTraseras, tempDir, proyecto);
    const htmlPath = path.join(tempDir, "print.html");
    await fs.writeFile(htmlPath, html, "utf8");

    // Guardar una copia para depuración/verificación de alineación
    await fs.writeFile(path.join(EXPORTS_DIR, "last_generated_print.html"), html, "utf8");

    // 6. Levantar Puppeteer de manera headless y configurar acceso a file:///
    const browser = await puppeteer.launch({
      headless: true,
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--allow-file-access-from-files",
        "--enable-local-file-accesses",
        "--disable-web-security",
        "--force-device-scale-factor=1"
      ]
    });
    
    const page = await browser.newPage();
    
    // Registrar logs y errores de Puppeteer para depuración en terminal
    page.on("console", (msg) => {
      console.log(`[PUPPETEER CONSOLE] [${msg.type()}] ${msg.text()}`);
    });
    page.on("pageerror", (err: any) => {
      console.error(`[PUPPETEER PAGE ERROR] ${err.toString()}`);
    });
    page.on("requestfailed", (req) => {
      console.error(`[PUPPETEER REQUEST FAILED] ${req.url()} - ${req.failure()?.errorText || ""}`);
    });
    
    // Configurar viewport exacto para evitar reajustes de Chromium basados en viewport por defecto
    const MM_TO_PX = 3.779527559;
    await page.setViewport({
      width: Math.ceil(activeDoc.canvasConfig.anchoMm * MM_TO_PX),
      height: Math.ceil(activeDoc.canvasConfig.altoMm * MM_TO_PX),
      deviceScaleFactor: 1
    });

    const fileUrl = `file:///${htmlPath.replace(/\\/g, "/")}`;
    
    // Cargar el HTML local
    await page.goto(fileUrl, { waitUntil: "networkidle0" });

    // Esperar a que todas las imágenes en la página se carguen completamente (crucial para recursos locales file://)
    await page.evaluate(async () => {
      const images = Array.from(document.querySelectorAll("img"));
      await Promise.all(
        images.map((img) => {
          if (img.complete) return Promise.resolve();
          return new Promise((resolve) => {
            img.addEventListener("load", resolve);
            img.addEventListener("error", resolve);
          });
        })
      );
    });

    // Pequeño retardo de 500ms para garantizar el renderizado final
    await new Promise((resolve) => setTimeout(resolve, 500));

    // Guardar una captura de pantalla para depuración de alineación visual en el navegador headless
    await page.screenshot({
      path: path.join(EXPORTS_DIR, "last_generated_screenshot.png"),
      fullPage: true
    });

    // 7. Generar el PDF respetando milimétricamente el canvas
    const pdfBuffer = await page.pdf({
      width: `${activeDoc.canvasConfig.anchoMm}mm`,
      height: `${activeDoc.canvasConfig.altoMm}mm`,
      margin: { top: 0, bottom: 0, left: 0, right: 0 },
      printBackground: true
    });

    await browser.close();

    // 8. Enviar respuesta binaria
    res.contentType("application/pdf");
    res.send(Buffer.from(pdfBuffer));

  } catch (error: any) {
    console.error("Error al exportar PDF:", error);
    res.status(500).json({ error: error.message || "Error interno al generar el PDF." });
  } finally {
    // 9. Limpieza absoluta
    try {
      if (zipPath) await fs.remove(zipPath);
      await fs.remove(tempDir);
    } catch (cleanError) {
      console.error("Error al limpiar archivos temporales:", cleanError);
    }
  }
});

app.listen(port, () => {
  console.log(`[cdc2] Servidor de exportación corriendo en http://localhost:${port}`);
});
