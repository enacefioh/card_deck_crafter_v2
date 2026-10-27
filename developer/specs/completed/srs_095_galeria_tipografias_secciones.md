# SRS-095: Galería de Tipografías con Secciones Personalizadas, Mover/Copiar y Agrupación en Desplegables

**Estado**: Completado  
**Fecha**: 2026-10-27  
**Autor**: Card Deck Crafter Team & AI Pair Programmer  
**Alcance**: Monorepo Frontend & Shared (`shared/layoutEngine.ts`, `client/src/App.tsx`, `client/src/MenuBar.tsx`, `client/src/EditCardModal.tsx`, `client/src/services/projectZipService.ts`, `client/src/App.css`)  
**Versión**: `v2.261027.5`  

---

## 1. Introducción y Objetivos

### 1.1. Propósito
A medida que los juegos de mesa y barajas de cartas aumentan en riqueza estilística, un mismo proyecto puede requerir múltiples familias tipográficas con funciones diferenciadas: fuentes góticas para títulos de cartas, fuentes sans-serif legibles para bloques de reglas y estadísticas, alfabetos rúnicos o fantásticos para ambientación, o fuentes importadas de expansiones y plantillas externas.

La acumulación de tipografías en un único listado plano dentro del proyecto satura el modal de gestión y dificulta la selección rápida en los inspectores de diseño.

Esta especificación técnica introduce:
1. **Unificación y renombrado del acceso** en el menú superior *Recursos* bajo el título **"🔤 Galería de Tipografías..."**.
2. **Pestañas horizontales al mismo nivel (Flat Tab Architecture)**:
   ```text
   [ 📦 Por Defecto ]  [ 📁 Títulos ]  [ 📁 Reglas ]  [ 📁 Rúnicas ]  [ ➕ Nueva Galería ]
   ```
3. **Gestión de secciones**: Capacidad de crear galerías vacías, renombrarlas y eliminarlas de forma segura (con reubicación automática de las fuentes a *"Por Defecto"*).
4. **Operaciones por tipografía**: Capacidad de **Mover a galería... (📁)** y **Copiar a galería... (📋)** entre secciones disponibles.
5. **Agrupación contextual en desplegables**: En todos los selectores de tipografía de la aplicación (Inspector del lienzo y `EditCardModal`), las fuentes personalizadas se listan agrupadas por secciones mediante `<optgroup>`, aprovechando el estilo de alto contraste implementado en SRS-094.
6. **Persistencia y retrocompatibilidad total**: Guardado en `fontFolders` y `folder` dentro de `customFonts`, garantizando que cualquier proyecto existente `.cdc2` o `.cdc2t` se cargue sin pérdida de datos en la sección *"Por Defecto"*.

---

## 2. Requisitos Funcionales y Casos de Uso

### RF-1: Menú Superior Homogéneo
- En `MenuBar.tsx`, dentro del menú desplegable **Recursos**:
  - Reemplazar *"Tipografías del Proyecto..."* por **"🔤 Galería de Tipografías..."**.
  - Al pulsar, abre el diálogo modal centralizado de gestión de tipografías.

### RF-2: Barra de Pestañas Horizontal al Mismo Nivel
- La cabecera del diálogo de Galería de Tipografías presenta una fila horizontal de pestañas:
  1. **📦 Por Defecto:** Pestaña inicial y fija del proyecto. Muestra badge con conteo de tipografías.
  2. **📁 [Galerías Personalizadas]:** Secciones dinámicas definidas en `fontFolders` (ej. *"Títulos"*, *"Cuerpo"*, *"Ambientación"*, *"Importado"*). Badge con conteo.
  3. **➕ Nueva Galería:** Botón ubicado al final de las pestañas para añadir una nueva sección vacía al proyecto.

### RF-3: Creación, Renombrado y Eliminación de Secciones
1. **Creación (*+ Nueva Galería*):**
   - Solicita el nombre mediante prompt del sistema.
   - Valida que no esté vacío, no coincida con el nombre reservado *"Por Defecto"* (case-insensitive) y no exista previamente en `fontFolders`.
   - Registra el nuevo nombre en `fontFolders` y conmuta la vista activa a la nueva sección.
2. **Renombrado:**
   - Disponible en la barra de herramientas cuando hay activa una galería personalizada.
   - Solicita el nuevo nombre, valida restricciones y actualiza en cascada `fontFolders` y el atributo `folder` de todas las fuentes pertenecientes a dicha sección.
3. **Eliminación Segura:**
   - Disponible para galerías personalizadas (no se permite eliminar *"Por Defecto"*).
   - Reubica automáticamente todas las tipografías de la sección eliminada en la galería *"Por Defecto"* (`folder = "Por Defecto"`).
   - Elimina el nombre de `fontFolders` y activa la pestaña *"Por Defecto"*.

### RF-4: Carga y Arrastre Contextual de Archivos (Dropzone)
- El área de subida (*dropzone*) acepta archivos `.ttf`, `.otf`, `.woff`, `.woff2`.
- Al subir o arrastrar archivos, se registran directamente asociadas a la sección actualmente activa (`folder: activeFontTab`).

### RF-5: Operaciones Avanzadas en Cada Tarjeta Tipográfica
- Cada elemento de tipografía (`.gallery-asset-item`) incluye:
  1. **Vista previa:** Muestra una muestra renderizada (`Aa`) con la familia tipográfica aplicada.
  2. **Nombre y renombrado:** Nombre de la familia tipográfica con botón de renombrar (✏️).
  3. **Eliminar (✕):** Elimina la fuente previa confirmación del usuario.
  4. **Mover a galería... (📁):** Desplegable que traslada la fuente a otra sección existente (`folder = destino`).
  5. **Copiar a galería... (📋):** Desplegable que crea una copia de la fuente con nuevo ID en la sección seleccionada, conservando la original.

### RF-6: Agrupación en Desplegables de Fuentes (Inspector y Editor)
- En el selector de tipografías del Inspector lateral (`App.tsx`) y del modal de edición de cartas (`EditCardModal.tsx`):
  - Las fuentes se organizan con separadores `<optgroup>`:
    - `<optgroup label="Tipografías del Sistema">` (Inter, Roboto, Arial, Georgia, Times New Roman, Courier New, etc.)
    - `<optgroup label="Tipografías del Proyecto: Por Defecto">` (fuentes en "Por Defecto")
    - `<optgroup label="Tipografías del Proyecto: [Nombre]">` (para cada sección personalizada que contenga fuentes)
  - Solo se generan `<optgroup>` para secciones que tengan al menos una tipografía registrada.
  - El usuario puede seleccionar directamente la tipografía y aplicarla al diseño de la carta.

### RF-7: Persistencia y Serialización en ZIP
- En `project.json` de archivos `.cdc2` y `.cdc2t`:
  - `fontFolders`: array de nombres de secciones (default: `["Por Defecto"]`).
  - `customFonts`: array de objetos `CustomFont` con campo `folder?: string`.
- Al exportar como plantilla (`.cdc2t`), las tipografías del proyecto y sus secciones se conservan para que la plantilla mantenga su identidad gráfica completa.

---

## 3. Arquitectura y Modelo de Datos

### 3.1. Tipos en `shared/layoutEngine.ts`
```typescript
export interface CustomFont {
  id: string;
  nombre: string;
  filename: string;
  type: string;
  data?: string;   // base64
  src?: string;    // Object URL en runtime
  folder?: string; // Sección / Galería de tipografía (default: "Por Defecto")
}

export interface ProyectoCDC2 {
  // ...
  fontFolders?: string[]; // Galerías / Secciones de fuentes (default: ["Por Defecto"])
  customFonts?: CustomFont[];
}
```

### 3.2. Formato en `project.json`
```json
{
  "version": "2.1.0",
  "fontFolders": ["Por Defecto", "Títulos", "Textos"],
  "customFonts": [
    {
      "id": "font_cinzel",
      "nombre": "Cinzel Decorative",
      "filename": "CinzelDecorative-Bold.ttf",
      "type": "font/ttf",
      "folder": "Títulos",
      "data": "..."
    },
    {
      "id": "font_im_fell",
      "nombre": "IM Fell English",
      "filename": "IMFellEnglish-Regular.ttf",
      "type": "font/ttf",
      "folder": "Textos",
      "data": "..."
    }
  ]
}
```

---

## 4. Estrategia de Verificación y Pruebas (`SRS095GaleriaTipografiasSecciones.test.tsx`)

1. **RF-1:** Verifica que `MenuBar.tsx` exponga el texto `"🔤 Galería de Tipografías..."`.
2. **RF-2:** Verifica que el modal renderice las pestañas fijas y dinámicas de `fontFolders`.
3. **RF-3:** Valida la creación de una sección vacía, su renombrado y el borrado seguro con reubicación a `"Por Defecto"`.
4. **RF-5:** Valida las operaciones de mover y copiar tipografías entre secciones.
5. **RF-6:** Valida la estructura de `<optgroup>` en los selectores de tipografías con tipografías del sistema y del proyecto organizadas por sección.
6. **RF-7:** Valida que `generarProyectoZip` preserve `fontFolders` y el atributo `folder` de cada fuente en `customFonts`.
7. **Regresión:** Ejecución completa de suites de tests existentes (`npm test`) y compilación limpia (`npm run client:build`).
