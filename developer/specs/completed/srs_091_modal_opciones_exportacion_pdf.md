# SRS-091: Modal de Opciones de Exportación PDF con Selección de Páginas, Anversos, Reversos y Rangos Personalizados

**Estado**: Completado  
**Fecha**: 2026-10-26  
**Autor**: Card Deck Crafter Team & AI Pair Programmer  
**Alcance**: Frontend (`client/src/components/ExportPdfModal.tsx`, `client/src/App.tsx`, `client/src/MenuBar.tsx`) y Backend (`server/src/index.ts`)  
**Versión**: `v2.261026.4`  

---

## 1. Introducción y Objetivos

### 1.1. Propósito
Actualmente, la exportación a PDF en Card Deck Crafter v2 se dispara inmediatamente al pulsar "Exportar PDF" en la barra de menú, enviando el documento activo en su totalidad al backend sin permitir al usuario elegir qué páginas, caras o cartas desea imprimir.

El propósito de esta especificación técnica es incorporar un **Modal de Opciones de Exportación PDF** previo a la generación del archivo. Este modal permitirá a los diseñadores configurar con precisión el alcance de la impresión en imprenta o en casa: exportar todas las páginas, únicamente las caras anversas (frontales), únicamente las caras reversas (traseras), únicamente las cartas actualmente seleccionadas en la mesa de trabajo, o un rango personalizado de páginas físicas naturales del PDF (ej. `1, 3, 5-8`).

### 1.2. Objetivos de Diseño
1. **Control Fino y Predecible de Impresión**: El usuario puede excluir caras traseras para imprimir solo anversos de prueba, imprimir solo las cartas que acaba de retocar, o reimprimir pliegos dañados mediante rangos personalizados.
2. **Páginas Naturales del PDF**: El filtrado por rango numérico opera sobre las **páginas físicas reales** que conformarán el documento PDF final (donde la página 1 corresponde a la primera cara frontal del pliego, la página 2 a la cara trasera del pliego si los reversos están activos, la página 3 a la segunda cara frontal, etc.).
3. **Resumen y Validación Dinámica en Tiempo Real**: El modal muestra cuántas páginas se generarán según la opción escogida, y valida en tiempo real la sintaxis del rango personalizado (alertando de números fuera de rango o sintaxis incorrecta).
4. **Eficiencia y Carga Reducida en Servidor**: Las opciones de filtrado se transmiten al endpoint `/api/exportar/pdf`, permitiendo al motor de Chromium/Puppeteer generar o renderizar únicamente las páginas solicitadas (`pageRanges`), ahorrando tiempo y memoria de CPU.

---

## 2. Requisitos Funcionales y Casos de Uso

### RF-1: Diálogo Modal de Configuración Previa a la Exportación
- Al pulsar el botón "Exportar PDF" en el menú superior o barra de herramientas:
  - Si el documento activo no tiene cartas (`cards.length === 0`), no se abre el modal y se muestra el aviso habitual.
  - Si hay cartas, se abre el modal interactivo `ExportPdfModal`.
- El modal debe presentar:
  - Título: *"Exportar Documento a PDF"*.
  - Nombre del documento activo actual (ej. *"Documento 1"*).
  - Número total de cartas en el documento y pliegos/páginas totales estimados.
  - Selector de opciones de exportación (botones de radio).
  - Resumen dinámico del resultado esperado.
  - Botones de acción: *"Cancelar"* y *"Exportar PDF"*.

### RF-2: Opciones de Alcance de Páginas
El modal debe ofrecer las siguientes opciones de radio exclusivas:
1. **Todas las páginas** (`todas`): Exporta la totalidad de los pliegos (frontales y traseros si están activos). Seleccionado por defecto.
2. **Solo anversos (caras frontales)** (`anversos`): Exporta exclusivamente las páginas impares del pliego correspondientes a los anversos de las cartas.
3. **Solo reversos (caras traseras)** (`reversos`): Exporta exclusivamente las páginas pares del pliego correspondientes a los reversos.
   - *Regla de negocio*: Esta opción se deshabilita automáticamente si el documento activo no tiene activada la generación de reversos (`generarReversos === false` o `modoTraseras === "ninguno"`).
4. **Cartas seleccionadas** (`seleccion`): Genera un montaje PDF que contiene únicamente las cartas que el usuario tiene seleccionadas en el lienzo de trabajo (`selectedCardIds`).
   - *Regla de compactación y redistribución*: Las cartas seleccionadas se empaquetan de forma secuencial y contigua desde el primer slot de la primera página, redistribuyéndose para ocupar el mínimo número posible de pliegos y páginas, sin dejar huecos vacíos donde estaban las cartas no seleccionadas. Si el documento tiene reversos activos, las caras traseras de estas cartas seleccionadas se colocan en los slots emparejados y espejados correspondientes para asegurar la perfecta alineación a doble cara.
   - *Regla de negocio*: Esta opción se deshabilita automáticamente si el usuario no tiene ninguna carta seleccionada (`selectedCardIds.length === 0`), indicando *"No hay cartas seleccionadas en la mesa"*.
5. **Rango personalizado de páginas** (`personalizado`): Permite al usuario introducir un texto con números de página separados por comas y/o guiones (ej. `1, 3, 5-8`).
   - Al marcar esta opción, se enfoca un campo de texto para escribir el rango.
   - Se valida dinámicamente:
     - Formato válido: números positivos, comas, espacios y guiones.
     - Detección de páginas fuera del rango máximo disponible (ej. si el PDF tiene 4 páginas y se introduce `5`, se marca como inválido).
     - El botón de exportación se deshabilita si el campo personalizado está vacío o contiene un rango inválido.

### RF-3: Resumen Dinámico en Tiempo Real
Bajo el selector de opciones, el modal muestra un panel de confirmación visual informativo:
- *"Páginas resultantes: 1, 2, 3 (Total: 3 páginas)"*.
- Si se eligen *Cartas seleccionadas*: *"Se montarán X cartas seleccionadas en 1 pliego (2 páginas con reverso)"*.
- Si hay un error en el rango personalizado: *"Rango no válido: la página 7 supera el máximo disponible (4 páginas)"*.

### RF-4: Integración con Endpoint Backend `/api/exportar/pdf`
- El cliente envía la solicitud `multipart/form-data` incluyendo:
  - `archivoProyecto`: Blob del proyecto `.cdc2`.
  - `opcionesExportacion`: Cadena JSON serializada con:
    ```typescript
    {
      tipoAlcance: "todas" | "anversos" | "reversos" | "seleccion" | "personalizado",
      pageRanges?: string, // Cadena compatible con Puppeteer ej. "1,3,5-8"
      selectedCardIds?: string[] // IDs de cartas si tipoAlcance === "seleccion"
    }
    ```
- En el backend (`server/src/index.ts`):
  1. Si `selectedCardIds` está presente y `tipoAlcance === "seleccion"`, se filtran las cartas de `activeDoc.cards` antes de invocar `calcularDistribucion`. De este modo, `calcularDistribucion` empaqueta automáticamente solo las cartas seleccionadas de forma compacta y secuencial desde el primer slot, ocupando el mínimo número de páginas posible y sin dejar huecos vacíos. Si hay caras traseras, se emparejan y espejan en su correspondiente hoja de reverso.
  2. Si `tipoAlcance === "anversos"`, se genera el HTML sin incluir `paginasTraseras` (o se extrae el rango de páginas impares).
  3. Si `tipoAlcance === "reversos"`, se genera el HTML sin incluir `paginasFrontales` (o se extrae el rango de páginas pares).
  4. Si se especifica `pageRanges` (o se calculó a partir de anversos/reversos/personalizado), se transfiere directamente a la opción nativa de Puppeteer:
     ```typescript
     await page.pdf({
       path: pdfPath,
       format: activeDoc.canvasConfig.tipo as any,
       printBackground: true,
       pageRanges: opciones.pageRanges || undefined,
       preferCSSPageSize: true
     });
     ```
  5. Se retorna el archivo PDF generado al cliente para su descarga automática.

---

## 3. Arquitectura y Diseño de Datos

### 3.1. Estructura de Opciones de Exportación
```typescript
export type PdfExportScopeType = "todas" | "anversos" | "reversos" | "seleccion" | "personalizado";

export interface PdfExportOptions {
  scopeType: PdfExportScopeType;
  customRangeText?: string;
  pageRangesResolved?: string;
  selectedCardIds?: string[];
}
```

### 3.2. Función Utilitaria de Resolución y Validación de Rangos
Se define la función pura `resolverRangoPaginasPdf(input: string, totalPaginas: number): { valid: boolean; pages: number[]; pageRangesString: string; error?: string }`:
- Parsea cadenas como `"1, 3, 5-7"` -> `[1, 3, 5, 6, 7]`.
- Elimina duplicados y ordena ascendentemente.
- Comprueba que todos los números estén entre `1` y `totalPaginas`.
- Retorna la cadena compacta formateada para Puppeteer (ej. `"1,3,5-7"`).

---

## 4. Interfaces de Componentes / API

### 4.1. Componente `ExportPdfModal.tsx`
```typescript
interface ExportPdfModalProps {
  documentoNombre: string;
  totalCartas: number;
  totalPaginasEstimadas: number;
  tieneReversos: boolean;
  selectedCardIds: string[];
  isExporting: boolean;
  onExport: (options: PdfExportOptions) => Promise<void>;
  onClose: () => void;
}
```

### 4.2. Estilo Visual
- Modal coherente con el diseño de Card Deck Crafter v2 (`var(--bg-card)`, `var(--border-color)`, `var(--accent-primary)`).
- Opciones de radio agrupadas en tarjetas clicables (`.export-option-card`).
- Indicador animado de progreso (`⏳ Generando PDF en servidor...`) durante la exportación.

---

## 5. Estrategia de Verificación (Pruebas)

### 5.1. Pruebas Unitarias Automatizadas
1. **Lógica de resolución de rangos (`resolverRangoPaginasPdf`)**:
   - Resuelve listas separadas por comas (`"1, 3, 5"`).
   - Resuelve rangos con guiones (`"2-4"`).
   - Resuelve combinaciones mixtas (`"1, 4-6, 9"`).
   - Detecta números fuera de rango (`"10"` cuando total es 4) y marcas como `valid: false`.
   - Rechaza caracteres no válidos (`"abc"`, `"1-2-3"`).
2. **Componente `ExportPdfModal`**:
   - Renderiza todas las opciones de alcance.
   - Deshabilita "Solo reversos" si el documento no tiene reversos.
   - Deshabilita "Cartas seleccionadas" si `selectedCardIds` está vacío.
   - Actualiza el resumen dinámico al cambiar entre opciones.
   - Habilita el campo de texto solo al seleccionar "Personalizado".
   - Dispara `onExport` con las opciones correctas al pulsar "Exportar PDF".
3. **Endpoint `/api/exportar/pdf`**:
   - Verifica que recibe y procesa `pageRanges` en Puppeteer.
   - Verifica que filtra cartas cuando se solicita `tipoAlcance === "seleccion"`.

### 5.2. Pruebas Manuales / Checklist de Aceptación
1. Abrir un proyecto con cartas y anverso/reverso.
2. Hacer clic en "Exportar PDF" -> se abre el modal `ExportPdfModal`.
3. Seleccionar "Solo anversos" -> el PDF resultante contiene únicamente las páginas frontales.
4. Seleccionar "Solo reversos" -> el PDF resultante contiene únicamente las páginas traseras.
5. Seleccionar 2 cartas en la mesa de trabajo -> la opción "Cartas seleccionadas" se habilita y genera un PDF acotado a esas 2 cartas.
6. Seleccionar "Personalizado" e introducir `1-2` -> se genera un PDF de exactamente 2 páginas.
7. Introducir un rango inválido (ej. `99`) -> se muestra alerta de validación y el botón de exportar queda deshabilitado.
