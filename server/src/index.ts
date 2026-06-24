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
  let texto = capa.contenidoRaw || "";
  if (valoresCampos) {
    Object.entries(valoresCampos).forEach(([key, val]) => {
      texto = texto.replace(new RegExp(`\\{\\{\\s*${key}\\s*\\}\\}`, "g"), val);
    });
  }
  return texto;
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
  const wMm = canvasConfig.anchoMm;
  const hMm = canvasConfig.altoMm;
  
  // Constante de conversión a píxeles virtuales (basado en 96 DPI estándar)
  const MM_TO_PX = 3.779527559;
  const wPx = wMm * MM_TO_PX;
  const hPx = hMm * MM_TO_PX;

  const resolverAssetPath = (src: string | null) => {
    if (!src) return "";
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
          <div class="card-border-cut" style="border-width: ${borderMm * MM_TO_PX}px; border-color: ${borderColor}; border-style: solid;"></div>
        `;
      }

      // Buscar si es una carta de plantilla
      const cardData = proyecto.cards.find((c: Carta) => c.id === slot.cartaId);
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
          const layersHtml = capas.map((capa: any) => {
          if (capa.tipo === "background") {
            const overrides = esTrasera ? cardData.capasOverridesTrasera : cardData.capasOverrides;
            const colorFill = overrides?.[capa.id]?.colorFill || capa.colorFill || "#ffffff";
            return `
              <div style="position: absolute; left: 0px; top: 0px; width: ${imgWidth * MM_TO_PX}px; height: ${imgHeight * MM_TO_PX}px; background-color: ${colorFill}; pointer-events: none;"></div>
            `;
          }
          
          if (capa.tipo === "text") {
            const valores = esTrasera ? cardData.valoresCamposTrasera : cardData.valoresCampos;
            const textoInterp = renderizarTextoCapa(capa, valores);
            const fontSizePt = capa.fontSizePt || 12;
            const align = capa.alineacion === "center" ? "center" : capa.alineacion === "right" ? "right" : "left";
            const weight = capa.bold ? "bold" : "normal";
            const styleOpt = capa.italic ? "italic" : "normal";
            
            // Desplazamiento por sangrado
            const xPos = capa.xMm - imgLeft;
            const yPos = capa.yMm - imgTop;
            
            // Mismo cálculo exacto de escala que en el frontend
            const fontSizePx = fontSizePt * 0.352778 * MM_TO_PX;
            return `<div style="position: absolute; left: ${xPos * MM_TO_PX}px; top: ${yPos * MM_TO_PX}px; width: ${capa.anchoMm * MM_TO_PX}px; height: ${capa.altoMm * MM_TO_PX}px; font-family: ${capa.fontFamily === 'sans-serif' || !capa.fontFamily ? "'Inter', 'Segoe UI', sans-serif" : capa.fontFamily}; font-size: ${fontSizePx}px; color: ${capa.color || '#000000'}; text-align: ${align}; font-weight: ${weight}; font-style: ${styleOpt}; white-space: pre-wrap; word-break: break-word; line-height: 1.2; padding: 2px; pointer-events: none;">${textoInterp}</div>`;
          }

          if (capa.tipo === "image" || capa.tipo === "image-switch") {
            const overrides = esTrasera ? cardData.capasOverridesTrasera : cardData.capasOverrides;
            const rawSrc = overrides?.[capa.id]?.src !== undefined ? overrides[capa.id]?.src : capa.src;
            const imgPath = resolverAssetPath(rawSrc);
            
            const xPos = capa.xMm - imgLeft;
            const yPos = capa.yMm - imgTop;
            
            if (imgPath) {
              const objectFit = capa.modoAjuste === "stretch" ? "fill" : (capa.modoAjuste || "cover");
              return `
                <div style="position: absolute; left: ${xPos * MM_TO_PX}px; top: ${yPos * MM_TO_PX}px; width: ${capa.anchoMm * MM_TO_PX}px; height: ${capa.altoMm * MM_TO_PX}px; overflow: hidden; pointer-events: none;">
                  <img src="${imgPath}" style="width: 100%; height: 100%; object-fit: ${objectFit}; display: block;" />
                </div>
              `;
            } else {
              const emojiSize = Math.min(capa.anchoMm, capa.altoMm) * 0.4 * MM_TO_PX;
              return `
                <div style="position: absolute; left: ${xPos * MM_TO_PX}px; top: ${yPos * MM_TO_PX}px; width: ${capa.anchoMm * MM_TO_PX}px; height: ${capa.altoMm * MM_TO_PX}px; background-color: #e2e8f0; border: 1px dashed #cbd5e1; display: flex; align-items: center; justify-content: center; overflow: hidden; pointer-events: none; box-sizing: border-box;">
                  <span style="font-size: ${emojiSize}px; line-height: 1; font-family: sans-serif;">🖼️</span>
                </div>
              `;
            }
          }
          
          return "";
        }).join("\n");

        return `
          <div class="card-slot" style="left: ${x * MM_TO_PX}px; top: ${y * MM_TO_PX}px; width: ${width * MM_TO_PX}px; height: ${height * MM_TO_PX}px;">
            <div class="card-template-render-wrapper" style="position: absolute; left: ${imgLeft * MM_TO_PX}px; top: ${imgTop * MM_TO_PX}px; width: ${imgWidth * MM_TO_PX}px; height: ${imgHeight * MM_TO_PX}px; overflow: hidden; background-color: #ffffff;">
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
    const proyecto: ProyectoCDC2 = await fs.readJson(projectJsonPath);

    // 4. Calcular distribución de slots
    const { paginasFrontales, paginasTraseras } = calcularDistribucion(
      proyecto.canvasConfig,
      proyecto.cardConfig,
      proyecto.cards,
      proyecto.modoTraseras,
      proyecto.imagenTraseraComun
    );

    // 5. Generar el HTML de impresión y guardarlo como archivo físico temporal para que Chromium lo acceda de forma nativa sin restricciones de seguridad
    const html = generarHtmlImpresion(proyecto.canvasConfig, proyecto.cardConfig, paginasFrontales, paginasTraseras, tempDir, proyecto);
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
    page.on("pageerror", (err) => {
      console.error(`[PUPPETEER PAGE ERROR] ${err.toString()}`);
    });
    page.on("requestfailed", (req) => {
      console.error(`[PUPPETEER REQUEST FAILED] ${req.url()} - ${req.failure()?.errorText || ""}`);
    });
    
    // Configurar viewport exacto para evitar reajustes de Chromium basados en viewport por defecto
    const MM_TO_PX = 3.779527559;
    await page.setViewport({
      width: Math.ceil(proyecto.canvasConfig.anchoMm * MM_TO_PX),
      height: Math.ceil(proyecto.canvasConfig.altoMm * MM_TO_PX),
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
      width: `${proyecto.canvasConfig.anchoMm}mm`,
      height: `${proyecto.canvasConfig.altoMm}mm`,
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
