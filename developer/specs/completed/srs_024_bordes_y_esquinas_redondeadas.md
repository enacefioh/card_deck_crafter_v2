# Especificación Técnica - SRS-024: Bordes, Esquinas Redondeadas y Color de Fondo en Capas del Editor

## 1. Introducción y Objetivos
- **Propósito**: Añadir capacidades de estilo visual para configurar bordes (grosor y color), esquinas redondeadas (border-radius) y color de fondo de forma común para todas las capas visuales del editor (`image`, `image-switch`, `text`).
- **Objetivos de Diseño**:
  - **Fidelidad y Escalabilidad (Uso de mm)**: Las propiedades de grosor de borde y radio de esquina se guardarán en **milímetros (mm)**. Al renderizar, se multiplicarán por el factor de escala/zoom para que los bordes escalen proporcionalmente al hacer zoom o generar el PDF de alta resolución.
  - **Controles Unificados y Expandibles**:
    - Un control general para definir el grosor del borde (aplica a los 4 lados) y otro para el color. Un botón de alternancia (desplegable) permitirá definir grosor y color individuales por lado (Superior, Derecho, Inferior, Izquierdo).
    - Un control general para el radio de las esquinas (aplica a las 4 esquinas). Un botón de alternancia (desplegable) permitirá definir radios individuales por esquina (Superior Izquierda, Superior Derecha, Inferior Derecha, Inferior Izquierda).
    - Un control para activar/desactivar y seleccionar el **Color de Fondo** de la capa.
  - **Homogeneidad de Elementos**: Disponible en Pestaña de Diseño (plantilla base) y Pestaña de Contenido (anulaciones de carta) para imágenes normales, switch y textos.

---

## 2. Requisitos Funcionales y Casos de Uso

### RF-1: Estructura del Modelo de Datos (Bordes, Radios y Fondo)
- **RF-1.1**: Se añaden las siguientes propiedades (opcionales) a las capas del editor y a sus correspondientes overrides (`capasOverrides`):
  *   **Bordes (grosor en mm)**:
      *   `borderTopWidth` (number)
      *   `borderRightWidth` (number)
      *   `borderBottomWidth` (number)
      *   `borderLeftWidth` (number)
  *   **Bordes (color)**:
      *   `borderTopColor` (string)
      *   `borderRightColor` (string)
      *   `borderBottomColor` (string)
      *   `borderLeftColor` (string)
  *   **Radio de Esquina (radio en mm)**:
      *   `borderTopLeftRadius` (number)
      *   `borderTopRightRadius` (number)
      *   `borderBottomRightRadius` (number)
      *   `borderBottomLeftRadius` (number)
  *   **Color de Fondo**:
      *   `backgroundColor` (string) - Color en formato hex, o vacío si no se activa.
- **RF-1.2**: Si al leer una propiedad individual (ej. `borderTopWidth`) esta es indefinida, se asumirá `0` (sin borde).
- **RF-1.3**: Si al leer una propiedad de radio individual esta es indefinida, se asumirá `0` (esquina recta).

### RF-2: Panel Inspector (Pestaña Diseño)
- **RF-2.1**: Se creará una sección común en el inspector llamada **"Bordes y Esquinas"** para capas de texto e imágenes.
- **RF-2.2**: **Controles de Bordes**:
  - En modo colapsado (por defecto):
    - Campo numérico *"Grosor Borde (mm)"*. Si el usuario lo cambia, se actualizan los 4 grosores (`borderTopWidth`, etc.) simultáneamente.
    - Selector de color *"Color Borde"*. Si el usuario lo cambia, se actualizan los 4 colores simultáneamente.
  - Flecha de desplegar: Muestra 4 filas de inputs numéricos y selectores de color individuales para cada lado (Superior, Derecho, Inferior, Izquierdo).
- **RF-2.3**: **Controles de Radios**:
  - En modo colapsado (por defecto):
    - Campo numérico *"Radio Esquinas (mm)"*. Si el usuario lo cambia, se actualizan las 4 esquinas simultáneamente.
  - Flecha de desplegar: Muestra 4 inputs numéricos individuales para cada esquina.
- **RF-2.4**: **Color de Fondo**:
  - Un checkbox *"Activar Fondo"* y un selector de color asociado para la propiedad `backgroundColor`.
- **RF-2.5**: Estos controles estarán disponibles **únicamente** en la pestaña de **Diseño** al final de las demás opciones, modificando la capa base de la plantilla. No se renderizarán en la pestaña de Contenido.

### RF-3: Renderizado y PDF
- **RF-3.1**: En el frontend (lienzo y detalle de carta), se aplicarán los estilos CSS equivalentes convertidos a píxeles:
  - `borderTop`: `${borderTopWidth * zoom}px solid ${borderTopColor}` (y análogos para derecha, abajo, izquierda).
  - `borderTopLeftRadius`: `${borderTopLeftRadius * zoom}px` (y análogos para las demás esquinas).
  - `backgroundColor`: `${backgroundColor || "transparent"}`.
  - `boxSizing: "border-box"` para evitar que el grosor del borde altere el ancho/alto total del elemento.
- **RF-3.2**: En el backend (Puppeteer para generación de PDF y debug HTML), se aplicará la misma conversión utilizando el factor de conversión `MM_TO_PX` (o milímetros directamente si es compatible, pero se recomienda píxeles para mantener consistencia con el escalado del lienzo).

---

## 3. Estado de la Especificación
- **Estado**: 🟢 Completado e Implementado
