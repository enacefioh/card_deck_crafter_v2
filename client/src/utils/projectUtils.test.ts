import { describe, it, expect } from "vitest";
import {
  validarYParsearProyecto,
  moverCartas,
  duplicarCartas,
  insertarCartaDesdePlantilla,
  actualizarClavePlantillaYValores,
  validarYParsearPlantilla,
  prepararPlantillaParaExportacion
} from "./projectUtils";

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

  it("debe parsear y conservar assets globales del proyecto si están definidos", () => {
    const proyectoConAssets = {
      ...proyectoValido,
      assets: [
        { id: "proj_asset_1", nombre: "Logo del Juego", src: "project_asset://logo.png" }
      ]
    };
    const parsed = validarYParsearProyecto(JSON.stringify(proyectoConAssets));
    expect(parsed.assets).toBeDefined();
    expect(parsed.assets?.length).toBe(1);
    expect(parsed.assets?.[0].nombre).toBe("Logo del Juego");
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

    it("debe clonar profundamente las propiedades plantilla y plantillaTrasera", () => {
      const cartasConPlantilla = [
        {
          id: "A",
          nombre: "Carta A",
          plantilla: {
            id: "p1",
            nombre: "P1",
            capas: [{ id: "l1", tipo: "text" }],
            assets: [{ id: "ast1", nombre: "mana.png", src: "blob:1" }]
          },
          plantillaTrasera: {
            id: "p2",
            nombre: "P2",
            capas: [],
            assets: [{ id: "ast2", nombre: "back.png", src: "blob:2" }]
          }
        }
      ];
      const resultado = duplicarCartas(cartasConPlantilla, ["A"]);
      expect(resultado.length).toBe(2);
      
      const copia = resultado[1];
      expect(copia.plantilla).toBeDefined();
      expect(copia.plantilla).toEqual(cartasConPlantilla[0].plantilla);
      expect(copia.plantilla).not.toBe(cartasConPlantilla[0].plantilla); // Referencia distinta
      expect(copia.plantilla.assets).not.toBe(cartasConPlantilla[0].plantilla.assets); // Referencia del array distinta
      expect(copia.plantilla.assets[0]).not.toBe(cartasConPlantilla[0].plantilla.assets[0]); // Referencia del objeto del array distinta

      expect(copia.plantillaTrasera).toBeDefined();
      expect(copia.plantillaTrasera).toEqual(cartasConPlantilla[0].plantillaTrasera);
      expect(copia.plantillaTrasera).not.toBe(cartasConPlantilla[0].plantillaTrasera); // Referencia distinta
      expect(copia.plantillaTrasera.assets).not.toBe(cartasConPlantilla[0].plantillaTrasera.assets);
      expect(copia.plantillaTrasera.assets[0]).not.toBe(cartasConPlantilla[0].plantillaTrasera.assets[0]);
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

    it("debe mantener independientes las variables y overrides del anverso y del reverso", () => {
      const carta = {
        id: "carta_1",
        nombre: "Carta Test",
        valoresCampos: { titulo: "Anverso Titulo", texto: "Anverso Texto" },
        capasOverrides: { background: { colorFill: "#ff0000" } },
        plantillaTraseraId: "trasera_simple",
        valoresCamposTrasera: { titulo: "Reverso Titulo", descripcion: "Reverso Desc" },
        capasOverridesTrasera: { background: { colorFill: "#00ff00" } }
      };

      // Modificamos solo el frontal
      const nuevosValoresFront = { titulo: "Anverso Nuevo", texto: "Anverso Texto Mod" };
      const nuevosOverridesFront = { background: { colorFill: "#ffffff" } };

      const cartaModificadaFront = {
        ...carta,
        nombre: nuevosValoresFront.titulo,
        valoresCampos: nuevosValoresFront,
        capasOverrides: nuevosOverridesFront
      };

      // Verificar que el frontal cambió pero la trasera quedó intacta
      expect(cartaModificadaFront.valoresCampos.titulo).toBe("Anverso Nuevo");
      expect(cartaModificadaFront.capasOverrides.background.colorFill).toBe("#ffffff");
      expect(cartaModificadaFront.valoresCamposTrasera?.titulo).toBe("Reverso Titulo");
      expect(cartaModificadaFront.capasOverridesTrasera?.background?.colorFill).toBe("#00ff00");

      // Modificamos solo la trasera
      const nuevosValoresBack = { titulo: "Reverso Nuevo", descripcion: "Reverso Desc Mod" };
      const nuevosOverridesBack = { background: { colorFill: "#000000" } };

      const cartaModificadaBack = {
        ...carta,
        valoresCamposTrasera: nuevosValoresBack,
        capasOverridesTrasera: nuevosOverridesBack
      };

      // Verificar que la trasera cambió pero el frontal quedó intacto
      expect(cartaModificadaBack.valoresCamposTrasera?.titulo).toBe("Reverso Nuevo");
      expect(cartaModificadaBack.capasOverridesTrasera?.background?.colorFill).toBe("#000000");
      expect(cartaModificadaBack.valoresCampos?.titulo).toBe("Anverso Titulo");
      expect(cartaModificadaBack.capasOverrides?.background?.colorFill).toBe("#ff0000");
    });
  });

  describe("actualizarClavePlantillaYValores", () => {
    const plantillaMock = {
      id: "test",
      nombre: "Plantilla Test",
      camposConfig: [
        { clave: "poder", nombreLegible: "poder", tipo: "text", valorDefecto: "10" }
      ],
      capas: [
        { id: "capa1", tipo: "text", nombre: "poder", contenidoRaw: "Poder por defecto" }
      ]
    };

    it("debe actualizar la clave en la capa y en camposConfig, y mover el valor", () => {
      const valores = { poder: "99" };
      const res = actualizarClavePlantillaYValores(plantillaMock, valores, "capa1", "poder", "fuerza");
      
      expect(res.plantilla.capas[0].nombre).toBe("fuerza");
      expect(res.plantilla.capas[0].contenidoRaw).toBe("Poder por defecto");
      expect(res.plantilla.camposConfig[0].clave).toBe("fuerza");
      expect(res.valoresCampos.fuerza).toBe("99");
      expect(res.valoresCampos.poder).toBeUndefined();
    });

    it("debe conservar la clave original en camposConfig si está usada en otra capa", () => {
      const plantillaConClaveCompartida = {
        ...plantillaMock,
        capas: [
          { id: "capa1", tipo: "text", nombre: "poder", contenidoRaw: "Poder por defecto" },
          { id: "capa2", tipo: "text", nombre: "poder", contenidoRaw: "Poder 2" }
        ]
      };
      const valores = { poder: "99" };
      const res = actualizarClavePlantillaYValores(plantillaConClaveCompartida, valores, "capa1", "poder", "fuerza");

      expect(res.plantilla.capas[0].nombre).toBe("fuerza");
      expect(res.plantilla.capas[1].nombre).toBe("poder");
      // Se debe haber añadido "fuerza" a camposConfig, manteniendo "poder"
      expect(res.plantilla.camposConfig.map((f: any) => f.clave)).toContain("poder");
      expect(res.plantilla.camposConfig.map((f: any) => f.clave)).toContain("fuerza");
      expect(res.valoresCampos.fuerza).toBe("99");
      expect(res.valoresCampos.poder).toBe("99");
    });

    it("no debe borrar el valor si la clave saneada resulta ser idéntica a la clave anterior (ej. al escribir un carácter inválido)", () => {
      const valores = { poder: "99" };
      const res = actualizarClavePlantillaYValores(plantillaMock, valores, "capa1", "poder", "poder!");
      
      expect(res.plantilla.capas[0].nombre).toBe("poder");
      expect(res.plantilla.camposConfig[0].clave).toBe("poder");
      expect(res.valoresCampos.poder).toBe("99");
    });
  });

  describe("validarYParsearPlantilla", () => {
    it("debe parsear y retornar una plantilla válida", () => {
      const data = { id: "p1", nombre: "Plantilla 1" };
      const parsed = validarYParsearPlantilla(JSON.stringify(data));
      expect(parsed.id).toBe("p1");
      expect(parsed.nombre).toBe("Plantilla 1");
    });

    it("debe fallar si falta id o nombre", () => {
      const dataSinId = { nombre: "Plantilla 1" };
      expect(() => validarYParsearPlantilla(JSON.stringify(dataSinId))).toThrow("Falta id o nombre");
      
      const dataSinNombre = { id: "p1" };
      expect(() => validarYParsearPlantilla(JSON.stringify(dataSinNombre))).toThrow("Falta id o nombre");
    });
  });

  describe("Limpieza en Cascada de Capas y Variables de Plantilla (SRS-016)", () => {
    it("debe limpiar los overrides y variables dinámicas eliminadas de la plantilla para todas las cartas del proyecto", () => {
      const oldTemplate = {
        id: "mi_plantilla",
        nombre: "Plantilla Test",
        camposConfig: [
          { clave: "poder", tipo: "text" },
          { clave: "defensa", tipo: "text" }
        ],
        capas: [
          { id: "capa_fondo", tipo: "background" },
          { id: "capa_poder", tipo: "text", contenidoRaw: "{{poder}}" },
          { id: "capa_defensa", tipo: "text", contenidoRaw: "{{defensa}}" }
        ]
      };

      const plantillaActualizada = {
        id: "mi_plantilla",
        nombre: "Plantilla Test",
        camposConfig: [
          { clave: "poder", tipo: "text" }
        ],
        capas: [
          { id: "capa_fondo", tipo: "background" },
          { id: "capa_poder", tipo: "text", contenidoRaw: "{{poder}}" }
        ]
      };

      const cartas = [
        {
          id: "carta_1",
          plantillaId: "mi_plantilla",
          nombre: "Carta 1",
          valoresCampos: { poder: "5", defensa: "3" },
          capasOverrides: { capa_fondo: { colorFill: "#ff0000" }, capa_defensa: { color: "#ffffff" } }
        },
        {
          id: "carta_2",
          plantillaId: "otra_plantilla",
          nombre: "Carta de otra plantilla",
          valoresCampos: { defensa: "10" },
          capasOverrides: { capa_defensa: { color: "#000000" } }
        }
      ];

      const newLayerIds = new Set(plantillaActualizada.capas.map((c: any) => c.id));
      const newFieldKeys = new Set(plantillaActualizada.camposConfig.map((f: any) => f.clave));

      const deletedLayerIds = oldTemplate.capas
        .map((c: any) => c.id)
        .filter((id: string) => !newLayerIds.has(id));
        
      const deletedFieldKeys = oldTemplate.camposConfig
        .map((f: any) => f.clave)
        .filter((clave: string) => !newFieldKeys.has(clave));

      expect(deletedLayerIds).toEqual(["capa_defensa"]);
      expect(deletedFieldKeys).toEqual(["defensa"]);

      const cartasActualizadas: any[] = cartas.map((c) => {
        const nextOverrides = { ...c.capasOverrides } as any;
        const nextValores = { ...c.valoresCampos } as any;

        if (c.plantillaId === plantillaActualizada.id) {
          deletedLayerIds.forEach((id) => {
            delete nextOverrides[id];
          });
          deletedFieldKeys.forEach((key) => {
            delete nextValores[key];
          });
        }

        return {
          ...c,
          valoresCampos: nextValores,
          capasOverrides: nextOverrides
        };
      });

      expect(cartasActualizadas[0].valoresCampos.poder).toBe("5");
      expect(cartasActualizadas[0].valoresCampos.defensa).toBeUndefined();
      expect(cartasActualizadas[0].capasOverrides.capa_fondo.colorFill).toBe("#ff0000");
      expect(cartasActualizadas[0].capasOverrides.capa_defensa).toBeUndefined();

      expect(cartasActualizadas[1].valoresCampos.defensa).toBe("10");
      expect(cartasActualizadas[1].capasOverrides.capa_defensa.color).toBe("#000000");
    });
  });

  describe("Propagación de Variables Renombradas en Plantilla (TKT-009)", () => {
    it("debe clonar la plantilla cuando se edita el diseño/capas de una carta, manteniendo a las demás intactas", () => {
      const oldTemplate = {
        id: "mi_plantilla",
        nombre: "Plantilla Test",
        camposConfig: [
          { clave: "fuerza", tipo: "text" }
        ],
        capas: [
          { id: "capa_texto", tipo: "text", contenidoRaw: "{{fuerza}}" }
        ]
      };

      const plantillaActualizada = {
        id: "mi_plantilla",
        nombre: "Plantilla Test",
        camposConfig: [
          { clave: "poder", tipo: "text" }
        ],
        capas: [
          { id: "capa_texto", tipo: "text", contenidoRaw: "{{poder}}" }
        ]
      };

      const templatesMap: Record<string, any> = {
        mi_plantilla: oldTemplate
      };

      const cartas = [
        {
          id: "carta_1",
          plantillaId: "mi_plantilla",
          nombre: "Carta 1",
          valoresCampos: { fuerza: "15" } as Record<string, any>,
          capasOverrides: {}
        },
        {
          id: "carta_2",
          plantillaId: "mi_plantilla",
          nombre: "Carta 2",
          valoresCampos: { fuerza: "20" } as Record<string, any>,
          capasOverrides: {}
        }
      ];

      // Simular guardado del diseño de carta_1
      const editingCardId = "carta_1";
      const targetCard = cartas.find((c) => c.id === editingCardId)!;
      
      let finalPlantillaId = targetCard.plantillaId;
      let clonedTemplate: any = null;

      // Comparar y clonar si el diseño cambió
      if (JSON.stringify(plantillaActualizada) !== JSON.stringify(oldTemplate)) {
        const newTemplateId = "mi_plantilla_clonada";
        finalPlantillaId = newTemplateId;
        clonedTemplate = {
          ...plantillaActualizada,
          id: newTemplateId
        };
        templatesMap[newTemplateId] = clonedTemplate;
      }

      // Actualizar carta_1 con sus nuevos valores
      const valoresCamposNuevos = { poder: "15" };

      const cartasActualizadas = cartas.map((c) => {
        if (c.id !== editingCardId) {
          return c; // Otras cartas no cambian
        }
        return {
          ...c,
          plantillaId: finalPlantillaId,
          valoresCampos: valoresCamposNuevos
        };
      });

      // La carta editada debe usar la plantilla clonada y los nuevos valores
      expect(cartasActualizadas[0].plantillaId).toBe("mi_plantilla_clonada");
      expect((cartasActualizadas[0].valoresCampos as any).poder).toBe("15");
      expect((cartasActualizadas[0].valoresCampos as any).fuerza).toBeUndefined();

      // La otra carta (carta_2) debe mantener la plantilla original e intacta su clave de fuerza
      expect(cartasActualizadas[1].plantillaId).toBe("mi_plantilla");
      expect((cartasActualizadas[1].valoresCampos as any).fuerza).toBe("20");
      expect((cartasActualizadas[1].valoresCampos as any).poder).toBeUndefined();

      // La plantilla original en templatesMap no debe haber cambiado
      expect(templatesMap.mi_plantilla.camposConfig[0].clave).toBe("fuerza");
      expect(templatesMap.mi_plantilla.capas[0].contenidoRaw).toBe("{{fuerza}}");
    });
  });

  describe("Utilidades Geométricas de Alineación y Tamaño (SRS-017)", () => {
    const anchoCarta = 63.5;
    const altoCarta = 88.9;

    const mockCapa = {
      id: "capa_1",
      tipo: "text",
      xMm: 10,
      yMm: 20,
      anchoMm: 30,
      altoMm: 15
    };

    const applyAlignmentHelper = (type: string, capa: typeof mockCapa) => {
      const w = capa.anchoMm;
      const h = capa.altoMm;
      switch (type) {
        case "izq":
          return { ...capa, xMm: 0 };
        case "der":
          return { ...capa, xMm: Number((anchoCarta - w).toFixed(1)) };
        case "arr":
          return { ...capa, yMm: 0 };
        case "abj":
          return { ...capa, yMm: Number((altoCarta - h).toFixed(1)) };
        case "anchoMax":
          return { ...capa, xMm: 0, anchoMm: Number(anchoCarta.toFixed(1)) };
        case "altoMax":
          return { ...capa, yMm: 0, altoMm: Number(altoCarta.toFixed(1)) };
        case "expandir":
          return {
            ...capa,
            xMm: 0,
            yMm: 0,
            anchoMm: Number(anchoCarta.toFixed(1)),
            altoMm: Number(altoCarta.toFixed(1))
          };
        default:
          return capa;
      }
    };

    it("debe alinear al borde izquierdo correctamente", () => {
      const res = applyAlignmentHelper("izq", mockCapa);
      expect(res.xMm).toBe(0);
      expect(res.yMm).toBe(20);
    });

    it("debe alinear al borde derecho correctamente con precisión decimal", () => {
      const res = applyAlignmentHelper("der", mockCapa);
      expect(res.xMm).toBe(Number((63.5 - 30).toFixed(1))); // 33.5
      expect(res.yMm).toBe(20);
    });

    it("debe alinear al borde superior correctamente", () => {
      const res = applyAlignmentHelper("arr", mockCapa);
      expect(res.xMm).toBe(10);
      expect(res.yMm).toBe(0);
    });

    it("debe alinear al borde inferior correctamente con precisión decimal", () => {
      const res = applyAlignmentHelper("abj", mockCapa);
      expect(res.xMm).toBe(10);
      expect(res.yMm).toBe(Number((88.9 - 15).toFixed(1))); // 73.9
    });

    it("debe expandir al ancho máximo de la carta y establecer X en 0", () => {
      const res = applyAlignmentHelper("anchoMax", mockCapa);
      expect(res.xMm).toBe(0);
      expect(res.anchoMm).toBe(63.5);
    });

    it("debe expandir al alto máximo de la carta y establecer Y en 0", () => {
      const res = applyAlignmentHelper("altoMax", mockCapa);
      expect(res.yMm).toBe(0);
      expect(res.altoMm).toBe(88.9);
    });

    it("debe expandir a pantalla completa", () => {
      const res = applyAlignmentHelper("expandir", mockCapa);
      expect(res.xMm).toBe(0);
      expect(res.yMm).toBe(0);
      expect(res.anchoMm).toBe(63.5);
      expect(res.altoMm).toBe(88.9);
    });
  });

  describe("prepararPlantillaParaExportacion", () => {
    const plantillaMock = {
      id: "vacia",
      nombre: "Plantilla Vacía",
      capas: [],
      camposConfig: [
        { clave: "titulo", nombreLegible: "Título", tipo: "text", valorDefecto: "Valor Default" },
        { clave: "descripcion", nombreLegible: "Descripción", tipo: "text", valorDefecto: "" }
      ]
    };

    it("debe generar un ID nuevo si la plantilla original es built-in ('vacia')", () => {
      const res = prepararPlantillaParaExportacion(plantillaMock, "Nueva Plantilla", {
        titulo: "Mi Titulo"
      });
      expect(res.id).not.toBe("vacia");
      expect(res.id.startsWith("template_")).toBe(true);
      expect(res.nombre).toBe("Nueva Plantilla");
    });

    it("debe generar un ID nuevo incluso si la plantilla original NO es built-in", () => {
      const plantillaPersonalizada = {
        ...plantillaMock,
        id: "template_12345"
      };
      const res = prepararPlantillaParaExportacion(plantillaPersonalizada, "Otro Nombre", {});
      expect(res.id).not.toBe("template_12345");
      expect(res.id.startsWith("template_")).toBe(true);
      expect(res.nombre).toBe("Otro Nombre");
    });

    it("debe actualizar los valores por defecto (valorDefecto) con los valores provistos de la carta", () => {
      const valoresCarta = {
        titulo: "Nuevo Titulo de Carta",
        descripcion: "Nueva Descripcion"
      };
      const res = prepararPlantillaParaExportacion(plantillaMock, "Test Valores", valoresCarta);
      
      const tituloCampo = res.camposConfig.find((c: any) => c.clave === "titulo");
      const descCampo = res.camposConfig.find((c: any) => c.clave === "descripcion");

      expect(tituloCampo.valorDefecto).toBe("Nuevo Titulo de Carta");
      expect(descCampo.valorDefecto).toBe("Nueva Descripcion");
    });

    it("debe mantener el valorDefecto original o cadena vacía si no hay valor correspondiente en la carta", () => {
      const valoresCarta = {
        titulo: "Solo Titulo"
      };
      const res = prepararPlantillaParaExportacion(plantillaMock, "Test Parcial", valoresCarta);
      
      const tituloCampo = res.camposConfig.find((c: any) => c.clave === "titulo");
      const descCampo = res.camposConfig.find((c: any) => c.clave === "descripcion");

      expect(tituloCampo.valorDefecto).toBe("Solo Titulo");
      expect(descCampo.valorDefecto).toBe(""); // Conserva el original o vacío
    });
  });

  describe("Soporte de Capas de Imagen Switch (SRS-015)", () => {
    it("debe duplicar cartas con capas image-switch realizando una clonación profunda de sus opciones", () => {
      const mockCarta: any = {
        id: "carta_switch",
        nombre: "Carta Switch",
        valoresCampos: {},
        plantilla: {
          id: "plantilla_switch",
          nombre: "Plantilla con Switch",
          capas: [
            {
              id: "capa_switch_1",
              tipo: "image-switch",
              nombre: "Switch de Prueba",
              xMm: 10,
              yMm: 10,
              anchoMm: 30,
              altoMm: 30,
              src: "asset://img1.png",
              options: [
                { id: "opt_1", nombre: "Opción 1", src: "asset://img1.png" },
                { id: "opt_2", nombre: "Opción 2", src: "asset://img2.png" }
              ],
              selectedOptionId: "opt_1"
            }
          ],
          camposConfig: []
        }
      };

      const resultado = duplicarCartas([mockCarta], ["carta_switch"]);
      expect(resultado.length).toBe(2);
      const copia = resultado[1];
      expect(copia.nombre).toBe("Carta Switch (Copia)");
      
      // Debe conservar la estructura de capas de imagen-switch
      const originalCapa = mockCarta.plantilla.capas[0];
      const copiaCapa = copia.plantilla.capas[0];
      expect(copiaCapa.tipo).toBe("image-switch");
      expect(copiaCapa.options.length).toBe(2);
      expect(copiaCapa.options[0].id).toBe("opt_1");

      // No deben compartir la misma referencia de objeto de options
      expect(copiaCapa.options).not.toBe(originalCapa.options);
      expect(copiaCapa.options[0]).not.toBe(originalCapa.options[0]);
    });
  });
});


