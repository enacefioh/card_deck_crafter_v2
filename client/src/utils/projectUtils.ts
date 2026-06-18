export function validarYParsearProyecto(jsonText: string): any {
  if (!jsonText || jsonText.trim() === "") {
    throw new Error("El archivo de configuración JSON está vacío.");
  }

  let proyecto: any;
  try {
    proyecto = JSON.parse(jsonText);
  } catch (e) {
    throw new Error("El archivo no contiene un JSON válido.");
  }

  if (proyecto.version !== "2.0.0") {
    throw new Error("Versión de proyecto no soportada. Se requiere versión 2.0.0.");
  }

  if (!proyecto.canvasConfig) {
    throw new Error("Estructura de proyecto inválida. Falta la configuración del lienzo (canvasConfig).");
  }

  if (!proyecto.cardConfig) {
    throw new Error("Estructura de proyecto inválida. Falta la configuración de la carta (cardConfig).");
  }

  if (!Array.isArray(proyecto.cards)) {
    throw new Error("Estructura de proyecto inválida. La sección de cartas (cards) debe ser una lista.");
  }

  return proyecto;
}
