import bcrypt from "bcryptjs";
import { randomBytes } from "crypto";
import type { User, AuthSession, AuthStatusResponse, LoginResponse, UserRole } from "shared";
import { SqliteUserRepository } from "./sqliteUserRepository.js";

export const SESSION_COOKIE_NAME = "cdc2_session";
export const SESSION_DURATION_MS = 30 * 24 * 60 * 60 * 1000; // 30 días

export class AuthService {
  private repo: SqliteUserRepository;

  constructor(repo?: SqliteUserRepository) {
    this.repo = repo || new SqliteUserRepository();
  }

  public getRepository(): SqliteUserRepository {
    return this.repo;
  }

  public async getStatus(): Promise<AuthStatusResponse> {
    const usersCount = await this.repo.countUsers();
    return {
      initialized: usersCount > 0,
      usersCount
    };
  }

  public async setupAdmin(email: string, password: string): Promise<{ user: User; session: AuthSession }> {
    const count = await this.repo.countUsers();
    if (count > 0) {
      throw new Error("El sistema ya ha sido inicializado con un administrador.");
    }

    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes("@")) {
      throw new Error("El formato del correo electrónico no es válido.");
    }

    if (!password || password.length < 6) {
      throw new Error("La contraseña debe tener al menos 6 caracteres.");
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await this.repo.createUser(cleanEmail, "admin", passwordHash);
    const session = await this.createSessionForUser(user.id);

    return { user, session };
  }

  public async login(email: string, password?: string): Promise<{ status: "OK" | "REQUIRES_ACTIVATION"; email: string; user?: User; session?: AuthSession }> {
    const cleanEmail = (email || "").trim().toLowerCase();
    if (!cleanEmail) {
      throw new Error("El email es obligatorio.");
    }

    const user = await this.repo.findByEmail(cleanEmail);
    if (!user) {
      throw new Error("Credenciales incorrectas.");
    }

    // Caso: Usuario creado sin contraseña (pendiente de activación o reseteado)
    if (user.passwordHash === null || user.passwordHash === "") {
      return {
        status: "REQUIRES_ACTIVATION",
        email: user.email
      };
    }

    // Caso: Usuario con contraseña fijada
    if (!password) {
      throw new Error("Credenciales incorrectas.");
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      throw new Error("Credenciales incorrectas.");
    }

    const session = await this.createSessionForUser(user.id);
    return {
      status: "OK",
      email: user.email,
      user,
      session
    };
  }

  public async activatePassword(email: string, password: string, confirmPassword: string): Promise<{ user: User; session: AuthSession }> {
    const cleanEmail = (email || "").trim().toLowerCase();
    if (!cleanEmail) {
      throw new Error("El email es obligatorio.");
    }

    if (!password || password.length < 6) {
      throw new Error("La contraseña debe tener al menos 6 caracteres.");
    }

    if (password !== confirmPassword) {
      throw new Error("Las contraseñas introducidas no coinciden.");
    }

    const user = await this.repo.findByEmail(cleanEmail);
    if (!user) {
      throw new Error("Usuario no encontrado.");
    }

    if (user.passwordHash !== null && user.passwordHash !== "") {
      throw new Error("El usuario ya cuenta con una contraseña activa.");
    }

    const passwordHash = await bcrypt.hash(password, 10);
    await this.repo.setPassword(user.id, passwordHash);

    const updatedUser = await this.repo.findById(user.id);
    const session = await this.createSessionForUser(user.id);

    return { user: updatedUser!, session };
  }

  public async getSessionUser(sessionId: string): Promise<User | null> {
    if (!sessionId) return null;
    const result = await this.repo.findSession(sessionId);
    return result ? result.user : null;
  }

  public async logout(sessionId: string): Promise<void> {
    if (sessionId) {
      await this.repo.deleteSession(sessionId);
    }
  }

  private async createSessionForUser(userId: string): Promise<AuthSession> {
    const sessionId = randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + SESSION_DURATION_MS).toISOString();
    return await this.repo.createSession(sessionId, userId, expiresAt);
  }
}
