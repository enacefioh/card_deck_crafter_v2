# SRS-071: Nuevos Tipos de Layout para Contenedores

## 1. Introducción y Objetivos
- **Propósito**: Ampliar las capacidades de maquetación y alineación automática de las capas de tipo contenedor (`container`) en Card Deck Crafter v2. Actualmente, los contenedores admiten tres modos: Libre (`none`), Lineal Vertical (`vertical`) y Lineal Horizontal (`horizontal`). Esta especificación incorpora cuatro nuevas variantes para permitir alineación centrada y flujo inverso de elementos hijos.
- **Nuevas Variantes de Layout**:
  1. **Lineal Vertical Centrado** (`vertical-center`): Los elementos se apilan de arriba a abajo pero centrados verticalmente dentro del contenedor (`justifyContent: "center"`).
  2. **Lineal Vertical Inverso** (`vertical-reverse`): Los elementos se apilan desde abajo hacia arriba (`flexDirection: "column-reverse"`).
  3. **Lineal Horizontal Centrado** (`horizontal-center`): Los elementos se disponen de izquierda a derecha pero centrados horizontalmente dentro del contenedor (`justifyContent: "center"`).
  4. **Lineal Horizontal Inverso** (`horizontal-reverse`): Los elementos se disponen de derecha a izquierda (`flexDirection: "row-reverse"`).

---

## 2. Requisitos Funcionales y Casos de Uso

### RF-1: Extensión de la Propiedad `layout` en Contenedores
- En el modelo de capas de tipo `container`, el atributo `layout` admite ahora los siguientes valores:
  ```typescript
  type ContainerLayout = 
    | "none" 
    | "vertical" 
    | "vertical-center" 
    | "vertical-reverse" 
    | "horizontal" 
    | "horizontal-center" 
    | "horizontal-reverse";
  ```

### RF-2: Selector de Tipo de Layout en el Inspector (`EditCardModal.tsx`)
- Al seleccionar una capa de tipo contenedor en el inspector, el desplegable `<select>` de "Tipo de Layout" ofrece las 7 opciones con etiquetas claras:
  - `Libre (FrameLayout)` (`none`)
  - `Lineal Vertical` (`vertical`)
  - `Lineal Vertical Centrado` (`vertical-center`)
  - `Lineal Vertical Inverso (Abajo a Arriba)` (`vertical-reverse`)
  - `Lineal Horizontal` (`horizontal`)
  - `Lineal Horizontal Centrado` (`horizontal-center`)
  - `Lineal Horizontal Inverso (Derecha a Izquierda)` (`horizontal-reverse`)

### RF-3: Renderizado CSS Flexbox en Lienzo y Vistas
- En todos los puntos de renderizado (`EditCardModal.tsx`, `App.tsx`, `TemplatePreviewModal.tsx`, `thumbnailUtils.ts`):
  - **Detección de flujo vertical**: `vertical`, `vertical-center`, `vertical-reverse`.
  - **Detección de flujo horizontal**: `horizontal`, `horizontal-center`, `horizontal-reverse`.
  - **Estilos Flex generados**:
    - `vertical`: `display: flex; flexDirection: "column";`
    - `vertical-center`: `display: flex; flexDirection: "column"; justifyContent: "center";`
    - `vertical-reverse`: `display: flex; flexDirection: "column-reverse";`
    - `horizontal`: `display: flex; flexDirection: "row";`
    - `horizontal-center`: `display: flex; flexDirection: "row"; justifyContent: "center";`
    - `horizontal-reverse`: `display: flex; flexDirection: "row-reverse";`
- **Soporte de Dimensiones Automáticas (`auto`)**:
  - `canAutoHeight`: Aplica para contenedores con cualquier layout vertical (`vertical`, `vertical-center`, `vertical-reverse`).
  - `canAutoWidth`: Aplica para contenedores con cualquier layout horizontal (`horizontal`, `horizontal-center`, `horizontal-reverse`).

---

## 3. Estrategia de Verificación (Pruebas)

### 3.1. Pruebas Unitarias Automatizadas (`client/src/SRS071LayoutContenedores.test.tsx`)
1. **Cálculo de Estilos Flex**: Verificar que `getContainerFlexStyle` devuelve la dirección y justificación correctas para las 4 nuevas variantes.
2. **Identificación de Tipo de Flujo**: Verificar que las funciones de utilidad clasifican correctamente `vertical-center` y `vertical-reverse` como vertical, y `horizontal-center` y `horizontal-reverse` como horizontal.
3. **Renderizado en DOM**: Verificar que un contenedor con `vertical-center` renderiza con `justify-content: center` y sus elementos hijos se posicionan acorde.

### 3.2. Checklist de Verificación Manual
- [ ] Crear un contenedor y añadir 2-3 capas hijas (texto o formas).
- [ ] Cambiar a `Lineal Vertical Centrado` y comprobar que las capas quedan centradas verticalmente.
- [ ] Cambiar a `Lineal Vertical Inverso` y comprobar que la primera capa queda abajo y la última arriba.
- [ ] Cambiar a `Lineal Horizontal Centrado` y comprobar el centrado horizontal.
- [ ] Cambiar a `Lineal Horizontal Inverso` y comprobar el orden inverso de derecha a izquierda.
