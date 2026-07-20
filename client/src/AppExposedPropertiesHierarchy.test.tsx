import { describe, it, expect } from "vitest";

describe("Exposed Properties Hierarchical Sorting and Recursive Visibility (TKT-041)", () => {
  const PROPERTY_WEIGHTS: Record<string, number> = {
    visibility: 1,
    contenidoRaw: 2,
    src: 3,
    selectedOptionId: 4,
    modoAjuste: 5,
    xMm: 6,
    yMm: 7,
    anchoMm: 8,
    altoMm: 9,
  };

  const getHierarchicalLayers = (capas: any[]) => {
    const result: any[] = [];
    const visited = new Set<string>();
    const visit = (parentId: string | null) => {
      const children = capas.filter(c => c.parentCapaId === parentId);
      for (const child of children) {
        if (visited.has(child.id)) continue;
        visited.add(child.id);
        result.push(child);
        visit(child.id);
      }
    };
    visit(null);
    capas.forEach(c => {
      if (!visited.has(c.id)) {
        result.push(c);
      }
    });
    return result;
  };

  const ordenarPropiedadesExpuestas = (propiedades: any[], capasOrdenadas: any[]) => {
    return [...propiedades].sort((a, b) => {
      const idxA = capasOrdenadas.findIndex(c => c.id === a.layerId);
      const idxB = capasOrdenadas.findIndex(c => c.id === b.layerId);
      if (idxA !== idxB) return idxA - idxB;
      
      const wA = PROPERTY_WEIGHTS[a.property] ?? 100;
      const wB = PROPERTY_WEIGHTS[b.property] ?? 100;
      if (wA !== wB) return wA - wB;
      return a.property.localeCompare(b.property);
    });
  };

  const isLayerVisibleOnCard = (capaId: string, layers: any[], overrides: Record<string, any>): boolean => {
    const capa = layers.find((x) => x.id === capaId);
    if (!capa) return false;

    const override = overrides[capaId];
    const visibility = override?.visibility !== undefined ? override.visibility : (capa.visibility || "visible");
    const visible = override?.visible !== undefined ? override.visible : (capa.visible !== false);

    if (visibility === "collapsed" || visibility === "hidden" || !visible) {
      return false;
    }

    if (capa.parentCapaId) {
      return isLayerVisibleOnCard(capa.parentCapaId, layers, overrides);
    }
    return true;
  };

  it("debe ordenar las propiedades expuestas por orden jerárquico de capa (DFS pre-order) y luego por peso de propiedad", () => {
    const mockLayers = [
      { id: "layer_root_text", tipo: "text", parentCapaId: null },
      { id: "layer_parent", tipo: "container", parentCapaId: null },
      { id: "layer_child_b", tipo: "text", parentCapaId: "layer_parent" },
      { id: "layer_child_a", tipo: "text", parentCapaId: "layer_parent" }
    ];

    const unorderedExposed = [
      { layerId: "layer_child_b", property: "contenidoRaw" },
      { layerId: "layer_child_b", property: "visibility" },
      { layerId: "layer_root_text", property: "contenidoRaw" },
      { layerId: "layer_child_a", property: "contenidoRaw" }
    ];

    const capasOrdenadas = getHierarchicalLayers(mockLayers);
    const sorted = ordenarPropiedadesExpuestas(unorderedExposed, capasOrdenadas);

    // Esperamos el siguiente orden:
    // 1. layer_root_text (contenidoRaw) -- raíz primero
    // 2. layer_child_b (visibility) -- hijo b, visibilidad (peso 1)
    // 3. layer_child_b (contenidoRaw) -- hijo b, contenido (peso 2)
    // 4. layer_child_a (contenidoRaw) -- hijo a (aparece después de b en DFS pre-order)
    expect(sorted[0].layerId).toBe("layer_root_text");
    expect(sorted[1].layerId).toBe("layer_child_b");
    expect(sorted[1].property).toBe("visibility");
    expect(sorted[2].layerId).toBe("layer_child_b");
    expect(sorted[2].property).toBe("contenidoRaw");
    expect(sorted[3].layerId).toBe("layer_child_a");
  });

  it("debe ocultar recursivamente las propiedades expuestas si un contenedor padre es invisible", () => {
    const mockLayers = [
      { id: "layer_parent", tipo: "container", parentCapaId: null, visibility: "visible" },
      { id: "layer_child", tipo: "text", parentCapaId: "layer_parent", visibility: "visible" }
    ];

    // Caso 1: Todo visible
    const overridesAllVisible = {};
    expect(isLayerVisibleOnCard("layer_child", mockLayers, overridesAllVisible)).toBe(true);

    // Caso 2: Padre colapsado en overrides
    const overridesParentCollapsed = {
      layer_parent: { visibility: "collapsed" }
    };
    expect(isLayerVisibleOnCard("layer_child", mockLayers, overridesParentCollapsed)).toBe(false);

    // Caso 3: Padre invisible en overrides (visible: false)
    const overridesParentInvisible = {
      layer_parent: { visible: false }
    };
    expect(isLayerVisibleOnCard("layer_child", mockLayers, overridesParentInvisible)).toBe(false);
  });
});
