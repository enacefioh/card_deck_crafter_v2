# Especificación Técnica - SRS-059: Carga Múltiple, Drag & Drop y Autotagged en Galería de Símbolos

- **ID del Requerimiento**: SRS-059
- **Módulo**: Galería de Símbolos (`SymbolsGalleryModal`)
- **Estado**: 🟢 Completado
- **Fecha de Registro**: 2026-08-06
- **Fecha de Resolución**: 2026-08-06

---

## 1. Introducción y Objetivos
Actualmente, añadir símbolos a la Galería de Símbolos (`Recursos > Galería de Símbolos`) resulta farragoso cuando se dispone de un conjunto amplio de iconos: obliga a introducir el identificador (*tag*) manualmente uno por uno antes de seleccionar cada imagen.

- **Objetivo 1**: Rediseñar el modal `SymbolsGalleryModal.tsx` eliminando el input previo de tag y convirtiendo la zona de subida en un área interactiva **Drag & Drop** (Dropzone) que permita cargar **múltiples imágenes simultáneamente**.
- **Objetivo 2**: Asignar automáticamente como *tag* el nombre de cada archivo (sin extensión). En caso de existir un tag duplicado en la galería o en la selección múltiple, sufijar automáticamente un número secuencial (ej. `icono` -> `icono2`, `icono3`).

---

## 2. Requisitos Funcionales Implementados

- **RF-1: Carga Múltiple y Drag & Drop en `SymbolsGalleryModal`**:
  - Sustituida la fila individual de `Input Tag + Botón Seleccionar Archivo` por un área de Dropzone (`<input type="file" multiple accept="image/*">` estilizado con área de arrastre).
  - Permite arrastrar varios archivos de imagen a la vez o hacer clic en el área para seleccionar múltiples archivos desde el explorador del sistema.

- **RF-2: Generación Automática y Desduplicación de Tags**:
  - Para cada archivo procesado:
    1. Extrae el nombre base del archivo sin extensión (ej. `fuego.png` -> `fuego`).
    2. Sanea espacios y caracteres no válidos.
    3. Comprueba si el tag ya existe en la lista de símbolos del proyecto.
    4. Si está libre lo asigna directamente, y si está ocupado busca secuencialmente `fuego2`, `fuego3`, etc., hasta encontrar un tag disponible.

- **RF-3: Mantenibilidad y Edición de Tags Existentes**:
  - Conserva la capacidad de editar o corregir el tag y eliminar el símbolo individualmente en la lista inferior tras la carga masiva.

---

## 3. Archivos Implicados
- [`client/src/SymbolsGalleryModal.tsx`](file:///c:/Users/victo/proyectos/cdc2/client/src/SymbolsGalleryModal.tsx): Rediseño del modal con Dropzone múltiple y lógica de desduplicación secuencial de tags.
- [`client/src/App.css`](file:///c:/Users/victo/proyectos/cdc2/client/src/App.css): Compactación visual puntual del inspector lateral (`padding: 2px 0`).
- [`client/src/App.tsx`](file:///c:/Users/victo/proyectos/cdc2/client/src/App.tsx): Reducción del gap a `2px` en el inspector contextual.
- [`client/src/MenuBar.tsx`](file:///c:/Users/victo/proyectos/cdc2/client/src/MenuBar.tsx): Incremento de versión a `v2.260806.1`.

---

## 4. Criterios de Aceptación
- [x] En la Galería de Símbolos, ya no aparece el input de tag previo antes de seleccionar archivo.
- [x] El modal presenta una zona Dropzone que permite arrastrar o seleccionar múltiples imágenes a la vez.
- [x] Al seleccionar `icono.png`, `escudo.png` y `fuego.png`, los símbolos se crean automáticamente con tags `icono`, `escudo` y `fuego`.
- [x] Si ya existe el tag `icono`, subir de nuevo `icono.png` asigna automáticamente el tag `icono2`.
- [x] La suite de tests automatizados pasa limpiamente (81 tests pasando).
