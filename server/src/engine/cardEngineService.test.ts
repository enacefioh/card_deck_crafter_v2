import { describe, it, expect, vi, beforeEach } from "vitest";
import path from "path";
import fs from "fs-extra";
import AdmZip from "adm-zip";
import { getPublicTemplateSchema, renderCardToPng } from "./cardEngineService.js";
import type { PublicTemplateService } from "../storage/publicTemplateService.js";

describe("SRS-077: CardEngineService - Schema & Render", () => {
  const testDir = path.resolve(process.cwd(), "temp/test_srs077");
  const testZipPath = path.join(testDir, "test_template.cdc2t");

  beforeEach(async () => {
    await fs.ensureDir(testDir);

    const projectData = {
      version: "2.1.0",
      meta: { nombre: "Plantilla Fantasía", autor: "CreadorTest" },
      templates: {
        design_hero: {
          id: "design_hero",
          nombre: "Héroe Épico",
          anchoMm: 63.5,
          altoMm: 88.9,
          camposConfig: [
            { clave: "fuerza", nombreLegible: "Fuerza de Combate", tipo: "number", valorDefecto: 50 },
            { clave: "lore", nombreLegible: "Historia del Héroe", tipo: "multiline", valorDefecto: "Nacido en el norte..." }
          ],
          exposedProperties: [
            { layerId: "art_layer", property: "src", label: "Ilustración Principal" }
          ],
          capas: [
            { id: "bg", tipo: "background", colorFill: "#1e1e24" },
            { id: "art_layer", nombre: "Arte", tipo: "image", xMm: 5, yMm: 5, anchoMm: 53.5, altoMm: 40 },
            { id: "title_layer", nombre: "Nombre", tipo: "text", contenidoRaw: "Héroe: {{nombre_heroe}}" },
            { id: "elem_switch", nombre: "Elemento", tipo: "image-switch", opcionesSwitch: ["Fuego", "Agua", "Tierra"] }
          ],
          miniatura: "data:image/svg+xml;utf8,<svg>hero</svg>"
        },
        vacia: {
          id: "vacia",
          nombre: "Lienzo Vacío",
          capas: []
        }
      }
    };

    const zip = new AdmZip();
    zip.addFile("project.json", Buffer.from(JSON.stringify(projectData), "utf8"));
    zip.writeZip(testZipPath);
  });

  it("debe extraer el esquema tipado correctamente excluyendo el diseño vacío", async () => {
    const mockService = {
      getPublicTemplateFilePath: vi.fn().mockReturnValue({
        filePath: testZipPath,
        template: {
          id: "tmpl_pub_123",
          name: "Pack Fantasía",
          description: "Cartas medievales",
          authorName: "MaestroRol",
          status: "approved"
        }
      })
    } as unknown as PublicTemplateService;

    const manifest = await getPublicTemplateSchema("tmpl_pub_123", mockService);

    expect(manifest.templateId).toBe("tmpl_pub_123");
    expect(manifest.templateName).toBe("Pack Fantasía");
    expect(manifest.authorName).toBe("MaestroRol");
    expect(manifest.designs.length).toBe(1);

    const heroDesign = manifest.designs[0];
    expect(heroDesign.id).toBe("design_hero");
    expect(heroDesign.nombre).toBe("Héroe Épico");
    expect(heroDesign.dimensiones).toEqual({ anchoMm: 63.5, altoMm: 88.9 });
    expect(heroDesign.totalCapas).toBe(4);
    expect(heroDesign.miniatura).toBe("data:image/svg+xml;utf8,<svg>hero</svg>");

    // Verificar campos tipados
    const claves = heroDesign.campos.map((c) => c.clave);
    expect(claves).toContain("fuerza");
    expect(claves).toContain("lore");
    expect(claves).toContain("art_layer.src");
    expect(claves).toContain("nombre_heroe");
    expect(claves).toContain("Elemento");

    const campoFuerza = heroDesign.campos.find((c) => c.clave === "fuerza");
    expect(campoFuerza?.tipo).toBe("number");
    expect(campoFuerza?.nombre).toBe("Fuerza de Combate");

    const campoElemento = heroDesign.campos.find((c) => c.clave === "Elemento");
    expect(campoElemento?.tipo).toBe("select");
    expect(campoElemento?.opciones).toEqual(["Fuego", "Agua", "Tierra"]);
  });

  it("debe arrojar error 404 si la plantilla no está aprobada", async () => {
    const mockService = {
      getPublicTemplateFilePath: vi.fn().mockReturnValue({
        filePath: testZipPath,
        template: {
          id: "tmpl_pending",
          name: "Plantilla Pendiente",
          status: "pending"
        }
      })
    } as unknown as PublicTemplateService;

    await expect(getPublicTemplateSchema("tmpl_pending", mockService)).rejects.toThrow(
      "La plantilla no existe o no ha sido aprobada."
    );
  });

  it("debe arrojar error 400 si renderCardToPng recibe argumentos inválidos", async () => {
    const mockService = {} as PublicTemplateService;

    await expect(renderCardToPng({ templateId: "", cardDesignId: "d1" }, mockService)).rejects.toThrow(
      "Falta el parámetro templateId."
    );

    await expect(renderCardToPng({ templateId: "t1", cardDesignId: "" }, mockService)).rejects.toThrow(
      "Falta el parámetro cardDesignId."
    );
  });
});
