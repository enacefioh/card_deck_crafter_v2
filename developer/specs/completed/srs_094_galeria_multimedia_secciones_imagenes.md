# SRS-094: Galería Multimedia Unificada con Galerías al Mismo Nivel (Plantilla, Por Defecto, Personalizadas y Usuario), Mover/Copiar Recursos y Corrección de Separadores

**Estado**: Aprobado para Implementación  
**Fecha**: 2026-10-27  
**Autor**: Card Deck Crafter Team & AI Pair Programmer  
**Alcance**: Monorepo Frontend & Shared (`shared/src/layoutEngine.ts`, `client/src/App.tsx`, `client/src/MenuBar.tsx`, `client/src/App.css`, `client/src/index.css`, `client/src/services/projectZipService.ts`)  
**Versión**: `v2.261027.3`  

---

## 1. Introducción y Objetivos

### 1.1. Propósito
A medida que los proyectos de cartas crecen en complejidad gráfica (como barajas con decenas de ilustraciones, variaciones de criaturas, marcos, texturas e iconos), la acumulación de imágenes en una lista plana dentro del proyecto genera saturación visual y dificulta la localización de recursos específicos. Asimismo, existía una desconexión entre las imágenes asociadas a la plantilla estructural frente a los recursos generales del proyecto o los personales del usuario.

Esta especificación técnica introduce:
1. **Unificación del acceso multimedia** bajo la denominación única **"Galería Multimedia..."** en el menú superior *Recursos*.
2. **Nivel único y horizontal de pestañas de galerías**, situando al mismo nivel:
   - **Galería de la Plantilla:** Imágenes estructurales asociadas a la plantilla (fondos, marcos, texturas base) que se exportan y conservan al guardar el proyecto como plantilla (`.cdc2t`).
   - **Galería por Defecto:** Almacén general de imágenes del proyecto actual.
   - **Galerías Personalizadas del Usuario:** Carpetas creadas a medida dentro del proyecto (ej. *"Personajes"*, *"Ilustraciones"*, *"Fondos"*, o en el futuro *"Importado"*).
   - **Galería de Usuario:** Biblioteca de imágenes personales y globales del usuario.
3. **Persistencia y exportación diferenciada:** Al guardar como proyecto (`.cdc2`), se empaquetan todas las galerías; al guardar como plantilla (`.cdc2t`), se empaqueta **únicamente** la Galería de la Plantilla.
4. **Operaciones avanzadas en cada recurso:** Capacidad de **Mover a...** y **Copiar a...** imágenes entre cualquiera de las galerías existentes.
5. **Corrección de accesibilidad visual en separadores de sección (`<optgroup>`)**: Solución del defecto de fondo blanco con texto blanco en selectores nativos sobre temas oscuros.

### 1.2. Principios y Objetivos de Diseño
1. **Cero Pestañas Anidadas (Flat Tab Architecture):** La interfaz evita sub-pestañas complejas; todas las galerías se disponen en una única barra horizontal limpia:
   ```text
   [ 📄 Plantilla ]  [ 📦 Por Defecto ]  [ 📁 Personajes ]  [ 📁 Fondos ]  [ 👤 Usuario ]  [ ➕ Nueva Galería ]
   ```
2. **Separación Limpia de Activos (Plantilla vs. Proyecto):** Garantiza que una plantilla exportada (`.cdc2t`) sea ligera, autocontenida y no incluya ilustraciones pesadas del proyecto que no forman parte de su diseño estructural.
3. **Retrocompatibilidad 100%:** Cualquier proyecto `.cdc2` o `.cdc2t` existente sin galerías explícitas se carga asociando sus recursos automáticamente a *"Galería de la Plantilla"* o *"Galería por Defecto"*, sin pérdida de datos.
4. **Carpetas Vacías Persistentes:** El usuario puede crear galerías vacías antes de subir imágenes y éstas se mantienen al guardar el proyecto.
5. **Borrado Seguro con Reubicación:** Si el diseñador elimina una galería personalizada con recursos, éstos no se eliminan físicamente sino que se trasladan a la *"Galería por Defecto"*.

---

## 2. Requisitos Funcionales y Casos de Uso

### RF-1: Unificación de Entrada en Menú Superior
- En `MenuBar.tsx`, en el desplegable de **Recursos**:
  - El botón anterior *"Galería del Proyecto..."* se reemplaza por **"🖼️ Galería Multimedia..."**.
  - Al pulsar, se abre el diálogo modal centralizado de Galería Multimedia.

### RF-2: Barra de Pestañas Horizontal Unificada
- La cabecera del diálogo de Galería Multimedia presenta una barra de pestañas en un único nivel:
  1. **📄 Galería de la Plantilla:** Fija. Contiene los assets de la plantilla activa (`asset://`). Badge con conteo de imágenes.
  2. **📦 Por Defecto:** Fija. Contiene las imágenes generales del proyecto (`project_asset://`). Badge con conteo.
  3. **📁 [Galerías Personalizadas]:** Dinámicas. Ordenadas según creación en `assetFolders` (ej. *"Personajes"*, *"Fondos"*). Badge con conteo de cada una.
  4. **👤 Galería de Usuario:** Fija. Contiene las imágenes globales de la cuenta/navegador (`user_asset://`). Badge con conteo.
  5. **➕ Nueva Galería:** Botón ubicado al final de las pestañas para añadir una nueva sección vacía al proyecto.

### RF-3: Comportamiento y Persistencia Diferenciada por Tipo de Galería
1. **Galería de la Plantilla:**
   - Sus imágenes se serializan en el ZIP dentro de `assets/` con esquema `asset://`.
   - Si el usuario guarda el proyecto como plantilla (`asTemplate: true`), **únicamente** se incluyen en el archivo `.cdc2t` las imágenes de esta galería.
2. **Galerías del Proyecto (Por Defecto y Personalizadas):**
   - Sus imágenes se serializan en el ZIP dentro de `project_assets/` con esquema `project_asset://` y propiedad `folder` asociada.
   - Se guardan al guardar el proyecto completo (`.cdc2`), pero se excluyen al exportar como plantilla (`.cdc2t`).
3. **Galería de Usuario:**
   - Sus imágenes se serializan en `user_assets/` con esquema `user_asset://`.
   - Se omiten al exportar como plantilla (`.cdc2t`).

### RF-4: Creación, Renombrado y Eliminación de Galerías
1. **Creación (*+ Nueva Galería*):**
   - Solicita al usuario el nombre mediante input o modal prompt.
   - Valida que no esté vacío, que no coincida con los nombres reservados (*"Plantilla"*, *"Por Defecto"*, *"Usuario"*) ni con una galería ya existente.
   - Registra el nuevo nombre en `assetFolders` y activa la nueva pestaña de inmediato (iniciando vacía).
2. **Renombrado:**
   - Disponible en la cabecera de las galerías personalizadas (no permitido en Plantilla, Por Defecto ni Usuario).
   - Actualiza el nombre en `assetFolders` y en cascada el campo `folder` de todas las imágenes pertenecientes a dicha galería.
3. **Eliminación Segura:**
   - Disponible en las galerías personalizadas.
   - Si la galería contiene imágenes, se reubican automáticamente en la **Galería por Defecto** (`folder = "Por Defecto"`).
   - Se elimina el nombre de `assetFolders` y se activa la pestaña *"Por Defecto"*.

### RF-5: Carga y Arrastre Contextual de Archivos (Dropzone)
- La zona de subida y arrastre (*dropzone*) del modal detecta la galería actualmente activa:
  - Si la pestaña activa es **Galería de la Plantilla**, las imágenes subidas se registran como activos de plantilla.
  - Si la pestaña activa es **Galería de Usuario**, se registran en los `userAssets`.
  - Si la pestaña activa es **Por Defecto** o una **Galería Personalizada**, se registran en `projectAssets` con el atributo `folder` establecido en el nombre de la galería activa.

### RF-6: Operaciones en cada Tarjeta de Recurso: "Mover a..." y "Copiar a..."
- Cada miniatura de recurso (`.gallery-asset-item`) incluye controles de gestión:
  1. **Mover a Galería... (📁):**
     - Despliega un menú con las demás galerías disponibles (Plantilla, Por Defecto, Personalizadas y Usuario).
     - Al seleccionar el destino:
       - Si se mueve entre galerías de proyecto, se actualiza `folder = destino`.
       - Si se mueve entre ámbitos distintos (ej. de Proyecto a Plantilla o de Usuario a Proyecto), se realiza la conversión de esquema (`asset://`, `project_asset://` o `user_asset://`) y se traslada el recurso.
       - La imagen desaparece de la galería actual y se ubica en el destino.
  2. **Copiar a Galería... (📋):**
     - Despliega el listado de galerías destino.
     - Duplica el recurso creando un nuevo ID único y lo registra en la galería seleccionada, manteniendo intacto el original en la galería de origen.
  3. **Renombrar (✏️):** Permite cambiar el nombre del archivo.
  4. **Eliminar (✕):** Elimina el recurso de la galería.

### RF-7: Pestañas en el Selector de Imágenes de Cartas (`showSidebarGallerySelector`)
- Al hacer clic en un campo de imagen en el inspector lateral o en `EditCardModal`:
  - Se abre el selector modal con la misma barra horizontal de pestañas:
    `[ 📄 Plantilla ] [ 📦 Por Defecto ] [ 📁 Personajes ] ... [ 👤 Usuario ]`
  - Permite al diseñador navegar entre las carpetas del proyecto para asignar cualquier imagen rápidamente.
  - Al hacer clic en la miniatura, se asigna a la carta y se cierra el selector.

### RF-8: Corrección de Estilo y Contraste en Separadores `<optgroup>` y `<option>`
- En `index.css`:
  - Aplicar estilos explícitos para elementos `<optgroup>` y `<option>`:
    ```css
    optgroup {
      background-color: var(--bg-card);
      color: var(--accent-primary);
      font-weight: 700;
      font-size: 11px;
      letter-spacing: 0.5px;
      padding: 4px;
    }
    option {
      background-color: var(--bg-main);
      color: var(--text-primary);
      padding: 4px 8px;
    }
    ```
  - Resuelve de raíz el conflicto de fondo blanco con tipografía blanca del navegador en Windows, garantizando legibilidad inmediata en los desplegables de tipografías y listas agrupadas.

---

## 3. Arquitectura y Diseño de Datos

### 3.1. Tipos en `shared/src/layoutEngine.ts`
```typescript
export interface ProjectAsset {
  id: string;
  nombre: string;
  src: string;
  folder?: string; // Nombre de la galería del proyecto (default: "Por Defecto")
}

export interface ProyectoCDC2 {
  // ...
  assetFolders?: string[]; // Galerías personalizadas del proyecto (default: ["Por Defecto"])
  assets?: ProjectAsset[];       // Recursos de plantilla (assets/ -> asset://)
  projectAssets?: ProjectAsset[];// Recursos de proyecto y galerías personalizadas (project_assets/ -> project_asset://)
  // ...
}
```

### 3.2. Formato de Archivo `.cdc2` y `.cdc2t` (ZIP)
En `project.json`:
```json
{
  "version": "2.1.0",
  "meta": { "nombre": "Dinosaurios D&D 5e", ... },
  "assetFolders": ["Por Defecto", "Personajes", "Fondos"],
  "assets": [
    { "id": "template_asset_1", "nombre": "Marco_Monstruo.png", "src": "asset://Marco_Monstruo.png" }
  ],
  "projectAssets": [
    { "id": "p_asset_1", "nombre": "TRex_Apex.png", "src": "project_asset://TRex_Apex.png", "folder": "Personajes" },
    { "id": "p_asset_2", "nombre": "Selva_Brumosa.jpg", "src": "project_asset://Selva_Brumosa.jpg", "folder": "Fondos" },
    { "id": "p_asset_3", "nombre": "Icono_Garras.png", "src": "project_asset://Icono_Garras.png", "folder": "Por Defecto" }
  ]
}
```
- **Al exportar `.cdc2t` (Plantilla):** Se incluyen únicamente los archivos de `assets/` (`template_asset_1`), omitiendo `project_assets/` y `user_assets/`.

---

## 4. Estrategia de Verificación y Pruebas

### 4.1. Pruebas Unitarias Automatizadas (`client/src/SRS094GaleriaMultimediaSecciones.test.tsx`)
1. **Pestañas al mismo nivel:** Verifica que el modal renderice las pestañas fijas (Plantilla, Por Defecto, Usuario) y las dinámicas (`assetFolders`).
2. **Creación de nueva galería vacía:** Valida que se agregue a `assetFolders` y se active la nueva pestaña sin recursos iniciales.
3. **Mover a galería:** Comprueba que al mover una imagen entre carpetas de proyecto se actualice su atributo `folder`.
4. **Copiar a galería:** Valida que al copiar se genere un recurso duplicado con nuevo ID en la carpeta destino, conservando el original.
5. **Reubicación segura por borrado:** Verifica que al eliminar una galería personalizada sus assets se reubiquen en *"Por Defecto"*.
6. **Contraste de `<optgroup>`:** Valida que `index.css` aplique fondo oscuro y color contrastado en `optgroup` y `option`.

### 4.2. Pruebas de Integración y Empaquetado
1. Validación de `generarProyectoZip` con `asTemplate: true`: sólo empaqueta la Galería de la Plantilla.
2. Validación de `generarProyectoZip` con `asTemplate: false`: empaqueta todas las galerías con sus carpetas.
3. Ejecución del build de producción (`npm run build`).
4. Verificación interactiva en el contenedor Docker local (`cdc2_app`).
