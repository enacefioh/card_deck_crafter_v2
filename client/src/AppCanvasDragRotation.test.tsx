import { describe, it, expect } from "vitest";

describe("Ancestral Rotation Zeroing and Restoration on Canvas Drag", () => {
  it("debe recopilar la cadena de ancestros y permitir anular e igualar las rotaciones a 0 durante el arrastre y restaurarlas al finalizar", () => {
    // Definición de jerarquía de capas: Abuelo (A) -> Padre (B) -> Hijo (C)
    const capas = [
      { id: "A", nombre: "Abuelo", rotacion: 45, parentCapaId: null },
      { id: "B", nombre: "Padre", rotacion: 30, parentCapaId: "A" },
      { id: "C", nombre: "Hijo", rotacion: 15, parentCapaId: "B" },
    ];

    const getAncestorChainIds = (targetId: string, capasList: any[]): string[] => {
      const chain: string[] = [];
      let currentId: string | null = targetId;
      while (currentId) {
        chain.push(currentId);
        const lObj = capasList.find(x => x.id === currentId);
        currentId = lObj?.parentCapaId || null;
      }
      return chain;
    };

    const targetLayerId = "C";
    const chainIds = getAncestorChainIds(targetLayerId, capas);
    expect(chainIds).toEqual(["C", "B", "A"]);

    const overrides: Record<string, any> = {};
    const savedRotations: Record<string, number> = {};

    chainIds.forEach(id => {
      const lObj = capas.find(x => x.id === id);
      const ov = overrides[id];
      const rot = Number(ov?.rotacion !== undefined ? ov.rotacion : (lObj?.rotacion || 0));
      savedRotations[id] = rot;
    });

    expect(savedRotations).toEqual({
      C: 15,
      B: 30,
      A: 45,
    });

    // Simular mouseDown (rotaciones a 0)
    const activeOverrides: Record<string, any> = {};
    chainIds.forEach(id => {
      activeOverrides[id] = { ...(activeOverrides[id] || {}), rotacion: 0 };
    });

    expect(activeOverrides["C"].rotacion).toBe(0);
    expect(activeOverrides["B"].rotacion).toBe(0);
    expect(activeOverrides["A"].rotacion).toBe(0);

    // Simular mouseUp (restauración)
    const restoredOverrides: Record<string, any> = {};
    chainIds.forEach(id => {
      restoredOverrides[id] = { ...(restoredOverrides[id] || {}), rotacion: savedRotations[id] };
    });

    expect(restoredOverrides["C"].rotacion).toBe(15);
    expect(restoredOverrides["B"].rotacion).toBe(30);
    expect(restoredOverrides["A"].rotacion).toBe(45);
  });
});
