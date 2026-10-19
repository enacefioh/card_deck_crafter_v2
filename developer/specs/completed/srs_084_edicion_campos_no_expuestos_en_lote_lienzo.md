# SRS-084: Visualización y Edición Excepcional de Campos No Expuestos en el Inspector del Lienzo Principal

- **ID del Requisito**: SRS-084
- **Título**: Visualización y Edición Excepcional de Campos No Expuestos en el Inspector del Lienzo Principal
- **Estado**: 📝 Borrador / En Revisión
- **Fecha**: 2026-10-20
- **Autor**: Antigravity & Usuario (CDC2 Team)

---

## 1. Introducción y Objetivos

### 1.1. Propósito
Permitir a los usuarios y maquetadores visualizar y modificar de manera excepcional y simultánea propiedades de capas que **no fueron marcadas como expuestas** en la plantilla original cuando tienen una o más cartas seleccionadas en el lienzo principal ([App.tsx](file:///c:/Users/victo/proyectos/cdc2/client/src/App.tsx)).

### 1.2. Problema que Resuelve
En flujos de trabajo con barajas extensas (p.ej. 50 o 100 cartas creadas a partir de una plantilla), si el maquetador olvidó exponer una propiedad puntual (como el tamaño de fuente `fontSizePt`, la tipografía `fontFamily`, el color de texto `color`, contornos, márgenes o rotación) y ahora necesita reajustar ese valor en lote para todas las cartas seleccionadas, el sistema actual obliga a entrar al editor de cartas una a una o modificar la plantilla base de manera manual.

Con este requisito:
1. Se añade un selector/interruptor en la cabecera del panel lateral derecho (*"Campos Editables"*): **"Mostrar todos los campos"** (`showAllFields`).
2. Al activarse, el sistema inspecciona no solo las `exposedProperties` de la plantilla, sino el **árbol completo de propiedades modificables de cada capa** (texto, imagen, fondo, bordes, dimensiones, geometría, etc.).
3. Se detectan los campos coincidentes entre todas las cartas seleccionadas y se ofrecen para edición en lote instantánea con persistencia en `capasOverrides`.

---

## 2. Requisitos Funcionales y Casos de Uso

```mermaid
flowchart TD
    A["Usuario selecciona 1 o más cartas en el lienzo principal"] --> B["Inspector Lateral Derecho (Campos Editables)"]
    B --> C{"Check: Mostrar todos los campos"}
    C -->|Desactivado (Defecto)| D["Muestra únicamente exposedProperties coincidentes"]
    C -->|Activado| E["Inspecciona catálogo completo de propiedades modificables de cada capa"]
    E --> F["Calcula coincidencia de capas entre cartas seleccionadas"]
    F --> G["Renderiza controles para todas las propiedades comunes (font, size, color, etc.)"]
    G --> H["Usuario modifica valor: Se propaga a capasOverrides de todas las cartas seleccionadas"]
```

### RF-1: Interruptor "Mostrar todos los campos" en la Cabecera del Inspector
- **RF-1.1**: En la cabecera de la barra lateral derecha (`.sidebar-right .sidebar-header`), se añade un control de alternancia (checkbox o switch compacto) con la etiqueta:
  `"Mostrar todos los campos"` (o `"Ver todos los campos"`).
- **RF-1.2**: El estado por defecto es `false` (manteniendo el comportamiento limpio habitual enfocado en solo los campos expuestos).
- **RF-1.3**: Su activación persiste durante la sesión en el estado local de React (`showAllFields`).

### RF-2: Catálogo Universal de Propiedades Modificables por Tipo de Capa
Cuando `showAllFields` está activo, para cada capa de la plantilla base se generan entradas para todas las propiedades editables compatibles con su tipo:
- **Capa de Texto (`text`)**:
  - `contenidoRaw` (Contenido Texto)
  - `fontSizePt` (Tamaño Fuente)
  - `fontFamily` (Tipografía)
  - `color` (Color de Texto)
  - `alineacion` (Alineación Texto: left, center, right, justify)
  - `bold` (Negrita: true/false)
  - `italic` (Cursiva: true/false)
  - `underline` (Subrayado: true/false)
  - `textOutlineWidth` (Grosor Contorno)
  - `textOutlineColor` (Color Contorno)
  - `xMm`, `yMm`, `anchoMm`, `altoMm` (Posición y Dimensiones)
  - `paddingTopMm` (Padding Texto General)
  - `visibility` (Visibilidad de Capa)
  - `borderTopWidth` (Grosor Borde)
  - `borderTopColor` (Color Borde)
  - `borderTopLeftRadius` (Radio Esquinas)
  - `backgroundColor` (Color de Fondo de la Capa)
  - `rotacion` (Rotación en Grados)
- **Capa de Imagen / Switch (`image` / `image-switch`)**:
  - `src` (Recurso de Imagen)
  - `modoAjuste` (Ajuste: cover, contain, stretch)
  - `xMm`, `yMm`, `anchoMm`, `altoMm`
  - `visibility`
  - `borderTopWidth`, `borderTopColor`, `borderTopLeftRadius`, `backgroundColor`, `rotacion`
- **Capa de Fondo (`background`)**:
  - `colorFill` (Color de Relleno)
  - `visibility`
- **Capa de Contenedor (`container`)**:
  - `layout` (Tipo de Layout)
  - `xMm`, `yMm`, `anchoMm`, `altoMm`, `visibility`, bordes, esquinas, fondo y rotación.
- **Capa de Bloque (`block`)**:
  - `xMm`, `yMm`, `anchoMm`, `altoMm`, bordes, esquinas, color de fondo, visibilidad y rotación.

### RF-3: Resolución de Coincidencia Multicarta
- **RF-3.1**: Si hay múltiples cartas seleccionadas, una propiedad de una capa solo se muestra si **todas las cartas seleccionadas comparten esa misma capa** (por nombre, tipo y ruta jerárquica en sus plantillas).
- **RF-3.2**: La etiqueta indicará de forma clara la procedencia del campo, por ejemplo:
  `[Nombre Capa] > [Nombre Propiedad]` (ej. `"Nombre_Monstruo > Tamaño Fuente"`).
- **RF-3.3**: Si la propiedad ya estaba formalmente expuesta en la plantilla, conservará su etiqueta personalizada y directriz para IA; si no estaba expuesta, se genera una etiqueta amigable automática.

### RF-4: Soporte Completo de Controles de Entrada
- **RF-4.1 (Fuentes)**: Para `fontFamily`, se renderiza un `<select>` que incluye las fuentes del sistema y las fuentes importadas del proyecto (`projectFonts`).
- **RF-4.2 (Colores)**: Para `color`, `colorFill`, `borderTopColor`, etc., se renderiza selector de color + paleta del proyecto (`projectColors`) + hex input.
- **RF-4.3 (Estilos y Alineación)**: Botoneras compactas para estilos (`B`, `I`, `U`) y alineaciones (`left`, `center`, `right`, `justify`).
- **RF-4.4 (Valores Múltiples)**: Si las cartas seleccionadas tienen valores dispares para una propiedad, se muestra `<Valores múltiples>`, permitiendo sobrescribirlos todos en lote al introducir un nuevo valor.

---

## 3. Arquitectura y Diseño de Datos

### 3.1. Algoritmo de Extracción de Propiedades
```typescript
interface CampoEditableUniversal {
  ruta: string;
  property: string;
  label: string;
  description?: string;
  tipoCapa: string;
  multiline?: boolean;
  options?: any[];
  mapaCartaCapaId: Record<string, string>;
  isExposed: boolean; // true si viene de exposedProperties, false si es excepcional
}
```

Al calcular `camposCoincidentes`:
1. Si `showAllFields === false`, se procesan únicamente las `exposedProperties` de la plantilla (comportamiento actual).
2. Si `showAllFields === true`, se itera sobre todas las capas de `baseCapas` y para cada una se generan todas sus propiedades soportadas. Se fusionan con las `exposedProperties` existentes para preservar etiquetas personalizadas.

---

## 4. Plan de Pruebas y Criterios de Aceptación

### 4.1. Pruebas Unitarias Automatizadas
- Test de renderizado del checkbox `"Mostrar todos los campos"` en la barra lateral derecha.
- Test de visualización de campos no expuestos (ej. `fontSizePt`, `fontFamily`, `color`) al marcar la casilla.
- Test de edición en lote multicarta: seleccionar 2 cartas, modificar un campo no expuesto y verificar que ambas reciben el override correspondiente en `capasOverrides`.

### 4.2. Pruebas Manuales
- [ ] Seleccionar una carta: verificar que por defecto solo se ven los campos expuestos de su plantilla.
- [ ] Activar `"Mostrar todos los campos"`: comprobar que se despliega el listado completo de propiedades de cada capa (tamaño fuente, tipografía, color, dimensiones, etc.).
- [ ] Seleccionar 5 cartas de la misma plantilla: cambiar el tamaño de fuente de un texto no expuesto. Comprobar en el lienzo que las 5 cartas actualizan su tamaño instantáneamente.
- [ ] Desactivar la casilla: el inspector vuelve a mostrar únicamente los campos expuestos.
