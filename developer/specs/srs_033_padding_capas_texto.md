# SRS-033: Configuración de Margen Interno (Padding) en Capas de Texto

## Descripción del Problema
Actualmente, las capas de texto se renderizan con un padding fijo muy pequeño (2px). No hay opción de personalizar este margen interno, lo que dificulta alinear correctamente los textos dentro de bloques decorados con fondos y bordes.

## Requisitos Funcionales

### RF-1: Propiedades de Padding en el Modelo de Capas
Se añaden cuatro nuevos atributos de padding medidos en milímetros (mm) a la interfaz de las capas de texto:
*   `paddingTopMm`: Margen interno superior (por defecto `0`).
*   `paddingRightMm`: Margen interno derecho (por defecto `0`).
*   `paddingBottomMm`: Margen interno inferior (por defecto `0`).
*   `paddingLeftMm`: Margen interno izquierdo (por defecto `0`).

### RF-2: Panel de Configuración en el Inspector de Propiedades
En la pestaña de **Diseño** del inspector, se creará una sección plegable llamada "Padding del Texto" que permitirá:
1.  **Modo Simplificado**: Un control numérico para ajustar el padding general (aplica el mismo valor en mm a los 4 lados a la vez).
2.  **Modo Avanzado (Plegable)**: Al expandirse, muestra 4 inputs individuales para `Arriba`, `Derecha`, `Abajo` e `Izquierda`.

### RF-3: Renderizado de Padding en Pantalla y Exportación
*   **Editor y Visualizador**: El padding se calculará dinámicamente multiplicando los mm por la escala/zoom (`scale` o `zoomFactor`) y aplicándolo como estilo CSS `paddingTop`, `paddingRight`, etc. en el elemento HTML contenedor del texto.
*   **Backend (PDF)**: Se inyectará el estilo CSS nativo en mm en la plantilla del backend: `padding: [top]mm [right]mm [bottom]mm [left]mm;` para asegurar la precisión milimétrica al exportar.
