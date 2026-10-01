import Database from "better-sqlite3";
import type { Database as DatabaseType } from "better-sqlite3";
import { randomUUID } from "crypto";
import path from "path";
import fs from "fs-extra";
import type { User, UserSummary, UserRole, AuthSession, IUserRepository, DashboardMetrics } from "shared";
import { MigrationManager } from "../db/migrations.js";

export class SqliteUserRepository implements IUserRepository {
  private db: DatabaseType;
  private dbPath?: string;

  constructor(dbOrPath?: DatabaseType | string) {
    if (typeof dbOrPath === "object" && dbOrPath !== null) {
      this.db = dbOrPath;
    } else {
      if (dbOrPath) {
        this.dbPath = dbOrPath;
      } else if (process.env.CDC2_DB_PATH) {
        this.dbPath = process.env.CDC2_DB_PATH;
      } else if (process.cwd().endsWith("server")) {
        this.dbPath = path.resolve(process.cwd(), "data/users.db");
      } else {
        this.dbPath = path.resolve(process.cwd(), "server/data/users.db");
      }
      const baseDir = path.dirname(this.dbPath);
      fs.ensureDirSync(baseDir);
      fs.ensureDirSync(path.join(baseDir, "backups"));
      fs.ensureDirSync(path.join(baseDir, "uploads"));
      fs.ensureDirSync(path.join(baseDir, "templates"));
      this.db = new Database(this.dbPath);
    }

    // Activar claves foráneas y modo WAL para alta concurrencia
    this.db.pragma("journal_mode = WAL");
    this.db.pragma("foreign_keys = ON");

    this.initSchema();
  }

  public close(): void {
    if (this.db && this.db.open) {
      try {
        this.db.pragma("wal_checkpoint(TRUNCATE)");
      } catch (err) {
        console.warn("[SqliteUserRepository] Error al consolidar WAL antes de cerrar:", err);
      }
      this.db.close();
    }
  }

  public reopen(newPath?: string): void {
    const targetPath = newPath || this.dbPath;
    if (!targetPath) {
      throw new Error("No se puede reabrir una base de datos en memoria sin ruta de fichero.");
    }
    this.dbPath = targetPath;
    const baseDir = path.dirname(this.dbPath);
    fs.ensureDirSync(baseDir);
    this.db = new Database(this.dbPath);
    this.db.pragma("journal_mode = WAL");
    this.db.pragma("foreign_keys = ON");
    this.initSchema();
  }

  private initSchema(): void {
    const migrationManager = new MigrationManager(this.db);
    migrationManager.runMigrations();
  }

  public getDatabase(): DatabaseType {
    return this.db;
  }

  public async findByEmail(email: string): Promise<User | null> {
    const cleanEmail = email.trim().toLowerCase();
    const row = this.db.prepare(
      "SELECT id, email, password_hash, role, storage_quota_mb, created_at, updated_at FROM users WHERE email = ?"
    ).get(cleanEmail) as any;

    if (!row) return null;
    return {
      id: row.id,
      email: row.email,
      passwordHash: row.password_hash,
      role: row.role as UserRole,
      storageQuotaMb: row.storage_quota_mb !== undefined && row.storage_quota_mb !== null ? Number(row.storage_quota_mb) : 100,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }

  public async findById(id: string): Promise<User | null> {
    const row = this.db.prepare(
      "SELECT id, email, password_hash, role, storage_quota_mb, created_at, updated_at FROM users WHERE id = ?"
    ).get(id) as any;

    if (!row) return null;
    return {
      id: row.id,
      email: row.email,
      passwordHash: row.password_hash,
      role: row.role as UserRole,
      storageQuotaMb: row.storage_quota_mb !== undefined && row.storage_quota_mb !== null ? Number(row.storage_quota_mb) : 100,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }

  public async createUser(
    email: string,
    role: UserRole = "user",
    passwordHash: string | null = null,
    storageQuotaMb: number = 100
  ): Promise<User> {
    const cleanEmail = email.trim().toLowerCase();
    const id = randomUUID();
    const now = new Date().toISOString();

    this.db.prepare(
      "INSERT INTO users (id, email, password_hash, role, storage_quota_mb, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)"
    ).run(id, cleanEmail, passwordHash, role, storageQuotaMb, now, now);

    return {
      id,
      email: cleanEmail,
      passwordHash,
      role,
      storageQuotaMb,
      createdAt: now,
      updatedAt: now
    };
  }

  public async setPassword(userId: string, passwordHash: string): Promise<void> {
    const now = new Date().toISOString();
    this.db.prepare(
      "UPDATE users SET password_hash = ?, updated_at = ? WHERE id = ?"
    ).run(passwordHash, now, userId);
  }

  public async resetPassword(userId: string): Promise<void> {
    const now = new Date().toISOString();
    this.db.transaction(() => {
      this.db.prepare("UPDATE users SET password_hash = NULL, updated_at = ? WHERE id = ?").run(now, userId);
      // Al resetear la contraseña, invalidamos todas las sesiones activas del usuario
      this.db.prepare("DELETE FROM sessions WHERE user_id = ?").run(userId);
    })();
  }

  public async updateRole(userId: string, role: UserRole): Promise<void> {
    const now = new Date().toISOString();
    this.db.prepare("UPDATE users SET role = ?, updated_at = ? WHERE id = ?").run(role, now, userId);
  }

  public async updateStorageQuota(userId: string, quotaMb: number): Promise<void> {
    const now = new Date().toISOString();
    this.db.prepare("UPDATE users SET storage_quota_mb = ?, updated_at = ? WHERE id = ?").run(quotaMb, now, userId);
  }

  public async deleteUser(userId: string): Promise<void> {
    this.db.prepare("DELETE FROM users WHERE id = ?").run(userId);
  }

  public async countUsers(): Promise<number> {
    const row = this.db.prepare("SELECT COUNT(*) as count FROM users").get() as any;
    return row ? Number(row.count) : 0;
  }

  public async listUsers(): Promise<UserSummary[]> {
    const rows = this.db.prepare(
      "SELECT id, email, role, password_hash, storage_quota_mb, created_at FROM users ORDER BY created_at ASC"
    ).all() as any[];

    return rows.map(r => ({
      id: r.id,
      email: r.email,
      role: r.role as UserRole,
      hasPassword: r.password_hash !== null && r.password_hash !== "",
      storageQuotaMb: r.storage_quota_mb !== undefined && r.storage_quota_mb !== null ? Number(r.storage_quota_mb) : 100,
      createdAt: r.created_at
    }));
  }

  public async getDashboardMetrics(): Promise<DashboardMetrics> {
    const totalRow = this.db.prepare("SELECT COUNT(*) as count FROM users").get() as any;
    const activeRow = this.db.prepare(
      "SELECT COUNT(*) as count FROM users WHERE password_hash IS NOT NULL AND password_hash != ''"
    ).get() as any;
    const totalUsers = totalRow ? Number(totalRow.count) : 0;
    const activeUsers = activeRow ? Number(activeRow.count) : 0;
    const pendingUsers = totalUsers - activeUsers;
    return {
      totalUsers,
      activeUsers,
      pendingUsers
    };
  }

  // Métodos de Sesión
  public async createSession(sessionId: string, userId: string, expiresAt: string): Promise<AuthSession> {
    const now = new Date().toISOString();
    this.db.prepare(
      "INSERT INTO sessions (id, user_id, expires_at, created_at) VALUES (?, ?, ?, ?)"
    ).run(sessionId, userId, expiresAt, now);

    return {
      id: sessionId,
      userId,
      expiresAt,
      createdAt: now
    };
  }

  public async findSession(sessionId: string): Promise<{ session: AuthSession; user: User } | null> {
    const row = this.db.prepare(`
      SELECT 
        s.id as s_id, s.user_id, s.expires_at, s.created_at as s_created,
        u.id as u_id, u.email, u.password_hash, u.role, u.storage_quota_mb, u.created_at as u_created, u.updated_at
      FROM sessions s
      JOIN users u ON s.user_id = u.id
      WHERE s.id = ?
    `).get(sessionId) as any;

    if (!row) return null;

    // Verificar si la sesión ha expirado
    if (new Date(row.expires_at).getTime() < Date.now()) {
      this.db.prepare("DELETE FROM sessions WHERE id = ?").run(sessionId);
      return null;
    }

    return {
      session: {
        id: row.s_id,
        userId: row.user_id,
        expiresAt: row.expires_at,
        createdAt: row.s_created
      },
      user: {
        id: row.u_id,
        email: row.email,
        passwordHash: row.password_hash,
        role: row.role as UserRole,
        storageQuotaMb: row.storage_quota_mb !== undefined && row.storage_quota_mb !== null ? Number(row.storage_quota_mb) : 100,
        createdAt: row.u_created,
        updatedAt: row.updated_at
      }
    };
  }

  public async deleteSession(sessionId: string): Promise<void> {
    this.db.prepare("DELETE FROM sessions WHERE id = ?").run(sessionId);
  }

  public async cleanupExpiredSessions(): Promise<void> {
    const now = new Date().toISOString();
    this.db.prepare("DELETE FROM sessions WHERE expires_at < ?").run(now);
  }
}
