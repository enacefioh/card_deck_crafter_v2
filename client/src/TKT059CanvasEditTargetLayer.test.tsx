import { describe, it, expect } from "vitest";

describe("TKT-059: Target layer resolution on canvas drag / resize", () => {
  it("debe mantener targetCapaId como capa objetivo aunque múltiples capas expongan canvasEditMode", () => {
    // Escenario: Plantilla con dos capas, ambas con canvasEditMode expuesto
    const plantilla = {
      id: "plantilla_1",
      nombre: "Plantilla de Prueba",
      capas: [
        { id: "layer_titulo", nombre: "Título", tipo: "text", xMm: 10, yMm: 10, anchoMm: 40, altoMm: 10 },
        { id: "layer_desc", nombre: "Descripción", tipo: "text", xMm: 10, yMm: 30, anchoMm: 40, altoMm: 20 },
      ],
      exposedProperties: [
        { layerId: "layer_titulo", property: "canvasEditMode", label: "Posición Título" },
        { layerId: "layer_desc", property: "canvasEditMode", label: "Posición Descripción" },
      ],
    };

    const carta = {
      id: "card_1",
      plantilla,
      capasOverrides: {} as Record<string, any>,
    };

    const selectedCardIds = ["card_1"];
    const cartas = [carta];
    const targetCapaId = "layer_desc"; // El usuario hace drag en "layer_desc"

    // Función de resolución corregida según TKT-059
    const resolveTargetLayerId = (c: any, targetId: string) => {
      const p = c.plantilla;
      let targetLayerId = targetId;
      if (p?.capas && !p.capas.some((x: any) => x.id === targetId)) {
        const baseCard = cartas.find(x => selectedCardIds.includes(x.id));
        const baseP = baseCard?.plantilla;
        const baseLayer = baseP?.capas?.find((x: any) => x.id === targetId);
        if (baseLayer) {
          const matchLayer = p.capas.find((x: any) => x.nombre === baseLayer.nombre && x.tipo === baseLayer.tipo);
          if (matchLayer) {
            targetLayerId = matchLayer.id;
          }
        }
      }
      return targetLayerId;
    };

    const resolvedLayerId = resolveTargetLayerId(carta, targetCapaId);
    expect(resolvedLayerId).toBe("layer_desc");
    expect(resolvedLayerId).not.toBe("layer_titulo");

    // Simular el arrastre (mouseMove) aplicando delta a la capa resuelta
    const deltaXMm = 5;
    const deltaYMm = 10;
    const initialLayer = plantilla.capas.find(x => x.id === resolvedLayerId)!;

    const nextOverrides = {
      ...carta.capasOverrides,
      [resolvedLayerId]: {
        ...(carta.capasOverrides[resolvedLayerId] || {}),
        xMm: Number((initialLayer.xMm + deltaXMm).toFixed(1)),
        yMm: Number((initialLayer.yMm + deltaYMm).toFixed(1)),
      },
    };

    // Verificar que solo layer_desc tiene overrides y con las coordenadas correctas
    expect(nextOverrides["layer_desc"]).toEqual({ xMm: 15, yMm: 40 });
    expect(nextOverrides["layer_titulo"]).toBeUndefined();
  });

  it("debe resolver por coincidencia de nombre y tipo si una carta seleccionada usa una versión clonada con diferentes IDs", () => {
    const basePlantilla = {
      id: "p_base",
      capas: [
        { id: "layer_orig_1", nombre: "Cuerpo", tipo: "text", xMm: 5, yMm: 5 },
      ],
    };
    const clonedPlantilla = {
      id: "p_cloned",
      capas: [
        { id: "layer_cloned_999", nombre: "Cuerpo", tipo: "text", xMm: 5, yMm: 5 },
      ],
    };

    const selectedCardIds = ["card_1", "card_2"];
    const card1 = { id: "card_1", plantilla: basePlantilla };
    const card2 = { id: "card_2", plantilla: clonedPlantilla };
    const cartas = [card1, card2];

    const targetCapaId = "layer_orig_1";

    const resolveTargetLayerId = (c: any, targetId: string) => {
      const p = c.plantilla;
      let targetLayerId = targetId;
      if (p?.capas && !p.capas.some((x: any) => x.id === targetId)) {
        const baseCard = cartas.find(x => selectedCardIds.includes(x.id));
        const baseP = baseCard?.plantilla;
        const baseLayer = baseP?.capas?.find((x: any) => x.id === targetId);
        if (baseLayer) {
          const matchLayer = p.capas.find((x: any) => x.nombre === baseLayer.nombre && x.tipo === baseLayer.tipo);
          if (matchLayer) {
            targetLayerId = matchLayer.id;
          }
        }
      }
      return targetLayerId;
    };

    expect(resolveTargetLayerId(card1, targetCapaId)).toBe("layer_orig_1");
    expect(resolveTargetLayerId(card2, targetCapaId)).toBe("layer_cloned_999");
  });
});
