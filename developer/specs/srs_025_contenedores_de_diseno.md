# Especificación Técnica - SRS-025: Contenedores de Diseño con Layouts Lineales y Libres

## 1. Introducción y Objetivos
- **Propósito**: Introducir un nuevo tipo de capa llamado "Contenedor" (`tipo: "container"`) que actúe como un elemento agrupador. Esto permitirá estructurar la jerarquía de las cartas en un árbol de capas anidadas, facilitando la duplicación de bloques de diseño complejos y repetitivos, así como la alineación automática.
- **Objetivos de Diseño**:
  - **Uso de CSS Nativo (Flexbox/Absolute)**: Evitar recálculos matemáticos costosos en JavaScript. Aprovechar la potencia de CSS Flexbox y posicionamiento absoluto para lograr un comportamiento óptimo y fluido tanto en el editor como en la exportación PDF (Puppeteer).
  - **Simplificación Arquitectónica**: Dado que el proyecto se encuentra en fase de desarrollo activo pre-producción, se priorizará un diseño directo y limpio del árbol de componentes, omitiendo parches complejos de retrocompatibilidad y aplicando valores predeterminados seguros para todas las capas.
  - **Fidelidad Estética**: Los contenedores soportarán bordes, esquinas redondeadas y colores de fondo (implementados en SRS-024).

---

## 2. Requisitos Funcionales y Casos de Uso

### RF-1: Estructura y Modelo de Datos
- **RF-1.1**: Se añade un nuevo tipo de capa: `tipo: "container"`.
- **RF-1.2**: Se introduce la propiedad opcional `parentCapaId: string | null` en todas las capas. Si es `null` o no está definida, la capa se sitúa directamente en la raíz de la carta.
- **RF-1.3**: Las capas de tipo `"container"` poseen una propiedad de comportamiento llamada `layout`, que toma uno de los siguientes valores:
  - `"none"` (Ninguno / Estilo FrameLayout): Los elementos hijos se posicionan de manera absoluta según sus propiedades `xMm` e `yMm` relativas a la esquina superior izquierda del contenedor.
  - `"vertical"` (Lineal Vertical / Estilo LinearLayout): Los elementos hijos se apilan verticalmente de forma secuencial. La coordenada `yMm` de cada hijo se ignora y se calcula de forma automática basándose en el alto y espaciado de los elementos precedentes.
  - `"horizontal"` (Lineal Horizontal / Estilo LinearLayout): Los elementos hijos se posicionan horizontalmente en fila. La coordenada `xMm` de cada hijo se ignora y se calcula automáticamente.

### RF-2: Explorador de Capas (Jerarquía de Árbol)
- **RF-2.1**: El explorador de capas (panel izquierdo del editor) debe transformarse de una lista plana a una **estructura de árbol jerárquico**.
- **RF-2.2**: Los contenedores pueden expandirse o colapsarse en el árbol.
- **RF-2.3**: Se habilitará arrastrar y soltar (Drag and Drop) en el explorador para:
  - Mover elementos dentro de un contenedor (cambiar su `parentCapaId`).
  - Extraer elementos de un contenedor hacia la raíz (`parentCapaId: null`).
  - Reordenar la secuencia de los elementos hijos.

### RF-3: Renderizado y Comportamiento del Lienzo (Canvas)
- **RF-3.1**: En el lienzo (frontend) y en Puppeteer (backend), el DOM reflejará de forma real la estructura de árbol: los elementos hijos se renderizarán como nodos de React/HTML anidados dentro del elemento contenedor principal.
- **RF-3.2**: Al mover o redimensionar un contenedor, todos sus elementos hijos se moverán con él automáticamente de forma nativa debido al anidamiento en el DOM.
- **RF-3.3**: Aplicación de Flexbox:
  - Si el contenedor tiene `layout === "vertical"`, el elemento HTML del contenedor aplicará `display: flex; flex-direction: column;`.
  - Si `layout === "horizontal"`, aplicará `display: flex; flex-direction: row;`.
  - Si `layout === "none"`, aplicará `position: relative;` y los hijos aplicarán `position: absolute;`.

### RF-4: Ajuste de Dimensiones del Editor (UX)
- **RF-4.1**: Con el fin de acomodar el nuevo árbol jerárquico y los controles estéticos del inspector, se ampliará el ancho de las columnas laterales en `EditCardModal.css`:
  - La columna izquierda (Explorador) se incrementa de `260px` a `300px`.
  - La columna derecha (Inspector) se incrementa de `320px` a `360px`.
  - La columna central (Previsualización) ocupará el espacio restante (`1fr`), optimizando el lienzo y reduciendo el margen vacío excesivo.

---

## 3. Estrategia de Verificación y Plan de Pruebas

### 3.1. Pruebas Unitarias Automatizadas (Vitest)
Se implementarán pruebas en `client/src/utils/projectUtils.test.ts` u otros archivos de pruebas para asegurar:
- **Modelo de Contenedor**: Validar que se crea una capa de tipo `"container"` con valores de layout y parentesco válidos.
- **Jerarquía**: Validar que la asignación de `parentCapaId` es correcta y no produce bucles infinitos en la resolución de dependencias.
- **Resolución de Variables**: Comprobar que los textos dinámicos dentro de contenedores resuelven su valor de `valoresCampos` buscando directamente por su nombre de capa.

### 3.2. Pruebas Manuales / Criterios de Aceptación (Checklist)
- [ ] Validar visualmente en el editor que las columnas laterales del modal han crecido a `300px` y `360px` respectivamente, y que la carta previsualizada se sigue encuadrando bien.
- [ ] Crear un contenedor de tipo `"container"` en el editor.
- [ ] En la pestaña **Diseño**, cambiar el layout a *Lineal Vertical* e insertar dos textos hijos. Verificar que se posicionan de manera lineal uno debajo de otro automáticamente.
- [ ] Cambiar el layout a *Lineal Horizontal* y verificar que se posicionan horizontalmente.
- [ ] Arrastrar una capa de texto fuera del contenedor en la jerarquía izquierda y verificar que vuelve a su posición original.
- [ ] Exportar a PDF y comprobar que la disposición lineal vertical/horizontal y el posicionamiento libre dentro de contenedores se imprimen exactamente igual que en el lienzo de pantalla.

---

## 4. Estado de la Especificación
- **Estado**: 🟡 En Proceso de Revisión (Planificado para la sesión actual)
