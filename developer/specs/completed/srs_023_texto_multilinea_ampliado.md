# Especificación Técnica - SRS-023: Capacidades Ampliadas y Clones de Diseño en Capas de Texto

## 1. Introducción y Objetivos
- **Propósito**: Ampliar las capacidades del elemento de texto (`tipo: "text"`) en el editor de cartas. Esta especificación añade soporte para formatear texto enriquecido en línea mediante sintaxis markdown simplificada (negrita, cursiva, subrayado) y reestructura el flujo de trabajo de diseño/contenido.
- **Objetivos de Diseño**:
  - **Soporte de Texto Enriquecido en Línea**: Permitir que dentro de un mismo bloque de texto se puedan aplicar estilos (negrita, cursiva, subrayado) a palabras individuales usando formato markdown:
    - Negrita: `**texto**`
    - Cursiva: `*texto*`
    - Subrayado: `__texto__`
  - **Clonación de Opciones de Diseño**: Al crear una carta (o asignar plantilla de reverso), las opciones de visualización (texto/contenido, alineación, color) se clonan desde la plantilla al estado propio de la carta (en el objeto de anulaciones de capas).
  - **Doble Pestaña**:
    - **Pestaña de Diseño**: Modifica los valores por defecto de la plantilla (útil para cuando se exporte la plantilla `.cdc2t`).
    - **Pestaña de Contenido**: Modifica la copia individualizada de la carta actual (alineación, color, texto).

---

## 2. Requisitos Funcionales y Casos de Uso

### RF-1: Formato de Texto Enriquecido en Línea (Markdown Simple)
- **RF-1.1**: Se implementará un parser ligero en el frontend y en el backend para interpretar la sintaxis markdown en las capas de texto:
  - `**palabra**` ➔ `<strong>palabra</strong>`
  - `*palabra*` ➔ `<em>palabra</em>`
  - `__palabra__` ➔ `<u>palabra</u>`
  - Saltos de línea `\n` ➔ `<br />`
- **RF-1.2**: El renderizado de las capas de texto en el lienzo, la vista de detalle y la exportación a PDF utilizará la inserción de HTML interno seguro (`dangerouslySetInnerHTML` en React o HTML directo en el backend) tras escapar caracteres HTML básicos para prevenir fallos de maquetación o inyección.

### RF-2: Clonación y Edición Independiente en Pestaña de Contenido
- **RF-2.1**: Al añadir una nueva carta desde plantilla, o al asignar una plantilla de reverso, se inicializarán los diccionarios de overrides de capas (`capasOverrides` y `capasOverridesTrasera`) de la carta pre-llenando las propiedades para todas las capas de texto con sus valores actuales de la plantilla:
  - `color`: El color configurado en la plantilla.
  - `alineacion`: La alineación configurada en la plantilla.
  - `contenidoRaw`: El texto base/contenido configurado en la plantilla.
  - `fontFamily`: La tipografía/familia configurada en la plantilla.
  - `fontSizePt`: El tamaño de fuente configurado en la plantilla.
- **RF-2.2**: En la **Pestaña de Contenido** del inspector:
  - Los campos de texto, alineación, color, tipografía y tamaño modificarán directamente los valores de la carta (`capasOverrides[capaId]`).
  - Estos controles siempre mostrarán y editarán el valor clonado/específico de la carta actual. No hay necesidad de un estado de "Anulado/Heredado".
- **RF-2.3**: En la **Pestaña de Diseño** del inspector:
  - Los controles seguirán editando directamente las propiedades de la plantilla (`carta.plantilla` o `carta.plantillaTrasera`).
  - Al exportar la plantilla (`onExportTemplate`), se exportarán estos valores por defecto de diseño.
- **RF-2.4**: Se añadirá un icono de información (ℹ️) junto al título del campo de texto de contenido con un tooltip (`title`) explicativo indicando cómo dar formato: `**negrita**`, `*cursiva*` y `__subrayado__`.

### RF-3: Resolución de Capas en Renderizado
- **RF-3.1**: Al renderizar, si existen valores en `capasOverrides` (o `capasOverridesTrasera`) para `color`, `alineacion` o `contenidoRaw`, se usarán prioritariamente sobre las propiedades de la capa base de la plantilla. Si no existen (ej. proyectos antiguos), se adoptará el valor de la plantilla.

---

## 3. Estado de la Especificación
- **Estado**: 🟢 Completado y Validado (Sesión actual)
