// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach } from "vitest";
import JSZip from "jszip";
import { exportarProyectoPngEnCliente, type ExportProgressInfo } from "./clientPngExportService";
import type { DocumentoCDC2 } from "shared";

// Mock de html-to-image para entorno de test sin canvas nativo
vi.mock("html-to-image", () => ({
  toBlob: vi.fn().mockImplementation(() => {
    return Promise.resolve(new Blob(["fake_png_binary_data"], { type: "image/png" }));
  })
}));

describe("SRS-089: Motor de Exportación PNG en Cliente a 300 DPI", () => {
  const dummyDoc: DocumentoCDC2 = {
    id: "doc_test",
    nombre: "Baraja Principal",
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
      marcasCorteEsquinas: true
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
      reducirArteAlBorde: false
    },
    modoTraseras: "comun",
    imagenTraseraComun: "data:image/png;base64,trasera_comun",
    cards: [
      {
        id: "card_1",
        nombre: "Caballero",
        imagenFrontal: "data:image/png;base64,caballero",
        imagenTrasera: null,
        cantidad: 2
      },
      {
        id: "card_2",
        nombre: "Mago",
        imagenFrontal: "data:image/png;base64,mago",
        imagenTrasera: null,
        cantidad: 1
      }
    ]
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("lanza un error si el proyecto no tiene documentos o cartas", async () => {
    await expect(
      exportarProyectoPngEnCliente({ documentos: [] })
    ).rejects.toThrow("No hay documentos en el proyecto");

    await expect(
      exportarProyectoPngEnCliente({
        documentos: [{ ...dummyDoc, cards: [] }]
      })
    ).rejects.toThrow("no contiene cartas");
  });

  it("genera un archivo ZIP con la estructura de carpetas, cartas D/T e info.txt", async () => {
    const progressList: ExportProgressInfo[] = [];

    const zipBlob = await exportarProyectoPngEnCliente({
      documentos: [dummyDoc],
      nombreProyecto: "Mazo Magia",
      onProgress: (p) => progressList.push(p)
    });

    expect(zipBlob).toBeInstanceOf(Blob);

    // Leer contenido del ZIP generado
    const zip = await JSZip.loadAsync(zipBlob);
    const files = Object.keys(zip.files);

    // Debe contener carpeta Baraja_Principal
    expect(files.some((f) => f.startsWith("Baraja_Principal/"))).toBe(true);

    // Debe contener info.txt
    expect(files).toContain("Baraja_Principal/info.txt");

    // Con cantidad: 2 en carta 1 y cantidad: 1 en carta 2 -> 3 cartas físicas:
    // carta001-D, carta001-T, carta002-D, carta002-T, carta003-D, carta003-T
    expect(files).toContain("Baraja_Principal/carta001-D.png");
    expect(files).toContain("Baraja_Principal/carta001-T.png");
    expect(files).toContain("Baraja_Principal/carta002-D.png");
    expect(files).toContain("Baraja_Principal/carta002-T.png");
    expect(files).toContain("Baraja_Principal/carta003-D.png");
    expect(files).toContain("Baraja_Principal/carta003-T.png");

    // Verificar contenido de info.txt
    const infoContent = await zip.file("Baraja_Principal/info.txt")!.async("string");
    expect(infoContent).toContain("Baraja Principal");
    expect(infoContent).toContain("Cartas únicas en lista: 2");
    expect(infoContent).toContain("Cartas totales procesadas (con copias): 3");
    expect(infoContent).toContain("300 DPI");

    // Verificar reporte de progreso
    expect(progressList.length).toBeGreaterThan(0);
    expect(progressList[progressList.length - 1].porcentaje).toBe(100);
  });

  it("cancela la exportación de inmediato si se activa el AbortSignal", async () => {
    const controller = new AbortController();
    controller.abort();

    await expect(
      exportarProyectoPngEnCliente({
        documentos: [dummyDoc],
        signal: controller.signal
      })
    ).rejects.toThrow("Exportación cancelada por el usuario");
  });
});
