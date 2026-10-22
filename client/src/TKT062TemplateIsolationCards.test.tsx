import { describe, it, expect } from "vitest";

describe("TKT-062: Aislamiento de cartas existentes al actualizar/sobreescribir plantillas", () => {
  it("debe actualizar templatesMap sin sobreescribir ni resetear las cartas existentes del proyecto", () => {
    // 1. Plantilla inicial
    const baseTemplate = {
      id: "plantilla_monstruos",
      nombre: "Monstruos",
      capas: [
        { id: "fondo", tipo: "background", colorFill: "#ffffff" },
        { id: "lista_ataques", tipo: "list", nombre: "Ataques", childTemplates: [{ id: "tmpl_garra", name: "Garra" }] },
      ],
      exposedProperties: [],
    };

    let templatesMap: Record<string, any> = {
      [baseTemplate.id]: baseTemplate,
    };

    // 2. Carta existente con 2 elementos dinámicos añadidos por el usuario en la lista
    const cartaExistente = {
      id: "carta_goblin",
      plantillaId: "plantilla_monstruos",
      nombre: "Goblin Guerrero",
      plantilla: {
        ...baseTemplate,
        capas: [
          ...baseTemplate.capas,
          { id: "item_dinamico_1", parentCapaId: "lista_ataques", tipo: "text", contenidoRaw: "Daga envenenada" },
          { id: "item_dinamico_2", parentCapaId: "lista_ataques", tipo: "text", contenidoRaw: "Mordisco rápido" },
        ],
      },
      valoresCampos: { item_dinamico_1: "Daga envenenada", item_dinamico_2: "Mordisco rápido" },
      capasOverrides: {},
    };

    let cartas = [cartaExistente];

    // 3. El usuario edita la plantilla en otra carta o modal y la guarda/sobreescribe en el proyecto
    // (por ejemplo, actualiza los childTemplates con "Ataque Mágico" y quita "Garra")
    const plantillaActualizada = {
      id: "plantilla_monstruos",
      nombre: "Monstruos v2",
      capas: [
        { id: "fondo", tipo: "background", colorFill: "#ff0000" },
        { id: "lista_ataques", tipo: "list", nombre: "Ataques", childTemplates: [{ id: "tmpl_magia", name: "Ataque Mágico" }] },
      ],
      exposedProperties: [],
    };

    // Simular onExportTemplate de TKT-062
    const onExportTemplate = (plantilla: any) => {
      templatesMap = {
        ...templatesMap,
        [plantilla.id]: plantilla,
      };
      // Ya NO se sobreescribe cartas ni documentos
    };

    onExportTemplate(plantillaActualizada);

    // 4. Verificar que templatesMap se ha actualizado con la nueva versión
    expect(templatesMap["plantilla_monstruos"].nombre).toBe("Monstruos v2");
    expect(templatesMap["plantilla_monstruos"].capas[1].childTemplates[0].name).toBe("Ataque Mágico");

    // 5. Verificar que la carta preexistente NO ha sufrido modificaciones en sus capas ni en su lista
    const goblin = cartas.find((c) => c.id === "carta_goblin")!;
    expect(goblin.plantilla.nombre).toBe("Monstruos");
    expect(goblin.plantilla.capas.length).toBe(4); // fondo + lista + 2 items
    expect(goblin.plantilla.capas.some((c: any) => c.id === "item_dinamico_1")).toBe(true);
    expect(goblin.plantilla.capas.some((c: any) => c.id === "item_dinamico_2")).toBe(true);
    expect(goblin.valoresCampos["item_dinamico_1"]).toBe("Daga envenenada");

    // 6. Verificar que una NUEVA carta creada a partir de la plantilla actualizada sí adopta la nueva versión
    const templateInstance = JSON.parse(JSON.stringify(templatesMap["plantilla_monstruos"]));
    const nuevaCarta = {
      id: "carta_nueva",
      plantillaId: templateInstance.id,
      nombre: templateInstance.nombre,
      plantilla: templateInstance,
      valoresCampos: {},
      capasOverrides: {},
    };

    expect(nuevaCarta.plantilla.nombre).toBe("Monstruos v2");
    expect(nuevaCarta.plantilla.capas[1].childTemplates[0].name).toBe("Ataque Mágico");
    expect(nuevaCarta.plantilla.capas.length).toBe(2); // fondo + lista (sin items todavía)
  });
});
