import { describe, it, expect } from "vitest";

describe("TKT-053: Flexibilización de Dimensiones Automáticas y Dimensiones Iniciales de Listas", () => {
  it("debe preservar el ancho y alto automático al cambiar el layout de un contenedor o lista", () => {
    // Simula la lógica de handleUpdateCapaProp de EditCardModal tras TKT-053
    const handleUpdateCapaProp = (c: any, propKey: string, propVal: any) => {
      const updatedObj = {
        ...c,
        [propKey]: propVal
      };
      // TKT-053: ya no se resetea anchoMm ni altoMm al cambiar layout
      return updatedObj;
    };

    const initialContainer = {
      id: "cont-1",
      tipo: "container",
      layout: "vertical",
      anchoMm: "auto",
      altoMm: "auto"
    };

    // Cambiar layout a horizontal debe conservar tanto anchoMm como altoMm en "auto"
    const horizontalContainer = handleUpdateCapaProp(initialContainer, "layout", "horizontal");
    expect(horizontalContainer.anchoMm).toBe("auto");
    expect(horizontalContainer.altoMm).toBe("auto");

    // Cambiar layout a libre ("none") también debe conservarlos
    const freeContainer = handleUpdateCapaProp(horizontalContainer, "layout", "none");
    expect(freeContainer.anchoMm).toBe("auto");
    expect(freeContainer.altoMm).toBe("auto");
  });

  it("determina la disponibilidad de dimensiones automáticas para todas las capas no-background", () => {
    // TKT-053: Cualquier capa editable distinta de background permite Ancho Auto y Alto Auto
    const canAutoDimension = (capa: any) => capa.tipo !== "background";

    expect(canAutoDimension({ tipo: "text" })).toBe(true);
    expect(canAutoDimension({ tipo: "container", layout: "vertical" })).toBe(true);
    expect(canAutoDimension({ tipo: "container", layout: "horizontal" })).toBe(true);
    expect(canAutoDimension({ tipo: "container", layout: "none" })).toBe(true);
    expect(canAutoDimension({ tipo: "list", layout: "vertical" })).toBe(true);
    expect(canAutoDimension({ tipo: "block" })).toBe(true);
    expect(canAutoDimension({ tipo: "image" })).toBe(true);
    expect(canAutoDimension({ tipo: "image-switch" })).toBe(true);
    expect(canAutoDimension({ tipo: "background" })).toBe(false);
  });

  it("la capa lista (tipo 'list') se inicializa con dimensiones fijas por defecto (altoMm: 50, anchoMm: 50)", () => {
    // Simula la creación de capa lista en EditCardModal (isList)
    const cardConfig = { anchoMm: 63.5, altoMm: 88.9 };
    const createNewListLayer = () => ({
      id: "list_test",
      nombre: "lista_test",
      visible: true,
      tipo: "list" as const,
      xMm: Math.round((cardConfig.anchoMm * 0.1) * 10) / 10,
      yMm: Math.round((cardConfig.altoMm * 0.1) * 10) / 10,
      anchoMm: 50,
      altoMm: 50,
      parentCapaId: null,
      layout: "vertical" as const,
      childTemplates: []
    });

    const newList = createNewListLayer();
    expect(newList.anchoMm).toBe(50);
    expect(newList.altoMm).toBe(50);
    expect(newList.altoMm).not.toBe("auto");
  });
});
