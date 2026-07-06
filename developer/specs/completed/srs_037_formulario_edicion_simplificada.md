# SRS-037: Formulario de Edición Simplificada de Cartas (Edición Múltiple)

## 1. Descripción del Problema
Una vez que el maquetador ha configurado la lista de atributos editables para una carta o plantilla (conforme a [SRS-036](file:///c:/Users/victo/proyectos/cdc2/developer/specs/completed/srs_036_seleccion_atributos_editables.md)), el usuario "editor" necesita una interfaz limpia e interactiva en el panel lateral (Sidebar) para cambiar los valores de estos campos rápidamente sin tener que abrir el modal avanzado de edición.

Esta especificación detalla el comportamiento del formulario tanto para la selección de una única carta como para la selección múltiple de cartas.

---

## 2. Requisitos Funcionales

### RF-1: Resolución de Campos Coincidentes (Selección Múltiple)
*   Si se selecciona una **única carta**: Se muestran todos sus campos configurados como editables (`exposedProperties`).
*   Si se seleccionan **varias cartas**: Solo se mostrarán en la Sidebar los campos editables que coincidan exactamente en todas ellas.
*   **Definición de coincidencia jerárquica**: Dos campos expuestos coinciden si y solo si:
    1.  Tienen la misma propiedad expuesta (ej. `contenidoRaw`, `src`, `colorFill`).
    2.  Pertenecen a capas del mismo tipo (ej. ambos `text`, ambos `image`).
    3.  Tienen el mismo nombre visual/clave de capa (ej. `"texto"`).
    4.  **Ruta jerárquica idéntica**: Si están contenidos dentro de contenedores, la cadena de nombres de todos sus contenedores padre hasta la raíz debe coincidir exactamente.
        *   *Ejemplo de NO coincidencia*: Un campo `"texto"` dentro de `Cuerpo > texto` y otro dentro de `Título > texto`.
        *   *Ejemplo de coincidencia*: Ambos campos `"texto"` ubicados bajo la ruta `Cabecera > Barra Titulo > texto`.

### RF-2: Valores y Comportamiento de los Inputs
*   **Selección Única**: Los inputs muestran los valores actuales que tiene la carta seleccionada para esa propiedad.
*   **Selección Múltiple**:
    *   Si todas las cartas seleccionadas tienen **el mismo valor** para esa propiedad, el input mostrará dicho valor.
    *   Si tienen **valores diferentes**, el input se mostrará vacío (y opcionalmente con un placeholder como `"<Valores múltiples>"`).
    *   Cualquier cambio realizado en un input por el usuario actualizará inmediatamente el valor de esa propiedad en **todas** las cartas seleccionadas simultáneamente.

### RF-3: Tipos de Controles e Interfaces del Formulario
El formulario lateral presentará los siguientes controles específicos:
1.  **Textos (`text`)**:
    *   Si la capa tiene la propiedad `multiline: true`, se muestra un `<textarea>` de 3 filas.
    *   Si no, un `<input type="text">` de una sola línea.
2.  **Imágenes (`image` | `image-switch`)**:
    *   Muestra una miniatura de la imagen actual (o un icono genérico si hay valores múltiples desiguales).
    *   Botón para cargar un archivo local.
    *   Botón para elegir desde la galería de recursos del proyecto.
    *   Si es un `image-switch`, un selector/carrusel compacto de sus opciones disponibles.
3.  **Colores (`color`)**:
    *   Selector nativo (`<input type="color">`) acompañado de un input de texto hexadecimal.

### RF-4: Reactividad y Persistencia
*   Los cambios se aplican inmediatamente al estado de las cartas en el canvas principal.
*   Los valores modificados se guardan de forma persistente dentro de la carta (como `valoresCampos` o `capasOverrides`) y se guardarán en el archivo de proyecto `.cdc2`.
