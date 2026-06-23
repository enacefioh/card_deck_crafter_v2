import { calcularDistribucion } from "../../shared/layoutEngine.js";
import type { CanvasConfig, CardConfig, Carta, ProyectoCDC2 } from "../../shared/layoutEngine.js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function renderizarTextoCapa(capa: any, valoresCampos?: Record<string, string>): string {
  let texto = capa.contenidoRaw || "";
  if (valoresCampos) {
    Object.entries(valoresCampos).forEach(([key, val]) => {
      texto = texto.replace(new RegExp(`\\{\\{\\s*${key}\\s*\\}\\}`, "g"), val);
    });
  }
  return texto;
}

function generarHtmlImpresion(
  canvasConfig: CanvasConfig,
  cardConfig: any,
  paginasFrontales: any[],
  paginasTraseras: any[],
  tempDir: string,
  proyecto: ProyectoCDC2
): string {
  const wMm = canvasConfig.anchoMm;
  const hMm = canvasConfig.altoMm;
  
  const resolverAssetPath = (src: string | null) => {
    return src || "";
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

      let imgLeft = -sangrado;
      let imgTop = -sangrado;
      let imgWidth = width + 2 * sangrado;
      let imgHeight = height + 2 * sangrado;

      if (cardConfig.reducirArteAlBorde && borderMm > 0) {
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

      const cardData = proyecto.cards.find((c) => c.id === slot.cartaId);
      if (cardData && cardData.plantillaId && proyecto.templates && proyecto.templates[cardData.plantillaId]) {
        const plantilla = proyecto.templates[cardData.plantillaId];
        
        const layersHtml = plantilla.capas.map((capa: any) => {
          if (capa.tipo === "background") {
            const colorFill = cardData.capasOverrides?.[capa.id]?.colorFill || capa.colorFill || "#ffffff";
            return `
              <div style="position: absolute; left: 0mm; top: 0mm; width: ${imgWidth}mm; height: ${imgHeight}mm; background-color: ${colorFill}; pointer-events: none;"></div>
            `;
          }
          
          if (capa.tipo === "text") {
            const textoInterp = renderizarTextoCapa(capa, cardData.valoresCampos);
            const fontSizePt = capa.fontSizePt || 12;
            const align = capa.alineacion === "center" ? "center" : capa.alineacion === "right" ? "right" : "left";
            const weight = capa.bold ? "bold" : "normal";
            const styleOpt = capa.italic ? "italic" : "normal";
            
            const xPos = capa.xMm - imgLeft;
            const yPos = capa.yMm - imgTop;
            
            return `
              <div style="position: absolute; left: ${xPos}mm; top: ${yPos}mm; width: ${capa.anchoMm}mm; height: ${capa.altoMm}mm; font-family: ${capa.fontFamily || 'sans-serif'}; font-size: ${fontSizePt * 0.352778}mm; color: ${capa.color || '#000000'}; text-align: ${align}; font-weight: ${weight}; font-style: ${styleOpt}; white-space: pre-wrap; word-break: break-word; line-height: 1.2; pointer-events: none;">
                ${textoInterp}
              </div>
            `;
          }

          if (capa.tipo === "image") {
            const overrides = cardData.capasOverrides;
            const rawSrc = overrides?.[capa.id]?.src !== undefined ? overrides[capa.id]?.src : capa.src;
            const imgPath = resolverAssetPath(rawSrc);
            
            const xPos = capa.xMm - imgLeft;
            const yPos = capa.yMm - imgTop;
            
            if (imgPath) {
              const objectFit = capa.modoAjuste === "stretch" ? "fill" : (capa.modoAjuste || "cover");
              return `
                <div style="position: absolute; left: ${xPos}mm; top: ${yPos}mm; width: ${capa.anchoMm}mm; height: ${capa.altoMm}mm; overflow: hidden; pointer-events: none;">
                  <img src="${imgPath}" style="width: 100%; height: 100%; object-fit: ${objectFit}; display: block;" />
                </div>
              `;
            } else {
              const emojiSize = Math.min(capa.anchoMm, capa.altoMm) * 0.4;
              return `
                <div style="position: absolute; left: ${xPos}mm; top: ${yPos}mm; width: ${capa.anchoMm}mm; height: ${capa.altoMm}mm; background-color: #e2e8f0; border: 1px dashed #cbd5e1; display: flex; align-items: center; justify-content: center; overflow: hidden; pointer-events: none; box-sizing: border-box;">
                  <span style="font-size: ${emojiSize}mm; line-height: 1; font-family: sans-serif;">🖼️</span>
                </div>
              `;
            }
          }
          
          return "";
        }).join("\n");

        return `
          <div class="card-slot" style="left: ${x}mm; top: ${y}mm; width: ${width}mm; height: ${height}mm;">
            <div class="card-template-render-wrapper" style="position: absolute; left: ${imgLeft}mm; top: ${imgTop}mm; width: ${imgWidth}mm; height: ${imgHeight}mm; overflow: hidden; background-color: #ffffff;">
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
