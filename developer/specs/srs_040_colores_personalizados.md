# SRS-040: Colección de Colores Personalizados del Proyecto

**Estado: Completado**

## Descripción
Esta especificación define la adición de una colección de **colores personalizados** a nivel de proyecto. El objetivo es permitir a los usuarios guardar y nombrar sus propios colores para reutilizarlos de forma consistente en todo el proyecto (fondos, fuentes, bordes, bloques, etc.), evitando la necesidad de recordar o copiar manualmente códigos hexadecimales constantemente.

---

## Requisitos de Interfaz de Usuario (UI)

### RF-1: Opción de "Colores" en el Menú Superior
*   Se añadirá una nueva opción llamada **Colores** en el menú superior (componente `MenuBar`).
*   Al hacer clic, se abrirá un modal de gestión de colores del proyecto (`ProjectColorsModal`), similar al de Fuentes o de Recursos del proyecto.
*   En este modal, el usuario podrá:
    *   Ver la lista de colores guardados con su nombre descriptivo y una muestra visual.
    *   Eliminar colores existentes de la colección.
    *   Añadir un nuevo color personalizado asignándole:
        *   Un **Nombre descriptivo** (ej. "Rojo Primario", "Fondo Carta").
        *   Un **Valor de color** mediante el componente de colorpicker estándar y un input de texto hexadecimal.

### RF-2: Paleta de Colores en los selectores de color del Inspector
*   En todas las partes de la interfaz donde se configuren propiedades de color (Inspector de Propiedades, edición en lote, color de fuente, color de fondo, color de bordes, etc.), el selector de color se ampliará para ofrecer:
    *   Un selector desplegable (`<select>`) o una fila de botones de muestra interactivos con los **Colores Personalizados** guardados en el proyecto.
    *   La opción de usar un código manual mediante el selector nativo/picker actual (ej. "Personalizado...").
*   Al seleccionar uno de los colores personalizados guardados, el sistema vinculará su valor hexadecimal a la propiedad correspondiente del elemento.

---

## Estructura de Datos y Persistencia (Archivo .cdc2)
*   Los colores personalizados se almacenarán a nivel de proyecto (`Project`) bajo una nueva propiedad `projectColors` en el estado global.
*   **Persistencia Completa**: Al exportar/guardar el proyecto en formato comprimido `.cdc2`, la lista de colores guardados (id, nombre y valor hexadecimal) se empaquetará dentro del archivo del proyecto junto a las imágenes de la galería, tipografías personalizadas y metadatos del proyecto.
*   **Carga Automática**: Al importar/abrir un archivo `.cdc2`, el sistema parseará la lista de colores del proyecto y poblará la paleta de colores del usuario de forma inmediata.

```typescript
interface ProjectColor {
  id: string;      // Identificador único
  nombre: string;  // Nombre asignado por el usuario (ej. "Primario")
  valor: string;   // Valor hexadecimal del color (ej. "#ff0000")
}
```
