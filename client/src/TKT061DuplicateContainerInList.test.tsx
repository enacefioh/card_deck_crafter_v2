import { describe, it, expect } from "vitest";
import { cloneLayerTreeWithNewIds } from "shared";

describe("TKT-061: Duplicate container inside list layer without crash or undefined properties", () => {
  it("cloneLayerTreeWithNewIds debe tolerar tanto objetos de capa como arrays de strings sin fallar", () => {
    const rootCapa = { id: "root_container_1", tipo: "container", nombre: "Contenedor Item", parentCapaId: "list_1" };
    const descendantObjects = [
      { id: "child_text_1", tipo: "text", nombre: "Título", parentCapaId: "root_container_1" },
      { id: "child_img_1", tipo: "image", nombre: "Icono", parentCapaId: "root_container_1" },
    ];

    // Caso 1: Pasando objetos de capa reales
    const res1 = cloneLayerTreeWithNewIds(rootCapa, descendantObjects, "list_1");
    expect(res1.newRoot.id).not.toBe("root_container_1");
    expect(res1.newRoot.parentCapaId).toBe("list_1");
    expect(res1.newDescendants.length).toBe(2);
    expect(res1.newDescendants[0].parentCapaId).toBe(res1.newRoot.id);
    expect(res1.newDescendants[1].parentCapaId).toBe(res1.newRoot.id);
    expect(typeof res1.newDescendants[0]).toBe("object");

    // Caso 2: Pasando strings de IDs defensivamente
    const descendantStrings = ["child_text_1", "child_img_1"];
    const res2 = cloneLayerTreeWithNewIds(rootCapa, descendantStrings as any, "list_1");
    expect(res2.idMap.has("child_text_1")).toBe(true);
    expect(res2.idMap.has("child_img_1")).toBe(true);
    // newDescendants solo debe contener objetos, nunca strings
    expect(res2.newDescendants.every((d) => typeof d === "object")).toBe(true);
  });

  it("debe duplicar correctamente un elemento contenedor dentro de una lista con sus capas hijas y propiedades expuestas", () => {
    const rootContainer = {
      id: "item_container_1",
      tipo: "container",
      nombre: "Habilidad Item",
      parentCapaId: "lista_habilidades",
    };
    const childText = {
      id: "item_texto_1",
      tipo: "text",
      nombre: "Nombre Habilidad",
      parentCapaId: "item_container_1",
      contenidoRaw: "Golpe Certero",
    };
    const childIcon = {
      id: "item_icono_1",
      tipo: "image",
      nombre: "Icono Habilidad",
      parentCapaId: "item_container_1",
      src: "data:image/png;base64,mock",
    };

    const capas = [
      { id: "lista_habilidades", tipo: "list", nombre: "Lista Habilidades", parentCapaId: null },
      rootContainer,
      childText,
      childIcon,
    ];

    const exposedProperties = [
      { layerId: "item_texto_1", property: "contenidoRaw", label: "Texto de Habilidad" },
      { layerId: "item_icono_1", property: "src", label: "Icono de Habilidad" },
    ];

    const getDescendantIds = (parentId: string, allCapas: any[]): string[] => {
      const ids: string[] = [];
      const children = allCapas.filter((c: any) => c.parentCapaId === parentId);
      for (const ch of children) {
        ids.push(ch.id);
        ids.push(...getDescendantIds(ch.id, allCapas));
      }
      return ids;
    };

    // Simulación de la lógica corregida en App.tsx handleDuplicateListItem
    const descendantIds = getDescendantIds(rootContainer.id, capas);
    expect(descendantIds).toEqual(["item_texto_1", "item_icono_1"]);

    const descendantCapas = descendantIds
      .map((id: string) => capas.find((x: any) => x.id === id))
      .filter(Boolean);

    const { newRoot, newDescendants, idMap } = cloneLayerTreeWithNewIds(rootContainer, descendantCapas, "lista_habilidades");

    expect(newRoot.id).not.toBe("item_container_1");
    expect(newRoot.parentCapaId).toBe("lista_habilidades");
    expect(newDescendants.length).toBe(2);

    // Comprobar que los descendientes tienen nuevo parentCapaId apuntando al nuevo contenedor
    newDescendants.forEach((d) => {
      expect(d.parentCapaId).toBe(newRoot.id);
      expect(d.id).not.toBe("item_texto_1");
      expect(d.id).not.toBe("item_icono_1");
      expect(typeof d).toBe("object");
    });

    // Mapeo seguro de propiedades expuestas
    const allOriginalIds = new Set([rootContainer.id, ...descendantIds]);
    const relatedExposed = exposedProperties.filter((ep: any) => allOriginalIds.has(ep.layerId));
    const newExposed = relatedExposed
      .map((ep: any) => {
        const mappedId = idMap.get(ep.layerId);
        if (!mappedId) return null;
        return {
          ...ep,
          layerId: mappedId,
        };
      })
      .filter(Boolean) as any[];

    expect(newExposed.length).toBe(2);
    expect(newExposed[0].layerId).toBe(idMap.get("item_texto_1"));
    expect(newExposed[1].layerId).toBe(idMap.get("item_icono_1"));
    expect(newExposed.every((ep) => ep.layerId !== undefined)).toBe(true);

    // Empalme en capas sin insertar ningún string corrupto
    const lastDescendantId = descendantIds.length > 0 ? descendantIds[descendantIds.length - 1] : rootContainer.id;
    const insertIdx = capas.findIndex((x: any) => x.id === lastDescendantId);
    const nextCapas = [...capas];
    nextCapas.splice(insertIdx + 1, 0, newRoot, ...newDescendants);

    expect(nextCapas.length).toBe(7);
    nextCapas.forEach((c) => {
      expect(typeof c).toBe("object");
      expect(typeof c.id).toBe("string");
      expect(typeof c.tipo).toBe("string");
    });
  });
});
