import express from "express";
import multer from "multer";
import cors from "cors";
import puppeteer from "puppeteer";
import AdmZip from "adm-zip";
import fs from "fs-extra";
import path from "path";
import { fileURLToPath } from "url";
import { randomUUID } from "crypto";
import { calcularDistribucion } from "shared";
import type { CanvasConfig, ProyectoCDC2, Carta } from "shared";

import cookieParser from "cookie-parser";
import { AuthService, SESSION_COOKIE_NAME, SESSION_DURATION_MS } from "./auth/authService.js";
import { SqliteUserRepository } from "./auth/sqliteUserRepository.js";
import { UserStorageService } from "./storage/userStorageService.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = process.env.PORT || 3000;

// Configurar CORS
app.use(cors({
  origin: true,
  credentials: true
}));
app.use(express.json());
app.use(cookieParser());

const authService = new AuthService();

// Inicialización desatendida opcional por variables de entorno
(async () => {
  try {
    const status = await authService.getStatus();
    if (!status.initialized && process.env.CDC2_ADMIN_EMAIL && process.env.CDC2_ADMIN_PASSWORD) {
      await authService.setupAdmin(process.env.CDC2_ADMIN_EMAIL, process.env.CDC2_ADMIN_PASSWORD);
      console.log(`[cdc2 auth] Administrador inicial creado desatendidamente: ${process.env.CDC2_ADMIN_EMAIL}`);
    }
  } catch (err) {
    console.error("[cdc2 auth] Error al inicializar administrador por entorno:", err);
  }
})();

const cookieOptions: express.CookieOptions = {
  httpOnly: true,
  sameSite: "lax",
  maxAge: SESSION_DURATION_MS,
  path: "/"
};

// Endpoint de Health Check
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// ==================== ENDPOINTS DE AUTENTICACIÓN (SRS-062) ====================

app.get("/api/auth/status", async (_req, res) => {
  try {
    const status = await authService.getStatus();
    res.json(status);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/auth/setup-admin", async (req, res) => {
  try {
    const { email, password } = req.body;
    const { user, session } = await authService.setupAdmin(email, password);
    res.cookie(SESSION_COOKIE_NAME, session.id, cookieOptions);
    res.json({
      status: "OK",
      user: { id: user.id, email: user.email, role: user.role }
    });
  } catch (err: any) {
    res.status(400).json({ error: err.message || "Error al configurar el administrador." });
  }
});

app.post("/api/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    const result = await authService.login(email, password);
    if (result.status === "REQUIRES_ACTIVATION") {
      res.json({ status: "REQUIRES_ACTIVATION", email: result.email });
    } else {
      res.cookie(SESSION_COOKIE_NAME, result.session!.id, cookieOptions);
      res.json({
        status: "OK",
        email: result.email,
        user: { id: result.user!.id, email: result.user!.email, role: result.user!.role }
      });
    }
  } catch (err: any) {
    res.status(401).json({ error: err.message || "Credenciales incorrectas." });
  }
});

app.post("/api/auth/activate-password", async (req, res) => {
  try {
    const { email, password, confirmPassword } = req.body;
    const { user, session } = await authService.activatePassword(email, password, confirmPassword);
    res.cookie(SESSION_COOKIE_NAME, session.id, cookieOptions);
    res.json({
      status: "OK",
      user: { id: user.id, email: user.email, role: user.role }
    });
  } catch (err: any) {
    res.status(400).json({ error: err.message || "Error al activar contraseña." });
  }
});

app.get("/api/auth/me", async (req, res) => {
  try {
    const sessionId = req.cookies?.[SESSION_COOKIE_NAME];
    if (!sessionId) {
      return res.json({ user: null });
    }
    const user = await authService.getSessionUser(sessionId);
    if (!user) {
      res.clearCookie(SESSION_COOKIE_NAME, { path: "/" });
      return res.json({ user: null });
    }
    res.json({
      user: { id: user.id, email: user.email, role: user.role }
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/auth/logout", async (req, res) => {
  try {
    const sessionId = req.cookies?.[SESSION_COOKIE_NAME];
    if (sessionId) {
      await authService.logout(sessionId);
    }
    res.clearCookie(SESSION_COOKIE_NAME, { path: "/" });
    res.json({ status: "OK" });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ==================== ENDPOINTS DE ADMINISTRACIÓN (SRS-063) ====================

const requireAdmin = async (req: express.Request, res: express.Response, next: express.NextFunction) => {
  try {
    const sessionId = req.cookies?.[SESSION_COOKIE_NAME];
    if (!sessionId) {
      return res.status(401).json({ error: "No autenticado. Inicia sesión como administrador." });
    }
    const user = await authService.getSessionUser(sessionId);
    if (!user) {
      res.clearCookie(SESSION_COOKIE_NAME, { path: "/" });
      return res.status(401).json({ error: "Sesión inválida o expirada." });
    }
    if (user.role !== "admin") {
      return res.status(403).json({ error: "Acceso denegado. Se requiere rol de Administrador." });
    }
    (req as any).currentUser = user;
    next();
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

app.get("/api/admin/dashboard", requireAdmin, async (_req, res) => {
  try {
    const metrics = await authService.getRepository().getDashboardMetrics();
    res.json({
      ...metrics,
      version: "v2.261001.7",
      database: "SQLite 3"
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/admin/users", requireAdmin, async (_req, res) => {
  try {
    const users = await authService.getRepository().listUsers();
    const storageService = getStorageService();
    const enrichedUsers = await Promise.all(
      users.map(async (u) => {
        const usedBytes = await storageService.getDiskUsedStorageBytes(u.id);
        const usedMb = parseFloat((usedBytes / (1024 * 1024)).toFixed(2));
        return {
          ...u,
          usedStorageBytes: usedBytes,
          usedStorageMb: usedMb
        };
      })
    );
    res.json(enrichedUsers);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/admin/users", requireAdmin, async (req, res) => {
  try {
    const { email, role } = req.body;
    const cleanEmail = (email || "").trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes("@")) {
      return res.status(400).json({ error: "El correo electrónico no es válido." });
    }

    const existing = await authService.getRepository().findByEmail(cleanEmail);
    if (existing) {
      return res.status(400).json({ error: "Ya existe un usuario con ese correo electrónico." });
    }

    const assignedRole = role === "admin" ? "admin" : "user";
    const user = await authService.getRepository().createUser(cleanEmail, assignedRole, null);
    res.json({
      status: "OK",
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        hasPassword: false,
        storageQuotaMb: user.storageQuotaMb,
        createdAt: user.createdAt
      }
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.patch("/api/admin/users/:id/quota", requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { quotaMb } = req.body;

    const numericQuota = Number(quotaMb);
    if (!Number.isInteger(numericQuota) || numericQuota < 1) {
      return res.status(400).json({ error: "La cuota de almacenamiento debe ser un número entero mayor o igual a 1 MB." });
    }

    if (numericQuota > 1000000) {
      return res.status(400).json({ error: "La cuota de almacenamiento no puede superar 1.000.000 MB." });
    }

    const user = await authService.getRepository().findById(id);
    if (!user) {
      return res.status(404).json({ error: "Usuario no encontrado." });
    }

    await authService.getRepository().updateStorageQuota(id, numericQuota);
    res.json({ status: "OK", quotaMb: numericQuota });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/admin/users/:id/reset-password", requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const user = await authService.getRepository().findById(id);
    if (!user) {
      return res.status(404).json({ error: "Usuario no encontrado." });
    }

    await authService.getRepository().resetPassword(id);
    res.json({ status: "OK", message: "Contraseña reseteada con éxito." });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.patch("/api/admin/users/:id/role", requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { role } = req.body;
    if (role !== "admin" && role !== "user") {
      return res.status(400).json({ error: "Rol no válido. Debe ser 'admin' o 'user'." });
    }

    const currentAdmin = (req as any).currentUser;
    if (currentAdmin.id === id && role !== "admin") {
      return res.status(400).json({ error: "No puedes revocar tu propio rol de Administrador." });
    }

    const user = await authService.getRepository().findById(id);
    if (!user) {
      return res.status(404).json({ error: "Usuario no encontrado." });
    }

    await authService.getRepository().updateRole(id, role);
    res.json({ status: "OK", role });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.delete("/api/admin/users/:id", requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const currentAdmin = (req as any).currentUser;
    if (currentAdmin.id === id) {
      return res.status(400).json({ error: "No puedes eliminar tu propia cuenta de Administrador." });
    }

    const user = await authService.getRepository().findById(id);
    if (!user) {
      return res.status(404).json({ error: "Usuario no encontrado." });
    }

    await authService.getRepository().deleteUser(id);
    res.json({ status: "OK" });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Endpoint de descarga de copia de seguridad (SRS-064)
app.get("/api/admin/backup/export", requireAdmin, async (_req, res) => {
  try {
    const repo = authService.getRepository() as SqliteUserRepository;
    const db = repo.getDatabase();

    // 1. Consolidar el WAL de SQLite para asegurar que el fichero users.db tenga todo el estado actual
    try {
      db.pragma("wal_checkpoint(TRUNCATE)");
    } catch (walErr) {
      console.warn("[backup] Advertencia al ejecutar wal_checkpoint:", walErr);
    }

    const dataDir = process.env.CDC2_DB_PATH
      ? path.dirname(process.env.CDC2_DB_PATH)
      : path.join(process.cwd(), "server/data");

    if (!await fs.pathExists(dataDir)) {
      return res.status(404).json({ error: "El directorio de datos no existe." });
    }

    // 2. Empaquetar el contenido del directorio en un ZIP con AdmZip
    const zip = new AdmZip();
    const entries = await fs.readdir(dataDir);
    for (const entry of entries) {
      if (entry === "backups") continue; // evitar recursión dentro de la carpeta backups
      const fullPath = path.join(dataDir, entry);
      const stat = await fs.stat(fullPath);
      if (stat.isDirectory()) {
        zip.addLocalFolder(fullPath, entry);
      } else {
        zip.addLocalFile(fullPath);
      }
    }

    const zipBuffer = zip.toBuffer();
    const now = new Date();
    const dateStr = now.toISOString().replace(/[-:T]/g, "").slice(0, 14); // YYYYMMDDHHmmss
    const filename = `cdc2_backup_${dateStr}.zip`;

    // 3. Guardar también una copia interna en server/data/backups/
    const localBackupDir = path.join(dataDir, "backups");
    await fs.ensureDir(localBackupDir);
    await fs.writeFile(path.join(localBackupDir, filename), zipBuffer);

    // 4. Enviar archivo para descarga en el navegador
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.setHeader("Content-Type", "application/zip");
    res.setHeader("Content-Length", zipBuffer.length);
    res.send(zipBuffer);
  } catch (err: any) {
    console.error("Error al exportar copia de seguridad:", err);
    res.status(500).json({ error: err.message || "Error al exportar la copia de seguridad." });
  }
});

// Endpoint de importación / restauración de copia de seguridad (SRS-064)
app.post("/api/admin/backup/import", requireAdmin, multer({ storage: multer.memoryStorage(), limits: { fileSize: 100 * 1024 * 1024 } }).single("backup"), async (req, res) => {
  const repo = authService.getRepository() as SqliteUserRepository;
  try {
    if (!req.file || !req.file.buffer) {
      return res.status(400).json({ error: "No se ha subido ningún archivo de copia de seguridad." });
    }

    // 1. Validar que el archivo subido sea un ZIP válido
    let incomingZip: AdmZip;
    try {
      incomingZip = new AdmZip(req.file.buffer);
    } catch {
      return res.status(400).json({ error: "El archivo proporcionado no es un archivo ZIP válido." });
    }

    // 2. Comprobar que contiene la base de datos de usuarios
    const entries = incomingZip.getEntries();
    const hasUsersDb = entries.some(e => e.entryName === "users.db" || e.entryName.endsWith("/users.db") || e.entryName.endsWith("\\users.db"));
    if (!hasUsersDb) {
      return res.status(400).json({ error: "El archivo ZIP no contiene una base de datos válida ('users.db')." });
    }

    const dataDir = process.env.CDC2_DB_PATH
      ? path.dirname(process.env.CDC2_DB_PATH)
      : path.join(process.cwd(), "server/data");

    // 3. Crear una copia de seguridad automática preventiva antes de sobreescribir
    const backupDir = path.join(dataDir, "backups");
    await fs.ensureDir(backupDir);
    const now = new Date();
    const dateStr = now.toISOString().replace(/[-:T]/g, "").slice(0, 14);
    const preRestoreFilename = `auto_pre_restore_${dateStr}.zip`;

    try {
      const currentZip = new AdmZip();
      if (await fs.pathExists(dataDir)) {
        const existingEntries = await fs.readdir(dataDir);
        for (const entry of existingEntries) {
          if (entry === "backups") continue;
          const fullPath = path.join(dataDir, entry);
          const stat = await fs.stat(fullPath);
          if (stat.isDirectory()) {
            currentZip.addLocalFolder(fullPath, entry);
          } else {
            currentZip.addLocalFile(fullPath);
          }
        }
        await fs.writeFile(path.join(backupDir, preRestoreFilename), currentZip.toBuffer());
      }
    } catch (preErr) {
      console.warn("[backup-restore] Advertencia al generar copia preventiva:", preErr);
    }

    // 4. Cerrar de forma ordenada la conexión SQLite activa
    repo.close();

    // 5. Limpiar ficheros anteriores de SQLite para evitar mezclas con WAL previo
    for (const f of ["users.db", "users.db-wal", "users.db-shm"]) {
      const p = path.join(dataDir, f);
      if (await fs.pathExists(p)) {
        await fs.remove(p);
      }
    }

    // 6. Extraer las entradas del ZIP
    for (const entry of entries) {
      if (entry.isDirectory) {
        await fs.ensureDir(path.join(dataDir, entry.entryName));
      } else {
        if (entry.entryName.startsWith("backups/") || entry.entryName.startsWith("backups\\")) {
          continue;
        }
        // Si el archivo viene anidado en una carpeta raíz del zip, normalizar si es users.db
        let targetRelative = entry.entryName;
        if (targetRelative.endsWith("users.db")) {
          targetRelative = "users.db";
        }
        const targetPath = path.join(dataDir, targetRelative);
        await fs.ensureDir(path.dirname(targetPath));
        await fs.writeFile(targetPath, entry.getData());
      }
    }

    // 7. Reabrir el repositorio SQLite y ejecutar migraciones si correspondieran
    repo.reopen();

    res.json({
      status: "OK",
      message: "Copia de seguridad restaurada correctamente.",
      preRestoreBackup: preRestoreFilename
    });
  } catch (err: any) {
    console.error("Error al restaurar copia de seguridad:", err);
    try {
      repo.reopen();
    } catch (_) {}
    res.status(500).json({ error: err.message || "Error al restaurar la copia de seguridad." });
  }
});

// ==================== ALMACENAMIENTO DE PROYECTOS EN LA NUBE Y CUOTA (SRS-066) ====================

const requireAuth = async (req: express.Request, res: express.Response, next: express.NextFunction) => {
  try {
    const sessionId = req.cookies?.[SESSION_COOKIE_NAME];
    if (!sessionId) {
      return res.status(401).json({ error: "No autenticado. Por favor inicia sesión." });
    }
    const user = await authService.getSessionUser(sessionId);
    if (!user) {
      res.clearCookie(SESSION_COOKIE_NAME, { path: "/" });
      return res.status(401).json({ error: "Sesión inválida o expirada." });
    }
    (req as any).currentUser = user;
    next();
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

const getStorageService = () => {
  const repo = authService.getRepository() as SqliteUserRepository;
  const dataDir = process.env.CDC2_DB_PATH
    ? path.dirname(process.env.CDC2_DB_PATH)
    : path.resolve(process.cwd(), process.cwd().endsWith("server") ? "data" : "server/data");
  return new UserStorageService(repo.getDatabase(), dataDir);
};

const projectUpload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 100 * 1024 * 1024 // 100MB límite máximo de subida
  }
});

// Consultar cuota y uso de almacenamiento
app.get("/api/user/storage", requireAuth, async (req, res) => {
  try {
    const user = (req as any).currentUser;
    const freshUser = await authService.getRepository().findById(user.id);
    const quota = freshUser?.storageQuotaMb ?? user.storageQuotaMb ?? 100;
    const storageService = getStorageService();
    const storage = await storageService.getUserStorageInfo(user.id, quota);
    res.json(storage);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Listar proyectos del usuario en la nube
app.get("/api/user/projects", requireAuth, async (req, res) => {
  try {
    const user = (req as any).currentUser;
    const storageService = getStorageService();
    const projects = storageService.listProjects(user.id);
    res.json({ projects });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Guardar o actualizar proyecto en la nube
app.post("/api/user/projects", requireAuth, projectUpload.single("file"), async (req, res) => {
  try {
    const user = (req as any).currentUser;
    if (!req.file) {
      return res.status(400).json({ error: "No se ha recibido ningún archivo de proyecto (.cdc2)." });
    }

    const { name, description, cardCount, documentCount, id } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ error: "El nombre del proyecto es obligatorio." });
    }

    const storageService = getStorageService();
    const freshUser = await authService.getRepository().findById(user.id);
    const quota = freshUser?.storageQuotaMb ?? user.storageQuotaMb ?? 100;
    const result = await storageService.saveProject(user.id, quota, {
      id: id || undefined,
      name: name.trim(),
      description: description || "",
      cardCount: cardCount ? parseInt(cardCount, 10) : 0,
      documentCount: documentCount ? parseInt(documentCount, 10) : 0,
      buffer: req.file.buffer
    });

    res.json({ status: "OK", ...result });
  } catch (err: any) {
    if (err.code === "QUOTA_EXCEEDED") {
      return res.status(413).json({
        error: err.message,
        code: "QUOTA_EXCEEDED",
        details: err.details
      });
    }
    res.status(500).json({ error: err.message || "Error al guardar el proyecto en la nube." });
  }
});

// Descargar proyecto de la nube para abrirlo o exportarlo
app.get("/api/user/projects/:id/download", requireAuth, async (req, res) => {
  try {
    const user = (req as any).currentUser;
    const { id } = req.params;
    const storageService = getStorageService();
    const { filePath, project } = await storageService.getProjectFilePath(user.id, id);

    const safeFilename = encodeURIComponent(project.name.replace(/[^a-zA-Z0-9_\-\.]/g, "_")) + ".cdc2";
    res.setHeader("Content-Disposition", `attachment; filename="${safeFilename}"`);
    res.setHeader("Content-Type", "application/octet-stream");
    res.sendFile(filePath);
  } catch (err: any) {
    if (err.code === "NOT_FOUND" || err.code === "FILE_MISSING") {
      return res.status(404).json({ error: err.message });
    }
    res.status(500).json({ error: err.message });
  }
});

// Eliminar proyecto de la nube
app.delete("/api/user/projects/:id", requireAuth, async (req, res) => {
  try {
    const user = (req as any).currentUser;
    const { id } = req.params;
    const storageService = getStorageService();
    const result = await storageService.deleteProject(user.id, user.storageQuotaMb || 100, id);
    res.json({ status: "OK", ...result });
  } catch (err: any) {
    if (err.code === "NOT_FOUND") {
      return res.status(404).json({ error: err.message });
    }
    res.status(500).json({ error: err.message });
  }
});

// --- Endpoints de Plantillas de Proyecto en la Nube (SRS-068) ---

// Listar plantillas del usuario en la nube
app.get("/api/user/templates", requireAuth, async (req, res) => {
  try {
    const user = (req as any).currentUser;
    const storageService = getStorageService();
    const templates = storageService.listTemplates(user.id);
    res.json({ templates });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Guardar o actualizar plantilla en la nube
app.post("/api/user/templates", requireAuth, projectUpload.single("file"), async (req, res) => {
  try {
    const user = (req as any).currentUser;
    if (!req.file) {
      return res.status(400).json({ error: "No se ha recibido ningún archivo de plantilla (.cdc2)." });
    }

    const { name, description, documentCount, templateCount, id } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ error: "El nombre de la plantilla es obligatorio." });
    }

    const storageService = getStorageService();
    const freshUser = await authService.getRepository().findById(user.id);
    const quota = freshUser?.storageQuotaMb ?? user.storageQuotaMb ?? 100;
    const result = await storageService.saveTemplate(user.id, quota, {
      id: id || undefined,
      name: name.trim(),
      description: description || "",
      documentCount: documentCount ? parseInt(documentCount, 10) : 0,
      templateCount: templateCount ? parseInt(templateCount, 10) : 0,
      buffer: req.file.buffer
    });

    res.json({ status: "OK", ...result });
  } catch (err: any) {
    if (err.code === "QUOTA_EXCEEDED") {
      return res.status(413).json({
        error: err.message,
        code: "QUOTA_EXCEEDED",
        details: err.details
      });
    }
    res.status(500).json({ error: err.message || "Error al guardar la plantilla en la nube." });
  }
});

// Descargar plantilla de la nube para usarla o exportarla
app.get("/api/user/templates/:id/download", requireAuth, async (req, res) => {
  try {
    const user = (req as any).currentUser;
    const { id } = req.params;
    const storageService = getStorageService();
    const { filePath, template } = await storageService.getTemplateFilePath(user.id, id);

    const safeFilename = encodeURIComponent(template.name.replace(/[^a-zA-Z0-9_\-\.]/g, "_")) + ".cdc2";
    res.setHeader("Content-Disposition", `attachment; filename="${safeFilename}"`);
    res.setHeader("Content-Type", "application/octet-stream");
    res.sendFile(filePath);
  } catch (err: any) {
    if (err.code === "NOT_FOUND" || err.code === "FILE_MISSING") {
      return res.status(404).json({ error: err.message });
    }
    res.status(500).json({ error: err.message });
  }
});

// Eliminar plantilla de la nube
app.delete("/api/user/templates/:id", requireAuth, async (req, res) => {
  try {
    const user = (req as any).currentUser;
    const { id } = req.params;
    const storageService = getStorageService();
    const result = await storageService.deleteTemplate(user.id, user.storageQuotaMb || 100, id);
    res.json({ status: "OK", ...result });
  } catch (err: any) {
    if (err.code === "NOT_FOUND") {
      return res.status(404).json({ error: err.message });
    }
    res.status(500).json({ error: err.message });
  }
});



// Cargar configuración de servidor (config.json) (SRS-060)
const CONFIG_PATH = path.join(__dirname, "../config.json");
const CONFIG_SAMPLE_PATH = path.join(__dirname, "../config.sample.json");

function loadServerConfig(): { googleAnalyticsId?: string } {
  try {
    if (fs.existsSync(CONFIG_PATH)) {
      return fs.readJsonSync(CONFIG_PATH);
    }
    if (fs.existsSync(CONFIG_SAMPLE_PATH)) {
      return fs.readJsonSync(CONFIG_SAMPLE_PATH);
    }
  } catch (err) {
    console.warn("[cdc2] Error al leer la configuración del servidor:", err);
  }
  return {
    googleAnalyticsId: process.env.GOOGLE_ANALYTICS_ID || ""
  };
}

// Endpoint de Configuración Pública (SRS-060)
app.get("/api/config", (_req, res) => {
  const config = loadServerConfig();
  res.json({
    googleAnalyticsId: config.googleAnalyticsId || process.env.GOOGLE_ANALYTICS_ID || ""
  });
});

// Directorio para cargas temporales
const UPLOADS_DIR = path.join(__dirname, "../temp/uploads");
const EXPORTS_DIR = path.join(__dirname, "../temp/exports");
const SYMBOLS_DIR = path.join(__dirname, "../temp/symbols");

fs.ensureDirSync(UPLOADS_DIR);
fs.ensureDirSync(EXPORTS_DIR);
fs.ensureDirSync(SYMBOLS_DIR);

const upload = multer({ dest: UPLOADS_DIR });

interface Simbolo {
  id: string;
  tag: string;
  filename: string;
  src?: string;
}

let registeredSymbols: Simbolo[] = [];

function parsearTextoConSimbolos(text: string, projectSymbols: any[], tempDir?: string): string {
  if (!text) return "";
  return text.replace(/\{([^}]+)\}/g, (match, tag) => {
    const sym = projectSymbols?.find(s => s.tag === tag);
    if (sym && sym.src) {
      let resolvedSrc = sym.src;
      if (resolvedSrc.startsWith("symbol_asset://")) {
        const filename = resolvedSrc.replace("symbol_asset://", "");
        if (tempDir) {
          const absPath = path.join(tempDir, "symbols", filename);
          resolvedSrc = `file:///${absPath.replace(/\\/g, "/")}`;
        } else {
          resolvedSrc = `/api/symbols/raw/${filename}`;
        }
      }
      return `<img src="${resolvedSrc}" class="symbol-inline-icon" alt="${tag}" style="height: 1em; width: auto; vertical-align: middle; display: inline-block;" />`;
    }
    return match;
  });
}

function renderizarTextoCapa(capa: any, valoresCampos?: Record<string, string>, capasDePlantilla?: any[]): string {
  let texto = capa.contenidoRaw || "";
  if (valoresCampos && valoresCampos[capa.id] !== undefined) {
    texto = valoresCampos[capa.id];
  }
  if (valoresCampos) {
    texto = texto.replace(/\{\{([^}]+)\}\}/g, (match: string, clave: string) => {
      const trimmedClave = clave.trim();
      if (capasDePlantilla) {
        const targetCapa = capasDePlantilla.find(c => c.nombre === trimmedClave);
        if (targetCapa && valoresCampos[targetCapa.id] !== undefined) {
          return valoresCampos[targetCapa.id];
        }
      }
      return match;
    });
  }
  return texto;
}

function parseMarkdownToHtml(text: string): string {
  if (!text) return "";
  let escaped = text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
  escaped = escaped.replace(/\n/g, "<br />");
  escaped = escaped.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  escaped = escaped.replace(/\*([^*]+)\*/g, "<em>$1</em>");
  escaped = escaped.replace(/__([^_]+)__/g, "<u>$1</u>");

  // Procesar escalado de texto con ++ (SRS-058)
  while (/(\+{2,})([^+]+)\1/.test(escaped)) {
    escaped = escaped.replace(/(\+{2,})([^+]+)\1/g, (_match, pluses, content) => {
      const count = pluses.length;
      const factor = Math.pow(1.25, count - 1);
      const percentStr = (factor * 100).toFixed(2).replace(/\.00$/, "");
      return `<span style="font-size: ${percentStr}%;">${content}</span>`;
    });
  }

  return escaped;
}

// Función para mapear la distribución y generar HTML
function generarHtmlImpresion(
  canvasConfig: CanvasConfig,
  cardConfig: any,
  paginasFrontales: any[],
  paginasTraseras: any[],
  tempDir: string,
  proyecto: ProyectoCDC2
): string {
  const activeDoc = proyecto.documentos?.find((d: any) => d.id === proyecto.activeDocumentoId) || proyecto.documentos?.[0] || (proyecto as any);
  // Recopilar todas las tipografías para inyectarlas como data URIs base64
  const tipografiasMap = new Map<string, { nombre: string; type: string; data: string }>();

  if (proyecto.customFonts) {
    for (const font of proyecto.customFonts) {
      if (font.nombre && font.data) {
        tipografiasMap.set(font.nombre, { nombre: font.nombre, type: font.type, data: font.data });
      }
    }
  }

  if (proyecto.templates) {
    for (const template of Object.values(proyecto.templates)) {
      if (template && (template as any).customFonts) {
        for (const font of (template as any).customFonts) {
          if (font.nombre && font.data) {
            tipografiasMap.set(font.nombre, { nombre: font.nombre, type: font.type, data: font.data });
          }
        }
      }
    }
  }

  if (proyecto.documentos) {
    for (const doc of proyecto.documentos) {
      if (doc.cards) {
        for (const card of doc.cards) {
          if (card.plantilla && card.plantilla.customFonts) {
            for (const font of card.plantilla.customFonts) {
              if (font.nombre && font.data) {
                tipografiasMap.set(font.nombre, { nombre: font.nombre, type: font.type, data: font.data });
              }
            }
          }
          if (card.plantillaTrasera && card.plantillaTrasera.customFonts) {
            for (const font of card.plantillaTrasera.customFonts) {
              if (font.nombre && font.data) {
                tipografiasMap.set(font.nombre, { nombre: font.nombre, type: font.type, data: font.data });
              }
            }
          }
        }
      }
    }
  } else if ((proyecto as any).cards) {
    for (const card of (proyecto as any).cards) {
      if (card.plantilla && card.plantilla.customFonts) {
        for (const font of card.plantilla.customFonts) {
          if (font.nombre && font.data) {
            tipografiasMap.set(font.nombre, { nombre: font.nombre, type: font.type, data: font.data });
          }
        }
      }
      if (card.plantillaTrasera && card.plantillaTrasera.customFonts) {
        for (const font of card.plantillaTrasera.customFonts) {
          if (font.nombre && font.data) {
            tipografiasMap.set(font.nombre, { nombre: font.nombre, type: font.type, data: font.data });
          }
        }
      }
    }
  }

  const fontRules = Array.from(tipografiasMap.values()).map((font) => `
    @font-face {
      font-family: '${font.nombre}';
      src: url('data:${font.type};base64,${font.data}');
    }
  `).join("\n");

  const wMm = canvasConfig.anchoMm;
  const hMm = canvasConfig.altoMm;
  
  // Constante de conversión a píxeles virtuales (basado en 96 DPI estándar)
  const MM_TO_PX = 3.779527559;
  const wPx = wMm * MM_TO_PX;
  const hPx = hMm * MM_TO_PX;

  const resolverAssetPath = (src: string | null) => {
    if (!src) return "";
    if (src.startsWith("symbol_asset://")) {
      const filename = src.replace("symbol_asset://", "");
      const absPath = path.join(tempDir, "symbols", filename);
      return `file:///${absPath.replace(/\\/g, "/")}`;
    }
    if (src.startsWith("user_asset://")) {
      const filename = src.replace("user_asset://", "");
      const absPath = path.join(tempDir, "user_assets", filename);
      return `file:///${absPath.replace(/\\/g, "/")}`;
    }
    if (src.startsWith("project_asset://")) {
      const filename = src.replace("project_asset://", "");
      const absPath = path.join(tempDir, "project_assets", filename);
      return `file:///${absPath.replace(/\\/g, "/")}`;
    }
    if (src.startsWith("asset://")) {
      const filename = src.replace("asset://", "");
      const absPath = path.join(tempDir, "assets", filename);
      return `file:///${absPath.replace(/\\/g, "/")}`;
    }
    return src;
  };

  const paginasHtml: string[] = [];

  const renderSlots = (slots: any[], esTrasera: boolean) => {
    return slots.map((slot: any) => {
      const width = slot.anchoMm;
      const height = slot.altoMm;
      const x = slot.xMm;
      const y = slot.yMm;
      const sangrado = slot.sangradoMm;
      const borderMm = slot.bordeCorteMm;
      const borderColor = slot.bordeCorteColor || "#000000";

      const noOverlap = borderMm > 0;
      const scaleX = noOverlap ? (width - 2 * borderMm) / width : 1;
      const scaleY = noOverlap ? (height - 2 * borderMm) / height : 1;

      // Para plantillas
      const templateLeft = noOverlap ? borderMm : 0;
      const templateTop = noOverlap ? borderMm : 0;
      const templateWidth = width;
      const templateHeight = height;

      // Para imágenes normales
      const imgLeft = noOverlap ? borderMm : 0;
      const imgTop = noOverlap ? borderMm : 0;
      const imgWidth = width - 2 * borderMm;
      const imgHeight = height - 2 * borderMm;

      let marksHtml = "";
      if (canvasConfig.marcasCorteEsquinas) {
        marksHtml = `
          <div class="corner-cut-mark top-left" style="left: 0; top: 0;"></div>
          <div class="corner-cut-mark top-right" style="right: 0; top: 0;"></div>
          <div class="corner-cut-mark bottom-left" style="left: 0; bottom: 0;"></div>
          <div class="corner-cut-mark bottom-right" style="right: 0; bottom: 0;"></div>
        `;
      }

      let borderHtml = "";
      if (borderMm > 0) {
        borderHtml = `
          <div class="card-border-cut" style="border-width: ${borderMm * MM_TO_PX}px; border-color: ${borderColor}; border-style: solid;"></div>
        `;
      }

      // Buscar si es una carta de plantilla
      const cardData = (activeDoc.cards || []).find((c: Carta) => c.id === slot.cartaId);
      if (cardData) {
        let plantilla = esTrasera ? cardData.plantillaTrasera : cardData.plantilla;
        if (!plantilla) {
          const plantillaId = esTrasera ? cardData.plantillaTraseraId : cardData.plantillaId;
          if (plantillaId && proyecto.templates && proyecto.templates[plantillaId]) {
            plantilla = proyecto.templates[plantillaId];
          }
        }

        if (plantilla) {
          const capas = plantilla.capas || [];
          const renderCapaRecursiva = (parentId: string | null): string => {
            const filteredLayers = capas.filter((c: any) => {
              if (parentId === null) {
                return !c.parentCapaId;
              }
              return c.parentCapaId === parentId;
            });

            return filteredLayers.map((capa: any) => {
              const overrides = esTrasera ? cardData.capasOverridesTrasera?.[capa.id] : cardData.capasOverrides?.[capa.id];
              const resolvedCapa = overrides ? { ...capa, ...overrides } : capa;

              const parentCapa = capas.find((p: any) => p.id === resolvedCapa.parentCapaId);
              const isParentFlex = parentCapa && (parentCapa.layout === "vertical" || parentCapa.layout === "horizontal");

              const isFlexParent = isParentFlex;
              const positionCss = isFlexParent ? "position: relative;" : "position: absolute;";
              
              let leftPx = "";
              let topPx = "";
              const isParentVertical = parentCapa && parentCapa.layout === "vertical";
              const isParentHorizontal = parentCapa && parentCapa.layout === "horizontal";

              if (!isFlexParent) {
                const xMmVal = resolvedCapa.xMm;
                const yMmVal = resolvedCapa.yMm;
                leftPx = `left: ${xMmVal * MM_TO_PX}px;`;
                topPx = `top: ${yMmVal * MM_TO_PX}px;`;
              } else {
                if (isParentVertical) {
                  leftPx = `left: ${resolvedCapa.xMm * MM_TO_PX}px;`;
                }
                if (isParentHorizontal) {
                  topPx = `top: ${resolvedCapa.yMm * MM_TO_PX}px;`;
                }
              }

              const widthPx = resolvedCapa.anchoMm === "auto" ? "fit-content" : `${resolvedCapa.anchoMm * MM_TO_PX}px`;
              const heightPx = resolvedCapa.altoMm === "auto" ? "fit-content" : `${resolvedCapa.altoMm * MM_TO_PX}px`;

              const activeVisibility = resolvedCapa.visibility || "visible";
              let visStyle = "";
              if (activeVisibility === "hidden") {
                visStyle = "visibility: hidden;";
              } else if (activeVisibility === "collapsed") {
                visStyle = "display: none;";
              }

              const rotationStyle = resolvedCapa.rotacion ? `transform: rotate(${resolvedCapa.rotacion}deg); transform-origin: center center;` : "";
              const baseStyle = `${positionCss} ${leftPx} ${topPx} width: ${widthPx}; height: ${heightPx}; pointer-events: none; box-sizing: border-box; flex-shrink: 0; ${visStyle} ${rotationStyle}`;

              if (resolvedCapa.tipo === "background") {
                const colorFill = resolvedCapa.colorFill || "#ffffff";
                return `
                  <div style="position: absolute; left: 0; top: 0; width: 100%; height: 100%; background-color: ${colorFill};"></div>
                `;
              }

              if (capa.tipo === "block") {
                const overrides = esTrasera ? cardData.capasOverridesTrasera?.[capa.id] : cardData.capasOverrides?.[capa.id];
                const resolvedCapa = overrides ? { ...capa, ...overrides } : capa;

                // Bordes y Esquinas (SRS-024)
                const borderTopPx = (resolvedCapa.borderTopWidth || 0) * MM_TO_PX;
                const borderRightPx = (resolvedCapa.borderRightWidth || 0) * MM_TO_PX;
                const borderBottomPx = (resolvedCapa.borderBottomWidth || 0) * MM_TO_PX;
                const borderLeftPx = (resolvedCapa.borderLeftWidth || 0) * MM_TO_PX;

                const radiusTopLeftPx = (resolvedCapa.borderTopLeftRadius || 0) * MM_TO_PX;
                const radiusTopRightPx = (resolvedCapa.borderTopRightRadius || 0) * MM_TO_PX;
                const radiusBottomRightPx = (resolvedCapa.borderBottomRightRadius || 0) * MM_TO_PX;
                const radiusBottomLeftPx = (resolvedCapa.borderBottomLeftRadius || 0) * MM_TO_PX;

                const borderTopStyle = borderTopPx > 0 ? `border-top: ${borderTopPx}px solid ${resolvedCapa.borderTopColor || "#000000"};` : "border-top: none;";
                const borderRightStyle = borderRightPx > 0 ? `border-right: ${borderRightPx}px solid ${resolvedCapa.borderRightColor || "#000000"};` : "border-right: none;";
                const borderBottomStyle = borderBottomPx > 0 ? `border-bottom: ${borderBottomPx}px solid ${resolvedCapa.borderBottomColor || "#000000"};` : "border-bottom: none;";
                const borderLeftStyle = borderLeftPx > 0 ? `border-left: ${borderLeftPx}px solid ${resolvedCapa.borderLeftColor || "#000000"};` : "border-left: none;";

                const borderRadiusStyle = `border-top-left-radius: ${radiusTopLeftPx}px; border-top-right-radius: ${radiusTopRightPx}px; border-bottom-right-radius: ${radiusBottomRightPx}px; border-bottom-left-radius: ${radiusBottomLeftPx}px;`;
                const borderCornersCss = `${borderTopStyle} ${borderRightStyle} ${borderBottomStyle} ${borderLeftStyle} ${borderRadiusStyle}`;

                return `
                  <div style="${baseStyle} background-color: ${resolvedCapa.backgroundColor || 'transparent'}; overflow: hidden; ${borderCornersCss}"></div>
                `;
              }

              if (capa.tipo === "container") {
                const overrides = esTrasera ? cardData.capasOverridesTrasera?.[capa.id] : cardData.capasOverrides?.[capa.id];
                const resolvedCapa = overrides ? { ...capa, ...overrides } : capa;

                // Bordes y Esquinas (SRS-024)
                const borderTopPx = (resolvedCapa.borderTopWidth || 0) * MM_TO_PX;
                const borderRightPx = (resolvedCapa.borderRightWidth || 0) * MM_TO_PX;
                const borderBottomPx = (resolvedCapa.borderBottomWidth || 0) * MM_TO_PX;
                const borderLeftPx = (resolvedCapa.borderLeftWidth || 0) * MM_TO_PX;

                const radiusTopLeftPx = (resolvedCapa.borderTopLeftRadius || 0) * MM_TO_PX;
                const radiusTopRightPx = (resolvedCapa.borderTopRightRadius || 0) * MM_TO_PX;
                const radiusBottomRightPx = (resolvedCapa.borderBottomRightRadius || 0) * MM_TO_PX;
                const radiusBottomLeftPx = (resolvedCapa.borderBottomLeftRadius || 0) * MM_TO_PX;

                const borderTopStyle = borderTopPx > 0 ? `border-top: ${borderTopPx}px solid ${resolvedCapa.borderTopColor || "#000000"};` : "border-top: none;";
                const borderRightStyle = borderRightPx > 0 ? `border-right: ${borderRightPx}px solid ${resolvedCapa.borderRightColor || "#000000"};` : "border-right: none;";
                const borderBottomStyle = borderBottomPx > 0 ? `border-bottom: ${borderBottomPx}px solid ${resolvedCapa.borderBottomColor || "#000000"};` : "border-bottom: none;";
                const borderLeftStyle = borderLeftPx > 0 ? `border-left: ${borderLeftPx}px solid ${resolvedCapa.borderLeftColor || "#000000"};` : "border-left: none;";

                const borderRadiusStyle = `border-top-left-radius: ${radiusTopLeftPx}px; border-top-right-radius: ${radiusTopRightPx}px; border-bottom-right-radius: ${radiusBottomRightPx}px; border-bottom-left-radius: ${radiusBottomLeftPx}px;`;
                const borderCornersCss = `${borderTopStyle} ${borderRightStyle} ${borderBottomStyle} ${borderLeftStyle} ${borderRadiusStyle}`;

                const isFlex = resolvedCapa.layout === "vertical" || resolvedCapa.layout === "horizontal";
                const flexStyle = isFlex ? `display: flex; flex-direction: ${resolvedCapa.layout === "vertical" ? "column" : "row"};` : "";

                const innerContentHtml = renderCapaRecursiva(capa.id);

                const displayStyle = activeVisibility === "collapsed" ? "display: none;" : (isFlex ? "display: flex;" : "");
                return `
                  <div style="${baseStyle} background-color: ${resolvedCapa.backgroundColor || 'transparent'}; overflow: hidden; ${borderCornersCss} ${flexStyle} ${displayStyle}">
                    ${innerContentHtml}
                  </div>
                `;
              }

              if (capa.tipo === "text") {
                const valores = esTrasera ? cardData.valoresCamposTrasera : cardData.valoresCampos;
                const overrides = esTrasera ? cardData.capasOverridesTrasera?.[capa.id] : cardData.capasOverrides?.[capa.id];
                const resolvedCapa = overrides ? { ...capa, ...overrides } : capa;
                const textoInterp = renderizarTextoCapa(resolvedCapa, valores, plantilla?.capas);
                const htmlTextWithMarkdown = parseMarkdownToHtml(textoInterp);
                const htmlText = parsearTextoConSimbolos(htmlTextWithMarkdown, proyecto.projectSymbols || [], tempDir);
                const fontSizePt = resolvedCapa.fontSizePt || 12;
                const align = resolvedCapa.alineacion === "center" ? "center" : resolvedCapa.alineacion === "right" ? "right" : resolvedCapa.alineacion === "justify" ? "justify" : "left";
                const weight = resolvedCapa.bold ? "bold" : "normal";
                const styleOpt = resolvedCapa.italic ? "italic" : "normal";
                const decoration = resolvedCapa.underline ? "underline" : "none";
                
                const fontSizePx = fontSizePt * 0.352778 * MM_TO_PX;

                // Bordes y Esquinas (SRS-024)
                const borderTopPx = (resolvedCapa.borderTopWidth || 0) * MM_TO_PX;
                const borderRightPx = (resolvedCapa.borderRightWidth || 0) * MM_TO_PX;
                const borderBottomPx = (resolvedCapa.borderBottomWidth || 0) * MM_TO_PX;
                const borderLeftPx = (resolvedCapa.borderLeftWidth || 0) * MM_TO_PX;

                const radiusTopLeftPx = (resolvedCapa.borderTopLeftRadius || 0) * MM_TO_PX;
                const radiusTopRightPx = (resolvedCapa.borderTopRightRadius || 0) * MM_TO_PX;
                const radiusBottomRightPx = (resolvedCapa.borderBottomRightRadius || 0) * MM_TO_PX;
                const radiusBottomLeftPx = (resolvedCapa.borderBottomLeftRadius || 0) * MM_TO_PX;

                const borderTopStyle = borderTopPx > 0 ? `border-top: ${borderTopPx}px solid ${resolvedCapa.borderTopColor || "#000000"};` : "border-top: none;";
                const borderRightStyle = borderRightPx > 0 ? `border-right: ${borderRightPx}px solid ${resolvedCapa.borderRightColor || "#000000"};` : "border-right: none;";
                const borderBottomStyle = borderBottomPx > 0 ? `border-bottom: ${borderBottomPx}px solid ${resolvedCapa.borderBottomColor || "#000000"};` : "border-bottom: none;";
                const borderLeftStyle = borderLeftPx > 0 ? `border-left: ${borderLeftPx}px solid ${resolvedCapa.borderLeftColor || "#000000"};` : "border-left: none;";

                const borderRadiusStyle = `border-top-left-radius: ${radiusTopLeftPx}px; border-top-right-radius: ${radiusTopRightPx}px; border-bottom-right-radius: ${radiusBottomRightPx}px; border-bottom-left-radius: ${radiusBottomLeftPx}px;`;
                const borderCornersCss = `${borderTopStyle} ${borderRightStyle} ${borderBottomStyle} ${borderLeftStyle} ${borderRadiusStyle}`;

                const paddingTopMm = resolvedCapa.paddingTopMm !== undefined ? resolvedCapa.paddingTopMm : 0;
                const paddingRightMm = resolvedCapa.paddingRightMm !== undefined ? resolvedCapa.paddingRightMm : 0;
                const paddingBottomMm = resolvedCapa.paddingBottomMm !== undefined ? resolvedCapa.paddingBottomMm : 0;
                const paddingLeftMm = resolvedCapa.paddingLeftMm !== undefined ? resolvedCapa.paddingLeftMm : 0;

                const paddingCss = (paddingTopMm > 0 || paddingRightMm > 0 || paddingBottomMm > 0 || paddingLeftMm > 0)
                  ? `padding: ${paddingTopMm}mm ${paddingRightMm}mm ${paddingBottomMm}mm ${paddingLeftMm}mm;`
                  : "padding: 2px;";

                const textOutlinePx = (resolvedCapa.textOutlineWidth || 0) * MM_TO_PX;
                const textOutlineCss = textOutlinePx > 0
                  ? `-webkit-text-stroke-width: ${textOutlinePx}px; -webkit-text-stroke-color: ${resolvedCapa.textOutlineColor || '#000000'}; paint-order: stroke fill;`
                  : '';

                return `<div style="${baseStyle} font-family: ${resolvedCapa.fontFamily === 'sans-serif' || !resolvedCapa.fontFamily ? "'Inter', 'Segoe UI', sans-serif" : resolvedCapa.fontFamily}; font-size: ${fontSizePx}px; color: ${resolvedCapa.color || '#000000'}; background-color: ${resolvedCapa.backgroundColor || 'transparent'}; text-align: ${align}; font-weight: ${weight}; font-style: ${styleOpt}; text-decoration: ${decoration}; white-space: pre-wrap; word-break: break-word; line-height: 1.2; ${paddingCss} ${borderCornersCss} ${textOutlineCss}">${htmlText}</div>`;
              }

              if (capa.tipo === "image" || capa.tipo === "image-switch") {
                const overrides = esTrasera ? cardData.capasOverridesTrasera?.[capa.id] : cardData.capasOverrides?.[capa.id];
                const resolvedCapa = overrides ? { ...capa, ...overrides } : capa;
                const rawSrc = resolvedCapa.src;
                const imgPath = resolverAssetPath(rawSrc);

                // Bordes y Esquinas (SRS-024)
                const borderTopPx = (resolvedCapa.borderTopWidth || 0) * MM_TO_PX;
                const borderRightPx = (resolvedCapa.borderRightWidth || 0) * MM_TO_PX;
                const borderBottomPx = (resolvedCapa.borderBottomWidth || 0) * MM_TO_PX;
                const borderLeftPx = (resolvedCapa.borderLeftWidth || 0) * MM_TO_PX;

                const radiusTopLeftPx = (resolvedCapa.borderTopLeftRadius || 0) * MM_TO_PX;
                const radiusTopRightPx = (resolvedCapa.borderTopRightRadius || 0) * MM_TO_PX;
                const radiusBottomRightPx = (resolvedCapa.borderBottomRightRadius || 0) * MM_TO_PX;
                const radiusBottomLeftPx = (resolvedCapa.borderBottomLeftRadius || 0) * MM_TO_PX;

                const borderTopStyle = borderTopPx > 0 ? `border-top: ${borderTopPx}px solid ${resolvedCapa.borderTopColor || "#000000"};` : "border-top: none;";
                const borderRightStyle = borderRightPx > 0 ? `border-right: ${borderRightPx}px solid ${resolvedCapa.borderRightColor || "#000000"};` : "border-right: none;";
                const borderBottomStyle = borderBottomPx > 0 ? `border-bottom: ${borderBottomPx}px solid ${resolvedCapa.borderBottomColor || "#000000"};` : "border-bottom: none;";
                const borderLeftStyle = borderLeftPx > 0 ? `border-left: ${borderLeftPx}px solid ${resolvedCapa.borderLeftColor || "#000000"};` : "border-left: none;";

                const borderRadiusStyle = `border-top-left-radius: ${radiusTopLeftPx}px; border-top-right-radius: ${radiusTopRightPx}px; border-bottom-right-radius: ${radiusBottomRightPx}px; border-bottom-left-radius: ${radiusBottomLeftPx}px;`;
                const borderCornersCss = `${borderTopStyle} ${borderRightStyle} ${borderBottomStyle} ${borderLeftStyle} ${borderRadiusStyle}`;

                if (imgPath) {
                  const objectFit = resolvedCapa.modoAjuste === "stretch" ? "fill" : (resolvedCapa.modoAjuste || "cover");
                  return `
                    <div style="${baseStyle} background-color: ${resolvedCapa.backgroundColor || 'transparent'}; ${borderCornersCss}">
                      <img src="${imgPath}" style="width: 100%; height: 100%; object-fit: ${objectFit}; display: block; border-radius: inherit;" />
                    </div>
                  `;
                } else {
                  const emojiSize = Math.min(resolvedCapa.anchoMm, resolvedCapa.altoMm) * 0.4 * MM_TO_PX;
                  return `
                    <div style="${baseStyle} background-color: #e2e8f0; border: 1px dashed #cbd5e1; display: flex; align-items: center; justify-content: center; ${borderCornersCss}">
                      <span style="font-size: ${emojiSize}px; line-height: 1; font-family: sans-serif;">🖼️</span>
                    </div>
                  `;
                }
              }

              return "";
            }).join("\n");
          };
          const layersHtml = renderCapaRecursiva(null);

        return `
          <div class="card-slot" style="left: ${x * MM_TO_PX}px; top: ${y * MM_TO_PX}px; width: ${width * MM_TO_PX}px; height: ${height * MM_TO_PX}px;">
            <div class="card-template-render-wrapper" style="position: absolute; left: ${templateLeft * MM_TO_PX}px; top: ${templateTop * MM_TO_PX}px; width: ${templateWidth * MM_TO_PX}px; height: ${templateHeight * MM_TO_PX}px; overflow: hidden; background-color: #ffffff; ${noOverlap ? `transform: scale(${scaleX}, ${scaleY}); transform-origin: top left;` : ""}">
              ${layersHtml}
            </div>
            ${borderHtml}
            ${marksHtml}
          </div>
        `;
        }
      }

      // Si no es plantilla, renderizar imagen normal
      const imgPath = resolverAssetPath(slot.imagenSrc);
      const fitMode = cardConfig.modoAjuste || "cover";
      const objectFit = fitMode === "cover" ? "cover" : "contain";
      const imgHtml = imgPath ? `<img src="${imgPath}" style="width: 100%; height: 100%; object-fit: ${objectFit}; display: block;" />` : "";

      return `
        <div class="card-slot" style="left: ${x * MM_TO_PX}px; top: ${y * MM_TO_PX}px; width: ${width * MM_TO_PX}px; height: ${height * MM_TO_PX}px;">
          <div class="card-image-render" style="left: ${imgLeft * MM_TO_PX}px; top: ${imgTop * MM_TO_PX}px; width: ${imgWidth * MM_TO_PX}px; height: ${imgHeight * MM_TO_PX}px; overflow: hidden;">
            ${imgHtml}
          </div>
          ${borderHtml}
          ${marksHtml}
        </div>
      `;
    }).join("\n");
  };

  const renderContinuousCutLines = () => {
    if (!canvasConfig.lineasCorteContinuas || paginasFrontales.length === 0) return "";
    
    const horizLines = new Set<number>();
    const vertLines = new Set<number>();
    const slots = paginasFrontales[0].slots; // coordinadas idénticas en todas las hojas
    
    for (const slot of slots) {
      horizLines.add(slot.yMm);
      horizLines.add(slot.yMm + slot.altoMm);
      vertLines.add(slot.xMm);
      vertLines.add(slot.xMm + slot.anchoMm);
    }

    const linesHtml: string[] = [];
    for (const y of horizLines) {
      linesHtml.push(`<div class="page-cut-line horizontal" style="top: ${y * MM_TO_PX}px;"></div>`);
    }
    for (const x of vertLines) {
      linesHtml.push(`<div class="page-cut-line vertical" style="left: ${x * MM_TO_PX}px;"></div>`);
    }
    return linesHtml.join("\n");
  };

  const cutLinesHtml = renderContinuousCutLines();

  for (let i = 0; i < paginasFrontales.length; i++) {
    // Página frontal
    paginasHtml.push(`
      <div class="page">
        ${renderSlots(paginasFrontales[i].slots, false)}
        ${cutLinesHtml}
      </div>
    `);

    // Página trasera correspondiente
    if (paginasTraseras[i]) {
      paginasHtml.push(`
        <div class="page">
          ${renderSlots(paginasTraseras[i].slots, true)}
          ${cutLinesHtml}
        </div>
      `);
    }
  }

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <link rel="preconnect" href="https://fonts.googleapis.com">
      <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Outfit:wght@400;500;600;700;800&display=swap" rel="stylesheet">
      <style>
        ${fontRules}
        @page {
          size: ${wMm}mm ${hMm}mm;
          margin: 0;
        }
        * {
          box-sizing: border-box;
        }
        html, body {
          margin: 0;
          padding: 0;
          background-color: #ffffff;
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
          -webkit-text-size-adjust: 100%;
          text-size-adjust: 100%;
        }
        .page {
          width: ${wPx}px;
          height: ${hPx}px;
          position: relative;
          page-break-after: always;
          overflow: hidden;
          background-color: #ffffff;
        }
        .page:last-child {
          page-break-after: avoid;
        }
        .card-slot {
          position: absolute;
          overflow: hidden;
        }
        .card-image-render {
          position: absolute;
          background-size: cover;
          background-position: center;
          background-repeat: no-repeat;
        }
        .card-border-cut {
          position: absolute;
          left: 0;
          top: 0;
          right: 0;
          bottom: 0;
          pointer-events: none;
        }
        .corner-cut-mark {
          position: absolute;
          width: ${10 * MM_TO_PX}px;
          height: ${10 * MM_TO_PX}px;
          border-color: #000000;
          border-style: solid;
          pointer-events: none;
          z-index: 4;
        }
        .corner-cut-mark.top-left {
          border-width: ${0.1 * MM_TO_PX}px 0 0 ${0.1 * MM_TO_PX}px;
        }
        .corner-cut-mark.top-right {
          border-width: ${0.1 * MM_TO_PX}px ${0.1 * MM_TO_PX}px 0 0;
        }
        .corner-cut-mark.bottom-left {
          border-width: 0 0 ${0.1 * MM_TO_PX}px ${0.1 * MM_TO_PX}px;
        }
        .corner-cut-mark.bottom-right {
          border-width: 0 ${0.1 * MM_TO_PX}px ${0.1 * MM_TO_PX}px 0;
        }
        .page-cut-line {
          position: absolute;
          pointer-events: none;
          z-index: 5;
        }
        .page-cut-line.horizontal {
          left: 0;
          right: 0;
          height: ${0.1 * MM_TO_PX}px;
          border-top: ${0.1 * MM_TO_PX}px dashed rgba(0, 0, 0, 0.4);
        }
        .page-cut-line.vertical {
          top: 0;
          bottom: 0;
          width: ${0.1 * MM_TO_PX}px;
          border-left: ${0.1 * MM_TO_PX}px dashed rgba(0, 0, 0, 0.4);
        }
      </style>
    </head>
    <body>
      ${paginasHtml.join("\n")}
    </body>
    </html>
  `;
}

// --- RUTAS DE LA GALERÍA DE SÍMBOLOS (SRS-011) ---

// Servir símbolos en crudo
app.get("/api/symbols/raw/:filename", async (req, res) => {
  const filepath = path.join(SYMBOLS_DIR, req.params.filename);
  if (await fs.pathExists(filepath)) {
    return res.sendFile(filepath);
  }
  return res.status(404).json({ error: "Símbolo no encontrado." });
});

// Listar todos los símbolos registrados
app.get(["/api/symbols", "/api/projects/:projectId/symbols"], (req, res) => {
  return res.json(registeredSymbols);
});

// Subir nuevo símbolo
app.post(["/api/symbols", "/api/projects/:projectId/symbols"], upload.single("image"), async (req, res) => {
  try {
    const file = req.file;
    const tag = req.body.tag;

    if (!file) {
      return res.status(400).json({ error: "No se recibió ninguna imagen." });
    }
    if (!tag) {
      return res.status(400).json({ error: "No se recibió ningún tag." });
    }

    const id = `symbol_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const extension = path.extname(file.originalname) || ".png";
    const filename = `${id}${extension}`;
    const destPath = path.join(SYMBOLS_DIR, filename);

    // Mover archivo temporal al directorio final de símbolos
    await fs.move(file.path, destPath, { overwrite: true });

    const newSymbol: Simbolo = {
      id,
      tag: tag.trim().replace(/\s+/g, ""),
      filename,
      src: `/api/symbols/raw/${filename}`
    };

    registeredSymbols.push(newSymbol);
    return res.status(201).json(newSymbol);
  } catch (err: any) {
    console.error("Error al subir símbolo:", err);
    return res.status(500).json({ error: "Error interno al guardar símbolo." });
  }
});

// Modificar tag de un símbolo
app.put(["/api/symbols/:id", "/api/projects/:projectId/symbols/:symbolId"], (req, res) => {
  const id = req.params.id || req.params.symbolId;
  const newTag = req.body.tag;

  if (!newTag) {
    return res.status(400).json({ error: "El tag no puede estar vacío." });
  }

  const cleanTag = newTag.trim().replace(/\s+/g, "");
  const sym = registeredSymbols.find(s => s.id === id);
  if (!sym) {
    return res.status(404).json({ error: "Símbolo no encontrado." });
  }

  sym.tag = cleanTag;
  return res.json(sym);
});

// Eliminar un símbolo
app.delete(["/api/symbols/:id", "/api/projects/:projectId/symbols/:symbolId"], async (req, res) => {
  const id = req.params.id || req.params.symbolId;
  const symIdx = registeredSymbols.findIndex(s => s.id === id);
  if (symIdx === -1) {
    return res.status(404).json({ error: "Símbolo no encontrado." });
  }

  const sym = registeredSymbols[symIdx];
  const filepath = path.join(SYMBOLS_DIR, sym.filename);

  try {
    if (await fs.pathExists(filepath)) {
      await fs.remove(filepath);
    }
  } catch (err) {
    console.error("Error eliminando archivo físico de símbolo:", err);
  }

  registeredSymbols.splice(symIdx, 1);
  return res.json({ success: true, id });
});

// Endpoint de exportación a PDF
app.post("/api/exportar/pdf", upload.single("archivoProyecto"), async (req, res) => {
  const sessionUuid = randomUUID();
  const tempDir = path.join(EXPORTS_DIR, sessionUuid);
  const zipPath = req.file?.path;

  if (!zipPath) {
    return res.status(400).json({ error: "Archivo de proyecto .cdc2 no recibido." });
  }

  try {
    // 1. Crear carpeta temporal para la extracción
    await fs.ensureDir(tempDir);

    // 2. Extraer el zip usando adm-zip
    const zip = new AdmZip(zipPath);
    zip.extractAllTo(tempDir, true);

    // 3. Cargar y parsear project.json
    const projectJsonPath = path.join(tempDir, "project.json");
    if (!(await fs.pathExists(projectJsonPath))) {
      throw new Error("El archivo .cdc2 no contiene un project.json válido.");
    }
    let proyecto: ProyectoCDC2 = await fs.readJson(projectJsonPath);

    // Asegurar compatibilidad convirtiendo a 2.1.0 si es necesario
    if (!proyecto.documentos || proyecto.documentos.length === 0) {
      const documentoId = "doc_default";
      const doc = {
        id: documentoId,
        nombre: "Documento 1",
        canvasConfig: (proyecto as any).canvasConfig || {
          tipo: "A4",
          anchoMm: 210,
          altoMm: 297,
          orientacion: "vertical",
          margenTopMm: 8,
          margenBottomMm: 8,
          margenLeftMm: 8,
          margenRightMm: 8,
          lineasCorteContinuas: true,
          marcasCorteEsquinas: true
        },
        cardConfig: (proyecto as any).cardConfig || {
          anchoMm: 63.5,
          altoMm: 88.9,
          espaciadoXMm: 0,
          espaciadoYMm: 0,
          sangradoMm: 0.5,
          bordeCorteMm: 0,
          bordeCorteColor: "#000000",
          modoAjuste: "cover",
          reducirArteAlBorde: false
        },
        modoTraseras: (proyecto as any).modoTraseras || "ninguno",
        imagenTraseraComun: (proyecto as any).imagenTraseraComun || null,
        cards: (proyecto as any).cards || []
      };

      proyecto = {
        version: "2.1.0",
        meta: proyecto.meta || {
          nombre: "Proyecto Migrado",
          fechaCreacion: new Date().toISOString(),
          fechaModificacion: new Date().toISOString()
        },
        documentos: [doc],
        activeDocumentoId: documentoId,
        templates: (proyecto as any).templates || {},
        assets: (proyecto as any).assets || [],
        customFonts: proyecto.customFonts || []
      };
    }

    // 4. Calcular distribución de slots del documento activo
    const documentos = proyecto.documentos || [];
    const activeDoc = documentos.find((d: any) => d.id === proyecto.activeDocumentoId) || documentos[0];
    const { paginasFrontales, paginasTraseras } = calcularDistribucion(
      activeDoc.canvasConfig,
      activeDoc.cardConfig,
      activeDoc.cards || [],
      activeDoc.modoTraseras,
      activeDoc.imagenTraseraComun
    );

    // 5. Generar el HTML de impresión y guardarlo como archivo físico temporal para que Chromium lo acceda de forma nativa sin restricciones de seguridad
    const html = generarHtmlImpresion(activeDoc.canvasConfig, activeDoc.cardConfig, paginasFrontales, paginasTraseras, tempDir, proyecto);
    const htmlPath = path.join(tempDir, "print.html");
    await fs.writeFile(htmlPath, html, "utf8");

    // Guardar una copia para depuración/verificación de alineación
    await fs.writeFile(path.join(EXPORTS_DIR, "last_generated_print.html"), html, "utf8");

    // 6. Levantar Puppeteer de manera headless y configurar acceso a file:///
    const browser = await puppeteer.launch({
      headless: true,
      executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined,
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--allow-file-access-from-files",
        "--enable-local-file-accesses",
        "--disable-web-security",
        "--force-device-scale-factor=1"
      ]
    });
    
    const page = await browser.newPage();
    
    // Registrar logs y errores de Puppeteer para depuración en terminal
    page.on("console", (msg) => {
      console.log(`[PUPPETEER CONSOLE] [${msg.type()}] ${msg.text()}`);
    });
    page.on("pageerror", (err: any) => {
      console.error(`[PUPPETEER PAGE ERROR] ${err.toString()}`);
    });
    page.on("requestfailed", (req) => {
      console.error(`[PUPPETEER REQUEST FAILED] ${req.url()} - ${req.failure()?.errorText || ""}`);
    });
    
    // Configurar viewport exacto para evitar reajustes de Chromium basados en viewport por defecto
    const MM_TO_PX = 3.779527559;
    await page.setViewport({
      width: Math.ceil(activeDoc.canvasConfig.anchoMm * MM_TO_PX),
      height: Math.ceil(activeDoc.canvasConfig.altoMm * MM_TO_PX),
      deviceScaleFactor: 1
    });

    const fileUrl = `file:///${htmlPath.replace(/\\/g, "/")}`;
    
    // Cargar el HTML local
    await page.goto(fileUrl, { waitUntil: "networkidle0" });

    // Esperar a que todas las imágenes en la página se carguen completamente (crucial para recursos locales file://)
    await page.evaluate(async () => {
      const images = Array.from(document.querySelectorAll("img"));
      await Promise.all(
        images.map((img) => {
          if (img.complete) return Promise.resolve();
          return new Promise((resolve) => {
            img.addEventListener("load", resolve);
            img.addEventListener("error", resolve);
          });
        })
      );
    });

    // Pequeño retardo de 500ms para garantizar el renderizado final
    await new Promise((resolve) => setTimeout(resolve, 500));

    // Guardar una captura de pantalla para depuración de alineación visual en el navegador headless
    await page.screenshot({
      path: path.join(EXPORTS_DIR, "last_generated_screenshot.png"),
      fullPage: true
    });

    // 7. Generar el PDF respetando milimétricamente el canvas
    const pdfBuffer = await page.pdf({
      width: `${activeDoc.canvasConfig.anchoMm}mm`,
      height: `${activeDoc.canvasConfig.altoMm}mm`,
      margin: { top: 0, bottom: 0, left: 0, right: 0 },
      printBackground: true
    });

    await browser.close();

    // 8. Enviar respuesta binaria
    res.contentType("application/pdf");
    res.send(Buffer.from(pdfBuffer));

  } catch (error: any) {
    console.error("Error al exportar PDF:", error);
    res.status(500).json({ error: error.message || "Error interno al generar el PDF." });
  } finally {
    // 9. Limpieza absoluta
    try {
      if (zipPath) await fs.remove(zipPath);
      await fs.remove(tempDir);
    } catch (cleanError) {
      console.error("Error al limpiar archivos temporales:", cleanError);
    }
  }
});

// --- EXPORTADOR DE IMÁGENES PNG (SRS-054) ---

function sanitizarNombreCarpeta(nombre: string, index: number): string {
  if (!nombre) return `Documento_${index + 1}`;
  let clean = nombre.trim().replace(/[\\/:*?"<>|]/g, "_").replace(/\s+/g, "_");
  clean = clean.replace(/^_+|_+$/g, "");
  return clean || `Documento_${index + 1}`;
}

function renderCardFaceContentHtml(
  cardData: Carta,
  esTrasera: boolean,
  doc: any,
  tempDir: string,
  proyecto: ProyectoCDC2
): string {
  const cardConfig = doc.cardConfig || { anchoMm: 63.5, altoMm: 88.9 };
  const MM_TO_PX = 3.779527559;

  let plantilla = esTrasera ? cardData.plantillaTrasera : cardData.plantilla;
  if (!plantilla) {
    const plantillaId = esTrasera ? cardData.plantillaTraseraId : cardData.plantillaId;
    if (plantillaId && proyecto.templates && proyecto.templates[plantillaId]) {
      plantilla = proyecto.templates[plantillaId];
    }
  }

  let staticImgSrc: string | null = null;
  if (esTrasera) {
    if (doc.modoTraseras === "comun") {
      staticImgSrc = cardData.imagenTrasera || doc.imagenTraseraComun;
    } else if (doc.modoTraseras === "individual") {
      staticImgSrc = cardData.imagenTrasera || doc.imagenTraseraComun;
    }
  } else {
    staticImgSrc = cardData.imagenFrontal || null;
  }

  const resolverAssetPath = (src: string | null) => {
    if (!src) return "";
    if (src.startsWith("symbol_asset://")) {
      const filename = src.replace("symbol_asset://", "");
      const absPath = path.join(tempDir, "symbols", filename);
      return `file:///${absPath.replace(/\\/g, "/")}`;
    }
    if (src.startsWith("user_asset://")) {
      const filename = src.replace("user_asset://", "");
      const absPath = path.join(tempDir, "user_assets", filename);
      return `file:///${absPath.replace(/\\/g, "/")}`;
    }
    if (src.startsWith("project_asset://")) {
      const filename = src.replace("project_asset://", "");
      const absPath = path.join(tempDir, "project_assets", filename);
      return `file:///${absPath.replace(/\\/g, "/")}`;
    }
    if (src.startsWith("asset://")) {
      const filename = src.replace("asset://", "");
      const absPath = path.join(tempDir, "assets", filename);
      return `file:///${absPath.replace(/\\/g, "/")}`;
    }
    return src;
  };

  if (plantilla) {
    const capas = plantilla.capas || [];
    const renderCapaRecursiva = (parentId: string | null): string => {
      const filteredLayers = capas.filter((c: any) => {
        if (parentId === null) {
          return !c.parentCapaId;
        }
        return c.parentCapaId === parentId;
      });

      return filteredLayers.map((capa: any) => {
        const overrides = esTrasera ? cardData.capasOverridesTrasera?.[capa.id] : cardData.capasOverrides?.[capa.id];
        const resolvedCapa = overrides ? { ...capa, ...overrides } : capa;

        const parentCapa = capas.find((p: any) => p.id === resolvedCapa.parentCapaId);
        const isParentFlex = parentCapa && (parentCapa.layout === "vertical" || parentCapa.layout === "horizontal");

        const positionCss = isParentFlex ? "position: relative;" : "position: absolute;";
        
        let leftPx = "";
        let topPx = "";
        const isParentVertical = parentCapa && parentCapa.layout === "vertical";
        const isParentHorizontal = parentCapa && parentCapa.layout === "horizontal";

        if (!isParentFlex) {
          leftPx = `left: ${resolvedCapa.xMm * MM_TO_PX}px;`;
          topPx = `top: ${resolvedCapa.yMm * MM_TO_PX}px;`;
        } else {
          if (isParentVertical) {
            leftPx = `left: ${resolvedCapa.xMm * MM_TO_PX}px;`;
          }
          if (isParentHorizontal) {
            topPx = `top: ${resolvedCapa.yMm * MM_TO_PX}px;`;
          }
        }

        const widthPx = resolvedCapa.anchoMm === "auto" ? "fit-content" : `${resolvedCapa.anchoMm * MM_TO_PX}px`;
        const heightPx = resolvedCapa.altoMm === "auto" ? "fit-content" : `${resolvedCapa.altoMm * MM_TO_PX}px`;

        const activeVisibility = resolvedCapa.visibility || "visible";
        let visStyle = "";
        if (activeVisibility === "hidden") {
          visStyle = "visibility: hidden;";
        } else if (activeVisibility === "collapsed") {
          visStyle = "display: none;";
        }

        const rotationStyle = resolvedCapa.rotacion ? `transform: rotate(${resolvedCapa.rotacion}deg); transform-origin: center center;` : "";
        const baseStyle = `${positionCss} ${leftPx} ${topPx} width: ${widthPx}; height: ${heightPx}; pointer-events: none; box-sizing: border-box; flex-shrink: 0; ${visStyle} ${rotationStyle}`;

        if (resolvedCapa.tipo === "background") {
          const colorFill = resolvedCapa.colorFill || "#ffffff";
          return `<div style="position: absolute; left: 0; top: 0; width: 100%; height: 100%; background-color: ${colorFill};"></div>`;
        }

        if (capa.tipo === "block") {
          const borderTopPx = (resolvedCapa.borderTopWidth || 0) * MM_TO_PX;
          const borderRightPx = (resolvedCapa.borderRightWidth || 0) * MM_TO_PX;
          const borderBottomPx = (resolvedCapa.borderBottomWidth || 0) * MM_TO_PX;
          const borderLeftPx = (resolvedCapa.borderLeftWidth || 0) * MM_TO_PX;

          const radiusTopLeftPx = (resolvedCapa.borderTopLeftRadius || 0) * MM_TO_PX;
          const radiusTopRightPx = (resolvedCapa.borderTopRightRadius || 0) * MM_TO_PX;
          const radiusBottomRightPx = (resolvedCapa.borderBottomRightRadius || 0) * MM_TO_PX;
          const radiusBottomLeftPx = (resolvedCapa.borderBottomLeftRadius || 0) * MM_TO_PX;

          const borderTopStyle = borderTopPx > 0 ? `border-top: ${borderTopPx}px solid ${resolvedCapa.borderTopColor || "#000000"};` : "border-top: none;";
          const borderRightStyle = borderRightPx > 0 ? `border-right: ${borderRightPx}px solid ${resolvedCapa.borderRightColor || "#000000"};` : "border-right: none;";
          const borderBottomStyle = borderBottomPx > 0 ? `border-bottom: ${borderBottomPx}px solid ${resolvedCapa.borderBottomColor || "#000000"};` : "border-bottom: none;";
          const borderLeftStyle = borderLeftPx > 0 ? `border-left: ${borderLeftPx}px solid ${resolvedCapa.borderLeftColor || "#000000"};` : "border-left: none;";

          const borderRadiusStyle = `border-top-left-radius: ${radiusTopLeftPx}px; border-top-right-radius: ${radiusTopRightPx}px; border-bottom-right-radius: ${radiusBottomRightPx}px; border-bottom-left-radius: ${radiusBottomLeftPx}px;`;
          const borderCornersCss = `${borderTopStyle} ${borderRightStyle} ${borderBottomStyle} ${borderLeftStyle} ${borderRadiusStyle}`;

          return `<div style="${baseStyle} background-color: ${resolvedCapa.backgroundColor || 'transparent'}; overflow: hidden; ${borderCornersCss}"></div>`;
        }

        if (capa.tipo === "container") {
          const borderTopPx = (resolvedCapa.borderTopWidth || 0) * MM_TO_PX;
          const borderRightPx = (resolvedCapa.borderRightWidth || 0) * MM_TO_PX;
          const borderBottomPx = (resolvedCapa.borderBottomWidth || 0) * MM_TO_PX;
          const borderLeftPx = (resolvedCapa.borderLeftWidth || 0) * MM_TO_PX;

          const radiusTopLeftPx = (resolvedCapa.borderTopLeftRadius || 0) * MM_TO_PX;
          const radiusTopRightPx = (resolvedCapa.borderTopRightRadius || 0) * MM_TO_PX;
          const radiusBottomRightPx = (resolvedCapa.borderBottomRightRadius || 0) * MM_TO_PX;
          const radiusBottomLeftPx = (resolvedCapa.borderBottomLeftRadius || 0) * MM_TO_PX;

          const borderTopStyle = borderTopPx > 0 ? `border-top: ${borderTopPx}px solid ${resolvedCapa.borderTopColor || "#000000"};` : "border-top: none;";
          const borderRightStyle = borderRightPx > 0 ? `border-right: ${borderRightPx}px solid ${resolvedCapa.borderRightColor || "#000000"};` : "border-right: none;";
          const borderBottomStyle = borderBottomPx > 0 ? `border-bottom: ${borderBottomPx}px solid ${resolvedCapa.borderBottomColor || "#000000"};` : "border-bottom: none;";
          const borderLeftStyle = borderLeftPx > 0 ? `border-left: ${borderLeftPx}px solid ${resolvedCapa.borderLeftColor || "#000000"};` : "border-left: none;";

          const borderRadiusStyle = `border-top-left-radius: ${radiusTopLeftPx}px; border-top-right-radius: ${radiusTopRightPx}px; border-bottom-right-radius: ${radiusBottomRightPx}px; border-bottom-left-radius: ${radiusBottomLeftPx}px;`;
          const borderCornersCss = `${borderTopStyle} ${borderRightStyle} ${borderBottomStyle} ${borderLeftStyle} ${borderRadiusStyle}`;

          const isFlex = resolvedCapa.layout === "vertical" || resolvedCapa.layout === "horizontal";
          const flexStyle = isFlex ? `display: flex; flex-direction: ${resolvedCapa.layout === "vertical" ? "column" : "row"};` : "";

          const innerContentHtml = renderCapaRecursiva(capa.id);
          const displayStyle = activeVisibility === "collapsed" ? "display: none;" : (isFlex ? "display: flex;" : "");

          return `
            <div style="${baseStyle} background-color: ${resolvedCapa.backgroundColor || 'transparent'}; overflow: hidden; ${borderCornersCss} ${flexStyle} ${displayStyle}">
              ${innerContentHtml}
            </div>
          `;
        }

        if (capa.tipo === "text") {
          const valores = esTrasera ? cardData.valoresCamposTrasera : cardData.valoresCampos;
          const textoInterp = renderizarTextoCapa(resolvedCapa, valores, plantilla?.capas);
          const htmlTextWithMarkdown = parseMarkdownToHtml(textoInterp);
          const htmlText = parsearTextoConSimbolos(htmlTextWithMarkdown, proyecto.projectSymbols || [], tempDir);
          const fontSizePt = resolvedCapa.fontSizePt || 12;
          const align = resolvedCapa.alineacion === "center" ? "center" : resolvedCapa.alineacion === "right" ? "right" : resolvedCapa.alineacion === "justify" ? "justify" : "left";
          const weight = resolvedCapa.bold ? "bold" : "normal";
          const styleOpt = resolvedCapa.italic ? "italic" : "normal";
          const decoration = resolvedCapa.underline ? "underline" : "none";
          
          const fontSizePx = fontSizePt * 0.352778 * MM_TO_PX;

          const borderTopPx = (resolvedCapa.borderTopWidth || 0) * MM_TO_PX;
          const borderRightPx = (resolvedCapa.borderRightWidth || 0) * MM_TO_PX;
          const borderBottomPx = (resolvedCapa.borderBottomWidth || 0) * MM_TO_PX;
          const borderLeftPx = (resolvedCapa.borderLeftWidth || 0) * MM_TO_PX;

          const radiusTopLeftPx = (resolvedCapa.borderTopLeftRadius || 0) * MM_TO_PX;
          const radiusTopRightPx = (resolvedCapa.borderTopRightRadius || 0) * MM_TO_PX;
          const radiusBottomRightPx = (resolvedCapa.borderBottomRightRadius || 0) * MM_TO_PX;
          const radiusBottomLeftPx = (resolvedCapa.borderBottomLeftRadius || 0) * MM_TO_PX;

          const borderTopStyle = borderTopPx > 0 ? `border-top: ${borderTopPx}px solid ${resolvedCapa.borderTopColor || "#000000"};` : "border-top: none;";
          const borderRightStyle = borderRightPx > 0 ? `border-right: ${borderRightPx}px solid ${resolvedCapa.borderRightColor || "#000000"};` : "border-right: none;";
          const borderBottomStyle = borderBottomPx > 0 ? `border-bottom: ${borderBottomPx}px solid ${resolvedCapa.borderBottomColor || "#000000"};` : "border-bottom: none;";
          const borderLeftStyle = borderLeftPx > 0 ? `border-left: ${borderLeftPx}px solid ${resolvedCapa.borderLeftColor || "#000000"};` : "border-left: none;";

          const borderRadiusStyle = `border-top-left-radius: ${radiusTopLeftPx}px; border-top-right-radius: ${radiusTopRightPx}px; border-bottom-right-radius: ${radiusBottomRightPx}px; border-bottom-left-radius: ${radiusBottomLeftPx}px;`;
          const borderCornersCss = `${borderTopStyle} ${borderRightStyle} ${borderBottomStyle} ${borderLeftStyle} ${borderRadiusStyle}`;

          const paddingTopMm = resolvedCapa.paddingTopMm !== undefined ? resolvedCapa.paddingTopMm : 0;
          const paddingRightMm = resolvedCapa.paddingRightMm !== undefined ? resolvedCapa.paddingRightMm : 0;
          const paddingBottomMm = resolvedCapa.paddingBottomMm !== undefined ? resolvedCapa.paddingBottomMm : 0;
          const paddingLeftMm = resolvedCapa.paddingLeftMm !== undefined ? resolvedCapa.paddingLeftMm : 0;

          const paddingCss = (paddingTopMm > 0 || paddingRightMm > 0 || paddingBottomMm > 0 || paddingLeftMm > 0)
            ? `padding: ${paddingTopMm}mm ${paddingRightMm}mm ${paddingBottomMm}mm ${paddingLeftMm}mm;`
            : "padding: 2px;";

          const textOutlinePx = (resolvedCapa.textOutlineWidth || 0) * MM_TO_PX;
          const textOutlineCss = textOutlinePx > 0
            ? `-webkit-text-stroke-width: ${textOutlinePx}px; -webkit-text-stroke-color: ${resolvedCapa.textOutlineColor || '#000000'}; paint-order: stroke fill;`
            : '';

          return `<div style="${baseStyle} font-family: ${resolvedCapa.fontFamily === 'sans-serif' || !resolvedCapa.fontFamily ? "'Inter', 'Segoe UI', sans-serif" : resolvedCapa.fontFamily}; font-size: ${fontSizePx}px; color: ${resolvedCapa.color || '#000000'}; background-color: ${resolvedCapa.backgroundColor || 'transparent'}; text-align: ${align}; font-weight: ${weight}; font-style: ${styleOpt}; text-decoration: ${decoration}; white-space: pre-wrap; word-break: break-word; line-height: 1.2; ${paddingCss} ${borderCornersCss} ${textOutlineCss}">${htmlText}</div>`;
        }

        if (capa.tipo === "image" || capa.tipo === "image-switch") {
          const rawSrc = resolvedCapa.src;
          const imgPath = resolverAssetPath(rawSrc);

          const borderTopPx = (resolvedCapa.borderTopWidth || 0) * MM_TO_PX;
          const borderRightPx = (resolvedCapa.borderRightWidth || 0) * MM_TO_PX;
          const borderBottomPx = (resolvedCapa.borderBottomWidth || 0) * MM_TO_PX;
          const borderLeftPx = (resolvedCapa.borderLeftWidth || 0) * MM_TO_PX;

          const radiusTopLeftPx = (resolvedCapa.borderTopLeftRadius || 0) * MM_TO_PX;
          const radiusTopRightPx = (resolvedCapa.borderTopRightRadius || 0) * MM_TO_PX;
          const radiusBottomRightPx = (resolvedCapa.borderBottomRightRadius || 0) * MM_TO_PX;
          const radiusBottomLeftPx = (resolvedCapa.borderBottomLeftRadius || 0) * MM_TO_PX;

          const borderTopStyle = borderTopPx > 0 ? `border-top: ${borderTopPx}px solid ${resolvedCapa.borderTopColor || "#000000"};` : "border-top: none;";
          const borderRightStyle = borderRightPx > 0 ? `border-right: ${borderRightPx}px solid ${resolvedCapa.borderRightColor || "#000000"};` : "border-right: none;";
          const borderBottomStyle = borderBottomPx > 0 ? `border-bottom: ${borderBottomPx}px solid ${resolvedCapa.borderBottomColor || "#000000"};` : "border-bottom: none;";
          const borderLeftStyle = borderLeftPx > 0 ? `border-left: ${borderLeftPx}px solid ${resolvedCapa.borderLeftColor || "#000000"};` : "border-left: none;";

          const borderRadiusStyle = `border-top-left-radius: ${radiusTopLeftPx}px; border-top-right-radius: ${radiusTopRightPx}px; border-bottom-right-radius: ${radiusBottomRightPx}px; border-bottom-left-radius: ${radiusBottomLeftPx}px;`;
          const borderCornersCss = `${borderTopStyle} ${borderRightStyle} ${borderBottomStyle} ${borderLeftStyle} ${borderRadiusStyle}`;

          if (imgPath) {
            const objectFit = resolvedCapa.modoAjuste === "stretch" ? "fill" : (resolvedCapa.modoAjuste || "cover");
            return `
              <div style="${baseStyle} background-color: ${resolvedCapa.backgroundColor || 'transparent'}; ${borderCornersCss}">
                <img src="${imgPath}" style="width: 100%; height: 100%; object-fit: ${objectFit}; display: block; border-radius: inherit;" />
              </div>
            `;
          } else {
            const emojiSize = Math.min(resolvedCapa.anchoMm, resolvedCapa.altoMm) * 0.4 * MM_TO_PX;
            return `
              <div style="${baseStyle} background-color: #e2e8f0; border: 1px dashed #cbd5e1; display: flex; align-items: center; justify-content: center; ${borderCornersCss}">
                <span style="font-size: ${emojiSize}px; line-height: 1; font-family: sans-serif;">🖼️</span>
              </div>
            `;
          }
        }

        return "";
      }).join("\n");
    };

    return renderCapaRecursiva(null);
  }

  const imgPath = resolverAssetPath(staticImgSrc);
  if (imgPath) {
    const fitMode = cardConfig.modoAjuste || "cover";
    const objectFit = fitMode === "cover" ? "cover" : "contain";
    return `<img src="${imgPath}" style="width: 100%; height: 100%; object-fit: ${objectFit}; display: block;" />`;
  }

  return "";
}

function generarHtmlExportacionPng(
  proyecto: ProyectoCDC2,
  tempDir: string
): {
  html: string;
  metadataDoc: Array<{
    docIndex: number;
    docName: string;
    folderName: string;
    cardItems: Array<{ cardIndexStr: string; hasFront: boolean; hasBack: boolean }>;
    cardConfig: any;
    uniqueCardsCount: number;
    totalCardsCount: number;
  }>;
} {
  const tipografiasMap = new Map<string, { nombre: string; type: string; data: string }>();

  if (proyecto.customFonts) {
    for (const font of proyecto.customFonts) {
      if (font.nombre && font.data) {
        tipografiasMap.set(font.nombre, { nombre: font.nombre, type: font.type, data: font.data });
      }
    }
  }

  if (proyecto.templates) {
    for (const template of Object.values(proyecto.templates)) {
      if (template && (template as any).customFonts) {
        for (const font of (template as any).customFonts) {
          if (font.nombre && font.data) {
            tipografiasMap.set(font.nombre, { nombre: font.nombre, type: font.type, data: font.data });
          }
        }
      }
    }
  }

  if (proyecto.documentos) {
    for (const doc of proyecto.documentos) {
      if (doc.cards) {
        for (const card of doc.cards) {
          if (card.plantilla && card.plantilla.customFonts) {
            for (const font of card.plantilla.customFonts) {
              if (font.nombre && font.data) {
                tipografiasMap.set(font.nombre, { nombre: font.nombre, type: font.type, data: font.data });
              }
            }
          }
          if (card.plantillaTrasera && card.plantillaTrasera.customFonts) {
            for (const font of card.plantillaTrasera.customFonts) {
              if (font.nombre && font.data) {
                tipografiasMap.set(font.nombre, { nombre: font.nombre, type: font.type, data: font.data });
              }
            }
          }
        }
      }
    }
  }

  const fontRules = Array.from(tipografiasMap.values()).map((font) => `
    @font-face {
      font-family: '${font.nombre}';
      src: url('data:${font.type};base64,${font.data}');
    }
  `).join("\n");

  const metadataDoc: Array<{
    docIndex: number;
    docName: string;
    folderName: string;
    cardItems: Array<{ cardIndexStr: string; hasFront: boolean; hasBack: boolean }>;
    cardConfig: any;
    uniqueCardsCount: number;
    totalCardsCount: number;
  }> = [];

  const cardsContainersHtml: string[] = [];
  const usedFolderNames = new Set<string>();

  const documentos = proyecto.documentos || [];
  documentos.forEach((doc: any, dIndex: number) => {
    let folderName = sanitizarNombreCarpeta(doc.nombre, dIndex);
    let altSuffix = 1;
    let baseFolderName = folderName;
    while (usedFolderNames.has(folderName)) {
      altSuffix++;
      folderName = `${baseFolderName}_${altSuffix}`;
    }
    usedFolderNames.add(folderName);

    const cardConfig = doc.cardConfig || { anchoMm: 63.5, altoMm: 88.9, sangradoMm: 0.5 };
    const anchoPx = Math.round((cardConfig.anchoMm / 25.4) * 300);
    const altoPx = Math.round((cardConfig.altoMm / 25.4) * 300);
    const cssWidthPx = anchoPx / 3.125;
    const cssHeightPx = altoPx / 3.125;

    const cards = doc.cards || [];
    const uniqueCardsCount = cards.length;
    let totalCardsCount = 0;

    const cardItems: Array<{ cardIndexStr: string; hasFront: boolean; hasBack: boolean }> = [];
    let physicalCardIndex = 1;

    cards.forEach((card: Carta) => {
      const count = Math.max(1, card.cantidad || 1);
      for (let c = 0; c < count; c++) {
        totalCardsCount++;
        const cardIndexStr = String(physicalCardIndex).padStart(3, "0");
        physicalCardIndex++;

        // Render Front
        const frontContentHtml = renderCardFaceContentHtml(card, false, doc, tempDir, proyecto);
        const frontContainerId = `card_${dIndex}_${cardIndexStr}_D`;
        cardsContainersHtml.push(`
          <div id="${frontContainerId}" class="card-export-frame" style="width: ${cssWidthPx}px; height: ${cssHeightPx}px;">
            ${frontContentHtml}
          </div>
        `);

        // Check if Back exists
        let hasBack = false;
        if (doc.modoTraseras === "comun") {
          hasBack = true;
        } else if (doc.modoTraseras === "individual") {
          let plantillaT = card.plantillaTrasera;
          if (!plantillaT && card.plantillaTraseraId && proyecto.templates) {
            plantillaT = proyecto.templates[card.plantillaTraseraId];
          }
          if (plantillaT || card.imagenTrasera || doc.imagenTraseraComun) {
            hasBack = true;
          }
        }

        if (hasBack) {
          const backContentHtml = renderCardFaceContentHtml(card, true, doc, tempDir, proyecto);
          const backContainerId = `card_${dIndex}_${cardIndexStr}_T`;
          cardsContainersHtml.push(`
            <div id="${backContainerId}" class="card-export-frame" style="width: ${cssWidthPx}px; height: ${cssHeightPx}px;">
              ${backContentHtml}
            </div>
          `);
        }

        cardItems.push({
          cardIndexStr,
          hasFront: true,
          hasBack
        });
      }
    });

    metadataDoc.push({
      docIndex: dIndex,
      docName: doc.nombre || `Documento ${dIndex + 1}`,
      folderName,
      cardItems,
      cardConfig,
      uniqueCardsCount,
      totalCardsCount
    });
  });

  const fullHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <link rel="preconnect" href="https://fonts.googleapis.com">
      <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Outfit:wght@400;500;600;700;800&display=swap" rel="stylesheet">
      <style>
        ${fontRules}
        * {
          box-sizing: border-box;
        }
        html, body {
          margin: 0;
          padding: 0;
          background-color: #ffffff;
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }
        .card-export-frame {
          position: relative;
          overflow: hidden;
          background-color: #ffffff;
          display: inline-block;
          margin: 10px;
          vertical-align: top;
        }
      </style>
    </head>
    <body>
      ${cardsContainersHtml.join("\n")}
    </body>
    </html>
  `;

  return { html: fullHtml, metadataDoc };
}

app.post("/api/exportar/png", upload.single("archivoProyecto"), async (req, res) => {
  const sessionUuid = randomUUID();
  const tempDir = path.join(EXPORTS_DIR, sessionUuid);
  const zipPath = req.file?.path;

  if (!zipPath) {
    return res.status(400).json({ error: "Archivo de proyecto .cdc2 no recibido." });
  }

  try {
    await fs.ensureDir(tempDir);

    const inputZip = new AdmZip(zipPath);
    inputZip.extractAllTo(tempDir, true);

    const projectJsonPath = path.join(tempDir, "project.json");
    if (!(await fs.pathExists(projectJsonPath))) {
      throw new Error("El archivo .cdc2 no contiene un project.json válido.");
    }
    let proyecto: ProyectoCDC2 = await fs.readJson(projectJsonPath);

    if (!proyecto.documentos || proyecto.documentos.length === 0) {
      const documentoId = "doc_default";
      const doc = {
        id: documentoId,
        nombre: "Documento 1",
        canvasConfig: (proyecto as any).canvasConfig || { tipo: "A4", anchoMm: 210, altoMm: 297 },
        cardConfig: (proyecto as any).cardConfig || { anchoMm: 63.5, altoMm: 88.9, sangradoMm: 0.5 },
        modoTraseras: (proyecto as any).modoTraseras || "ninguno",
        imagenTraseraComun: (proyecto as any).imagenTraseraComun || null,
        cards: (proyecto as any).cards || []
      };
      proyecto = {
        version: "2.1.0",
        meta: proyecto.meta || { nombre: "Proyecto Migrado", fechaCreacion: new Date().toISOString(), fechaModificacion: new Date().toISOString() },
        documentos: [doc],
        activeDocumentoId: documentoId,
        templates: (proyecto as any).templates || {},
        assets: (proyecto as any).assets || [],
        customFonts: proyecto.customFonts || []
      };
    }

    const { html, metadataDoc } = generarHtmlExportacionPng(proyecto, tempDir);
    const htmlPath = path.join(tempDir, "export_png.html");
    await fs.writeFile(htmlPath, html, "utf8");

    const browser = await puppeteer.launch({
      headless: true,
      executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined,
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--allow-file-access-from-files",
        "--enable-local-file-accesses",
        "--disable-web-security"
      ]
    });

    const page = await browser.newPage();
    await page.setViewport({
      width: 1920,
      height: 1080,
      deviceScaleFactor: 3.125
    });

    const fileUrl = `file:///${htmlPath.replace(/\\/g, "/")}`;
    await page.goto(fileUrl, { waitUntil: "networkidle0" });

    await page.evaluate(async () => {
      const images = Array.from(document.querySelectorAll("img"));
      await Promise.all(
        images.map((img) => {
          if (img.complete) return Promise.resolve();
          return new Promise((resolve) => {
            img.addEventListener("load", resolve);
            img.addEventListener("error", resolve);
          });
        })
      );
    });

    await new Promise((resolve) => setTimeout(resolve, 500));

    const outputZip = new AdmZip();

    for (const docMeta of metadataDoc) {
      let frontImagesCount = 0;
      let backImagesCount = 0;

      for (const item of docMeta.cardItems) {
        const frontElement = await page.$(`#card_${docMeta.docIndex}_${item.cardIndexStr}_D`);
        if (frontElement) {
          const frontBuffer = await frontElement.screenshot({ type: "png" });
          outputZip.addFile(`${docMeta.folderName}/carta${item.cardIndexStr}-D.png`, Buffer.from(frontBuffer));
          frontImagesCount++;
        }

        if (item.hasBack) {
          const backElement = await page.$(`#card_${docMeta.docIndex}_${item.cardIndexStr}_T`);
          if (backElement) {
            const backBuffer = await backElement.screenshot({ type: "png" });
            outputZip.addFile(`${docMeta.folderName}/carta${item.cardIndexStr}-T.png`, Buffer.from(backBuffer));
            backImagesCount++;
          }
        }
      }

      const anchoPx = Math.round((docMeta.cardConfig.anchoMm / 25.4) * 300);
      const altoPx = Math.round((docMeta.cardConfig.altoMm / 25.4) * 300);

      const infoTxt = `================================================
INFORMACIÓN DEL DOCUMENTO EXPORTADO - CARD DECK CRAFTER
================================================
Nombre del Documento: ${docMeta.docName}
Fecha y Hora de Generación: ${new Date().toLocaleString()}

- Cartas únicas en lista: ${docMeta.uniqueCardsCount}
- Cartas totales procesadas (con copias): ${docMeta.totalCardsCount}
- Imágenes delanteras (-D) generadas: ${frontImagesCount}
- Imágenes traseras (-T) generadas: ${backImagesCount}

Dimensiones Físicas Netas: ${docMeta.cardConfig.anchoMm} mm x ${docMeta.cardConfig.altoMm} mm
Dimensiones en Píxeles (300 DPI): ${anchoPx} px x ${altoPx} px
Sangrado del Documento: ${docMeta.cardConfig.sangradoMm || 0} mm (Excluido de estas imágenes PNG)
================================================
`;
      outputZip.addFile(`${docMeta.folderName}/info.txt`, Buffer.from(infoTxt, "utf8"));
    }

    await browser.close();

    const cleanProjectName = (proyecto.meta?.nombre || "proyecto_cdc2")
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "") || "proyecto_cdc2";

    const zipBuffer = outputZip.toBuffer();

    res.contentType("application/zip");
    res.setHeader("Content-Disposition", `attachment; filename="${cleanProjectName}_imagenes.zip"`);
    res.send(zipBuffer);

  } catch (error: any) {
    console.error("Error al exportar PNG:", error);
    res.status(500).json({ error: error.message || "Error interno al generar las imágenes PNG." });
  } finally {
    try {
      if (zipPath) await fs.remove(zipPath);
      await fs.remove(tempDir);
    } catch (cleanError) {
      console.error("Error al limpiar archivos temporales:", cleanError);
    }
  }
});

app.listen(port, () => {
  console.log(`[cdc2] Servidor de exportación corriendo en http://localhost:${port}`);
});
