# Ticket - TKT-058: Exposición de Color de Borde y Maquetación de Bordes Individuales en EditCardModal

- **ID del Ticket**: TKT-058
- **Estado**: 🟢 Completado
- **Fecha de Registro**: 2026-10-22
- **Severidad**: Media (Mejora de UX y exposición de propiedades en inspector de capas)

---

## 1. Descripción del Problema
1. **Exposición del color de borde en vista colapsada**: En la fila compacta de "Bordes de la Capa", el selector de color (`renderColorSelector`) no recibía los parámetros de exposición (`exposedProperty`, `exposedPropertyLabel`), por lo que no mostraba el icono de ojo para exponer el color del borde (`borderTopColor`). Además, el icono de ojo de grosor estaba ubicado en el título de la sección en lugar de la celda de "Grosor".
2. **Campos numéricos comprimidos en vista expandida**: Al desplegar la configuración individual de bordes (`expandBorders === true`), los controles se renderizaban en una cuadrícula de 2 columnas (`expanded-inputs-grid-2col`) donde el input numérico quedaba comprimido a 44px o menos, ocultando el número bajo las flechas de incremento/decremento mientras el campo HEX tenía espacio sobrante.
3. **Ausencia de iconos de exposición en bordes individuales**: Al desplegar los bordes individuales (Superior, Derecho, Inferior, Izquierdo), no existían iconos de ojo para exponer el ancho o el color de cada borde por separado.
4. **Distribución en una línea por borde**: Se requiere maquetar cada borde (Superior, Derecho, Inferior, Izquierdo) en su propia fila completa (1 línea por borde), dedicando espacio holgado para el grosor, el color y sus respectivos botones de exposición.
5. **Correcciones identificadas durante pruebas manuales**:
   - Título en vista colapsada: Reducir de "Bordes de la Capa" a "Bordes" y dar más espacio al input numérico de grosor.
   - Valor por defecto de color expuesto: Si la capa no tenía un color explícito o se exponía recién creada, aparecía en blanco (`#ffffff`) en el inspector de la carta en vez del color negro por defecto del borde (`#000000`).
   - Sobreescritura del general sobre específicos: Al modificar los bordes individuales y después colapsar para cambiar el color o grosor general, el valor general debe sobreescribir todos los bordes específicos tanto en la plantilla como en los overrides de la carta.

---

## 2. Solución Implementada
1. **Vista colapsada (general)**:
   - Título acotado a "Bordes" con ancho ajustado (`flex: "0 0 62px"` cuando está colapsado) para optimizar el espacio horizontal.
   - Celda de "Grosor" ampliada (`flex: 0.9` con `style={{ width: "100%", minWidth: "46px" }}`) con su icono de exposición `{renderExposedEye("borderTopWidth", "Grosor Borde", true)}`.
   - Celda de "Color" con `{renderExposedEye("borderTopColor", "Color Borde", true)}` vía `renderColorSelector`.
2. **Vista expandida (individuales por fila)**:
   - Eliminada la cuadrícula de 2 columnas.
   - 4 filas tabulares completas (`Superior`, `Derecho`, `Inferior`, `Izquierdo`):
     - **Borde Superior**: Grosor (`borderTopWidth`) con ojo + Color (`borderTopColor`) con ojo.
     - **Borde Derecho**: Grosor (`borderRightWidth`) con ojo + Color (`borderRightColor`) con ojo.
     - **Borde Inferior**: Grosor (`borderBottomWidth`) con ojo + Color (`borderBottomColor`) con ojo.
     - **Borde Izquierdo**: Grosor (`borderLeftWidth`) con ojo + Color (`borderLeftColor`) con ojo.
   - Inputs numéricos con ancho amplio y cómodo para visibilidad completa del número y controles de incremento.
3. **Sobreescritura del General sobre Específicos**:
   - `handleUpdateCapaMultipleProps`: Actualización atómica en un único ciclo de estado de `tempPlantilla` / `tempPlantillaTrasera` y `tempCapasOverridesActivos`.
   - Al cambiar el color general (`handleUpdateBorderColorGeneral`), se sobreescriben `borderTopColor`, `borderRightColor`, `borderBottomColor` y `borderLeftColor`.
   - Al cambiar el grosor general (`handleUpdateBorderWidthGeneral`), se sobreescriben los grosores de los 4 lados.
   - En `App.tsx`, las actualizaciones en lote de `borderTopColor` y `borderTopWidth` sobreescriben todos los lados correspondientes.
4. **Resolución de Colores de Borde por Defecto**:
   - Inicialización explícita de bordes en capas nuevas (texto, imágenes, etc.).
   - En `togglePropertyExposed`, si se expone una propiedad de color de borde y no estaba fijada, se inicializa a `#000000`.
   - En `App.tsx`, resolución de fallback para propiedades de color de borde a `#000000` (en lugar de `#ffffff`).

---

## 3. Archivos Implicados
- [`client/src/EditCardModal.tsx`](file:///c:/Users/victo/proyectos/cdc2/client/src/EditCardModal.tsx)
- [`client/src/App.tsx`](file:///c:/Users/victo/proyectos/cdc2/client/src/App.tsx)
- [`shared/layoutEngine.ts`](file:///c:/Users/victo/proyectos/cdc2/shared/layoutEngine.ts)
- [`client/src/TKT058BordesIndividualesExposicion.test.tsx`](file:///c:/Users/victo/proyectos/cdc2/client/src/TKT058BordesIndividualesExposicion.test.tsx)
