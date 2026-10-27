// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach } from "vitest";
import JSZip from "jszip";
import { generarProyectoZip } from "./projectZipService";
import type { DocumentoCDC2 } from "shared";

describe("SRS-056: Servicio de Serialización de Proyectos ZIP (projectZipService)", () => {
  const dummyDoc: DocumentoCDC2 = {
    id: "doc_1",
    nombre: "Documento Principal",
    canvasConfig: {
      tipo: "A4",
      anchoMm: 210,
      altoMm: 297,
      orientacion: "vertical",
      margenTopMm: 8,
      margenBottomMm: 8,
      margenLeftMm: 8,
      margenRightMm: 8,
      lineasCorteContinuas: true,
      marcasCorteEsquinas: true,
    },
    cardConfig: {
      anchoMm: 63.5,
      altoMm: 88.9,
      espaciadoXMm: 0,
      espaciadoYMm: 0,
      sangradoMm: 0.5,
      bordeCorteMm: 0,
      bordeCorteColor: "#000000",
      modoAjuste: "contain",
      reducirArteAlBorde: false,
    },
    modoTraseras: "ninguno",
    imagenTraseraComun: null,
    cards: [
      {
        id: "c1",
        nombre: "Carta de Prueba",
        cantidad: 1,
        valoresCampos: {},
        capasOverrides: {},
        imagenTrasera: null,
      },
    ],
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("genera un archivo ZIP con project.json con estructura válida 2.1.0", async () => {
    const blob = await generarProyectoZip({
      documentos: [dummyDoc],
      activeDocumentoId: "doc_1",
      currentProjectId: "proj_test_123",
      nombreProyecto: "Mi Gran Proyecto",
      descripcionProyecto: "Descripción del proyecto",
      projectColors: [{ id: "col_1", nombre: "Rojo", valor: "#ff0000" }],
    });

    expect(blob).toBeInstanceOf(Blob);

    const zip = await JSZip.loadAsync(blob);
    expect(zip.file("project.json")).toBeTruthy();

    const projectJsonRaw = await zip.file("project.json")!.async("string");
    const projectJson = JSON.parse(projectJsonRaw);

    expect(projectJson.version).toBe("2.1.0");
    expect(projectJson.id).toBe("proj_test_123");
    expect(projectJson.meta.nombre).toBe("Mi Gran Proyecto");
    expect(projectJson.meta.descripcion).toBe("Descripción del proyecto");
    expect(projectJson.documentos).toHaveLength(1);
    expect(projectJson.documentos[0].id).toBe("doc_1");
    expect(projectJson.documentos[0].cards).toHaveLength(1);
    expect(projectJson.projectColors).toHaveLength(1);
  });

  it("empaqueta símbolos con el esquema symbol_asset:// y en la carpeta symbols/", async () => {
    vi.spyOn(global, "fetch").mockImplementation(() =>
      Promise.resolve({
        blob: () => Promise.resolve(new Blob(["mock_symbol_bytes"], { type: "image/png" })),
      } as any)
    );

    const blob = await generarProyectoZip({
      documentos: [dummyDoc],
      nombreProyecto: "Símbolos Test",
      projectSymbols: [
        { id: "sym_espada", tag: "espada", src: "blob:http://localhost/sym_1" },
      ],
    });

    const zip = await JSZip.loadAsync(blob);
    const files = Object.keys(zip.files);

    expect(files).toContain("symbols/sym_espada.png");

    const projectJson = JSON.parse(await zip.file("project.json")!.async("string"));
    expect(projectJson.projectSymbols[0].src).toBe("symbol_asset://sym_espada.png");
  });

  it("empaqueta recursos de usuario y de proyecto en user_assets/ y project_assets/", async () => {
    vi.spyOn(global, "fetch").mockImplementation(() =>
      Promise.resolve({
        blob: () => Promise.resolve(new Blob(["mock_asset_bytes"], { type: "image/png" })),
      } as any)
    );

    const blob = await generarProyectoZip({
      documentos: [dummyDoc],
      nombreProyecto: "Assets Test",
      userAssets: [{ id: "u_asset_1", nombre: "Foto Usuario", src: "blob:http://localhost/user1" }],
      projectAssets: [{ id: "p_asset_1", nombre: "Foto Proyecto", src: "blob:http://localhost/proj1" }],
    });

    const zip = await JSZip.loadAsync(blob);
    const files = Object.keys(zip.files);

    expect(files).toContain("user_assets/u_asset_1.png");
    expect(files).toContain("project_assets/p_asset_1.png");

    const projectJson = JSON.parse(await zip.file("project.json")!.async("string"));
    expect(projectJson.userAssets[0].src).toBe("user_asset://u_asset_1.png");
    expect(projectJson.projectAssets[0].src).toBe("project_asset://p_asset_1.png");
  });

  it("empaqueta como plantilla (asTemplate: true) omitiendo userAssets y asignando meta tipo template", async () => {
    const blob = await generarProyectoZip({
      asTemplate: true,
      newId: "tmpl_test_custom",
      newName: "Plantilla Exportada",
      newDescription: "Desc Plantilla",
      documentos: [dummyDoc],
      nombreProyecto: "Ignorado",
      userAssets: [{ id: "u1", nombre: "Secreta", src: "blob:u1" }],
      importedTemplates: [
        {
          id: "tmpl_card_1",
          nombre: "Carta Marco",
          anchoMm: 63.5,
          altoMm: 88.9,
          capas: [],
          camposConfig: [],
        },
      ],
    });

    const zip = await JSZip.loadAsync(blob);
    const files = Object.keys(zip.files);

    // Debe contener la plantilla en templates/
    expect(files).toContain("templates/tmpl_card_1.json");

    const projectJson = JSON.parse(await zip.file("project.json")!.async("string"));
    expect(projectJson.id).toBe("tmpl_test_custom");
    expect(projectJson.meta.nombre).toBe("Plantilla Exportada");
    expect(projectJson.isTemplate).toBe(true);
    expect(projectJson.type).toBe("template");
    // Al ser plantilla, no debe incluir userAssets
    expect(projectJson.userAssets).toHaveLength(0);
    // Y no debe incluir cartas
    expect(projectJson.documentos[0].cards).toHaveLength(0);
  });
});
