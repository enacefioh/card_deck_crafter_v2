import type { Database as DatabaseType } from "better-sqlite3";

export interface Migration {
  version: number;
  description: string;
  up: (db: DatabaseType) => void;
}

export const migrations: Migration[] = [
  {
    version: 1,
    description: "Crear tablas base de usuarios (users) y sesiones (sessions) con índices",
    up: (db: DatabaseType) => {
      db.exec(`
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
  },
  {
    version: 2,
    description: "Añadir columna storage_quota_mb a la tabla users con valor por defecto 100",
    up: (db: DatabaseType) => {
      db.exec(`
        ALTER TABLE users ADD COLUMN storage_quota_mb INTEGER NOT NULL DEFAULT 100;
      `);
    }
  },
  {
    version: 3,
    description: "Crear tabla user_projects para registrar metadatos de proyectos guardados en la nube",
    up: (db: DatabaseType) => {
      db.exec(`
        CREATE TABLE IF NOT EXISTS user_projects (
          id TEXT PRIMARY KEY,
          user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          filename TEXT NOT NULL,
          name TEXT NOT NULL,
          description TEXT DEFAULT '',
          card_count INTEGER NOT NULL DEFAULT 0,
          document_count INTEGER NOT NULL DEFAULT 0,
          file_size_bytes INTEGER NOT NULL,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL,
          UNIQUE(user_id, filename)
        );

        CREATE INDEX IF NOT EXISTS idx_user_projects_user_updated ON user_projects(user_id, updated_at DESC);
      `);
    }
  }
];

export class MigrationManager {
  private db: DatabaseType;
  private migrationsList: Migration[];

  constructor(db: DatabaseType, customMigrations?: Migration[]) {
    this.db = db;
    this.migrationsList = customMigrations || migrations;
  }

  /**
   * Obtiene la versión actual del esquema registrada en SQLite mediante PRAGMA user_version.
   */
  public getCurrentVersion(): number {
    const row = this.db.pragma("user_version", { simple: true }) as any;
    return typeof row === "number" ? row : Number(row || 0);
  }

  /**
   * Ejecuta en orden secuencial todas las migraciones cuya versión sea superior
   * a la versión actual de la base de datos. Cada paso se ejecuta de forma atómica.
   */
  public runMigrations(): { applied: number; currentVersion: number } {
    const currentVersion = this.getCurrentVersion();
    const pending = this.migrationsList
      .filter((m) => m.version > currentVersion)
      .sort((a, b) => a.version - b.version);

    if (pending.length === 0) {
      return { applied: 0, currentVersion };
    }

    let appliedCount = 0;
    for (const migration of pending) {
      // Ejecutar cada migración en una transacción aislada
      const runTx = this.db.transaction(() => {
        migration.up(this.db);
        this.db.pragma(`user_version = ${migration.version}`);
      });
      runTx();
      appliedCount++;
    }

    return {
      applied: appliedCount,
      currentVersion: this.getCurrentVersion()
    };
  }
}
