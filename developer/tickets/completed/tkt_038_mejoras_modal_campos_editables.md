# TKT-038: Mejoras en el Modal de Configuración de Campos Editables

## Descripción del Problema
Tras el uso práctico de la funcionalidad de campos editables ([SRS-036](file:///c:/Users/victo/proyectos/cdc2/developer/specs/completed/srs_036_seleccion_atributos_editables.md)), se han identificado varios aspectos de usabilidad a mejorar en el modal de configuración de campos editables del maquetador:
1.  **Dimensiones del Modal**: El modal actual es demasiado pequeño cuando existen múltiples capas y propiedades, dificultando su visualización global.
2.  **Cierre Accidental**: Si el usuario hace clic fuera del modal por error (en el backdrop), este se cierra inmediatamente perdiendo todos los cambios sin confirmación previa.
3.  **Visualización Jerárquica**: En la columna izquierda (capas disponibles), las capas se muestran planas. Sería mucho más intuitivo presentarlas con una sangría/margen izquierdo cuando están dentro de un contenedor, e idealmente permitir colapsar/expandir dichos contenedores.
4.  **Orden al Añadir**: Al transferir un campo a la derecha (expuestos), se añade siempre al final de la lista de forma predeterminada. Debería colocarse respetando su posición relativa original en el árbol de capas por defecto.

---

## Requisitos Funcionales

### RF-1: Ampliación de Dimensiones
*   Aumentar el ancho (`width` / `max-width` a `90vw` o `1000px`) y la altura (`height` / `max-height` a `85vh` o similar) del modal de configuración de campos editables en `EditCardModal.tsx` (`showExposedConfigModal`).

### RF-2: Protección contra Cierre Accidental
*   **Intercepción de Clics**: Deshabilitar el cierre directo al hacer clic en el backdrop de fondo negro del modal.
*   **Confirmación de Salida**: Si el usuario hace clic en "Cancelar" o en la "✕" de cerrar, y ha realizado modificaciones en la lista de expuestos (cambios de orden, etiquetas o altas/bajas):
    *   Mostrar una confirmación nativa (`window.confirm`) con un mensaje advirtiendo de la pérdida de cambios: *"¿Seguro que deseas salir sin guardar? Se perderán todos tus cambios."*.

### RF-3: Indentación Jerárquica y Contenedores Colapsables (Columna Izquierda)
*   En la columna de campos disponibles (izquierda):
    *   Determinar de forma recursiva el nivel de anidamiento de cada capa (en base a su `parentCapaId`).
    *   Aplicar un margen izquierdo proporcional al nivel de anidamiento (ej. `margin-left: nivel * 16px`) para reflejar visualmente la jerarquía.
    *   Para capas de tipo **Contenedor (`container`)**:
        *   Mostrar un botón/flecha de colapso (`▼` / `►`) junto a su nombre.
        *   Permitir colapsar/expandir el contenedor para ocultar o mostrar sus capas hijas en el árbol.

### RF-4: Orden de Inserción Predeterminado Basado en Árbol
*   Al añadir un campo disponible de la izquierda a la derecha, en lugar de empujarlo al final de la lista (`push`), insertarlo en la posición que respete el orden original de las capas en el diseño de la plantilla (recorriendo el árbol de capas de arriba a abajo y de padres a hijos).
