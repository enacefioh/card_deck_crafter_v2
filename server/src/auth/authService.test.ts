import { describe, it, expect, beforeEach } from "vitest";
import Database from "better-sqlite3";
import { SqliteUserRepository } from "./sqliteUserRepository";
import { AuthService } from "./authService";

describe("AuthService y SqliteUserRepository (SRS-062)", () => {
  let db: any;
  let repo: SqliteUserRepository;
  let authService: AuthService;

  beforeEach(() => {
    db = new Database(":memory:");
    repo = new SqliteUserRepository(db);
    authService = new AuthService(repo);
  });

  it("debe reportar estado inicial no inicializado si no hay usuarios", async () => {
    const status = await authService.getStatus();
    expect(status.initialized).toBe(false);
    expect(status.usersCount).toBe(0);
  });

  it("debe permitir inicializar el administrador maestro en el primer arranque", async () => {
    const { user, session } = await authService.setupAdmin("admin@admin.com", "claveSecreta123");
    expect(user.email).toBe("admin@admin.com");
    expect(user.role).toBe("admin");
    expect(user.passwordHash).not.toBeNull();
    expect(session.id).toBeDefined();

    const status = await authService.getStatus();
    expect(status.initialized).toBe(true);
    expect(status.usersCount).toBe(1);
  });

  it("debe bloquear setupAdmin si ya existe al menos un usuario", async () => {
    await authService.setupAdmin("admin@admin.com", "claveSecreta123");
    await expect(
      authService.setupAdmin("otro@admin.com", "otraClave456")
    ).rejects.toThrow("El sistema ya ha sido inicializado");
  });

  it("debe permitir login correcto con contraseña y rechazar clave incorrecta", async () => {
    await authService.setupAdmin("admin@admin.com", "claveCorrecta");

    // Login correcto
    const loginOk = await authService.login("admin@admin.com", "claveCorrecta");
    expect(loginOk.status).toBe("OK");
    expect(loginOk.user?.email).toBe("admin@admin.com");
    expect(loginOk.session).toBeDefined();

    // Login incorrecto
    await expect(authService.login("admin@admin.com", "claveErronea")).rejects.toThrow(
      "Credenciales incorrectas."
    );
  });

  it("debe devolver REQUIRES_ACTIVATION para usuarios creados sin contraseña", async () => {
    // Admin creado
    await authService.setupAdmin("admin@admin.com", "admin123");

    // Admin da de alta a un usuario nuevo con contraseña vacía (password_hash = null)
    await repo.createUser("empleado@empresa.com", "user", null);

    // Intento de login del empleado
    const loginRes = await authService.login("empleado@empresa.com");
    expect(loginRes.status).toBe("REQUIRES_ACTIVATION");
    expect(loginRes.email).toBe("empleado@empresa.com");

    // Activación de contraseña
    const actRes = await authService.activatePassword(
      "empleado@empresa.com",
      "miNuevaClave123",
      "miNuevaClave123"
    );
    expect(actRes.user.email).toBe("empleado@empresa.com");
    expect(actRes.session.id).toBeDefined();

    // Posterior login normal con su nueva clave
    const nuevoLogin = await authService.login("empleado@empresa.com", "miNuevaClave123");
    expect(nuevoLogin.status).toBe("OK");
  });

  it("debe revocar sesiones al resetear contraseña", async () => {
    await authService.setupAdmin("admin@admin.com", "admin123");
    const { session } = await authService.login("admin@admin.com", "admin123");

    const sessionUserBefore = await authService.getSessionUser(session!.id);
    expect(sessionUserBefore?.email).toBe("admin@admin.com");

    // Admin resetea la contraseña del usuario
    await repo.resetPassword(sessionUserBefore!.id);

    // La sesión previa debe haber sido destruida
    const sessionUserAfter = await authService.getSessionUser(session!.id);
    expect(sessionUserAfter).toBeNull();
  });
});
