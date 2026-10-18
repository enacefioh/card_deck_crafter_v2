import { describe, it, expect, beforeEach, afterEach } from "vitest";
import Database from "better-sqlite3";
import fs from "fs-extra";
import path from "path";
import os from "os";
import AdmZip from "adm-zip";
import { MigrationManager } from "../db/migrations";
import { UserStorageService } from "../storage/userStorageService";
import { PublicTemplateService } from "../storage/publicTemplateService";
import { ProjectArchiveService } from "./projectArchiveService";
import { AGENT_SKILL_MARKDOWN } from "shared";

describe("SRS-081: Soporte de Reversos con Plantillas, Configuración de Traseras y Esquema Estructurado en la API", () => {
  let db: any;
  let tempBaseDir: string;
  let userStorageService: UserStorageService;
  let publicTemplateService: PublicTemplateService;
  let projectArchiveService: ProjectArchiveService;

  const testUserId = "user-srs081-ai";
  const testTemplateId = "tmpl-srs081-cards";
  const userQuotaMb = 20;

  beforeEach(async () => {
    db = new Database(":memory:");
    const mm = new MigrationManager(db);
    mm.runMigrations();

    db.prepare(`
      INSERT INTO users (id, email, password_hash, role, storage_quota_mb, created_at, updated_at)
      VALUES (?, 'agent81@example.com', null, 'user', ?, '2026-10-18T00:00:00Z', '2026-10-18T00:00:00Z')
    `).run(testUserId, userQuotaMb);

    tempBaseDir = path.join(os.tmpdir(), `cdc2_srs081_${Date.now()}_${Math.random().toString(36).slice(2)}`);
    await fs.mkdirp(tempBaseDir);

    userStorageService = new UserStorageService(db, tempBaseDir);
    publicTemplateService = new PublicTemplateService(db, tempBaseDir);
    projectArchiveService = new ProjectArchiveService(userStorageService, publicTemplateService);

    await publicTemplateService.ensurePublicTemplatesDir();
    const tmplZip = new AdmZip();

    // Crear plantilla con diseño frontal y diseño de reverso
    const tmplProject = {
      version: "2.1.0",
      meta: {
        nombre: "Plantilla Dual Anverso/Reverso",
        fechaCreacion: new Date().toISOString(),
        fechaModificacion: new Date().toISOString()
      },
      templates: {
        "design_front": {
          id: "design_front",
          nombre: "Frontal Héroe",
          anchoMm: 63.5,
          altoMm: 88.9,
          capas: [
            { id: "layer_bg", nombre: "Fondo", tipo: "image", src: "asset://bg.png" },
            { id: "layer_art", nombre: "Arte", tipo: "image", xMm: 5, yMm: 10, anchoMm: 50, altoMm: 40 },
            { id: "layer_title", nombre: "Título", tipo: "text", contenidoRaw: "Héroe Base" }
          ],
          exposedProperties: [
            { layerId: "layer_title", property: "contenidoRaw", label: "NombreHéroe" },
            { layerId: "layer_art", property: "src", label: "Ilustración" }
          ]
        },
        "design_back": {
          id: "design_back",
          nombre: "Reverso de Facción",
          anchoMm: 63.5,
          altoMm: 88.9,
          capas: [
            { id: "back_bg", nombre: "Fondo Reverso", tipo: "image", src: "asset://back_bg.png" },
            { id: "back_lore", nombre: "Texto Trasero", tipo: "text", contenidoRaw: "Historia del reverso" },
            { id: "back_symbol", nombre: "Símbolo Facción", tipo: "image", src: "asset://symbol.png" }
          ],
          camposConfig: [
            { clave: "lore", nombre: "Historia", tipo: "string", valorDefecto: "Historia de la carta" }
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

    db.prepare(`
      INSERT INTO public_templates (
        id, original_template_id, author_id, author_name, name, description,
        filename, status, document_count, template_count, file_size_bytes,
        metadata_json, created_at, updated_at
      ) VALUES (?, 'orig-81', ?, 'CDC2 Team', 'Plantilla Dual Anverso/Reverso', 'Plantilla con reversos',
        ?, 'approved', 1, 2, ?, null, '2026-10-18T00:00:00Z', '2026-10-18T00:00:00Z')
    `).run(testTemplateId, testUserId, `${testTemplateId}.cdc2t`, tmplBuffer.length);
  });

  afterEach(async () => {
    try {
      await fs.remove(tempBaseDir);
    } catch {}
  });

  it("RF-1: Debe inicializar modoTraseras: 'individual' al crear el proyecto desde plantilla", async () => {
    const proj = await projectArchiveService.createProjectFromTemplate(testUserId, userQuotaMb, {
      templateId: testTemplateId,
      name: "Baraja con Reversos",
      modoTraseras: "individual"
    });

    const detail = await projectArchiveService.getProjectDetail(testUserId, proj.id);
    expect(detail.documents).toHaveLength(1);
    expect(detail.documents[0].modoTraseras).toBe("individual");
  });

  it("RF-1.2: Debe inicializar modoTraseras: 'comun' con imagenTraseraComun", async () => {
    const dummyBase64 = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";
    const proj = await projectArchiveService.createProjectFromTemplate(testUserId, userQuotaMb, {
      templateId: testTemplateId,
      name: "Baraja Reverso Común",
      imagenTraseraComun: dummyBase64
    });

    const detail = await projectArchiveService.getProjectDetail(testUserId, proj.id);
    expect(detail.documents[0].modoTraseras).toBe("comun");
    expect(detail.documents[0].imagenTraseraComun).toMatch(/^user_asset:\/\/img_/);
  });

  it("RF-5: Debe estructurar el esquema en exposedFields y fullStructure", async () => {
    const proj = await projectArchiveService.createProjectFromTemplate(testUserId, userQuotaMb, {
      templateId: testTemplateId,
      name: "Prueba Esquema Dual"
    });

    const detail = await projectArchiveService.getProjectDetail(testUserId, proj.id);
    const frontDesign = detail.templates.find(t => t.id === "design_front");
    expect(frontDesign).toBeDefined();

    // exposedFields
    expect(frontDesign!.exposedFields).toBeDefined();
    expect(frontDesign!.exposedFields.some(f => f.clave === "NombreHéroe")).toBe(true);

    // fullStructure
    expect(frontDesign!.fullStructure).toBeDefined();
    expect(frontDesign!.fullStructure.length).toBe(3);
    expect(frontDesign!.fullStructure.some(l => l.id === "layer_bg" && l.tipo === "image")).toBe(true);
  });

  it("RF-2: Debe añadir cartas con backCardTemplateId, backFields, backImages y auto-activar modoTraseras: 'individual'", async () => {
    // 1. Crear proyecto sin reversos inicialmente (modoTraseras: ninguno)
    const proj = await projectArchiveService.createProjectFromTemplate(testUserId, userQuotaMb, {
      templateId: testTemplateId,
      name: "Proyecto Cartas Duales"
    });

    const dummyBase64 = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";

    // 2. Inyectar carta con anverso y reverso con plantilla
    const addRes = await projectArchiveService.addCardsToProject(testUserId, userQuotaMb, proj.id, {
      cards: [
        {
          cardTemplateId: "design_front",
          name: "Paladín de la Luz",
          count: 2,
          fields: {
            "NombreHéroe": "Paladín Aurelius"
          },
          images: {
            "Ilustración": dummyBase64
          },
          backCardTemplateId: "design_back",
          backFields: {
            "Texto Trasero": "Orden sagrada de los guardianes del alba."
          },
          backImages: {
            "Símbolo Facción": dummyBase64
          }
        }
      ]
    });

    expect(addRes.cards).toHaveLength(1);
    const card = addRes.cards[0];
    expect(card.plantillaId).toBe("design_front");
    expect(card.plantillaTraseraId).toBe("design_back");
    expect(card.valoresCampos?.["NombreHéroe"]).toBe("Paladín Aurelius");
    expect(card.capasOverrides?.["layer_title"]?.contenidoRaw).toBe("Paladín Aurelius");

    expect(card.valoresCamposTrasera?.["Texto Trasero"]).toBe("Orden sagrada de los guardianes del alba.");
    expect(card.capasOverridesTrasera?.["back_lore"]?.contenidoRaw).toBe("Orden sagrada de los guardianes del alba.");
    expect(card.valoresCamposTrasera?.["Símbolo Facción"]).toMatch(/^user_asset:\/\//);

    // RF-2.3: Verificar que modoTraseras se auto-promovió a "individual"
    const detail = await projectArchiveService.getProjectDetail(testUserId, proj.id);
    expect(detail.documents[0].modoTraseras).toBe("individual");
  });

  it("RF-2.1: Debe rechazar backCardTemplateId inexistente con error 400", async () => {
    const proj = await projectArchiveService.createProjectFromTemplate(testUserId, userQuotaMb, {
      templateId: testTemplateId,
      name: "Prueba Validación"
    });

    await expect(projectArchiveService.addCardsToProject(testUserId, userQuotaMb, proj.id, {
      cards: [
        {
          cardTemplateId: "design_front",
          name: "Carta Invalida",
          backCardTemplateId: "template_inexistente_999"
        }
      ]
    })).rejects.toThrow(/no existe en las plantillas del proyecto/);
  });

  it("RF-3: Debe actualizar carta con campos y plantilla trasera", async () => {
    const proj = await projectArchiveService.createProjectFromTemplate(testUserId, userQuotaMb, {
      templateId: testTemplateId,
      name: "Prueba Update"
    });

    const addRes = await projectArchiveService.addCardsToProject(testUserId, userQuotaMb, proj.id, {
      cards: [
        {
          cardTemplateId: "design_front",
          name: "Carta Inicial"
        }
      ]
    });

    const cardId = addRes.cards[0].id;

    // Actualizar añadiendo reverso
    const upRes = await projectArchiveService.updateCardInProject(testUserId, userQuotaMb, proj.id, cardId, {
      name: "Carta Actualizada con Reverso",
      backCardTemplateId: "design_back",
      backFields: {
        "Texto Trasero": "Texto modificado en el reverso."
      }
    });

    expect(upRes.card.nombre).toBe("Carta Actualizada con Reverso");
    expect(upRes.card.plantillaTraseraId).toBe("design_back");
    expect(upRes.card.valoresCamposTrasera?.["Texto Trasero"]).toBe("Texto modificado en el reverso.");
    expect(upRes.card.capasOverridesTrasera?.["back_lore"]?.contenidoRaw).toBe("Texto modificado en el reverso.");
  });

  it("RF-4: Debe lanzar 404 en previewCardInProject con side=back si la carta no tiene reverso", async () => {
    const proj = await projectArchiveService.createProjectFromTemplate(testUserId, userQuotaMb, {
      templateId: testTemplateId,
      name: "Prueba Preview Error"
    });

    const addRes = await projectArchiveService.addCardsToProject(testUserId, userQuotaMb, proj.id, {
      cards: [
        {
          cardTemplateId: "design_front",
          name: "Solo Frontal"
        }
      ]
    });

    const cardId = addRes.cards[0].id;

    await expect(
      projectArchiveService.previewCardInProject(testUserId, proj.id, cardId, 300, "back")
    ).rejects.toThrow(/no cuenta con un reverso configurado/);
  });

  it("RF-7: AGENT_SKILL_MARKDOWN debe contener la metadata y secciones requeridas", () => {
    expect(AGENT_SKILL_MARKDOWN).toContain("name: card-deck-crafter");
    expect(AGENT_SKILL_MARKDOWN).toContain("description:");
    expect(AGENT_SKILL_MARKDOWN).toContain("https://cdc2.enacefio.com");
    expect(AGENT_SKILL_MARKDOWN).toContain("projectId");
    expect(AGENT_SKILL_MARKDOWN).toContain("exposedFields");
    expect(AGENT_SKILL_MARKDOWN).toContain("fullStructure");
    expect(AGENT_SKILL_MARKDOWN).toContain("modoTraseras");
    expect(AGENT_SKILL_MARKDOWN).toContain("backCardTemplateId");
    expect(AGENT_SKILL_MARKDOWN).toContain("side=back");
  });
});
