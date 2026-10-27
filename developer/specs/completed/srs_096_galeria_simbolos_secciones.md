# SRS-096: Galería de Símbolos con Secciones Personalizadas, Mover/Copiar y Separadores en Helper de Inserción

**Estado**: Completado  
**Fecha**: 2026-10-27  
**Autor**: Card Deck Crafter Team & AI Pair Programmer  
**Alcance**: Monorepo Frontend & Shared (`shared/layoutEngine.ts`, `client/src/SymbolsGalleryModal.tsx`, `client/src/App.tsx`, `client/src/EditCardModal.tsx`, `client/src/services/projectZipService.ts`, `client/src/App.css`)  
**Versión**: `v2.261027.6`  

---

## 1. Introducción y Objetivos

### 1.1. Propósito
Siguiendo la arquitectura de recursos por secciones introducida en la **Galería Multimedia (SRS-094)** y la **Galería de Tipografías (SRS-095)**, esta especificación aborda la **Galería de Símbolos**.

En juegos de mesa, TCGs y juegos de rol, los símbolos o glifos inline `{tag}` son componentes esenciales del diseño textual:
- Símbolos de coste y recursos (e.g. Maná, Energía, Oro, Puntos de Acción).
- Iconos de atributos y estadísticas (e.g. Ataque, Defensa, Velocidad, Vida).
- Iconos de condiciones y efectos (e.g. Veneno, Aturdimiento, Escudo).
- Iconos de facciones, casas o rarezas.

Tener todos los símbolos en un único listado plano dentro del proyecto dificulta su localización y mantenimiento. Además, al insertar símbolos en textos descriptivos desde los campos de edición mediante el popover `🖼️`, un listado extenso sin categorización entorpece el flujo de trabajo del diseñador.

Esta especificación técnica introduce:
1. **Pestañas horizontales al mismo nivel (Flat Tab Architecture)** en `SymbolsGalleryModal.tsx`:
   ```text
   [ 📦 Por Defecto (N) ]  [ 📁 Maná (N) ]  [ 📁 Atributos (N) ]  [ 📁 Condiciones (N) ]  [ ➕ Nueva Galería ]
   ```
2. **Gestión integral de galerías**: Creación de nuevas galerías vacías, renombrado en cascada y borrado seguro con reubicación automática de símbolos a *"Por Defecto"*.
3. **Reubicación y duplicación**: Acciones contextuales en cada tarjeta de símbolo para **📁 Mover a galería...** y **📋 Copiar a galería...** (asegurando `tag` único).
4. **Carga contextual por pestaña**: Subir o arrastrar iconos vincula los nuevos símbolos directamente a la pestaña activa.
5. **Separadores visuales discretos y legibles en el helper de inserción (`symbols-helper-popover`)**: En el Inspector lateral (`App.tsx`) y en el editor de cartas (`EditCardModal.tsx`), los símbolos se organizan por secciones con encabezados de alto contraste oscuro (evitando problemas de contraste o textos ilegibles).
6. **Persistencia y retrocompatibilidad total**: Serialización de `symbolFolders` y `ProjectSymbol.folder` en `project.json` dentro de `.cdc2` y `.cdc2t`, con inicialización segura en `"Por Defecto"` para proyectos existentes.

---

## 2. Requisitos Funcionales y Casos de Uso

### RF-1: Menú Superior de Recursos
- En `MenuBar.tsx`, bajo el menú **Recursos**, se mantiene la opción **"🧸 Galería de Símbolos..."**.
- Al pulsarse, se abre la ventana modal de gestión de símbolos.

### RF-2: Barra de Pestañas Horizontal al Mismo Nivel
- La ventana `SymbolsGalleryModal.tsx` incorpora una barra de navegación con pestañas horizontales uniformes:
  1. **📦 Por Defecto:** Pestaña inicial y fija del proyecto. Muestra badge con conteo de símbolos pertenecientes a esta sección.
  2. **📁 [Galerías Personalizadas]:** Secciones dinámicas listadas en `symbolFolders` (ej. *"Maná"*, *"Atributos"*, *"Facciones"*). Cada una con su badge de conteo.
  3. **➕ Nueva Galería:** Botón ubicado al final de las pestañas para crear una nueva sección vacía.
- Al abrir el modal, la pestaña activa por defecto es `"Por Defecto"`.

### RF-3: Gestión Completa de Galerías de Símbolos
1. **Creación (*+ Nueva Galería*):**
   - Solicita el nombre mediante prompt del sistema.
   - Valida que no esté vacío, no coincida con *"Por Defecto"* (case-insensitive) y no exista previamente en `symbolFolders`.
   - Registra el nuevo nombre en `symbolFolders` y conmuta la vista activa a la nueva sección creada.
2. **Renombrado de Galería:**
   - Botón **✏️ Renombrar Galería** visible en la barra de herramientas cuando está activa una galería personalizada.
   - Solicita el nuevo nombre, valida restricciones y actualiza en cascada `symbolFolders` y la propiedad `folder` de todos los símbolos pertenecientes a dicha sección.
3. **Eliminación Segura:**
   - Botón **🗑️ Eliminar Galería** disponible para galerías personalizadas (la galería `"Por Defecto"` está protegida contra borrado).
   - Solicita confirmación y reubica automáticamente todos los símbolos de la sección eliminada en la galería `"Por Defecto"` (`folder = "Por Defecto"`).
   - Elimina la sección de `symbolFolders` y activa la pestaña `"Por Defecto"`.

### RF-4: Carga y Arrastre Contextual de Archivos (Dropzone)
- La zona de subida y drag & drop de `SymbolsGalleryModal` procesa imágenes (`image/*`) redimensionándolas a un máximo de 100x100 píxeles.
- Cada archivo subido se asocia de forma inmediata a la galería actualmente activa: `folder: activeSymbolTab || "Por Defecto"`.

### RF-5: Operaciones Avanzadas en Cada Tarjeta de Símbolo
Cada elemento de la lista de símbolos dentro del modal cuenta con:
1. **Miniatura:** Vista previa de la imagen del símbolo (`src`).
2. **Tag y Renombrado:** Visualización del tag `{tag}` con botón para editar tag (asegurando unicidad en el proyecto).
3. **📁 Mover a galería...:** Selector desplegable con las demás galerías del proyecto. Traslada el símbolo cambiando su `folder`.
4. **📋 Copiar a galería...:** Selector desplegable para clonar el símbolo en otra sección:
   - Clona la imagen (`src` o dataUrl).
   - Asigna un nuevo `id` único (`symbol_${Date.now()}_...`).
   - Genera un `tag` único (e.g. si `{fuego}` ya existe en el proyecto, genera `{fuego_2}`).
   - Establece `folder` en la galería de destino.
5. **🗑️ Eliminar:** Elimina el símbolo del proyecto previa confirmación.

### RF-6: Separadores Discretos en el Popover de Inserción (`symbols-helper-popover`)
- En el Inspector lateral (`App.tsx`) y en el editor de cartas (`EditCardModal.tsx`), cuando el usuario pulsa `🖼️` para insertar un símbolo en un textarea o input:
  - Los símbolos se listan ordenados por sus secciones definidas en `symbolFolders`.
  - Para cada carpeta que contenga al menos un símbolo, se muestra un encabezado/separador discreto:
    - Texto legible con el nombre de la sección (ej. `📁 Maná` o `📦 Por Defecto`).
    - Estilo de alto contraste: fondo oscuro (`var(--bg-card)` o `var(--bg-main)`), texto claro/accent (`var(--text-secondary)` / `var(--accent-primary)`), bordes sutiles.
    - Se prohíbe explícitamente cualquier combinación de texto blanco sobre fondo blanco.
  - Las carpetas vacías no generan encabezado en el popover.

### RF-7: Persistencia y Serialización en ZIP
- En `project.json` de archivos `.cdc2` y plantillas `.cdc2t`:
  - `symbolFolders`: array con los nombres de las secciones (por defecto `["Por Defecto"]`).
  - `projectSymbols`: array de objetos `ProjectSymbol` con `folder: sym.folder || "Por Defecto"`.
- Al exportar como plantilla (`.cdc2t`), los símbolos del proyecto y sus carpetas se conservan para que la plantilla conserve todos sus glifos e iconos preconfigurados.
- **Retrocompatibilidad**: Al abrir proyectos creados con versiones anteriores:
  - Si `symbolFolders` está ausente o vacío, se inicializa como `["Por Defecto"]`.
  - Si algún símbolo no tiene la propiedad `folder`, se le asigna `"Por Defecto"`.

---

## 3. Modelo de Datos y Tipos

### 3.1. `shared/layoutEngine.ts`
```typescript
export interface ProjectSymbol {
  id: string;
  tag: string;
  src: string;
  folder?: string; // Nombre de la galería/sección (por defecto: "Por Defecto")
}

export interface PlantillaCDC2 {
  // ...
  symbolFolders?: string[]; // Lista de nombres de galerías de símbolos
  projectSymbols?: ProjectSymbol[];
}

export interface ProyectoCDC2 {
  // ...
  symbolFolders?: string[]; // Lista de nombres de galerías de símbolos
  projectSymbols?: ProjectSymbol[];
}
```

### 3.2. Formato Serializado en `project.json`
```json
{
  "version": "2.1.0",
  "symbolFolders": [
    "Por Defecto",
    "Costes de Maná",
    "Atributos",
    "Facciones"
  ],
  "projectSymbols": [
    {
      "id": "symbol_1730040001",
      "tag": "mana_fuego",
      "src": "/api/symbols/symbol_1730040001.png",
      "folder": "Costes de Maná"
    },
    {
      "id": "symbol_1730040002",
      "tag": "ataque",
      "src": "/api/symbols/symbol_1730040002.png",
      "folder": "Atributos"
    }
  ]
}
```

---

## 4. Arquitectura de Componentes

```
┌────────────────────────────────────────────────────────┐
│                      MenuBar                           │
│       Recursos > 🧸 Galería de Símbolos...             │
└──────────────────────────┬─────────────────────────────┘
                           │
                           ▼
┌────────────────────────────────────────────────────────┐
│               SymbolsGalleryModal.tsx                  │
│  [ 📦 Por Defecto (2) ] [ 📁 Maná (4) ] [ ➕ Nueva ]   │
│  ┌──────────────────────────────────────────────────┐  │
│  │ Dropzone contextual (asigna a la pestaña activa) │  │
│  │ Lista de símbolos filtrada por la pestaña activa │  │
│  │  - Icono miniatura + {tag} (editar tag)          │  │
│  │  - Desplegable [📁 Mover a...]                   │  │
│  │  - Desplegable [📋 Copiar a...]                  │  │
│  │  - Botón [🗑️ Eliminar]                           │  │
│  └──────────────────────────────────────────────────┘  │
└──────────────────────────┬─────────────────────────────┘
                           │
       ┌───────────────────┴───────────────────┐
       ▼                                       ▼
┌────────────────────────┐           ┌────────────────────────┐
│   Inspector Lateral    │           │     EditCardModal      │
│  (symbols-helper-      │           │  (symbols-helper-      │
│   popover con          │           │   popover con          │
│   separadores oscuros) │           │   separadores oscuros) │
└────────────────────────┘           └────────────────────────┘
```

---

## 5. Plan de Pruebas Automatizadas (`client/src/SRS096GaleriaSimbolosSecciones.test.tsx`)

Se implementará una suite de pruebas con Vitest verificando:
1. **RF-1:** Existencia del acceso en `MenuBar.tsx` con el título *"🧸 Galería de Símbolos..."*.
2. **RF-7:** Serialización y deserialización en `generarProyectoZip`:
   - Persistencia de `symbolFolders` en `project.json`.
   - Persistencia de `folder` en cada elemento de `projectSymbols`.
   - Inicialización automática de `["Por Defecto"]` cuando `symbolFolders` no está definido.
   - Asignación retrocompatible de `folder: "Por Defecto"` a símbolos antiguos sin carpeta.
3. **RF-3 y RF-5:** Lógica de gestión de galerías y operaciones de símbolos:
   - Creación de nueva galería vacía (evitando duplicados).
   - Renombrado en cascada de una galería.
   - Operación de mover símbolo a otra galería.
   - Operación de copiar símbolo a otra galería garantizando tag único.
   - Borrado seguro de una galería con reubicación de sus símbolos a `"Por Defecto"`.
4. **RF-6:** Verificación de separadores por sección en el popover de símbolos (`symbols-helper-popover`), asegurando clases de estilo oscuro y alto contraste.

---

## 6. Criterios de Aceptación

1. El modal de Galería de Símbolos presenta pestañas horizontales al mismo nivel con sus conteos respectivos.
2. Es posible crear galerías vacías, renombrarlas y eliminarlas de forma segura sin pérdida de símbolos.
3. Los símbolos se pueden mover y copiar entre galerías directamente desde cada fila/tarjeta.
4. Al pulsar `🖼️` en cualquier campo de texto, el popover muestra los símbolos clasificados por su sección con separadores visualmente discretos y texto legible de alto contraste.
5. El empaquetado en archivo `.cdc2` y plantillas `.cdc2t` guarda y recupera la estructura completa de galerías de símbolos sin alterar la compatibilidad con versiones previas.
