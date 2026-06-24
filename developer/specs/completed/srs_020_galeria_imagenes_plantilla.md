# Especificación Técnica - SRS-020: Galería de Imágenes de Plantilla

## 1. Introducción y Objetivos
- **Propósito**: Permitir que las plantillas contengan una galería interna de recursos de imagen (iconos, símbolos de maná, ilustraciones por defecto, texturas de fondo, reversos de cartas, etc.) que se empaqueten directamente con la plantilla al exportarla (`.cdc2t`) y se importen de forma transparente al cargarla en el proyecto.
- **Objetivos de Diseño**:
  - **Cohesión**: Que la plantilla funcione como un paquete de recursos autosuficiente.
  - **Experiencia de Usuario (UX)**: Evitar que el usuario tenga que buscar y subir los mismos iconos repetidamente; en su lugar, se seleccionan con un clic desde la galería pre-cargada.
  - **Facilidad de Integración**: Ofrecer una interfaz de arrastrar y soltar para la carga, y un selector visual en mosaico para la asignación rápida en capas de imagen.

---

## 2. Requisitos Funcionales y Casos de Uso

### RF-1: Estructura y Almacenamiento de Galería en la Plantilla
- **RF-1.1**: El objeto de plantilla se extenderá con una propiedad `assets` (un array de objetos):
  ```typescript
  interface TemplateAsset {
    id: string;      // Identificador único (ej: asset_1719203920)
    nombre: string;  // Nombre original del archivo (ej: icono_espada.png)
    src: string;     // URL local del Blob en memoria (blob:http://...)
  }
  ```
- **RF-1.2**: Al exportar la plantilla (`.cdc2t`), todos los archivos listados en `assets` se guardarán dentro de la carpeta `assets/` del archivo ZIP. Sus referencias de `src` en el JSON se guardarán como `asset://<nombre_archivo>`.
- **RF-1.3**: Al importar una plantilla (`.cdc2t`), se leerán todos los archivos del directorio `assets/` en el ZIP, se convertirán en Blob URLs y se poblará el array `assets` en el objeto de la plantilla.

### RF-2: Panel de "Galería de la Plantilla" en el Editor
- **RF-2.1**: En la columna derecha (panel de propiedades de la carta), debajo de todas las secciones existentes, se agregará una nueva sección fija llamada **Galería de la Plantilla**.
- **RF-2.2**: Esta sección tendrá un botón **Gestionar Galería de Plantilla**.
- **RF-2.3**: Al pulsarlo, se abrirá un popup/modal interactivo que mostrará:
  - Un área de arrastrar y soltar (dropzone) para subir nuevas imágenes.
  - Un mosaico de miniaturas (grid) con las imágenes ya cargadas en la galería de la plantilla activa.
  - Un botón de eliminación (🗑️) sobre cada miniatura para borrarla de la galería.

### RF-3: Selector de Imágenes para Capas (Cargar desde Galería)
- **RF-3.1**: En el inspector de propiedades, al seleccionar una capa de tipo `"image"`, debajo del área tradicional de arrastrar archivo de imagen de la carta, se añadirá el botón **Cargar desde Galería**.
- **RF-3.2**: Al pulsarlo, se abrirá un popup modal con un mosaico de las imágenes disponibles en la galería de la plantilla.
- **RF-3.3**: Al hacer clic en cualquiera de las imágenes, su Blob URL se asignará directamente como el valor de la propiedad `src` de la capa (o su override en la carta), cerrándose el popup automáticamente.
- **RF-3.4**: Si la galería de la plantilla está vacía, el botón se mostrará deshabilitado o mostrará un mensaje indicando que no hay imágenes cargadas en la plantilla.

---

## 3. Interfaces de Componentes / UI

- **Estructura HTML en el Inspector derecho (EditCardModal.tsx)**:
  ```html
  <div className="inspector-gallery-section">
    <h4>Galería de la Plantilla</h4>
    <button onClick={...}>🖼️ Gestionar Galería ({plantillaActiva.assets?.length || 0})</button>
  </div>
  ```
- **Botón de selección en la capa de imagen**:
  ```html
  <div className="image-source-options">
    <div className="dropzone-file">...</div>
    <button 
      className="btn-select-from-gallery"
      disabled={!plantillaActiva.assets || plantillaActiva.assets.length === 0}
      onClick={...}
    >
      📂 Elegir de la Galería
    </button>
  </div>
  ```

---

## 4. Estrategia de Verificación (Pruebas)

### 4.1. Pruebas Unitarias
- Validar en `projectUtils.test.ts` que al clonar o duplicar cartas con plantillas que contienen la propiedad `assets`, esta se copia adecuadamente (clonación profunda).

### 4.2. Pruebas Manuales / Criterios de Aceptación
- [ ] Abrir el modal de edición de una carta.
- [ ] Hacer clic en **Gestionar Galería de Plantilla**. Arrastrar 2 o 3 imágenes. Comprobar que aparecen en la cuadrícula de miniaturas en tiempo real.
- [ ] Cerrar el modal, seleccionar una capa de imagen, hacer clic en **Elegir de la Galería**. Seleccionar una imagen y confirmar que la capa en el lienzo central se actualiza con la imagen elegida.
- [ ] Exportar la plantilla (`.cdc2t`), borrar la plantilla local, volver a importarla y verificar que la galería de la plantilla conserva todas las imágenes subidas previamente.
