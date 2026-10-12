import { describe, it, expect, beforeEach, afterEach } from "vitest";
import Database from "better-sqlite3";
import fs from "fs-extra";
import path from "path";
import os from "os";
import AdmZip from "adm-zip";
import crypto from "crypto";
import { MigrationManager } from "../db/migrations";
import { UserStorageService } from "../storage/userStorageService";
import { PublicTemplateService } from "../storage/publicTemplateService";
import { ProjectArchiveService } from "./projectArchiveService";

describe("ProjectArchiveService - Gestión de Proyectos en la Nube y Multidocumento (SRS-079)", () => {
  let db: any;
  let tempBaseDir: string;
  let userStorageService: UserStorageService;
  let publicTemplateService: PublicTemplateService;
  let projectArchiveService: ProjectArchiveService;

  const testUserId = "user-ai-001";
  const testTemplateId = "tmpl-magic-cards-001";
  const userQuotaMb = 10;

  beforeEach(async () => {
    db = new Database(":memory:");
    const mm = new MigrationManager(db);
    mm.runMigrations();

    // Insertar usuario de prueba
    db.prepare(`
      INSERT INTO users (id, email, password_hash, role, storage_quota_mb, created_at, updated_at)
      VALUES (?, 'ai_agent@example.com', null, 'user', ?, '2026-10-12T00:00:00Z', '2026-10-12T00:00:00Z')
    `).run(testUserId, userQuotaMb);

    // Crear base directory
    tempBaseDir = path.join(os.tmpdir(), `cdc2_archive_test_${Date.now()}_${Math.random().toString(36).slice(2)}`);
    await fs.mkdirp(tempBaseDir);

    userStorageService = new UserStorageService(db, tempBaseDir);
    publicTemplateService = new PublicTemplateService(db, tempBaseDir);
    projectArchiveService = new ProjectArchiveService(userStorageService, publicTemplateService);

    // Crear plantilla pública sintética
    await publicTemplateService.ensurePublicTemplatesDir();
    const tmplZip = new AdmZip();

    const tmplProject = {
      version: "2.1.0",
      meta: {
        nombre: "Plantilla MTG Estándar",
        fechaCreacion: new Date().toISOString(),
        fechaModificacion: new Date().toISOString()
      },
      templates: {
        "design_creature": {
          id: "design_creature",
          nombre: "Criatura Fantasía",
          anchoMm: 63.5,
          altoMm: 88.9,
          capas: [
            { id: "bg", nombre: "Fondo", tipo: "background", colorFill: "#1e293b" },
            { id: "ilustracion", nombre: "Arte Principal", tipo: "image", xMm: 5, yMm: 10, anchoMm: 53.5, altoMm: 40 },
            { id: "titulo", nombre: "Nombre de Criatura", tipo: "text", xMm: 5, yMm: 5, fontSizePt: 12, contenidoRaw: "Criatura" },
            { id: "stats", nombre: "Ataque y Resistencia", tipo: "text", xMm: 45, yMm: 80, fontSizePt: 10, contenidoRaw: "{{fuerza}}/{{resistencia}}" }
          ],
          camposConfig: [
            { clave: "fuerza", nombre: "Fuerza", tipo: "number", valorDefecto: 1 },
            { clave: "resistencia", nombre: "Resistencia", tipo: "number", valorDefecto: 1 }
          ]
        }
      },
      projectSymbols: [],
      customFonts: [],
      assets: []
    };

    tmplZip.addFile("project.json", Buffer.from(JSON.stringify(tmplProject, null, 2), "utf8"));
    const tmplBuffer = tmplZip.toBuffer();
    const tmplFilePath = path.join(publicTemplateService.getPublicTemplatesDir(), `${testTemplateId}.cdc2t`);
    await fs.writeFile(tmplFilePath, tmplBuffer);

    // Registrar plantilla en base de datos como aprobada
    db.prepare(`
      INSERT INTO public_templates (
        id, original_template_id, author_id, author_name, name, description,
        filename, status, document_count, template_count, file_size_bytes,
        metadata_json, created_at, updated_at
      ) VALUES (?, 'orig-1', ?, 'Creador', 'Plantilla MTG Estándar', 'Plantilla para cartas MTG',
        ?, 'approved', 1, 1, ?, null, '2026-10-12T00:00:00Z', '2026-10-12T00:00:00Z')
    `).run(testTemplateId, testUserId, `${testTemplateId}.cdc2t`, tmplBuffer.length);
  });

  afterEach(async () => {
    try {
      await fs.remove(tempBaseDir);
    } catch {}
  });

  it("RF-1: debe crear un proyecto .cdc2 en la nube del usuario clonando la plantilla", async () => {
    const res = await projectArchiveService.createProjectFromTemplate(testUserId, userQuotaMb, {
      templateId: testTemplateId,
      name: "Expansión 5 Mazos",
      description: "Proyecto con 5 mazos creados por IA"
    });

    expect(res.id).toBeDefined();
    expect(res.name).toBe("Expansión 5 Mazos");
    expect(res.cardCount).toBe(0);
    expect(res.documentCount).toBe(1);

    // Verificar existencia del archivo en disco
    const filePath = path.join(userStorageService.getUserProjectsDir(testUserId), `${res.id}.cdc2`);
    expect(await fs.pathExists(filePath)).toBe(true);

    // Verificar contenido interno del ZIP
    const zip = new AdmZip(filePath);
    const projEntry = zip.getEntry("project.json");
    expect(projEntry).toBeDefined();

    const projectData = JSON.parse(projEntry!.getData().toString("utf8"));
    expect(projectData.templates["design_creature"]).toBeDefined();
    expect(projectData.documentos.length).toBe(1);
    expect(projectData.documentos[0].nombre).toBe("Documento 1");
    expect(projectData.documentos[0].cards.length).toBe(0);
  });

  it("RF-2: debe listar documentos y permitir crear documentos adicionales (multidocumento)", async () => {
    const created = await projectArchiveService.createProjectFromTemplate(testUserId, userQuotaMb, {
      templateId: testTemplateId,
      name: "Proyecto Multidocumento"
    });

    // Crear segundo y tercer documento
    const doc2 = await projectArchiveService.createDocument(testUserId, userQuotaMb, created.id, {
      nombre: "Mazo Rojo - Fuego"
    });
    expect(doc2.id).toBeDefined();
    expect(doc2.nombre).toBe("Mazo Rojo - Fuego");

    const doc3 = await projectArchiveService.createDocument(testUserId, userQuotaMb, created.id, {
      nombre: "Mazo Azul - Control"
    });
    expect(doc3.nombre).toBe("Mazo Azul - Control");

    const docs = await projectArchiveService.listProjectDocuments(testUserId, created.id);
    expect(docs.length).toBe(3);
    expect(docs.map(d => d.nombre)).toEqual(["Documento 1", "Mazo Rojo - Fuego", "Mazo Azul - Control"]);

    // Verificar detalle del proyecto
    const detail = await projectArchiveService.getProjectDetail(testUserId, created.id);
    expect(detail.documents.length).toBe(3);
    expect(detail.templates.length).toBe(1);
    expect(detail.templates[0].id).toBe("design_creature");
    expect(detail.templates[0].campos.length).toBeGreaterThan(0);
  });

  it("RF-3: debe añadir cartas con campos de texto e ilustraciones Base64 a un documento", async () => {
    const proj = await projectArchiveService.createProjectFromTemplate(testUserId, userQuotaMb, {
      templateId: testTemplateId,
      name: "Proyecto Cartas"
    });

    const docRed = await projectArchiveService.createDocument(testUserId, userQuotaMb, proj.id, {
      nombre: "Mazo Rojo"
    });

    const dummyBase64 = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";

    const addRes = await projectArchiveService.addCardsToProject(testUserId, userQuotaMb, proj.id, {
      documentId: docRed.id,
      cards: [
        {
          cardTemplateId: "design_creature",
          name: "Dragón Carmesí",
          count: 2,
          fields: {
            "titulo": "Dragón Carmesí Devorador",
            "fuerza": 5,
            "resistencia": 4
          },
          images: {
            "ilustracion": dummyBase64
          }
        },
        {
          cardTemplateId: "design_creature",
          name: "Duende Chispeante",
          count: 4,
          fields: {
            "titulo": "Duende Chispeante",
            "fuerza": 1,
            "resistencia": 1
          }
        }
      ]
    });

    expect(addRes.cards.length).toBe(2);
    expect(addRes.totalCards).toBe(2);
    expect(addRes.cards[0].nombre).toBe("Dragón Carmesí");
    expect(addRes.cards[0].cantidad).toBe(2);
    expect(addRes.cards[0].valoresCampos?.["titulo"]).toBe("Dragón Carmesí Devorador");
    expect(addRes.cards[0].valoresCampos?.["ilustracion"]).toMatch(/^user_asset:\/\/img_/);

    // Verificar que el archivo .cdc2 tiene el asset dentro de user_assets/
    const { zip } = await projectArchiveService.loadProjectZip(testUserId, proj.id);
    const assetName = addRes.cards[0].valoresCampos!["ilustracion"].replace("user_asset://", "");
    const assetEntry = zip.getEntry(`user_assets/${assetName}`);
    expect(assetEntry).toBeDefined();
  });

  it("RF-4: debe actualizar o corregir cartas existentes (PUT)", async () => {
    const proj = await projectArchiveService.createProjectFromTemplate(testUserId, userQuotaMb, {
      templateId: testTemplateId,
      name: "Proyecto Modificaciones"
    });

    const addRes = await projectArchiveService.addCardsToProject(testUserId, userQuotaMb, proj.id, {
      cards: [
        {
          cardTemplateId: "design_creature",
          name: "Golem Prototipo",
          count: 1,
          fields: {
            "titulo": "Golem Prototipo v1",
            "fuerza": 2,
            "resistencia": 2
          }
        }
      ]
    });

    const cardId = addRes.cards[0].id;

    // Actualizar nombre y fuerza
    const updateRes = await projectArchiveService.updateCardInProject(testUserId, userQuotaMb, proj.id, cardId, {
      name: "Golem Perfeccionado",
      count: 3,
      fields: {
        "titulo": "Golem Perfeccionado v2",
        "fuerza": 4
      }
    });

    expect(updateRes.card.nombre).toBe("Golem Perfeccionado");
    expect(updateRes.card.cantidad).toBe(3);
    expect(updateRes.card.valoresCampos?.["titulo"]).toBe("Golem Perfeccionado v2");
    expect(updateRes.card.valoresCampos?.["fuerza"]).toBe("4");
    // Conserva resistencia que no fue modificada
    expect(updateRes.card.valoresCampos?.["resistencia"]).toBe("2");
  });

  it("RF-5: debe eliminar una carta del proyecto (DELETE)", async () => {
    const proj = await projectArchiveService.createProjectFromTemplate(testUserId, userQuotaMb, {
      templateId: testTemplateId,
      name: "Proyecto Borrado"
    });

    const addRes = await projectArchiveService.addCardsToProject(testUserId, userQuotaMb, proj.id, {
      cards: [
        { cardTemplateId: "design_creature", name: "Carta A", count: 1 },
        { cardTemplateId: "design_creature", name: "Carta B", count: 1 }
      ]
    });

    expect(addRes.totalCards).toBe(2);

    const delRes = await projectArchiveService.deleteCardFromProject(
      testUserId,
      userQuotaMb,
      proj.id,
      addRes.cards[0].id
    );

    expect(delRes.message).toBe("Carta eliminada con éxito");
    expect(delRes.cardCount).toBe(1);

    const detail = await projectArchiveService.getProjectDetail(testUserId, proj.id);
    expect(detail.project.cardCount).toBe(1);
    expect(detail.documents[0].cardCount).toBe(1);
  });

  it("RF-7: debe rechazar operaciones si se excede la cuota de almacenamiento del usuario (413)", async () => {
    const proj = await projectArchiveService.createProjectFromTemplate(testUserId, 1, {
      templateId: testTemplateId,
      name: "Proyecto Al Límite"
    });

    // Generar un Data URL Base64 con entropía alta (randomBytes) para que ZIP no pueda comprimirlo
    const bigBuffer = crypto.randomBytes(Math.ceil(1.2 * 1024 * 1024));
    const bigBase64 = `data:image/png;base64,${bigBuffer.toString("base64")}`;

    await expect(
      projectArchiveService.addCardsToProject(testUserId, 1, proj.id, {
        cards: [
          {
            cardTemplateId: "design_creature",
            name: "Monstruo Enorme",
            images: { "ilustracion": bigBase64 }
          }
        ]
      })
    ).rejects.toMatchObject({
      code: "QUOTA_EXCEEDED"
    });
  });
});
