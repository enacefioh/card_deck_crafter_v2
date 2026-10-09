import fs from "fs-extra";
import path from "path";
import { randomUUID } from "crypto";
import AdmZip from "adm-zip";
import puppeteer from "puppeteer";
import type {
  TemplateFieldType,
  TemplateFieldSchema,
  TemplateDesignSchema,
  TemplateManifestResponse,
  CardRenderRequest,
  ProyectoCDC2,
  Carta,
  PlantillaCDC2
} from "shared";
import type { PublicTemplateService } from "../storage/publicTemplateService.js";
import { generarHtmlExportacionPng } from "./cardRenderer.js";

/**
 * Inspecciona una plantilla pública aprobada y devuelve su manifiesto y esquema tipado.
 */
export async function getPublicTemplateSchema(
  templateId: string,
  publicTemplateService: PublicTemplateService
): Promise<TemplateManifestResponse> {
  if (!templateId || typeof templateId !== "string") {
    const err: any = new Error("El parámetro templateId es inválido.");
    err.status = 400;
    throw err;
  }

  const { filePath, template } = publicTemplateService.getPublicTemplateFilePath(templateId);

  if (template.status !== "approved") {
    const err: any = new Error("La plantilla no existe o no ha sido aprobada.");
    err.code = "NOT_FOUND";
    err.status = 404;
    throw err;
  }

  if (!fs.existsSync(filePath)) {
    const err: any = new Error("El archivo físico de la plantilla no se encuentra disponible.");
    err.code = "NOT_FOUND";
    err.status = 404;
    throw err;
  }

  const zip = new AdmZip(filePath);
  const entry = zip.getEntry("project.json");
  if (!entry) {
    const err: any = new Error("El archivo .cdc2t no contiene project.json.");
    err.status = 500;
    throw err;
  }

  const project: any = JSON.parse(entry.getData().toString("utf8"));

  // Extraer plantillas de diseño
  let plantillasList: any[] = [];
  if (Array.isArray(project.plantillas)) {
    plantillasList = project.plantillas;
  } else if (Array.isArray(project.plantillasCartas)) {
    plantillasList = project.plantillasCartas;
  } else if (project.templates && typeof project.templates === "object") {
    plantillasList = Object.values(project.templates);
  }

  for (const e of zip.getEntries()) {
    if (e.entryName.startsWith("templates/") && e.entryName.endsWith(".json")) {
      try {
        const tmplData = JSON.parse(e.getData().toString("utf8"));
        if (tmplData && tmplData.id && !plantillasList.some((p: any) => p.id === tmplData.id)) {
          plantillasList.push(tmplData);
        }
      } catch {}
    }
  }

  // Filtrar plantilla 'vacia' si existen otras reales
  const realPlantillas = plantillasList.filter((t: any) => t && t.id !== "vacia");
  const finalPlantillas = realPlantillas.length > 0 ? realPlantillas : plantillasList;

  const designs: TemplateDesignSchema[] = finalPlantillas.map((tmpl: any) => {
    const campos: TemplateFieldSchema[] = [];
    const registeredKeys = new Set<string>();

    const addCampo = (c: TemplateFieldSchema) => {
      if (!registeredKeys.has(c.clave)) {
        registeredKeys.add(c.clave);
        campos.push(c);
      }
    };

    // 1. Procesar camposConfig si existen
    if (Array.isArray(tmpl.camposConfig)) {
      for (const c of tmpl.camposConfig) {
        if (!c || !c.clave) continue;
        let tipo: TemplateFieldType = "string";
        const rawTipo = (c.tipo || "").toLowerCase();
        if (rawTipo === "multiline" || rawTipo === "textarea") tipo = "multiline";
        else if (rawTipo === "number") tipo = "number";
        else if (rawTipo === "image") tipo = "image";
        else if (rawTipo === "select" || rawTipo === "image-switch") tipo = "select";
        else if (rawTipo === "boolean") tipo = "boolean";

        addCampo({
          clave: c.clave,
          nombre: c.nombreLegible || c.nombre || c.clave,
          tipo,
          descripcion: c.descripcion || undefined,
          valorDefecto: c.valorDefecto !== undefined ? c.valorDefecto : undefined,
          opciones: Array.isArray(c.opciones) ? c.opciones : undefined
        });
      }
    }

    // 2. Procesar exposedProperties si existen
    if (Array.isArray(tmpl.exposedProperties)) {
      for (const exp of tmpl.exposedProperties) {
        if (!exp || !exp.layerId) continue;
        const targetLayer = Array.isArray(tmpl.capas) ? tmpl.capas.find((l: any) => l.id === exp.layerId) : null;
        const clave = exp.property && exp.property !== "contenidoRaw" ? `${exp.layerId}.${exp.property}` : (targetLayer?.nombre || exp.layerId);
        let tipo: TemplateFieldType = "string";
        if (exp.property === "src" || targetLayer?.tipo === "image") {
          tipo = "image";
        } else if (targetLayer?.tipo === "image-switch") {
          tipo = "select";
        }
        addCampo({
          clave,
          nombre: exp.label || targetLayer?.nombre || clave,
          tipo,
          valorDefecto: targetLayer ? (targetLayer[exp.property] || targetLayer.contenidoRaw) : undefined
        });
      }
    }

    // 3. Inspeccionar capas para etiquetas dinámicas {{tag}}, imágenes e image-switch
    if (Array.isArray(tmpl.capas)) {
      for (const layer of tmpl.capas) {
        if (!layer) continue;
        if (layer.tipo === "image" || layer.tipo === "image-switch") {
          const isSwitch = layer.tipo === "image-switch";
          const layerKey = layer.nombre || layer.id;
          addCampo({
            clave: layerKey,
            nombre: layer.nombre || layer.id,
            tipo: isSwitch ? "select" : "image",
            descripcion: isSwitch ? `Selector de imagen (${layer.nombre || layer.id})` : `Imagen (${layer.nombre || layer.id})`,
            opciones: isSwitch && Array.isArray(layer.opcionesSwitch) ? layer.opcionesSwitch : undefined,
            valorDefecto: layer.src || undefined
          });
        } else if (layer.tipo === "text") {
          const raw = layer.contenidoRaw || "";
          const tagMatches = raw.match(/\{\{([^}]+)\}\}/g);
          if (tagMatches) {
            for (const match of tagMatches) {
              const tag = match.replace(/\{\{|\}\}/g, "").trim();
              if (tag) {
                addCampo({
                  clave: tag,
                  nombre: tag,
                  tipo: "string",
                  descripcion: `Etiqueta dinámica en capa ${layer.nombre || layer.id}`
                });
              }
            }
          } else if (layer.nombre && !registeredKeys.has(layer.nombre) && !registeredKeys.has(layer.id)) {
            addCampo({
              clave: layer.nombre,
              nombre: layer.nombre,
              tipo: "string",
              valorDefecto: layer.contenidoRaw || undefined
            });
          }
        }
      }
    }

    return {
      id: tmpl.id,
      nombre: tmpl.nombre || "Diseño",
      dimensiones: {
        anchoMm: Number(tmpl.anchoMm) || 63.5,
        altoMm: Number(tmpl.altoMm) || 88.9
      },
      totalCapas: Array.isArray(tmpl.capas) ? tmpl.capas.length : 0,
      campos,
      miniatura: typeof tmpl.miniatura === "string" && tmpl.miniatura.trim() ? tmpl.miniatura : undefined
    };
  });

  return {
    templateId: template.id,
    templateName: template.name,
    templateDescription: template.description || "",
    authorName: template.authorName,
    designs
  };
}

/**
 * Renderiza de forma desatendida una carta a partir de una plantilla pública a imagen PNG de 300 DPI.
 */
export async function renderCardToPng(
  request: CardRenderRequest,
  publicTemplateService: PublicTemplateService
): Promise<Buffer> {
  if (!request.templateId || typeof request.templateId !== "string") {
    const err: any = new Error("Falta el parámetro templateId.");
    err.status = 400;
    throw err;
  }
  if (!request.cardDesignId || typeof request.cardDesignId !== "string") {
    const err: any = new Error("Falta el parámetro cardDesignId.");
    err.status = 400;
    throw err;
  }

  const { filePath, template } = publicTemplateService.getPublicTemplateFilePath(request.templateId);

  if (template.status !== "approved") {
    const err: any = new Error("La plantilla no existe o no ha sido aprobada.");
    err.code = "NOT_FOUND";
    err.status = 404;
    throw err;
  }

  const sessionUuid = randomUUID();
  const tempBaseDir = path.join(publicTemplateService.getPublicTemplatesDir(), "..", "exports");
  const tempDir = path.join(tempBaseDir, "api_render_" + sessionUuid);

  await fs.ensureDir(tempDir);

  let browser: any = null;

  try {
    // 1. Extraer archivo de plantilla .cdc2t
    const zip = new AdmZip(filePath);
    zip.extractAllTo(tempDir, true);

    const projectJsonPath = path.join(tempDir, "project.json");
    if (!(await fs.pathExists(projectJsonPath))) {
      throw new Error("El archivo .cdc2t no contiene project.json.");
    }
    const project: any = await fs.readJson(projectJsonPath);

    // 2. Localizar el diseño de carta
    let targetDesign: PlantillaCDC2 | null = null;
    if (project.templates && project.templates[request.cardDesignId]) {
      targetDesign = project.templates[request.cardDesignId];
    } else if (Array.isArray(project.plantillas)) {
      targetDesign = project.plantillas.find((p: any) => p.id === request.cardDesignId) || null;
    } else if (Array.isArray(project.plantillasCartas)) {
      targetDesign = project.plantillasCartas.find((p: any) => p.id === request.cardDesignId) || null;
    }

    if (!targetDesign) {
      const templateFilePath = path.join(tempDir, "templates", `${request.cardDesignId}.json`);
      if (await fs.pathExists(templateFilePath)) {
        targetDesign = await fs.readJson(templateFilePath);
      }
    }

    if (!targetDesign) {
      const err: any = new Error(`El diseño de carta "${request.cardDesignId}" no existe en la plantilla.`);
      err.code = "NOT_FOUND";
      err.status = 404;
      throw err;
    }

    const capasOverrides: Record<string, any> = {};
    const valoresCampos: Record<string, string> = {};

    // 3. Procesar y descargar imágenes provistas
    await fs.ensureDir(path.join(tempDir, "assets"));
    if (request.images && typeof request.images === "object") {
      let imgIndex = 0;
      for (const [imgKey, imgVal] of Object.entries(request.images)) {
        if (!imgVal || typeof imgVal !== "string") continue;
        imgIndex++;
        let assetFileName = `api_img_${Date.now()}_${imgIndex}.png`;
        let saved = false;

        if (imgVal.startsWith("http://") || imgVal.startsWith("https://")) {
          try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 15000);
            const resp = await fetch(imgVal, { signal: controller.signal });
            clearTimeout(timeoutId);
            if (resp.ok) {
              const cType = resp.headers.get("content-type") || "";
              let ext = ".png";
              if (cType.includes("jpeg") || cType.includes("jpg")) ext = ".jpg";
              else if (cType.includes("webp")) ext = ".webp";
              else if (cType.includes("svg")) ext = ".svg";
              assetFileName = `api_img_${Date.now()}_${imgIndex}${ext}`;
              const buffer = Buffer.from(await resp.arrayBuffer());
              await fs.writeFile(path.join(tempDir, "assets", assetFileName), buffer);
              saved = true;
            }
          } catch (e: any) {
            console.warn(`[cardEngineService] Error descargando imagen externa ${imgVal}:`, e.message);
          }
        } else if (imgVal.startsWith("data:image/")) {
          try {
            const match = imgVal.match(/^data:image\/([a-zA-Z0-9+.-]+);base64,(.+)$/);
            if (match) {
              const subtype = match[1];
              const base64Data = match[2];
              let ext = ".png";
              if (subtype.includes("jpeg") || subtype.includes("jpg")) ext = ".jpg";
              else if (subtype.includes("webp")) ext = ".webp";
              else if (subtype.includes("svg")) ext = ".svg";
              assetFileName = `api_img_${Date.now()}_${imgIndex}${ext}`;
              const buffer = Buffer.from(base64Data, "base64");
              await fs.writeFile(path.join(tempDir, "assets", assetFileName), buffer);
              saved = true;
            }
          } catch (e: any) {
            console.warn(`[cardEngineService] Error procesando imagen data URL:`, e.message);
          }
        }

        if (saved) {
          const assetUri = `asset://${assetFileName}`;
          valoresCampos[imgKey] = assetUri;

          const matchedLayer = targetDesign.capas?.find((c: any) => c.id === imgKey || c.nombre === imgKey);
          if (matchedLayer) {
            capasOverrides[matchedLayer.id] = {
              ...capasOverrides[matchedLayer.id],
              src: assetUri
            };
            valoresCampos[matchedLayer.id] = assetUri;
          }
        }
      }
    }

    // 4. Inyectar campos de texto y valores
    if (request.fields && typeof request.fields === "object") {
      for (const [key, val] of Object.entries(request.fields)) {
        const strVal = String(val);
        valoresCampos[key] = strVal;

        const layerById = targetDesign.capas?.find((c: any) => c.id === key);
        if (layerById) {
          valoresCampos[layerById.id] = strVal;
          if (layerById.tipo === "text") {
            capasOverrides[layerById.id] = { ...capasOverrides[layerById.id], contenidoRaw: strVal };
          }
        }

        const layerByName = targetDesign.capas?.find((c: any) => c.nombre === key);
        if (layerByName) {
          valoresCampos[layerByName.id] = strVal;
          if (layerByName.tipo === "text") {
            capasOverrides[layerByName.id] = { ...capasOverrides[layerByName.id], contenidoRaw: strVal };
          }
        }
      }
    }

    // 5. Configurar proyecto sintético de carta única
    const singleCard: Carta = {
      id: "card_render_001",
      nombre: "Render Card",
      cantidad: 1,
      plantillaId: targetDesign.id,
      plantilla: targetDesign,
      valoresCampos,
      capasOverrides,
      imagenTrasera: null
    };

    const anchoMm = targetDesign.anchoMm || 63.5;
    const altoMm = targetDesign.altoMm || 88.9;

    const doc = {
      id: "doc_render",
      nombre: "Render Doc",
      cardConfig: {
        anchoMm,
        altoMm,
        sangradoMm: 0
      },
      modoTraseras: "ninguno",
      cards: [singleCard]
    };

    const syntheticProject: ProyectoCDC2 = {
      version: "2.1.0",
      meta: {
        nombre: "API Render",
        fechaCreacion: new Date().toISOString(),
        fechaModificacion: new Date().toISOString()
      },
      documentos: [doc as any],
      activeDocumentoId: "doc_render",
      templates: {
        [targetDesign.id]: targetDesign
      },
      projectSymbols: project.projectSymbols || [],
      customFonts: [
        ...(project.customFonts || []),
        ...(targetDesign.customFonts || [])
      ],
      assets: project.assets || []
    };

    // 6. Generar HTML completo de exportación
    const { html } = generarHtmlExportacionPng(syntheticProject, tempDir);
    const htmlPath = path.join(tempDir, "export_card.html");
    await fs.writeFile(htmlPath, html, "utf8");

    // 7. Renderizado mediante Puppeteer
    const dpi = request.dpi && request.dpi > 0 ? request.dpi : 300;
    const deviceScaleFactor = dpi / 96;

    browser = await puppeteer.launch({
      headless: true,
      executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined,
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--allow-file-access-from-files",
        "--enable-local-file-accesses",
        "--disable-web-security"
      ]
    });

    const page = await browser.newPage();
    await page.setViewport({
      width: Math.ceil((anchoMm / 25.4) * 96) + 120,
      height: Math.ceil((altoMm / 25.4) * 96) + 120,
      deviceScaleFactor
    });

    const fileUrl = `file:///${htmlPath.replace(/\\/g, "/")}`;
    await page.goto(fileUrl, { waitUntil: "networkidle0" });

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

    await new Promise((resolve) => setTimeout(resolve, 250));

    const element = await page.$("#card_0_001_D");
    if (!element) {
      throw new Error("No se pudo localizar el contenedor de la carta para renderizar.");
    }

    const screenshotBuffer = await element.screenshot({ type: "png" });
    return Buffer.from(screenshotBuffer);
  } finally {
    if (browser) {
      try {
        await browser.close();
      } catch (e) {
        console.warn("[cardEngineService] Error cerrando Puppeteer:", e);
      }
    }
    try {
      await fs.remove(tempDir);
    } catch (cleanErr) {
      console.warn("[cardEngineService] Error limpiando directorio temporal:", cleanErr);
    }
  }
}
