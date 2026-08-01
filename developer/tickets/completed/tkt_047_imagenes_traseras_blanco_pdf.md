# Ticket - TKT-047: Imágenes Traseras en Blanco al Exportar PDF con Archivos Locales (JPG/PNG)

- **ID del Ticket**: TKT-047
- **Estado**: 🟢 Completado
- **Fecha de Registro**: 2026-08-01
- **Fecha de Resolución**: 2026-08-01
- **Severidad**: Alta (Fallo funcional en exportación de PDF de impresión)

---

## 1. Descripción del Problema
Al maquetar cartas cargando imágenes directamente en la cara delantera y posteriormente asignar imágenes a la cara trasera mediante importación de archivos de imagen locales (JPG o PNG desde el PC):
- En la interfaz web y en la vista previa del editor, las caras traseras parecían mostrar la imagen correctamente.
- Sin embargo, al generar y descargar el archivo PDF para impresión, las caras traseras no renderizaban la imagen y aparecían completamente en blanco.

---

## 2. Solución Implementada
1. **Conservación de Rutas de Assets en `addBlobToZip` (`client/src/App.tsx`)**:
   - Se añadió la verificación en `addBlobToZip` para evitar llamadas a `fetch()` en URLs que ya son esquemas de recursos guardados (`asset://`, `user_asset://`, `project_asset://`, `symbol_asset://`), retornando directamente la URI. Esto previene que se destruya la referencia de la imagen trasera poniéndose en blanco al serializar el ZIP `.cdc2`.
2. **Preservación y Fallback de Traseras Individuales (`shared/layoutEngine.ts` & `client/src/App.tsx`)**:
   - Se actualizó `calcularDistribucion` en `shared/layoutEngine.ts` para asignar `carta.imagenTrasera || imagenTraseraComun` en los slots traseros siempre que `modoTraseras !== "ninguno"`.
   - Se actualizó `setGenerarReversosInternal` en `App.tsx` para preservar el estado `"individual"` cuando el usuario activa la casilla de reversos.
   - Se conectó la actualización automática de `modoTraseras` a `"individual"` al cargar e importar imágenes traseras individuales o en lote.

---

## 3. Archivos Implicados
- [`shared/layoutEngine.ts`](file:///c:/Users/victo/proyectos/cdc2/shared/layoutEngine.ts): Fallback de `carta.imagenTrasera` en los slots traseros de `calcularDistribucion`.
- [`shared/layoutEngine.test.ts`](file:///c:/Users/victo/proyectos/cdc2/shared/layoutEngine.test.ts): Test unitario comprobando la resolución de imágenes traseras individuales.
- [`client/src/App.tsx`](file:///c:/Users/victo/proyectos/cdc2/client/src/App.tsx): Ajustes en `addBlobToZip` y handlers de importación de traseras.
- [`client/src/MenuBar.tsx`](file:///c:/Users/victo/proyectos/cdc2/client/src/MenuBar.tsx): Incremento de versión a `v2.260801.2`.

---

## 4. Plan de Verificación y Criterios de Aceptación
- [x] Asignar imágenes locales (JPG/PNG) a las caras delanteras y traseras de las cartas.
- [x] Exportar el proyecto a PDF desde el botón de la barra superior.
- [x] Verificar que en el PDF generado las imágenes de las caras traseras se muestran correctamente con la misma fidelidad que en la vista previa web.
- [x] Comprobar el paso correcto de 77 tests unitarios en Vitest.
