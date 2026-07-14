# Especificación Técnica (SRS) - SRS-050: Dimensiones Automáticas en Textos y Contenedores

**Estado: COMPLETADO**

---

## 1. Introducción y Objetivos
- **Propósito**: Permitir que los elementos de tipo **Texto** y **Contenedor** adapten dinámicamente su tamaño (ancho y/o alto) según su contenido o los elementos hijos que albergan. Esto evita la necesidad de configurar anchos y altos fijos en milímetros para elementos cuyo contenido es variable (por ejemplo, textos largos, listas de iconos o atributos).
- **Objetivos de Diseño**:
  - Introducir las opciones de "Ancho Automático" (`width: "auto"`) y "Alto Automático" (`height: "auto"`) en el inspector.
  - Asegurar la compatibilidad con el sistema de coordenadas físicas en milímetros (`mm`). Cuando un elemento tiene dimensiones automáticas, estas se calculan en base al flujo CSS del navegador, pero se respeta la escala (`zoomFactor` / `scale`).
  - Restringir las dimensiones automáticas de los contenedores según su tipo de layout para evitar inconsistencias de maquetación:
    - Un contenedor con **Alto Automático** solo estará disponible para layouts **Lineales Verticales** (`layout === "vertical"`).
    - Un contenedor con **Ancho Automático** solo estará disponible para layouts **Lineales Horizontales** (`layout === "horizontal"`).
  - Permitir que un texto multilínea tenga tanto ancho como alto automáticos de manera simultánea.

---

## 2. Requisitos Funcionales y Casos de Uso

### RF-1: Controles en el Inspector (Modal de Edición de Cartas y Sidebar Principal)
- Junto a los inputs numéricos de "Ancho" (`anchoMm`) y "Alto" (`altoMm`), se debe añadir un checkbox o control visual para alternar el modo automático:
  - Checkbox `"Auto"` o similar para el ancho y otro para el alto.
- Si el ancho automático está **activo**:
  - El input numérico de "Ancho" se desactivará (`disabled`), mostrando el valor `"-"` (o el texto `"Auto"` como placeholder/valor).
  - La propiedad de la capa se guardará internamente con el valor `"auto"` (por ejemplo, `anchoMm: "auto"`).
- Si el alto automático está **activo**:
  - El input numérico de "Alto" se desactivará (`disabled`), mostrando el valor `"-"` (o el texto `"Auto"` como placeholder/valor).
  - La propiedad de la capa se guardará internamente con el valor `"auto"` (por ejemplo, `altoMm: "auto"`).

### RF-2: Restricciones para Contenedores
- Para capas de tipo `container`:
  - La opción de **Alto Automático** solo se mostrará o estará habilitada si el tipo de Layout seleccionado es **Lineal Vertical** (`layout === "vertical"`).
  - La opción de **Ancho Automático** solo se mostrará o estará habilitada si el tipo de Layout seleccionado es **Lineal Horizontal** (`layout === "horizontal"`).
  - Si el usuario cambia el tipo de layout a uno no compatible (por ejemplo, de "Lineal Vertical" a "Libre"), cualquier dimensión automática activa en ese contenedor debe revertirse a su último valor numérico válido (por defecto `20` o el valor numérico guardado).

### RF-3: Reglas de Renderizado y Estilos CSS (Lienzo)
En el motor de renderizado (`App.tsx` y `EditCardModal.tsx`), al generar los estilos CSS del elemento:
- Si `anchoMm === "auto"`:
  - En lugar de `width: "${anchoMm * scale}px"`, el estilo CSS será `width: "fit-content"` (o `max-content` para textos de una línea, o simplemente omitir/fijar en `auto`).
- Si `altoMm === "auto"`:
  - En lugar de `height: "${altoMm * scale}px"`, el estilo CSS será `height: "fit-content"` (o `auto`).
- Para elementos dentro de contenedores con layouts lineales:
  - Se debe asegurar que las propiedades flex y la alineación respondan correctamente al tamaño calculado por el navegador.

### RF-4: Compatibilidad con Propiedades Expuestas (`exposedProperties`)
- Al marcar el ancho o alto como automáticos en la plantilla, esta condición debe respetarse en la hoja de cartas (`App.tsx`).
- Las anulaciones (`capasOverrides` y `capasOverridesTrasera`) deben soportar valores de tipo `"auto"` o numéricos. Si un usuario final en el editor de páginas tiene acceso a modificar las dimensiones de una capa con tamaño automático, verá el input numérico desactivado a menos que desmarque la opción "Auto".

---

## 3. Arquitectura y Diseño de Datos

### Tipos de Datos (TypeScript)
Se deben modificar las interfaces de capas en `shared` o en el cliente para permitir que `anchoMm` y `altoMm` acepten el valor `"auto"` além de `number`.
```typescript
export interface Capa {
  id: string;
  tipo: "text" | "image" | "image-switch" | "container" | "block" | "background";
  nombre: string;
  xMm: number;
  yMm: number;
  anchoMm: number | "auto";
  altoMm: number | "auto";
  // ... otras propiedades
}
```

---

## 4. Estrategia de Verificación (Pruebas)

### 4.1. Pruebas Unitarias
Crear pruebas en `client/src/__tests__/DimensionsAuto.test.tsx` para verificar:
1. La renderización correcta de inputs desactivados con `"-"` al activar el modo automático.
2. Que cambiar el layout de un contenedor a uno incompatible restaure las dimensiones numéricas por defecto.

### 4.2. Pruebas Manuales (Checklist)
1. Crear una capa de texto, escribir contenido y pulsar "Auto Width". Comprobar que el ancho se ajusta automáticamente al contenido del texto.
2. Crear un contenedor lineal vertical, llenarlo de elementos hijos, y activar "Auto Height". Comprobar que el alto del contenedor crece al añadir o agrandar elementos hijos.
3. Comprobar que en un contenedor "Libre" (FrameLayout) las opciones de dimensiones automáticas están deshabilitadas o no permitidas.
