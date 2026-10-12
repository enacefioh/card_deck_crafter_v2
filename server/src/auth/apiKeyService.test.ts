import { describe, it, expect, beforeEach } from "vitest";
import Database from "better-sqlite3";
import { MigrationManager } from "../db/migrations";
import { ApiKeyService } from "./apiKeyService";

describe("ApiKeyService - SRS-078", () => {
  let db: any;
  let service: ApiKeyService;
  const testUserId = "user-test-123";

  beforeEach(() => {
    db = new Database(":memory:");
    const migrator = new MigrationManager(db);
    migrator.runMigrations();

    // Crear un usuario de prueba en SQLite
    db.prepare(`
      INSERT INTO users (id, email, username, role, storage_quota_mb, created_at, updated_at)
      VALUES (?, 'test@cardcrafter.local', 'tester', 'user', 100, datetime('now'), datetime('now'))
    `).run(testUserId);

    service = new ApiKeyService(db);
  });

  it("debe generar una API Key con prefijo 'cdc2_live_' y devolver el secreto en texto plano solo al crearla", async () => {
    const res = await service.createApiKey(testUserId, "Mi Agente Cursor");

    expect(res.id).toBeDefined();
    expect(res.name).toBe("Mi Agente Cursor");
    expect(res.prefix).toMatch(/^cdc2_live_[a-f0-9]{6}\.\.\.$/);
    expect(res.apiKey).toMatch(/^cdc2_live_[a-f0-9]{64}$/);
    expect(res.createdAt).toBeDefined();

    // Comprobar que en base de datos NO se almacena el texto plano sino el hash
    const row = db.prepare("SELECT * FROM user_api_keys WHERE id = ?").get(res.id);
    expect(row).toBeDefined();
    expect(row.key_hash).toHaveLength(64);
    expect(row.key_hash).not.toBe(res.apiKey);
  });

  it("debe rechazar nombres vacíos para la API Key", async () => {
    await expect(service.createApiKey(testUserId, "   ")).rejects.toThrow(
      "El nombre de la API Key no puede estar vacío."
    );
  });

  it("debe listar las API Keys del usuario sin exponer el secreto completo", async () => {
    await service.createApiKey(testUserId, "Clave 1");
    await service.createApiKey(testUserId, "Clave 2");

    const keys = await service.listApiKeys(testUserId);
    expect(keys).toHaveLength(2);
    expect(keys[0].name).toBe("Clave 2");
    expect(keys[1].name).toBe("Clave 1");
    expect(keys[0].prefix).toMatch(/^cdc2_live_/);
    expect((keys[0] as any).apiKey).toBeUndefined();
    expect((keys[0] as any).key_hash).toBeUndefined();
  });

  it("debe revocar y eliminar una API Key existente", async () => {
    const created = await service.createApiKey(testUserId, "Clave a revocar");
    let keys = await service.listApiKeys(testUserId);
    expect(keys).toHaveLength(1);

    const revoked = await service.revokeApiKey(testUserId, created.id);
    expect(revoked).toBe(true);

    keys = await service.listApiKeys(testUserId);
    expect(keys).toHaveLength(0);
  });

  it("no debe permitir a un usuario revocar la clave de otro usuario", async () => {
    const created = await service.createApiKey(testUserId, "Clave Usuario 1");
    const otherUserId = "user-other-456";

    const revoked = await service.revokeApiKey(otherUserId, created.id);
    expect(revoked).toBe(false);

    const keys = await service.listApiKeys(testUserId);
    expect(keys).toHaveLength(1);
  });

  it("debe validar correctamente un token rawApiKey y actualizar last_used_at", async () => {
    const created = await service.createApiKey(testUserId, "Clave para Auth");

    // Validar token correcto
    const validation = await service.validateApiKey(created.apiKey);
    expect(validation).not.toBeNull();
    expect(validation!.user.id).toBe(testUserId);
    expect(validation!.user.email).toBe("test@cardcrafter.local");
    expect(validation!.keyId).toBe(created.id);

    // Verificar que last_used_at se actualizó
    const row = db.prepare("SELECT last_used_at FROM user_api_keys WHERE id = ?").get(created.id);
    expect(row.last_used_at).not.toBeNull();
  });

  it("debe rechazar tokens inválidos, malformados o inexistentes", async () => {
    expect(await service.validateApiKey("token_invalido")).toBeNull();
    expect(await service.validateApiKey("cdc2_live_0000000000000000000000000000000000000000000000000000000000000000")).toBeNull();
    expect(await service.validateApiKey("")).toBeNull();
  });
});
