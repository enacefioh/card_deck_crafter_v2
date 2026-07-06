# SRS-036: Configuración de Atributos Editables (Modo Maquetador)

## 1. Descripción del Problema
Para permitir una edición simplificada de cartas sin que los editores tengan que interactuar con el árbol completo de capas o el editor avanzado, el maquetador debe poder seleccionar qué atributos de cada capa de la plantilla se exponen para su edición rápida.

Esta especificación cubre la interfaz para que el maquetador seleccione y guarde esta lista de atributos editables a nivel de plantilla, la herencia de esta configuración en cada carta de forma independiente, y la visualización de la lista de atributos seleccionados en la barra lateral del workspace principal al seleccionar una carta (como texto plano informativo, sin inputs).

---

## 2. Requisitos Funcionales

### RF-1: Definición del Esquema e Independencia en la Carta
*   La plantilla (`Template`) almacenará una propiedad `exposedProperties`:
    ```typescript
    interface ExposedProperty {
      layerId: string;      // ID de la capa
      property: string;     // Propiedad (ej. "contenidoRaw" o "src")
      label: string;        // Nombre amigable (ej. "Título", "Ilustración")
    }
    ```
*   **Herencia e Independencia**: Al crear una carta a partir de una plantilla, la carta hereda la lista `exposedProperties` actual de dicha plantilla. A partir de ese momento, la configuración de propiedades editables de la carta es completamente **independiente** de la plantilla. Modificar la plantilla posteriormente no afectará a las cartas ya existentes en el proyecto.

### RF-2: Acceso en el Editor de Cartas / Plantillas
*   En la columna lateral del inspector o panel de acciones de `EditCardModal` (modo maquetador), se añadirá un botón titulado **"Configurar campos editables"**.
*   Este botón estará ubicado justo **encima del botón de "Guardar plantilla"**.

### RF-3: Modal de Selección de Atributos (Dos Columnas)
Al hacer clic en "Configurar campos editables", se abrirá un modal superpuesto:
1.  **Columna Izquierda (Disponibles)**: Muestra todas las capas y sus propiedades editables (ej. `[Texto] Título - Contenido`, `[Imagen] Ilustración - Imagen`).
2.  **Columna Derecha (Expuestos/Seleccionados)**: Muestra los atributos seleccionados para esta carta/plantilla.
3.  **Configuración por Defecto**: Al crear o iniciar esta configuración, se preseleccionarán automáticamente:
    *   Para capas de **Texto (`text`)**: El contenido del texto (`contenidoRaw`).
    *   Para capas de **Imagen o Image-Switch (`image` | `image-switch`)**: El archivo de imagen o selección (`src`).
    *   Para **Contenedores y Bloques Vacíos**: Ninguna propiedad por defecto.
4.  **Acciones del Modal**:
    *   Botones de transferencia (`>` y `<`) para añadir y remover elementos.
    *   Controles de ordenación (`▲` y `▼`) para organizar la lista en la columna derecha.
    *   Input de edición de texto para que el maquetador personalice la etiqueta (Label) legible (ej. cambiar `CapaTexto1 - contenidoRaw` a `Nombre de la Criatura`).
    *   Botones de **Aceptar** (guarda la configuración local temporal) y **Cerrar/Cancelar** (descarta cambios).

### RF-4: Previsualización de la Lista en la Sidebar (`App.tsx`)
*   Al seleccionar una carta en el workspace principal (`App.tsx`), el panel lateral (Sidebar) mostrará una nueva sección titulada **"Campos Editables"**.
*   En esta versión, esta sección **solo listará en texto plano** las propiedades expuestas configuradas para esa carta (ej. `• Nombre de la Criatura (Texto)`, `• Ilustración (Imagen)`), como verificación de que se han heredado y guardado correctamente.
*   No se renderizarán inputs ni formularios de edición interactiva. El renderizado de inputs interactivos y el procesamiento de cambios se definirán en la especificación [SRS-037](file:///c:/Users/victo/proyectos/cdc2/developer/specs/srs_037_formulario_edicion_simplificada.md).
