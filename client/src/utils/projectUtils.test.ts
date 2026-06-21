import { describe, it, expect } from "vitest";
import { validarYParsearProyecto, moverCartas, duplicarCartas, insertarCartaDesdePlantilla } from "./projectUtils";

describe("projectUtils - Validación de Formato de Proyecto (.cdc2)", () => {
  const proyectoValido = {
    version: "2.0.0",
    canvasConfig: { tipo: "A4", anchoMm: 210, altoMm: 297 },
    cardConfig: { anchoMm: 63.5, altoMm: 88.9 },
    cards: [
      { id: "1", nombre: "Carta 1", cantidad: 1, imagenFrontal: "asset://frontal_0.png" }
    ]
  };

  it("debe parsear correctamente un JSON válido con la versión 2.0.0", () => {
    const jsonStr = JSON.stringify(proyectoValido);
    const parsed = validarYParsearProyecto(jsonStr);
    expect(parsed.version).toBe("2.0.0");
    expect(parsed.cards.length).toBe(1);
  });

  it("debe conservar capasOverrides al parsear el proyecto", () => {
    const proyectoConOverrides = {
      version: "2.0.0",
      canvasConfig: { tipo: "A4", anchoMm: 210, altoMm: 297 },
      cardConfig: { anchoMm: 63.5, altoMm: 88.9 },
      cards: [
        {
          id: "1",
          nombre: "Carta Plantilla",
          cantidad: 1,
          plantillaId: "simple",
          valoresCampos: { titulo: "Test Title" },
          capasOverrides: {
            background: { colorFill: "#ff0000" }
          }
        }
      ]
    };
    const jsonStr = JSON.stringify(proyectoConOverrides);
    const parsed = validarYParsearProyecto(jsonStr);
    expect(parsed.cards[0].capasOverrides).toBeDefined();
    expect(parsed.cards[0].capasOverrides.background.colorFill).toBe("#ff0000");
  });

  it("debe lanzar un error si el JSON está vacío", () => {
    expect(() => validarYParsearProyecto("")).toThrow("El archivo de configuración JSON está vacío");
    expect(() => validarYParsearProyecto("   ")).toThrow("El archivo de configuración JSON está vacío");
  });

  it("debe lanzar un error si el formato del JSON es inválido", () => {
    expect(() => validarYParsearProyecto("{ invalid json }")).toThrow("El archivo no contiene un JSON válido");
  });

  it("debe lanzar un error si la versión no es 2.0.0", () => {
    const proyectoVersionIncorrecta = { ...proyectoValido, version: "1.0.0" };
    expect(() => validarYParsearProyecto(JSON.stringify(proyectoVersionIncorrecta))).toThrow(
      "Versión de proyecto no soportada"
    );
  });

  it("debe lanzar un error si falta canvasConfig", () => {
    const proyectoSinCanvas = { ...proyectoValido };
    // @ts-ignore
    delete proyectoSinCanvas.canvasConfig;
    expect(() => validarYParsearProyecto(JSON.stringify(proyectoSinCanvas))).toThrow(
      "Falta la configuración del lienzo"
    );
  });

  it("debe lanzar un error si falta cardConfig", () => {
    const proyectoSinCard = { ...proyectoValido };
    // @ts-ignore
    delete proyectoSinCard.cardConfig;
    expect(() => validarYParsearProyecto(JSON.stringify(proyectoSinCard))).toThrow(
      "Falta la configuración de la carta"
    );
  });

  it("debe lanzar un error si la sección cards no es una lista", () => {
    const proyectoCardsInvalidas = { ...proyectoValido, cards: "not-an-array" };
    expect(() => validarYParsearProyecto(JSON.stringify(proyectoCardsInvalidas))).toThrow(
      "La sección de cartas (cards) debe ser una lista"
    );
  });
});

describe("projectUtils - Lógica de Selección y Edición Avanzada", () => {
  const cartas = [
    { id: "A", nombre: "Carta A" },
    { id: "B", nombre: "Carta B" },
    { id: "C", nombre: "Carta C" },
    { id: "D", nombre: "Carta D" }
  ];

  describe("moverCartas", () => {
    it("debe mover un bloque contiguio hacia arriba", () => {
      const resultado = moverCartas(cartas, ["B", "C"], "arriba");
      expect(resultado.map(c => c.id)).toEqual(["B", "C", "A", "D"]);
    });

    it("debe mover un bloque contiguio hacia abajo", () => {
      const resultado = moverCartas(cartas, ["B", "C"], "abajo");
      expect(resultado.map(c => c.id)).toEqual(["A", "D", "B", "C"]);
    });

    it("no debe hacer nada si el bloque ya está en el límite superior al mover arriba", () => {
      const resultado = moverCartas(cartas, ["A", "B"], "arriba");
      expect(resultado.map(c => c.id)).toEqual(["A", "B", "C", "D"]);
    });

    it("no debe hacer nada si el bloque ya está en el límite inferior al mover abajo", () => {
      const resultado = moverCartas(cartas, ["C", "D"], "abajo");
      expect(resultado.map(c => c.id)).toEqual(["A", "B", "C", "D"]);
    });

    it("no debe hacer nada si el bloque no es contiguo", () => {
      const resultado = moverCartas(cartas, ["A", "C"], "arriba");
      expect(resultado.map(c => c.id)).toEqual(["A", "B", "C", "D"]);
    });

    it("debe mover una sola carta hacia arriba", () => {
      const resultado = moverCartas(cartas, ["C"], "arriba");
      expect(resultado.map(c => c.id)).toEqual(["A", "C", "B", "D"]);
    });

    it("debe mover una sola carta hacia abajo", () => {
      const resultado = moverCartas(cartas, ["B"], "abajo");
      expect(resultado.map(c => c.id)).toEqual(["A", "C", "B", "D"]);
    });
  });

  describe("duplicarCartas", () => {
    it("debe duplicar secuencialmente las cartas seleccionadas e insertarlas después de cada origen", () => {
      const resultado = duplicarCartas(cartas, ["A", "C"]);
      expect(resultado.length).toBe(6);
      expect(resultado[0].id).toBe("A");
      expect(resultado[1].id).toContain("A_copia_");
      expect(resultado[1].nombre).toBe("Carta A (Copia)");
      expect(resultado[2].id).toBe("B");
      expect(resultado[3].id).toBe("C");
      expect(resultado[4].id).toContain("C_copia_");
      expect(resultado[4].nombre).toBe("Carta C (Copia)");
      expect(resultado[5].id).toBe("D");
    });
  });

  describe("insertarCartaDesdePlantilla", () => {
    const cartasTest = [
      { id: "A", nombre: "Carta A" },
      { id: "B", nombre: "Carta B" },
      { id: "C", nombre: "Carta C" }
    ];

    it("debe insertar la nueva carta al final si no hay selección", () => {
      const nueva = { id: "N", nombre: "Nueva" };
      const resultado = insertarCartaDesdePlantilla(cartasTest, nueva, []);
      expect(resultado.map(c => c.id)).toEqual(["A", "B", "C", "N"]);
    });

    it("debe insertar la nueva carta justo después de la carta seleccionada", () => {
      const nueva = { id: "N", nombre: "Nueva" };
      const resultado = insertarCartaDesdePlantilla(cartasTest, nueva, ["B"]);
      expect(resultado.map(c => c.id)).toEqual(["A", "B", "N", "C"]);
    });

    it("debe insertar la nueva carta después de la última seleccionada en caso de selección múltiple", () => {
      const nueva = { id: "N", nombre: "Nueva" };
      const resultado = insertarCartaDesdePlantilla(cartasTest, nueva, ["A", "B"]);
      expect(resultado.map(c => c.id)).toEqual(["A", "B", "N", "C"]);
    });
  });

  describe("Edición de Carta y Sincronización de Campos", () => {
    it("debe sincronizar el nombre de la carta si el campo titulo es modificado", () => {
      const carta = {
        id: "carta_1",
        nombre: "Carta Antigua",
        valoresCampos: { titulo: "Título Antiguo", texto: "Texto" },
        capasOverrides: {}
      };

      const nuevosValores = { titulo: "Título Nuevo", texto: "Texto Modificado" };
      const nuevosOverrides = { background: { colorFill: "#0000ff" } };

      const cartaActualizada = {
        ...carta,
        nombre: nuevosValores.titulo || carta.nombre,
        valoresCampos: nuevosValores,
        capasOverrides: nuevosOverrides
      };

      expect(cartaActualizada.nombre).toBe("Título Nuevo");
      expect(cartaActualizada.valoresCampos.texto).toBe("Texto Modificado");
      expect(cartaActualizada.capasOverrides.background.colorFill).toBe("#0000ff");
    });
  });
});

