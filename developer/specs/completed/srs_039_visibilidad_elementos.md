# SRS-039: Propiedad de Visibilidad en Capas del Maquetador
**Estado: Completado**

## Descripción
Esta especificación define la adición de una propiedad de **visibilidad** aplicable a todas las capas y elementos de una plantilla (texto, imagen, contenedores y bloques vacíos). Permite ocultar elementos temporalmente o colapsarlos para que no ocupen espacio dentro del flujo del diseño (especialmente útil en layouts de contenedores dinámicos).

---

## Terminología y Estados de Visibilidad
Se proponen nombres técnicos estándar en desarrollo de software y sistemas de diseño para los tres estados:

1.  **`visible` (Visible)**:
    *   *Comportamiento*: El elemento se renderiza y ocupa su espacio correspondiente de forma normal.
    *   *Estado por defecto*: Todas las capas nuevas y existentes inician en este estado.
2.  **`hidden` (Invisible / Oculto)**:
    *   *Comportamiento*: El elemento no se visualiza (es transparente y no interactivo), pero **sí ocupa espacio** y mantiene sus dimensiones reservadas dentro del flujo del documento/contenedor.
    *   *CSS equivalente*: `visibility: hidden` (o `opacity: 0` combinado con desactivación de eventos de puntero).
3.  **`collapsed` (Eliminado / Colapsado)**:
    *   *Comportamiento*: El elemento no se visualiza y **no ocupa ningún espacio** en el diseño. El contenedor padre recalcula el flujo del layout ignorando por completo la capa colapsada.
    *   *CSS equivalente*: `display: none` (o altura y anchura `0px` con márgenes y paddings anulados).

---

## Requisitos de Interfaz de Usuario (UI)

### RF-1: Panel de Inspector de Propiedades
*   La propiedad de **Visibilidad** se mostrará como un selector desplegable (`<select>`) al **principio de todo** en la sección de propiedades de la capa seleccionada en el editor de plantillas.
*   Opciones seleccionables:
    *   `visible` (Etiqueta: "Visible")
    *   `hidden` (Etiqueta: "Invisible (reserva espacio)")
    *   `collapsed` (Etiqueta: "Eliminado (no ocupa espacio)")

### RF-2: Campos Editables Expuestos
*   La propiedad `visibilidad` (o `visibility` en el modelo) podrá ser expuesta como un campo editable más dentro del modal de configuración.
*   En la barra lateral derecha de la pantalla principal, si el campo está expuesto, se renderizará un selector desplegable idéntico para permitir al usuario cambiar la visibilidad de la carta o lote de cartas seleccionadas rápidamente.

---

## Requisitos de Renderizado (Motor de Layout)

*   El motor de maquetación de cartas (Canvas en el editor y motor de generación de PDF/imágenes) debe interpretar la propiedad `visibility` en cada capa:
    *   Si es `hidden`: omitir la pintura de su contenido, bordes, rellenos y fondos, pero conservar sus dimensiones de cálculo de área para el flujo de cajas.
    *   Si es `collapsed`: excluir la capa por completo del cálculo de flujo del motor de distribución (`layoutEngine.ts`).
