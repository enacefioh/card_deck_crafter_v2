import fs from "fs";
import path from "path";
import crypto from "crypto";
import AdmZip from "adm-zip";
import type { Database as DatabaseType } from "better-sqlite3";
import type { PublicTemplateMetadata } from "../../../shared/authTypes.js";

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
  }

  public getPublicTemplatesDir(): string {
    return this.publicTemplatesDir;
  }

  public async ensurePublicTemplatesDir(): Promise<string> {
    await fs.promises.mkdir(this.publicTemplatesDir, { recursive: true });
    return this.publicTemplatesDir;
  }

  private mapRowToMetadata(r: any): PublicTemplateMetadata {
    return {
      id: r.id,
      originalTemplateId: r.original_template_id,
      authorId: r.author_id,
      authorName: r.author_name,
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

      // Si tiene plantillas guardadas
      const plantillasList = Array.isArray(project.plantillas)
        ? project.plantillas
        : Array.isArray(project.plantillasCartas)
        ? project.plantillasCartas
        : [];

      for (const tmpl of plantillasList) {
        previewCards.push({
          id: tmpl.id,
          nombre: tmpl.nombre || "Diseño",
          anchoMm: tmpl.anchoMm || 63.5,
          altoMm: tmpl.altoMm || 88.9,
          miniatura: tmpl.miniatura
        });
      }

      // Si no tiene plantillas explícitas, revisar cartas del documento
      if (previewCards.length === 0 && Array.isArray(project.documentos)) {
        for (const doc of project.documentos) {
          if (Array.isArray(doc.cartas)) {
            for (const c of doc.cartas.slice(0, 4)) {
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

    const updated = this.db.prepare(
      "SELECT * FROM public_templates WHERE id = ?"
    ).get(publicId) as any;

    return this.mapRowToMetadata(updated);
  }

  /**
   * Obtiene el mapa de publicaciones del usuario { [originalTemplateId]: PublicTemplateMetadata }
   */
  public async getUserPublications(userId: string): Promise<Record<string, PublicTemplateMetadata>> {
    const rows = this.db.prepare(
      "SELECT * FROM public_templates WHERE author_id = ?"
    ).all(userId) as any[];

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
      rows = this.db.prepare(
        "SELECT * FROM public_templates WHERE status = ? ORDER BY updated_at DESC"
      ).all(status) as any[];
    } else {
      rows = this.db.prepare(
        "SELECT * FROM public_templates ORDER BY updated_at DESC"
      ).all() as any[];
    }
    return rows.map((r) => this.mapRowToMetadata(r));
  }

  /**
   * Obtiene los metadatos de una plantilla pública por su ID.
   */
  public async getPublicTemplateById(id: string): Promise<PublicTemplateMetadata | null> {
    const r = this.db.prepare(
      "SELECT * FROM public_templates WHERE id = ?"
    ).get(id) as any;
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

  /**
   * Obtiene la ruta física del archivo de una plantilla pública junto con sus metadatos.
   */
  public getPublicTemplateFilePath(id: string): { filePath: string; template: PublicTemplateMetadata } {
    const template = this.db.prepare(
      "SELECT * FROM public_templates WHERE id = ?"
    ).get(id) as any;
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
