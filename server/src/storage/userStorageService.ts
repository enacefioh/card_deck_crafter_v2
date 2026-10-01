import fs from "fs";
import path from "path";
import crypto from "crypto";
import type { Database as DatabaseType } from "better-sqlite3";
import type { CloudProjectMetadata, CloudTemplateMetadata, UserStorageInfo } from "../../shared/authTypes";

export class UserStorageService {
  private db: DatabaseType;
  private baseDataDir: string;

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
  }

  /**
   * Ruta al directorio personal de proyectos de un usuario.
   */
  public getUserProjectsDir(userId: string): string {
    return path.join(this.baseDataDir, "users", userId, "projects");
  }

  /**
   * Ruta al directorio personal de plantillas de proyecto de un usuario.
   */
  public getUserTemplatesDir(userId: string): string {
    return path.join(this.baseDataDir, "users", userId, "templates");
  }

  /**
   * Asegura la estructura de directorios del usuario en disco (Lazy/On-demand).
   */
  public async ensureUserStorageTree(userId: string): Promise<string> {
    const projectsDir = this.getUserProjectsDir(userId);
    const templatesDir = this.getUserTemplatesDir(userId);
    await fs.promises.mkdir(projectsDir, { recursive: true });
    await fs.promises.mkdir(templatesDir, { recursive: true });
    return projectsDir;
  }

  /**
   * Calcula el tamaño en bytes de todos los archivos regulares de un directorio.
   */
  private async getDirSizeBytes(dirPath: string): Promise<number> {
    try {
      const exists = fs.existsSync(dirPath);
      if (!exists) return 0;

      const entries = await fs.promises.readdir(dirPath);
      let totalBytes = 0;

      for (const entry of entries) {
        const filePath = path.join(dirPath, entry);
        try {
          const stats = await fs.promises.stat(filePath);
          if (stats.isFile()) {
            totalBytes += stats.size;
          }
        } catch {
          // Ignorar archivos concurrentes eliminados
        }
      }

      return totalBytes;
    } catch {
      return 0;
    }
  }

  /**
   * Calcula el espacio real ocupado en disco por los proyectos y plantillas del usuario.
   */
  public async getDiskUsedStorageBytes(userId: string): Promise<number> {
    const projectsDir = this.getUserProjectsDir(userId);
    const templatesDir = this.getUserTemplatesDir(userId);
    const [projectsBytes, templatesBytes] = await Promise.all([
      this.getDirSizeBytes(projectsDir),
      this.getDirSizeBytes(templatesDir)
    ]);
    return projectsBytes + templatesBytes;
  }

  /**
   * Obtiene la información detallada de la cuota y uso del almacenamiento de un usuario.
   */
  public async getUserStorageInfo(userId: string, quotaMb: number): Promise<UserStorageInfo> {
    const usedBytes = await this.getDiskUsedStorageBytes(userId);
    const quotaBytes = Math.max(1, quotaMb) * 1024 * 1024;
    const availableBytes = Math.max(0, quotaBytes - usedBytes);

    const usedMb = parseFloat((usedBytes / (1024 * 1024)).toFixed(2));
    const availableMb = parseFloat((availableBytes / (1024 * 1024)).toFixed(2));
    const percentUsed = quotaBytes > 0 ? Math.min(100, Math.round((usedBytes / quotaBytes) * 100)) : 100;

    return {
      quotaMb,
      quotaBytes,
      usedBytes,
      usedMb,
      availableBytes,
      availableMb,
      percentUsed
    };
  }

  /**
   * Lista los proyectos del usuario ordenados por fecha de modificación decreciente.
   */
  public listProjects(userId: string): CloudProjectMetadata[] {
    const stmt = this.db.prepare(
      "SELECT * FROM user_projects WHERE user_id = ? ORDER BY updated_at DESC"
    );
    const rows = stmt.all(userId) as any[];

    return rows.map((r) => ({
      id: r.id,
      userId: r.user_id,
      filename: r.filename,
      name: r.name,
      description: r.description || "",
      cardCount: r.card_count,
      documentCount: r.document_count,
      fileSizeBytes: r.file_size_bytes,
      createdAt: r.created_at,
      updatedAt: r.updated_at
    }));
  }

  /**
   * Obtiene los metadatos de un proyecto por su ID y usuario.
   */
  public getProjectById(userId: string, projectId: string): CloudProjectMetadata | null {
    const stmt = this.db.prepare(
      "SELECT * FROM user_projects WHERE user_id = ? AND id = ?"
    );
    const r = stmt.get(userId, projectId) as any;
    if (!r) return null;

    return {
      id: r.id,
      userId: r.user_id,
      filename: r.filename,
      name: r.name,
      description: r.description || "",
      cardCount: r.card_count,
      documentCount: r.document_count,
      fileSizeBytes: r.file_size_bytes,
      createdAt: r.created_at,
      updatedAt: r.updated_at
    };
  }

  /**
   * Guarda o actualiza un proyecto en la nube validando la cuota disponible.
   */
  public async saveProject(
    userId: string,
    quotaMb: number,
    params: {
      id?: string;
      name: string;
      description?: string;
      cardCount?: number;
      documentCount?: number;
      buffer: Buffer;
    }
  ): Promise<{ project: CloudProjectMetadata; storage: UserStorageInfo }> {
    const cleanName = params.name ? params.name.trim() : "Proyecto sin título";
    if (!cleanName) {
      throw new Error("El nombre del proyecto no puede estar vacío.");
    }

    // Buscar si existe por ID del mismo usuario (los proyectos con el mismo nombre pero distinta ID no se sobrescriben)
    let existing: CloudProjectMetadata | null = null;
    if (params.id) {
      existing = this.getProjectById(userId, params.id);
    }

    const newFileSize = params.buffer.length;
    const existingFileSize = existing ? existing.fileSizeBytes : 0;

    // Calcular cuota disponible efectiva restando el archivo que va a ser reemplazado
    const totalUsedBytes = await this.getDiskUsedStorageBytes(userId);
    const quotaBytes = Math.max(1, quotaMb) * 1024 * 1024;
    const effectiveAvailableBytes = quotaBytes - (totalUsedBytes - existingFileSize);

    if (newFileSize > effectiveAvailableBytes) {
      const availableMb = (Math.max(0, effectiveAvailableBytes) / (1024 * 1024)).toFixed(2);
      const neededMb = (newFileSize / (1024 * 1024)).toFixed(2);
      const err: any = new Error(
        `Espacio insuficiente. El proyecto ocupa ${neededMb} MB y dispones de ${availableMb} MB libres en tu cuota.`
      );
      err.code = "QUOTA_EXCEEDED";
      err.details = {
        fileSizeBytes: newFileSize,
        availableBytes: Math.max(0, effectiveAvailableBytes),
        quotaMb
      };
      throw err;
    }

    // Asegurar directorio en disco
    const userDir = await this.ensureUserStorageTree(userId);

    const projectId = existing ? existing.id : (params.id || crypto.randomUUID());
    const filename = existing ? existing.filename : `${projectId}.cdc2`;
    const filePath = path.join(userDir, filename);

    // Escribir archivo físico en disco
    await fs.promises.writeFile(filePath, params.buffer);

    const now = new Date().toISOString();
    const desc = params.description ? params.description.trim() : "";
    const cardCount = params.cardCount ?? 0;
    const documentCount = params.documentCount ?? 0;

    if (existing) {
      this.db
        .prepare(
          `UPDATE user_projects 
           SET name = ?, description = ?, card_count = ?, document_count = ?, file_size_bytes = ?, updated_at = ?
           WHERE id = ? AND user_id = ?`
        )
        .run(cleanName, desc, cardCount, documentCount, newFileSize, now, projectId, userId);
    } else {
      this.db
        .prepare(
          `INSERT INTO user_projects 
           (id, user_id, filename, name, description, card_count, document_count, file_size_bytes, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        )
        .run(projectId, userId, filename, cleanName, desc, cardCount, documentCount, newFileSize, now, now);
    }

    const updatedProject = this.getProjectById(userId, projectId)!;
    const storage = await this.getUserStorageInfo(userId, quotaMb);

    return {
      project: updatedProject,
      storage
    };
  }

  /**
   * Obtiene la ruta física en disco de un proyecto verificando propiedad y existencia.
   */
  public async getProjectFilePath(
    userId: string,
    projectId: string
  ): Promise<{ filePath: string; project: CloudProjectMetadata }> {
    const project = this.getProjectById(userId, projectId);
    if (!project) {
      const err: any = new Error("El proyecto no existe o no tienes permiso para acceder a él.");
      err.code = "NOT_FOUND";
      throw err;
    }

    const filePath = path.join(this.getUserProjectsDir(userId), project.filename);
    if (!fs.existsSync(filePath)) {
      const err: any = new Error("El archivo del proyecto no se encuentra en el servidor.");
      err.code = "FILE_MISSING";
      throw err;
    }

    return { filePath, project };
  }

  /**
   * Elimina un proyecto del disco y de la base de datos, liberando espacio.
   */
  public async deleteProject(
    userId: string,
    quotaMb: number,
    projectId: string
  ): Promise<{ storage: UserStorageInfo }> {
    const project = this.getProjectById(userId, projectId);
    if (!project) {
      const err: any = new Error("El proyecto no existe o ya ha sido eliminado.");
      err.code = "NOT_FOUND";
      throw err;
    }

    const filePath = path.join(this.getUserProjectsDir(userId), project.filename);
    try {
      if (fs.existsSync(filePath)) {
        await fs.promises.unlink(filePath);
      }
    } catch {
      // Ignorar error si ya fue borrado
    }

    this.db.prepare("DELETE FROM user_projects WHERE id = ? AND user_id = ?").run(projectId, userId);

    const storage = await this.getUserStorageInfo(userId, quotaMb);
    return { storage };
  }

  /**
   * Lista las plantillas de proyecto del usuario ordenadas por fecha de modificación decreciente.
   */
  public listTemplates(userId: string): CloudTemplateMetadata[] {
    const stmt = this.db.prepare(
      "SELECT * FROM user_templates WHERE user_id = ? ORDER BY updated_at DESC"
    );
    const rows = stmt.all(userId) as any[];

    return rows.map((r) => ({
      id: r.id,
      userId: r.user_id,
      filename: r.filename,
      name: r.name,
      description: r.description || "",
      documentCount: r.document_count,
      templateCount: r.template_count,
      fileSizeBytes: r.file_size_bytes,
      isPublic: Boolean(r.is_public),
      createdAt: r.created_at,
      updatedAt: r.updated_at
    }));
  }

  /**
   * Obtiene los metadatos de una plantilla por su ID y usuario.
   */
  public getTemplateById(userId: string, templateId: string): CloudTemplateMetadata | null {
    const stmt = this.db.prepare(
      "SELECT * FROM user_templates WHERE user_id = ? AND id = ?"
    );
    const r = stmt.get(userId, templateId) as any;
    if (!r) return null;

    return {
      id: r.id,
      userId: r.user_id,
      filename: r.filename,
      name: r.name,
      description: r.description || "",
      documentCount: r.document_count,
      templateCount: r.template_count,
      fileSizeBytes: r.file_size_bytes,
      isPublic: Boolean(r.is_public),
      createdAt: r.created_at,
      updatedAt: r.updated_at
    };
  }

  /**
   * Guarda o actualiza una plantilla de proyecto en la nube validando la cuota disponible.
   */
  public async saveTemplate(
    userId: string,
    quotaMb: number,
    params: {
      id?: string;
      name: string;
      description?: string;
      documentCount?: number;
      templateCount?: number;
      buffer: Buffer;
    }
  ): Promise<{ template: CloudTemplateMetadata; storage: UserStorageInfo }> {
    const cleanName = params.name ? params.name.trim() : "Plantilla sin título";
    if (!cleanName) {
      throw new Error("El nombre de la plantilla no puede estar vacío.");
    }

    let existing: CloudTemplateMetadata | null = null;
    if (params.id) {
      existing = this.getTemplateById(userId, params.id);
    }

    const newFileSize = params.buffer.length;
    const existingFileSize = existing ? existing.fileSizeBytes : 0;

    const totalUsedBytes = await this.getDiskUsedStorageBytes(userId);
    const quotaBytes = Math.max(1, quotaMb) * 1024 * 1024;
    const effectiveAvailableBytes = quotaBytes - (totalUsedBytes - existingFileSize);

    if (newFileSize > effectiveAvailableBytes) {
      const availableMb = (Math.max(0, effectiveAvailableBytes) / (1024 * 1024)).toFixed(2);
      const neededMb = (newFileSize / (1024 * 1024)).toFixed(2);
      const err: any = new Error(
        `Espacio insuficiente. La plantilla ocupa ${neededMb} MB y dispones de ${availableMb} MB libres en tu cuota.`
      );
      err.code = "QUOTA_EXCEEDED";
      err.details = {
        fileSizeBytes: newFileSize,
        availableBytes: Math.max(0, effectiveAvailableBytes),
        quotaMb
      };
      throw err;
    }

    await this.ensureUserStorageTree(userId);
    const templatesDir = this.getUserTemplatesDir(userId);

    const templateId = existing ? existing.id : (params.id || crypto.randomUUID());
    const filename = existing ? existing.filename : `${templateId}.cdc2`;
    const filePath = path.join(templatesDir, filename);

    await fs.promises.writeFile(filePath, params.buffer);

    const now = new Date().toISOString();
    const desc = params.description ? params.description.trim() : "";
    const documentCount = params.documentCount ?? 0;
    const templateCount = params.templateCount ?? 0;

    if (existing) {
      this.db
        .prepare(
          `UPDATE user_templates 
           SET name = ?, description = ?, document_count = ?, template_count = ?, file_size_bytes = ?, updated_at = ?
           WHERE id = ? AND user_id = ?`
        )
        .run(cleanName, desc, documentCount, templateCount, newFileSize, now, templateId, userId);
    } else {
      this.db
        .prepare(
          `INSERT INTO user_templates 
           (id, user_id, filename, name, description, document_count, template_count, file_size_bytes, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        )
        .run(templateId, userId, filename, cleanName, desc, documentCount, templateCount, newFileSize, now, now);
    }

    const updatedTemplate = this.getTemplateById(userId, templateId)!;
    const storage = await this.getUserStorageInfo(userId, quotaMb);

    return {
      template: updatedTemplate,
      storage
    };
  }

  /**
   * Obtiene la ruta física en disco de una plantilla verificando propiedad y existencia.
   */
  public async getTemplateFilePath(
    userId: string,
    templateId: string
  ): Promise<{ filePath: string; template: CloudTemplateMetadata }> {
    const template = this.getTemplateById(userId, templateId);
    if (!template) {
      const err: any = new Error("La plantilla no existe o no tienes permiso para acceder a ella.");
      err.code = "NOT_FOUND";
      throw err;
    }

    const filePath = path.join(this.getUserTemplatesDir(userId), template.filename);
    if (!fs.existsSync(filePath)) {
      const err: any = new Error("El archivo de la plantilla no se encuentra en el servidor.");
      err.code = "FILE_MISSING";
      throw err;
    }

    return { filePath, template };
  }

  /**
   * Elimina una plantilla del disco y de la base de datos, liberando espacio.
   */
  public async deleteTemplate(
    userId: string,
    quotaMb: number,
    templateId: string
  ): Promise<{ storage: UserStorageInfo }> {
    const template = this.getTemplateById(userId, templateId);
    if (!template) {
      const err: any = new Error("La plantilla no existe o ya ha sido eliminada.");
      err.code = "NOT_FOUND";
      throw err;
    }

    const filePath = path.join(this.getUserTemplatesDir(userId), template.filename);
    try {
      if (fs.existsSync(filePath)) {
        await fs.promises.unlink(filePath);
      }
    } catch {
      // Ignorar error si ya fue borrado
    }

    this.db.prepare("DELETE FROM user_templates WHERE id = ? AND user_id = ?").run(templateId, userId);

    const storage = await this.getUserStorageInfo(userId, quotaMb);
    return { storage };
  }
}
