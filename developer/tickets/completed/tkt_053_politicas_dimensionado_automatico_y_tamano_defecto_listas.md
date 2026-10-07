# Ticket - TKT-053: Flexibilización de Políticas de Dimensionado Automático, Bounding Box en Contenedores Libres y Dimensiones por Defecto en Listas

- **ID del Ticket**: TKT-053
- **Estado**: 🟢 Completado
- **Fecha de Registro**: 2026-10-07
- **Fecha de Resolución**: 2026-10-07
- **Severidad**: Media / UX, Usabilidad y Consistencia de Layout

---

## 1. Descripción del Problema

1. **Restricciones Condicionales Arbitrarias en "Ancho Auto" y "Alto Auto"**:
   - Anteriormente, los selectores de dimensionado automático en el inspector de capas (`EditCardModal.tsx`) solo se mostraban bajo reglas condicionales muy estrictas:
     - `Ancho Auto` solo aparecía para capas de texto o contenedores/listas cuyo `layout` fuera horizontal.
     - `Alto Auto` solo aparecía para capas de texto o contenedores/listas cuyo `layout` fuera vertical.
   - En cualquier otro tipo de capa o en contenedores con layout libre `none`, los controles desaparecían.
   - Además, al cambiar la propiedad `layout` de un contenedor o lista en `handleUpdateCapaProp`, el sistema reseteaba forzosamente `anchoMm` o `altoMm` de `"auto"` a valores numéricos fijos (40 mm y 20 mm).
   - **Impacto**: El usuario no podía definir un contenedor con dimensiones automáticas ajustadas a su contenido (con fondos o bordes aplicados) en layouts libres o no flex.

2. **Altura Automática por Defecto en Listas**:
   - Al insertar por primera vez una capa de tipo "Lista" (`tipo: "list"`), se inicializaba con `altoMm: "auto"`.
   - Dado que la lista se crea inicialmente vacía, su altura calculada resultante en pantalla era cero o inapreciable.
   - **Impacto**: La lista insertada no mostraba un área gráfica visible en el lienzo para poder hacer clic, arrastrarla, reposicionarla o redimensionarla mediante los manejadores interactivos sin tener que ir previamente al inspector a desmarcar manualmente la casilla de "Alto Auto".

3. **Colapso a Tamaño Cero en Contenedores Libres con Dimensiones en "Auto"**:
   - En contenedores con layout libre (`layout: "none"` / FrameLayout), todos sus elementos hijos se posicionan de manera absoluta (`position: absolute; left: ...; top: ...`).
   - En CSS estándar, los elementos hijos con posicionamiento absoluto quedan fuera del flujo normal del documento, por lo que una propiedad CSS `width: fit-content` o `height: fit-content` en el contenedor padre colapsaba a tamaño 0 mm (o solo el grosor de bordes).
   - **Impacto**: Al marcar "Ancho Auto" o "Alto Auto" en un contenedor libre, este colapsaba a 0 y no enmarcaba a sus hijos, ignorando el área ocupada por sus elementos contenidos.

---

## 2. Solución Propuesta

1. **Disponibilidad Universal de Dimensiones Automáticas**:
   - Mostrar siempre los controles "Ancho Auto" y "Alto Auto" para cualquier capa editable (todas excepto `tipo: "background"` fija).
   - Eliminar el reseteo forzoso de `anchoMm` y `altoMm` al conmutar el `layout` en `handleUpdateCapaProp`.

2. **Dimensiones Iniciales Fijas para Nuevas Listas**:
   - En la función de creación de capas de `EditCardModal.tsx` (`isList`), cambiar el valor inicial de `altoMm: "auto"` a un tamaño numérico por defecto (`altoMm: 50`), equiparándola a los contenedores estándar (50x50 mm).

3. **Cálculo de Bounding Box Dinámico para Contenedores Libres**:
   - Implementar la función `calculateAutoDimensionsForFreeContainer` en `shared/layoutEngine.ts`.
   - Cuando un contenedor libre (`layout: "none"`) tiene `anchoMm === "auto"`, su ancho en mm se calcula como el valor máximo de `(xMm + widthMm)` de todos sus hijos directos visibles, sumando los bordes izquierdo y derecho del contenedor (`box-sizing: border-box`).
   - Cuando tiene `altoMm === "auto"`, su alto en mm se calcula como el valor máximo de `(yMm + heightMm)` de todos sus hijos directos visibles, sumando los bordes superior e inferior del contenedor.
   - Soporte para recursión en contenedores libres anidados y manejo seguro de ciclos mediante `visited Set`.
   - Integración transversal en `client/src/EditCardModal.tsx`, `client/src/App.tsx`, `server/src/index.ts`, `client/src/components/TemplatePreviewModal.tsx` y `client/src/utils/thumbnailUtils.ts`.

4. **Resolución de Dimensiones Automáticas para Hijos con Dimensiones Auto (Textos, Flex y Bloques)**:
   - Se detectó en pruebas manuales que cuando un hijo dentro de un contenedor libre tenía `altoMm: "auto"` o `anchoMm: "auto"` (por ejemplo, una capa de texto), su altura se evaluaba como 0 mm. Por tanto, el contenedor libre solo alcanzaba la coordenada `yMm` del hijo, quedando este fuera por debajo del límite inferior (`overflow: hidden`).
   - Se implementó `calculateLayerEffectiveDimensions` en `shared/layoutEngine.ts` para estimar con precisión matemática la altura y anchura efectivas de capas de texto (fuente, interlineado, padding, caracteres y nuevas líneas), contenedores flex y bloques cuando tienen dimensiones en `auto`.
   - Con esto, `maxY` suma `yMm + heightMm` del texto hijo, envolviéndolo completamente sin recortarlo.

5. **Actualización y Cobertura de Pruebas**:
   - Actualizar `DimensionsAuto.test.tsx` y `SRS071LayoutContenedores.test.tsx`.
   - Añadir tests unitarios en `shared/layoutEngine.test.ts` y tests de integración en `client/src/TKT053AutoDimensions.test.tsx` (177 tests pasando).

---

## 3. Archivos Implicados

- [`shared/layoutEngine.ts`](file:///c:/Users/victo/proyectos/cdc2/shared/layoutEngine.ts)
- [`shared/layoutEngine.test.ts`](file:///c:/Users/victo/proyectos/cdc2/shared/layoutEngine.test.ts)
- [`client/src/EditCardModal.tsx`](file:///c:/Users/victo/proyectos/cdc2/client/src/EditCardModal.tsx)
- [`client/src/App.tsx`](file:///c:/Users/victo/proyectos/cdc2/client/src/App.tsx)
- [`client/src/components/TemplatePreviewModal.tsx`](file:///c:/Users/victo/proyectos/cdc2/client/src/components/TemplatePreviewModal.tsx)
- [`client/src/utils/thumbnailUtils.ts`](file:///c:/Users/victo/proyectos/cdc2/client/src/utils/thumbnailUtils.ts)
- [`server/src/index.ts`](file:///c:/Users/victo/proyectos/cdc2/server/src/index.ts)
- [`client/src/DimensionsAuto.test.tsx`](file:///c:/Users/victo/proyectos/cdc2/client/src/DimensionsAuto.test.tsx)
- [`client/src/TKT053AutoDimensions.test.tsx`](file:///c:/Users/victo/proyectos/cdc2/client/src/TKT053AutoDimensions.test.tsx)

---

## 4. Plan de Verificación y Criterios de Aceptación

- [x] En `EditCardModal`, al seleccionar cualquier capa editable (contenedor, bloque, imagen, texto, lista), los checkboxes "Ancho Auto" y "Alto Auto" están siempre disponibles.
- [x] Cambiar el layout de un contenedor o lista no reinicia las dimensiones configuradas en `"auto"`.
- [x] Al insertar una nueva capa de tipo "Lista", su altura inicial es fija (50 mm) y no `"auto"`, siendo inmediatamente manipulable en el lienzo.
- [x] En contenedores con layout libre (`layout: "none"`), marcar "Alto Auto" ajusta el alto exactamente al hijo situado más abajo (`maxY = child.y + child.height + bordes`).
- [x] En contenedores con layout libre (`layout: "none"`), marcar "Ancho Auto" ajusta el ancho exactamente al hijo situado más a la derecha (`maxX = child.x + child.width + bordes`).
- [x] Al contener un texto con "Alto Auto" o "Ancho Auto" dentro de un contenedor libre con alto/ancho en auto, el contenedor calcula y suma tanto la posición inicial (`xMm`/`yMm`) como la altura/anchura del texto, manteniéndolo visible sin recortar.
- [x] Al mover o redimensionar un hijo dentro del contenedor libre, el contenedor se expande o contrae en tiempo real en el lienzo.
- [x] Tanto en el lienzo (`App.tsx`), en el editor (`EditCardModal.tsx`) como en las exportaciones backend a PDF/PNG (`server/src/index.ts`), el contenedor libre respeta el tamaño calculado de sus hijos.
- [x] La suite de pruebas de Vitest pasa al 100% sin regresiones (177 tests pasando).
