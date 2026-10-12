import crypto from "crypto";
import type { Database as DatabaseType } from "better-sqlite3";
import type { User, UserApiKeyMetadata, CreateApiKeyResponse } from "shared";

export class ApiKeyService {
  private db: DatabaseType;

  constructor(db: DatabaseType) {
    this.db = db;
  }

  /**
   * Genera una nueva API Key para el usuario, guardando solo el hash SHA-256 en la base de datos.
   * Devuelve la clave en texto plano únicamente en esta respuesta de creación.
   */
  public async createApiKey(userId: string, name: string): Promise<CreateApiKeyResponse> {
    const cleanName = (name || "").trim();
    if (!cleanName) {
      throw new Error("El nombre de la API Key no puede estar vacío.");
    }

    const keyId = crypto.randomUUID();
    const secretBytes = crypto.randomBytes(32).toString("hex");
    const rawApiKey = `cdc2_live_${secretBytes}`;
    const keyHash = crypto.createHash("sha256").update(rawApiKey).digest("hex");
    const prefix = `cdc2_live_${secretBytes.slice(0, 6)}...`;
    const now = new Date().toISOString();

    this.db
      .prepare(
        `INSERT INTO user_api_keys (id, user_id, name, key_hash, prefix, last_used_at, created_at)
         VALUES (?, ?, ?, ?, ?, NULL, ?)`
      )
      .run(keyId, userId, cleanName, keyHash, prefix, now);

    return {
      id: keyId,
      name: cleanName,
      prefix,
      createdAt: now,
      apiKey: rawApiKey
    };
  }

  /**
   * Lista las API Keys activas del usuario ordenadas por fecha de creación decreciente.
   * En ningún caso expone los hashes o secretos completos.
   */
  public async listApiKeys(userId: string): Promise<UserApiKeyMetadata[]> {
    const rows = this.db
      .prepare(
        `SELECT id, user_id, name, prefix, last_used_at, created_at
         FROM user_api_keys
         WHERE user_id = ?
         ORDER BY created_at DESC, rowid DESC`
      )
      .all(userId) as any[];

    return rows.map((r) => ({
      id: r.id,
      userId: r.user_id,
      name: r.name,
      prefix: r.prefix,
      lastUsedAt: r.last_used_at,
      createdAt: r.created_at
    }));
  }

  /**
   * Revoca y elimina permanentemente una API Key perteneciente al usuario.
   */
  public async revokeApiKey(userId: string, keyId: string): Promise<boolean> {
    const info = this.db
      .prepare("DELETE FROM user_api_keys WHERE id = ? AND user_id = ?")
      .run(keyId, userId);
    return info.changes > 0;
  }

  /**
   * Valida un token rawApiKey recibido en cabeceras HTTP (X-API-Key o Authorization).
   * Si es válido, actualiza last_used_at y devuelve el objeto User correspondiente.
   */
  public async validateApiKey(rawApiKey: string): Promise<{ user: User; keyId: string } | null> {
    if (!rawApiKey || !rawApiKey.startsWith("cdc2_live_")) {
      return null;
    }

    const keyHash = crypto.createHash("sha256").update(rawApiKey).digest("hex");
    const row = this.db
      .prepare(
        `SELECT k.id as key_id, u.id, u.email, u.username, u.password_hash, u.role, u.storage_quota_mb, u.created_at, u.updated_at
         FROM user_api_keys k
         JOIN users u ON k.user_id = u.id
         WHERE k.key_hash = ?`
      )
      .get(keyHash) as any;

    if (!row) {
      return null;
    }

    const now = new Date().toISOString();
    this.db.prepare("UPDATE user_api_keys SET last_used_at = ? WHERE id = ?").run(now, row.key_id);

    const user: User = {
      id: row.id,
      email: row.email,
      username: row.username,
      passwordHash: row.password_hash,
      role: row.role,
      storageQuotaMb: row.storage_quota_mb,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };

    return { user, keyId: row.key_id };
  }
}
