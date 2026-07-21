import { describe, it, expect } from "vitest";
import { actualizarClavePlantillaYValores } from "./utils/projectUtils";

describe("Exposed Properties Path Renaming & Sincronización de Labels (TKT-041)", () => {
  it("debe actualizar correctamente los labels de exposedProperties en la plantilla y en los inputs al renombrar una capa", () => {
    // Definimos una plantilla con capas anidadas:
    // Contenedor_0853
    //   Contenedor_7749
    //     Campo_6461
    const plantilla = {
      id: "plantilla_1",
      nombre: "Plantilla 1",
      capas: [
        { id: "c1", nombre: "Contenedor_0853", tipo: "container", parentCapaId: null },
        { id: "c2", nombre: "Contenedor_7749", tipo: "container", parentCapaId: "c1" },
        { id: "c3", nombre: "Campo_6461", tipo: "text", parentCapaId: "c2" }
      ],
      exposedProperties: [
        { layerId: "c2", property: "visibility", label: "Contenedor_0853 > Contenedor_7749: Visibilidad" },
        { layerId: "c3", property: "contenidoRaw", label: "Contenedor_0853 > Contenedor_7749 > Campo_6461: Contenido" }
      ],
      camposConfig: [
        { clave: "Contenedor_0853 > Contenedor_7749: Visibilidad", nombreLegible: "Contenedor_0853 > Contenedor_7749: Visibilidad", tipo: "text" },
        { clave: "Contenedor_0853 > Contenedor_7749 > Campo_6461: Contenido", nombreLegible: "Contenedor_0853 > Contenedor_7749 > Campo_6461: Contenido", tipo: "text" }
      ]
    };

    const valoresCampos = {
      "Contenedor_0853 > Contenedor_7749: Visibilidad": "visible",
      "Contenedor_0853 > Contenedor_7749 > Campo_6461: Contenido": "Valor original"
    };

    // Simulamos el renombramiento de c2 de "Contenedor_7749" a "Contenedor_7749_Nuevo"
    const resultado = actualizarClavePlantillaYValores(
      plantilla,
      valoresCampos,
      "c2",
      "Contenedor_7749",
      "Contenedor_7749_Nuevo"
    );

    // Comprobamos que el nombre de la capa ha cambiado en la plantilla
    const c2Modificada = resultado.plantilla.capas.find((c: any) => c.id === "c2");
    expect(c2Modificada.nombre).toBe("Contenedor_7749_Nuevo");

    // Comprobamos que las exposedProperties se han actualizado con las nuevas rutas jerárquicas
    expect(resultado.plantilla.exposedProperties[0].label).toBe("Contenedor_0853 > Contenedor_7749_Nuevo: Visibilidad");
    expect(resultado.plantilla.exposedProperties[1].label).toBe("Contenedor_0853 > Contenedor_7749_Nuevo > Campo_6461: Contenido");

    // Comprobamos que los camposConfig se han renombrado
    const configVisibilidad = resultado.plantilla.camposConfig.find((f: any) => f.clave === "Contenedor_0853 > Contenedor_7749_Nuevo: Visibilidad");
    const configContenido = resultado.plantilla.camposConfig.find((f: any) => f.clave === "Contenedor_0853 > Contenedor_7749_Nuevo > Campo_6461: Contenido");
    expect(configVisibilidad).toBeDefined();
    expect(configContenido).toBeDefined();

    // Comprobamos que los valores de los campos se han sincronizado
    expect(resultado.valoresCampos["Contenedor_0853 > Contenedor_7749_Nuevo: Visibilidad"]).toBe("visible");
    expect(resultado.valoresCampos["Contenedor_0853 > Contenedor_7749_Nuevo > Campo_6461: Contenido"]).toBe("Valor original");
    expect(resultado.valoresCampos["Contenedor_0853 > Contenedor_7749: Visibilidad"]).toBeUndefined();
  });
});
