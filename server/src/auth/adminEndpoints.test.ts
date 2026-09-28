import { describe, it, expect, beforeEach } from "vitest";
import Database from "better-sqlite3";
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
});
