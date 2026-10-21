# SRS-085: Configuración de Interlineado en Capas de Texto (Line Height)

- **ID del Requisito**: SRS-085
- **Título**: Configuración de Interlineado en Capas de Texto (Line Height)
- **Estado**: ✅ Completada
- **Fecha**: 2026-10-21
- **Autor**: Antigravity & Usuario (CDC2 Team)

---

## 1. Introducción y Objetivos

### 1.1. Propósito
Dotar a las capas de texto de plantillas y cartas de la capacidad de configurar la altura de línea o interlineado (`lineHeight`).

### 1.2. Problema que Resuelve
En la actualidad, el espaciado interlineal de todas las capas de texto del sistema se encuentra rígidamente fijado en `line-height: 1.2`. Sin embargo:
1. **Disparidad de métricas tipográficas**: Diversas tipografías (tanto del sistema como fuentes personalizadas TTF/OTF/WOFF cargadas en el proyecto) poseen cajas de diseño tipográfico (*em-square* y métricas de *ascent/descent*) desproporcionadas, lo que resulta en separaciones verticales excesivas o irregulares entre líneas de texto.
2. **Necesidades de maquetación densa**: En cartas coleccionables y juegos de mesa con descripciones o cajas de reglas extensas, los maquetadores necesitan ajustar el interlineado (por ejemplo, a `1.0`, `1.05` o `1.15`) para condensar el texto dentro del contenedor sin reducir excesivamente el tamaño de fuente, o ampliarlo (por ejemplo, a `1.35` o `1.5`) para textos con diseño estilizado o títulos espaciados.
3. **Control modular de exposición**: Por defecto, esta propiedad técnica no debe saturar la interfaz de edición simplificada de cartas, pero debe poder marcarse como expuesta con un solo clic para exponerse en el lienzo principal, o bien editarse en lote mediante la funcionalidad de campos no expuestos (SRS-084).

---

## 2. Requisitos Funcionales y Casos de Uso

```mermaid
flowchart TD
    A["Capa de Texto (Plantilla o Carta)"] --> B["Inspector de Capas (Texto y Tipografía)"]
    B --> C["Control 'Interlineado' (Step: 0.05, Defecto: 1.2)"]
    C --> D{"¿Marcado con icono de ojo?"}
    D -->|No (Defecto)| E["Permanece como propiedad de diseño base de la plantilla"]
    D -->|Sí| F["Se añade a exposedProperties ('Interlineado')"]
    E --> G["Accesible en lienzo principal si se activa 'Mostrar todos los campos' (SRS-084)"]
    F --> H["Visible en inspector de cartas del lienzo para edición directa / en lote"]
    C --> I["Motores de Renderizado (Lienzo, Modales, Miniaturas y PDF)"]
    I --> J["CSS line-height: resolvedCapa.lineHeight || 1.2"]
```

### RF-1: Definición del Modelo de Interlineado (`lineHeight`)
- **RF-1.1**: Se introduce la propiedad opcional `lineHeight?: number` en el modelo de capas de tipo `text` y en el diccionario de sobreescrituras `capasOverrides[layerId].lineHeight`.
- **RF-1.2**: El valor se expresará como un multiplicador numérico relativo adimensional estándar de CSS (ej. `1.0`, `1.15`, `1.2`, `1.35`). Esto garantiza que el interlineado escale de forma proporcional y automática si se altera el tamaño de la fuente (`fontSizePt`).
- **RF-1.3**: **Compatibilidad hacia atrás**: Si una capa o carta no define `lineHeight`, el sistema resolverá de forma transparente el valor por defecto histórico de `1.2`. Ningún diseño ni carta existente sufrirá alteraciones.
- **RF-1.4**: Rango permitido y validado en interfaz: mínimo `0.5`, máximo `3.0`, con incrementos de `0.05` en los selectores numéricos para permitir microajustes tipográficos.

### RF-2: Control de Interlineado en el Inspector de Capas ([EditCardModal.tsx](file:///c:/Users/victo/proyectos/cdc2/client/src/EditCardModal.tsx))
- **RF-2.1**: En el modal de edición de cartas y plantillas, dentro del grupo tabular **"Texto y Tipografía"**, se añade una fila dedicada con la celda de **Interlineado**:
  - **Etiqueta**: `"Interlineado"` (con tooltip descriptivo *"Interlineado relativo del texto"*).
  - **Selector de exposición**: Icono interactivo de ojo (`renderExposedEye("lineHeight", "Interlineado")`).
  - **Input numérico**: `<input type="number" step="0.05" min="0.5" max="3" className="inspector-input" ... />`, mostrando el valor activo (resuelto desde `capasOverrides` o capa base) con placeholder `"1.2"`.
- **RF-2.2**: La actualización del valor actualiza inmediatamente la previsualización del lienzo central del modal y persiste en el borrador de la plantilla o carta activa.

### RF-3: Soporte para Exposición de Propiedad (`exposedProperties`)
- **RF-3.1**: Por defecto, al crear una nueva capa de texto, `lineHeight` **no estará expuesta** (`exposed: false`), conservando una vista limpia y despejada para redactores no técnicos.
- **RF-3.2**: Al hacer clic sobre el icono de ojo junto a "Interlineado", se alternará su estado de exposición. Al activarse, se registrará en `plantilla.exposedProperties` con:
  - `property`: `"lineHeight"`
  - `label`: `"{NombreCapa} > Interlineado"` (o `"Interlineado"` en contextos específicos).
- **RF-3.3**: La lista de propiedades reconocidas por el catálogo (`AVAILABLE_PROPERTIES` en cliente y backend) incluirá formalmente `{ property: "lineHeight", label: "Interlineado" }`.

### RF-4: Edición en el Inspector del Lienzo Principal ([App.tsx](file:///c:/Users/victo/proyectos/cdc2/client/src/App.tsx))
- **RF-4.1**: Cuando una carta seleccionada tenga `lineHeight` expuesto en su plantilla, la barra lateral derecha (*"Campos Editables"*) renderizará un control numérico con paso `0.05` y placeholder `1.2`.
- **RF-4.2**: Si se seleccionan múltiples cartas con la propiedad `lineHeight` expuesta, la modificación del valor actualizará en lote el interlineado de todas las cartas seleccionadas.
- **RF-4.3**: Si la propiedad no está expuesta pero el usuario activa la casilla *"Mostrar todos los campos"* (SRS-084), el campo de `Interlineado` aparecerá disponible tanto para edición individual como para edición en lote.

### RF-5: Sincronización y Renderizado Consistente en Todos los Motores
El valor resuelto `lineHeight = (typeof resolvedCapa.lineHeight === "number" && resolvedCapa.lineHeight > 0) ? resolvedCapa.lineHeight : 1.2` debe aplicarse de forma idéntica en:
1. **Lienzo Principal (`App.tsx`)**: En las ranuras frontal (`paginaFrontal`) y trasera (`paginaTrasera`).
2. **Modal de Detalle (`DetailModal.tsx`)**: En la previsualización de anverso y reverso.
3. **Editor de Cartas (`EditCardModal.tsx`)**: En el lienzo interactivo del editor.
4. **Miniaturas y Generador de Catálogo (`thumbnailUtils.ts` y `TemplatePreviewModal.tsx`)**: En la generación de miniaturas locales y super-sampling.
5. **Exportación de Impresión y PDF (`server/src/index.ts`)**: En las plantillas HTML generadas para Puppeteer (`line-height: ${lineHeight};`).
6. **Motor de Renderizado API REST (`server/src/engine/cardRenderer.ts`)**: En las respuestas de renderizado server-side.
7. **Servicios de Archivador e IA (`projectArchiveService.ts` y `cardEngineService.ts`)**: Validación de `lineHeight` en proyectos empaquetados e instrucciones semánticas de IA.

---

## 3. Arquitectura y Diseño de Datos

### 3.1. Modelo TypeScript (`shared/layoutEngine.ts` y `client/src/types.ts`)
```typescript
export interface CapaTexto {
  id: string;
  tipo: "text";
  nombre: string;
  xMm: number;
  yMm: number;
  anchoMm: number;
  altoMm: number;
  contenidoRaw?: string;
  fontFamily?: string;
  fontSizePt?: number;
  lineHeight?: number; // Multiplicador relativo (ej. 1.2, 1.0, 1.35). Defecto: 1.2
  color?: string;
  alineacion?: "left" | "center" | "right" | "justify";
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  textOutlineWidth?: number;
  textOutlineColor?: string;
  // ... resto de propiedades
}

export interface CapaOverrides {
  // ...
  lineHeight?: number;
  // ...
}
```

### 3.2. Fórmula de Estilo CSS Aplicada
```css
line-height: var(--line-height, 1.2);
```
O en React inline styles:
```tsx
lineHeight: (typeof resolvedCapa.lineHeight === "number" && resolvedCapa.lineHeight > 0) 
  ? resolvedCapa.lineHeight 
  : 1.2
```

---

## 4. Estrategia de Verificación y Pruebas

### 4.1. Pruebas Unitarias Automatizadas (`SRS085InterlineadoTexto.test.tsx`)
1. **Valores por defecto**: Verificar que una capa de texto sin `lineHeight` especificado resuelve a `1.2`.
2. **Personalización de interlineado**: Comprobar que al configurar `lineHeight: 0.9` o `lineHeight: 1.5`, el estilo generado contiene exactamente dicho valor en la propiedad `lineHeight` / `line-height`.
3. **Persistencia en sobreescrituras**: Verificar que modificar el interlineado en una carta aplica `capasOverrides[layerId].lineHeight` sin alterar la plantilla base.
4. **Exposición de propiedad**: Comprobar que `lineHeight` puede agregarse y removerse de `exposedProperties` y se reconoce en el catálogo de propiedades expuestas.
5. **Edición en lote con SRS-084**: Comprobar que con *"Mostrar todos los campos"* activo, `lineHeight` aparece en la lista de campos comunes y permite actualización en lote.

### 4.2. Checklist de Pruebas Manuales
- [ ] Abrir el modal de edición de carta, seleccionar una capa de texto multilínea y verificar el nuevo campo "Interlineado".
- [ ] Cambiar el interlineado a `0.9` (observar que las líneas se compactan) y a `1.6` (observar que se separan).
- [ ] Marcar el icono de ojo en "Interlineado", guardar la carta y comprobar que en el lienzo principal el campo aparece en la barra derecha de "Campos Editables".
- [ ] Seleccionar varias cartas y modificar el interlineado en lote desde el lienzo principal.
- [ ] Exportar a PDF y verificar que el interlineado personalizado se reproduce fielmente en el documento generado.
