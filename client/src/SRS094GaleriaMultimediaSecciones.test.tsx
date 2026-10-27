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
});
