import { describe, it, expect } from "vitest";
import { calcularDistribucion } from "./layoutEngine";
import type { CanvasConfig, CardConfig, Carta } from "./layoutEngine";

describe("layoutEngine - Motor de Maquetación", () => {
  // Configuración de lienzo A4 por defecto (210 x 297 mm)
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

  // Configuración de carta estándar de Poker/Magic por defecto (63.5 x 88.9 mm)
  const cardPoker: CardConfig = {
    anchoMm: 63.5,
    altoMm: 88.9,
    espaciadoXMm: 0,
    espaciadoYMm: 0,
    sangradoMm: 0,
    bordeCorteMm: 0,
    bordeCorteColor: "#000000",
  };

  // 1. Test: Dimensiones y Límites (A4 Vertical, márgenes estándar de 10mm)
  it("debe calcular exactamente 2 columnas y 3 filas (6 cartas por página, total 2 páginas) en una hoja A4 Vertical con márgenes de 10mm", () => {
    const cartas: Carta[] = [
      { id: "1", nombre: "Carta 1", imagenFrontal: "front1.png", imagenTrasera: null, cantidad: 9 },
    ];

    const { paginasFrontales, paginasTraseras } = calcularDistribucion(canvasA4, cardPoker, cartas);

    expect(paginasFrontales.length).toBe(2);
    expect(paginasTraseras.length).toBe(0); // Sin traseras por defecto (modo "ninguno")
    expect(paginasFrontales[0].slots.length).toBe(6); // Cabe máximo 6 por página (2 col x 3 filas)
    expect(paginasFrontales[1].slots.length).toBe(3); // Las 3 restantes en la página 2
  });

  it("debe calcular exactamente 3 columnas y 3 filas (9 cartas) en una hoja A4 Vertical con márgenes de 9mm", () => {
    const canvasA4Ajustado: CanvasConfig = {
      ...canvasA4,
      margenLeftMm: 9,
      margenRightMm: 9,
      margenTopMm: 15, // Alto útil = 297 - 30 = 267. 3 * 88.9 = 266.7 (cabe perfectamente en 267)
      margenBottomMm: 15,
    };

    const cartas: Carta[] = [
      { id: "1", nombre: "Carta 1", imagenFrontal: "front1.png", imagenTrasera: null, cantidad: 9 },
    ];

    const { paginasFrontales } = calcularDistribucion(canvasA4Ajustado, cardPoker, cartas);

    expect(paginasFrontales.length).toBe(1);
    expect(paginasFrontales[0].slots.length).toBe(9);

    // Comprobar que los slots tienen las posiciones esperadas
    const slots = paginasFrontales[0].slots;
    
    // Grid ancho = 3 * 63.5 = 190.5. Útil = 210 - 18 = 192. SobranteX = 1.5. startX = 9 + 0.75 = 9.75
    // Grid alto = 3 * 88.9 = 266.7. Útil = 297 - 30 = 267. SobranteY = 0.3. startY = 15 + 0.15 = 15.15
    expect(slots[0].xMm).toBeCloseTo(9.75, 2);
    expect(slots[0].yMm).toBeCloseTo(15.15, 2);

    expect(slots[2].xMm).toBeCloseTo(9.75 + 2 * 63.5, 2); // Columna 3 (índice 2)
    expect(slots[6].yMm).toBeCloseTo(15.15 + 2 * 88.9, 2); // Fila 3 (índice 6 en lineal)
  });

  // 2. Test: Multi-página (Lote de 12 cartas, capacidad 9 por página, genera 2 páginas)
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
    expect(paginasFrontales[0].slots.length).toBe(9); // Primera página completa
    expect(paginasFrontales[1].slots.length).toBe(3); // Segunda página con las 3 restantes

    // Comprobar orden de los ids
    expect(paginasFrontales[0].slots[0].cartaId).toBe("1");
    expect(paginasFrontales[0].slots[6].cartaId).toBe("1");
    expect(paginasFrontales[0].slots[7].cartaId).toBe("2"); // Empieza la carta B
    expect(paginasFrontales[1].slots[2].cartaId).toBe("2"); // Última carta B
  });

  // 3. Test: Espejado de Traseras
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

    // Fila única de 3 columnas
    // Frente: Col 0 (A) -> Col 1 (B) -> Col 2 (C)
    // Reverso espejado: Col 0 (C) -> Col 1 (B) -> Col 2 (A)
    expect(slotsF[0].cartaId).toBe("A");
    expect(slotsF[1].cartaId).toBe("B");
    expect(slotsF[2].cartaId).toBe("C");

    expect(slotsT[0].cartaId).toBe("C");
    expect(slotsT[1].cartaId).toBe("B");
    expect(slotsT[2].cartaId).toBe("A");

    // Verificar correspondencia física de coordenadas tras el giro de hoja (espejado)
    // El borde izquierdo de la trasera en columna C' debe alinearse con el borde derecho de la frontal en columna C
    const anchoHoja = canvasA4Ajustado.anchoMm;
    expect(slotsT[0].xMm).toBeCloseTo(anchoHoja - (slotsF[2].xMm + slotsF[2].anchoMm), 2); // Reverso C (col 0 en trasera, col 2 en frente)
    expect(slotsT[1].xMm).toBeCloseTo(anchoHoja - (slotsF[1].xMm + slotsF[1].anchoMm), 2); // Reverso B (col 1 en trasera, col 1 en frente)
    expect(slotsT[2].xMm).toBeCloseTo(anchoHoja - (slotsF[0].xMm + slotsF[0].anchoMm), 2); // Reverso A (col 2 en trasera, col 0 en frente)

    expect(slotsT[0].imagenSrc).toBe("tC.png");
    expect(slotsT[2].imagenSrc).toBe("tA.png");
  });

  // 4. Test: Distribución en Gran Formato (A3 Horizontal, 18 cartas)
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

    // Grid Ancho = 6 * 63.5 + 5 * 2 = 391. Útil = 420 - 20 = 400. SobranteX = 9. startX = 10 + 4.5 = 14.5
    // Grid Alto = 3 * 88.9 + 2 * 2 = 270.7. Útil = 297 - 20 = 277. SobranteY = 6.3. startY = 10 + 3.15 = 13.15
    expect(slots[0].xMm).toBeCloseTo(14.5, 2);
    expect(slots[0].yMm).toBeCloseTo(13.15, 2);

    expect(slots[5].xMm).toBeCloseTo(14.5 + 5 * (63.5 + 2), 2); // Última columna (índice 5)
    expect(slots[12].yMm).toBeCloseTo(13.15 + 2 * (88.9 + 2), 2); // Última fila (índice 12 es el inicio de la fila 3)
  });
});
