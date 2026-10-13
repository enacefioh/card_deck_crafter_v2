# SRS-080: Densidad Visual y Rediseño Ultracompacto del Inspector de Propiedades Estilo Unity

- **ID del Requisito**: SRS-080
- **Título**: Densidad Visual y Rediseño Ultracompacto del Inspector de Propiedades Estilo Unity
- **Estado**: ✅ Completado
- **Fecha**: 2026-10-13
- **Autor**: Antigravity & Usuario (CDC2 Team)

---

## 1. Introducción y Objetivos

### 1.1. Propósito
Optimizar la ergonomía, usabilidad y densidad de información del panel lateral derecho de la vista principal ("Campos Editables" / Inspector de Propiedades Expuestas). Actualmente, la interfaz presenta márgenes, paddings, gaps, alturas de inputs y tamaños tipográficos desproporcionados para un entorno de diseño profesional, lo que obliga al usuario a realizar un desplazamiento vertical (scroll) excesivo para visualizar o editar unos pocos atributos de una carta.

Este rediseño transforma el inspector en una herramienta de alta densidad de información inspirada directamente en el **Inspector de Unity** y paneles de propiedades de software técnico profesional (como Blender o Figma), donde decenas de propiedades quedan visibles y accesibles en un único golpe de vista sin navegación vertical innecesaria.

### 1.2. Objetivos de Diseño
1. **Alta Densidad de Información**: Reducir drásticamente los espacios en blanco improductivos para maximizar los campos visibles simultáneamente en pantalla.
2. **Compactación Paramétrica y Modular**: Diseñar mediante tokens o variables CSS dedicadas (`--inspector-*`) para facilitar iteraciones visuales ágiles y ajustes finos según el criterio estético del usuario.
3. **Escalabilidad Jerárquica**: Disminuir la sangría de los elementos anidados (contenedores, listas y bloques) para que las capas profundamente jerarquizadas no estrangulen el espacio horizontal disponible para los valores.
4. **Conservación Funcional**: Mantener al 100% todas las capacidades interactivas existentes (sincronización con el lienzo al hacer hover, helpers de símbolos, selectores de colores, galería de imágenes, listas de subplantillas y soporte multidocumento/reverso).

---

## 2. Requisitos Funcionales y Casos de Uso

### RF-1: Reducción del Margen y Padding del Contenedor del Panel
- **RF-1.1**: La cabecera superior del inspector (`.sidebar-header`) debe reducir su padding de los actuales `24px` a un rango compacto de `8px 12px`.
  - El título principal `h1` reduce su tamaño de `22px` a `13px - 14px`, con margen inferior mínimo (`2px`).
  - El texto explicativo secundario `p` reduce su tamaño de `13px` a `11px`, o se oculta/simplifica si la carta está seleccionada para priorizar espacio.
- **RF-1.2**: El cuerpo desplazable (`.sidebar-content`) debe reducir su padding interno general de `24px` a `6px 10px`.
- **RF-1.3**: Las pestañas de modo "Delantera / Trasera" (`.inspector-tabs-container` y `.inspector-tab-button`) reducen su padding de `10px` a `5px 8px` y el tamaño de fuente de `13px` a `11px`.
- **RF-1.4 (Ampliación de Ancho en un 10%)**: Aumentar el ancho del panel lateral derecho (`.sidebar-right`) en un **10%** (de `22vw` a `24.5vw`, `min-width` de `320px` a `352px`, `max-width` de `640px` a `704px`) para dotar de mayor holgura horizontal a las etiquetas descriptivas y evitar truncados innecesarios.

### RF-2: Eliminación de Gaps y Márgenes Verticales Innecesarios
- **RF-2.1**: Eliminar el espaciado global `gap: 24px` en `.sidebar-content` y el `gap: 12px` en el contenedor de items renderizables, sustituyéndolos por un flujo continuo con separación vertical mínima (`0px` a `2px` entre filas consecutivas).
- **RF-2.2**: Cada fila estándar del inspector (`.inspector-row`) tendrá un padding vertical ultracompacto de `1px 0` a `2px 0` y un margen inferior de `0px` o `1px`, con una línea divisoria semitransparente sutil (`border-bottom: 1px solid rgba(255, 255, 255, 0.04)`).
- **RF-2.3**: Las cabeceras colapsables de contenedores (`.inspector-foldout-header`) deben reducir su margen superior de `14px` a `6px`, su margen inferior de `8px` a `2px`, y su padding interno a `3px 6px`.

### RF-3: Tipografía Compacta Estilo Unity / Entorno Profesional
- **RF-3.1**: Las etiquetas de propiedades (`.inspector-label-col`) tendrán un tamaño de fuente de `11px` (frente a los actuales `13px`), con estilo limpio, `font-weight: 500` a `600`, y truncado elíptico en `38% - 42%` del ancho disponible.
- **RF-3.2**: Los textos dentro de los inputs, selectores y valores numéricos tendrán un tamaño de fuente de `11px` (o `10.5px` en campos secundarios), asegurando legibilidad inmediata sin ocupar altura excesiva.
- **RF-3.3**: El indicador de valores múltiples (`<Valores múltiples>`) o placeholders se adaptará a `10.5px` en cursiva.

### RF-4: Dimensionado Compacto de Elementos de Formulario (Inputs, Selects, Buttons)
- **RF-4.1 (Inputs y Selects)**: La altura estándar de todos los campos de texto, números y menús desplegables (`.inspector-input`, `select.inspector-input`) se reducirá de los actuales `26px - 32px` a **`20px - 22px`**.
- **RF-4.2 (Selector de Color)**: El control `<input type="color">` pasará de `24px × 24px` a un tamaño de **`18px × 18px`** o **`20px × 20px`**, integrado en la misma línea que el selector de paleta o código hexadecimal.
- **RF-4.3 (Botones de Acción Compactos)**: Los botones rápidos de edición (ej. "🖼️ Galería", "📤 Subir", "🖱️ Mover en Lienzo", "Insertar Símbolo") tendrán una altura uniforme de `20px - 22px`, padding de `2px 6px` y fuente de `10px - 11px`.
- **RF-4.4 (Textareas Multilínea)**: El campo de texto enriquecido / multilínea (`.inspector-textarea`) reducirá su altura mínima de inicio de `40px - 45px` a `32px - 36px`, con padding de `4px 6px` y tamaño de letra `11px`, conservando la capacidad de redimensionamiento vertical manual.

### RF-5: Optimización de Sangrías y Tabulaciones Jerárquicas
- **RF-5.1**: La sangría aplicada a capas o contenedores anidados (`paddingLeft`) se reducirá drásticamente:
  - De la fórmula actual: `nestingLevel * 12px` (que consumía de 36px a 60px en niveles 3-5).
  - A una fórmula compacta: **`nestingLevel * 6px`** (o configurable entre `5px` y `8px`), garantizando que la estructura en árbol sea visible sin desplazar los inputs fuera del rango cómodo de lectura.
- **RF-5.2**: Las cabeceras de foldout aplicarán la misma sangría proporcional reducida `(nestingLevel - 1) * 6px`.

### RF-6: Compactación de Secciones de Listas y Subplantillas
- **RF-6.1**: El contenedor de elementos de lista (`.inspector-list-container`) reducirá su padding de `10px` a `6px 8px` y su gap de `10px` a `4px`.
- **RF-6.2**: Las tarjetas de cada item de la lista y la botonera de plantillas hijas reducirán sus paddings y bordes para integrarse armoniosamente en el inspector denso.

### RF-7: Estado Inicial Colapsado de Foldouts y Persistencia de Selección
- **RF-7.1 (Colapso por Defecto Inicial)**: Al abrirse la vista o seleccionarse cartas por primera vez, todos los contenedores y foldouts jerárquicos (`inspector-foldout-header`) deben inicializarse en estado colapsado (`isCollapsed: true`). Los campos situados directamente en la raíz de la carta permanecen visibles, pero los grupos/contenedores deben mostrarse recogidos con su flecha orientada a la derecha (`▶`).
- **RF-7.2 (Persistencia al Intercalar Selección de Cartas)**: El estado de apertura/cierre de cada sección colapsable debe persistir en la memoria de la sesión mientras el usuario selecciona o alterna entre distintas cartas del proyecto, evitando que los grupos abiertos se vuelvan a cerrar automáticamente al cambiar de carta seleccionada.

### RF-8: Límite de Truncado de Etiquetas Ampliado a 18 Caracteres
- **RF-8.1**: Aprovechando el 10% adicional de ancho incorporado en `.sidebar-right`, el límite de truncado para las etiquetas descriptivas de los campos pasa de 13/15 caracteres a **18 caracteres** antes de aplicar puntos suspensivos (`...`), permitiendo que títulos como `"Fuerza Ataque"` o `"Tipo Criatura"` se lean completos.
- **RF-8.2**: Se conserva el tooltip nativo (`title={displayLabel}`) en el elemento `<label>` para garantizar que cualquier etiqueta más larga pueda consultarse íntegramente al posar el cursor sobre ella.

### RF-9: Sincronización del Foco Activo con Resaltado en el Lienzo (Highlight on Focus)
- **RF-9.1**: Cuando cualquier campo del formulario en el inspector (input de texto, número, textarea, selector de color, menú desplegable o botón de edición) recibe el foco del teclado o del cursor (`onFocus`), el elemento correspondiente en el lienzo de la carta (tanto en la vista frontal como en la trasera) debe resaltarse visualmente con el mismo marco distintivo punteado (`2px dashed var(--accent-primary)`) y elevación de capa (`zIndex: 9`) que cuando se pasa el ratón por encima (`hoveredCapaId`).
- **RF-9.2**: Al perder el foco (`onBlur`), el resaltado activo debe retirarse a menos que el cursor del ratón permanezca sobre la fila en hover.

---

## 3. Arquitectura y Diseño de Estilos

### 3.1. Tokens CSS Centralizados (`client/src/App.css`)
Para permitir la iteración visual rápida y ajustes inmediatos según las preferencias del usuario durante las pruebas en vivo, se definen variables CSS específicas en el contexto del inspector:

```css
:root {
  /* Tokens de Densidad del Inspector Unity (SRS-080) */
  --inspector-header-padding: 8px 12px;
  --inspector-content-padding: 6px 10px;
  --inspector-row-height: 22px;
  --inspector-row-gap: 1px;
  --inspector-font-size-label: 11px;
  --inspector-font-size-input: 11px;
  --inspector-font-size-header: 11px;
  --inspector-indent-step: 6px;
  --inspector-input-padding: 1px 6px;
  --inspector-input-border-radius: 3px;
}
```

### 3.2. Clases Modificadas en `App.css`
- `.sidebar-right`: Mantiene dimensiones y scroll, pero ajusta el flujo de elementos hijos.
- `.sidebar-header`: Estilos compactados de cabecera.
- `.sidebar-content`: Eliminación de gap y reducción de padding.
- `.inspector-row`: Reducción de márgenes, font-size y padding vertical.
- `.inspector-label-col`: Ajuste de font-size, truncado y alineación vertical.
- `.inspector-value-col`: Ajuste para encajar controles de 20-22px.
- `.inspector-input`, `select.inspector-input`: Altura `20px - 22px`, padding compacto.
- `.inspector-foldout-header`: Separación mínima y tamaño técnico.
- `.inspector-list-container`: Densidad optimizada para listas y colecciones.

### 3.3. Modificaciones en `client/src/App.tsx`
- Sustitución de estilos inline rígidos (`gap: "24px"`, `height: "26px"`, `padding: "24px"`, `indentStyle: nestingLevel * 12`) por los tokens y clases compactas de la especificación.

---

## 4. Comparativa de Densidad Visual

| Parámetro / Componente | Estado Actual | Nuevo Diseño Estilo Unity (SRS-080) | Reducción / Ganancia |
| :--- | :--- | :--- | :--- |
| **Padding Cabecera (`sidebar-header`)** | `24px` | `8px 12px` | **-60%** altura cabecera |
| **Título Cabecera (`h1`)** | `22px` con margen `6px` | `13px` con margen `2px` | **-40%** tamaño |
| **Padding Contenido (`sidebar-content`)** | `24px` | `6px 10px` | **-65%** espacio blanco |
| **Separación entre bloques (`gap`)** | `24px` + `12px` | `0px - 2px` | **Eliminación total de vacíos** |
| **Altura de Fila / Inputs** | `26px - 32px` | `20px - 22px` | **-30%** altura por campo |
| **Tamaño de Letra Etiquetas** | `13px` | `11px` | Tipografía técnica compacta |
| **Tamaño de Letra Inputs** | `12px` | `11px` (o `10.5px`) | Ajuste proporcional |
| **Sangría por nivel anidado** | `12px` por nivel | `6px` por nivel | **-50%** de compresión horizontal |
| **Altura inicial Textarea** | `45px` (min `40px`) | `34px` (min `30px`) | Mayor visión inicial |
| **Campos visibles sin scroll (aprox.)** | 6 a 8 campos | **15 a 22 campos** | **+150% más campos a la vista** |
| **Truncado de etiquetas** | 13/15 caracteres | **18 caracteres** | +38% longitud visible |
| **Estado inicial de secciones** | Expandidas por defecto | **Colapsadas por defecto** | Vista limpia y concisa |
| **Resaltado en lienzo** | Solo al hacer hover con ratón | **Hover + Foco activo (`onFocus`)** | Sincronización bidireccional |

---

## 5. Estrategia de Verificación y Pruebas

### 5.1. Pruebas Unitarias Automatizadas (`SRS080InspectorCompactoUnity.test.tsx`)
1. **Verificación de clases y tokens**:
   - Comprobar que `.sidebar-right` y `.sidebar-content` aplican los estilos compactos.
2. **Dimensionado de controles**:
   - Verificar que los inputs, selects y color pickers renderizados en el inspector tienen las alturas y estilos compactos correspondientes.
3. **Sangría jerárquica**:
   - Comprobar que una capa hija en nivel 2 o 3 recibe sangría calculada con el nuevo multiplicador compacto (`6px`).
4. **Conservación de interactividad**:
   - Verificar que cambiar el valor de un input compacto actualiza correctamente el estado de las cartas seleccionadas y marca `isDirty`.
   - Verificar que los foldouts se inicializan colapsados (`isCollapsed: true`) y al hacer clic se expanden y mantienen su estado.
5. **Truncado de etiquetas a 18 caracteres**:
   - Verificar que etiquetas con hasta 18 caracteres no se truncan, y las superiores a 18 se recortan con elipsis (`substring(0, 18) + "..."`).
6. **Resaltado por foco en el lienzo**:
   - Verificar que al enfocar un campo del inspector (`fireEvent.focus`), la capa correspondiente en la carta activa el resaltado visual (`outline: 2px dashed ...`), y al desenfocar (`fireEvent.blur`) vuelve al estado base.

### 5.2. Checklist de Pruebas Manuales e Inspección Visual
- [ ] Seleccionar una carta con 10 o más propiedades expuestas y verificar que la gran mayoría quedan inmediatamente visibles en el panel derecho sin necesidad de hacer scroll.
- [ ] Comprobar que las secciones y grupos de contenedores aparecen colapsados al inicio.
- [ ] Desplegar una sección, seleccionar otra carta y verificar que la sección abierta se mantiene abierta.
- [ ] Comprobar que las etiquetas de hasta 18 caracteres no se recortan y que las más largas se cortan exactamente a 18 caracteres con "..." y mantienen su `title` completo.
- [ ] Hacer clic en un campo del formulario (o tabular hacia él con el teclado) y comprobar que el elemento correspondiente en la carta se resalta con el recuadro discontinuo exactamente igual que con el cursor del ratón.
- [ ] Probar la edición con teclado en los inputs numéricos y de texto comprobando que la altura de 20-22px resulta cómoda y funcional.
- [ ] Probar la selección de colores y miniaturas de switch en su formato compacto.
- [ ] Crear una plantilla estructurada con contenedores anidados (3 niveles) y verificar que los campos del último nivel mantienen suficiente espacio para escribir valores sin desbordarse.
