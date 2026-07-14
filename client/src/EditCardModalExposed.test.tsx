import { describe, it, expect } from "vitest";

// Mock minimal test case to verify logic of exposedProperties management
describe("EditCardModal exposedProperties logic", () => {
  it("should toggle property exposed correctly", () => {
    let exposedProperties: any[] = [];
    const togglePropertyExposed = (layerId: string, property: string, label: string) => {
      const exists = exposedProperties.some((p) => p.layerId === layerId && p.property === property);
      if (exists) {
        exposedProperties = exposedProperties.filter((p) => !(p.layerId === layerId && p.property === property));
      } else {
        exposedProperties = [...exposedProperties, { layerId, property, label }];
      }
    };

    togglePropertyExposed("layer1", "contenidoRaw", "Text Content");
    expect(exposedProperties).toHaveLength(1);
    expect(exposedProperties[0].property).toBe("contenidoRaw");

    togglePropertyExposed("layer1", "contenidoRaw", "Text Content");
    expect(exposedProperties).toHaveLength(0);
  });

  it("should update exposed property labels when renaming the layer", () => {
    let exposedProperties = [
      { layerId: "layer1", property: "contenidoRaw", label: "TextoViejo > Contenido Texto" }
    ];

    const handleUpdateCapaClave = (layerId: string, oldClave: string, newClave: string) => {
      exposedProperties = exposedProperties.map((p) => {
        if (p.layerId === layerId) {
          const oldPrefix = `${oldClave} >`;
          const newPrefix = `${newClave} >`;
          if (p.label.startsWith(oldPrefix)) {
            return { ...p, label: p.label.replace(oldPrefix, newPrefix) };
          }
        }
        return p;
      });
    };

    handleUpdateCapaClave("layer1", "TextoViejo", "TextoNuevo");
    expect(exposedProperties[0].label).toBe("TextoNuevo > Contenido Texto");
  });

  it("should default to exposing primary property if empty on save", () => {
    const handleSaveExposedDefaults = (layers: any[], exposed: any[]) => {
      if (exposed.length > 0) return exposed;

      const nextExposed = [...exposed];
      layers.forEach((layer) => {
        if (layer.tipo === "text") {
          nextExposed.push({
            layerId: layer.id,
            property: "contenidoRaw",
            label: `${layer.nombre} > Contenido Texto`
          });
        } else if (layer.tipo === "image" || layer.tipo === "image-switch") {
          nextExposed.push({
            layerId: layer.id,
            property: "src",
            label: `${layer.nombre} > Recurso Imagen`
          });
        }
      });
      return nextExposed;
    };

    const mockLayers = [
      { id: "l1", tipo: "text", nombre: "Capa1" },
      { id: "l2", tipo: "container", nombre: "Box" },
      { id: "l3", tipo: "image", nombre: "Img" }
    ];

    const result = handleSaveExposedDefaults(mockLayers, []);
    expect(result).toHaveLength(2);
    expect(result[0].property).toBe("contenidoRaw");
    expect(result[1].property).toBe("src");
  });
});
