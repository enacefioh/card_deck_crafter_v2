import { describe, it, expect } from "vitest";
import { calcularDistribucion, cloneLayerTreeWithNewIds, calculateAutoDimensionsForFreeContainer } from "./layoutEngine";
import type { CanvasConfig, CardConfig, Carta } from "./layoutEngine";

describe("layoutEngine - Motor de Maquetación", () => {
  const canvasA4: CanvasConfig = {
    tipo: "A4",
    anchoMm: 210,
    altoMm: 297,
    orientacion: "vertical",
    margenTopMm: 10,
    margenBottomMm: 10,
    margenLeftMm: 10,
    margenRightMm: 10,
    lineasCorteContinuas: false,
    marcasCorteEsquinas: false,
  };

  const cardPoker: CardConfig = {
    anchoMm: 63.5,
    altoMm: 88.9,
    espaciadoXMm: 0,
    espaciadoYMm: 0,
    sangradoMm: 0,
    bordeCorteMm: 0,
    bordeCorteColor: "#000000",
  };

  it("debe calcular exactamente 2 columnas y 3 filas (6 cartas por página, total 2 páginas) en una hoja A4 Vertical con márgenes de 10mm", () => {
    const cartas: Carta[] = [
      { id: "1", nombre: "Carta 1", imagenFrontal: "front1.png", imagenTrasera: null, cantidad: 9 },
    ];

    const { paginasFrontales, paginasTraseras } = calcularDistribucion(canvasA4, cardPoker, cartas);

    expect(paginasFrontales.length).toBe(2);
    expect(paginasTraseras.length).toBe(0);
    expect(paginasFrontales[0].slots.length).toBe(6);
    expect(paginasFrontales[1].slots.length).toBe(3);
  });

  it("debe calcular exactamente 3 columnas y 3 filas (9 cartas) en una hoja A4 Vertical con márgenes de 9mm", () => {
    const canvasA4Ajustado: CanvasConfig = {
      ...canvasA4,
      margenLeftMm: 9,
      margenRightMm: 9,
      margenTopMm: 15,
      margenBottomMm: 15,
    };

    const cartas: Carta[] = [
      { id: "1", nombre: "Carta 1", imagenFrontal: "front1.png", imagenTrasera: null, cantidad: 9 },
    ];

    const { paginasFrontales } = calcularDistribucion(canvasA4Ajustado, cardPoker, cartas);

    expect(paginasFrontales.length).toBe(1);
    expect(paginasFrontales[0].slots.length).toBe(9);

    const slots = paginasFrontales[0].slots;
    expect(slots[0].xMm).toBeCloseTo(9.75, 2);
    expect(slots[0].yMm).toBeCloseTo(15.15, 2);

    expect(slots[2].xMm).toBeCloseTo(9.75 + 2 * 63.5, 2);
    expect(slots[6].yMm).toBeCloseTo(15.15 + 2 * 88.9, 2);
  });

  it("debe distribuir 12 cartas en 2 páginas frontales", () => {
    const canvasA4Ajustado: CanvasConfig = {
      ...canvasA4,
      margenLeftMm: 9,
      margenRightMm: 9,
      margenTopMm: 15,
      margenBottomMm: 15,
    };

    const cartas: Carta[] = [
      { id: "1", nombre: "Carta A", imagenFrontal: "frontA.png", imagenTrasera: null, cantidad: 7 },
      { id: "2", nombre: "Carta B", imagenFrontal: "frontB.png", imagenTrasera: null, cantidad: 5 },
    ];

    const { paginasFrontales } = calcularDistribucion(canvasA4Ajustado, cardPoker, cartas);

    expect(paginasFrontales.length).toBe(2);
    expect(paginasFrontales[0].slots.length).toBe(9);
    expect(paginasFrontales[1].slots.length).toBe(3);

    expect(paginasFrontales[0].slots[0].cartaId).toBe("1");
    expect(paginasFrontales[0].slots[6].cartaId).toBe("1");
    expect(paginasFrontales[0].slots[7].cartaId).toBe("2");
    expect(paginasFrontales[1].slots[2].cartaId).toBe("2");
  });

  it("debe invertir horizontalmente las columnas para las páginas traseras de forma simétrica", () => {
    const canvasA4Ajustado: CanvasConfig = {
      ...canvasA4,
      margenLeftMm: 9,
      margenRightMm: 9,
      margenTopMm: 15,
      margenBottomMm: 15,
    };

    const cartas: Carta[] = [
      { id: "A", nombre: "Carta A", imagenFrontal: "fA.png", imagenTrasera: "tA.png", cantidad: 1 },
      { id: "B", nombre: "Carta B", imagenFrontal: "fB.png", imagenTrasera: "tB.png", cantidad: 1 },
      { id: "C", nombre: "Carta C", imagenFrontal: "fC.png", imagenTrasera: "tC.png", cantidad: 1 },
    ];

    const { paginasFrontales, paginasTraseras } = calcularDistribucion(
      canvasA4Ajustado,
      cardPoker,
      cartas,
      "individual"
    );

    expect(paginasFrontales.length).toBe(1);
    expect(paginasTraseras.length).toBe(1);

    const slotsF = paginasFrontales[0].slots;
    const slotsT = paginasTraseras[0].slots;

    expect(slotsF[0].cartaId).toBe("A");
    expect(slotsF[1].cartaId).toBe("B");
    expect(slotsF[2].cartaId).toBe("C");

    expect(slotsT[0].cartaId).toBe("C");
    expect(slotsT[1].cartaId).toBe("B");
    expect(slotsT[2].cartaId).toBe("A");

    const anchoHoja = canvasA4Ajustado.anchoMm;
    expect(slotsT[0].xMm).toBeCloseTo(anchoHoja - (slotsF[2].xMm + slotsF[2].anchoMm), 2);
    expect(slotsT[1].xMm).toBeCloseTo(anchoHoja - (slotsF[1].xMm + slotsF[1].anchoMm), 2);
    expect(slotsT[2].xMm).toBeCloseTo(anchoHoja - (slotsF[0].xMm + slotsF[0].anchoMm), 2);

    expect(slotsT[0].imagenSrc).toBe("tC.png");
    expect(slotsT[2].imagenSrc).toBe("tA.png");
  });

  it("debe calcular exactamente 6 columnas y 3 filas (18 cartas) en una hoja A3 Horizontal", () => {
    const canvasA3: CanvasConfig = {
      tipo: "A3",
      anchoMm: 420,
      altoMm: 297,
      orientacion: "horizontal",
      margenTopMm: 10,
      margenBottomMm: 10,
      margenLeftMm: 10,
      margenRightMm: 10,
      lineasCorteContinuas: false,
      marcasCorteEsquinas: false,
    };

    const cardPokerConEspacio: CardConfig = {
      ...cardPoker,
      espaciadoXMm: 2,
      espaciadoYMm: 2,
    };

    const cartas: Carta[] = [
      { id: "X", nombre: "Carta X", imagenFrontal: "fX.png", imagenTrasera: null, cantidad: 18 },
    ];

    const { paginasFrontales } = calcularDistribucion(canvasA3, cardPokerConEspacio, cartas);

    expect(paginasFrontales.length).toBe(1);
    expect(paginasFrontales[0].slots.length).toBe(18);

    const slots = paginasFrontales[0].slots;

    expect(slots[0].xMm).toBeCloseTo(14.5, 2);
    expect(slots[0].yMm).toBeCloseTo(13.15, 2);

    expect(slots[5].xMm).toBeCloseTo(14.5 + 5 * (63.5 + 2), 2);
    expect(slots[12].yMm).toBeCloseTo(13.15 + 2 * (88.9 + 2), 2);
  });

  it("TKT-047: debe asignar correctamente la imagenTrasera de cada carta en los slots traseros incluso cuando modoTraseras es comun o individual", () => {
    const cartas: Carta[] = [
      { id: "1", nombre: "Carta 1", imagenFrontal: "front1.png", imagenTrasera: "back1.png", cantidad: 1 },
      { id: "2", nombre: "Carta 2", imagenFrontal: "front2.png", imagenTrasera: "back2.png", cantidad: 1 },
    ];

    const { paginasTraseras } = calcularDistribucion(canvasA4, cardPoker, cartas, "comun", null);

    expect(paginasTraseras.length).toBe(1);
    expect(paginasTraseras[0].slots.length).toBe(2);
    // En las páginas traseras, el orden horizontal se invierte para simetría
    expect(paginasTraseras[0].slots[0].cartaId).toBe("2");
    expect(paginasTraseras[0].slots[0].imagenSrc).toBe("back2.png");
    expect(paginasTraseras[0].slots[1].cartaId).toBe("1");
    expect(paginasTraseras[0].slots[1].imagenSrc).toBe("back1.png");
  });

  it("SRS-072: cloneLayerTreeWithNewIds debe clonar recursivamente capas y generar nuevos IDs consistentes", () => {
    const rootCapa = {
      id: "root_1",
      nombre: "Item Raíz",
      tipo: "container",
      parentCapaId: null
    };
    const descendants = [
      { id: "child_1", nombre: "Texto", tipo: "text", parentCapaId: "root_1" },
      { id: "child_2", nombre: "Icono", tipo: "image", parentCapaId: "root_1" }
    ];

    const result = cloneLayerTreeWithNewIds(rootCapa, descendants, "list_parent_123");

    expect(result.newRoot.id).not.toBe("root_1");
    expect(result.newRoot.parentCapaId).toBe("list_parent_123");
    expect(result.newDescendants.length).toBe(2);
    expect(result.newDescendants[0].id).not.toBe("child_1");
    expect(result.newDescendants[0].parentCapaId).toBe(result.newRoot.id);
    expect(result.newDescendants[1].id).not.toBe("child_2");
    expect(result.newDescendants[1].parentCapaId).toBe(result.newRoot.id);
  });

  describe("calculateAutoDimensionsForFreeContainer (TKT-053)", () => {
    it("ajusta el ancho a la x del hijo más a la derecha + ancho, y el alto a la y más abajo + alto", () => {
      const container = {
        id: "cont_free",
        tipo: "container",
        layout: "none",
        borderLeftWidth: 1,
        borderRightWidth: 1,
        borderTopWidth: 2,
        borderBottomWidth: 2,
      };

      const allLayers = [
        container,
        {
          id: "child_1",
          parentCapaId: "cont_free",
          xMm: 10,
          yMm: 5,
          anchoMm: 30, // x + w = 40
          altoMm: 20, // y + h = 25
        },
        {
          id: "child_2",
          parentCapaId: "cont_free",
          xMm: 25,
          yMm: 15,
          anchoMm: 40, // x + w = 65 (máximo ancho)
          altoMm: 10, // y + h = 25
        },
        {
          id: "child_3",
          parentCapaId: "cont_free",
          xMm: 5,
          yMm: 30,
          anchoMm: 10, // x + w = 15
          altoMm: 15, // y + h = 45 (máximo alto)
        },
        {
          id: "child_other_parent",
          parentCapaId: "other_container",
          xMm: 100,
          yMm: 100,
          anchoMm: 50,
          altoMm: 50,
        }
      ];

      const dims = calculateAutoDimensionsForFreeContainer(container, allLayers);

      // maxX = 65, borderLeft(1) + borderRight(1) = 2 => autoWidth = 67
      expect(dims.autoWidthMm).toBe(67);
      // maxY = 45, borderTop(2) + borderBottom(2) = 4 => autoHeight = 49
      expect(dims.autoHeightMm).toBe(49);
    });

    it("ignora hijos con visibilidad 'collapsed'", () => {
      const container = {
        id: "cont_free",
        tipo: "container",
        layout: "none",
      };

      const allLayers = [
        container,
        {
          id: "child_normal",
          parentCapaId: "cont_free",
          xMm: 0,
          yMm: 0,
          anchoMm: 20,
          altoMm: 20,
        },
        {
          id: "child_collapsed",
          parentCapaId: "cont_free",
          visibility: "collapsed",
          xMm: 50,
          yMm: 50,
          anchoMm: 30,
          altoMm: 30,
        }
      ];

      const dims = calculateAutoDimensionsForFreeContainer(container, allLayers);
      expect(dims.autoWidthMm).toBe(20);
      expect(dims.autoHeightMm).toBe(20);
    });

    it("aplica overrides dinámicos en la posición y dimensiones de los hijos", () => {
      const container = {
        id: "cont_free",
        tipo: "container",
        layout: "none",
      };

      const allLayers = [
        container,
        {
          id: "child_1",
          parentCapaId: "cont_free",
          xMm: 0,
          yMm: 0,
          anchoMm: 10,
          altoMm: 10,
        }
      ];

      const overrides = {
        child_1: {
          xMm: 15,
          anchoMm: 25, // x + w = 40
          altoMm: 35, // y + h = 35
        }
      };

      const dims = calculateAutoDimensionsForFreeContainer(container, allLayers, overrides);
      expect(dims.autoWidthMm).toBe(40);
      expect(dims.autoHeightMm).toBe(35);
    });

    it("calcula recursivamente contenedores libres anidados", () => {
      const parentContainer = {
        id: "parent_cont",
        tipo: "container",
        layout: "none",
      };

      const childContainer = {
        id: "child_cont",
        parentCapaId: "parent_cont",
        tipo: "container",
        layout: "none",
        xMm: 10,
        yMm: 10,
        anchoMm: "auto",
        altoMm: "auto",
      };

      const grandChild = {
        id: "grand_child",
        parentCapaId: "child_cont",
        xMm: 5,
        yMm: 5,
        anchoMm: 20,
        altoMm: 25,
      };

      const allLayers = [parentContainer, childContainer, grandChild];

      const parentDims = calculateAutoDimensionsForFreeContainer(parentContainer, allLayers);
      // childCont: autoWidth = 5 + 20 = 25, autoHeight = 5 + 25 = 30
      // parentCont: autoWidth = 10 + 25 = 35, autoHeight = 10 + 30 = 40
      expect(parentDims.autoWidthMm).toBe(35);
      expect(parentDims.autoHeightMm).toBe(40);
    });

    it("calcula dimensiones de contenedor libre con hijo texto en alto 'auto' sumando la posición inicial yMm", () => {
      const container = {
        id: "parent_cont",
        tipo: "container",
        layout: "none",
        altoMm: "auto",
        anchoMm: 60,
      };

      const textChild = {
        id: "child_text",
        parentCapaId: "parent_cont",
        tipo: "text",
        xMm: 5,
        yMm: 10,
        anchoMm: 50,
        altoMm: "auto",
        fontSizePt: 12,
        contenidoRaw: "Texto de prueba",
      };

      const allLayers = [container, textChild];
      const dims = calculateAutoDimensionsForFreeContainer(container, allLayers);

      // El texto de 12pt tiene una altura estimada >= 8.46mm (línea con interlineado)
      // El contenedor debe sumar yMm (10) + textHeight (>= 8.46) = >= 18.46mm
      expect(dims.autoHeightMm).toBeGreaterThanOrEqual(18.46);
      expect(dims.autoWidthMm).toBe(55); // xMm (5) + anchoMm (50)
    });

    it("calcula contenedor libre con hijo texto en ancho 'auto' y alto 'auto' sumando xMm e yMm", () => {
      const container = {
        id: "parent_cont",
        tipo: "container",
        layout: "none",
        altoMm: "auto",
        anchoMm: "auto",
      };

      const textChild = {
        id: "child_text",
        parentCapaId: "parent_cont",
        tipo: "text",
        xMm: 12,
        yMm: 8,
        anchoMm: "auto",
        altoMm: "auto",
        fontSizePt: 12,
        contenidoRaw: "Texto corto",
      };

      const allLayers = [container, textChild];
      const dims = calculateAutoDimensionsForFreeContainer(container, allLayers);

      // xMm (12) + ancho estimado del texto (> 10mm)
      expect(dims.autoWidthMm).toBeGreaterThan(22);
      // yMm (8) + alto estimado del texto (>= 8.46mm)
      expect(dims.autoHeightMm).toBeGreaterThanOrEqual(16.46);
    });

    it("calcula contenedor libre con hijo flex container que tiene alto 'auto'", () => {
      const freeParent = {
        id: "free_parent",
        tipo: "container",
        layout: "none",
        altoMm: "auto",
        anchoMm: "auto",
      };

      const flexChild = {
        id: "flex_child",
        parentCapaId: "free_parent",
        tipo: "container",
        layout: "vertical",
        xMm: 4,
        yMm: 6,
        anchoMm: "auto",
        altoMm: "auto",
      };

      const item1 = {
        id: "item_1",
        parentCapaId: "flex_child",
        tipo: "block",
        anchoMm: 30,
        altoMm: 15,
      };

      const item2 = {
        id: "item_2",
        parentCapaId: "flex_child",
        tipo: "block",
        anchoMm: 25,
        altoMm: 20,
      };

      const allLayers = [freeParent, flexChild, item1, item2];
      const dims = calculateAutoDimensionsForFreeContainer(freeParent, allLayers);

      // flexChild vertical: width = max(30, 25) = 30, height = 15 + 20 = 35
      // freeParent: width = 4 + 30 = 34, height = 6 + 35 = 41
      expect(dims.autoWidthMm).toBe(34);
      expect(dims.autoHeightMm).toBe(41);
    });
  });
});
