# SRS-067: Plantillas de Proyecto (.cdc2), Flujo Local y Organización de Menús

## 1. Introducción y Objetivos
- **Propósito**: Permitir a los usuarios crear, exportar y abrir plantillas de proyecto completas utilizando el formato nativo `.cdc2`, de modo que un archivo pueda almacenar la arquitectura y maquetación de un juego de mesa completo (documentos, dimensiones de hoja y carta, márgenes, sangrados, tipografías, colores, símbolos y plantillas de cartas) limpio de cartas y de imágenes privadas del usuario, listo para su reutilización. Además, reorganizar las opciones de menú para dar soporte a "Guardar como..." y reubicar la importación de plantillas sueltas (.cdc2t) en el menú de Recursos.
- **Objetivos de Diseño**:
  - **Unificación de Formato**: Aprovechar el formato estándar `.cdc2` para evitar crear o mantener formatos paralelos. Todo proyecto y plantilla de proyecto es un archivo ZIP estándar con `project.json` y recursos.
  - **Reutilización Multidocumento**: A diferencia de las plantillas de carta individuales (.cdc2t), la plantilla de proyecto conserva el juego íntegro: mazos de diferentes tamaños, traseras, hojas de tokens o tableros en un solo archivo.
  - **Aislamiento y Privacidad**: Exclusión deliberada de las cartas creadas (`cartas: []`) y de la galería personal de imágenes del usuario (`userAssets: []`), preservando exclusivamente los recursos propios del diseño de las plantillas.
  - **Bifurcación Segura ("Guardar como..." y "Abrir como plantilla")**: Garantizar que tanto al abrir un proyecto como plantilla como al hacer "Guardar como...", se asigne una nueva ID única (`id = proj_<timestamp>_<random>`) para evitar colisiones o sobrescrituras involuntarias.

---

## 2. Requisitos Funcionales y Casos de Uso

### RF-1: Reubicación de "Importar Plantilla (.cdc2t)" al Menú de Recursos
- Mover la acción de **"Importar Plantilla (.cdc2t)..."** fuera del menú principal "Archivo" y ubicarla en el menú superior **"Recursos"** (o "Recursos ▶ Plantillas").
- Mantener la compatibilidad con el formato `.cdc2t` existente para usuarios que deseen importar diseños de cartas individuales legados.

### RF-2: Exportación de Plantilla de Proyecto (.cdc2)
- En el submenú de guardado (`Archivo ▶ Guardar Proyecto ▶`):
  - Añadir la opción **📐 Exportar Plantilla de Proyecto (.cdc2)**.
- **Contenido del archivo `.cdc2` generado**:
  - **Metadatos (`meta`)**:
    - `isTemplate: true` y `type: "template"`.
    - Nombre del proyecto/plantilla y fechas ISO.
  - **Documentos (`documentos`)**:
    - Se preservan todos los documentos configurados con sus nombres (ej. "Cartas de Héroe", "Acciones", "Tableros").
    - Se conservan todas las propiedades de página: `anchoHoja`, `altoHoja`, `anchoCarta`, `altoCarta`, `margenSuperior`, `margenInferior`, `margenIzquierdo`, `margenDerecho`, `espacioHorizontal`, `espacioVertical`, `orientacion`, `sangrado` (*bleed*) y `plantillaDefecto`.
    - **Vaciado de cartas**: Todas las colecciones de cartas se exportan vacías: `cartas: []`.
  - **Plantillas (`templates`)**:
    - Se incluyen todas las plantillas del proyecto (frontales y traseras) con sus capas, atributos expuestos y configuraciones de diseño.
  - **Recursos del diseño (`assets`)**:
    - Se incluyen las imágenes y elementos gráficos utilizados por las plantillas (fondos, marcos, iconos, opciones de switch).
  - **Recursos globales del proyecto**:
    - `customFonts`: Fuentes tipográficas personalizadas instaladas en el proyecto.
    - `projectColors`: Paleta de colores del proyecto.
    - `projectSymbols`: Símbolos/iconos del proyecto.
  - **Exclusión de recursos personales del usuario**:
    - `userAssets: []` (se omite la galería privada con fotos o imágenes que el usuario haya subido para cartas concretas).
- **Nombre de archivo exportado**:
  - Sugerido: `plantilla_<nombre_proyecto>_<timestamp>.cdc2`.

### RF-3: "Abrir desde PC como Plantilla (.cdc2)..."
- En el submenú de apertura (`Archivo ▶ Abrir Proyecto ▶`):
  - 💻 **Importar desde PC (.cdc2)...**: Flujo tradicional que carga el proyecto tal cual con todas sus cartas.
  - 📐 **Abrir desde PC como Plantilla (.cdc2)...**: Nueva opción dedicada.
- **Comportamiento al abrir como plantilla**:
  - El usuario selecciona cualquier archivo `.cdc2` (sea un proyecto ordinario o una plantilla explícita).
  - El motor de carga:
    1. Descomprime y lee `project.json`.
    2. Asigna una **nueva ID única de proyecto** (`proj_<timestamp>_<random>`) para desvincularlo totalmente del archivo origen.
    3. Vacía el array de cartas de todos los documentos (`documento.cartas = []`).
    4. Carga las plantillas, documentos, dimensiones de hoja/carta, sangrados, tipografías, colores y recursos de diseño.
    5. Establece el estado de cartas vacías, dejando el editor listo para que el usuario comience a crear nuevas cartas de inmediato sobre esa base.
- **Apertura nativa de archivos con `isTemplate: true`**:
  - Si un usuario abre un archivo `.cdc2` mediante la opción habitual ("Importar desde PC") y el archivo contiene `isTemplate: true`, el sistema lo reconoce automáticamente, genera una nueva ID de proyecto y lo abre como plantilla sin preguntar ni generar conflictos de ID.

### RF-4: "Guardar Proyecto Como..." (Bifurcación / Nueva Copia con Nueva ID)
- En el submenú de guardado (`Archivo ▶ Guardar Proyecto ▶`):
  - 💻 **Exportar a PC (.cdc2)**: Exporta el proyecto conservando su ID actual.
  - 📑 **Exportar Proyecto Como... (.cdc2)**:
    - Solicita confirmación o permite introducir un nuevo nombre para la copia.
    - Genera una **nueva ID única** en memoria y en `project.json`.
    - Descarga el archivo descargado con la nueva identidad, permitiendo crear ramas alternativas de una baraja sin sobrescribir el archivo original.

### RF-5: Menú "Archivo" Desplegable en Cascada Reorganizado
- La estructura del menú "Archivo" queda configurada de forma limpia y legible:
  - 📄 **Nuevo Proyecto**: Resetea el lienzo y abre el modal de configuración de dimensiones.
  - 📂 **Abrir Proyecto ▶**:
    - 💻 *Importar desde PC (.cdc2)...*
    - 📐 *Abrir desde PC como Plantilla (.cdc2)...*
    - ☁️ *Abrir desde la Nube...*
  - 💾 **Guardar Proyecto ▶**:
    - 💻 *Exportar a PC (.cdc2)*
    - 📑 *Exportar Proyecto Como... (.cdc2)*
    - 📐 *Exportar Plantilla de Proyecto (.cdc2)*
    - ☁️ *Guardar en la Nube...*
  - 🖼️ **Exportar a Imagen PNG...**
  - 🖨️ **Exportar a PDF...**

---

## 3. Arquitectura y Diseño de Datos

### 3.1. Modelo TypeScript (`shared/layoutEngine.ts` o `shared/projectTypes.ts`)
```typescript
export interface ProyectoMetaCDC2 {
  id?: string;
  nombre: string;
  descripcion?: string;
  fechaCreacion?: string;
  fechaModificacion?: string;
  isTemplate?: boolean;
  type?: 'project' | 'template';
}

export interface ProyectoCDC2 {
  version: '2.1.0' | string;
  id?: string;
  isTemplate?: boolean;
  meta: ProyectoMetaCDC2;
  documentos: DocumentoCDC2[];
  activeDocumentoId?: string;
  templates: Record<string, Plantilla>;
  assets: Asset[];
  userAssets?: Asset[];
  projectSymbols?: Simbolo[];
  customFonts?: FuentePersonalizada[];
  projectColors?: string[];
}
```

### 3.2. Función Generadora `generarPlantillaProyectoZip()` (`client/src/App.tsx` o utilidades)
```typescript
export async function generarPlantillaProyectoZip(options: {
  nombrePlantilla: string;
  documentos: DocumentoCDC2[];
  templates: Record<string, Plantilla>;
  projectAssets: Asset[];
  projectSymbols: Simbolo[];
  projectFonts: FuentePersonalizada[];
  projectColors: string[];
}): Promise<Blob> {
  const zip = new JSZip();
  const templateId = `tmpl_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

  // Vaciado de cartas en todos los documentos
  const documentosLimpios = documentos.map(doc => ({
    ...doc,
    cartas: []
  }));

  const plantillaProyecto: ProyectoCDC2 = {
    version: '2.1.0',
    id: templateId,
    isTemplate: true,
    meta: {
      id: templateId,
      nombre: options.nombrePlantilla,
      fechaCreacion: new Date().toISOString(),
      fechaModificacion: new Date().toISOString(),
      isTemplate: true,
      type: 'template'
    },
    documentos: documentosLimpios,
    templates: options.templates,
    assets: options.projectAssets,
    userAssets: [], // Exclusión de imágenes privadas de usuario
    projectSymbols: options.projectSymbols,
    customFonts: options.projectFonts,
    projectColors: options.projectColors
  };

  zip.file("project.json", JSON.stringify(plantillaProyecto, null, 2));
  // Empaquetado de recursos de plantillas (assets/)
  // ...
  return await zip.generateAsync({ type: "blob" });
}
```

---

## 4. Estrategia de Verificación (Pruebas)

### 4.1. Pruebas Unitarias Automatizadas
- Test de generación de plantilla de proyecto ZIP:
  - Verificar que el `project.json` resultante tenga `isTemplate: true`.
  - Verificar que todos los documentos tengan `cartas.length === 0`.
  - Verificar que `userAssets` sea un array vacío.
  - Verificar que se conserven las fuentes, plantillas, dimensiones de hoja/carta y colores.
- Test de carga de proyecto como plantilla:
  - Verificar que al cargar un archivo existente con cartas seleccionando "Abrir como plantilla", el estado resultante tenga 0 cartas y una ID de proyecto distinta a la original.
- Test de "Exportar Proyecto Como...":
  - Verificar que la nueva copia generada tenga un ID de proyecto diferente.

### 4.2. Pruebas Manuales / Checklist
- [ ] Comprobar que en el menú "Recursos" aparece la opción "Importar Plantilla (.cdc2t)..." y funciona correctamente.
- [ ] En un proyecto con 10 cartas, seleccionar "Exportar Plantilla de Proyecto (.cdc2)". Abrir el archivo y constatar que contiene los documentos, tamaños y plantillas pero 0 cartas.
- [ ] En "Abrir Proyecto ▶", seleccionar "Abrir desde PC como Plantilla (.cdc2)..." con un `.cdc2` que tenga cartas: verificar que se abren los documentos vacíos sin cartas y con nueva ID.
- [ ] Probar "Exportar Proyecto Como...": verificar que descarga una copia con nueva ID.
