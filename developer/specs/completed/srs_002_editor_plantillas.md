# Especificación Técnica - SRS-002: Editor de Cartas e Interfaz de Plantillas (Revisado)

## 1. Introducción y Objetivos
- **Módulo**: Composición Interactiva de Plantillas en Editor y Serialización de Recursos (.cdc2t).
- **Propósito**: Integrar la personalización de la estructura visual de la plantilla directamente dentro del modal de edición de cartas (`EditCardModal`), permitiendo añadir elementos de texto dinámicos, maquetar su posición/tamaño y tipografías en tiempo real, y exportar/importar plantillas como archivos empaquetados compartibles (`.cdc2t`).
- **Objetivos de Diseño**:
  - **Edición Inline**: El usuario diseña la plantilla al mismo tiempo que maqueta y edita una carta, reduciendo fricción.
  - **Aislamiento de Maquetación vs. Contenido**: El modal divide las propiedades en dos vistas: la de contenido (valores dinámicos específicos de esta carta) y la de diseño (posición, tamaño y estilos aplicados a la plantilla).
  - **Portabilidad (.cdc2t)**: Exportar e importar plantillas como paquetes independientes y reutilizables.

---

## 2. Requisitos Funcionales y Casos de Uso

### RF-1: Plantilla Base del Módulo Default
- **RF-1.1**: Añadir al módulo de plantillas por defecto ("default") la plantilla más básica posible: una carta vacía que solo tiene una capa de fondo (`background`) cuyo color se puede anular, sin campos de texto ni elementos prefijados.

### RF-2: Adición Interactiva de Elementos
- **RF-2.1**: En la columna izquierda de la jerarquía de capas de `EditCardModal`, añadir un botón de "Añadir elemento".
- **RF-2.2**: Mostrar un popup/diálogo superpuesto para seleccionar el tipo de elemento a añadir:
  - **Texto de una línea**.
  - **Texto multilínea**.
- **RF-2.3**: Insertar el nuevo elemento a continuación del elemento actualmente seleccionado, o al final de la lista si no hay selección.
- **RF-2.4**: Reglas de inicialización del elemento:
  - Posicionamiento: Centrado horizontalmente en la carta.
  - Ancho: 90% del ancho de la carta.
  - Alto (Texto de una línea): Altura estándar por defecto (ej. `8mm`).
  - Alto (Texto multilínea): 30% de la altura de la carta.

### RF-3: Pestañas del Inspector de Propiedades
La columna derecha de `EditCardModal` presentará dos pestañas:
1. **Contenido (Inspector original)**:
   - Para capas de fondo: Color de relleno de esta carta.
   - Para capas de texto dinámicas: Valor de la variable para esta carta concreta (ej: el texto a mostrar).
2. **Diseño / Maquetación (Layout)**:
   - **Clave / Nombre de Variable**: El identificador de la variable asociada (ej. `titulo`, `fuerza`, `descripcion`, `coste`). Cambiar este nombre actualiza automáticamente la interpolación y el explorador de capas.
   - **Dimensiones físicas**: Posición (`x`, `y`) y tamaño (`ancho`, `alto`) en milímetros (mm).
   - **Estilo de Texto**: Familia de fuente, tamaño de fuente (en pt), alineación (izquierda, centro, derecha, justificado).

### RF-4: Exportación de Plantillas (.cdc2t)
- **RF-4.1**: En la parte inferior de la columna de jerarquía de capas, añadir un botón de "Exportar Plantilla".
- **RF-4.2**: Solicitar al usuario un nombre para la plantilla mediante un cuadro de diálogo.
- **RF-4.3**: Generar y descargar un archivo `.cdc2t` (un ZIP que contiene `template.json` con los metadatos y capas de la plantilla).
- **RF-4.4**: Hacer la plantilla temporalmente disponible en el proyecto actual bajo la sección de "Plantillas Importadas".

### RF-5: Importación de Plantillas (.cdc2t)
- **RF-5.1**: En la barra de menú general (`MenuBar`), añadir la opción de "Importar Plantilla (.cdc2t)".
- **RF-5.2**: Validar que el archivo tenga la extensión `.cdc2t` y contenga una estructura JSON de plantilla válida en su interior.
- **RF-5.3**: Añadir la plantilla al catálogo de plantillas disponibles en el proyecto actual.
- **RF-5.4**: Al añadir una nueva carta desde plantilla o usar plantilla como reverso, listar estas plantillas en una sección titulada "Plantillas Importadas", justo debajo de las plantillas "default".

---

## 3. Modelo de Datos y Archivo (.cdc2t)

El archivo `.cdc2t` es un contenedor comprimido (ZIP) que contiene en su raíz el archivo `template.json`.

### Estructura de `template.json`
```json
{
  "id": "template_uuid_key",
  "nombre": "Nombre de la Plantilla",
  "anchoMm": 63.5,
  "altoMm": 88.9,
  "camposConfig": [
    {
      "clave": "nombre_campo",
      "nombreLegible": "Nombre del Campo",
      "tipo": "text",
      "valorDefecto": ""
    }
  ],
  "capas": [
    {
      "id": "capa_id",
      "nombre": "Título de la capa",
      "visible": true,
      "tipo": "text",
      "xMm": 5,
      "yMm": 5,
      "anchoMm": 53.5,
      "altoMm": 8,
      "fontFamily": "Inter",
      "fontSizePt": 12,
      "color": "#000000",
      "alineacion": "center",
      "bold": false,
      "italic": false,
      "contenidoRaw": "{{nombre_campo}}"
    }
  ]
}
```
