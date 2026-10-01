import { describe, it, expect, beforeEach, afterEach } from "vitest";
import Database from "better-sqlite3";
import fs from "fs";
import path from "path";
import os from "os";
import { MigrationManager } from "../db/migrations";
import { UserStorageService } from "./userStorageService";

describe("UserStorageService - SRS-066", () => {
  let db: any;
  let tempDir: string;
  let storageService: UserStorageService;
  const testUserId = "user-test-123";

  beforeEach(() => {
    db = new Database(":memory:");
    const mm = new MigrationManager(db);
    mm.runMigrations();

    // Insertar usuario de prueba
    db.prepare(`
      INSERT INTO users (id, email, password_hash, role, storage_quota_mb, created_at, updated_at)
      VALUES (?, 'test@example.com', null, 'user', 10, '2026-10-01T00:00:00Z', '2026-10-01T00:00:00Z')
    `).run(testUserId);

    // Crear directorio temporal para pruebas de disco
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "cdc2-storage-test-"));
    storageService = new UserStorageService(db, tempDir);
  });

  afterEach(() => {
    try {
      fs.rmSync(tempDir, { recursive: true, force: true });
    } catch {}
  });

  it("debe asegurar la creación del directorio de usuario en disco", async () => {
    const dir = await storageService.ensureUserStorageTree(testUserId);
    expect(fs.existsSync(dir)).toBe(true);
    expect(dir).toContain(testUserId);
  });

  it("debe retornar cuota inicial sin uso", async () => {
    const info = await storageService.getUserStorageInfo(testUserId, 10);
    expect(info.quotaMb).toBe(10);
    expect(info.usedBytes).toBe(0);
    expect(info.availableBytes).toBe(10 * 1024 * 1024);
    expect(info.percentUsed).toBe(0);
  });

  it("debe guardar un proyecto y calcular el uso de almacenamiento", async () => {
    const dummyBuffer = Buffer.alloc(1024 * 100); // 100 KB
    const { project, storage } = await storageService.saveProject(testUserId, 10, {
      name: "Mi Primer Mazo",
      description: "Mazo de prueba para cartas de rol",
      cardCount: 20,
      documentCount: 2,
      buffer: dummyBuffer
    });

    expect(project.id).toBeDefined();
    expect(project.name).toBe("Mi Primer Mazo");
    expect(project.description).toBe("Mazo de prueba para cartas de rol");
    expect(project.cardCount).toBe(20);
    expect(project.documentCount).toBe(2);
    expect(project.fileSizeBytes).toBe(dummyBuffer.length);

    expect(storage.usedBytes).toBe(dummyBuffer.length);
    expect(storage.availableBytes).toBe(10 * 1024 * 1024 - dummyBuffer.length);

    // Verificar que el archivo existe en disco
    const { filePath } = await storageService.getProjectFilePath(testUserId, project.id);
    expect(fs.existsSync(filePath)).toBe(true);
  });

  it("debe rechazar el guardado si el archivo excede la cuota disponible", async () => {
    const tooLargeBuffer = Buffer.alloc(11 * 1024 * 1024); // 11 MB (supera la cuota de 10 MB)

    await expect(
      storageService.saveProject(testUserId, 10, {
        name: "Proyecto Enorme",
        buffer: tooLargeBuffer
      })
    ).rejects.toMatchObject({
      code: "QUOTA_EXCEEDED"
    });
  });

  it("debe permitir sobrescribir un proyecto descontando el tamaño previo", async () => {
    // Cuota de 2 MB
    const buffer1 = Buffer.alloc(1.5 * 1024 * 1024); // 1.5 MB
    const { project: p1 } = await storageService.saveProject(testUserId, 2, {
      name: "Proyecto Actualizable",
      buffer: buffer1
    });

    // Guardar actualización con 1.8 MB (si no se descontase p1, sumaría 3.3 MB y fallaría)
    const buffer2 = Buffer.alloc(1.8 * 1024 * 1024);
    const { project: p2, storage } = await storageService.saveProject(testUserId, 2, {
      id: p1.id,
      name: "Proyecto Actualizable v2",
      cardCount: 50,
      buffer: buffer2
    });

    expect(p2.id).toBe(p1.id);
    expect(p2.name).toBe("Proyecto Actualizable v2");
    expect(p2.cardCount).toBe(50);
    expect(p2.fileSizeBytes).toBe(buffer2.length);
    expect(storage.usedBytes).toBe(buffer2.length);
  });

  it("debe permitir proyectos con el mismo nombre si tienen distinta ID sin sobrescribirse entre sí", async () => {
    const b = Buffer.alloc(10);
    const { project: p1 } = await storageService.saveProject(testUserId, 10, {
      id: "id_1",
      name: "Mi baraja",
      buffer: b
    });
    const { project: p2 } = await storageService.saveProject(testUserId, 10, {
      id: "id_2",
      name: "Mi baraja",
      buffer: b
    });

    expect(p1.id).toBe("id_1");
    expect(p2.id).toBe("id_2");
    expect(p1.name).toBe("Mi baraja");
    expect(p2.name).toBe("Mi baraja");

    const list = storageService.listProjects(testUserId);
    expect(list.length).toBe(2);
    expect(list.filter((p) => p.name === "Mi baraja").length).toBe(2);
  });

  it("debe listar proyectos ordenados descendentemente por fecha", async () => {
    const b = Buffer.alloc(10);
    await storageService.saveProject(testUserId, 10, { name: "A", buffer: b });
    await storageService.saveProject(testUserId, 10, { name: "B", buffer: b });

    const list = storageService.listProjects(testUserId);
    expect(list.length).toBe(2);
    expect(list[0].name).toBe("B");
    expect(list[1].name).toBe("A");
  });

  it("debe eliminar un proyecto del disco y de la base de datos liberando espacio", async () => {
    const dummyBuffer = Buffer.alloc(500 * 1024);
    const { project } = await storageService.saveProject(testUserId, 10, {
      name: "Para Borrar",
      buffer: dummyBuffer
    });

    const { filePath } = await storageService.getProjectFilePath(testUserId, project.id);
    expect(fs.existsSync(filePath)).toBe(true);

    const { storage } = await storageService.deleteProject(testUserId, 10, project.id);
    expect(storage.usedBytes).toBe(0);
    expect(fs.existsSync(filePath)).toBe(false);

    expect(storageService.getProjectById(testUserId, project.id)).toBeNull();
  });
});
