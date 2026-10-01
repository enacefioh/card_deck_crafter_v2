import { describe, it, expect, beforeEach } from "vitest";
import Database from "better-sqlite3";
import AdmZip from "adm-zip";
import fs from "fs-extra";
import path from "path";
import { SqliteUserRepository } from "./sqliteUserRepository";
import { AuthService } from "./authService";

describe("Panel de Administración y Métricas - SRS-063", () => {
  let db: any;
  let repo: SqliteUserRepository;
  let authService: AuthService;

  beforeEach(() => {
    db = new Database(":memory:");
    repo = new SqliteUserRepository(db);
    authService = new AuthService(repo);
  });

  it("debe calcular métricas del dashboard correctamente", async () => {
    // 1. Base de datos limpia
    let metrics = await repo.getDashboardMetrics();
    expect(metrics.totalUsers).toBe(0);
    expect(metrics.activeUsers).toBe(0);
    expect(metrics.pendingUsers).toBe(0);

    // 2. Administrador inicial creado con contraseña activa
    const { user: admin } = await authService.setupAdmin("admin@cdc2.local", "superpassword123");
    metrics = await repo.getDashboardMetrics();
    expect(metrics.totalUsers).toBe(1);
    expect(metrics.activeUsers).toBe(1);
    expect(metrics.pendingUsers).toBe(0);

    // 3. Admin registra usuario nuevo con clave vacía (pendiente de activación)
    const user1 = await repo.createUser("empleado@cdc2.local", "user", null);
    metrics = await repo.getDashboardMetrics();
    expect(metrics.totalUsers).toBe(2);
    expect(metrics.activeUsers).toBe(1);
    expect(metrics.pendingUsers).toBe(1);

    // 4. Usuario activa su contraseña
    await authService.activatePassword("empleado@cdc2.local", "claveEmpleado123", "claveEmpleado123");
    metrics = await repo.getDashboardMetrics();
    expect(metrics.totalUsers).toBe(2);
    expect(metrics.activeUsers).toBe(2);
    expect(metrics.pendingUsers).toBe(0);

    // 5. Admin resetea la contraseña del usuario
    await repo.resetPassword(user1.id);
    metrics = await repo.getDashboardMetrics();
    expect(metrics.totalUsers).toBe(2);
    expect(metrics.activeUsers).toBe(1);
    expect(metrics.pendingUsers).toBe(1);
  });

  it("debe permitir cambiar roles y eliminar usuarios correctamente", async () => {
    const { user: admin } = await authService.setupAdmin("admin@cdc2.local", "adminpass");
    const normalUser = await repo.createUser("test@cdc2.local", "user", null);

    // Cambiar a admin
    await repo.updateRole(normalUser.id, "admin");
    let updated = await repo.findById(normalUser.id);
    expect(updated?.role).toBe("admin");

    // Cambiar de vuelta a user
    await repo.updateRole(normalUser.id, "user");
    updated = await repo.findById(normalUser.id);
    expect(updated?.role).toBe("user");

    // Eliminar usuario
    await repo.deleteUser(normalUser.id);
    const deleted = await repo.findById(normalUser.id);
    expect(deleted).toBeNull();

    const count = await repo.countUsers();
    expect(count).toBe(1);
  });

  it("debe empaquetar archivos de datos en un archivo ZIP de backup excluyendo la carpeta backups", async () => {
    const AdmZip = (await import("adm-zip")).default;
    const fs = (await import("fs-extra")).default;
    const path = (await import("path")).default;

    const tempTestDir = path.join(process.cwd(), "temp/test_backup_" + Date.now());
    await fs.ensureDir(tempTestDir);
    await fs.ensureDir(path.join(tempTestDir, "backups"));
    await fs.writeFile(path.join(tempTestDir, "users.db"), "fake sqlite database content");
    await fs.writeFile(path.join(tempTestDir, "backups/old.zip"), "old backup");

    const zip = new AdmZip();
    const entries = await fs.readdir(tempTestDir);
    for (const entry of entries) {
      if (entry === "backups") continue;
      const fullPath = path.join(tempTestDir, entry);
      const stat = await fs.stat(fullPath);
      if (stat.isDirectory()) {
        zip.addLocalFolder(fullPath, entry);
      } else {
        zip.addLocalFile(fullPath);
      }
    }

    const zipBuffer = zip.toBuffer();
    expect(zipBuffer.length).toBeGreaterThan(0);

    const readZip = new AdmZip(zipBuffer);
    const zipEntries = readZip.getEntries().map((e: any) => e.entryName);
    expect(zipEntries).toContain("users.db");
    expect(zipEntries).not.toContain("backups/old.zip");

    await fs.remove(tempTestDir);
  });

  it("permite cerrar y reabrir el SqliteUserRepository tras restaurar datos", async () => {
    const testDbDir = path.join(process.cwd(), "temp/test_restore_" + Date.now());
    const testDbPath = path.join(testDbDir, "users.db");
    await fs.ensureDir(testDbDir);

    const repo = new SqliteUserRepository(testDbPath);
    await repo.createUser("initial@test.com", "admin", "hash1");
    expect(await repo.findByEmail("initial@test.com")).not.toBeNull();

    // Crear un backup simulado con otro usuario
    const altDbPath = path.join(testDbDir, "alt.db");
    const altRepo = new SqliteUserRepository(altDbPath);
    await altRepo.createUser("restored@test.com", "user", "hash2");
    altRepo.close();

    const zip = new AdmZip();
    zip.addLocalFile(altDbPath, "", "users.db");
    const zipBuffer = zip.toBuffer();

    // Restaurar sobre el repo principal: cerramos, sobreescribimos y reabrimos
    repo.close();

    const unzipper = new AdmZip(zipBuffer);
    unzipper.extractAllTo(testDbDir, true);

    repo.reopen();
    const restoredUser = await repo.findByEmail("restored@test.com");
    expect(restoredUser).not.toBeNull();
    expect(restoredUser?.email).toBe("restored@test.com");

    const oldUser = await repo.findByEmail("initial@test.com");
    expect(oldUser).toBeNull();

    repo.close();
    await fs.remove(testDbDir);
  });

  it("debe gestionar la cuota de almacenamiento por usuario (SRS-065)", async () => {
    // 1. Al crear un usuario, recibe por defecto 100 MB
    const user = await repo.createUser("quota_test@cdc2.local", "user", null);
    expect(user.storageQuotaMb).toBe(100);

    const found = await repo.findById(user.id);
    expect(found?.storageQuotaMb).toBe(100);

    // 2. Comprobar que en listUsers aparece la cuota
    const list = await repo.listUsers();
    const userSummary = list.find(u => u.id === user.id);
    expect(userSummary?.storageQuotaMb).toBe(100);

    // 3. Modificar la cuota a 500 MB
    await repo.updateStorageQuota(user.id, 500);

    const updated = await repo.findById(user.id);
    expect(updated?.storageQuotaMb).toBe(500);

    const updatedList = await repo.listUsers();
    const updatedSummary = updatedList.find(u => u.id === user.id);
    expect(updatedSummary?.storageQuotaMb).toBe(500);

    // 4. Comprobar que findSession retorna la cuota de almacenamiento actualizada
    const session = await repo.createSession("sess_test_quota", user.id, new Date(Date.now() + 100000).toISOString());
    const sessionData = await repo.findSession(session.id);
    expect(sessionData).not.toBeNull();
    expect(sessionData?.user.storageQuotaMb).toBe(500);
  });
});

