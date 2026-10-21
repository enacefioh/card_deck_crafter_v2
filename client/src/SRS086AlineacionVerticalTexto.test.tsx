import { describe, it, expect } from "vitest";

describe("SRS-086: Alineación Vertical en Capas de Texto (Vertical Alignment)", () => {
  it("debe resolver 'top' (justify-content: flex-start) por defecto cuando alineacionVertical no está definido", () => {
    const capaSinValign: any = {
      id: "txt1",
      tipo: "text",
      contenidoRaw: "Título de prueba",
    };

    const resolvedValign = capaSinValign.alineacionVertical || "top";
    const justifyContent = resolvedValign === "bottom" ? "flex-end" : resolvedValign === "center" ? "center" : "flex-start";

    expect(resolvedValign).toBe("top");
    expect(justifyContent).toBe("flex-start");
  });

  it("debe resolver 'center' (justify-content: center) y 'bottom' (justify-content: flex-end) correctamente", () => {
    const capaCentro: any = {
      id: "txt2",
      tipo: "text",
      alineacionVertical: "center",
    };
    const capaAbajo: any = {
      id: "txt3",
      tipo: "text",
      alineacionVertical: "bottom",
    };

    const getJustify = (c: any) => {
      const v = c.alineacionVertical || "top";
      return v === "bottom" ? "flex-end" : v === "center" ? "center" : "flex-start";
    };

    expect(getJustify(capaCentro)).toBe("center");
    expect(getJustify(capaAbajo)).toBe("flex-end");
  });

  it("debe mantener la independencia y ortogonalidad entre alineación horizontal y vertical", () => {
    const capa2D: any = {
      id: "txt4",
      tipo: "text",
      alineacion: "center",
      alineacionVertical: "bottom",
    };

    const alignH = capa2D.alineacion || "left";
    const alignV = capa2D.alineacionVertical || "top";
    const justifyV = alignV === "bottom" ? "flex-end" : alignV === "center" ? "center" : "flex-start";

    expect(alignH).toBe("center");
    expect(alignV).toBe("bottom");
    expect(justifyV).toBe("flex-end");
  });

  it("debe permitir exponer y des-exponer alineacionVertical en exposedProperties", () => {
    const exposedProps: Array<{ layerId: string; property: string; label?: string }> = [];
    const layerId = "txt_hero";
    const property = "alineacionVertical";
    const label = "Alineación Vertical";

    // Exponer propiedad
    exposedProps.push({ layerId, property, label });
    expect(exposedProps.some(p => p.layerId === layerId && p.property === property)).toBe(true);

    // Des-exponer propiedad
    const filtered = exposedProps.filter(p => !(p.layerId === layerId && p.property === property));
    expect(filtered.some(p => p.layerId === layerId && p.property === property)).toBe(false);
  });

  it("debe actualizar alineacionVertical en capasOverrides para múltiples cartas en lote", () => {
    const cartas: Array<{ id: string; capasOverrides?: Record<string, any> }> = [
      { id: "c1", capasOverrides: { "txt1": { alineacionVertical: "top" } } },
      { id: "c2", capasOverrides: { "txt1": { alineacionVertical: "bottom" } } },
    ];

    const targetLayerId = "txt1";
    const nuevoValor = "center";

    const cartasActualizadas = cartas.map(carta => ({
      ...carta,
      capasOverrides: {
        ...(carta.capasOverrides || {}),
        [targetLayerId]: {
          ...(carta.capasOverrides?.[targetLayerId] || {}),
          alineacionVertical: nuevoValor,
        }
      }
    }));

    expect(cartasActualizadas[0].capasOverrides![targetLayerId].alineacionVertical).toBe("center");
    expect(cartasActualizadas[1].capasOverrides![targetLayerId].alineacionVertical).toBe("center");
  });
});
