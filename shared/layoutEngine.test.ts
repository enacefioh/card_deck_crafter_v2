import { describe, it, expect } from "vitest";
import { calcularDistribucion } from "./layoutEngine";
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
});
