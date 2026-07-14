# Especificación Técnica - Usabilidad de Campos Expuestos e Inspector (SRS-048)

Esta especificación detalla las mejoras de usabilidad en el editor de plantillas para simplificar la exposición de campos/variables de cartas y optimizar la edición de nombres de variables.

---

## 1. Introducción y Objetivos
- **Propósito**: Facilitar la edición y el descubrimiento de variables exponibles reduciendo los clics necesarios en el flujo del usuario.
- **Objetivos de Diseño**:
  * **Alternancia en Línea (Inline Toggle)**: Añadir un icono de ojo (👁️) junto a las propiedades clave en el inspector para alternar su exposición como variables de carta de manera directa.
  * **Alineación a la Derecha**: Colocar el icono del ojo alineado en el margen derecho del panel del inspector para formar una columna visual despejada y fácil de escanear.
  * **Tooltips Descriptivos**: Mostrar un tooltip al pasar el cursor sobre el ojo indicando la acción resultante (ej. "Exponer Contenido" o "Ocultar Contenido").
  * **Exposición por Defecto al Guardar**: Si el usuario no define campos expuestos explícitamente, rellenar automáticamente la configuración con las variables por defecto (textos expuestos como `contenidoRaw`, imágenes/selectores como `src`).
  * **Editor de Nombre de Variable en Cabecera**: Reemplazar el título estático de la capa en el inspector por un campo de texto de edición directa (nombre/clave de variable) estilizado y de mayor tamaño.

---

## 2. Requisitos Funcionales y Casos de Uso

### RF-1: Alternancia Directa de Campos Expuestos (Inline Toggle 👁️)
En la barra lateral del inspector (`EditCardModal.tsx`), para cada propiedad configurable:
- Al lado de los títulos de las secciones editables (ej. Contenido, Color, Tipografía, Dimensiones, etc.) o subtítulos específicos, se mostrará un botón con un icono de ojo (👁️).
- **Alineación y Estilo**:
  * El botón del ojo se ubicará en la parte derecha de la fila, alineado al extremo derecho (`margin-left: auto` o estructura flex con alineación horizontal externa) para que queden alineados verticalmente en columna.
  * Si la propiedad está expuesta (`ExposedProperty` existente para la capa actual y propiedad actual): se muestra el ojo totalmente opaco y con el color de acento (`var(--accent-primary)`).
  * Si no está expuesta: se muestra el ojo con una opacidad reducida (ej. `opacity: 0.3`).
- **Tooltip Dinámico**:
  * Al pasar el ratón por encima, se mostrará un tooltip (`title`) que indica dinámicamente la acción:
    * Si está expuesta: `"Ocultar [NombrePropiedad]"` (ej. `"Ocultar Contenido"`).
    * Si no está expuesta: `"Exponer [NombrePropiedad]"` (ej. `"Exponer Visibilidad"`).
- **Comportamiento**:
  * Al pulsar sobre el ojo se alternará el estado:
    * Si estaba expuesta: se elimina de la lista `exposedProperties`.
    * Si no estaba expuesta: se añade a `exposedProperties` con una etiqueta autogenerada (ej. `NombreCapa > Propiedad`).
  * El cambio se guarda inmediatamente en el estado de la plantilla.

### RF-2: Inicialización por Defecto en el Guardado
- Al hacer clic en "Guardar Cambios" (`handleSave` en `EditCardModal.tsx`):
  * Se verifica si la plantilla frontal (`tempPlantilla`) y trasera (`tempPlantillaTrasera`) tienen campos configurados en `exposedProperties`.
  * Si no tienen ninguna propiedad expuesta (array vacío o no definido), se generará automáticamente el listado por defecto.

### RF-3: Edición Directa del Nombre de Variable en Cabecera
- En la parte superior de la columna del inspector (`.inspector-layer-header`):
  * Reemplazar el elemento `<h3>{selectedCapa.nombre}</h3>` por un campo de entrada de texto interactivo (`<input>`).
  * **Estilo**: Tamaño de fuente grande (ej. `16px`), seminegrita, fondo transparente, sin bordes a excepción de una línea inferior punteada discreta.
  * **Comportamiento**:
    * Para capas de texto (`tipo === "text"`): al cambiar el valor se llamará a `handleUpdateCapaClave`.
    * Para otras capas: se modificará la propiedad `"nombre"` mediante `handleUpdateCapaProp`.
- Eliminar el campo redundante `"Nombre de Variable (Clave)"` de la sección "Definición de Plantilla".

---

## 3. Estrategia de Verificación (Pruebas)

### 3.1. Pruebas Unitarias Automatizadas
- Crear [EditCardModalExposed.test.tsx](file:///c:/Users/victo/proyectos/cdc2/client/src/EditCardModalExposed.test.tsx).

### 3.2. Pruebas Manuales (Checklist)
- [ ] Verificar que el ojo aparezca a la derecha de los encabezados de propiedades, alineado en columna.
- [ ] Hover sobre el ojo de Contenido y validar tooltip "Ocultar Contenido" o "Exponer Contenido".
