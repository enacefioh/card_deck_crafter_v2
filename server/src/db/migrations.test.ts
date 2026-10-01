import { describe, it, expect, beforeEach } from "vitest";
import Database from "better-sqlite3";
import { MigrationManager, type Migration } from "./migrations";

describe("Motor de Migraciones SQLite - SRS-064", () => {
  let db: any;

  beforeEach(() => {
    db = new Database(":memory:");
  });

  it("debe iniciar con user_version = 0 en una base de datos nueva", () => {
    const manager = new MigrationManager(db);
    expect(manager.getCurrentVersion()).toBe(0);
  });

  it("debe aplicar las migraciones base (v1, v2, v3 y v4) y actualizar user_version a 4", () => {
    const manager = new MigrationManager(db);
    const result = manager.runMigrations();

    expect(result.applied).toBe(4);
    expect(result.currentVersion).toBe(4);
    expect(manager.getCurrentVersion()).toBe(4);

    // Comprobar que las tablas existen
    const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all().map((r: any) => r.name);
    expect(tables).toContain("users");
    expect(tables).toContain("sessions");
    expect(tables).toContain("user_projects");
    expect(tables).toContain("user_templates");

    // Comprobar que la columna storage_quota_mb existe en users
    const columns = db.prepare("PRAGMA table_info(users)").all().map((c: any) => c.name);
    expect(columns).toContain("storage_quota_mb");

    // Comprobar columnas de user_projects
    const projColumns = db.prepare("PRAGMA table_info(user_projects)").all().map((c: any) => c.name);
    expect(projColumns).toContain("card_count");
    expect(projColumns).toContain("document_count");
    expect(projColumns).toContain("file_size_bytes");
    expect(projColumns).toContain("description");

    // Comprobar columnas de user_templates
    const tmplColumns = db.prepare("PRAGMA table_info(user_templates)").all().map((c: any) => c.name);
    expect(tmplColumns).toContain("template_count");
    expect(tmplColumns).toContain("document_count");
    expect(tmplColumns).toContain("file_size_bytes");
    expect(tmplColumns).toContain("is_public");
  });

  it("debe ser idempotente si se vuelve a ejecutar sin cambios", () => {
    const manager = new MigrationManager(db);
    manager.runMigrations();

    const secondRun = manager.runMigrations();
    expect(secondRun.applied).toBe(0);
    expect(secondRun.currentVersion).toBe(4);
  });

  it("debe aplicar migraciones incrementales secuencialmente (v1 -> v2) sin perder datos", () => {
    const customMigrations: Migration[] = [
      {
        version: 1,
        description: "Crear tabla inicial",
        up: (d) => {
          d.exec("CREATE TABLE items (id TEXT PRIMARY KEY, name TEXT NOT NULL);");
        }
      },
      {
        version: 2,
        description: "Añadir columna quantity a items",
        up: (d) => {
          d.exec("ALTER TABLE items ADD COLUMN quantity INTEGER DEFAULT 0;");
        }
      }
    ];

    // Ejecutar solo v1
    const manager1 = new MigrationManager(db, [customMigrations[0]]);
    manager1.runMigrations();
    expect(manager1.getCurrentVersion()).toBe(1);

    // Insertar un dato en v1
    db.prepare("INSERT INTO items (id, name) VALUES (?, ?)").run("item-1", "Carta 1");

    // Ejecutar con v2 registrada
    const manager2 = new MigrationManager(db, customMigrations);
    const result = manager2.runMigrations();
    expect(result.applied).toBe(1);
    expect(result.currentVersion).toBe(2);

    // Comprobar que el dato insertado en v1 sigue ahí con la nueva columna
    const row = db.prepare("SELECT * FROM items WHERE id = ?").get("item-1") as any;
    expect(row.name).toBe("Carta 1");
    expect(row.quantity).toBe(0);
  });
});
