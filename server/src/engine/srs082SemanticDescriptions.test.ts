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
import { getPublicTemplateSchema } from "./cardEngineService";

describe("SRS-082: Descripciones Semánticas y Directrices para IA en Elementos y Propiedades Expuestas", () => {
  let db: any;
  let tempBaseDir: string;
  let userStorageService: UserStorageService;
  let publicTemplateService: PublicTemplateService;
  let projectArchiveService: ProjectArchiveService;

  const testUserId = "user-srs082";
  const testTemplateId = "tmpl-srs082";

  beforeEach(async () => {
    db = new Database(":memory:");
    const mm = new MigrationManager(db);
    mm.runMigrations();

    db.prepare(`
      INSERT INTO users (id, email, password_hash, role, storage_quota_mb, created_at, updated_at)
      VALUES (?, 'srs082@example.com', null, 'user', 20, '2026-10-19T00:00:00Z', '2026-10-19T00:00:00Z')
    `).run(testUserId);

    tempBaseDir = path.join(os.tmpdir(), `cdc2_srs082_${Date.now()}_${Math.random().toString(36).slice(2)}`);
    await fs.mkdirp(tempBaseDir);

    userStorageService = new UserStorageService(db, tempBaseDir);
    publicTemplateService = new PublicTemplateService(db, tempBaseDir);
    projectArchiveService = new ProjectArchiveService(userStorageService, publicTemplateService);

    await publicTemplateService.ensurePublicTemplatesDir();
  });

  afterEach(async () => {
    if (db) db.close();
    if (tempBaseDir && await fs.pathExists(tempBaseDir)) {
      await fs.remove(tempBaseDir);
    }
  });

  it("RF-5.1: Debe autocomponer la descripción en exposedFields heredando la descripción de la capa", () => {
    const design = {
      id: "tpl_monstruo",
      nombre: "Carta Monstruo",
      anchoMm: 63.5,
      altoMm: 88.9,
      capas: [
        {
          id: "layer_monstruo",
          nombre: "Nombre_Monstruo",
          tipo: "text",
          descripcion: "Nombre del monstruo, siempre debe ir en mayúsculas",
          contenidoRaw: "DRAGÓN ANCESTRAL",
          fontSizePt: 14
        }
      ],
      exposedProperties: [
        {
          layerId: "layer_monstruo",
          property: "contenidoRaw",
          label: "Nombre"
        },
        {
          layerId: "layer_monstruo",
          property: "fontSizePt",
          label: "Tamaño Fuente (PT)"
        }
      ]
    };

    const schema = projectArchiveService.mapDesignToSchema(design);

    expect(schema.exposedFields).toHaveLength(2);
    expect(schema.exposedFields[0].descripcion).toBe(
      "Nombre de Nombre_Monstruo (Nombre del monstruo, siempre debe ir en mayúsculas)"
    );
    expect(schema.exposedFields[1].descripcion).toBe(
      "Tamaño Fuente (PT) de Nombre_Monstruo (Nombre del monstruo, siempre debe ir en mayúsculas)"
    );
    expect(schema.exposedFields[1].tipo).toBe("number");
  });

  it("RF-5.1 (Prioridad): Debe priorizar la aclaración específica de la propiedad expuesta sobre la descripción de la capa", () => {
    const design = {
      id: "tpl_monstruo_custom",
      nombre: "Carta Monstruo Custom",
      anchoMm: 63.5,
      altoMm: 88.9,
      capas: [
        {
          id: "layer_monstruo",
          nombre: "Nombre_Monstruo",
          tipo: "text",
          descripcion: "Nombre del monstruo, siempre debe ir en mayúsculas",
          contenidoRaw: "GOLEM",
          fontSizePt: 16
        },
        {
          id: "layer_coste",
          nombre: "Coste_Mana",
          tipo: "text",
          contenidoRaw: "3"
        }
      ],
      exposedProperties: [
        {
          layerId: "layer_monstruo",
          property: "fontSizePt",
          label: "Tamaño Fuente (PT)",
          description: "Ajustar entre 12 y 18 pt si el nombre es muy largo"
        },
        {
          layerId: "layer_coste",
          property: "contenidoRaw",
          label: "Coste"
        }
      ]
    };

    const schema = projectArchiveService.mapDesignToSchema(design);

    expect(schema.exposedFields).toHaveLength(2);
    expect(schema.exposedFields[0].descripcion).toBe(
      "Tamaño Fuente (PT) de Nombre_Monstruo (Ajustar entre 12 y 18 pt si el nombre es muy largo)"
    );
    // Sin descripción en capa ni en propiedad expuesta -> solo "${label} de ${layerName}"
    expect(schema.exposedFields[1].descripcion).toBe("Coste de Coste_Mana");
  });

  it("RF-5.2: Debe incluir descripcion de cada capa en fullStructure tanto en proyectos como en plantillas públicas", async () => {
    const tmplZip = new AdmZip();
    const tmplProject = {
      version: "2.1.0",
      meta: {
        nombre: "Plantilla Semántica",
        fechaCreacion: new Date().toISOString(),
        fechaModificacion: new Date().toISOString()
      },
      templates: {
        design_1: {
          id: "design_1",
          nombre: " Criatura ",
          anchoMm: 63.5,
          altoMm: 88.9,
          capas: [
            {
              id: "l_art",
              nombre: "Ilustracion_Principal",
              tipo: "image",
              descripcion: "Ilustración vertical 4:3 con fondo transparente",
              src: "asset://art.png"
            },
            {
              id: "l_title",
              nombre: "Titulo_Carta",
              tipo: "text",
              descripcion: "Título épico en mayúsculas",
              contenidoRaw: "CABALLERO"
            }
          ],
          exposedProperties: [
            {
              layerId: "l_title",
              property: "contenidoRaw",
              label: "Título",
              description: "Máximo 22 caracteres en mayúsculas"
            }
          ]
        }
      }
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
      ) VALUES (?, 'orig-82', ?, 'CDC2 Team', 'Plantilla Semántica', 'Test SRS-082',
        ?, 'approved', 1, 1, ?, null, '2026-10-19T00:00:00Z', '2026-10-19T00:00:00Z')
    `).run(testTemplateId, testUserId, `${testTemplateId}.cdc2t`, tmplBuffer.length);

    const publicSchema = await getPublicTemplateSchema(testTemplateId, publicTemplateService);
    expect(publicSchema).not.toBeNull();
    const d1 = publicSchema!.designs[0];

    expect(d1.exposedFields[0].descripcion).toBe(
      "Título de Titulo_Carta (Máximo 22 caracteres en mayúsculas)"
    );
    expect(d1.fullStructure).toHaveLength(2);
    expect(d1.fullStructure[0].descripcion).toBe("Ilustración vertical 4:3 con fondo transparente");
    expect(d1.fullStructure[1].descripcion).toBe("Título épico en mayúsculas");
  });
});
