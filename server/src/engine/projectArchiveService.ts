import fs from "fs-extra";
import path from "path";
import os from "os";
import { randomUUID } from "crypto";
import AdmZip from "adm-zip";
import puppeteer from "puppeteer";
import type {
  ProyectoCDC2,
  DocumentoCDC2,
  Carta,
  CanvasConfig,
  CardConfig,
  PlantillaCDC2,
  TemplateFieldType,
  TemplateFieldSchema,
  TemplateDesignSchema,
  CreateProjectFromTemplateRequest,
  CreateProjectResponse,
  CreateDocumentRequest,
  CreateDocumentResponse,
  AddCardsToProjectRequest,
  AddCardsToProjectResponse,
  UpdateProjectCardRequest,
  UpdateProjectCardResponse,
  ProjectDetailResponse,
  ProjectDocumentItem,
  DeleteCardResponse,
  UserStorageInfo
} from "shared";
import type { UserStorageService } from "../storage/userStorageService.js";
import type { PublicTemplateService } from "../storage/publicTemplateService.js";
import { generarHtmlExportacionPng } from "./cardRenderer.js";

const DEFAULT_CANVAS_CONFIG: CanvasConfig = {
  tipo: "A4",
  anchoMm: 210,
  altoMm: 297,
  orientacion: "vertical",
  margenTopMm: 10,
  margenBottomMm: 10,
  margenLeftMm: 10,
  margenRightMm: 10,
  lineasCorteContinuas: true,
  marcasCorteEsquinas: true
};

const DEFAULT_CARD_CONFIG: CardConfig = {
  anchoMm: 63.5,
  altoMm: 88.9,
  espaciadoXMm: 0,
  espaciadoYMm: 0,
  sangradoMm: 0,
  bordeCorteMm: 0,
  bordeCorteColor: "#000000"
};

export class ProjectArchiveService {
  private userStorageService: UserStorageService;
  private publicTemplateService: PublicTemplateService;

  constructor(userStorageService: UserStorageService, publicTemplateService: PublicTemplateService) {
    this.userStorageService = userStorageService;
    this.publicTemplateService = publicTemplateService;
  }

  /**
   * Resuelve el archivo físico de una plantilla origen buscando en plantillas públicas
   * o en plantillas privadas del usuario.
   */
  public async resolveTemplateArchive(
    userId: string,
    templateId: string
  ): Promise<{ filePath: string; templateMeta: any }> {
    // 1. Intentar como plantilla pública
    try {
      const publicInfo = this.publicTemplateService.getPublicTemplateFilePath(templateId);
      if (publicInfo && publicInfo.filePath && fs.existsSync(publicInfo.filePath)) {
        return { filePath: publicInfo.filePath, templateMeta: publicInfo.template };
      }
    } catch {
      // Ignorar y buscar en plantillas del usuario
    }

    // 2. Intentar como plantilla del usuario
    try {
      const userTmplInfo = await this.userStorageService.getTemplateFilePath(userId, templateId);
      if (userTmplInfo && userTmplInfo.filePath && fs.existsSync(userTmplInfo.filePath)) {
        return { filePath: userTmplInfo.filePath, templateMeta: userTmplInfo.template };
      }
    } catch {
      // Ignorar
    }

    const err: any = new Error(`La plantilla base con ID "${templateId}" no existe o no se tiene permiso de acceso.`);
    err.code = "NOT_FOUND";
    err.status = 404;
    throw err;
  }

  /**
   * Extrae los diseños de plantilla (PlantillaCDC2) contenidos en un archivo ZIP.
   */
  public extractTemplatesFromZip(zip: AdmZip, projectData: any): PlantillaCDC2[] {
    let plantillasList: PlantillaCDC2[] = [];
    if (Array.isArray(projectData.plantillas)) {
      plantillasList = projectData.plantillas;
    } else if (Array.isArray(projectData.plantillasCartas)) {
      plantillasList = projectData.plantillasCartas;
    } else if (projectData.templates && typeof projectData.templates === "object") {
      plantillasList = Object.values(projectData.templates);
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

    const filtered = plantillasList.filter((t: any) => t && t.id && t.id !== "vacia");
    return filtered.length > 0 ? filtered : plantillasList;
  }

  /**
   * Mapea un diseño de plantilla interno a TemplateDesignSchema con campos expuestos.
   */
  public mapDesignToSchema(tmpl: any): TemplateDesignSchema {
    const exposedFields: TemplateFieldSchema[] = [];
    const registeredKeys = new Set<string>();

    const addExposed = (c: TemplateFieldSchema) => {
      if (!registeredKeys.has(c.clave)) {
        registeredKeys.add(c.clave);
        exposedFields.push(c);
      }
    };

    // 1. Procesar campos expuestos nativos (exposedProperties)
    if (Array.isArray(tmpl.exposedProperties) && tmpl.exposedProperties.length > 0) {
      for (const ep of tmpl.exposedProperties) {
        if (!ep || !ep.layerId) continue;
        const capa = Array.isArray(tmpl.capas) ? tmpl.capas.find((c: any) => c.id === ep.layerId) : null;
        let tipo: TemplateFieldType = "string";
        if (capa) {
          if (capa.tipo === "image" || capa.tipo === "image-switch") tipo = "image";
          else if (capa.tipo === "text" && (capa.multiline || ep.property === "contenidoRaw")) {
            tipo = capa.multiline ? "multiline" : "string";
          } else if (
            typeof (capa as any)[ep.property] === "number" ||
            ep.property === "fontSizePt" ||
            ep.property === "rotacion" ||
            ep.property.endsWith("Width") ||
            ep.property.endsWith("Radius") ||
            ep.property.endsWith("Mm")
          ) {
            tipo = "number";
          } else if (typeof (capa as any)[ep.property] === "boolean") {
            tipo = "boolean";
          }
        }
        const label = ep.label || capa?.nombre || ep.layerId;
        const layerName = capa?.nombre || ep.layerId;
        const directrizEfectiva = (typeof ep.description === "string" && ep.description.trim())
          ? ep.description.trim()
          : (typeof capa?.descripcion === "string" && capa.descripcion.trim() ? capa.descripcion.trim() : "");
        const descripcion = directrizEfectiva
          ? `${label} de ${layerName} (${directrizEfectiva})`
          : `${label} de ${layerName}`;

        addExposed({
          clave: ep.label || ep.layerId,
          nombre: label,
          tipo,
          descripcion,
          valorDefecto: capa ? (capa as any)[ep.property] : undefined
        });
      }
    }

    // 2. Procesar camposConfig si existen
    if (Array.isArray(tmpl.camposConfig) && tmpl.camposConfig.length > 0) {
      for (const c of tmpl.camposConfig) {
        if (!c || !c.clave) continue;
        let tipo: TemplateFieldType = "string";
        const rawTipo = (c.tipo || "").toLowerCase();
        if (rawTipo === "multiline" || rawTipo === "textarea") tipo = "multiline";
        else if (rawTipo === "number") tipo = "number";
        else if (rawTipo === "image") tipo = "image";
        else if (rawTipo === "select") tipo = "select";
        else if (rawTipo === "boolean") tipo = "boolean";

        addExposed({
          clave: c.clave,
          nombre: c.nombre || c.clave,
          tipo,
          descripcion: c.descripcion || undefined,
          valorDefecto: c.valorDefecto,
          opciones: Array.isArray(c.opciones) ? c.opciones : undefined
        });
      }
    }

    // 3. Fallback: Si no tiene exposedProperties ni camposConfig, incluir capas de texto e imagen
    if (exposedFields.length === 0 && Array.isArray(tmpl.capas)) {
      for (const capa of tmpl.capas) {
        if (!capa) continue;
        const capaDesc = typeof capa.descripcion === "string" && capa.descripcion.trim() ? capa.descripcion.trim() : "";
        if (capa.tipo === "text") {
          const clave = capa.id;
          const nombre = capa.nombre || capa.id;
          const contenido = capa.contenidoRaw || "";
          addExposed({
            clave,
            nombre,
            tipo: capa.multiline ? "multiline" : "string",
            descripcion: capaDesc ? `${nombre} de ${nombre} (${capaDesc})` : `Capa de texto "${nombre}"`,
            valorDefecto: contenido
          });

          // Buscar variables interpoladas tipo {{variable}}
          const matches = contenido.matchAll(/\{\{([^}]+)\}\}/g);
          for (const m of matches) {
            const varName = m[1].trim();
            if (varName) {
              addExposed({
                clave: varName,
                nombre: varName,
                tipo: "string",
                descripcion: capaDesc ? `${varName} de ${nombre} (${capaDesc})` : `Variable dinámica en texto`
              });
            }
          }
        } else if (capa.tipo === "image" || capa.tipo === "image-switch") {
          const nombre = capa.nombre || capa.id;
          addExposed({
            clave: capa.id,
            nombre,
            tipo: "image",
            descripcion: capaDesc ? `${nombre} de ${nombre} (${capaDesc})` : `Ilustración o imagen en capa "${nombre}"`
          });
        }
      }
    }

    // 4. Construir estructura técnica completa de todas las capas
    const fullStructure: any[] = [];
    if (Array.isArray(tmpl.capas)) {
      for (const capa of tmpl.capas) {
        if (!capa) continue;
        fullStructure.push({
          id: capa.id,
          nombre: capa.nombre || capa.id,
          tipo: capa.tipo || "unknown",
          descripcion: capa.descripcion || undefined,
          parentCapaId: capa.parentCapaId || null,
          contenidoRaw: capa.contenidoRaw || undefined,
          src: capa.src || undefined,
          visibilidad: capa.visibility || undefined
        });
      }
    }

    return {
      id: tmpl.id,
      nombre: tmpl.nombre || "Diseño de Carta",
      dimensiones: {
        anchoMm: tmpl.anchoMm || 63.5,
        altoMm: tmpl.altoMm || 88.9
      },
      totalCapas: Array.isArray(tmpl.capas) ? tmpl.capas.length : 0,
      exposedFields,
      fullStructure,
      campos: exposedFields,
      miniatura: tmpl.miniatura || undefined
    };
  }

  /**
   * RF-1: Crea un proyecto .cdc2 en la nube del usuario clonando una plantilla base.
   */
  public async createProjectFromTemplate(
    userId: string,
    quotaMb: number,
    params: CreateProjectFromTemplateRequest
  ): Promise<CreateProjectResponse> {
    const cleanName = params.name ? params.name.trim() : "";
    if (!cleanName) {
      const err: any = new Error("El nombre del proyecto es obligatorio.");
      err.status = 400;
      throw err;
    }

    const { filePath } = await this.resolveTemplateArchive(userId, params.templateId);
    const sourceZip = new AdmZip(filePath);
    const projectEntry = sourceZip.getEntry("project.json");
    if (!projectEntry) {
      const err: any = new Error("El archivo de la plantilla no contiene un project.json válido.");
      err.status = 500;
      throw err;
    }

    const sourceProject: any = JSON.parse(projectEntry.getData().toString("utf8"));
    const designsList = this.extractTemplatesFromZip(sourceZip, sourceProject);

    if (designsList.length === 0) {
      const err: any = new Error("La plantilla origen no contiene diseños de carta utilizables.");
      err.status = 400;
      throw err;
    }

    const templatesMap: Record<string, PlantillaCDC2> = {};
    for (const d of designsList) {
      templatesMap[d.id] = d;
    }

    const firstDesign = designsList[0];
    const projectId = randomUUID();
    const now = new Date().toISOString();
    const defaultDocId = `doc_${randomUUID()}`;

    // Obtener configuraciones de lienzo por defecto
    const canvasConfig: CanvasConfig = sourceProject.canvasConfig || 
      (sourceProject.documentos?.[0]?.canvasConfig) || 
      DEFAULT_CANVAS_CONFIG;

    const cardConfig: CardConfig = {
      anchoMm: firstDesign?.anchoMm || 63.5,
      altoMm: firstDesign?.altoMm || 88.9,
      espaciadoXMm: 0,
      espaciadoYMm: 0,
      sangradoMm: 0,
      bordeCorteMm: 0,
      bordeCorteColor: "#000000"
    };

    // Crear nuevo ZIP clonando recursos no-cartas (assets, fuentes, símbolos)
    const newZip = new AdmZip();
    for (const e of sourceZip.getEntries()) {
      if (
        e.entryName.startsWith("symbols/") ||
        e.entryName.startsWith("fonts/") ||
        e.entryName.startsWith("project_assets/") ||
        e.entryName.startsWith("assets/") ||
        e.entryName.startsWith("user_assets/")
      ) {
        newZip.addFile(e.entryName, e.getData());
      }
    }

    let modoTraseras = params.modoTraseras || "ninguno";
    let imagenTraseraComun: string | null = null;
    if (params.imagenTraseraComun) {
      imagenTraseraComun = await this.processImageToAsset(newZip, params.imagenTraseraComun);
      if (!params.modoTraseras) {
        modoTraseras = "comun";
      }
    }

    const initialDoc: DocumentoCDC2 = {
      id: defaultDocId,
      nombre: "Documento 1",
      canvasConfig,
      cardConfig,
      modoTraseras,
      imagenTraseraComun,
      cards: []
    };

    const newProject: ProyectoCDC2 = {
      version: "2.1.0",
      id: projectId,
      meta: {
        id: projectId,
        nombre: cleanName,
        fechaCreacion: now,
        fechaModificacion: now,
        isTemplate: false,
        type: "project"
      },
      documentos: [initialDoc],
      activeDocumentoId: defaultDocId,
      templates: templatesMap,
      projectSymbols: sourceProject.projectSymbols || [],
      customFonts: sourceProject.customFonts || [],
      assets: sourceProject.assets || []
    };

    newZip.addFile("project.json", Buffer.from(JSON.stringify(newProject, null, 2), "utf8"));
    const buffer = newZip.toBuffer();

    const saved = await this.userStorageService.saveProject(userId, quotaMb, {
      id: projectId,
      name: cleanName,
      description: params.description || "",
      cardCount: 0,
      documentCount: 1,
      buffer
    });

    return {
      id: saved.project.id,
      name: saved.project.name,
      description: saved.project.description,
      cardCount: saved.project.cardCount,
      documentCount: saved.project.documentCount,
      fileSizeBytes: saved.project.fileSizeBytes,
      createdAt: saved.project.createdAt
    };
  }

  /**
   * Carga el archivo project.json y el AdmZip de un proyecto del usuario.
   */
  public async loadProjectZip(
    userId: string,
    projectId: string
  ): Promise<{ zip: AdmZip; project: ProyectoCDC2; filePath: string; meta: any }> {
    const { filePath, project: meta } = await this.userStorageService.getProjectFilePath(userId, projectId);
    const zip = new AdmZip(filePath);
    const entry = zip.getEntry("project.json");
    if (!entry) {
      const err: any = new Error("El archivo .cdc2 está dañado o no contiene project.json.");
      err.status = 500;
      throw err;
    }

    const project: ProyectoCDC2 = JSON.parse(entry.getData().toString("utf8"));
    return { zip, project, filePath, meta };
  }

  /**
   * RF-2: Obtiene el detalle de un proyecto incluyendo metadatos, documentos y esquemas de plantilla.
   */
  public async getProjectDetail(userId: string, projectId: string): Promise<ProjectDetailResponse> {
    const { zip, project, meta } = await this.loadProjectZip(userId, projectId);
    const templatesList = this.extractTemplatesFromZip(zip, project);
    const templateSchemas = templatesList.map(t => this.mapDesignToSchema(t));

    const documents: ProjectDocumentItem[] = (project.documentos || []).map(d => ({
      id: d.id,
      nombre: d.nombre,
      cardCount: Array.isArray(d.cards) ? d.cards.length : 0,
      canvasConfig: d.canvasConfig,
      cardConfig: d.cardConfig,
      modoTraseras: d.modoTraseras,
      imagenTraseraComun: d.imagenTraseraComun
    }));

    return {
      project: {
        id: meta.id,
        name: meta.name,
        description: meta.description,
        cardCount: meta.cardCount,
        documentCount: meta.documentCount,
        fileSizeBytes: meta.fileSizeBytes,
        createdAt: meta.createdAt,
        updatedAt: meta.updatedAt
      },
      documents,
      templates: templateSchemas
    };
  }

  /**
   * RF-2: Lista los documentos contenidos dentro de un proyecto.
   */
  public async listProjectDocuments(userId: string, projectId: string): Promise<ProjectDocumentItem[]> {
    const { project } = await this.loadProjectZip(userId, projectId);
    return (project.documentos || []).map(d => ({
      id: d.id,
      nombre: d.nombre,
      cardCount: Array.isArray(d.cards) ? d.cards.length : 0,
      canvasConfig: d.canvasConfig,
      cardConfig: d.cardConfig,
      modoTraseras: d.modoTraseras,
      imagenTraseraComun: d.imagenTraseraComun
    }));
  }

  /**
   * RF-2: Crea un nuevo documento dentro del proyecto multidocumento.
   */
  public async createDocument(
    userId: string,
    quotaMb: number,
    projectId: string,
    params: CreateDocumentRequest
  ): Promise<CreateDocumentResponse> {
    const cleanNombre = params.nombre ? params.nombre.trim() : "";
    if (!cleanNombre) {
      const err: any = new Error("El nombre del documento es obligatorio.");
      err.status = 400;
      throw err;
    }

    const { zip, project, meta } = await this.loadProjectZip(userId, projectId);
    if (!Array.isArray(project.documentos)) {
      project.documentos = [];
    }

    const firstDoc = project.documentos[0];
    const newDocId = `doc_${randomUUID()}`;

    const canvasConfig: CanvasConfig = {
      ...(firstDoc?.canvasConfig || DEFAULT_CANVAS_CONFIG),
      ...(params.canvasConfig as any || {})
    };

    const cardConfig: CardConfig = {
      ...(firstDoc?.cardConfig || DEFAULT_CARD_CONFIG),
      ...(params.cardConfig as any || {})
    };

    let modoTraseras = params.modoTraseras || "ninguno";
    let imagenTraseraComun: string | null = null;
    if (params.imagenTraseraComun) {
      imagenTraseraComun = await this.processImageToAsset(zip, params.imagenTraseraComun);
      if (!params.modoTraseras) {
        modoTraseras = "comun";
      }
    }

    const newDoc: DocumentoCDC2 = {
      id: newDocId,
      nombre: cleanNombre,
      canvasConfig,
      cardConfig,
      modoTraseras,
      imagenTraseraComun,
      cards: []
    };

    project.documentos.push(newDoc);
    project.meta.fechaModificacion = new Date().toISOString();

    zip.deleteFile("project.json");
    zip.addFile("project.json", Buffer.from(JSON.stringify(project, null, 2), "utf8"));

    const totalCards = project.documentos.reduce((acc, d) => acc + (d.cards?.length || 0), 0);
    const totalDocs = project.documentos.length;
    const buffer = zip.toBuffer();

    await this.userStorageService.saveProject(userId, quotaMb, {
      id: projectId,
      name: meta.name,
      description: meta.description,
      cardCount: totalCards,
      documentCount: totalDocs,
      buffer
    });

    return {
      id: newDocId,
      nombre: cleanNombre,
      cardCount: 0,
      modoTraseras
    };
  }

  /**
   * Procesa una imagen recibida en Base64 o URL remota, guardándola en user_assets/ del ZIP.
   */
  private async processImageToAsset(
    zip: AdmZip,
    imageInput: string
  ): Promise<string> {
    if (!imageInput || typeof imageInput !== "string") return "";

    // 1. Data URL Base64
    if (imageInput.startsWith("data:image/")) {
      const match = imageInput.match(/^data:image\/([a-zA-Z0-9+.-]+);base64,(.+)$/);
      if (match) {
        const subtype = match[1].toLowerCase();
        let ext = ".png";
        if (subtype.includes("jpeg") || subtype.includes("jpg")) ext = ".jpg";
        else if (subtype.includes("webp")) ext = ".webp";
        else if (subtype.includes("svg")) ext = ".svg";

        const filename = `img_${randomUUID()}${ext}`;
        const buffer = Buffer.from(match[2], "base64");
        zip.addFile(`user_assets/${filename}`, buffer);
        return `user_asset://${filename}`;
      }
    }

    // 2. URL externa HTTP o HTTPS
    if (imageInput.startsWith("http://") || imageInput.startsWith("https://")) {
      try {
        const res = await fetch(imageInput);
        if (res.ok) {
          const contentType = res.headers.get("content-type") || "";
          let ext = ".png";
          if (contentType.includes("jpeg") || contentType.includes("jpg")) ext = ".jpg";
          else if (contentType.includes("webp")) ext = ".webp";
          else if (contentType.includes("svg")) ext = ".svg";

          const arrayBuf = await res.arrayBuffer();
          const buffer = Buffer.from(arrayBuf);
          const filename = `img_${randomUUID()}${ext}`;
          zip.addFile(`user_assets/${filename}`, buffer);
          return `user_asset://${filename}`;
        }
      } catch (fetchErr: any) {
        console.warn(`[ProjectArchiveService] No se pudo descargar imagen remota ${imageInput}:`, fetchErr.message);
      }
    }

    // Si ya es un esquema interno
    if (imageInput.startsWith("user_asset://") || imageInput.startsWith("asset://") || imageInput.startsWith("project_asset://")) {
      return imageInput;
    }

    return imageInput;
  }

  /**
   * RF-3: Añade una o más cartas a un documento del proyecto.
   */
  public async addCardsToProject(
    userId: string,
    quotaMb: number,
    projectId: string,
    request: AddCardsToProjectRequest
  ): Promise<AddCardsToProjectResponse> {
    if (!Array.isArray(request.cards) || request.cards.length === 0) {
      const err: any = new Error("El array 'cards' debe contener al menos una carta.");
      err.status = 400;
      throw err;
    }

    const { zip, project, meta } = await this.loadProjectZip(userId, projectId);
    if (!Array.isArray(project.documentos) || project.documentos.length === 0) {
      const err: any = new Error("El proyecto no tiene ningún documento configurado.");
      err.status = 400;
      throw err;
    }

    // Localizar documento destino
    let targetDoc: DocumentoCDC2 | undefined;
    if (request.documentId) {
      targetDoc = project.documentos.find(d => d.id === request.documentId);
      if (!targetDoc) {
        const err: any = new Error(`El documento con ID "${request.documentId}" no existe en el proyecto.`);
        err.code = "NOT_FOUND";
        err.status = 404;
        throw err;
      }
    } else {
      targetDoc = project.documentos[0];
    }

    if (!Array.isArray(targetDoc.cards)) {
      targetDoc.cards = [];
    }

    const templatesMap = project.templates || {};
    const createdCards: Carta[] = [];

    for (const cardInput of request.cards) {
      if (!cardInput.name || typeof cardInput.name !== "string") {
        const err: any = new Error("El nombre de la carta es obligatorio.");
        err.status = 400;
        throw err;
      }

      if (!cardInput.cardTemplateId || !templatesMap[cardInput.cardTemplateId]) {
        const err: any = new Error(
          `La plantilla de diseño "${cardInput.cardTemplateId}" no existe en las plantillas del proyecto.`
        );
        err.status = 400;
        throw err;
      }

      const design: PlantillaCDC2 = templatesMap[cardInput.cardTemplateId];
      const valoresCampos: Record<string, string> = {};
      const capasOverrides: Record<string, any> = {};

      // 1. Procesar imágenes
      if (cardInput.images && typeof cardInput.images === "object") {
        for (const [imgKey, imgVal] of Object.entries(cardInput.images)) {
          const assetUri = await this.processImageToAsset(zip, imgVal);
          if (assetUri) {
            valoresCampos[imgKey] = assetUri;
            let matchedLayer = design.capas?.find(c => c.id === imgKey || c.nombre === imgKey);
            const matchedExposed = design.exposedProperties?.find((ep: any) => ep.label === imgKey || ep.layerId === imgKey);
            if (!matchedLayer && matchedExposed) {
              matchedLayer = design.capas?.find(c => c.id === matchedExposed.layerId);
            }
            if (matchedLayer) {
              const prop = matchedExposed?.property || "src";
              capasOverrides[matchedLayer.id] = {
                ...capasOverrides[matchedLayer.id],
                [prop]: assetUri
              };
              valoresCampos[matchedLayer.id] = assetUri;
            }
          }
        }
      }

      // 2. Procesar campos de texto y otros valores
      if (cardInput.fields && typeof cardInput.fields === "object") {
        for (const [fieldKey, val] of Object.entries(cardInput.fields)) {
          const strVal = String(val);
          valoresCampos[fieldKey] = strVal;

          let matchedLayer = design.capas?.find(c => c.id === fieldKey || c.nombre === fieldKey);
          let prop = "contenidoRaw";
          const matchedExposed = design.exposedProperties?.find((ep: any) => ep.label === fieldKey || ep.layerId === fieldKey);
          if (matchedExposed) {
            prop = matchedExposed.property || "contenidoRaw";
            if (!matchedLayer) {
              matchedLayer = design.capas?.find(c => c.id === matchedExposed.layerId);
            }
          }

          if (matchedLayer) {
            valoresCampos[matchedLayer.id] = strVal;
            capasOverrides[matchedLayer.id] = {
              ...capasOverrides[matchedLayer.id],
              [prop]: strVal
            };
          }
        }
      }

      // 3. Procesar Cara Trasera (Reverso)
      if (cardInput.backCardTemplateId && !templatesMap[cardInput.backCardTemplateId]) {
        const err: any = new Error(
          `La plantilla de diseño trasera "${cardInput.backCardTemplateId}" no existe en las plantillas del proyecto.`
        );
        err.status = 400;
        throw err;
      }

      const backDesign: PlantillaCDC2 | undefined = cardInput.backCardTemplateId ? templatesMap[cardInput.backCardTemplateId] : undefined;
      const valoresCamposTrasera: Record<string, string> = {};
      const capasOverridesTrasera: Record<string, any> = {};

      if (cardInput.backImages && typeof cardInput.backImages === "object") {
        for (const [imgKey, imgVal] of Object.entries(cardInput.backImages)) {
          const assetUri = await this.processImageToAsset(zip, imgVal);
          if (assetUri) {
            valoresCamposTrasera[imgKey] = assetUri;
            let matchedLayer = backDesign?.capas?.find((c: any) => c.id === imgKey || c.nombre === imgKey);
            const matchedExposed = backDesign?.exposedProperties?.find((ep: any) => ep.label === imgKey || ep.layerId === imgKey);
            if (!matchedLayer && matchedExposed) {
              matchedLayer = backDesign?.capas?.find((c: any) => c.id === matchedExposed.layerId);
            }
            if (matchedLayer) {
              const prop = matchedExposed?.property || "src";
              capasOverridesTrasera[matchedLayer.id] = {
                ...capasOverridesTrasera[matchedLayer.id],
                [prop]: assetUri
              };
              valoresCamposTrasera[matchedLayer.id] = assetUri;
            }
          }
        }
      }

      if (cardInput.backFields && typeof cardInput.backFields === "object") {
        for (const [fieldKey, val] of Object.entries(cardInput.backFields)) {
          const strVal = String(val);
          valoresCamposTrasera[fieldKey] = strVal;

          let matchedLayer = backDesign?.capas?.find((c: any) => c.id === fieldKey || c.nombre === fieldKey);
          let prop = "contenidoRaw";
          const matchedExposed = backDesign?.exposedProperties?.find((ep: any) => ep.label === fieldKey || ep.layerId === fieldKey);
          if (matchedExposed) {
            prop = matchedExposed.property || "contenidoRaw";
            if (!matchedLayer) {
              matchedLayer = backDesign?.capas?.find((c: any) => c.id === matchedExposed.layerId);
            }
          }

          if (matchedLayer) {
            valoresCamposTrasera[matchedLayer.id] = strVal;
            capasOverridesTrasera[matchedLayer.id] = {
              ...capasOverridesTrasera[matchedLayer.id],
              [prop]: strVal
            };
          }
        }
      }

      let imagenTrasera: string | null = null;
      if (cardInput.backImage) {
        imagenTrasera = await this.processImageToAsset(zip, cardInput.backImage);
      }

      // RF-2.3: Si el documento tenía modoTraseras: "ninguno" y la carta define reverso, activar "individual"
      if (cardInput.backCardTemplateId || imagenTrasera) {
        if (targetDoc.modoTraseras === "ninguno") {
          targetDoc.modoTraseras = "individual";
        }
      }

      const newCard: Carta = {
        id: `card_${randomUUID()}`,
        nombre: cardInput.name.trim(),
        cantidad: cardInput.count && cardInput.count > 0 ? cardInput.count : 1,
        plantillaId: design.id,
        valoresCampos,
        capasOverrides,
        plantillaTraseraId: cardInput.backCardTemplateId || undefined,
        valoresCamposTrasera: Object.keys(valoresCamposTrasera).length > 0 ? valoresCamposTrasera : undefined,
        capasOverridesTrasera: Object.keys(capasOverridesTrasera).length > 0 ? capasOverridesTrasera : undefined,
        imagenTrasera
      };

      targetDoc.cards.push(newCard);
      createdCards.push(newCard);
    }

    project.meta.fechaModificacion = new Date().toISOString();

    zip.deleteFile("project.json");
    zip.addFile("project.json", Buffer.from(JSON.stringify(project, null, 2), "utf8"));

    const totalCards = project.documentos.reduce((acc, d) => acc + (d.cards?.length || 0), 0);
    const totalDocs = project.documentos.length;
    const buffer = zip.toBuffer();

    const saveResult = await this.userStorageService.saveProject(userId, quotaMb, {
      id: projectId,
      name: meta.name,
      description: meta.description,
      cardCount: totalCards,
      documentCount: totalDocs,
      buffer
    });

    return {
      message: "Cartas añadidas con éxito",
      cards: createdCards.map(c => ({
        id: c.id,
        nombre: c.nombre,
        cantidad: c.cantidad,
        plantillaId: c.plantillaId,
        valoresCampos: c.valoresCampos,
        capasOverrides: c.capasOverrides,
        plantillaTraseraId: c.plantillaTraseraId,
        valoresCamposTrasera: c.valoresCamposTrasera,
        capasOverridesTrasera: c.capasOverridesTrasera,
        imagenTrasera: c.imagenTrasera
      })),
      totalCards,
      storage: {
        usedMb: saveResult.storage.usedMb,
        quotaMb: saveResult.storage.quotaMb,
        percentUsed: saveResult.storage.percentUsed
      }
    };
  }

  /**
   * RF-4: Modifica o corrige una carta existente en el proyecto.
   */
  public async updateCardInProject(
    userId: string,
    quotaMb: number,
    projectId: string,
    cardId: string,
    params: UpdateProjectCardRequest
  ): Promise<UpdateProjectCardResponse> {
    const { zip, project, meta } = await this.loadProjectZip(userId, projectId);

    // Buscar carta en cualquiera de los documentos
    let foundCard: Carta | undefined;
    let parentDoc: DocumentoCDC2 | undefined;
    for (const doc of project.documentos || []) {
      const match = doc.cards?.find(c => c.id === cardId);
      if (match) {
        foundCard = match;
        parentDoc = doc;
        break;
      }
    }

    if (!foundCard) {
      const err: any = new Error(`La carta con ID "${cardId}" no existe en el proyecto.`);
      err.code = "NOT_FOUND";
      err.status = 404;
      throw err;
    }

    const design = (project.templates && foundCard.plantillaId) ? project.templates[foundCard.plantillaId] : undefined;

    if (params.name !== undefined && params.name.trim()) {
      foundCard.nombre = params.name.trim();
    }
    if (params.count !== undefined && params.count > 0) {
      foundCard.cantidad = params.count;
    }

    if (!foundCard.valoresCampos) foundCard.valoresCampos = {};
    if (!foundCard.capasOverrides) foundCard.capasOverrides = {};

    // 1. Modificar imágenes si se especifican
    if (params.images && typeof params.images === "object") {
      for (const [imgKey, imgVal] of Object.entries(params.images)) {
        const assetUri = await this.processImageToAsset(zip, imgVal);
        if (assetUri) {
          foundCard.valoresCampos[imgKey] = assetUri;
          let matchedLayer = design?.capas?.find((c: any) => c.id === imgKey || c.nombre === imgKey);
          const matchedExposed = design?.exposedProperties?.find((ep: any) => ep.label === imgKey || ep.layerId === imgKey);
          if (!matchedLayer && matchedExposed) {
            matchedLayer = design?.capas?.find((c: any) => c.id === matchedExposed.layerId);
          }
          if (matchedLayer) {
            const prop = matchedExposed?.property || "src";
            foundCard.capasOverrides[matchedLayer.id] = {
              ...foundCard.capasOverrides[matchedLayer.id],
              [prop]: assetUri
            };
            foundCard.valoresCampos[matchedLayer.id] = assetUri;
          }
        }
      }
    }

    // 2. Modificar campos de texto si se especifican
    if (params.fields && typeof params.fields === "object") {
      for (const [fieldKey, val] of Object.entries(params.fields)) {
        const strVal = String(val);
        foundCard.valoresCampos[fieldKey] = strVal;

        let matchedLayer = design?.capas?.find((c: any) => c.id === fieldKey || c.nombre === fieldKey);
        let prop = "contenidoRaw";
        const matchedExposed = design?.exposedProperties?.find((ep: any) => ep.label === fieldKey || ep.layerId === fieldKey);
        if (matchedExposed) {
          prop = matchedExposed.property || "contenidoRaw";
          if (!matchedLayer) {
            matchedLayer = design?.capas?.find((c: any) => c.id === matchedExposed.layerId);
          }
        }

        if (matchedLayer) {
          foundCard.valoresCampos[matchedLayer.id] = strVal;
          foundCard.capasOverrides[matchedLayer.id] = {
            ...foundCard.capasOverrides[matchedLayer.id],
            [prop]: strVal
          };
        }
      }
    }

    // 3. Modificar propiedades de reverso
    if (params.backCardTemplateId !== undefined) {
      if (params.backCardTemplateId && project.templates && !project.templates[params.backCardTemplateId]) {
        const err: any = new Error(`La plantilla trasera "${params.backCardTemplateId}" no existe en el proyecto.`);
        err.status = 400;
        throw err;
      }
      foundCard.plantillaTraseraId = params.backCardTemplateId || undefined;
    }

    if (params.backImage !== undefined) {
      if (params.backImage) {
        foundCard.imagenTrasera = await this.processImageToAsset(zip, params.backImage);
      } else {
        foundCard.imagenTrasera = null;
      }
    }

    if (foundCard.plantillaTraseraId || foundCard.imagenTrasera) {
      if (parentDoc && parentDoc.modoTraseras === "ninguno") {
        parentDoc.modoTraseras = "individual";
      }
    }

    const backDesign = (project.templates && foundCard.plantillaTraseraId) ? project.templates[foundCard.plantillaTraseraId] : undefined;

    if (params.backImages && typeof params.backImages === "object") {
      if (!foundCard.valoresCamposTrasera) foundCard.valoresCamposTrasera = {};
      if (!foundCard.capasOverridesTrasera) foundCard.capasOverridesTrasera = {};

      for (const [imgKey, imgVal] of Object.entries(params.backImages)) {
        const assetUri = await this.processImageToAsset(zip, imgVal);
        if (assetUri) {
          foundCard.valoresCamposTrasera[imgKey] = assetUri;
          let matchedLayer = backDesign?.capas?.find((c: any) => c.id === imgKey || c.nombre === imgKey);
          const matchedExposed = backDesign?.exposedProperties?.find((ep: any) => ep.label === imgKey || ep.layerId === imgKey);
          if (!matchedLayer && matchedExposed) {
            matchedLayer = backDesign?.capas?.find((c: any) => c.id === matchedExposed.layerId);
          }
          if (matchedLayer) {
            const prop = matchedExposed?.property || "src";
            foundCard.capasOverridesTrasera[matchedLayer.id] = {
              ...foundCard.capasOverridesTrasera[matchedLayer.id],
              [prop]: assetUri
            };
            foundCard.valoresCamposTrasera[matchedLayer.id] = assetUri;
          }
        }
      }
    }

    if (params.backFields && typeof params.backFields === "object") {
      if (!foundCard.valoresCamposTrasera) foundCard.valoresCamposTrasera = {};
      if (!foundCard.capasOverridesTrasera) foundCard.capasOverridesTrasera = {};

      for (const [fieldKey, val] of Object.entries(params.backFields)) {
        const strVal = String(val);
        foundCard.valoresCamposTrasera[fieldKey] = strVal;

        let matchedLayer = backDesign?.capas?.find((c: any) => c.id === fieldKey || c.nombre === fieldKey);
        let prop = "contenidoRaw";
        const matchedExposed = backDesign?.exposedProperties?.find((ep: any) => ep.label === fieldKey || ep.layerId === fieldKey);
        if (matchedExposed) {
          prop = matchedExposed.property || "contenidoRaw";
          if (!matchedLayer) {
            matchedLayer = backDesign?.capas?.find((c: any) => c.id === matchedExposed.layerId);
          }
        }

        if (matchedLayer) {
          foundCard.valoresCamposTrasera[matchedLayer.id] = strVal;
          foundCard.capasOverridesTrasera[matchedLayer.id] = {
            ...foundCard.capasOverridesTrasera[matchedLayer.id],
            [prop]: strVal
          };
        }
      }
    }

    project.meta.fechaModificacion = new Date().toISOString();

    zip.deleteFile("project.json");
    zip.addFile("project.json", Buffer.from(JSON.stringify(project, null, 2), "utf8"));

    const totalCards = (project.documentos || []).reduce((acc, d) => acc + (d.cards?.length || 0), 0);
    const totalDocs = project.documentos?.length || 1;
    const buffer = zip.toBuffer();

    await this.userStorageService.saveProject(userId, quotaMb, {
      id: projectId,
      name: meta.name,
      description: meta.description,
      cardCount: totalCards,
      documentCount: totalDocs,
      buffer
    });

    return {
      message: "Carta actualizada con éxito",
      card: {
        id: foundCard.id,
        nombre: foundCard.nombre,
        cantidad: foundCard.cantidad,
        plantillaId: foundCard.plantillaId,
        valoresCampos: foundCard.valoresCampos,
        capasOverrides: foundCard.capasOverrides,
        plantillaTraseraId: foundCard.plantillaTraseraId,
        valoresCamposTrasera: foundCard.valoresCamposTrasera,
        capasOverridesTrasera: foundCard.capasOverridesTrasera,
        imagenTrasera: foundCard.imagenTrasera
      }
    };
  }

  /**
   * RF-5: Elimina una carta del proyecto.
   */
  public async deleteCardFromProject(
    userId: string,
    quotaMb: number,
    projectId: string,
    cardId: string
  ): Promise<DeleteCardResponse> {
    const { zip, project, meta } = await this.loadProjectZip(userId, projectId);

    let removed = false;
    for (const doc of project.documentos || []) {
      if (Array.isArray(doc.cards)) {
        const initialLen = doc.cards.length;
        doc.cards = doc.cards.filter(c => c.id !== cardId);
        if (doc.cards.length < initialLen) {
          removed = true;
          break;
        }
      }
    }

    if (!removed) {
      const err: any = new Error(`La carta con ID "${cardId}" no existe en el proyecto.`);
      err.code = "NOT_FOUND";
      err.status = 404;
      throw err;
    }

    project.meta.fechaModificacion = new Date().toISOString();

    zip.deleteFile("project.json");
    zip.addFile("project.json", Buffer.from(JSON.stringify(project, null, 2), "utf8"));

    const totalCards = (project.documentos || []).reduce((acc, d) => acc + (d.cards?.length || 0), 0);
    const totalDocs = project.documentos?.length || 1;
    const buffer = zip.toBuffer();

    await this.userStorageService.saveProject(userId, quotaMb, {
      id: projectId,
      name: meta.name,
      description: meta.description,
      cardCount: totalCards,
      documentCount: totalDocs,
      buffer
    });

    return {
      message: "Carta eliminada con éxito",
      cardCount: totalCards
    };
  }

  /**
   * RF-6: Renderiza en tiempo real una carta del proyecto a imagen PNG (300 DPI) usando Puppeteer.
   */
  public async previewCardInProject(
    userId: string,
    projectId: string,
    cardId: string,
    dpi: number = 300,
    side: "front" | "back" = "front"
  ): Promise<Buffer> {
    const { zip, project } = await this.loadProjectZip(userId, projectId);

    let foundCard: Carta | undefined;
    let parentDoc: DocumentoCDC2 | undefined;

    for (const doc of project.documentos || []) {
      const match = doc.cards?.find(c => c.id === cardId);
      if (match) {
        foundCard = match;
        parentDoc = doc;
        break;
      }
    }

    if (!foundCard) {
      const err: any = new Error(`La carta con ID "${cardId}" no existe en el proyecto.`);
      err.code = "NOT_FOUND";
      err.status = 404;
      throw err;
    }

    const design = (project.templates && foundCard.plantillaId) ? project.templates[foundCard.plantillaId] : foundCard.plantilla;
    if (!design) {
      const err: any = new Error("La plantilla asociada a la carta no se encuentra en el proyecto.");
      err.status = 404;
      throw err;
    }

    if (side === "back") {
      const hasBack = foundCard.plantillaTraseraId || foundCard.plantillaTrasera || foundCard.imagenTrasera || parentDoc?.imagenTraseraComun;
      if (!hasBack) {
        const err: any = new Error("La carta no cuenta con un reverso configurado (plantillaTraseraId, imagenTrasera ni reverso común en el documento).");
        err.code = "NOT_FOUND";
        err.status = 404;
        throw err;
      }
    }

    // Extraer recursos a directorio temporal
    const tempDir = path.join(os.tmpdir(), `cdc2_card_prev_${randomUUID()}`);
    await fs.mkdirp(tempDir);

    let browser: any = null;

    try {
      // Extraer entradas del ZIP al directorio temporal
      zip.extractAllTo(tempDir, true);

      let anchoMm = design.anchoMm || parentDoc?.cardConfig?.anchoMm || 63.5;
      let altoMm = design.altoMm || parentDoc?.cardConfig?.altoMm || 88.9;

      if (side === "back" && foundCard.plantillaTraseraId && project.templates && project.templates[foundCard.plantillaTraseraId]) {
        const backDesign = project.templates[foundCard.plantillaTraseraId];
        anchoMm = backDesign.anchoMm || anchoMm;
        altoMm = backDesign.altoMm || altoMm;
      }

      const singleDoc = {
        id: "doc_preview",
        nombre: "Doc Preview",
        cardConfig: {
          anchoMm,
          altoMm,
          sangradoMm: 0
        },
        modoTraseras: side === "back" ? "individual" : "ninguno",
        imagenTraseraComun: parentDoc?.imagenTraseraComun || null,
        cards: [foundCard]
      };

      const syntheticProject: ProyectoCDC2 = {
        version: "2.1.0",
        meta: {
          nombre: "Card Preview",
          fechaCreacion: new Date().toISOString(),
          fechaModificacion: new Date().toISOString()
        },
        documentos: [singleDoc as any],
        activeDocumentoId: "doc_preview",
        templates: project.templates || {},
        projectSymbols: project.projectSymbols || [],
        customFonts: project.customFonts || [],
        assets: project.assets || []
      };

      const { html } = generarHtmlExportacionPng(syntheticProject, tempDir);
      const htmlPath = path.join(tempDir, "card_preview.html");
      await fs.writeFile(htmlPath, html, "utf8");

      const deviceScaleFactor = (dpi > 0 ? dpi : 300) / 96;

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

      await new Promise(resolve => setTimeout(resolve, 200));

      const targetSelector = side === "back" ? "#card_0_001_T" : "#card_0_001_D";
      const element = await page.$(targetSelector);
      if (!element) {
        throw new Error(`No se pudo localizar el contenedor de la carta (${targetSelector}) para renderizar.`);
      }

      const screenshotBuffer = await element.screenshot({ type: "png" });
      return Buffer.from(screenshotBuffer);
      return Buffer.from(screenshotBuffer);
    } finally {
      if (browser) {
        try {
          await browser.close();
        } catch {}
      }
      try {
        await fs.remove(tempDir);
      } catch {}
    }
  }
}
