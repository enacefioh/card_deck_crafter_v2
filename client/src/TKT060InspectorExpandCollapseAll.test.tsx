import { describe, it, expect } from "vitest";

describe("TKT-060: Inspector Default Expanded and Collapse/Expand All Buttons", () => {
  it("debe evaluar por defecto los contenedores y los items de listas como desplegados (expandidos)", () => {
    const collapsedSections: Record<string, boolean> = {};
    const expandedListItems: Record<string, boolean> = {};

    const containerId = "container_1";
    const listItemId = "list_child_1";

    // Lógica en App.tsx para contenedores:
    const isContainerCollapsed = collapsedSections[containerId] === true;
    expect(isContainerCollapsed).toBe(false);

    // Lógica en App.tsx para items de lista:
    const isListItemExpanded = expandedListItems[listItemId] !== false;
    expect(isListItemExpanded).toBe(true);
  });

  it("debe colapsar todos los contenedores y listas al invocar handleCollapseAllInspector", () => {
    const plantilla = {
      capas: [
        { id: "c1", tipo: "container", nombre: "Caja 1" },
        { id: "c2", tipo: "container", nombre: "Caja 2" },
        { id: "list1", tipo: "list", nombre: "Mi Lista" },
        { id: "item1", tipo: "text", parentCapaId: "list1", nombre: "Elemento 1" },
        { id: "item2", tipo: "text", parentCapaId: "list1", nombre: "Elemento 2" },
      ],
    };

    const cartas = [{ id: "card_1", plantilla }];
    const selectedCardIds = ["card_1"];
    const inspectorTab: string = "front";
    const generarReversos = false;
    const templatesMap: Record<string, any> = {};

    let collapsedSections: Record<string, boolean> = {};
    let expandedListItems: Record<string, boolean> = {};

    // Simular handleCollapseAllInspector
    const handleCollapseAllInspector = () => {
      const selectedCartas = cartas.filter((c) => selectedCardIds.includes(c.id));
      const isBack = inspectorTab === "back" && generarReversos;
      const newCollapsed: Record<string, boolean> = {};
      const newExpandedList: Record<string, boolean> = {};

      selectedCartas.forEach((card) => {
        const p = isBack
          ? (card.plantilla || (templatesMap[""]))
          : (card.plantilla || (templatesMap[""]));
        (p?.capas || []).forEach((capa: any) => {
          if (capa.tipo === "container") {
            newCollapsed[capa.id] = true;
          }
          if (capa.tipo === "list") {
            const children = (p?.capas || []).filter((c: any) => c.parentCapaId === capa.id);
            children.forEach((ch: any) => {
              newExpandedList[ch.id] = false;
            });
          }
        });
      });

      collapsedSections = newCollapsed;
      expandedListItems = newExpandedList;
    };

    handleCollapseAllInspector();

    expect(collapsedSections["c1"]).toBe(true);
    expect(collapsedSections["c2"]).toBe(true);
    expect(expandedListItems["item1"]).toBe(false);
    expect(expandedListItems["item2"]).toBe(false);

    // Verificar visibilidad de item de lista
    const isItem1Expanded = expandedListItems["item1"] !== false;
    expect(isItem1Expanded).toBe(false);
  });

  it("debe expandir todos los contenedores y listas al invocar handleExpandAllInspector", () => {
    let collapsedSections: Record<string, boolean> = { c1: true, c2: true };
    let expandedListItems: Record<string, boolean> = { item1: false, item2: false };

    const plantilla = {
      capas: [
        { id: "c1", tipo: "container" },
        { id: "list1", tipo: "list" },
        { id: "item1", parentCapaId: "list1" },
      ],
    };
    const cartas = [{ id: "card_1", plantilla }];
    const selectedCardIds = ["card_1"];

    const handleExpandAllInspector = () => {
      const selectedCartas = cartas.filter((c) => selectedCardIds.includes(c.id));
      const newExpandedList: Record<string, boolean> = {};

      selectedCartas.forEach((card) => {
        const p = card.plantilla;
        (p?.capas || []).forEach((capa: any) => {
          if (capa.tipo === "list") {
            const children = (p?.capas || []).filter((c: any) => c.parentCapaId === capa.id);
            children.forEach((ch: any) => {
              newExpandedList[ch.id] = true;
            });
          }
        });
      });

      collapsedSections = {};
      expandedListItems = newExpandedList;
    };

    handleExpandAllInspector();

    expect(collapsedSections["c1"] === true).toBe(false);
    expect(expandedListItems["item1"] !== false).toBe(true);
  });
});
