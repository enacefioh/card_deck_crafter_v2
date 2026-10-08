# Ticket - TKT-054: Corrección de Pérdida de Textos al Sobreescribir Plantillas, Deduplicación de Campos y Saneamiento de Proyectos

- **ID del Ticket**: TKT-054
- **Estado**: 🟢 Completado
- **Fecha de Registro**: 2026-10-08
- **Fecha de Resolución**: 2026-10-08
- **Severidad**: Alta / Integridad de Datos de Plantillas y Editor

---

## 1. Descripción del Problema

1. **Desincronización de Valores por Defecto al Sobreescribir Plantillas**:
   - Desde la unificación de campos e inspector (TKT-030 y SRS-070), el editor almacena los textos de las capas en el estado `valoresCarta` indexados por el identificador único de cada capa (`capa.id`, ej. `layer_1791029076669_0d2w1`).
   - Al invocar la exportación o sobreescritura de una plantilla mediante `prepararPlantillaParaExportacion` (`projectUtils.ts`), el mapeo de `camposConfig` intentaba resolver el valor actual mediante `valoresCarta[campo.clave]`. Dado que `campo.clave` correspondía al nombre legible de la capa (ej. `Ttulo`) y no a su ID, la búsqueda siempre devolvía `undefined`.
   - En consecuencia, la propiedad `valorDefecto` de cada campo en `camposConfig` nunca se actualizaba con la edición del usuario y retenía indefinidamente su texto histórico obsoleto.
   - Dado que los generadores de miniaturas (`thumbnailUtils.ts`) y los modales de previsualización (`TemplatePreviewModal.tsx`) utilizan `campo.valorDefecto` para interpolar etiquetas, la interfaz continuaba mostrando los textos antiguos congelados.

2. **Sobreescritura de `contenidoRaw` por Overrides Obsoletos en `prepararPlantillaParaExportacion`**:
   - Al crear una carta a partir de una plantilla, las capas de texto inicializan `carta.capasOverrides[capa.id]` con una instantánea congelada que incluía `contenidoRaw: capa.contenidoRaw`.
   - Cuando el usuario editaba el texto en `EditCardModal.tsx`, el nuevo valor se registraba en `valoresCarta` y en la capa local, pero `tempCapasOverrides` retenía el `contenidoRaw` antiguo.
   - En `prepararPlantillaParaExportacion`, la fusión aplicaba `capasOverrides` después de `valoresCarta`:
     ```typescript
     if (c.tipo === "text" && valoresCarta) cap.contenidoRaw = valoresCarta[c.id];
     if (capasOverrides && capasOverrides[c.id]) cap = { ...cap, ...capasOverrides[c.id] }; // <--- machacaba cap.contenidoRaw con el valor obsoleto
     ```
     Al fusionar el objeto de overrides sobre la capa, el `contenidoRaw` congelado viejo sobreescribía de nuevo el texto actualizado.

3. **Falta de Sincronización de `contenidoRaw` en Overrides en `EditCardModal.tsx`**:
   - Al modificar el texto de una capa en el `textarea`, `input` o mediante inserción de símbolos en el inspector de `EditCardModal.tsx`, se invocaba `handleUpdateCapaProp(selectedCapa.id, "contenidoRaw", val)` y `setTempValoresCampos`, pero no se actualizaba `tempCapasOverridesActivos[selectedCapa.id].contenidoRaw`.

4. **Conflicto de Precedencia en la Carga de Archivos de Proyecto `.cdc2` (ZIP)**:
   - Un archivo de proyecto `.cdc2` es un archivo ZIP que contiene tanto `project.json` (con el objeto consolidado `templates`) como una carpeta `templates/` con archivos `.json` individuales por cada plantilla.
   - En `handleCargarProyecto` (`App.tsx`), si el ZIP contenía archivos en la carpeta `templates/`, estos se cargaban ignorando por completo el objeto `proyecto.templates` de `project.json`.
   - Al reemplazar únicamente el archivo `project.json` dentro del archivo ZIP, la aplicación continuaba cargando las plantillas no saneadas y obsoletas ubicadas en `templates/*.json` del ZIP.

5. **Falta de Propagación de Plantillas Sobreescritas a las Cartas del Proyecto**:
   - Al guardar o sobreescribir una plantilla existente desde `EditCardModal.tsx`, la función `onExportTemplate` en `App.tsx` actualizaba `templatesMap` y la lista `importedTemplates`, pero no actualizaba las cartas de `cartas` ni de `documentos`.
   - Cada carta almacena una copia profunda e independiente de su plantilla (`carta.plantilla` y `carta.plantillaTrasera`). Al no actualizarse dicha copia en las cartas existentes, volver a abrir cualquier carta volvía a cargar la versión antigua incrustada en la carta.
   - De manera idéntica, la importación de archivos de plantilla externa `.cdc2t` en `handleImportTemplateFile` tampoco propagaba la versión importada a las cartas existentes que compartieran el mismo identificador de plantilla.

6. **Inconsistencias, Etiquetas Obsoletas y Duplicados en Archivos de Proyecto Legados**:
   - En proyectos creados antes de las últimas revisiones de símbolos y plantillas (como `temp/project.json`), existían etiquetas de símbolos antiguas (`{nuevo_objeto}`, `{nuevo_accin}`, `{nuevo_persona}`, `{nuevo_rumor}`, `{ubicacion}`) que no se correspondían con los identificadores reales de `projectSymbols` (`{obj}`, `{a}`, `{pj}`, `{rumor}`, `{ubi}`).
   - La lista `camposConfig` contenía elementos duplicados (entradas repetidas con la misma clave) producidos por inserciones históricas sin comprobación de unicidad.
   - Capas de plantilla tenían textos particulares de cartas específicas ("Frasco de Cristal", "Laboratorio", "Margaret Albright") grabados de forma permanente en su propiedad `contenidoRaw`.

---

## 2. Solución Implementada

1. **Resolución Robusta de Valores, Orden de Overrides y Deduplicación en `prepararPlantillaParaExportacion`**:
   - Se modificó la función `prepararPlantillaParaExportacion` en `client/src/utils/projectUtils.ts`:
     - Se invirtió el orden de fusión: `capasOverrides` se fusiona primero (para aplicar estilos y propiedades visuales de la carta) y posteriormente se aplica `valoresCarta[c.id]` sobre `cap.contenidoRaw`, garantizando que el valor textual editado por el usuario tenga máxima precedencia y nunca sea pisado por overrides obsoletos.
     - Localiza la capa asociada a cada campo (`updatedCapas.find(c => c.nombre === campo.clave || c.id === campo.clave)`).
     - Resuelve el valor priorizando:
       1. `valoresCarta[matchingLayer.id]` (clave por ID de capa actual).
       2. `valoresCarta[campo.clave]` (clave por nombre/etiqueta).
       3. Fallback directo a `matchingLayer.contenidoRaw` (texto consolidado en la capa).
       4. Fallback al `campo.valorDefecto` original o cadena vacía.
     - Implementa deduplicación estricta de `camposConfig` por clave mediante `Set<string>`.
     - Registra automáticamente cualquier capa de texto presente en `updatedCapas` que no figurase aún en `camposConfig`, garantizando sincronización total.

2. **Sincronización Inmediata de Overrides en `EditCardModal.tsx`**:
   - Al editar el texto en el `textarea`, en el `input` de línea simple o al insertar un símbolo desde la paleta rápida, se actualiza también `tempCapasOverridesActivos[selectedCapa.id].contenidoRaw` para mantener sincronizados todos los estados locales de la carta.

3. **Prioridad a `project.json` al Cargar Proyectos ZIP en `App.tsx`**:
   - Se reestructuró la carga de plantillas en `handleCargarProyecto`:
     - Se carga prioritariamente el catálogo `proyecto.templates` definido dentro de `project.json`.
     - Se complementa con cualquier plantilla adicional presente en `templates/*.json` que no existiera en `project.json`.
     - Con esto, al editar o reemplazar `project.json` dentro del archivo ZIP, las plantillas del JSON cobran efecto inmediato y no quedan ensombrecidas por archivos viejos en `templates/`.

4. **Propagación Inmediata de Plantillas a Cartas en `App.tsx`**:
   - En el callback `onExportTemplate` de `EditCardModal.tsx`:
     - Se actualiza `cartas` y `documentos` mediante mapeo inmutable para refrescar `c.plantilla` (si `c.plantillaId === plantilla.id`) y `c.plantillaTrasera` (si `c.plantillaTraseraId === plantilla.id`).
   - En `handleImportTemplateFile`:
     - Se aplica la misma propagación a `cartas` y `documentos` al importar un archivo `.cdc2t`.

5. **Saneamiento y Normalización de `temp/project.json` y `temp/templates/`**:
   - Se preservó una copia de respaldo intacta en `temp/project.json.bak`.
   - Se vaciaron las 34 cartas obsoletas de `documentos[0].cards` a petición del usuario (`cards = []`), reduciendo el tamaño del archivo de 1.55 MB a 616 KB.
   - Se reemplazaron todas las etiquetas de símbolos legadas por los identificadores vigentes:
     - `{nuevo_objeto}` $\rightarrow$ `{obj}`
     - `{nuevo_accin}` $\rightarrow$ `{a}`
     - `{nuevo_persona}` $\rightarrow$ `{pj}`
     - `{nuevo_rumor}` $\rightarrow$ `{rumor}`
     - `{ubicacion}` $\rightarrow$ `{ubi}`
   - Se sustituyeron los títulos y textos específicos de cartas hardcodeados en las 6 plantillas por valores por defecto genéricos ("Título del Objeto", "Título del Lugar", "Nombre del Personaje", etc.).
   - Se reconstruyó y deduplicó `camposConfig` en todas las plantillas.
   - Se exportaron los 5 archivos `.json` individuales correspondientes a cada plantilla saneada en `temp/templates/` para reflejar la estructura interna de los paquetes ZIP `.cdc2`.

6. **Batería de Pruebas Unitarias, Compilación y Despliegue en Docker**:
   - Pruebas unitarias de `projectUtils.ts` pasando al 100% (53/53 tests en `projectUtils.test.ts`).
   - Compilación completa de TypeScript y Vite verificada con `npm run client:build`.
   - Reconstrucción de la imagen local de Docker (`npm run docker:build`) y reinicio limpio del contenedor `cdc2_app` en los puertos 80 y 3000 para que el entorno de pruebas del usuario disponga inmediatamente del código actualizado.

---

## 3. Archivos Implicados

- [`client/src/utils/projectUtils.ts`](file:///c:/Users/victo/proyectos/cdc2/client/src/utils/projectUtils.ts) - Inversión del orden de overrides y resolución de `valorDefecto` por ID en `prepararPlantillaParaExportacion`.
- [`client/src/EditCardModal.tsx`](file:///c:/Users/victo/proyectos/cdc2/client/src/EditCardModal.tsx) - Sincronización de `contenidoRaw` en `tempCapasOverridesActivos` al editar texto o insertar símbolos.
- [`client/src/App.tsx`](file:///c:/Users/victo/proyectos/cdc2/client/src/App.tsx) - Prioridad de `proyecto.templates` en carga de ZIP y propagación reactiva en `onExportTemplate`/`handleImportTemplateFile`.
- [`client/src/utils/projectUtils.test.ts`](file:///c:/Users/victo/proyectos/cdc2/client/src/utils/projectUtils.test.ts) - Tests unitarios de resolución por ID y deduplicación.
- [`temp/project.json`](file:///c:/Users/victo/proyectos/cdc2/temp/project.json) - Proyecto saneado con símbolos actualizados y plantillas normalizadas.
- [`temp/templates/`](file:///c:/Users/victo/proyectos/cdc2/temp/templates) - Plantillas individuales saneadas para la carpeta interna del ZIP `.cdc2`.

---

## 4. Plan de Verificación y Criterios de Aceptación

- [x] En `prepararPlantillaParaExportacion`, el valor textual de `valoresCarta` no es sobreescrito por `capasOverrides[c.id].contenidoRaw`.
- [x] Al cambiar un texto en `EditCardModal` y pulsar "Guardar Plantilla", la plantilla guardada conserva el nuevo texto como valor por defecto y contenido de capa.
- [x] Al añadir una carta nueva desde la plantilla recién guardada, la carta aparece con el texto actualizado, no con el antiguo.
- [x] Al abrir un archivo de proyecto `.cdc2` (ZIP), las plantillas de `project.json` tienen prioridad sobre archivos antiguos de la carpeta `templates/`.
- [x] Entradas duplicadas en `camposConfig` son deduplicadas preservando el orden original y el valor actualizado.
- [x] Al sobreescribir una plantilla en `EditCardModal`, las cartas existentes vinculadas a dicha plantilla actualizan su `c.plantilla`.
- [x] La suite de pruebas unitarias pasa al 100% (53/53 tests en `projectUtils.test.ts`).
- [x] `npm run client:build` compila sin errores.
- [x] El contenedor Docker `cdc2_app` está reiniciado y corriendo la imagen actualizada.
- [x] Verificación manual del usuario en el navegador completada satisfactoriamente.
