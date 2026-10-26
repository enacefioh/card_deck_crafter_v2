# SRS-092: Modal de Opciones de Exportación PNG de Cartas Individuales con Filtros de Documento, Caras y Rangos

**Estado**: Completado  
**Fecha**: 2026-10-26  
**Autor**: Card Deck Crafter Team & AI Pair Programmer  
**Alcance**: Frontend (`client/src/components/ExportPngModal.tsx`, `client/src/services/clientPngExportService.ts`, `client/src/App.tsx`, `client/src/MenuBar.tsx`)  
**Versión**: `v2.261026.5`  

---

## 1. Introducción y Objetivos

### 1.1. Propósito
Con la incorporación en SRS-089 de la exportación de cartas a 300 DPI 100% en el cliente, los usuarios pueden descargar un archivo `.zip` con los archivos `.png` individuales de sus cartas. Sin embargo, dicha exportación procesa siempre la totalidad de los documentos y cartas sin permitir acotar la generación.

Esta especificación técnica introduce el diálogo interactivo **`ExportPngModal`**, que permite al diseñador elegir si desea exportar todos los documentos o solo el documento activo, seleccionar qué cartas incluir (todas, solo las seleccionadas en la mesa de trabajo o un rango numérico de índices de cartas ej. `1-10, 15`) y filtrar las caras a generar (anversos y reversos, solo anversos o solo reversos).

### 1.2. Objetivos de Diseño
1. **Filtro Jerárquico en Dos Niveles**:
   - **Nivel 1 (Alcance de Documentos)**: Exportar todos los documentos del proyecto o acotar exclusivamente al documento activo.
   - **Nivel 2 (Alcance de Cartas y Caras)**:
     - Selección de cartas: todas las cartas, cartas actualmente seleccionadas en la mesa o rango numérico personalizado (ej. cartas 1 a 10).
     - Selección de caras: ambas caras (anverso + reverso), solo anversos o solo reversos.
2. **Generación 100% en Cliente a 300 DPI**: Preserva la arquitectura ligera y reactiva en el navegador mediante Canvas / OffscreenCanvas y JSZip, procesando únicamente las cartas y caras que el usuario haya seleccionado para minimizar el uso de memoria RAM y tiempo de CPU.
3. **Resumen Dinámico en Tiempo Real**: Muestra el conteo exacto de archivos PNG que se incluirán en el `.zip` resultante y valida la sintaxis del rango personalizado en tiempo real.
4. **Flujo de Modales sin Solapamiento**: Al pulsar "Exportar PNGs", el modal de opciones se cierra de inmediato y da paso al diálogo de progreso (`ExportProgressModal`) con barra porcentual y botón de cancelación.

---

## 2. Requisitos Funcionales y Casos de Uso

### RF-1: Diálogo Modal de Configuración de Exportación PNG
- Al pulsar *"Exportar Imágenes (PNG)..."* en el menú Archivo de la barra superior:
  - Si el proyecto no tiene cartas en ningún documento, se muestra un aviso indicando que no hay cartas para exportar.
  - Si hay cartas, se abre el modal interactivo `ExportPngModal`.
- El modal debe presentar:
  - Título: *"Exportar Cartas a Imágenes (PNG)"*.
  - Selector de Documentos (Nivel 1).
  - Selector de Cartas y Caras (Nivel 2).
  - Resumen dinámico del número total de imágenes PNG que se generarán.
  - Botones de acción: *"Cancelar"* y *"Exportar PNGs"*.

### RF-2: Nivel 1 - Selector de Alcance de Documentos
Dos opciones de radio excluyentes:
1. **Solo documento actual** (`documento_activo`): Acota la exportación al documento visible actualmente en la mesa de trabajo (ej. *"Documento 1"*). Seleccionado por defecto.
2. **Todos los documentos del proyecto** (`todos_documentos`): Procesa todos los documentos que componen el proyecto (ej. *"Mazo Principal"*, *"Mazo Expansión"*).
   - *Regla de negocio*: Si el proyecto solo contiene 1 documento, esta opción puede mostrarse atenuada o con el badge *"1 documento"*.

### RF-3: Nivel 2 - Alcance de Cartas (cuando se selecciona Solo Documento Actual)
1. **Todas las cartas del documento** (`todas`): Procesa la totalidad de cartas del documento activo.
2. **Cartas seleccionadas en la mesa** (`seleccion`): Procesa únicamente las cartas que el usuario tiene seleccionadas en el lienzo de trabajo (`selectedCardIds`).
   - *Regla de negocio*: Se deshabilita automáticamente si no hay cartas seleccionadas (`selectedCardIds.length === 0`).
3. **Rango personalizado de cartas** (`personalizado`): Permite al usuario indicar índices de cartas separados por comas y/o guiones (ej. `1-5, 8, 10-12`).
   - El índice `1` corresponde a la primera carta del documento (orden de visualización en el lienzo).
   - Validación en tiempo real:
     - No permite números mayores al total de cartas del documento ni menores a 1.
     - Valida sintaxis y muestra mensajes de error descriptivos.
     - Si el campo está vacío o es inválido, deshabilita el botón de exportación.

### RF-4: Filtro de Caras (Anversos y Reversos)
Opciones de radio o botones segmentados:
1. **Ambas caras (Anversos + Reversos)** (`ambas`): Genera tanto la cara frontal como la trasera de cada carta (si tiene trasera).
2. **Solo anversos (Frontales)** (`anversos`): Genera únicamente el PNG del anverso de cada carta seleccionada.
3. **Solo reversos (Traseras)** (`reversos`): Genera únicamente el PNG del reverso de cada carta seleccionada.
   - *Regla de negocio*: Se deshabilita si ninguna de las cartas a exportar dispone de cara trasera configurada.

### RF-5: Resumen Dinámico y Validación en Tiempo Real
Bajo los selectores, se muestra un panel informativo dinámico:
- Ejemplo: *"Se generarán 10 imágenes PNG (Cartas 1 a 10, solo anverso) empaquetadas en 'MiProyecto_PNGs.zip'"*.
- Si se eligen ambas caras: *"Se generarán 20 imágenes PNG (10 anversos + 10 reversos)"*.

### RF-6: Ejecución y Coordinación con `clientPngExportService`
- Al pulsar *"Exportar PNGs"*:
  1. Se cierra inmediatamente el modal `ExportPngModal`.
  2. Se invoca `exportarProyectoPngEnCliente` con los filtros aplicados:
     - Lista acotada de documentos/cartas.
     - Parámetro de caras: `"ambas" | "anversos" | "reversos"`.
  3. Se abre el diálogo existente `ExportProgressModal` mostrando el progreso en tiempo real (carta X de Y, porcentaje y botón de cancelación).
  4. Al concluir o cancelar, se descarga el `.zip` generado automáticamente.

---

## 3. Arquitectura y Diseño de Datos

### 3.1. Estructuras de Datos (TypeScript)
```typescript
export type PngDocScope = "documento_activo" | "todos_documentos";
export type PngCardScope = "todas" | "seleccion" | "personalizado";
export type PngFacesScope = "ambas" | "anversos" | "reversos";

export interface PngExportOptions {
  docScope: PngDocScope;
  cardScope: PngCardScope;
  facesScope: PngFacesScope;
  customCardRangeText?: string;
  selectedCardIndices?: number[]; // Índices 1-based resueltos
  selectedCardIds?: string[];
}
```

### 3.2. Función Utilitaria `parseCustomCardRanges`
Función pura que parsea cadenas como `"1-5, 8"` contra `maxCards`:
```typescript
export function parseCustomCardRanges(input: string, maxCards: number): {
  valid: boolean;
  cardIndices: number[];
  error?: string;
}
```

---

## 4. Interfaces de Componentes / API

### 4.1. Componente `ExportPngModal.tsx`
```typescript
interface ExportPngModalProps {
  documentos: DocumentoCDC2[];
  activeDocumentoId: string;
  selectedCardIds: string[];
  tieneReversosActivos: boolean;
  onExport: (options: PngExportOptions) => void;
  onClose: () => void;
}
```

### 4.2. Firma en `clientPngExportService.ts`
Se amplía `ClientPngExportOptions`:
```typescript
export interface ClientPngExportOptions {
  documentos: DocumentoCDC2[];
  templatesMap: Record<string, any>;
  projectSymbols?: any[];
  projectAssets?: any[];
  userAssets?: any[];
  customFonts?: any[];
  nombreProyecto?: string;
  exportOptions?: PngExportOptions; // <-- Nuevo filtro
  onProgress?: (progress: ExportProgressInfo) => void;
  signal?: AbortSignal;
}
```

---

## 5. Estrategia de Verificación (Pruebas)

### 5.1. Pruebas Unitarias Automatizadas
1. **Utilidad de rangos de cartas (`parseCustomCardRanges`)**:
   - Resuelve listas separadas por comas (`"1, 3, 5"`).
   - Resuelve rangos (`"1-10"`).
   - Valida cotas (números mayores al número de cartas disponibles en el documento).
2. **Componente `ExportPngModal`**:
   - Renderiza correctamente opciones de nivel 1 y nivel 2.
   - Oculta o deshabilita opciones de cartas individuales cuando se selecciona "Todos los documentos".
   - Deshabilita "Cartas seleccionadas" si no hay cartas seleccionadas.
   - Muestra error en tiempo real si el rango personalizado supera el total de cartas.
   - Envía el payload de opciones correcto al enviar el formulario.
3. **Servicio `clientPngExportService`**:
   - Renderiza únicamente anversos cuando `facesScope === "anversos"`.
   - Renderiza únicamente cartas del rango indicado cuando `cardScope === "personalizado"`.
   - Renderiza únicamente cartas seleccionadas cuando `cardScope === "seleccion"`.

### 5.2. Pruebas Manuales / Checklist de Aceptación
1. Abrir un proyecto con cartas.
2. Hacer clic en **Archivo > Exportar Imágenes (PNG)...** -> se abre el diálogo modal `ExportPngModal`.
3. Seleccionar "Solo documento actual", "Personalizado: 1-2" y "Solo anversos" -> al exportar se descargan exactamente 2 archivos PNG en el ZIP correspondientes a las cartas 1 y 2.
4. Seleccionar "Todos los documentos" y "Solo anversos" -> se descargan las cartas de todos los documentos en carpetas o con sus nombres respectivos.
5. Seleccionar "Cartas seleccionadas" con 1 carta marcada -> el ZIP contiene únicamente esa carta.
