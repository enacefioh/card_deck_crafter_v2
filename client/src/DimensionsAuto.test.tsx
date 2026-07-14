import { describe, it, expect } from "vitest";

describe("Dimensions auto-size logic in EditCardModal & App", () => {
  it("should reset automatic width and height when changing layout to incompatible type", () => {
    // Simulates the handleUpdateCapaProp logic for layout compatibility resets
    const handleUpdateCapaProp = (c: any, propKey: string, propVal: any) => {
      let updatedObj = {
        ...c,
        [propKey]: propVal
      };
      if (propKey === "layout") {
        if (propVal !== "horizontal" && updatedObj.anchoMm === "auto") {
          updatedObj.anchoMm = 40; // Default width fallback
        }
        if (propVal !== "vertical" && updatedObj.altoMm === "auto") {
          updatedObj.altoMm = 20; // Default height fallback
        }
      }
      return updatedObj;
    };

    const initialContainer = {
      id: "cont-1",
      tipo: "container",
      layout: "vertical",
      anchoMm: 30,
      altoMm: "auto" // Auto height enabled since layout is vertical
    };

    // Changing layout to horizontal should reset altoMm to 20 because horizontal layout only permits width auto
    const horizontalContainer = handleUpdateCapaProp(initialContainer, "layout", "horizontal");
    expect(horizontalContainer.altoMm).toBe(20);

    // Changing layout to horizontal and enabling width auto should be fine
    const horizontalAutoWidth = {
      ...horizontalContainer,
      anchoMm: "auto"
    };

    // Changing layout back to vertical should reset anchoMm to 40 because vertical layout only permits height auto
    const verticalContainer = handleUpdateCapaProp(horizontalAutoWidth, "layout", "vertical");
    expect(verticalContainer.anchoMm).toBe(40);
  });

  it("should properly determine auto width/height visibility options", () => {
    const canAutoWidth = (capa: any) => {
      return capa.tipo === "text" || (capa.tipo === "container" && capa.layout === "horizontal");
    };
    const canAutoHeight = (capa: any) => {
      return capa.tipo === "text" || (capa.tipo === "container" && capa.layout === "vertical");
    };

    expect(canAutoWidth({ tipo: "text" })).toBe(true);
    expect(canAutoHeight({ tipo: "text" })).toBe(true);
    expect(canAutoWidth({ tipo: "container", layout: "vertical" })).toBe(false);
    expect(canAutoHeight({ tipo: "container", layout: "vertical" })).toBe(true);
    expect(canAutoWidth({ tipo: "container", layout: "horizontal" })).toBe(true);
    expect(canAutoHeight({ tipo: "container", layout: "horizontal" })).toBe(false);
    expect(canAutoWidth({ tipo: "background" })).toBe(false);
  });
});
