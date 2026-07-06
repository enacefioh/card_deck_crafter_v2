# SRS-037: Formulario de Edición Simplificada de Cartas

## 1. Descripción del Problema
Una vez que el maquetador ha configurado la lista de atributos editables para una carta o plantilla (conforme a [SRS-036](file:///c:/Users/victo/proyectos/cdc2/developer/specs/srs_036_seleccion_atributos_editables.md)), el usuario "editor" necesita una interfaz limpia e interactiva para cambiar los valores de estos campos rápidamente sin abrir el editor avanzado de plantillas.

---

## 2. Requisitos Funcionales

### RF-1: Formulario Dinámico en la Sidebar Principal (`App.tsx`)
Cuando el usuario seleccione una carta en la pantalla principal (`App.tsx`), si la carta tiene campos editables configurados (`exposedProperties`):
*   Se sustituirá la lista estática (del SRS-036) por un formulario dinámico e interactivo.
*   El formulario contendrá inputs específicos según el tipo de propiedad expuesta:
    *   **Textos (`contenidoRaw` / `text`)**:
        *   Si la capa está configurada como multilínea, se renderizará un `<textarea>` con 2 o 3 filas.
        *   Si es de línea simple, se renderizará un `<input type="text">`.
    *   **Imágenes o Switch (`src` / `image` | `image-switch`)**:
        *   Se mostrará una pequeña miniatura de la imagen activa.
        *   Un botón de subir imagen local desde el PC.
        *   Un botón para seleccionar de la galería multimedia del proyecto.
        *   Si es un `image-switch`, un carrusel compacto de selección de opciones configuradas.
    *   **Colores (`colorFill` / `color`)**:
        *   Un selector de color nativo (`<input type="color">`) junto con su input hexadecimal para ajustes estéticos sencillos si el maquetador los expuso.

### RF-2: Actualización y Reactividad en Tiempo Real
*   Cualquier cambio realizado en los inputs del formulario lateral se aplicará inmediatamente al estado temporal de la carta seleccionada.
*   El lienzo de impresión virtual y el canvas principal se refrescarán instantáneamente, mostrando los nuevos textos, imágenes o colores modificados en caliente.

### RF-3: Persistencia de los Valores
*   Los valores editados a través de este formulario se guardarán en el estado del proyecto como overrides de capa (`capasOverrides`) o valores de campo (`valoresCampos`) de la carta correspondiente, de forma idéntica a si se hubiesen editado en el inspector del editor de plantillas.
*   Estos valores se exportarán y guardarán de forma persistente dentro del archivo del proyecto `.cdc2`.
