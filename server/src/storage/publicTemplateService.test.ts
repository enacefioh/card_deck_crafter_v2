import { describe, it, expect, beforeEach, afterEach } from "vitest";
import Database from "better-sqlite3";
import fs from "fs";
import path from "path";
import os from "os";
import AdmZip from "adm-zip";
import { MigrationManager } from "../db/migrations";
import { PublicTemplateService } from "./publicTemplateService";

describe("PublicTemplateService - SRS-075", () => {
  let db: any;
  let tempDir: string;
  let service: PublicTemplateService;
  const testUserId = "user-designer-1";

  beforeEach(() => {
    db = new Database(":memory:");
    const mm = new MigrationManager(db);
    mm.runMigrations();

    // Insertar usuario de prueba con username
    db.prepare(`
      INSERT INTO users (id, email, username, password_hash, role, storage_quota_mb, created_at, updated_at)
      VALUES (?, 'designer@example.com', 'card_master', null, 'user', 100, '2026-10-01T00:00:00Z', '2026-10-01T00:00:00Z')
    `).run(testUserId);

    // Crear directorio temporal de datos
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "cdc2-pubtmpl-test-"));
    service = new PublicTemplateService(db, tempDir);

    // Crear un archivo zip (.cdc2t) simulado en la carpeta del usuario
    const userTemplatesDir = path.join(tempDir, "users", testUserId, "templates");
    fs.mkdirSync(userTemplatesDir, { recursive: true });

    const zip = new AdmZip();
    zip.addFile(
      "project.json",
      Buffer.from(
        JSON.stringify({
          nombre: "Fantasy Deck",
          plantillasCartas: [
            { id: "tmpl-card-1", nombre: "Héroe", anchoMm: 63.5, altoMm: 88.9, miniatura: "data:image/png;base64,abc" }
          ]
        })
      )
    );
    zip.writeZip(path.join(userTemplatesDir, "fantasy_deck.cdc2t"));

    // Registrar plantilla en user_templates
    db.prepare(`
      INSERT INTO user_templates (id, user_id, filename, name, description, document_count, template_count, file_size_bytes, is_public, created_at, updated_at)
      VALUES ('user-tmpl-1', ?, 'fantasy_deck.cdc2t', 'Fantasy Deck', 'Plantilla de héroes', 1, 1, 1024, 0, '2026-10-01T00:00:00Z', '2026-10-01T00:00:00Z')
    `).run(testUserId);
  });

  afterEach(() => {
    try {
      fs.rmSync(tempDir, { recursive: true, force: true });
    } catch {}
  });

  it("debe publicar una plantilla privada en el repositorio público con estado 'pending'", async () => {
    const published = await service.publishTemplate(
      testUserId,
      "user-tmpl-1",
      "Fantasy Deck Oficial",
      "Edición oficial aprobada para la comunidad"
    );

    expect(published.name).toBe("Fantasy Deck Oficial");
    expect(published.description).toBe("Edición oficial aprobada para la comunidad");
    expect(published.authorName).toBe("card_master");
    expect(published.status).toBe("pending");
    expect(published.templateCount).toBe(1);

    // Comprobar que el archivo se copió a public_templates
    const pubFile = path.join(tempDir, "public_templates", published.filename);
    expect(fs.existsSync(pubFile)).toBe(true);

    // Comprobar que se extrajo metadata de miniaturas
    expect(published.metadataJson).toBeTruthy();
    const parsed = JSON.parse(published.metadataJson!);
    expect(parsed.previewCards.length).toBe(1);
    expect(parsed.previewCards[0].nombre).toBe("Héroe");
  });

  it("debe listar las publicaciones del usuario", async () => {
    await service.publishTemplate(
      testUserId,
      "user-tmpl-1",
      "Fantasy Deck",
      "Desc"
    );

    const userPubs = await service.getUserPublications(testUserId);
    expect(Object.keys(userPubs).length).toBe(1);
    expect(userPubs["user-tmpl-1"]).toBeDefined();
    expect(userPubs["user-tmpl-1"].originalTemplateId).toBe("user-tmpl-1");
  });

  it("debe permitir a un administrador aprobar una plantilla pública", async () => {
    const pub = await service.publishTemplate(
      testUserId,
      "user-tmpl-1",
      "Fantasy Deck",
      "Desc"
    );

    const approved = await service.approveTemplate(pub.id);
    expect(approved.status).toBe("approved");

    const approvedList = await service.listPublicTemplates("approved");
    expect(approvedList.length).toBe(1);
    expect(approvedList[0].id).toBe(pub.id);
  });

  it("debe rechazar/eliminar una plantilla pública y borrar el archivo físico", async () => {
    const pub = await service.publishTemplate(
      testUserId,
      "user-tmpl-1",
      "Fantasy Deck",
      "Desc"
    );

    const pubFile = path.join(tempDir, "public_templates", pub.filename);
    expect(fs.existsSync(pubFile)).toBe(true);

    await service.rejectTemplate(pub.id);

    // Archivo físico eliminado
    expect(fs.existsSync(pubFile)).toBe(false);

    // Fila eliminada de la base de datos
    const userPubs = await service.getUserPublications(testUserId);
    expect(Object.keys(userPubs).length).toBe(0);
  });

  it("debe obtener la ruta física del archivo de una plantilla pública", async () => {
    const pub = await service.publishTemplate(
      testUserId,
      "user-tmpl-1",
      "Fantasy Deck",
      "Desc"
    );

    const fileInfo = service.getPublicTemplateFilePath(pub.id);
    expect(fileInfo.template.id).toBe(pub.id);
    expect(fs.existsSync(fileInfo.filePath)).toBe(true);
  });

  it("debe reflejar dinámicamente el nombre de usuario actualizado en el catálogo de la tienda (SRS-076)", async () => {
    const pub = await service.publishTemplate(
      testUserId,
      "user-tmpl-1",
      "Fantasy Deck",
      "Desc"
    );
    await service.approveTemplate(pub.id);

    // Cambiar nombre de usuario en la tabla users
    db.prepare("UPDATE users SET username = 'nuevo_nombre_autor' WHERE id = ?").run(testUserId);

    // El catálogo debe reflejar el nombre actual
    const catalog = await service.getStoreCatalog();
    expect(catalog.length).toBe(1);
    expect(catalog[0].authorName).toBe("nuevo_nombre_autor");

    // Y debe utilizar la miniatura de la primera plantilla como portada
    expect(catalog[0].thumbnail).toBe("data:image/png;base64,abc");

    // El detalle también debe reflejarlo
    const detail = await service.getStoreTemplateDetail(pub.id);
    expect(detail).not.toBeNull();
    expect(detail!.authorName).toBe("nuevo_nombre_autor");
    expect(detail!.previewCards?.length).toBe(1);
    expect(detail!.thumbnail).toBe("data:image/png;base64,abc");
  });
});
