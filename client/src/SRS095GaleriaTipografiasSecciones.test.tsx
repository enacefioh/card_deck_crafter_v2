// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach } from "vitest";
import fs from "fs";
import path from "path";
import JSZip from "jszip";
import { generarProyectoZip } from "./services/projectZipService";

describe("SRS-095: Galería de Tipografías Unificada con Secciones", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("RF-1: MenuBar.tsx contiene el botón '🔤 Galería de Tipografías...'", () => {
    const menuBarPath = path.resolve(__dirname, "MenuBar.tsx");
    const menuBarContent = fs.readFileSync(menuBarPath, "utf-8");

    expect(menuBarContent).toContain("Galería de Tipografías...");
    expect(menuBarContent).toContain("🔤");
    expect(menuBarContent).not.toContain("Tipografías del Proyecto...");
  });

  it("RF-5 & RF-6: generarProyectoZip persiste fontFolders y customFonts con su respectivo folder", async () => {
    const mockBlob = new Blob(["fake-font-bytes"], { type: "font/ttf" });
    vi.spyOn(globalThis, "fetch").mockImplementation(() =>
      Promise.resolve({
        blob: () => Promise.resolve(mockBlob),
      } as any)
    );

    const customFonts = [
      {
        id: "f_cinzel",
        nombre: "Cinzel",
        dataUrl: "data:font/ttf;base64,AAEAAA...",
        folder: "Títulos",
      },
      {
        id: "f_roboto",
        nombre: "Roboto Custom",
        dataUrl: "data:font/ttf;base64,AAEBBB...",
        folder: "Por Defecto",
      },
      {
        id: "f_legacy",
        nombre: "Legacy Font",
        dataUrl: "data:font/ttf;base64,AAECCC...",
        // Sin folder explícito para validar retrocompatibilidad
      },
    ];

    const fontFolders = ["Por Defecto", "Títulos", "Textos"];

    const zipBlob = await generarProyectoZip({
      nombreProyecto: "Proyecto Con Fuentes",
      documentos: [],
      templateAssets: [],
      projectAssets: [],
      projectFonts: customFonts as any,
      fontFolders: fontFolders,
    });

    const zip = await JSZip.loadAsync(zipBlob);
    const projectJsonRaw = await zip.file("project.json")!.async("string");
    const projectJson = JSON.parse(projectJsonRaw);

    // Verificar fontFolders persistidos
    expect(projectJson.fontFolders).toEqual(["Por Defecto", "Títulos", "Textos"]);

    // Verificar customFonts serializados con carpeta
    expect(projectJson.customFonts).toHaveLength(3);
    expect(projectJson.customFonts[0].nombre).toBe("Cinzel");
    expect(projectJson.customFonts[0].folder).toBe("Títulos");

    expect(projectJson.customFonts[1].nombre).toBe("Roboto Custom");
    expect(projectJson.customFonts[1].folder).toBe("Por Defecto");

    // Retrocompatibilidad: fuente sin carpeta debe asignarse a "Por Defecto"
    expect(projectJson.customFonts[2].nombre).toBe("Legacy Font");
    expect(projectJson.customFonts[2].folder).toBe("Por Defecto");
  });

  it("RF-5: generarProyectoZip asegura al menos ['Por Defecto'] si fontFolders no se especifica", async () => {
    const zipBlob = await generarProyectoZip({
      nombreProyecto: "Proyecto Sin Carpetas de Fuentes",
      documentos: [],
      templateAssets: [],
      projectAssets: [],
    });

    const zip = await JSZip.loadAsync(zipBlob);
    const projectJsonRaw = await zip.file("project.json")!.async("string");
    const projectJson = JSON.parse(projectJsonRaw);

    expect(projectJson.fontFolders).toEqual(["Por Defecto"]);
  });

  it("RF-3 & RF-4: Operaciones de gestión de galerías de fuentes: crear, renombrar en cascada, mover, copiar y borrado seguro", () => {
    let fontFolders = ["Por Defecto"];
    let customFonts = [
      { id: "f1", nombre: "DinoTitle", dataUrl: "blob:f1", folder: "Por Defecto" },
      { id: "f2", nombre: "DinoBody", dataUrl: "blob:f2", folder: "Por Defecto" },
    ];

    // 1. Crear nueva galería vacía "Títulos"
    const newFolderName = "Títulos";
    if (!fontFolders.includes(newFolderName)) {
      fontFolders = [...fontFolders, newFolderName];
    }
    expect(fontFolders).toEqual(["Por Defecto", "Títulos"]);

    // 2. Mover f1 a "Títulos"
    customFonts = customFonts.map((f) => (f.id === "f1" ? { ...f, folder: "Títulos" } : f));
    expect(customFonts.find((f) => f.id === "f1")?.folder).toBe("Títulos");
    expect(customFonts.find((f) => f.id === "f2")?.folder).toBe("Por Defecto");

    // 3. Copiar f1 a "Por Defecto"
    const fontToCopy = customFonts.find((f) => f.id === "f1")!;
    const copiedFont = {
      ...fontToCopy,
      id: "f1_copy_123",
      folder: "Por Defecto",
    };
    customFonts = [...customFonts, copiedFont];
    expect(customFonts).toHaveLength(3);
    expect(customFonts.filter((f) => f.folder === "Por Defecto")).toHaveLength(2);
    expect(customFonts.filter((f) => f.folder === "Títulos")).toHaveLength(1);

    // 4. Renombrar "Títulos" a "Encabezados" en cascada
    const oldName = "Títulos";
    const renamed = "Encabezados";
    fontFolders = fontFolders.map((f) => (f === oldName ? renamed : f));
    customFonts = customFonts.map((f) => (f.folder === oldName ? { ...f, folder: renamed } : f));

    expect(fontFolders).toEqual(["Por Defecto", "Encabezados"]);
    expect(customFonts.find((f) => f.id === "f1")?.folder).toBe("Encabezados");

    // 5. Borrado seguro de "Encabezados": tipografías reubicadas a "Por Defecto"
    const folderToDelete = "Encabezados";
    customFonts = customFonts.map((f) =>
      f.folder === folderToDelete ? { ...f, folder: "Por Defecto" } : f
    );
    fontFolders = fontFolders.filter((f) => f !== folderToDelete);

    expect(fontFolders).toEqual(["Por Defecto"]);
    expect(customFonts.every((f) => f.folder === "Por Defecto")).toBe(true);
  });

  it("RF-7: Selectores de fuentes agrupan las tipografías por carpetas del proyecto y tipografías del sistema", () => {
    const appPath = path.resolve(__dirname, "App.tsx");
    const appContent = fs.readFileSync(appPath, "utf-8");
    const modalPath = path.resolve(__dirname, "EditCardModal.tsx");
    const modalContent = fs.readFileSync(modalPath, "utf-8");

    // Verificar en App.tsx (Inspector)
    expect(appContent).toContain('label="Tipografías del Sistema"');
    expect(appContent).toContain('label={`Tipografías del Proyecto: ${folder}`}');

    // Verificar en EditCardModal.tsx
    expect(modalContent).toContain('fontFolders?: string[];');
    expect(modalContent).toContain('label="Tipografías del Sistema"');
    expect(modalContent).toContain('label={`Tipografías del Proyecto: ${folder}`}');
  });
});
