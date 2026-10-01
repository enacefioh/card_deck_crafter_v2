import fs from "fs";
import path from "path";
import crypto from "crypto";
import type { Database as DatabaseType } from "better-sqlite3";
import type { CloudProjectMetadata, UserStorageInfo } from "../../shared/authTypes";

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
   * Asegura la estructura de directorios del usuario en disco (Lazy/On-demand).
   */
  public async ensureUserStorageTree(userId: string): Promise<string> {
    const userDir = this.getUserProjectsDir(userId);
    await fs.promises.mkdir(userDir, { recursive: true });
    return userDir;
  }

  /**
   * Calcula el espacio real ocupado en disco por los proyectos del usuario leyendo el directorio.
   */
  public async getDiskUsedStorageBytes(userId: string): Promise<number> {
    const userDir = this.getUserProjectsDir(userId);
    try {
      const exists = fs.existsSync(userDir);
      if (!exists) return 0;

      const entries = await fs.promises.readdir(userDir);
      let totalBytes = 0;

      for (const entry of entries) {
        const filePath = path.join(userDir, entry);
        try {
          const stats = await fs.promises.stat(filePath);
          if (stats.isFile()) {
            totalBytes += stats.size;
          }
        } catch {
          // Ignorar archivos bloqueados o temporales eliminados en concurrencia
        }
      }

      return totalBytes;
    } catch {
      return 0;
    }
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
}
