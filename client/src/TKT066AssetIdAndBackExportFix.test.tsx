// @vitest-environment happy-dom
import { describe, it, expect, vi, afterEach } from "vitest";
import JSZip from "jszip";
import * as htmlToImage from "html-to-image";
import {
  generarProyectoZip,
  limpiarIdRecurso,
  esRecursoPlantillaCorruptoEnGaleria,
  normalizarEsquemaRecurso,
} from "./services/projectZipService";
import { exportarProyectoPngEnCliente } from "./services/clientPngExportService";
import { extractZipSafely, resolverRutaAssetFisica } from "../../server/src/engine/cardRenderer";
import AdmZip from "adm-zip";
import fs from "fs-extra";
import path from "path";
import os from "os";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("TKT-066: Prevención de corrupción de IDs de recursos, saneamiento ZIP y exportación PNG de reversos", () => {
  it("limpiarIdRecurso y normalizarEsquemaRecurso eliminan prefijos redundantes y recuperan esquemas asset:// corruptos", () => {
    expect(limpiarIdRecurso("u_asset_u_asset_asset://tmpl_asset_1794158268902_pkrlw.png")).toBe(
      "tmpl_asset_1794158268902_pkrlw"
    );
    expect(limpiarIdRecurso("tmpl_asset_tmpl_asset_tmpl_asset_1794158268902_pkrlw")).toBe(
      "tmpl_asset_1794158268902_pkrlw"
    );
    expect(limpiarIdRecurso("u_asset_u_asset_user_asset_1794158385355_j3d6f")).toBe(
      "user_asset_1794158385355_j3d6f"
    );
    expect(limpiarIdRecurso("p_asset_p_asset_override_card_123")).toBe(
      "p_asset_override_card_123"
    );

    expect(
      normalizarEsquemaRecurso("user_asset://u_asset_asset://tmpl_asset_1794158268902_pkrlw.png")
    ).toBe("asset://tmpl_asset_1794158268902_pkrlw.png");

    expect(
      esRecursoPlantillaCorruptoEnGaleria({
        id: "u_asset_asset://tmpl_asset_1794158268902_pkrlw",
        src: "user_asset://u_asset_asset://tmpl_asset_1794158268902_pkrlw.png",
      })
    ).toBe(true);
  });

  it("generarProyectoZip prioriza recursos de plantilla frente a galerías y limpia entradas corruptas", async () => {
    const sharedBlobUrl = "blob:http://localhost:5173/shared-yellow-frame";
    vi.spyOn(global, "fetch").mockImplementation(() =>
      Promise.resolve({
        ok: true,
        blob: () => Promise.resolve(new Blob(["fake-png-binary"], { type: "image/png" })),
      } as Response)
    );

    const zipBlob = await generarProyectoZip({
      nombreProyecto: "Test TKT-066",
      importedTemplates: [
        {
          id: "tpl_efecto",
          nombre: "Efecto Frontal",
          capas: [
            {
              id: "layer_color",
              nombre: "color",
              tipo: "image-switch",
              src: sharedBlobUrl,
              options: [
                {
                  id: "tmpl_asset_1794158268902_pkrlw",
                  nombre: "marco_mejora_amarillo.png",
                  src: sharedBlobUrl,
                },
              ],
            },
          ],
        },
      ],
      templateAssets: [
        {
          id: "tmpl_asset_tmpl_asset_1794158268902_pkrlw",
          nombre: "marco_mejora_amarillo.png",
          src: sharedBlobUrl,
        },
      ],
      userAssets: [
        {
          id: "u_asset_asset://tmpl_asset_1794158268902_pkrlw",
          nombre: "marco_mejora_amarillo.png",
          src: sharedBlobUrl,
        },
      ],
      projectAssets: [
        {
          id: "p_asset_asset://tmpl_asset_1794158268902_pkrlw",
          nombre: "marco_mejora_amarillo.png",
          src: sharedBlobUrl,
        },
      ],
      documentos: [
        {
          id: "doc_1",
          nombre: "Mejoras",
          cards: [
            {
              id: "card_1",
              nombre: "Carta Amarilla",
              plantillaId: "tpl_efecto",
              imagenTrasera: null,
              cantidad: 1,
              valoresCampos: {},
              capasOverrides: {
                layer_color: {
                  src: "user_asset://u_asset_asset://tmpl_asset_1794158268902_pkrlw.png",
                },
              },
            },
          ],
          modoTraseras: "comun",
          imagenTraseraComun: null,
        } as any,
      ],
      activeDocumentoId: "doc_1",
    });

    const loadedZip = await JSZip.loadAsync(zipBlob);
    const fileNames = Object.keys(loadedZip.files);

    // No debe existir ninguna ruta con ':' en el ZIP
    expect(fileNames.some((f) => f.includes(":"))).toBe(false);

    // El recurso debe estar en assets/tmpl_asset_1794158268902_pkrlw.png sin duplicar prefijo
    expect(loadedZip.file("assets/tmpl_asset_1794158268902_pkrlw.png")).not.toBeNull();

    const projectJsonText = await loadedZip.file("project.json")!.async("string");
    const projectJson = JSON.parse(projectJsonText);

    // La opción amarilla del switch debe apuntar a asset://tmpl_asset_1794158268902_pkrlw.png
    const switchLayer = projectJson.templates["tpl_efecto"].capas[0];
    expect(switchLayer.src).toBe("asset://tmpl_asset_1794158268902_pkrlw.png");
    expect(switchLayer.options[0].src).toBe("asset://tmpl_asset_1794158268902_pkrlw.png");

    // El override de la carta debe haberse normalizado a asset://
    expect(projectJson.documentos[0].cards[0].capasOverrides.layer_color.src).toBe(
      "asset://tmpl_asset_1794158268902_pkrlw.png"
    );

    // El recurso de plantilla corrupto no debe estar en userAssets ni projectAssets
    expect(projectJson.userAssets.length).toBe(0);
    expect(projectJson.projectAssets.length).toBe(0);
  });

  it("exportarProyectoPngEnCliente renderiza plantillaTraseraId cuando modoTraseras es 'comun' e imagenTraseraComun es null", async () => {
    const validPngBytes = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10, 1, 2, 3, 4]);
    const toBlobSpy = vi
      .spyOn(htmlToImage, "toBlob")
      .mockResolvedValue(new Blob([validPngBytes], { type: "image/png" }));

    const zipBlob = await exportarProyectoPngEnCliente({
      nombreProyecto: "DBZ Test",
      templatesMap: {
        tpl_front: {
          id: "tpl_front",
          nombre: "Frontal",
          capas: [{ id: "l1", tipo: "text", nombre: "Titulo", contenidoRaw: "Kamehameha" }],
          camposConfig: [],
        } as any,
        tpl_back: {
          id: "tpl_back",
          nombre: "Reverso Mejora",
          capas: [{ id: "l2", tipo: "text", nombre: "Reverso", contenidoRaw: "DBZ Back" }],
          camposConfig: [],
        } as any,
      },
      documentos: [
        {
          id: "doc_mejoras",
          nombre: "Mejoras",
          modoTraseras: "comun",
          imagenTraseraComun: null,
          cards: [
            {
              id: "c1",
              nombre: "Mejora 1",
              plantillaId: "tpl_front",
              plantillaTraseraId: "tpl_back",
              imagenTrasera: null,
              cantidad: 1,
              valoresCampos: {},
              capasOverrides: {},
            },
            {
              id: "c2",
              nombre: "Mejora 2",
              plantillaId: "tpl_front",
              plantillaTraseraId: "tpl_back",
              imagenTrasera: null,
              cantidad: 1,
              valoresCampos: {},
              capasOverrides: {},
            },
          ],
        } as any,
      ],
      activeDocumentoId: "doc_mejoras",
      exportOptions: {
        docScope: "documento_activo",
        cardScope: "todas",
        facesScope: "ambas",
      },
    });

    const loadedZip = await JSZip.loadAsync(zipBlob);
    const back1 = loadedZip.file("Mejoras/carta001-T.png");
    const back2 = loadedZip.file("Mejoras/carta002-T.png");

    expect(back1).not.toBeNull();
    expect(back2).not.toBeNull();

    const back1Content = await back1!.async("uint8array");
    const back1Text = await back1!.async("string");

    // No debe ser el texto corrupto "dummy_back_png_data"
    expect(back1Text).not.toBe("dummy_back_png_data");
    expect(back1Content.byteLength).toBe(validPngBytes.byteLength);

    // Al compartir la misma plantilla trasera sin overrides, se cachea la trasera común de plantilla (2 frontales + 1 trasera = 3 capturas)
    expect(toBlobSpy).toHaveBeenCalledTimes(3);
  });

  it("extractZipSafely y resolverRutaAssetFisica extraen archivos con dos puntos sin error ENOENT y resuelven rutas corruptas", () => {
    const zip = new AdmZip();
    const pngBytes = Buffer.from("fake-png-content");
    // Añadir entrada corrupta con ':' que haría fallar a zip.extractAllTo
    zip.addFile("user_assets/u_asset_u_asset_asset:/tmpl_asset_1794158268902_pkrlw.png", pngBytes);

    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "tkt066-test-"));
    try {
      expect(() => extractZipSafely(zip, tempDir)).not.toThrow();

      // El archivo rescatado debe haberse extraído en assets/tmpl_asset_1794158268902_pkrlw.png
      const rescuedPath = path.join(tempDir, "assets", "tmpl_asset_1794158268902_pkrlw.png");
      expect(fs.existsSync(rescuedPath)).toBe(true);

      const expectedFileUrl = `file:///${rescuedPath.replace(/\\/g, "/")}`;

      // resolverRutaAssetFisica debe resolver tanto la ruta limpia como la corrupta hacia el archivo físico rescatado
      const resolvedCorrupt = resolverRutaAssetFisica(
        "user_asset://u_asset_asset://tmpl_asset_1794158268902_pkrlw.png",
        tempDir
      );
      expect(resolvedCorrupt).toBe(expectedFileUrl);

      const resolvedDupPrefix = resolverRutaAssetFisica(
        "asset://tmpl_asset_tmpl_asset_1794158268902_pkrlw.png",
        tempDir
      );
      expect(resolvedDupPrefix).toBe(expectedFileUrl);
    } finally {
      fs.removeSync(tempDir);
    }
  });
});
