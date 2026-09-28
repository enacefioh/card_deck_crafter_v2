import Database from "better-sqlite3";
import type { Database as DatabaseType } from "better-sqlite3";
import { randomUUID } from "crypto";
import path from "path";
import fs from "fs-extra";
import type { User, UserSummary, UserRole, AuthSession, IUserRepository } from "shared";

export class SqliteUserRepository implements IUserRepository {
  private db: DatabaseType;

  constructor(dbOrPath?: DatabaseType | string) {
    if (typeof dbOrPath === "object" && dbOrPath !== null) {
      this.db = dbOrPath;
    } else {
      const dbPath = dbOrPath || process.env.CDC2_DB_PATH || path.join(process.cwd(), "server/data/users.db");
      fs.ensureDirSync(path.dirname(dbPath));
      this.db = new Database(dbPath);
    }

    // Activar claves foráneas y modo WAL para alta concurrencia
    this.db.pragma("journal_mode = WAL");
    this.db.pragma("foreign_keys = ON");

    this.initSchema();
  }

  private initSchema(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NULL,
        role TEXT NOT NULL DEFAULT 'user',
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS sessions (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        expires_at TEXT NOT NULL,
        created_at TEXT NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
      CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
    `);
  }

  public getDatabase(): DatabaseType {
    return this.db;
  }

  public async findByEmail(email: string): Promise<User | null> {
    const cleanEmail = email.trim().toLowerCase();
    const row = this.db.prepare(
      "SELECT id, email, password_hash, role, created_at, updated_at FROM users WHERE email = ?"
    ).get(cleanEmail) as any;

    if (!row) return null;
    return {
      id: row.id,
      email: row.email,
      passwordHash: row.password_hash,
      role: row.role as UserRole,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }

  public async findById(id: string): Promise<User | null> {
    const row = this.db.prepare(
      "SELECT id, email, password_hash, role, created_at, updated_at FROM users WHERE id = ?"
    ).get(id) as any;

    if (!row) return null;
    return {
      id: row.id,
      email: row.email,
      passwordHash: row.password_hash,
      role: row.role as UserRole,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }

  public async createUser(email: string, role: UserRole = "user", passwordHash: string | null = null): Promise<User> {
    const cleanEmail = email.trim().toLowerCase();
    const id = randomUUID();
    const now = new Date().toISOString();

    this.db.prepare(
      "INSERT INTO users (id, email, password_hash, role, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)"
    ).run(id, cleanEmail, passwordHash, role, now, now);

    return {
      id,
      email: cleanEmail,
      passwordHash,
      role,
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

  public async deleteUser(userId: string): Promise<void> {
    this.db.prepare("DELETE FROM users WHERE id = ?").run(userId);
  }

  public async countUsers(): Promise<number> {
    const row = this.db.prepare("SELECT COUNT(*) as count FROM users").get() as any;
    return row ? Number(row.count) : 0;
  }

  public async listUsers(): Promise<UserSummary[]> {
    const rows = this.db.prepare(
      "SELECT id, email, role, password_hash, created_at FROM users ORDER BY created_at ASC"
    ).all() as any[];

    return rows.map(r => ({
      id: r.id,
      email: r.email,
      role: r.role as UserRole,
      hasPassword: r.password_hash !== null && r.password_hash !== "",
      createdAt: r.created_at
    }));
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
        u.id as u_id, u.email, u.password_hash, u.role, u.created_at as u_created, u.updated_at
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
