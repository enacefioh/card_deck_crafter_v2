# SRS-035: Pestaña Unificada de Propiedades en el Inspector

## Descripción del Problema
Actualmente, al diseñar una capa en el editor de plantillas (`EditCardModal`), el panel lateral derecho (Inspector de Propiedades) divide las opciones en dos sub-pestañas: **Contenido** (para variables, texto del input o reemplazo de imágenes) y **Diseño** (para dimensiones, colores, fuentes, bordes y espaciados). 

Esta separación obliga al maquetador a estar alternando constantemente entre pestañas para ajustar aspectos básicos de una misma capa (por ejemplo, cambiar el texto y luego su tamaño o alineación).

## Requisitos Funcionales

### RF-1: Eliminación de Sub-pestañas en el Inspector
*   Se eliminarán las sub-pestañas **Contenido** y **Diseño** del panel lateral del inspector de capas (`inspector-column`).
*   Toda la información se presentará en una única lista de desplazamiento vertical unificada bajo el título o pestaña única de **Propiedades**.

### RF-2: Orden y Estructura de Campos Unificados
Para asegurar la legibilidad, los campos se ordenarán secuencialmente agrupando primero los de contenido (variables/datos) y luego los estéticos (diseño). El orden por tipo de capa será:

1.  **Capas de Texto (`tipo === "text"`)**:
    *   **Contenido (Texto / Input)**: Campo de texto o textarea para ingresar el valor del texto/placeholders.
    *   **Formato de Fuente**: Selector de tipografía, tamaño (pt), color y estilos (negrita, cursiva, subrayado).
    *   **Alineación**: Alineación horizontal (izquierda, centro, derecha, justificado).
    *   **Margen interno (Padding)**: Controles de relleno superior, inferior, izquierdo y derecho (SRS-033).
    *   **Bordes y Esquinas**: Bordes individuales y radios de esquinas redondeadas (SRS-024).
    *   **Dimensiones y Posición**: Posición (X, Y) y tamaño (Ancho, Alto).
2.  **Capas de Imagen (`tipo === "image" | "image-switch"`)**:
    *   **Contenido (Imagen / Switch)**: Botones para seleccionar imagen (subida directa o galería multimedia) u opciones del selector (switch).
    *   **Ajuste**: Modo de ajuste (cover, contain, stretch).
    *   **Estilos y Bordes**: Color de fondo del contenedor, bordes individuales y radios de esquinas (SRS-024).
    *   **Dimensiones y Posición**: Posición (X, Y) y tamaño (Ancho, Alto).
3.  **Capas de Contenedor y Bloques Vacíos (`tipo === "container" | "block"`)**:
    *   **Estilos Estéticos**: Color de fondo del bloque/contenedor, bordes individuales y radios de esquinas.
    *   **Disposición (solo Contenedores)**: Dirección del Layout (vertical, horizontal).
    *   **Dimensiones y Posición**: Posición (X, Y) y tamaño (Ancho, Alto).

### RF-3: Secciones Colapsables
*   Para evitar que la columna de propiedades sea excesivamente larga y abrumadora, el inspector utilizará secciones colapsables (ej. "Texto y Fuente", "Bordes y Esquinas", "Transformación y Posición").
*   Estas secciones recordarán su estado abierto/cerrado o se mostrarán agrupadas visualmente con cabeceras claras.
