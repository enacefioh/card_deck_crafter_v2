# SRS-070: Unificación de Campos en el Inspector del Editor de Cartas

## 1. Introducción y Objetivos
- **Propósito**: Simplificar radicalmente la experiencia de usuario (UX) en el modal de edición de cartas (`EditCardModal`). Actualmente, el inspector lateral duplica artificialmente los controles para capas de texto e imagen dividiéndolos en "Contenido/Anulación de la Carta" (Sección 1) y "Definición por Defecto de la Plantilla" (Sección 2). Esta dualidad provoca confusión recurrente (editar un campo creyendo que es el otro), un scroll vertical excesivo que oculta secciones críticas del diseño (como posición, dimensiones, bordes y jerarquías) y comportamientos impredecibles al guardar.
- **Objetivos de Diseño**:
  - **Principio WYSIWYG ("What You See Is What You Get")**: Unificar cada propiedad en un único control directo. Si el usuario modifica el texto o la imagen de una capa, está editando el valor real y visible de esa capa.
  - **Reducción Drástica de Scroll en el Inspector**: Eliminar más de 10 controles duplicados redundantes, recortando casi a la mitad la altura del panel lateral de propiedades.
  - **Consolidación Natural de Plantillas**: Al pulsar "Guardar plantilla en el proyecto", "Guardar como..." o exportar `.cdc2t`, los valores visibles actuales de la carta se consolidan directamente como los valores base de la plantilla.
  - **Creación Fluida de Nuevas Cartas**: Al instanciar una carta desde una plantilla, la nueva carta adopta los valores actuales con los que la plantilla fue guardada. Las correcciones de erratas se realizan de forma intuitiva editando una carta y guardando la plantilla actualizada.

---

## 2. Requisitos Funcionales y Casos de Uso

### RF-1: Unificación de Propiedades en Capas de Texto
- En el inspector de `EditCardModal`, para capas con `tipo === "text"`, se unifican las dos secciones en un único bloque limpio:
  1. **Texto**:
     - Un único control de entrada (`<textarea>` si es multilínea o `<input type="text">` si no lo es).
     - Integra el botón para insertar símbolos del proyecto (`🖼️`), selector popover de símbolos y soporte para formateo Markdown.
     - Botón de propiedad expuesta (`👁️`) asociado a `contenidoRaw` / texto.
  2. **Multilínea**:
     - Checkbox único para alternar entre texto de una sola línea o multilínea.
  3. **Tipografía**:
     - Un único selector `<select>` con fuentes estándar y fuentes del proyecto (`projectFonts`).
     - Botón de propiedad expuesta (`👁️`) para `fontFamily`.
  4. **Tamaño y Color**:
     - Un único selector numérico para el tamaño en puntos (`fontSizePt`).
     - Un único selector de color interactivo (`renderColorSelector`) para el color del texto.
     - Botón de propiedad expuesta (`👁️`) para `fontSizePt` y `color`.
  5. **Estilos y Alineación**:
     - Botones de estilo (Negrita, Cursiva, Subrayado) y botones de alineación (Izquierda, Centro, Derecha, Justificado).
     - Botón de propiedad expuesta (`👁️`) para `alineacion`.
  6. **Contorno de Texto (Outline)**:
     - Un único control de grosor numérico (px) y color de contorno (`textOutlineWidth`, `textOutlineColor`).
     - Botón de propiedad expuesta (`👁️`) para `textOutlineWidth`.

### RF-2: Unificación de Propiedades en Capas de Imagen
- En el inspector de `EditCardModal`, para capas con `tipo === "image"`:
  1. **Recurso de Imagen Único**:
     - Si la capa dispone de imagen:
       - Vista previa con miniatura clara (`objectFit: contain`).
       - Botón "Quitar Imagen" (limpia la imagen de la capa).
     - Si la capa no dispone de imagen:
       - Zona de soltar (dropzone) para subir archivos locales desde el equipo o arrastrar imágenes.
       - Botón "📂 Cargar desde Galería" para seleccionar recursos de la galería del proyecto o del usuario.
     - Botón de propiedad expuesta (`👁️`) asociado a `src`.
  2. **Modo de Ajuste**:
     - Un único selector `<select>` con las opciones: `cover` (Rellenar), `contain` (Contener) y `stretch` (Estirar).
     - Botón de propiedad expuesta (`👁️`) para `modoAjuste`.

### RF-3: Sincronización y Persistencia Unificada
- **Al editar en el Inspector**:
  - Modificar un campo actualiza tanto el estado temporal activo de la carta (`tempValoresCampos` / `tempCapasOverridesActivos`) como el modelo de la capa en la plantilla activa (`plantillaActiva.capas`).
- **Al pulsar "Guardar Carta"**:
  - Se persisten los valores actuales en la carta correspondiente (`valoresCampos`, `capasOverrides`) y la plantilla asociada.
- **Al pulsar "Guardar plantilla en el proyecto" o exportar (`.cdc2t`)**:
  - La función `prepararPlantillaParaExportacion` consolida los valores visibles actuales directamente en los atributos base de cada capa (`contenidoRaw`, `src`, `fontFamily`, `fontSizePt`, `color`, `alineacion`, etc.) y regenera la miniatura (`miniatura`).
- **Al crear una carta desde plantilla (`handleSelectTemplate`)**:
  - La nueva carta se inicializa copiando directamente los valores de las capas de la plantilla como contenido inicial.

---

## 3. Arquitectura y Cambios de Código

### 3.1. Archivo `client/src/EditCardModal.tsx`
- Refactorización del panel lateral (`inspector-sidebar`):
  - Sustituir las dos secciones separadas de capas de texto (líneas ~3050 a 3450) por un único bloque estructurado.
  - Sustituir las dos secciones separadas de capas de imagen (líneas ~3520 a 3785) por un único bloque estructurado.
  - Simplificar las funciones controladoras `onChange`: eliminar la duplicidad entre `setTempCapasOverridesActivos` y `handleUpdateCapaProp`, ejecutando una sincronización transparente de una sola vía.

### 3.2. Archivo `client/src/App.tsx`
- En `handleSelectTemplate`, asegurar que la inicialización de cartas copie los valores base de las capas de la plantilla sin depender de claves de campos separadas.

---

## 4. Estrategia de Verificación (Pruebas)

### 4.1. Pruebas Unitarias Automatizadas (`client/src/SRS070UnificacionCamposInspector.test.tsx`)
1. **Renderizado de Capa de Texto**: Verificar que existe exactamente un control de texto, un selector de tipografía y un selector de color (sin duplicados de "por defecto").
2. **Edición de Texto y Propiedades**: Comprobar que editar el texto actualiza el contenido visible en el lienzo y en el modelo.
3. **Renderizado de Capa de Imagen**: Verificar que existe una única zona de imagen / botón de galería (sin sección de imagen por defecto separada).
4. **Persistencia al Guardar Plantilla**: Verificar que al guardar una plantilla modificada, los nuevos textos e imágenes pasan a ser la definición base de la plantilla.
5. **Instanciación de Nueva Carta**: Verificar que añadir una carta a partir de la plantilla guardada contiene los valores actualizados.

### 4.2. Checklist de Verificación Manual
- [ ] Abrir el editor de una carta con capas de texto y comprobar que el inspector muestra un único bloque de texto sin duplicados.
- [ ] Modificar el texto, tipografía, tamaño y color; verificar que la previsualización se actualiza de inmediato.
- [ ] Abrir una capa de imagen y verificar que existe una única zona de carga/galería.
- [ ] Guardar la plantilla en el proyecto y añadir una nueva carta desde dicha plantilla; comprobar que la nueva carta nace con los valores actualizados.
- [ ] Verificar que la altura del inspector es compacta y no oculta los controles inferiores.
