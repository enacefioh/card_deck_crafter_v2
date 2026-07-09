# SRS-043: Inspector de Propiedades Compacto estilo Unity

**Estado: Completado**

## Descripción
Esta especificación define la transformación de la barra lateral derecha ("Campos Editables") en un inspector extremadamente compacto y ordenado, inspirado en el editor de Unity. El objetivo es maximizar la cantidad de campos visibles de forma simultánea, admitir la jerarquía y anidamiento de capas en contenedores mediante sangrías y paneles colapsables, y optimizar el espacio horizontal alineando las etiquetas y los inputs de forma inline.

---

## Requisitos de Interfaz de Usuario (UI)

### RF-1: Diseño Inline de Dos Columnas (Estilo Unity)
*   Para la mayoría de campos (inputs normales, colorpickers, selectores y checkboxes):
    *   Se distribuirán en **dos columnas en una sola línea**:
        *   **Columna Izquierda (Etiquetas)**: Ocupará un ancho aproximado de `35% - 40%`. Las etiquetas tendrán textos truncados a un máximo de `12 - 15` caracteres mediante elipsis (`text-overflow: ellipsis`), añadiendo la propiedad `title` con el nombre completo de la etiqueta para visualizarlo al posar el ratón.
        *   **Columna Derecha (Controles)**: Ocupará el `60% - 65%` restante. Contendrá el input propiamente dicho (caja de texto, selector desplegable, checkbox o el selector de color compacto).
    *   Este diseño compacto reduce sustancialmente el espaciado vertical en comparación con el diseño actual de etiquetas sobre inputs.

### RF-2: Tratamiento Especial para Textareas (Multiline)
*   Los campos multilínea (`textarea`) se saldrán del flujo inline de dos columnas para asegurar comodidad de escritura:
    *   Se mostrarán en **bloque completo**: la etiqueta ocupará el 100% de la fila superior, y el input de texto ocupará el 100% de la fila inferior.
    *   El input tendrá una **altura inicial compacta** (ej. `40px` - `50px`) y conservará el tirador de redimensionamiento nativo del navegador en la esquina inferior derecha (`resize: vertical`).

### RF-3: Soporte para Jerarquías y Desplegables (Foldouts)
*   **Agrupación de Capas**: Si la carta utiliza una plantilla estructurada con contenedores o sub-elementos anidados, las propiedades editables se agruparán bajo cabeceras de sección con un indicador triangular (`▼` para expandido y `▶` para colapsado).
*   **Sangría de Anidamiento**: Los campos pertenecientes a capas que estén dentro de un contenedor padre recibirán una sangría ligera en la columna izquierda (ej. `12px` de margen izquierdo por nivel de anidamiento) para reflejar visualmente la estructura jerárquica.
*   **Colapso de Grupos**: Al hacer clic en el triángulo o en el título del contenedor, se ocultará/mostrará todo el subgrupo de propiedades asociadas.

---

## Plan de Verificación

### Pruebas Manuales
1.  **Alineación Inline**: Seleccionar una carta con propiedades de texto plano y verificar que la etiqueta y el campo se renderizan uno al lado del otro en la misma línea.
2.  **Elipsis y Tooltips**: Verificar que las etiquetas muy largas se recortan mostrando `...` y que, al posicionar el cursor sobre ellas, emerge el tooltip nativo de HTML con el nombre completo.
3.  **Visualización de Textareas**: Seleccionar un campo multilínea y verificar que la caja de texto se renderiza debajo de la etiqueta cubriendo el 100% del ancho y que es redimensionable.
4.  **Anidamiento y Foldouts**: Crear una plantilla con capas agrupadas en contenedores. Verificar que en la barra lateral aparecen las cabeceras colapsables y que las propiedades anidadas muestran sangría.
