# SRS-036: Selección de Atributos Editables y Vista Simplificada de Edición

## Descripción del Problema
Cuando un maquetador crea una plantilla compleja, esta puede tener decenas de capas (fondos, contenedores, marcos, múltiples campos de texto e imágenes). Sin embargo, el usuario "editor" (que solo utiliza la plantilla para crear cartas) solo necesita modificar valores puntuales (como el título, descripción, fuerza/resistencia o la ilustración), sin riesgo de desalinear capas, alterar fuentes o cambiar colores accidentalmente.

Actualmente, no hay forma de filtrar o simplificar qué propiedades se exponen a un editor de cartas, forzándolo a usar el editor avanzado completo y navegar por el árbol de capas.

---

## Requisitos Funcionales

### RF-1: Estructura de Datos de Propiedades Expuestas
El objeto de plantilla (`Template`) incluirá una nueva propiedad `exposedProperties` que almacenará la lista de campos que el maquetador decide simplificar para la carta:
```typescript
interface ExposedProperty {
  layerId: string;      // ID de la capa a la que pertenece
  property: string;     // Propiedad expuesta (ej. "contenidoRaw" para texto, "src" para imagen, "color" para texto)
  label: string;        // Nombre legible personalizado (ej. "Nombre de la Carta", "Fuerza/Resistencia")
}
```

### RF-2: Panel de Configuración en el Editor de Plantillas (Modo Maquetador)
Para definir qué atributos exponer, el maquetador contará con una interfaz de configuración:

*   **Ubicación de Acceso**: Un botón en la barra superior o menú de opciones de la plantilla en `EditCardModal` titulado **"Configurar Campos Editables"**.
*   **Interfaz (Modal Dedicado - Opción Recomendada)**:
    *   **Estructura**: Abre un popup modal espacioso con una distribución de dos columnas (Transfer List).
    *   **Columna Izquierda (Disponibles)**: Lista de todos los atributos editables de las capas de la plantilla. Se agruparán por capa (ej. `[Texto] Nombre - Contenido`, `[Texto] Nombre - Color de Texto`, `[Imagen] Ilustración - Archivo`).
    *   **Columna Derecha (Expuestos/Seleccionados)**: Lista de atributos seleccionados que se mostrarán al editor.
    *   **Botones de Transferencia**: Flechas (`>` y `<`) para añadir o quitar propiedades seleccionadas (también mediante doble clic).
    *   **Ordenación**: Flechas de subir/bajar (`▲` y `▼`) para ordenar los campos de la columna derecha, determinando en qué orden se le mostrarán al editor final.
    *   **Renombrado (Etiquetas Legibles)**: Cada elemento en la columna derecha tendrá un campo de texto para que el maquetador asigne un nombre legible (ej. mapear `capa_texto_1.contenidoRaw` a `"Título de la Carta"`).

---

## Criterio de Ubicación y Flujo para el Editor Simplificado (Respuesta a Consulta de Diseño)

Para ofrecer una experiencia de usuario fluida y libre de distracciones, se proponen dos niveles de edición simplificada:

### Flujo 1: Edición Directa en el Lateral del Workspace Principal (`App.tsx`)
Cuando el usuario selecciona una carta en el lienzo o en la lista de cartas de la pantalla principal (`App.tsx`):
*   Si la carta está asociada a una plantilla con `exposedProperties` configurados, el panel lateral izquierdo o derecho del workspace principal (la **Sidebar** de la app) mostrará un panel dinámico de **"Edición Rápida"**.
*   Este panel contendrá directamente los inputs del formulario simplificado (inputs de texto, selectores de imágenes, etc.) ordenados y con las etiquetas legibles que configuró el maquetador.
*   El usuario puede modificar los valores en caliente y ver los cambios inmediatamente reflejados en el lienzo de impresión, **sin necesidad de abrir ningún modal**.

### Flujo 2: Modal de Edición Simplificada (Doble Clic)
Al hacer doble clic en una carta que tiene campos editables configurados:
*   En lugar de abrir el editor avanzado de capas directamente (`EditCardModal`), se abrirá una versión simplificada del modal (o el mismo modal pero con una vista por defecto del formulario de campos editables).
*   En esta vista, a la izquierda se previsualizará la carta a gran tamaño y a la derecha aparecerá únicamente el formulario simple de propiedades configuradas.
*   Se añadirá un botón **"Diseñar Plantilla (Avanzado)"** en una esquina para permitir a los maquetadores saltar al editor avanzado de capas cuando sea necesario.
*   Si la plantilla no tiene campos editables configurados, el sistema abrirá por defecto el editor avanzado directamente.
