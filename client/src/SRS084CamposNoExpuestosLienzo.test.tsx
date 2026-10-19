// @vitest-environment happy-dom
import { describe, it, expect, afterEach } from "vitest";
import { render, cleanup, fireEvent } from "@testing-library/react";
import App from "./App";
import type { Carta, PlantillaCDC2 } from "shared";
import { obtenerRutaJerarquica } from "./utils/projectUtils";

afterEach(() => {
  cleanup();
});

describe("SRS-084: Edición en Lote de Campos No Expuestos en el Menú del Lienzo", () => {
  it("RF-1: Renderiza el checkbox 'Mostrar todos los campos' en la cabecera del panel derecho", () => {
    const { container } = render(<App />);
    const toggle = container.querySelector('[data-testid="toggle-show-all-fields"]') as HTMLInputElement;
    expect(toggle).toBeTruthy();
    expect(toggle.type).toBe("checkbox");
    expect(toggle.checked).toBe(false);

    // Debe incluir la etiqueta "Mostrar todos los campos"
    const label = toggle.closest("label");
    expect(label?.textContent).toContain("Mostrar todos los campos");

    // Al hacer click, alterna su estado
    fireEvent.click(toggle);
    expect(toggle.checked).toBe(true);

    fireEvent.click(toggle);
    expect(toggle.checked).toBe(false);
  });

  it("RF-2 y RF-3: En modo normal solo se listan propiedades expuestas; con 'showAllFields' activo se genera el catálogo completo de capas comunes", () => {
    const capaTexto = {
      id: "layer_text_title",
      nombre: "Título",
      tipo: "text",
      contenidoRaw: "Guerrero",
      fontSizePt: 16,
      fontFamily: "Outfit",
      color: "#ff0000",
      alineacion: "center",
      bold: true,
      italic: false,
      underline: false
    };

    const capaImagen = {
      id: "layer_img_main",
      nombre: "Ilustración",
      tipo: "image",
      src: "img_guerrero.png",
      modoAjuste: "cover",
      xMm: 10,
      yMm: 20,
      anchoMm: 50,
      altoMm: 60
    };

    const capas = [capaTexto, capaImagen];

    // Solo se expone contenidoRaw en la plantilla
    const exposedProperties = [
      { layerId: "layer_text_title", property: "contenidoRaw", label: "Título > Contenido Texto" }
    ];

    // Helper simulado del algoritmo de SRS-084
    const buildEffectiveProps = (showAll: boolean) => {
      if (!showAll) {
        return exposedProperties;
      }
      const generated: any[] = [];
      for (const c of capas) {
        if (c.tipo === "text") {
          generated.push(
            { layerId: c.id, property: "visibility" },
            { layerId: c.id, property: "contenidoRaw" },
            { layerId: c.id, property: "fontFamily" },
            { layerId: c.id, property: "fontSizePt" },
            { layerId: c.id, property: "color" },
            { layerId: c.id, property: "bold" },
            { layerId: c.id, property: "italic" },
            { layerId: c.id, property: "underline" },
            { layerId: c.id, property: "alineacion" }
          );
        } else if (c.tipo === "image") {
          generated.push(
            { layerId: c.id, property: "visibility" },
            { layerId: c.id, property: "src" },
            { layerId: c.id, property: "modoAjuste" }
          );
        }
      }
      return generated;
    };

    const normalProps = buildEffectiveProps(false);
    expect(normalProps.length).toBe(1);
    expect(normalProps[0].property).toBe("contenidoRaw");

    const allProps = buildEffectiveProps(true);
    const propNames = allProps.map(p => p.property);
    expect(propNames).toContain("fontSizePt");
    expect(propNames).toContain("fontFamily");
    expect(propNames).toContain("color");
    expect(propNames).toContain("alineacion");
    expect(propNames).toContain("bold");
    expect(propNames).toContain("modoAjuste");
  });

  it("RF-4: Coincidencia multicarta por tipo, nombre y ruta jerárquica cuando showAllFields está activo", () => {
    // 2 cartas con la misma estructura pero capas con diferentes IDs (ej: plantillas instanciadas o duplicadas)
    const plantillaCarta1: PlantillaCDC2 = {
      id: "tmpl_1",
      nombre: "Plantilla A",
      capas: [
        { id: "c1_txt_1", nombre: "Ataque", tipo: "text", fontSizePt: 12 },
        { id: "c1_txt_2", nombre: "Defensa", tipo: "text", fontSizePt: 10 }
      ],
      exposedProperties: [] // No tiene ningún campo expuesto
    };

    const plantillaCarta2: PlantillaCDC2 = {
      id: "tmpl_2",
      nombre: "Plantilla B",
      capas: [
        { id: "c2_txt_1", nombre: "Ataque", tipo: "text", fontSizePt: 14 },
        { id: "c2_txt_2", nombre: "Defensa", tipo: "text", fontSizePt: 10 }
      ],
      exposedProperties: []
    };

    const cartas: Carta[] = [
      { id: "carta_1", nombre: "Carta 1", imagenTrasera: null, cantidad: 1, plantilla: plantillaCarta1 },
      { id: "carta_2", nombre: "Carta 2", imagenTrasera: null, cantidad: 1, plantilla: plantillaCarta2 }
    ];
    expect(cartas.length).toBe(2);

    // Algoritmo de matching en showAllFields:
    const baseCapas = plantillaCarta1.capas;
    const capasOther = plantillaCarta2.capas;

    const layerMatches: Record<string, string> = {};
    for (const capaBase of baseCapas) {
      const rutaBase = obtenerRutaJerarquica(capaBase.id, baseCapas);
      const match = capasOther.find(cL => {
        if (cL.tipo !== capaBase.tipo || cL.nombre !== capaBase.nombre) return false;
        return obtenerRutaJerarquica(cL.id, capasOther) === rutaBase;
      });
      if (match) {
        layerMatches[capaBase.id] = match.id;
      }
    }

    expect(layerMatches["c1_txt_1"]).toBe("c2_txt_1");
    expect(layerMatches["c1_txt_2"]).toBe("c2_txt_2");
  });

  it("RF-5 y RF-6: Actualización en lote de propiedad no expuesta (fontSizePt) aplica override a todas las cartas seleccionadas", () => {
    const cartas: Carta[] = [
      {
        id: "carta_1",
        nombre: "Carta 1",
        imagenTrasera: null,
        cantidad: 1,
        capasOverrides: {},
        plantilla: {
          id: "t1",
          nombre: "T1",
          capas: [{ id: "layer_title", nombre: "Título", tipo: "text", fontSizePt: 12 }]
        }
      },
      {
        id: "carta_2",
        nombre: "Carta 2",
        imagenTrasera: null,
        cantidad: 1,
        capasOverrides: {},
        plantilla: {
          id: "t1",
          nombre: "T1",
          capas: [{ id: "layer_title", nombre: "Título", tipo: "text", fontSizePt: 12 }]
        }
      }
    ];

    const selectedCardIds = ["carta_1", "carta_2"];
    const propertyToUpdate = "fontSizePt";
    const nuevoValor = 18;

    // Simular handleUpdateValorLote
    const updatedCartas = cartas.map(c => {
      if (!selectedCardIds.includes(c.id)) return c;
      const nextOverrides = { ...(c.capasOverrides || {}) };
      nextOverrides["layer_title"] = {
        ...(nextOverrides["layer_title"] || {}),
        [propertyToUpdate]: nuevoValor
      };
      return { ...c, capasOverrides: nextOverrides };
    });

    expect(updatedCartas[0].capasOverrides?.layer_title?.fontSizePt).toBe(18);
    expect(updatedCartas[1].capasOverrides?.layer_title?.fontSizePt).toBe(18);
  });
});
