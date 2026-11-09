# TKT-066: Corrección de Corrupción de IDs de Recursos (`u_asset_asset://`), Duplicación de Prefijos en ZIP y Fallo de Reversos con Plantilla en Exportación PDF/PNG

## Estado: Completado
**Fecha:** 2026-11-09  
**Prioridad:** Alta (Crítica)  
**Tipo:** Corrección de Bug / Integridad de Datos y Exportación  
**Alcance:** Backend (`server/src/engine/projectArchiveService.ts`, `server/src/index.ts`) y Frontend (`client/src/App.tsx`, `client/src/services/projectZipService.ts`, `client/src/services/clientPngExportService.ts`)  
**Versión Objetivo:** `v2.261109.1`  

---

## 1. Descripción del Problema

Al crear y editar proyectos mediante las herramientas de IA (API REST / MCP) y posteriormente modificarlos, exportarlos o importarlos desde la interfaz web, se producen tres errores críticos interconectados:

1. **Error `ENOENT: chmod` al exportar a PDF:**
   - Al generar el PDF del proyecto, el backend aborta con el error:
     `ENOENT: no such file or directory, chmod '/var/www/cdc/server/temp/exports/.../user_assets/u_asset_u_asset_asset:/tmpl_asset_....png'`.
2. **Pérdida de visualización de opciones en capas `image-switch` tras exportar e importar `.cdc2`:**
   - Cuando una opción de una capa `image-switch` comparte recurso con una imagen asignada vía API, pierde su visualización tras exportar e importar el proyecto. Además, aunque el usuario reasigne manualmente la imagen en la plantilla, el error al exportar a PDF persiste mientras existan entradas corruptas en las galerías del proyecto.
3. **Archivos de reversos (`-T.png`) corruptos al exportar en PNG desde el cliente:**
   - Al exportar en formato PNG un documento con reversos activos (`modoTraseras: "comun"`, `imagenTraseraComun: null`) cuyas cartas usan plantillas de reverso (`plantillaTraseraId`), las imágenes delanteras (`cartaXXX-D.png`) se generan correctamente a 300 DPI, pero las traseras (`cartaXXX-T.png`) se guardan como archivos corruptos de 19 bytes que ningún visor puede abrir.

---

## 2. Pasos para Reproducir (STR)

1. Crear un proyecto a través de la API/MCP a partir de una plantilla que contenga activos propios (`asset://tmpl_asset_...`) y capas `image-switch`.
2. Añadir cartas vía API (`addCardsToProject`) pasando en `images` una referencia a un activo de plantilla (`asset://tmpl_asset_...`) o imágenes de usuario, y asignando una plantilla trasera (`backCardTemplateId`).
3. Abrir el proyecto en el editor web (`App.tsx`), realizar modificaciones, guardarlo o exportarlo a `.cdc2` y volver a importarlo:
   - Se observa que en cada ciclo de guardado/carga los IDs y archivos en el ZIP acumulan prefijos repetidos (`u_asset_u_asset_...`, `p_asset_p_asset_...`, `tmpl_asset_tmpl_asset_...`).
   - La opción del `image-switch` cuyo recurso coincidía con el `asset://tmpl_asset_...` pasa a tener `src: "user_asset://u_asset_asset://tmpl_asset_..."` y deja de verse tras reimportar.
4. Intentar exportar el proyecto a **PDF**: falla con `ENOENT: no such file or directory, chmod '.../u_asset_u_asset_asset:/tmpl_asset_...png'`.
5. Mantener un documento con reversos activos (`modoTraseras: "comun"`, `imagenTraseraComun: null`) donde las cartas usan `plantillaTraseraId` y exportar a **PNG**: los archivos `-T.png` resultan corruptos.

---

## 3. Causas Raíz Identificadas (RCA)

### Causa 1: Inyección de esquemas `asset://` en `projectAssets`/`userAssets` (`projectArchiveService.ts`)
- En `addCardsToProject` (`server/src/engine/projectArchiveService.ts`), cuando una imagen recibe un URI `asset://tmpl_asset_...`, `processImageToAsset` lo devuelve intacto, pero acto seguido se ejecuta:
  ```ts
  const filename = assetUri.replace(/^user_asset:\/\//, "").replace(/^project_asset:\/\//, "");
  ```
- Al no contemplar `^asset:\/\/`, `filename` conserva `"asset://tmpl_asset_..."` y se inserta en `project.projectAssets` y `project.userAssets` con IDs inválidos `p_asset_asset://...` y `u_asset_asset://...` que contienen `:` y `/`.
- Los recursos de plantilla (`asset://`) pertenecen exclusivamente a la galería de plantilla (`project.assets`) y no deben duplicarse en `projectAssets` ni `userAssets`.

### Causa 2: Fallo de detección de duplicados en autodescubrimiento ZIP y colisión de mapas de Blobs (`App.tsx` y `projectZipService.ts`)
- En `importarProyectoZip` (`client/src/App.tsx`), el escaneo de archivos del ZIP comprueba:
  `a.id.includes(filename) || a.nombre === filename`
  Dado que `a.id` no incluye la extensión (`.png`) y `filename` sí la incluye, la condición devuelve `false`, provocando que en cada carga se duplique el recurso añadiendo otro prefijo (`u_asset_u_asset_...`, `p_asset_p_asset_...`, `tmpl_asset_tmpl_asset_...`).
- En `generarProyectoZip` (`client/src/services/projectZipService.ts`), como `resolverAssetBlob` comparte el mismo `blob:` URL en caché entre el activo de plantilla y el activo espurio de `userAssets`, y `addBlobToZip` consulta `userAssetMap` **antes** que `imagenMap`, las capas y opciones de la plantilla ven sobrescrito su `src` original (`asset://...`) por `"user_asset://u_asset_asset://..."`.
- Al escribirse en JSZip como `user_assets/${asset.id}.png`, JSZip normaliza `//` a `/` creando una subcarpeta `u_asset_u_asset_asset:/`.
  - Al reimportar en cliente, `zip.file("user_assets/u_asset_asset://...")` no coincide con `user_assets/u_asset_asset:/...` y devuelve `null`.
  - Al extraer en servidor con `adm-zip` (`zip.extractAllTo`), el directorio con `:` provoca el fallo `ENOENT: chmod`.

### Causa 3: Omisión de `plantillaTraseraId` cuando `doc.modoTraseras === "comun"` en `clientPngExportService.ts`
- En la UI, activar el check *"Generar páginas de reversos"* establece `doc.modoTraseras = "comun"`.
- Cuando `doc.modoTraseras === "comun"` e `imagenTraseraComun === null`, pero las cartas tienen `card.plantillaTraseraId` (o `card.plantillaTrasera` / `card.imagenTrasera`), `clientPngExportService.ts` intenta renderizar una `dummyCardForBack` vacía sin `plantillaTraseraId`.
- `renderCardFaceContentHtml` devuelve `""`, dejando `commonBackBlob = null`, y el bucle de cartas cae en el fallback de entorno de test:
  `backBlob = new Blob(["dummy_back_png_data"], { type: "image/png" })`, escribiendo 19 bytes de texto plano en todos los archivos `cartaXXX-T.png`.

---

## 4. Solución Técnica Propuesta

1. **Saneamiento y Prevención en Backend (`server/src/engine/projectArchiveService.ts`)**:
   - En `addCardsToProject` y `updateCardInProject`, si `assetUri` comienza por `asset://`, no añadirlo a `project.projectAssets` ni a `project.userAssets`.
   - Crear un helper de normalización de IDs de activos que elimine esquemas (`user_asset://`, `project_asset://`, `asset://`), caracteres ilegales de ruta (`:`, `/`, `\`), extensiones y prefijos redundantes (`p_asset_`, `u_asset_`, `user_asset_`, `tmpl_asset_`) antes de construir el `id`.

2. **Corrección de Autodescubrimiento, Empaquetado y Normalización de Recursos en Cliente (`client/src/App.tsx` y `client/src/services/projectZipService.ts`)**:
   - **Normalización defensiva de activos y rutas:**
     - Si una ruta o ID contiene `asset://` o `asset:/` embebido dentro de un `user_asset://` o `project_asset://` (ej. `user_asset://u_asset_asset://tmpl_asset_...`), reconducirla automáticamente a `asset://tmpl_asset_...`.
     - Limpiar prefijos repetidos (`tmpl_asset_tmpl_asset_...` -> `tmpl_asset_...`, `u_asset_u_asset_...` -> `u_asset_...`, `p_asset_p_asset_...` -> `p_asset_...`) tanto al importar en `App.tsx` como al empaquetar en `projectZipService.ts`, deduplicando las galerías y resolviendo archivos en el ZIP de forma resiliente.
   - **Corrección de comparación en Autodescubrimiento (`App.tsx`):**
     - Comparar contra `filenameWithoutExt` (además de `filename`, `a.src === url` y versión sin prefijos duplicados) para que los archivos existentes en el ZIP nunca vuelvan a duplicarse al cargar el proyecto.
   - **Prioridad de mapas en `projectZipService.ts`:**
     - En `addBlobToZip`, comprobar `imagenMap` (activos de plantilla) antes que `userAssetMap`, y asegurar que ningún `filename` escrito en el ZIP pueda contener `:` ni `/`.

3. **Renderizado Correcto de Reversos en Exportación PNG (`client/src/services/clientPngExportService.ts`)**:
   - Unificar la lógica de reversos con la del motor PDF (`server/src/engine/cardRenderer.ts`): cuando `shouldRenderBack` es `true` y `doc.modoTraseras !== "ninguno"` (`"comun"` o `"individual"`):
     - Evaluar para cada carta si posee plantilla trasera (`card.plantillaTrasera` o `card.plantillaTraseraId` en `templatesMap`) o imagen trasera (`card.imagenTrasera` o `doc.imagenTraseraComun`).
     - Si el reverso usa una plantilla común a varias cartas y la carta no tiene overrides traseros (`capasOverridesTrasera` ni `valoresCamposTrasera`), cachear el `Blob` renderizado por `plantillaTraseraId` para no penalizar el rendimiento, renderizando individualmente cuando existan overrides traseros.
     - Si `doc.imagenTraseraComun` existe y la carta no define reverso propio, usar `commonBackBlob`.

---

## 5. Criterios de Aceptación y Plan de Pruebas

- [x] **CA-1:** Añadir cartas vía `ProjectArchiveService.addCardsToProject` con referencias `asset://...` no contamina `projectAssets` ni `userAssets` ni genera IDs con `:` o `/`.
- [x] **CA-2:** Importar y exportar repetidamente un proyecto `.cdc2` no duplica entradas en `assets/`, `project_assets/` ni `user_assets/`, ni concatena prefijos `u_asset_u_asset_`, `p_asset_p_asset_` o `tmpl_asset_tmpl_asset_`.
- [x] **CA-3:** Al importar y re-exportar proyectos con referencias cruzadas o prefijos repetidos heredados, las opciones de capas `image-switch` se resuelven y visualizan correctamente, y al empaquetar o enviar a `/api/exportar/pdf` no se genera ninguna ruta con `asset:/` ni error `ENOENT: chmod`.
- [x] **CA-4:** Al exportar un documento con `modoTraseras: "comun"` y cartas con `plantillaTraseraId` a PNG mediante `exportarProyectoPngEnCliente`, las imágenes traseras `cartaXXX-T.png` se renderizan con su plantilla trasera real en lugar de `"dummy_back_png_data"`.
- [x] **CA-5:** Suite de tests unitarios y de regresión (`TKT066AssetIdAndBackExportFix.test.tsx`) en verde junto con toda la suite del proyecto (`npm test`).
