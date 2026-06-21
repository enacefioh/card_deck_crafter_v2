# Especificación Técnica - SRS-010: Editor Visual de Cartas en Modal (Estructura y Edición de Valores)

## 1. Introducción y Objetivos
- **Módulo**: Modal-based Card Editor & Hierarchy Inspector (Client).
- **Propósito**: Proporcionar al usuario una interfaz de edición avanzada a pantalla completa (modal) para personalizar de forma individual e intuitiva cada carta. En lugar de un formulario plano en la barra lateral, se implementará un popup modal estructurado en pestañas (Delantera/Trasera) y tres columnas de trabajo inspiradas en editores profesionales (WordPress / Unity).
- **Estrategia Agile (División)**:
  - **Parte 1 (Esta Spec)**: Carga del modal, estructura de tres columnas, selección sincrónica (explorador e interacción directa sobre el lienzo), resaltado al pasar el ratón (hover highlight), edición de valores dinámicos (`valoresCampos` de textos y `colorFill` del fondo) y ciclo de guardado/cancelación con alertas de descarte.
  - **Parte 2 (Spec SRS-012 futura)**: Edición avanzada de estilos de capas de diseño (fuentes, alineaciones, tamaños, coordenadas de posición y subida de imágenes para capas ilustrativas).

---

## 2. Requisitos Funcionales y Casos de Uso

### RF-1: Acceso al Editor de Carta (Trigger)
- **RF-1.1**: Se añadirá un botón con el icono `✏️` ("Editar carta seleccionada") en la barra de herramientas de selección del lienzo, junto al botón de ver detalle `👁️`. Estará habilitado únicamente cuando haya exactamente **una carta seleccionada**.
- **RF-1.2**: Se agregará una opción en el menú superior **Edición** > **Editar Carta Seleccionada...** (con atajo de teclado alternativo o comportamiento similar).

### RF-2: Caso de Uso - UC-02: Editar Carta (Popup Modal)
- **Actor Principal**: Usuario del editor.
- **Precondiciones**: Hay una carta creada a partir de una plantilla seleccionada en el editor.
- **Flujo Principal**:
  1. El usuario pulsa sobre el botón **Editar** (`✏️`) del menú o de la barra del lienzo.
  2. El sistema abre un popup modal a pantalla completa que contiene la herramienta de edición.
  3. El sistema carga la estructura de la delantera de la carta en blanco con su previsualización en el centro, el árbol de capas a la izquierda y el panel vacío a la derecha.
  4. El usuario selecciona un elemento (capa) de la carta para editarlo, ya sea haciendo clic directamente sobre el elemento en la carta central, o seleccionándolo en el árbol de jerarquía izquierdo.
  5. El sistema actualiza el panel derecho mostrando el formulario con las propiedades editables para esa capa.
  6. El usuario modifica las propiedades (ej. escribe un nuevo título o cambia el color del fondo).
  7. El sistema renderiza el cambio inmediatamente en la previsualización del lienzo central.
  8. El usuario repite los pasos 4 a 7 según sea necesario.
  9. El usuario hace clic en el botón **"Aceptar"** o **"Guardar"**.
  10. El sistema aplica las modificaciones a la carta original de la baraja y cierra el modal.

- **Excepciones**:
  - **A. La plantilla no tiene elementos**:
    - El sistema muestra un mensaje de texto central que indica `"Nada que editar"`.
  - **B. El usuario pulsa sobre Cancelar (o pulsa `Escape` o cierra el modal)**:
    - Si **no** ha habido modificaciones: El popup se cierra inmediatamente sin guardar.
    - Si **ha habido** modificaciones en los campos: El sistema muestra una alerta de confirmación (`window.confirm`) para proceder al descarte de los cambios. Si el usuario confirma, se descartan los cambios y se cierra el modal. Si no, permanece en el editor.

- **Postcondiciones**: La carta queda modificada a su nueva versión en el editor principal.

---

## 3. Diseño de la Interfaz del Modal (Estructura de Tres Columnas)
El modal ocupará la mayor parte de la pantalla (ej. `width: 95vw`, `height: 90vh`) y se organizará de la siguiente forma:

### 3.1. Cabecera (Header)
- Título de la edición (ej. *Editor de Carta: [Nombre]*).
- Pestañas superiores para alternar caras: **Cara Frontal (Frente)** y **Cara Trasera (Reverso)**. *Nota: La pestaña Cara Trasera solo estará habilitada si la opción de reversos está activa en el proyecto*.
- Botones de acción a la derecha: **Aceptar (Guardar)** y **Cancelar (Cerrar)**.

### 3.2. Columna Izquierda: Explorador de Jerarquía (Hierarchy)
- Muestra una lista secuencial de las capas del lado activo (delantera o trasera).
- Cada capa se lista con un icono descriptivo del tipo (ej. `🎨` para fondo, `📝` para texto).
- **Interactividad**: Al pasar el ratón (hover) sobre un elemento de la lista, este se resalta. Al hacer clic, se marca como seleccionado.

### 3.3. Columna Central: Previsualización de Lienzo (Interactive Preview)
- Muestra la carta renderizada a escala estática fija (ej. zoom factor de `3.5`).
- Cada capa visible se dibuja en su posición absoluta.
- **Interactividad Directa**: Al pasar el ratón por encima de una capa de texto o fondo en la carta, se dibuja un borde sutil de selección temporal. Hacer clic en una capa la selecciona, sincronizando el explorador izquierdo y el panel de propiedades derecho.

### 3.4. Columna Derecha: Inspector de Propiedades (Inspector)
- Muestra un formulario adaptado a la capa seleccionada:
  - **Capa Tipo `background`**: Selector de color (`<input type="color" />`) para cambiar el color de relleno `colorFill`.
  - **Capa Tipo `text`**: 
    - Si la capa hace referencia a un campo dinámico de la plantilla (ej. su `contenidoRaw` contiene `{{clave}}`), muestra el input de texto correspondiente para editar el valor de esa clave en `valoresCampos` (por ejemplo, el campo de una línea para el Título, o un `<textarea>` multilínea para las Reglas de la carta).
  - **Si no hay selección**: Muestra un texto guía: *"Selecciona una capa de la lista o haz clic en la carta para editarla"*.

---

## 4. Estructura de Datos (Overrides)
Para mantener las modificaciones de diseño de capas específicas de una carta sin modificar la plantilla global, se añade soporte para guardar anulaciones (`capasOverrides`) en la carta:

```typescript
export interface Carta {
  id: string;
  nombre: string;
  imagenFrontal?: string;
  imagenTrasera: string | null;
  cantidad: number;
  
  plantillaId?: string;
  valoresCampos?: Record<string, string>;
  // Estructura de anulaciones de diseño de capa de esta carta individual
  capasOverrides?: Record<string, {
    colorFill?: string;
    // (Extensible para futuras propiedades de estilo)
  }>;
}
```

Al renderizar capas en el lienzo principal y en el modal de edición:
- El color de fondo de una capa `background` será `carta.capasOverrides?.[capaId]?.colorFill || capa.colorFill`.

---

## 5. Estrategia de Verificación (Pruebas)

### 5.1. Pruebas Automatizadas (Vitest)
Se crearán tests unitarios para validar:
- La correcta inicialización del estado temporal de edición a partir de la carta original.
- La aplicación correcta del estado temporal de edición sobre la carta original al guardar (Accept).
- Que al cancelar sin cambios no ocurran alertas, y con cambios sí ocurran.

### 5.2. Pruebas Manuales
- [ ] **Apertura de Modal**: Seleccionar una carta de plantilla, pulsar `✏️` y verificar que el modal de 3 columnas se abre correctamente.
- [ ] **Sincronización de Selección (Explorador a Previsualización)**: Pulsar una capa en el menú jerárquico izquierdo y comprobar que en el panel derecho se cargan sus controles y la capa se resalta en el lienzo.
- [ ] **Sincronización de Selección (Previsualización a Explorador)**: Hacer clic en el texto del Título de la carta directamente sobre el lienzo y verificar que se selecciona en el menú izquierdo.
- [ ] **Resaltado en Hover**: Pasar el cursor sobre la lista izquierda y comprobar que la capa correspondiente en el centro se contornea visualmente en el lienzo.
- [ ] **Edición en Tiempo Real**: Cambiar el color de fondo o modificar el texto de reglas y verificar que la carta en el centro se redibuja de inmediato.
- [ ] **Alerta de Cancelación**: Modificar el texto y pulsar "Cancelar". Comprobar que salta el aviso `confirm`. Cancelar el descarte para seguir editando, o confirmar el descarte y comprobar que la carta en la baraja no se modificó.
