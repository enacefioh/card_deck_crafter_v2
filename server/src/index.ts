import express from "express";
import multer from "multer";
import cors from "cors";
import puppeteer from "puppeteer";
import AdmZip from "adm-zip";
import fs from "fs-extra";
import path from "path";
import { fileURLToPath } from "url";
import { randomUUID } from "crypto";
import { calcularDistribucion } from "../../shared/layoutEngine";
import type { CanvasConfig, ProyectoCDC2 } from "../../shared/layoutEngine";

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

// Función para mapear la distribución y generar HTML
function generarHtmlImpresion(canvasConfig: CanvasConfig, paginasFrontales: any[], paginasTraseras: any[], tempDir: string): string {
  const wMm = canvasConfig.anchoMm;
  const hMm = canvasConfig.altoMm;
  
  const resolverAssetPath = (src: string | null) => {
    if (!src) return "";
    if (src.startsWith("asset://")) {
      const filename = src.replace("asset://", "");
      const physicalPath = path.join(tempDir, "assets", filename).replace(/\\/g, "/");
      const prefix = physicalPath.startsWith("/") ? "file://" : "file:///";
      return `${prefix}${physicalPath}`;
    }
    return src;
  };

  const paginasHtml: string[] = [];

  const renderSlots = (slots: any[]) => {
    return slots.map((slot: any) => {
      const imgPath = resolverAssetPath(slot.imagenSrc);
      const bgImgStyle = imgPath ? `background-image: url('${imgPath}');` : "";
      
      const width = slot.anchoMm;
      const height = slot.altoMm;
      const x = slot.xMm;
      const y = slot.yMm;
      const sangrado = slot.sangradoMm;
      const borderMm = slot.bordeCorteMm;
      const borderColor = slot.bordeCorteColor;

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

      return `
        <div class="card-slot" style="left: ${x}mm; top: ${y}mm; width: ${width}mm; height: ${height}mm;">
          <div class="card-image-render" style="left: ${-sangrado}mm; top: ${-sangrado}mm; width: ${width + 2 * sangrado}mm; height: ${height + 2 * sangrado}mm; ${bgImgStyle}"></div>
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
      linesHtml.push(`<div class="page-cut-line horizontal" style="top: ${y}mm;"></div>`);
    }
    for (const x of vertLines) {
      linesHtml.push(`<div class="page-cut-line vertical" style="left: ${x}mm;"></div>`);
    }
    return linesHtml.join("\n");
  };

  const cutLinesHtml = renderContinuousCutLines();

  for (let i = 0; i < paginasFrontales.length; i++) {
    // Página frontal
    paginasHtml.push(`
      <div class="page">
        ${renderSlots(paginasFrontales[i].slots)}
        ${cutLinesHtml}
      </div>
    `);

    // Página trasera correspondiente
    if (paginasTraseras[i]) {
      paginasHtml.push(`
        <div class="page">
          ${renderSlots(paginasTraseras[i].slots)}
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
          width: ${wMm}mm;
          height: ${hMm}mm;
          background-color: #ffffff;
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }
        .page {
          width: ${wMm}mm;
          height: ${hMm}mm;
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
          width: 10mm;
          height: 10mm;
          border-color: #000000;
          border-style: solid;
          pointer-events: none;
          z-index: 4;
        }
        .corner-cut-mark.top-left {
          border-width: 0.1mm 0 0 0.1mm;
        }
        .corner-cut-mark.top-right {
          border-width: 0.1mm 0.1mm 0 0;
        }
        .corner-cut-mark.bottom-left {
          border-width: 0 0 0.1mm 0.1mm;
        }
        .corner-cut-mark.bottom-right {
          border-width: 0 0.1mm 0.1mm 0;
        }
        .page-cut-line {
          position: absolute;
          pointer-events: none;
          z-index: 5;
        }
        .page-cut-line.horizontal {
          left: 0;
          right: 0;
          height: 0.1mm;
          border-top: 0.1mm dashed rgba(0, 0, 0, 0.4);
        }
        .page-cut-line.vertical {
          top: 0;
          bottom: 0;
          width: 0.1mm;
          border-left: 0.1mm dashed rgba(0, 0, 0, 0.4);
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
    const html = generarHtmlImpresion(proyecto.canvasConfig, paginasFrontales, paginasTraseras, tempDir);
    const htmlPath = path.join(tempDir, "print.html");
    await fs.writeFile(htmlPath, html, "utf8");

    // 6. Levantar Puppeteer de manera headless y configurar acceso a file:///
    const browser = await puppeteer.launch({
      headless: true,
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--allow-file-access-from-files",
        "--enable-local-file-accesses"
      ]
    });
    
    const page = await browser.newPage();
    const fileUrl = `file:///${htmlPath.replace(/\\/g, "/")}`;
    
    // Cargar el HTML local
    await page.goto(fileUrl, { waitUntil: "networkidle0" });

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
