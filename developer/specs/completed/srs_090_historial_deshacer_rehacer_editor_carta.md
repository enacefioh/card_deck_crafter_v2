# SRS-090: Historial de Deshacer y Rehacer (Undo / Redo) en el Modal de Edición de Carta con Consolidación por Foco/Blur

**Estado**: Completado  
**Fecha**: 2026-10-26  
**Autor**: Card Deck Crafter Team & AI Pair Programmer  
**Alcance**: Frontend (`client/src/EditCardModal.tsx`)  
**Versión**: `v2.261026.2`  

---

## 1. Introducción y Objetivos

### 1.1. Propósito
Dotar al modal de edición avanzada de cartas (`EditCardModal.tsx`) de un sistema robusto, reactivo e intuitivo de **Deshacer (Undo)** y **Rehacer (Redo)**. Esto permite a los diseñadores revertir y re-aplicar cambios accidentales durante el proceso de maquetación y personalización de una carta (modificación de textos y propiedades, ajustes tipográficos y de color, alteración de dimensiones y bordes, reordenación o eliminación de capas, y arrastre/redimensionado interactivo en el lienzo del modal) sin temor a perder configuraciones complejas.

Asimismo, esta especificación introduce la **política de consolidación de texto por foco/blur**, evitando que teclear en campos de texto sature el historial con un estado por cada pulsación individual de tecla.

### 1.2. Objetivos de Diseño
1. **Acceso Visual Ergonómico**: Ubicación de botones dedicados de deshacer (`↶`) y rehacer (`↷`) en la cabecera de la columna de previsualización (`.column-title`), situados a la izquierda del bloque de control de Zoom para máxima visibilidad sin invadir el área de dibujo.
2. **Atajos de Teclado con Aislamiento Modal**: Soporte completo para `Ctrl+Z`, `Cmd+Z`, `Ctrl+Y`, `Cmd+Y` y `Ctrl+Shift+Z` / `Cmd+Shift+Z`. Cuando el modal de edición esté abierto, los atajos operan exclusivamente sobre el historial de la carta actual mediante detención de propagación (`e.stopPropagation()`), evitando mutar inadvertidamente el lienzo general de fondo.
3. **Consolidación Inteligente de Texto (Anti-Saturación)**:
   - Durante la escritura en campos de texto e inputs numéricos (`onChange`), la previsualización se actualiza en tiempo real pero se omite la creación de estados (`{ skipHistory: true }`).
   - Al perder el foco (`onBlur`) o cambiar a otro campo, si el valor ha cambiado respecto al estado inicial enfocado (`onFocus`), se consolida un **único estado atómico** en el historial.
4. **Manipulación Interactiva en Lienzo del Modal**: Durante el arrastre (`drag`) o redimensionado (`resize`) interactivo de capas sobre la carta, las coordenadas intermedias se actualizan con `skipHistory: true`. La posición final se consolida en el historial al soltar el botón del ratón (`mouseup`).
5. **Acciones Discretas Inmediatas**: Cambios puntuales como alternar estilos (negrita, cursiva, subrayado), selección de color, reordenación jerárquica de capas, inserción de símbolos y adición o eliminación de capas registran su estado en el historial en el acto.
6. **Memoria y Alcance de Sesión Modal**: Límite de **30 pasos** en memoria RAM. Al guardar (`handleSave`) o cerrar/cancelar el modal, el historial temporal se descarta limpiamente sin dejar residuos en memoria.

---

## 2. Requisitos Funcionales

### RF-1: Estructura de Estado Unificada del Editor (`CardEditorHistoryState`)
El hook `useHistory` gestionará un objeto estructurado que engloba todas las dimensiones editables de la carta y sus plantillas locales:
```typescript
export interface CardEditorHistoryState {
  tempPlantilla: any;
  tempPlantillaTrasera: any;
  tempValoresCampos: Record<string, string>;
  tempCapasOverrides: Record<string, any>;
  tempValoresCamposTrasera: Record<string, string>;
  tempCapasOverridesTrasera: Record<string, any>;
}
```
- Al inicializarse `EditCardModal`, el estado inicial se hidrata a partir de los datos actuales de la carta y sus plantillas vinculadas.
- Las funciones de actualización locales (`setTempValoresCampos`, `setTempCapasOverrides`, `setTempPlantilla`, etc.) sincronizan este estado centralizado.

### RF-2: Botones de Deshacer y Rehacer en la Cabecera de Previsualización
- Ubicados en `EditCardModal.tsx` dentro de `.column-title` (columna derecha de previsualización), inmediatamente a la izquierda del contenedor `.editor-zoom-control`:
  ```
  [ Previsualización ]          [ ↶ ] [ ↷ ]  |  [ Zoom  [ ————●— ] 100% ]
  ```
- **Botón Deshacer**:
  - Icono / Símbolo: `↶` (Undo).
  - Tooltip (`title`): `Deshacer (Ctrl+Z)`.
  - Deshabilitado visualmente (`opacity: 0.4`, `cursor: not-allowed`) cuando `canUndo === false`.
- **Botón Rehacer**:
  - Icono / Símbolo: `↷` (Redo).
  - Tooltip (`title`): `Rehacer (Ctrl+Y)`.
  - Deshabilitado visualmente cuando `canRedo === false`.
- Estilo: Botones compactos (`height: 24px`, bordes redondeados, fondo oscuro con hover interactivo), perfectamente alineados verticalmente con la etiqueta y slider de zoom.

### RF-3: Atajos de Teclado con Aislamiento Modal
- `listener` en `window` activo únicamente mientras el modal esté montado y visible.
- Captura de combinaciones:
  - `Ctrl+Z` / `Cmd+Z` (sin Shift): ejecuta `undo()`.
  - `Ctrl+Y` / `Cmd+Y` o `Ctrl+Shift+Z` / `Cmd+Shift+Z`: ejecuta `redo()`.
- Detención estricta: Se ejecuta `e.preventDefault()` y `e.stopPropagation()` para que el evento no traspase el modal ni afecte al historial del lienzo de fondo.
- Respeto del foco nativo: Si el usuario está tecleando activamente dentro de un `<input>` o `<textarea>`, el atajo del navegador no se anula para permitir el deshacer nativo de texto interno si procede, o se consolida según la política de blur.

### RF-4: Política de Consolidación por Foco / Desenfoque (`onFocus` / `onBlur`)
- En los campos de formulario del inspector del modal (textos de capa, valores de campos de plantilla, inputs de nombres, etc.):
  1. `onFocus`: Se memoriza en una referencia (`lastFocusedValueRef`) el valor con el que el campo inició la edición.
  2. `onChange`: Se actualizan los valores en pantalla en tiempo real mediante `set(..., { skipHistory: true })` para fluidez absoluta de escritura (60 FPS) y previsualización inmediata.
  3. `onBlur`: Si el valor al salir difiere de `lastFocusedValueRef.current`, se confirma el nuevo estado llamando a `set(...)` **sin** la opción `skipHistory`, consolidando un único paso limpio en el historial.

### RF-5: Consolidación de Arrastre y Redimensionado Interactivo
- En el lienzo del modal para arrastre de capas (`handleLayerMouseDown` / `handleMouseMove`):
  1. Durante el arrastre o redimensión: se calculan las coordenadas relativas y se actualiza el override visual con `{ skipHistory: true }`.
  2. Al soltar el ratón (`onMouseUp` global): se invoca la actualización con persistencia en el historial (`skipHistory: false`), registrando un único estado con las coordenadas/dimensiones finales.

### RF-6: Acciones Inmediatas en Controles Discretos
- Los siguientes eventos registrarán directamente un nuevo paso en el historial al ser accionados:
  - Selector de color (`onChange` de color final).
  - Selectores desplegables (fuente, alineación, tipo de ajuste de imagen, layout flex/libre).
  - Botones de estilo (negrita, cursiva, subrayado, alineación vertical).
  - Añadir o eliminar una capa.
  - Reordenar capas arriba/abajo en el árbol jerárquico.
  - Inserción de un símbolo desde la galería de símbolos (`handleInsertSymbol`).

---

## 3. Requisitos No Funcionales y Criterios de Aceptación

1. **Rendimiento y Fluidez**:
   - Escribir en cualquier campo de texto no debe presentar retraso perceptible (lag).
   - `undo()` y `redo()` deben responder de forma instantánea (< 16 ms) reflejando de inmediato el cambio en el árbol de capas, el inspector y la previsualización de la carta.
2. **Coherencia con el Lienzo General**:
   - Los iconos y lógica de uso deben seguir el mismo patrón estético que los botones del lienzo principal introducidos en SRS-088.
3. **Persistencia y Descarte Limpio**:
   - Si el usuario pulsa **"Cancelar"** o la tecla **Escape**, todos los cambios temporales y el historial del modal se descartan.
   - Si el usuario pulsa **"Guardar"**, el estado presente consolidado se traslada a la carta en el proyecto y el historial del modal se destruye ordenadamente.

---

## 4. Plan de Pruebas Automatizadas

1. **Pruebas de Componente (`EditCardModal.test.tsx`)**:
   - Verificar la presencia de los botones de Deshacer y Rehacer junto al control de Zoom en la previsualización.
   - Comprobar que inicialmente ambos botones están deshabilitados.
   - Modificar una propiedad (ej. cambiar color o negrita) y comprobar que el botón Deshacer se habilita (`canUndo === true`).
   - Simular clic en Deshacer y verificar que la propiedad vuelve a su valor original y el botón Rehacer se habilita (`canRedo === true`).
   - Simular foco en campo de texto, tecleo múltiple y desenfoque (`blur`); verificar que solo se añade un único paso de historial.
   - Comprobar el funcionamiento de los atajos de teclado `Ctrl+Z` y `Ctrl+Y` dentro del modal.
