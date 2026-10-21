# SRS-086: Alineación Vertical en Capas de Texto (Vertical Alignment)

- **ID del Requisito**: SRS-086
- **Título**: Alineación Vertical en Capas de Texto (Vertical Alignment)
- **Estado**: ✅ Completada
- **Fecha**: 2026-10-21
- **Autor**: Antigravity & Usuario (CDC2 Team)

---

## 1. Introducción y Objetivos

### 1.1. Propósito
Dotar a las capas de texto de plantillas y cartas de la capacidad nativa de configurar su alineación vertical (`alineacionVertical`: superior, centro, inferior) directamente dentro de sus dimensiones asignadas, sin requerir envolver el elemento en un contenedor secundario.

### 1.2. Problema que Resuelve
1. **Proliferación y anidación innecesaria de contenedores**: Para alinear o centrar verticalmente un texto dentro de una región de la carta (por ejemplo, centrar verticalmente el título de una carta, o anclar un pie de página o texto de ambientación en la parte inferior de una caja), los diseñadores se ven forzados a crear una capa de tipo contenedor (`container`), introducir la capa de texto como hijo único y configurar su layout. Esto sobrecarga el árbol jerárquico de capas en el lienzo principal, confunde la navegación y añade complejidad innecesaria a la plantilla.
2. **Independencia de maquetación 2D para cajas de texto**: Las capas de texto cuentan con dimensiones de ancho y alto (`anchoMm`, `altoMm`). Sin embargo, históricamente el flujo interno de texto solo permitía alineación horizontal (`left`, `center`, `right`, `justify`), dejando el texto fijado siempre al borde superior de la caja (`top`). La adición de alineación vertical completa el control dimensional bidimensional del texto.
3. **Control granular y exposición opcional**: Al igual que con el interlineado o los estilos tipográficos, esta propiedad técnica debe permanecer con un valor por defecto transparente (`top`) y poder exponerse selectivamente mediante el icono del ojo para que redactores de contenido puedan ajustarla en el lienzo principal, o modificarla en lote con la herramienta de campos no expuestos (SRS-084).

---

## 2. Requisitos Funcionales y Casos de Uso

```mermaid
flowchart TD
    A["Capa de Texto (Plantilla o Carta)"] --> B["Inspector de Capas (Texto y Tipografía)"]
    B --> C["Control 'Alineación Vertical' (⬆️ Arriba / ↕️ Centro / ⬇️ Abajo)"]
    C --> D{"¿Marcado con icono de ojo?"}
    D -->|No (Defecto: top)| E["Propiedad interna de diseño de la plantilla"]
    D -->|Sí| F["Añadido a exposedProperties ('Alineación Vertical')"]
    E --> G["Accesible en lienzo principal vía 'Mostrar todos los campos' (SRS-084)"]
    F --> H["Editable directamente e individual / en lote en el inspector lateral"]
    C --> I["Motores de Renderizado (Lienzo, Modales, PDF y PNG)"]
    I --> J["CSS: display: flex; flex-direction: column; justify-content: flex-start | center | flex-end"]
```

### RF-1: Definición del Modelo de Datos (`alineacionVertical`)
- **RF-1.1**: Se añade la propiedad opcional `alineacionVertical?: "top" | "center" | "bottom"` en el modelo de capas de tipo `text` y en el objeto de sobreescrituras `Carta.capasOverrides[layerId].alineacionVertical` (así como `capasOverridesTrasera`).
- **RF-1.2**: **Compatibilidad hacia atrás garantizada**: Si una capa o carta existente no define `alineacionVertical` (o su valor es `undefined`), el sistema resolverá de forma automática el valor por defecto `"top"`. Los diseños de plantillas y cartas creados previamente no sufrirán ninguna variación visual.
- **RF-1.3**: Valores permitidos:
  - `"top"`: El texto se alinea en la parte superior de la caja (valor por defecto histórico).
  - `"center"`: El texto se centra verticalmente en el espacio disponible de la caja.
  - `"bottom"`: El texto se alinea en la parte inferior de la caja.

### RF-2: Control en el Inspector de Capas ([EditCardModal.tsx](file:///c:/Users/victo/proyectos/cdc2/client/src/EditCardModal.tsx))
- **RF-2.1**: En la sección tabular **"Texto y Tipografía"** del inspector lateral, se incorpora el selector de alineación vertical.
- **RF-2.2**: La interfaz presenta 3 botones tipo toggle/segmentado de tamaño compacto:
  - `⬆️`: Superior (`top`) con tooltip *"Alinear Arriba"*.
  - `↕️`: Centro (`center`) con tooltip *"Alinear al Centro Vertical"*.
  - `⬇️`: Inferior (`bottom`) con tooltip *"Alinear Abajo"*.
- **RF-2.3**: Se incluye el icono del ojo interactivo `renderExposedEye("alineacionVertical", "Alineación Vertical", true)` junto a la etiqueta para permitir exponer la propiedad.
- **RF-2.4**: Al interactuar con los botones, la vista previa del lienzo central del modal se actualiza de manera inmediata.

### RF-3: Soporte para Exposición de Propiedad (`exposedProperties`)
- **RF-3.1**: Por defecto, al crear una nueva capa de texto, `alineacionVertical` **no estará expuesta** (`exposed: false`).
- **RF-3.2**: Al hacer clic en el icono del ojo, la propiedad se añade a `plantilla.exposedProperties`:
  - `property`: `"alineacionVertical"`
  - `label`: `"Alineación Vertical"`
- **RF-3.3**: Se registra `{ property: "alineacionVertical", label: "Alineación Vertical" }` en las listas del catálogo de propiedades disponibles (`AVAILABLE_PROPERTIES` / `getCatalogPropertiesForLayer`).

### RF-4: Inspector del Lienzo Principal ([App.tsx](file:///c:/Users/victo/proyectos/cdc2/client/src/App.tsx))
- **RF-4.1**: Cuando la propiedad esté expuesta (o cuando el usuario active el toggle *"Mostrar todos los campos"* de SRS-084), el inspector lateral derecho mostrará un selector con los 3 botones (`⬆️`, `↕️`, `⬇️`).
- **RF-4.2**: **Edición individual y en lote**:
  - Con una sola carta seleccionada: resalta el botón activo de la carta y permite alternar la alineación.
  - Con múltiples cartas seleccionadas: si todas comparten la misma alineación vertical, se resalta; si difieren, ninguno aparece como activo. Al hacer clic en cualquiera de los botones, se aplica la alineación vertical a todas las cartas seleccionadas simultáneamente.

### RF-5: Unificación en los Motores de Renderizado
- **RF-5.1**: La caja contenedora de la capa de texto adoptará estilo Flexbox en columna:
  ```css
  display: flex;
  flex-direction: column;
  justify-content: flex-start; /* si alineacionVertical === 'top' o indefinido */
  /* justify-content: center;   si alineacionVertical === 'center' */
  /* justify-content: flex-end; si alineacionVertical === 'bottom' */
  ```
- **RF-5.2**: El contenedor interior del texto mantendrá `width: 100%`, preservando íntegramente la alineación horizontal existente (`text-align: left | center | right | justify`), el padding configurado y el interlineado (`line-height`).
- **RF-5.3**: Esta lógica se aplica con paridad del 100% en:
  1. Lienzo de edición en [EditCardModal.tsx](file:///c:/Users/victo/proyectos/cdc2/client/src/EditCardModal.tsx).
  2. Lienzo principal de cartas (anverso y reverso) en [App.tsx](file:///c:/Users/victo/proyectos/cdc2/client/src/App.tsx).
  3. Modal de detalle de carta [DetailModal.tsx](file:///c:/Users/victo/proyectos/cdc2/client/src/DetailModal.tsx).
  4. Modal de previsualización de plantillas [TemplatePreviewModal.tsx](file:///c:/Users/victo/proyectos/cdc2/client/src/components/TemplatePreviewModal.tsx).
  5. Motor de exportación PDF y PNG del backend ([cardRenderer.ts](file:///c:/Users/victo/proyectos/cdc2/server/src/engine/cardRenderer.ts) y [index.ts](file:///c:/Users/victo/proyectos/cdc2/server/src/index.ts)).
  6. Utilidades de renderizado auxiliar ([debug_html.ts](file:///c:/Users/victo/proyectos/cdc2/server/src/debug_html.ts)).

---

## 3. Arquitectura y Diseño de Datos

### 3.1. Tipos e Interfaces TypeScript

En [`shared/layoutEngine.ts`](file:///c:/Users/victo/proyectos/cdc2/shared/layoutEngine.ts):

```typescript
export interface CapaTexto {
  id: string;
  nombre: string;
  tipo: "text";
  // ... propiedades existentes ...
  alineacion?: "left" | "center" | "right" | "justify";
  alineacionVertical?: "top" | "center" | "bottom"; // Nuevo en SRS-086
  lineHeight?: number;
}

// En Carta.capasOverrides y capasOverridesTrasera:
capasOverrides?: Record<string, {
  // ... propiedades existentes ...
  alineacion?: "left" | "center" | "right" | "justify";
  alineacionVertical?: "top" | "center" | "bottom"; // Nuevo en SRS-086
  lineHeight?: number;
}>;
```

---

## 4. Estrategia de Verificación (Pruebas)

### 4.1. Pruebas Unitarias Automatizadas
Se creará el archivo `client/src/SRS086AlineacionVerticalTexto.test.tsx` cubriendo:
1. **Resolución por defecto**: Comprobar que una capa sin `alineacionVertical` resuelve a `"top"` (y `justifyContent: "flex-start"`).
2. **Valores personalizados**: Comprobar que `"center"` resuelve a `justifyContent: "center"` y `"bottom"` resuelve a `justifyContent: "flex-end"`.
3. **Coexistencia con alineación horizontal**: Verificar que `textAlign` horizontal y `justifyContent` vertical operan de forma ortogonal y simultánea.
4. **Exposición de propiedad**: Comprobar que alternar el estado expone u oculta `{ property: "alineacionVertical", label: "Alineación Vertical" }` en `exposedProperties`.
5. **Edición en lote**: Comprobar que actualizar `alineacionVertical` sobre un conjunto de cartas seleccionadas actualiza correctamente `capasOverrides` en todas ellas.

### 4.2. Checklist de Pruebas Manuales
- [ ] En `EditCardModal`, crear una capa de texto con altura amplia (ej. 30mm) y contenido de 1 o 2 líneas.
- [ ] Cambiar la alineación vertical a `⬆️ Arriba`, `↕️ Centro` y `⬇️ Abajo`. Verificar que el texto se posiciona de forma nítida en cada extremo o en el centro vertical.
- [ ] Combinar alineación horizontal y vertical (ej. Centrado horizontal + Centrado vertical).
- [ ] Pulsar el icono del ojo en `Alineación Vertical` para exponer la propiedad.
- [ ] Guardar la plantilla y volver al lienzo principal (`App.tsx`).
- [ ] Comprobar que en la barra lateral aparece el control de alineación vertical y que al cambiarlo la carta se actualiza.
- [ ] Seleccionar varias cartas y verificar que la alineación vertical se modifica en lote.
- [ ] Previsualizar en el modal de detalle y realizar una exportación a PDF para verificar que la alineación vertical en el documento exportado coincide con la pantalla.
