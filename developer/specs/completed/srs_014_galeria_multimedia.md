# Especificación Técnica - SRS-014: Galería Multimedia de Proyecto

## 1. Introducción y Objetivos
- **Propósito**: Permitir que el proyecto en su totalidad (`.cdc2`) contenga una galería global de recursos de imagen (ilustraciones de cartas, retratos de personajes, logotipos del juego, etc.). Estas imágenes se guardarán a nivel del archivo del proyecto para que no se pierdan al compartir el `.cdc2` y se puedan reutilizar en cualquier carta del proyecto independientemente de su plantilla.
- **Objetivos de Diseño**:
  - **Reutilización**: Compartir recursos visuales comunes a nivel de toda la baraja para evitar duplicación de archivos.
  - **Portabilidad**: Al guardar el proyecto `.cdc2`, todos los assets de la galería de proyecto se comprimirán dentro de la carpeta `project_assets/` del ZIP, asegurando que el proyecto funcione en cualquier ordenador sin depender de rutas locales de archivos.

---

## 2. Requisitos Funcionales y Casos de Uso

### RF-1: Estructura del Proyecto y Almacenamiento
- **RF-1.1**: El objeto `ProyectoCDC2` se extenderá con una propiedad `assets` (un array de recursos globales del proyecto):
  ```typescript
  interface ProjectAsset {
    id: string;
    nombre: string;
    src: string; // Blob URL local en memoria o project_asset://...
  }
  ```
- **RF-1.2**: Al guardar el proyecto, se guardarán los archivos en la carpeta `project_assets/` del ZIP y sus referencias se almacenarán como `project_asset://<nombre_archivo>`.

### RF-2: Panel de "Galería del Proyecto" en el Menú Principal
- **RF-2.1**: En la barra de menú superior, se añadirá una pestaña o botón de **Galería del Proyecto**.
- **RF-2.2**: Abrirá un panel/popup central donde el usuario podrá importar en lote decenas de ilustraciones para las cartas, borrarlas o renombrarlas.

### RF-3: Selector de Imágenes Tabulado en las Cartas
- **RF-3.1**: En el editor de cartas (`EditCardModal.tsx`), al hacer clic en **Cargar desde Galería** (tanto para anulación de imagen de carta como para asignar recursos en una capa de tipo *Switch*), el popup selector de la galería presentará **dos pestañas**:
  1. **Imágenes del Proyecto**: Mostrará los recursos gráficos subidos a nivel de proyecto (`projectAssets`).
  2. **Imágenes de la Plantilla**: Mostrará los recursos locales de la plantilla activa (`plantillaActiva.assets`).
- **RF-3.2**: Al seleccionar una imagen de cualquiera de las pestañas, se asignará a la capa o se agregará a la lista de opciones (en caso del switch).

---

## 3. Estado de la Especificación
- **Estado**: 🟢 Completada y Validada (Sesión actual)
