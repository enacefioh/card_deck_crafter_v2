// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach } from "vitest";
import fs from "fs";
import path from "path";
import JSZip from "jszip";
import { generarProyectoZip } from "./services/projectZipService";

describe("SRS-096: Galería de Símbolos con Secciones Personalizadas", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("RF-1: MenuBar.tsx contiene el botón '🧸 Galería de Símbolos...'", () => {
    const menuBarPath = path.resolve(__dirname, "MenuBar.tsx");
    const menuBarContent = fs.readFileSync(menuBarPath, "utf-8");

    expect(menuBarContent).toContain("Galería de Símbolos...");
    expect(menuBarContent).toContain("🧸");
  });

  it("RF-7: generarProyectoZip persiste symbolFolders y projectSymbols con su respectivo folder", async () => {
    const mockBlob = new Blob(["fake-image-bytes"], { type: "image/png" });
    vi.spyOn(globalThis, "fetch").mockImplementation(() =>
      Promise.resolve({
        blob: () => Promise.resolve(mockBlob),
      } as any)
    );

    const projectSymbols = [
      {
        id: "sym_fuego",
        tag: "fuego",
        src: "blob:fake-symbol-1",
        folder: "Maná",
      },
      {
        id: "sym_espada",
        tag: "ataque",
        src: "blob:fake-symbol-2",
        folder: "Por Defecto",
      },
      {
        id: "sym_legacy",
        tag: "defensa",
        src: "blob:fake-symbol-3",
        // Sin folder para validar retrocompatibilidad
      },
    ];

    const symbolFolders = ["Por Defecto", "Maná", "Condiciones"];

    const zipBlob = await generarProyectoZip({
      nombreProyecto: "Proyecto Con Símbolos",
      documentos: [],
      templateAssets: [],
      projectAssets: [],
      projectSymbols: projectSymbols,
      symbolFolders: symbolFolders,
    });

    const zip = await JSZip.loadAsync(zipBlob);
    const projectJsonRaw = await zip.file("project.json")!.async("string");
    const projectJson = JSON.parse(projectJsonRaw);

    // Verificar symbolFolders persistidos
    expect(projectJson.symbolFolders).toEqual(["Por Defecto", "Maná", "Condiciones"]);

    // Verificar projectSymbols serializados con folder
    expect(projectJson.projectSymbols).toHaveLength(3);
    expect(projectJson.projectSymbols[0].tag).toBe("fuego");
    expect(projectJson.projectSymbols[0].folder).toBe("Maná");

    expect(projectJson.projectSymbols[1].tag).toBe("ataque");
    expect(projectJson.projectSymbols[1].folder).toBe("Por Defecto");

    // Retrocompatibilidad: símbolo sin carpeta debe asignarse a "Por Defecto"
    expect(projectJson.projectSymbols[2].tag).toBe("defensa");
    expect(projectJson.projectSymbols[2].folder).toBe("Por Defecto");
  });

  it("RF-7: generarProyectoZip asegura al menos ['Por Defecto'] si symbolFolders no se especifica", async () => {
    const zipBlob = await generarProyectoZip({
      nombreProyecto: "Proyecto Sin Carpetas de Símbolos",
      documentos: [],
      templateAssets: [],
      projectAssets: [],
    });

    const zip = await JSZip.loadAsync(zipBlob);
    const projectJsonRaw = await zip.file("project.json")!.async("string");
    const projectJson = JSON.parse(projectJsonRaw);

    expect(projectJson.symbolFolders).toEqual(["Por Defecto"]);
  });

  it("RF-3 & RF-5: Operaciones de gestión de galerías de símbolos: crear, renombrar en cascada, mover, copiar y borrado seguro", () => {
    let symbolFolders = ["Por Defecto"];
    let symbols = [
      { id: "s1", tag: "fuego", src: "blob:s1", folder: "Por Defecto" },
      { id: "s2", tag: "agua", src: "blob:s2", folder: "Por Defecto" },
    ];

    // 1. Crear nueva galería vacía "Costes de Maná"
    const newFolderName = "Costes de Maná";
    if (!symbolFolders.includes(newFolderName)) {
      symbolFolders = [...symbolFolders, newFolderName];
    }
    expect(symbolFolders).toEqual(["Por Defecto", "Costes de Maná"]);

    // 2. Mover s1 a "Costes de Maná"
    symbols = symbols.map((s) => (s.id === "s1" ? { ...s, folder: "Costes de Maná" } : s));
    expect(symbols.find((s) => s.id === "s1")?.folder).toBe("Costes de Maná");
    expect(symbols.find((s) => s.id === "s2")?.folder).toBe("Por Defecto");

    // 3. Copiar s1 a "Por Defecto" generando nuevo ID y tag único
    const symbolToCopy = symbols.find((s) => s.id === "s1")!;
    let targetTag = symbolToCopy.tag;
    let counter = 2;
    while (symbols.some((s) => s.tag.toLowerCase() === targetTag.toLowerCase())) {
      targetTag = `${symbolToCopy.tag}_${counter}`;
      counter++;
    }
    const copiedSymbol = {
      id: "s1_copy_999",
      tag: targetTag,
      src: symbolToCopy.src,
      folder: "Por Defecto",
    };
    symbols = [...symbols, copiedSymbol];

    expect(symbols).toHaveLength(3);
    expect(copiedSymbol.tag).toBe("fuego_2");
    expect(symbols.filter((s) => s.folder === "Por Defecto")).toHaveLength(2);
    expect(symbols.filter((s) => s.folder === "Costes de Maná")).toHaveLength(1);

    // 4. Renombrar "Costes de Maná" a "Elementos" en cascada
    const oldName = "Costes de Maná";
    const renamed = "Elementos";
    symbolFolders = symbolFolders.map((f) => (f === oldName ? renamed : f));
    symbols = symbols.map((s) => (s.folder === oldName ? { ...s, folder: renamed } : s));

    expect(symbolFolders).toEqual(["Por Defecto", "Elementos"]);
    expect(symbols.find((s) => s.id === "s1")?.folder).toBe("Elementos");

    // 5. Borrado seguro de "Elementos": reubica sus símbolos a "Por Defecto"
    const folderToDelete = "Elementos";
    symbols = symbols.map((s) =>
      s.folder === folderToDelete ? { ...s, folder: "Por Defecto" } : s
    );
    symbolFolders = symbolFolders.filter((f) => f !== folderToDelete);

    expect(symbolFolders).toEqual(["Por Defecto"]);
    expect(symbols.every((s) => s.folder === "Por Defecto")).toBe(true);
  });

  it("RF-6: Separadores de alto contraste en Popover de Símbolos en App.tsx, EditCardModal.tsx y App.css", () => {
    const cssPath = path.resolve(__dirname, "App.css");
    const cssContent = fs.readFileSync(cssPath, "utf-8");
    const appPath = path.resolve(__dirname, "App.tsx");
    const appContent = fs.readFileSync(appPath, "utf-8");
    const modalPath = path.resolve(__dirname, "EditCardModal.tsx");
    const modalContent = fs.readFileSync(modalPath, "utf-8");

    // 1. App.css define .symbols-helper-section-header con fondo oscuro y texto claro
    expect(cssContent).toContain(".symbols-helper-section-header");
    expect(cssContent).toContain("background-color: var(--bg-card");
    expect(cssContent).toContain("color: var(--accent-primary");

    // 2. App.tsx utiliza symbolFolders y symbols-helper-section-header
    expect(appContent).toContain("symbols-helper-section-header");
    expect(appContent).toContain("symbolFolders.map((folder)");

    // 3. EditCardModal.tsx utiliza symbolFolders y symbols-helper-section-header
    expect(modalContent).toContain("symbols-helper-section-header");
    expect(modalContent).toContain("symbolFolders.map((folder)");
  });
});
