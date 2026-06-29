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

  if (proyecto.version !== "2.0.0" && proyecto.version !== "2.1.0") {
    throw new Error("Versión de proyecto no soportada. Se requiere versión 2.0.0 o 2.1.0.");
  }

  // Si es la versión clásica, migramos a la versión 2.1.0 multidocumento
  if (proyecto.version === "2.0.0") {
    if (!proyecto.canvasConfig) {
      throw new Error("Estructura de proyecto inválida. Falta la configuración del lienzo (canvasConfig).");
    }
    if (!proyecto.cardConfig) {
      throw new Error("Estructura de proyecto inválida. Falta la configuración de la carta (cardConfig).");
    }
    if (!Array.isArray(proyecto.cards)) {
      throw new Error("Estructura de proyecto inválida. La sección de cartas (cards) debe ser una lista.");
    }

    const defaultDoc = {
      id: "doc_default",
      nombre: "Documento 1",
      canvasConfig: proyecto.canvasConfig,
      cardConfig: proyecto.cardConfig,
      modoTraseras: proyecto.modoTraseras || "ninguno",
      imagenTraseraComun: proyecto.imagenTraseraComun || null,
      cards: proyecto.cards
    };

    proyecto.documentos = [defaultDoc];
    proyecto.activeDocumentoId = "doc_default";
    proyecto.version = "2.1.0";

    // Opcionalmente eliminar los campos viejos de la raíz del JSON
    delete proyecto.canvasConfig;
    delete proyecto.cardConfig;
    delete proyecto.modoTraseras;
    delete proyecto.imagenTraseraComun;
    delete proyecto.cards;
  }

  // Validaciones del formato 2.1.0
  if (!Array.isArray(proyecto.documentos) || proyecto.documentos.length === 0) {
    throw new Error("Estructura de proyecto inválida. El proyecto debe contener al menos un documento.");
  }

  if (!proyecto.activeDocumentoId) {
    throw new Error("Estructura de proyecto inválida. No se ha definido el documento activo.");
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
        nombre: `${carta.nombre} (Copia)`,
        plantilla: carta.plantilla ? JSON.parse(JSON.stringify(carta.plantilla)) : undefined,
        plantillaTrasera: carta.plantillaTrasera ? JSON.parse(JSON.stringify(carta.plantillaTrasera)) : undefined
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

export function actualizarClavePlantillaYValores(
  plantilla: any,
  valoresCampos: Record<string, string>,
  capaId: string,
  oldClave: string | null,
  newClave: string
): { plantilla: any; valoresCampos: Record<string, string> } {
  const sanitizedClave = newClave.replace(/[^a-zA-Z0-9_]/g, "").trim();
  if (!sanitizedClave) return { plantilla, valoresCampos };

  const updatedCapas = plantilla.capas.map((c: any) => {
    if (c.id === capaId) {
      return {
        ...c,
        nombre: sanitizedClave
      };
    }
    return c;
  });

  let updatedCamposConfig = [...(plantilla.camposConfig || [])];
  if (oldClave) {
    if (sanitizedClave !== oldClave) {
      const isClaveUsedElsewhere = updatedCapas.some((c: any) => 
        c.id !== capaId && c.tipo === "text" && c.nombre === oldClave
      );
      
      if (!isClaveUsedElsewhere) {
        updatedCamposConfig = updatedCamposConfig.map((f: any) => 
          f.clave === oldClave ? { ...f, clave: sanitizedClave, nombreLegible: sanitizedClave } : f
        );
      } else {
        if (!updatedCamposConfig.some((f: any) => f.clave === sanitizedClave)) {
          const capa = updatedCapas.find((c: any) => c.id === capaId);
          updatedCamposConfig.push({
            clave: sanitizedClave,
            nombreLegible: sanitizedClave,
            tipo: "text",
            valorDefecto: capa?.contenidoRaw || ""
          });
        }
      }
    }
  } else {
    if (!updatedCamposConfig.some((f: any) => f.clave === sanitizedClave)) {
      const capa = updatedCapas.find((c: any) => c.id === capaId);
      updatedCamposConfig.push({
        clave: sanitizedClave,
        nombreLegible: sanitizedClave,
        tipo: "text",
        valorDefecto: capa?.contenidoRaw || ""
      });
    }
  }

  const updatedValores = { ...valoresCampos };
  if (oldClave) {
    if (sanitizedClave !== oldClave) {
      updatedValores[sanitizedClave] = valoresCampos[oldClave] || "";

      const isClaveUsedElsewhere = updatedCapas.some((c: any) => 
        c.id !== capaId && c.tipo === "text" && c.nombre === oldClave
      );
      if (!isClaveUsedElsewhere) {
        delete updatedValores[oldClave];
      }
    }
  } else {
    const capa = updatedCapas.find((c: any) => c.id === capaId);
    updatedValores[sanitizedClave] = capa?.contenidoRaw || "";
  }

  return {
    plantilla: {
      ...plantilla,
      capas: updatedCapas,
      camposConfig: updatedCamposConfig
    },
    valoresCampos: updatedValores
  };
}

export function validarYParsearPlantilla(jsonText: string): any {
  if (!jsonText || jsonText.trim() === "") {
    throw new Error("El archivo de configuración JSON está vacío.");
  }
  let templateData: any;
  try {
    templateData = JSON.parse(jsonText);
  } catch (e) {
    throw new Error("El archivo no contiene un JSON válido.");
  }
  if (!templateData.id || !templateData.nombre) {
    throw new Error("Estructura de plantilla inválida. Falta id o nombre.");
  }
  return templateData;
}

export function prepararPlantillaParaExportacion(
  plantilla: any,
  nuevoNombre: string,
  valoresCarta: Record<string, string>
): any {
  const newId = `template_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

  const updatedCamposConfig = (plantilla.camposConfig || []).map((campo: any) => {
    const currentVal = valoresCarta[campo.clave];
    return {
      ...campo,
      valorDefecto: currentVal !== undefined ? currentVal : (campo.valorDefecto || "")
    };
  });

  return {
    ...plantilla,
    id: newId,
    nombre: nuevoNombre,
    camposConfig: updatedCamposConfig
  };
}



