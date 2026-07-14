# Especificación Técnica (SRS) - SRS-049: Edición Visual por Arrastre y Redimensionado en el Lienzo

**Estado: COMPLETADO**

---

## 1. Introducción y Objetivos
- **Propósito**: Permitir modificar de forma interactiva y visual la posición (`xMm`, `yMm`) y las dimensiones (`anchoMm`, `altoMm`) de cualquier capa directamente sobre el lienzo (canvas) de previsualización, reduciendo la necesidad de ajustar valores numéricos manualmente.
- **Objetivos de Diseño**:
  - Fluidez y precisión en el arrastre y redimensionado, convirtiendo las coordenadas de píxeles (`px`) del evento del ratón a milímetros (`mm`) en base a la escala o zoom actual del lienzo.
  - Alternar fácilmente entre el modo de lectura/visualización estándar y el modo de edición visual interactiva.
  - Exponibilidad del modo de edición para que el usuario final pueda utilizarlo directamente sobre las cartas del lienzo principal de la hoja (workspace).
  - Jerarquía: Asegurar que al desplazar/redimensionar un contenedor, todos sus elementos hijos visuales se desplacen conjuntamente de manera natural.

---

## 2. Requisitos Funcionales y Casos de Uso

- **RF-1: Botón de Activación en el Inspector (Diseño de Plantillas)**:
  - En la sección "Posición y Dimensiones" del Inspector lateral de `EditCardModal`, se debe renderizar un botón para activar/desactivar la edición en el lienzo.
  - Estado inactivo: Botón muestra `"Editar en Lienzo"`.
  - Estado activo: Botón muestra `"Salir de Modo Edición"`.
  - Este control ("Edición en Lienzo") se puede exponer (`exposedProperties`) asociándolo con la propiedad `canvasEditMode`.

- **RF-2: Activación y Edición en el Lienzo Principal (Hoja / App.tsx)**:
  - Si el maquetador expone la propiedad `canvasEditMode` de una capa, el usuario final (en el lienzo principal de la hoja, `App.tsx`) verá un botón de alternancia en el panel derecho de campos de carta al seleccionar la carta.
  - Al activar este botón, el usuario final podrá arrastrar y redimensionar interactivamente esa capa en particular directamente en la carta de la hoja.
  - Los cambios de posición (`xMm`, `yMm`) y dimensiones (`anchoMm`, `altoMm`) resultantes se guardarán como anulaciones/overrides (`capasOverrides`) específicos de esa carta.

- **RF-3: Salida Automática por Pérdida de Foco**:
  - El modo de edición en el lienzo se desactivará automáticamente si el usuario hace foco (`onFocus`) en cualquier otro input del formulario o selecciona otro elemento/carta.

- **RF-4: Arrastre de Posición (Drag & Drop) y Soporte de Contenedores**:
  - Cuando el modo de edición esté activo, la capa seleccionada mostrará una caja delimitadora con un borde punteado de edición.
  - El usuario puede hacer click y arrastrar en cualquier parte interior de la capa para reposicionarla.
  - Conversión física: Se usará la variable de zoom o escala correspondiente del lienzo actual (`scale` en modal, `zoomFactor` en App) para convertir el desplazamiento de píxeles a milímetros.
  - **Soporte de Contenedores**: Dado que los hijos de un contenedor se renderizan de forma recursiva dentro de la estructura DOM y heredan su contexto de posicionamiento (`position: absolute/relative` con respecto al contenedor parent), al desplazar el contenedor padre, todos los elementos internos se mueven visualmente de forma automática. No se requiere recalcular ni mutar las coordenadas de los hijos.

- **RF-5: Redimensionado Visual (Resize Handle)**:
  - En la esquina inferior derecha de la caja delimitadora del elemento en modo edición, se renderizará un manejador de redimensionado (`resize-handle`).
  - Al arrastrar el manejador, se modificarán dinámicamente el ancho (`anchoMm`) y el alto (`altoMm`) de la capa en milímetros, aplicando un tamaño mínimo de seguridad de `2mm`.

---

## 3. Arquitectura y Diseño de Datos

### Estados de Control
- En el modal de edición de plantillas (`EditCardModal.tsx`):
  ```typescript
  const [canvasEditMode, setCanvasEditMode] = useState<boolean>(false);
  ```
- En el visor principal de la hoja (`App.tsx`):
  ```typescript
  // Almacena qué capa (y opcionalmente qué carta) está en modo de edición interactiva de posición/tamaño
  const [activeCanvasEditLayerId, setActiveCanvasEditLayerId] = useState<string | null>(null);
  ```

### Conversión
\[\Delta\text{mm} = \frac{\Delta\text{px}}{\text{escala}}\]
- En `EditCardModal.tsx`, la escala es la variable `scale`.
- En `App.tsx`, la escala es la variable `zoomFactor`.

---

## 4. Interfaces de Componentes / UI

### Estilos CSS recomendados
```css
.canvas-editable-active {
  outline: 2px dashed var(--accent-primary) !important;
  cursor: move;
  z-index: 100 !important;
}

.canvas-resize-handle {
  position: absolute;
  bottom: -4px;
  right: -4px;
  width: 10px;
  height: 10px;
  background-color: var(--accent-primary);
  border: 1px solid white;
  border-radius: 50%;
  cursor: se-resize;
  z-index: 1000;
}
```

---

## 5. Estrategia de Verificación (Pruebas)

### 5.1. Pruebas Unitarias Automatizadas
Crear pruebas en `EditCardModalCanvasDrag.test.tsx` para verificar:
- La activación del estado de edición en el lienzo.
- El cálculo correcto del factor de conversión de píxeles a milímetros.

### 5.2. Pruebas Manuales (Checklist)
1. Abrir el editor de plantillas, seleccionar una capa y pulsar "Editar en Lienzo". Mover el elemento y comprobar que X/Y cambian.
2. Arrastrar un contenedor con textos dentro y comprobar que los textos se desplazan junto al contenedor de forma perfecta.
3. Exponer la propiedad de edición del lienzo en la plantilla.
4. Volver a la hoja principal, seleccionar la carta, pulsar el botón de edición de lienzo en el panel derecho y arrastrar/redimensionar el elemento expuesto. Comprobar que los cambios quedan guardados como overrides de la carta.
