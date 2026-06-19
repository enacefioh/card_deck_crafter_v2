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

export function moverCartas(cartas: any[], selectedIds: string[], direccion: "arriba" | "abajo"): any[] {
  if (selectedIds.length === 0) return cartas;

  // Obtener índices de los elementos seleccionados
  const indices = selectedIds
    .map(id => cartas.findIndex(c => c.id === id))
    .filter(idx => idx !== -1)
    .sort((a, b) => a - b);

  if (indices.length === 0) return cartas;

  // Verificar si la selección es contigua
  const esContiguo = indices[indices.length - 1] - indices[0] + 1 === indices.length;
  if (!esContiguo) return cartas;

  const resultado = [...cartas];

  if (direccion === "arriba") {
    if (indices[0] === 0) return cartas; // Ya está al principio

    const insertIdx = indices[0] - 1;
    const itemsAMover = resultado.splice(indices[0], indices.length);
    resultado.splice(insertIdx, 0, ...itemsAMover);
  } else {
    if (indices[indices.length - 1] === cartas.length - 1) return cartas; // Ya está al final

    const insertIdx = indices[0] + 1;
    const itemsAMover = resultado.splice(indices[0], indices.length);
    resultado.splice(insertIdx, 0, ...itemsAMover);
  }

  return resultado;
}

export function duplicarCartas(cartas: any[], selectedIds: string[]): any[] {
  const resultado: any[] = [];
  for (const carta of cartas) {
    resultado.push(carta);
    if (selectedIds.includes(carta.id)) {
      const copia = {
        ...carta,
        id: `${carta.id}_copia_${Math.random().toString(36).substring(2, 9)}`,
        nombre: `${carta.nombre} (Copia)`
      };
      resultado.push(copia);
    }
  }
  return resultado;
}

export function insertarCartaDesdePlantilla(
  cartas: any[],
  nuevaCarta: any,
  selectedIds: string[]
): any[] {
  const resultado = [...cartas];
  if (selectedIds.length > 0) {
    let maxIdx = -1;
    for (const id of selectedIds) {
      const idx = cartas.findIndex(c => c.id === id);
      if (idx > maxIdx) {
        maxIdx = idx;
      }
    }
    if (maxIdx !== -1) {
      resultado.splice(maxIdx + 1, 0, nuevaCarta);
      return resultado;
    }
  }
  resultado.push(nuevaCarta);
  return resultado;
}

