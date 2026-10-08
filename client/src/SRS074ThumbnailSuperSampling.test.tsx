// @vitest-environment happy-dom
import { describe, it, expect, vi, afterEach } from "vitest";
import { cleanup } from "@testing-library/react";
import {
  generarMiniaturaPlantilla,
  limpiarTextoParaLienzo,
  dividirTextoEnLineas,
  medirAnchoTexto,
  resolverGeometriaCapa,
  THUMBNAIL_MAX_DIMENSION,
  THUMBNAIL_SUPERSAMPLE_FACTOR,
  THUMBNAIL_JPEG_QUALITY,
} from "./utils/thumbnailUtils";

describe("SRS-074: Renderizado en Alta Resolución y Super-Sampling (SSAA) para Miniaturas de Plantillas", () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  describe("1. Constantes y Configuración de Super-Sampling", () => {
    it("debe definir las constantes correctas para resolución, factor 4x y calidad JPEG 0.8", () => {
      expect(THUMBNAIL_MAX_DIMENSION).toBe(100);
      expect(THUMBNAIL_SUPERSAMPLE_FACTOR).toBe(4);
      expect(THUMBNAIL_JPEG_QUALITY).toBe(0.8);
    });
  });

  describe("2. Limpieza y Normalización de Textos (limpiarTextoParaLienzo)", () => {
    it("debe sustituir campos de plantilla por sus valores por defecto", () => {
      const campos = [
        { clave: "nombre", valorDefecto: "Paladín de la Luz" },
        { clave: "coste", valorDefecto: "3" },
      ];
      const resultado = limpiarTextoParaLienzo("Carta: {nombre} (Coste: {coste})", campos);
      expect(resultado).toBe("Carta: Paladín de la Luz (Coste: 3)");
    });

    it("debe limpiar llaves no resueltas con puntos suspensivos", () => {
      const resultado = limpiarTextoParaLienzo("Poder: {ataque_desconocido}");
      expect(resultado).toBe("Poder: ...");
    });

    it("debe convertir etiquetas <br> en saltos de línea \\n y eliminar HTML restante", () => {
      const resultado = limpiarTextoParaLienzo("Línea 1<br/>Línea 2<br><span>Línea 3</span>");
      expect(resultado).toBe("Línea 1\nLínea 2\nLínea 3");
    });

    it("debe limpiar sintaxis markdown (**negrita**, *cursiva*, __subrayado__, ++escala++)", () => {
      const resultado = limpiarTextoParaLienzo("Efecto: **++Daño Crítico++** en *fuego* y __hielo__");
      expect(resultado).toBe("Efecto: Daño Crítico en fuego y hielo");
    });
  });

  describe("3. Partición Multilínea y Salto de Palabras (dividirTextoEnLineas)", () => {
    it("debe respetar saltos de línea explícitos", () => {
      const mockCtx = {
        measureText: vi.fn((txt: string) => ({ width: txt.length * 8 })),
      } as any;

      const lineas = dividirTextoEnLineas(mockCtx, "Primera línea\nSegunda línea\nTercera línea", 200, 16);
      expect(lineas).toEqual(["Primera línea", "Segunda línea", "Tercera línea"]);
    });

    it("debe dividir palabras cuando la línea excede el ancho máximo", () => {
      const mockCtx = {
        measureText: vi.fn((txt: string) => ({ width: txt.length * 10 })),
      } as any;

      // "PalabraUno PalabraDos PalabraTres"
      // Longitudes: PalabraUno (10*10=100), con PalabraDos (21*10=210 > 150) -> parte tras PalabraUno
      const lineas = dividirTextoEnLineas(
        mockCtx,
        "PalabraUno PalabraDos PalabraTres",
        150,
        16
      );
      expect(lineas.length).toBeGreaterThanOrEqual(2);
      expect(lineas[0]).toBe("PalabraUno");
      expect(lineas[1]).toBe("PalabraDos");
      expect(lineas[2]).toBe("PalabraTres");
    });

    it("debe ser seguro con medirAnchoTexto si measureText no está disponible", () => {
      const mockCtxSinMeasure = {} as any;
      const ancho = medirAnchoTexto(mockCtxSinMeasure, "Hola", 10);
      expect(ancho).toBe(4 * 10 * 0.55); // 22px
    });
  });

  describe("4. Flujo Geométrico en Contenedores Flex (resolverGeometriaCapa)", () => {
    it("debe calcular posiciones Y acumulativas para elementos en contenedor vertical", () => {
      const capas = [
        {
          id: "cnt_vertical",
          tipo: "container",
          layout: "vertical",
          xMm: 10,
          yMm: 10,
          anchoMm: 50,
          altoMm: 60,
          paddingTopMm: 2,
          borderTopWidth: 1,
        },
        {
          id: "hijo_1",
          tipo: "text",
          parentCapaId: "cnt_vertical",
          altoMm: 15,
          anchoMm: 40,
        },
        {
          id: "hijo_2",
          tipo: "text",
          parentCapaId: "cnt_vertical",
          altoMm: 10,
          anchoMm: 40,
        },
      ];

      const cache = new Map();
      const geo1 = resolverGeometriaCapa(capas[1], capas, 63.5, 88.9, cache);
      const geo2 = resolverGeometriaCapa(capas[2], capas, 63.5, 88.9, cache);

      // hijo_1: y = 10 (padre) + 1 (border) + 2 (padding) = 13 mm
      expect(geo1.yMm).toBe(13);

      // hijo_2: y = 13 + 15 (altura hijo_1) = 28 mm
      expect(geo2.yMm).toBe(28);
    });

    it("debe calcular posiciones X acumulativas para elementos en contenedor horizontal", () => {
      const capas = [
        {
          id: "cnt_horizontal",
          tipo: "container",
          layout: "horizontal",
          xMm: 5,
          yMm: 5,
          anchoMm: 50,
          altoMm: 20,
          paddingLeftMm: 3,
          borderLeftWidth: 1,
        },
        {
          id: "icono_1",
          tipo: "image",
          parentCapaId: "cnt_horizontal",
          anchoMm: 12,
          altoMm: 12,
        },
        {
          id: "icono_2",
          tipo: "image",
          parentCapaId: "cnt_horizontal",
          anchoMm: 14,
          altoMm: 12,
        },
      ];

      const cache = new Map();
      const geo1 = resolverGeometriaCapa(capas[1], capas, 63.5, 88.9, cache);
      const geo2 = resolverGeometriaCapa(capas[2], capas, 63.5, 88.9, cache);

      // icono_1: x = 5 + 1 + 3 = 9 mm
      expect(geo1.xMm).toBe(9);

      // icono_2: x = 9 + 12 (ancho icono_1) = 21 mm
      expect(geo2.xMm).toBe(21);
    });
  });

  describe("5. Buffer de Alta Resolución (4x) y Downscaling Bicúbico (generarMiniaturaPlantilla)", () => {
    it("debe crear renderCanvas con dimensiones 4x y thumbCanvas con dimensiones <= 100px", async () => {
      const createdCanvases: HTMLCanvasElement[] = [];
      const mockGetContext = vi.fn().mockReturnValue({
        fillStyle: "",
        fillRect: vi.fn(),
        save: vi.fn(),
        restore: vi.fn(),
        beginPath: vi.fn(),
        rect: vi.fn(),
        clip: vi.fn(),
        fillText: vi.fn(),
        drawImage: vi.fn(),
        imageSmoothingEnabled: false,
        imageSmoothingQuality: "low",
      });
      const mockToDataURL = vi.fn().mockReturnValue("data:image/jpeg;base64,mockSuperSampleJpeg");

      const originalCreateElement = document.createElement.bind(document);
      vi.spyOn(document, "createElement").mockImplementation((tagName: string) => {
        if (tagName.toLowerCase() === "canvas") {
          const canvas = originalCreateElement("canvas") as HTMLCanvasElement;
          canvas.getContext = mockGetContext as any;
          canvas.toDataURL = mockToDataURL as any;
          createdCanvases.push(canvas);
          return canvas;
        }
        return originalCreateElement(tagName);
      });

      const plantilla = {
        id: "tmpl_test_ssaa",
        nombre: "Plantilla Super-Sample",
        anchoMm: 63.5,
        altoMm: 88.9,
        capas: [
          { id: "bg", tipo: "background", colorFill: "#1e293b" },
          {
            id: "titulo",
            tipo: "text",
            contenidoRaw: "Campeón de Leyenda",
            fontSizePt: 16,
            bold: true,
            xMm: 5,
            yMm: 5,
            anchoMm: 53.5,
            altoMm: 12,
          },
          {
            id: "desc",
            tipo: "text",
            contenidoRaw: "Descripción extensa en múltiples líneas de texto explicativo.",
            fontSizePt: 9,
            xMm: 5,
            yMm: 20,
            anchoMm: 53.5,
            altoMm: 30,
          },
        ],
      };

      const result = await generarMiniaturaPlantilla(plantilla);

      // Deben crearse al menos 2 canvas: 1 renderCanvas (4x) y 1 thumbCanvas (100px)
      expect(createdCanvases.length).toBe(2);

      const [renderCanvas, thumbCanvas] = createdCanvases;

      // Carta estándar 63.5 x 88.9 mm en miniatura máx 100px:
      // thumbH = 100, thumbW = Math.round((63.5 / 88.9) * 100) = 71 px
      expect(thumbCanvas.width).toBe(71);
      expect(thumbCanvas.height).toBe(100);

      // renderCanvas debe ser 4x las dimensiones de la miniatura
      expect(renderCanvas.width).toBe(71 * 4); // 284 px
      expect(renderCanvas.height).toBe(100 * 4); // 400 px

      // Verificar que se configuró suavizado bicúbico en alta calidad
      const thumbCtx = thumbCanvas.getContext("2d") as any;
      expect(thumbCtx.imageSmoothingEnabled).toBe(true);
      expect(thumbCtx.imageSmoothingQuality).toBe("high");

      // Verificar que se ejecutó drawImage para downscaling
      expect(thumbCtx.drawImage).toHaveBeenCalledWith(
        renderCanvas,
        0,
        0,
        284,
        400,
        0,
        0,
        71,
        100
      );

      // Verificar toDataURL con JPEG y calidad 0.8
      expect(thumbCanvas.toDataURL).toHaveBeenCalledWith("image/jpeg", 0.8);
      expect(result).toBe("data:image/jpeg;base64,mockSuperSampleJpeg");
    });
  });
});
