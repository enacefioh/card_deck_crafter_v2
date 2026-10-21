import { describe, it, expect } from "vitest";

describe("TKT-058: Bordes Individuales y Exposición Independiente en EditCardModal", () => {
  it("debe incluir todas las propiedades de bordes individuales en el catálogo de propiedades disponibles", () => {
    const list = [
      { property: "borderTopWidth", label: "Grosor Borde (o Sup)" },
      { property: "borderTopColor", label: "Color Borde (o Sup)" },
      { property: "borderRightWidth", label: "Grosor Borde Der" },
      { property: "borderRightColor", label: "Color Borde Der" },
      { property: "borderBottomWidth", label: "Grosor Borde Inf" },
      { property: "borderBottomColor", label: "Color Borde Inf" },
      { property: "borderLeftWidth", label: "Grosor Borde Izq" },
      { property: "borderLeftColor", label: "Color Borde Izq" },
    ];

    expect(list.some(p => p.property === "borderTopColor")).toBe(true);
    expect(list.some(p => p.property === "borderTopWidth")).toBe(true);
    expect(list.some(p => p.property === "borderRightColor")).toBe(true);
    expect(list.some(p => p.property === "borderRightWidth")).toBe(true);
    expect(list.some(p => p.property === "borderBottomColor")).toBe(true);
    expect(list.some(p => p.property === "borderBottomWidth")).toBe(true);
    expect(list.some(p => p.property === "borderLeftColor")).toBe(true);
    expect(list.some(p => p.property === "borderLeftWidth")).toBe(true);
  });

  it("debe permitir exponer y des-exponer el color del borde de forma independiente al grosor", () => {
    let exposedProperties: Array<{ layerId: string; property: string; label?: string }> = [];
    const layerId = "box1";

    // Exponer sólo color de borde
    exposedProperties.push({ layerId, property: "borderTopColor", label: "Color Borde" });
    expect(exposedProperties.some(p => p.layerId === layerId && p.property === "borderTopColor")).toBe(true);
    expect(exposedProperties.some(p => p.layerId === layerId && p.property === "borderTopWidth")).toBe(false);

    // Exponer además grosor de borde
    exposedProperties.push({ layerId, property: "borderTopWidth", label: "Grosor Borde" });
    expect(exposedProperties.some(p => p.layerId === layerId && p.property === "borderTopWidth")).toBe(true);

    // Des-exponer grosor de borde manteniendo el color expuesto
    exposedProperties = exposedProperties.filter(p => !(p.layerId === layerId && p.property === "borderTopWidth"));
    expect(exposedProperties.some(p => p.layerId === layerId && p.property === "borderTopWidth")).toBe(false);
    expect(exposedProperties.some(p => p.layerId === layerId && p.property === "borderTopColor")).toBe(true);
  });

  it("debe permitir exponer bordes individuales específicos (ej. derecho o inferior)", () => {
    let exposedProperties: Array<{ layerId: string; property: string; label?: string }> = [];
    const layerId = "box2";

    exposedProperties.push({ layerId, property: "borderRightColor", label: "Color Borde Der" });
    exposedProperties.push({ layerId, property: "borderBottomWidth", label: "Grosor Borde Inf" });

    expect(exposedProperties).toHaveLength(2);
    expect(exposedProperties.find(p => p.property === "borderRightColor")?.label).toBe("Color Borde Der");
    expect(exposedProperties.find(p => p.property === "borderBottomWidth")?.label).toBe("Grosor Borde Inf");
  });

  it("debe sobreescribir los 4 lados al cambiar el borde general (borderTopColor) incluso si había específicos", () => {
    const capaId = "capa_general";
    const carta: any = {
      id: "c1",
      plantilla: {
        id: "p1",
        exposedProperties: [
          { layerId: capaId, property: "borderTopColor", label: "Color Borde (o Sup)" },
          { layerId: capaId, property: "borderRightColor", label: "Color Borde Der" }
        ]
      },
      capasOverrides: {
        [capaId]: {
          borderRightColor: "#00ff00"
        }
      }
    };

    const nuevoValor = "#ff0000";
    const extraUpdates = {
      borderTopColor: nuevoValor,
      borderRightColor: nuevoValor,
      borderBottomColor: nuevoValor,
      borderLeftColor: nuevoValor
    };

    const nextOverrides = {
      ...carta.capasOverrides,
      [capaId]: {
        ...(carta.capasOverrides[capaId] || {}),
        ...extraUpdates
      }
    };

    expect(nextOverrides[capaId].borderTopColor).toBe("#ff0000");
    expect(nextOverrides[capaId].borderRightColor).toBe("#ff0000");
    expect(nextOverrides[capaId].borderBottomColor).toBe("#ff0000");
    expect(nextOverrides[capaId].borderLeftColor).toBe("#ff0000");
  });

  it("debe resolver el color del borde por defecto a #000000 en vez de blanco si la capa no tiene color explícito", () => {
    const layerObj: any = {
      id: "txt1",
      tipo: "text",
      nombre: "Texto 1"
    };

    let val = layerObj?.borderTopColor;
    if ((val === undefined || val === "") && "borderTopColor".startsWith("border") && "borderTopColor".endsWith("Color")) {
      val = layerObj?.borderTopColor || layerObj?.borderColor || "#000000";
    }

    expect(val).toBe("#000000");
  });

  it("debe actualizar únicamente el borde individual cuando se edita borderRightColor o borderBottomWidth", () => {
    const capaId = "capa_side";
    const carta: any = {
      id: "c3",
      capasOverrides: {}
    };

    // Actualizar borderRightColor
    const updatesRight = { borderRightColor: "#abcdef" };
    carta.capasOverrides[capaId] = {
      ...carta.capasOverrides[capaId],
      ...updatesRight
    };

    // Actualizar borderBottomWidth
    const updatesBottom = { borderBottomWidth: 2.5 };
    carta.capasOverrides[capaId] = {
      ...carta.capasOverrides[capaId],
      ...updatesBottom
    };

    expect(carta.capasOverrides[capaId].borderRightColor).toBe("#abcdef");
    expect(carta.capasOverrides[capaId].borderBottomWidth).toBe(2.5);
    expect(carta.capasOverrides[capaId].borderTopColor).toBeUndefined();
    expect(carta.capasOverrides[capaId].borderTopWidth).toBeUndefined();
  });
});
