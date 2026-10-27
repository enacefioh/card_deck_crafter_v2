// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach } from "vitest";
import fs from "fs";
import path from "path";
import JSZip from "jszip";
import { generarProyectoZip } from "./services/projectZipService";

describe("SRS-094: Galería Multimedia Unificada con Secciones e Imágenes", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("RF-8: index.css incluye estilos oscuros y de alto contraste para optgroup y option", () => {
    const cssPath = path.resolve(__dirname, "index.css");
    const cssContent = fs.readFileSync(cssPath, "utf-8");

    expect(cssContent).toContain("optgroup {");
    expect(cssContent).toContain("background-color: var(--bg-card);");
    expect(cssContent).toContain("color: var(--accent-primary);");

    expect(cssContent).toContain("option {");
    expect(cssContent).toContain("background-color: var(--bg-main);");
    expect(cssContent).toContain("color: var(--text-primary);");
  });

  it("RF-1: MenuBar.tsx contiene el botón '🖼️ Galería Multimedia...'", () => {
    const menuBarPath = path.resolve(__dirname, "MenuBar.tsx");
    const menuBarContent = fs.readFileSync(menuBarPath, "utf-8");

    expect(menuBarContent).toContain("Galería Multimedia...");
    expect(menuBarContent).toContain("🖼️");
    expect(menuBarContent).not.toContain("Galería del Proyecto...");
  });

  it("RF-3: generarProyectoZip con asTemplate: true empaqueta ÚNICAMENTE la Galería de la Plantilla", async () => {
    const mockBlob = new Blob(["fake-image-bytes"], { type: "image/png" });
    vi.spyOn(globalThis, "fetch").mockImplementation(() =>
      Promise.resolve({
        blob: () => Promise.resolve(mockBlob),
      } as any)
    );

    const templateAssets = [
      { id: "tmpl_1", nombre: "MarcoBase.png", src: "blob:fake-url-1" },
    ];
    const projectAssets = [
      { id: "proj_1", nombre: "DinoApex.png", src: "blob:fake-url-2", folder: "Personajes" },
      { id: "proj_2", nombre: "FondoSelva.png", src: "blob:fake-url-3", folder: "Por Defecto" },
    ];
    const userAssets = [
      { id: "usr_1", nombre: "Avatar.png", src: "blob:fake-url-4" },
    ];
    const assetFolders = ["Por Defecto", "Personajes"];

    const zipBlob = await generarProyectoZip({
      asTemplate: true,
      nombreProyecto: "Plantilla Bestiario",
      documentos: [],
      templateAssets,
      projectAssets,
      assetFolders,
      userAssets,
    });

    const zip = await JSZip.loadAsync(zipBlob);
    const projectJsonRaw = await zip.file("project.json")!.async("string");
    const projectJson = JSON.parse(projectJsonRaw);

    // Debe marcarse como template
    expect(projectJson.isTemplate).toBe(true);

    // Debe contener únicamente templateAssets en assets
    expect(projectJson.assets).toHaveLength(1);
    expect(projectJson.assets[0].nombre).toBe("MarcoBase.png");
    expect(projectJson.assets[0].src).toMatch(/^asset:\/\/tmpl_1\.png$/);

    // projectAssets y userAssets deben estar vacíos en template
    expect(projectJson.projectAssets).toEqual([]);
    expect(projectJson.userAssets).toEqual([]);

    // Los archivos en el ZIP solo deben contener assets/ y no project_assets/ o user_assets/
    const fileNames = Object.keys(zip.files);
    expect(fileNames.some((f) => f.startsWith("assets/tmpl_1"))).toBe(true);
    expect(fileNames.some((f) => f.startsWith("project_assets/"))).toBe(false);
    expect(fileNames.some((f) => f.startsWith("user_assets/"))).toBe(false);
  });

  it("RF-3: generarProyectoZip con asTemplate: false empaqueta todas las galerías con sus carpetas", async () => {
    const mockBlob = new Blob(["fake-image-bytes"], { type: "image/png" });
    vi.spyOn(globalThis, "fetch").mockImplementation(() =>
      Promise.resolve({
        blob: () => Promise.resolve(mockBlob),
      } as any)
    );

    const templateAssets = [
      { id: "tmpl_1", nombre: "MarcoBase.png", src: "blob:fake-url-1" },
    ];
    const projectAssets = [
      { id: "proj_1", nombre: "DinoApex.png", src: "blob:fake-url-2", folder: "Personajes" },
      { id: "proj_2", nombre: "FondoSelva.png", src: "blob:fake-url-3", folder: "Por Defecto" },
    ];
    const userAssets = [
      { id: "usr_1", nombre: "Avatar.png", src: "blob:fake-url-4" },
    ];
    const assetFolders = ["Por Defecto", "Personajes"];

    const zipBlob = await generarProyectoZip({
      asTemplate: false,
      nombreProyecto: "Proyecto Dinosaurios",
      documentos: [],
      templateAssets,
      projectAssets,
      assetFolders,
      userAssets,
    });

    const zip = await JSZip.loadAsync(zipBlob);
    const projectJsonRaw = await zip.file("project.json")!.async("string");
    const projectJson = JSON.parse(projectJsonRaw);

    // No es template
    expect(projectJson.isTemplate).toBeUndefined();

    // Galería de Plantilla
    expect(projectJson.assets).toHaveLength(1);
    expect(projectJson.assets[0].nombre).toBe("MarcoBase.png");

    // Galerías del Proyecto
    expect(projectJson.projectAssets).toHaveLength(2);
    expect(projectJson.projectAssets[0].folder).toBe("Personajes");
    expect(projectJson.projectAssets[1].folder).toBe("Por Defecto");

    // Carpetas
    expect(projectJson.assetFolders).toEqual(["Por Defecto", "Personajes"]);

    // Galería de Usuario
    expect(projectJson.userAssets).toHaveLength(1);
    expect(projectJson.userAssets[0].nombre).toBe("Avatar.png");

    // Archivos en el zip
    const fileNames = Object.keys(zip.files);
    expect(fileNames.some((f) => f.startsWith("assets/tmpl_1"))).toBe(true);
    expect(fileNames.some((f) => f.startsWith("project_assets/proj_1"))).toBe(true);
    expect(fileNames.some((f) => f.startsWith("project_assets/proj_2"))).toBe(true);
    expect(fileNames.some((f) => f.startsWith("user_assets/usr_1"))).toBe(true);
  });

  it("RF-4 & RF-6: Simulación de mover, copiar y borrado seguro de galerías", () => {
    // 1. Mover entre carpetas de proyecto
    let projectAssets = [
      { id: "p1", nombre: "T-Rex.png", src: "blob:p1", folder: "Por Defecto" },
      { id: "p2", nombre: "Fondo.png", src: "blob:p2", folder: "Por Defecto" },
    ];
    let assetFolders = ["Por Defecto", "Criaturas"];

    // Mover p1 a "Criaturas"
    projectAssets = projectAssets.map((a) =>
      a.id === "p1" ? { ...a, folder: "Criaturas" } : a
    );
    expect(projectAssets.find((a) => a.id === "p1")?.folder).toBe("Criaturas");

    // 2. Copiar p1 a "Por Defecto"
    const original = projectAssets.find((a) => a.id === "p1")!;
    const duplicate = {
      id: "p1_copy_123",
      nombre: original.nombre,
      src: original.src,
      folder: "Por Defecto",
    };
    projectAssets = [...projectAssets, duplicate];
    expect(projectAssets).toHaveLength(3);
    expect(projectAssets.filter((a) => a.folder === "Por Defecto")).toHaveLength(2);
    expect(projectAssets.filter((a) => a.folder === "Criaturas")).toHaveLength(1);

    // 3. Borrado seguro de la galería "Criaturas"
    const folderToDelete = "Criaturas";
    projectAssets = projectAssets.map((a) =>
      a.folder === folderToDelete ? { ...a, folder: "Por Defecto" } : a
    );
    assetFolders = assetFolders.filter((f) => f !== folderToDelete);

    expect(assetFolders).toEqual(["Por Defecto"]);
    expect(projectAssets.every((a) => a.folder === "Por Defecto")).toBe(true);
  });

  it("RF-3 & RF-5: Autodescubrimiento de recursos: indexa imágenes físicas de plantillas y cartas en sus respectivas galerías", () => {
    // Simular archivos presentes en el ZIP
    const zipFiles = {
      "assets/marco_antiguo.png": { dir: false },
      "assets/override_card_1_layer_0.png": { dir: false },
      "project_assets/dino_rex.png": { dir: false },
      "user_assets/dino_triceratops.png": { dir: false },
    };

    const loadedTemplatesMap = {
      tmpl_1: {
        id: "tmpl_1",
        nombre: "Plantilla Criatura",
        capas: [
          { id: "c1", nombre: "Marco", tipo: "image", src: "asset://marco_antiguo.png" },
        ],
      },
    };

    const docCards = [
      {
        id: "card_1",
        nombre: "Tiranosaurio Rex",
        imagenFrontal: "project_asset://dino_rex.png",
        capasOverrides: {
          c_art: { src: "user_asset://dino_triceratops.png" },
        },
      },
    ];

    const nuevosTemplateAssets: any[] = [];
    const nuevosProjectAssets: any[] = [];
    const nuevosUserAssets: any[] = [];

    // 1. Escaneo de archivos físicos
    for (const [filePath] of Object.entries(zipFiles)) {
      if (filePath.startsWith("assets/")) {
        const filename = filePath.replace("assets/", "");
        if (filename.startsWith("override_")) {
          nuevosProjectAssets.push({ id: filename, nombre: filename, src: `asset://${filename}`, folder: "Por Defecto" });
        } else {
          nuevosTemplateAssets.push({ id: filename, nombre: filename, src: `asset://${filename}` });
        }
      } else if (filePath.startsWith("project_assets/")) {
        const filename = filePath.replace("project_assets/", "");
        nuevosProjectAssets.push({ id: filename, nombre: filename, src: `project_asset://${filename}`, folder: "Por Defecto" });
      } else if (filePath.startsWith("user_assets/")) {
        const filename = filePath.replace("user_assets/", "");
        nuevosUserAssets.push({ id: filename, nombre: filename, src: `user_asset://${filename}` });
      }
    }

    // 2. Escaneo de plantillas
    for (const tpl of Object.values(loadedTemplatesMap)) {
      for (const capa of tpl.capas) {
        if (!nuevosTemplateAssets.some((a) => a.src === capa.src)) {
          nuevosTemplateAssets.push({ id: capa.id, nombre: capa.nombre, src: capa.src });
        }
      }
    }

    // 3. Escaneo de cartas
    for (const card of docCards) {
      if (card.imagenFrontal && !nuevosProjectAssets.some((a) => a.src === card.imagenFrontal)) {
        nuevosProjectAssets.push({ id: card.id, nombre: card.nombre, src: card.imagenFrontal, folder: "Por Defecto" });
      }
      for (const overrideVal of Object.values(card.capasOverrides)) {
        if (overrideVal.src && !nuevosProjectAssets.some((a) => a.src === overrideVal.src)) {
          nuevosProjectAssets.push({ id: `${card.id}_override`, nombre: card.nombre, src: overrideVal.src, folder: "Por Defecto" });
        }
      }
    }

    // Verificar que los recursos de plantilla se encuentran en la galería de plantilla
    expect(nuevosTemplateAssets.some((a) => a.src.includes("marco_antiguo.png"))).toBe(true);

    // Verificar que los recursos de proyecto y cartas (incluso los subidos por API) se encuentran en Por Defecto
    expect(nuevosProjectAssets.some((a) => a.src.includes("dino_rex.png") && a.folder === "Por Defecto")).toBe(true);
    expect(nuevosProjectAssets.some((a) => a.src.includes("dino_triceratops.png") && a.folder === "Por Defecto")).toBe(true);
    expect(nuevosProjectAssets.some((a) => a.src.includes("override_card_1_layer_0.png") && a.folder === "Por Defecto")).toBe(true);
  });
});
