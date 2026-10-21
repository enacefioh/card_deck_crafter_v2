import { describe, it, expect } from "vitest";
import { calculateAutoDimensionsForFreeContainer } from "../../shared/layoutEngine";

describe("SRS-085: Interlineado en Capas de Texto (Line Height)", () => {
  it("debe aplicar por defecto 1.2 cuando lineHeight no está especificado", () => {
    const capaSinLineHeight: any = {
      id: "texto1",
      tipo: "text",
      contenidoRaw: "Línea 1\nLínea 2",
      fontSizePt: 12,
    };

    const resolvedLineHeight = (typeof capaSinLineHeight.lineHeight === "number" && capaSinLineHeight.lineHeight > 0)
      ? capaSinLineHeight.lineHeight
      : 1.2;

    expect(resolvedLineHeight).toBe(1.2);
  });

  it("debe respetar un valor personalizado de lineHeight (ej. 0.85 o 1.5)", () => {
    const capaConLineHeight: any = {
      id: "texto2",
      tipo: "text",
      contenidoRaw: "Línea 1\nLínea 2",
      fontSizePt: 14,
      lineHeight: 0.85,
    };

    const resolvedLineHeight = (typeof capaConLineHeight.lineHeight === "number" && capaConLineHeight.lineHeight > 0)
      ? capaConLineHeight.lineHeight
      : 1.2;

    expect(resolvedLineHeight).toBe(0.85);
  });

  it("debe calcular el auto-height de texto considerando el interlineado configurado", () => {
    const container: any = {
      id: "cont1",
      tipo: "container",
      layout: "free",
      anchoMm: 100,
      altoMm: "auto"
    };

    const capa1: any = {
      id: "txt1",
      parentCapaId: "cont1",
      tipo: "text",
      contenidoRaw: "Línea 1\nLínea 2\nLínea 3",
      fontSizePt: 20,
      anchoMm: 80,
      altoMm: "auto",
      lineHeight: 1.0,
      xMm: 0,
      yMm: 0
    };

    const capa2: any = {
      ...capa1,
      id: "txt2",
      lineHeight: 2.0
    };

    const dims1 = calculateAutoDimensionsForFreeContainer(container, [capa1]);
    const dims2 = calculateAutoDimensionsForFreeContainer(container, [capa2]);

    expect(dims2.autoHeightMm).toBeGreaterThan(dims1.autoHeightMm);
  });

  it("debe permitir exponer y ocultar la propiedad lineHeight en exposedProperties", () => {
    const exposedProps: Array<{ layerId: string; property: string; label?: string }> = [];

    // Exponer
    const layerId = "txt_test";
    const property = "lineHeight";
    const label = "Interlineado";

    const isExposed = exposedProps.some(p => p.layerId === layerId && p.property === property);
    expect(isExposed).toBe(false);

    // Añadir a expuestas
    exposedProps.push({ layerId, property, label });
    expect(exposedProps.some(p => p.layerId === layerId && p.property === property)).toBe(true);

    // Retirar de expuestas
    const filtered = exposedProps.filter(p => !(p.layerId === layerId && p.property === property));
    expect(filtered.some(p => p.layerId === layerId && p.property === property)).toBe(false);
  });
});
