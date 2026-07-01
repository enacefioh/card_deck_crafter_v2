# SRS-030: Personalización y Atributos de Bloques Vacíos

## Descripción del Problema
Anteriormente, los bloques vacíos (`"block"`) se consideraban elementos no editables a nivel de variable de nombre y estilos de fondo, mostrándose con un nombre genérico/aleatorio en la jerarquía lateral y sin controles estéticos.

## Requisitos Funcionales

### RF-1: Nombre de Capa en la Pestaña de Diseño
*   En la pestaña de **Diseño** del Inspector de Propiedades para capas de tipo bloque vacío (`"block"`), se añade el input "Nombre del Bloque". Esto permite al usuario asignarle un nombre identificativo de variable que se reflejará en la jerarquía lateral de capas de la plantilla.

### RF-2: Personalización de Relleno, Bordes y Esquinas
*   En la pestaña de **Diseño**, se habilitan las secciones de "Bordes de la Capa", "Redondear Esquinas" y "Color de Fondo de la Capa" para los bloques vacíos. Esto permite al usuario usar los bloques para decoraciones, separadores o formas personalizadas rellenas de color.
