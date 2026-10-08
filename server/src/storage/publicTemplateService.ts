import fs from "fs";
import path from "path";
import crypto from "crypto";
import AdmZip from "adm-zip";
import type { Database as DatabaseType } from "better-sqlite3";
import type { PublicTemplateMetadata } from "../../../shared/authTypes.js";
import type { StoreTemplateCard, StoreTemplateDetail } from "../../../shared/storeTypes.js";

function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function generateSvgCardPreview(tmpl: any): string {
  const w = tmpl.anchoMm || 63.5;
  const h = tmpl.altoMm || 88.9;
  const id = (tmpl.id || Math.random().toString(36).slice(2)).replace(/[^a-zA-Z0-9_-]/g, "_");
  const nombre = escapeXml(tmpl.nombre || "Diseño de Carta");
  const capas = Array.isArray(tmpl.capas) ? tmpl.capas : [];

  let layersSvg = "";
  for (const c of capas.slice(0, 14)) {
    if (c.tipo === "background") {
      const bgCol = c.colorFondo || "#1c1c28";
      layersSvg += `<rect x="0" y="0" width="${w}" height="${h}" fill="${bgCol}"/>`;
    } else if (c.tipo === "image" || c.tipo === "image-switch") {
      const x = Math.max(0, c.xMm || 0);
      const y = Math.max(0, c.yMm || 0);
      const iw = Math.min(w, c.anchoMm || 20);
      const ih = Math.min(h, c.altoMm || 20);
      layersSvg += `<rect x="${x}" y="${y}" width="${iw}" height="${ih}" rx="1.5" fill="rgba(99,102,241,0.15)" stroke="rgba(99,102,241,0.3)" stroke-width="0.5"/>`;
    } else if (c.tipo === "text" && (c.nombre || c.contenidoRaw)) {
      const x = Math.max(3, c.xMm || 3);
      const y = Math.max(5, (c.yMm || 0) + (c.altoMm ? c.altoMm * 0.7 : 4));
      const fontSize = Math.min(3.8, Math.max(2, (c.tamanioFuente || 12) * 0.25));
      const txt = escapeXml((c.nombre || c.contenidoRaw).slice(0, 24));
      layersSvg += `<text x="${x}" y="${y}" font-family="system-ui, sans-serif" font-size="${fontSize}" font-weight="600" fill="#f8fafc">${txt}</text>`;
    }
  }

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="100%" height="100%">
    <defs>
      <linearGradient id="bg_${id}" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#1e1e2a"/>
        <stop offset="100%" stop-color="#101016"/>
      </linearGradient>
    </defs>
    <rect x="0.5" y="0.5" width="${w - 1}" height="${h - 1}" rx="3" fill="url(#bg_${id})" stroke="#6366f1" stroke-width="1"/>
    <rect x="2" y="2" width="${w - 4}" height="${h - 4}" rx="2" fill="none" stroke="rgba(255,255,255,0.08)" stroke-width="0.5"/>
    ${layersSvg}
    <rect x="3" y="3" width="${w - 6}" height="6.5" rx="1.5" fill="rgba(15, 23, 42, 0.85)" stroke="rgba(99, 102, 241, 0.4)" stroke-width="0.5"/>
    <text x="${w / 2}" y="7.5" text-anchor="middle" font-family="system-ui, -apple-system, sans-serif" font-size="3" font-weight="bold" fill="#ffffff">${nombre}</text>
    <rect x="3" y="${h - 6.5}" width="${w - 6}" height="4.5" rx="1" fill="rgba(15, 23, 42, 0.85)" stroke="rgba(255, 255, 255, 0.1)" stroke-width="0.4"/>
    <text x="${w / 2}" y="${h - 3.2}" text-anchor="middle" font-family="system-ui, -apple-system, sans-serif" font-size="2.4" font-weight="600" fill="#a5b4fc">${w} × ${h} mm • ${capas.length} capas</text>
  </svg>`;

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

export class PublicTemplateService {
  private db: DatabaseType;
  private baseDataDir: string;
  private publicTemplatesDir: string;

  constructor(db: DatabaseType, baseDataDir?: string) {
    this.db = db;
    if (baseDataDir) {
      this.baseDataDir = baseDataDir;
    } else if (process.env.CDC2_DB_PATH) {
      this.baseDataDir = path.dirname(process.env.CDC2_DB_PATH);
    } else if (process.cwd().endsWith("server")) {
      this.baseDataDir = path.resolve(process.cwd(), "data");
    } else {
      this.baseDataDir = path.resolve(process.cwd(), "server/data");
    }
    this.publicTemplatesDir = path.join(this.baseDataDir, "public_templates");

    // Sincronizar metadatos y autores al inicializar
    this.syncTemplatesMetadata();
  }

  public getPublicTemplatesDir(): string {
    return this.publicTemplatesDir;
  }

  public async ensurePublicTemplatesDir(): Promise<string> {
    await fs.promises.mkdir(this.publicTemplatesDir, { recursive: true });
    return this.publicTemplatesDir;
  }

  /**
   * Sincroniza nombres de autores con la tabla users y re-extrae metadatos de plantillas
   * para asegurar que previewCards contenga todas las plantillas y miniaturas válidas.
   */
  public syncTemplatesMetadata(): void {
    try {
      // 1. Sincronizar author_name con users.username
      this.db.prepare(`
        UPDATE public_templates 
        SET author_name = (SELECT username FROM users WHERE users.id = public_templates.author_id)
        WHERE author_id IN (SELECT id FROM users WHERE username IS NOT NULL AND username != '')
      `).run();

      // 2. Re-extraer metadata si previewCards está vacío
      const rows = this.db.prepare("SELECT id, filename, metadata_json FROM public_templates").all() as any[];
      for (const r of rows) {
        const filePath = path.join(this.publicTemplatesDir, r.filename);
        if (fs.existsSync(filePath)) {
          let needsSync = true;
          if (r.metadata_json) {
            try {
              const parsed = JSON.parse(r.metadata_json);
              if (Array.isArray(parsed.previewCards) && parsed.previewCards.length > 0) {
                needsSync = false;
              }
            } catch {}
          }
          if (needsSync) {
            const newMeta = this.extractMetadataFromZip(filePath);
            if (newMeta) {
              this.db.prepare("UPDATE public_templates SET metadata_json = ? WHERE id = ?").run(newMeta, r.id);
            }
          }
        }
      }
    } catch (err) {
      console.warn("[PublicTemplateService] Error durante sincronización inicial de plantillas:", err);
    }
  }

  private mapRowToMetadata(r: any): PublicTemplateMetadata {
    const authorName = r.current_author_username || r.author_name || (r.author_id ? `user_${r.author_id.slice(0, 6)}` : "anónimo");
    return {
      id: r.id,
      originalTemplateId: r.original_template_id,
      authorId: r.author_id,
      authorName,
      name: r.name,
      description: r.description || "",
      filename: r.filename,
      status: r.status as "pending" | "approved",
      documentCount: Number(r.document_count || 0),
      templateCount: Number(r.template_count || 0),
      fileSizeBytes: Number(r.file_size_bytes || 0),
      metadataJson: r.metadata_json || undefined,
      createdAt: r.created_at,
      updatedAt: r.updated_at
    };
  }

  /**
   * Extrae metadatos adicionales y miniaturas desde el zip de la plantilla si es posible.
   */
  private extractMetadataFromZip(filePath: string): string | null {
    try {
      if (!fs.existsSync(filePath)) return null;
      const zip = new AdmZip(filePath);
      const entry = zip.getEntry("project.json");
      if (!entry) return null;

      const content = entry.getData().toString("utf8");
      const project = JSON.parse(content);

      const previewCards: Array<{
        id?: string;
        nombre: string;
        anchoMm: number;
        altoMm: number;
        miniatura?: string;
      }> = [];

      // 1. Si tiene plantillas guardadas en project.json o en el mapa de templates
      let plantillasList: any[] = [];
      if (Array.isArray(project.plantillas)) {
        plantillasList = project.plantillas;
      } else if (Array.isArray(project.plantillasCartas)) {
        plantillasList = project.plantillasCartas;
      } else if (project.templates && typeof project.templates === "object") {
        plantillasList = Object.values(project.templates);
      }

      // Si aún no hay, buscar en las entradas zip templates/*.json
      if (plantillasList.length === 0) {
        for (const e of zip.getEntries()) {
          if (e.entryName.startsWith("templates/") && e.entryName.endsWith(".json")) {
            try {
              const tmplData = JSON.parse(e.getData().toString("utf8"));
              if (tmplData && tmplData.id) {
                plantillasList.push(tmplData);
              }
            } catch {}
          }
        }
      }

      // Filtrar la plantilla 'vacia' para no mostrar un lienzo en blanco si hay plantillas reales
      const realPlantillas = plantillasList.filter((t: any) => t && t.id !== "vacia");
      const finalPlantillas = realPlantillas.length > 0 ? realPlantillas : plantillasList;

      for (const tmpl of finalPlantillas) {
        const miniatura = (typeof tmpl.miniatura === "string" && tmpl.miniatura.trim())
          ? tmpl.miniatura
          : generateSvgCardPreview(tmpl);

        previewCards.push({
          id: tmpl.id,
          nombre: tmpl.nombre || "Diseño",
          anchoMm: tmpl.anchoMm || 63.5,
          altoMm: tmpl.altoMm || 88.9,
          miniatura
        });
      }

      // 2. Si no tiene plantillas explícitas, revisar cartas del documento
      if (previewCards.length === 0 && Array.isArray(project.documentos)) {
        for (const doc of project.documentos) {
          if (Array.isArray(doc.cartas)) {
            for (const c of doc.cartas.slice(0, 12)) {
              previewCards.push({
                id: c.id,
                nombre: c.nombre || "Carta",
                anchoMm: doc.cardConfig?.anchoMm || 63.5,
                altoMm: doc.cardConfig?.altoMm || 88.9,
                miniatura: c.miniatura
              });
            }
          }
        }
      }

      return JSON.stringify({
        previewCards,
        exportedAt: project.fechaCreacion || new Date().toISOString()
      });
    } catch (err) {
      console.warn("[PublicTemplateService] Error extrayendo metadatos del zip:", err);
      return null;
    }
  }

  /**
   * Publica o actualiza una plantilla personal del usuario en el repositorio público.
   */
  public async publishTemplate(
    userId: string,
    userTemplateId: string,
    publicName: string,
    publicDescription: string
  ): Promise<PublicTemplateMetadata> {
    // 1. Obtener la plantilla original del usuario
    const userTemplate = this.db.prepare(
      "SELECT * FROM user_templates WHERE user_id = ? AND id = ?"
    ).get(userId, userTemplateId) as any;

    if (!userTemplate) {
      const err: any = new Error("La plantilla privada no existe o no tienes permiso para acceder a ella.");
      err.code = "NOT_FOUND";
      throw err;
    }

    // 2. Obtener datos de autor
    const user = this.db.prepare(
      "SELECT id, username, email FROM users WHERE id = ?"
    ).get(userId) as any;

    const authorName = user?.username || `user_${Math.floor(100000 + Math.random() * 900000)}`;

    // 3. Rutas de archivo
    await this.ensurePublicTemplatesDir();
    const sourceFilePath = path.join(this.baseDataDir, "users", userId, "templates", userTemplate.filename);
    if (!fs.existsSync(sourceFilePath)) {
      const err: any = new Error("El archivo físico de la plantilla no se encuentra en el servidor.");
      err.code = "FILE_MISSING";
      throw err;
    }

    // 4. Buscar publicación previa
    const existing = this.db.prepare(
      "SELECT * FROM public_templates WHERE author_id = ? AND original_template_id = ?"
    ).get(userId, userTemplateId) as any;

    const publicId = existing ? existing.id : crypto.randomUUID();
    const filename = existing ? existing.filename : `pub_${publicId}.cdc2`;
    const targetFilePath = path.join(this.publicTemplatesDir, filename);

    // Copiar archivo físico a la carpeta pública
    await fs.promises.copyFile(sourceFilePath, targetFilePath);

    const stats = await fs.promises.stat(targetFilePath);
    const fileSizeBytes = stats.size;
    const metadataJson = this.extractMetadataFromZip(targetFilePath);

    const now = new Date().toISOString();
    const cleanName = publicName.trim() || userTemplate.name;
    const cleanDesc = publicDescription.trim();

    if (existing) {
      this.db.prepare(`
        UPDATE public_templates
        SET author_name = ?, name = ?, description = ?, filename = ?, status = 'pending',
            document_count = ?, template_count = ?, file_size_bytes = ?, metadata_json = ?, updated_at = ?
        WHERE id = ?
      `).run(
        authorName,
        cleanName,
        cleanDesc,
        filename,
        userTemplate.document_count || 0,
        userTemplate.template_count || 0,
        fileSizeBytes,
        metadataJson,
        now,
        publicId
      );
    } else {
      this.db.prepare(`
        INSERT INTO public_templates
          (id, original_template_id, author_id, author_name, name, description, filename, status,
           document_count, template_count, file_size_bytes, metadata_json, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?, ?, ?, ?, ?)
      `).run(
        publicId,
        userTemplateId,
        userId,
        authorName,
        cleanName,
        cleanDesc,
        filename,
        userTemplate.document_count || 0,
        userTemplate.template_count || 0,
        fileSizeBytes,
        metadataJson,
        now,
        now
      );
    }

    const updated = this.db.prepare(`
      SELECT pt.*, u.username as current_author_username 
      FROM public_templates pt 
      LEFT JOIN users u ON pt.author_id = u.id 
      WHERE pt.id = ?
    `).get(publicId) as any;

    return this.mapRowToMetadata(updated);
  }

  /**
   * Obtiene el mapa de publicaciones del usuario { [originalTemplateId]: PublicTemplateMetadata }
   */
  public async getUserPublications(userId: string): Promise<Record<string, PublicTemplateMetadata>> {
    const rows = this.db.prepare(`
      SELECT pt.*, u.username as current_author_username 
      FROM public_templates pt 
      LEFT JOIN users u ON pt.author_id = u.id 
      WHERE pt.author_id = ?
    `).all(userId) as any[];

    const result: Record<string, PublicTemplateMetadata> = {};
    for (const r of rows) {
      result[r.original_template_id] = this.mapRowToMetadata(r);
    }
    return result;
  }

  /**
   * Lista plantillas públicas filtradas opcionalmente por estado ('pending', 'approved' o all).
   */
  public async listPublicTemplates(status?: string): Promise<PublicTemplateMetadata[]> {
    let rows: any[];
    if (status && status !== "all") {
      rows = this.db.prepare(`
        SELECT pt.*, u.username as current_author_username 
        FROM public_templates pt 
        LEFT JOIN users u ON pt.author_id = u.id 
        WHERE pt.status = ? 
        ORDER BY pt.updated_at DESC
      `).all(status) as any[];
    } else {
      rows = this.db.prepare(`
        SELECT pt.*, u.username as current_author_username 
        FROM public_templates pt 
        LEFT JOIN users u ON pt.author_id = u.id 
        ORDER BY pt.updated_at DESC
      `).all() as any[];
    }
    return rows.map((r) => this.mapRowToMetadata(r));
  }

  /**
   * Obtiene los metadatos de una plantilla pública por su ID.
   */
  public async getPublicTemplateById(id: string): Promise<PublicTemplateMetadata | null> {
    const r = this.db.prepare(`
      SELECT pt.*, u.username as current_author_username 
      FROM public_templates pt 
      LEFT JOIN users u ON pt.author_id = u.id 
      WHERE pt.id = ?
    `).get(id) as any;
    if (!r) return null;
    return this.mapRowToMetadata(r);
  }

  /**
   * Aprueba una plantilla pública para su publicación oficial.
   */
  public async approveTemplate(id: string): Promise<PublicTemplateMetadata> {
    const existing = await this.getPublicTemplateById(id);
    if (!existing) {
      const err: any = new Error("La plantilla pública no existe.");
      err.code = "NOT_FOUND";
      throw err;
    }

    const now = new Date().toISOString();
    this.db.prepare(
      "UPDATE public_templates SET status = 'approved', updated_at = ? WHERE id = ?"
    ).run(now, id);

    const updated = await this.getPublicTemplateById(id);
    return updated!;
  }

  /**
   * Rechaza una plantilla pública: elimina el archivo en disco y el registro en BD.
   */
  public async rejectTemplate(id: string): Promise<void> {
    const existing = await this.getPublicTemplateById(id);
    if (!existing) {
      const err: any = new Error("La plantilla pública no existe o ya ha sido eliminada.");
      err.code = "NOT_FOUND";
      throw err;
    }

    const filePath = path.join(this.publicTemplatesDir, existing.filename);
    try {
      if (fs.existsSync(filePath)) {
        await fs.promises.unlink(filePath);
      }
    } catch (err) {
      console.warn("[PublicTemplateService] Error eliminando archivo físico:", err);
    }

    this.db.prepare("DELETE FROM public_templates WHERE id = ?").run(id);
  }

  private mapRowToStoreCard(r: any): StoreTemplateCard {
    let previewCards: any[] = [];
    let thumbnail: string | undefined = undefined;
    let dimensions: { anchoMm: number; altoMm: number } | undefined = undefined;

    if (r.metadata_json) {
      try {
        const parsed = JSON.parse(r.metadata_json);
        if (Array.isArray(parsed.previewCards)) {
          previewCards = parsed.previewCards;
          // Provisionalmente, se usa como imagen de la plantilla la miniatura de la primera plantilla
          const firstWithThumb = previewCards.find((p: any) => Boolean(p.miniatura));
          if (firstWithThumb) {
            thumbnail = firstWithThumb.miniatura;
          }
          if (previewCards.length > 0 && previewCards[0].anchoMm && previewCards[0].altoMm) {
            dimensions = {
              anchoMm: previewCards[0].anchoMm,
              altoMm: previewCards[0].altoMm
            };
          }
        }
      } catch {
        // ignore json parse error
      }
    }

    const authorName = r.current_author_username || r.author_name || (r.author_id ? `user_${r.author_id.slice(0, 6)}` : "anónimo");

    return {
      id: r.id,
      name: r.name,
      description: r.description || "",
      authorName,
      documentCount: Number(r.document_count || 0),
      templateCount: Number(r.template_count || 0),
      fileSizeBytes: Number(r.file_size_bytes || 0),
      createdAt: r.created_at,
      updatedAt: r.updated_at,
      thumbnail,
      dimensions,
      previewCards
    };
  }

  /**
   * Obtiene el catálogo de plantillas públicas aprobadas para la tienda comunitaria.
   */
  public async getStoreCatalog(searchQuery?: string): Promise<StoreTemplateCard[]> {
    let rows: any[];
    if (searchQuery && searchQuery.trim()) {
      const term = `%${searchQuery.trim().toLowerCase()}%`;
      rows = this.db.prepare(`
        SELECT pt.*, u.username as current_author_username 
        FROM public_templates pt 
        LEFT JOIN users u ON pt.author_id = u.id 
        WHERE pt.status = 'approved' 
          AND (
            LOWER(pt.name) LIKE ? 
            OR LOWER(pt.description) LIKE ? 
            OR LOWER(COALESCE(u.username, pt.author_name)) LIKE ?
          )
        ORDER BY pt.updated_at DESC
      `).all(term, term, term) as any[];
    } else {
      rows = this.db.prepare(`
        SELECT pt.*, u.username as current_author_username 
        FROM public_templates pt 
        LEFT JOIN users u ON pt.author_id = u.id 
        WHERE pt.status = 'approved' 
        ORDER BY pt.updated_at DESC
      `).all() as any[];
    }

    return rows.map((r) => this.mapRowToStoreCard(r));
  }

  /**
   * Obtiene la ficha de detalle de una plantilla pública aprobada para la tienda.
   */
  public async getStoreTemplateDetail(id: string): Promise<StoreTemplateDetail | null> {
    const r = this.db.prepare(`
      SELECT pt.*, u.username as current_author_username 
      FROM public_templates pt 
      LEFT JOIN users u ON pt.author_id = u.id 
      WHERE pt.id = ? AND pt.status = 'approved'
    `).get(id) as any;
    if (!r) return null;

    const card = this.mapRowToStoreCard(r);
    return {
      ...card,
      originalTemplateId: r.original_template_id,
      authorId: r.author_id,
      downloadUrl: `/api/store/templates/${r.id}/download`
    };
  }

  /**
   * Obtiene la ruta física del archivo de una plantilla pública junto con sus metadatos.
   */
  public getPublicTemplateFilePath(id: string): { filePath: string; template: PublicTemplateMetadata } {
    const template = this.db.prepare(`
      SELECT pt.*, u.username as current_author_username 
      FROM public_templates pt 
      LEFT JOIN users u ON pt.author_id = u.id 
      WHERE pt.id = ?
    `).get(id) as any;
    if (!template) {
      const err: any = new Error("La plantilla pública no existe.");
      err.code = "NOT_FOUND";
      throw err;
    }
    const meta = this.mapRowToMetadata(template);
    const filePath = path.join(this.publicTemplatesDir, meta.filename);
    if (!fs.existsSync(filePath)) {
      const err: any = new Error("El archivo físico de la plantilla no se encuentra en el servidor.");
      err.code = "NOT_FOUND";
      throw err;
    }
    return { filePath, template: meta };
  }
}
