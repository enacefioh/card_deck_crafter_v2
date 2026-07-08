# SRS-042: Opciones de Colapso para las Barras Laterales del Editor

**Estado: Completado**

## Descripción
Esta especificación define la capacidad de colapsar la barra lateral izquierda (Importar/Crear/Listar Cartas) y la barra lateral derecha (Edición en Lote) de la interfaz principal de la aplicación. En su estado colapsado, ambas barras se encogerán hasta convertirse en una columna estrecha de iconos de acceso directo para maximizar el área visible del lienzo central.

---

## Requisitos de Interfaz de Usuario (UI)

### RF-1: Barra Lateral Izquierda Colapsable
*   **Botón de Alternar**: Se añadirá un botón para colapsar/expandir en la esquina o cabecera de la barra izquierda (ej. `◀` para colapsar, `▶` para expandir).
*   **Estado Colapsado**:
    *   La barra lateral izquierda se encogerá a un ancho mínimo (ej. `50px` - `60px`).
    *   Se ocultará todo el contenido detallado (listado de cartas, dropzones grandes, títulos).
    *   Se mostrará una columna vertical con accesos rápidos:
        1.  **Icono de Expandir**: Ubicado arriba del todo, vuelve a expandir la barra lateral.
        2.  **Icono para Importar Caras Frontales (📥)**: Abre el selector de archivos local.
        3.  **Icono para Añadir Carta desde Plantilla (✨)**: Abre el modal de selección de plantillas.
    *   **Título Flotante (`title`)**: Al pasar el ratón por encima de los iconos en modo colapsado, se mostrará el tooltip nativo del navegador con la descripción de la acción (ej. "Importar Caras Frontales (Imágenes)", "Añadir Carta desde Plantilla").

### RF-2: Barra Lateral Derecha Colapsable
*   **Botón de Alternar**: Se añadirá un botón en la barra lateral derecha (`▶` para colapsar, `◀` para expandir).
*   **Estado Colapsado**:
    *   La barra lateral derecha se encogerá a un ancho mínimo idéntico.
    *   Se ocultará el formulario de edición en lote/detalles.
    *   Por ahora, solo se mostrará un único icono en la parte superior:
        1.  **Icono de Expandir**: Vuelve a expandir la barra lateral.

### RF-3: Comportamiento del Contenedor del Lienzo
*   Al colapsar o expandir cualquiera de las barras laterales, el lienzo central y su marco contenedor deben redimensionarse de forma fluida y reajustar su área de trabajo de forma automática (haciendo uso de flexbox o CSS Grid ya implementado).

---

## Estructura de Datos (React State)
Se añadirán dos nuevos estados en `App.tsx` para controlar el colapso:
```typescript
const [leftSidebarCollapsed, setLeftSidebarCollapsed] = useState<boolean>(false);
const [rightSidebarCollapsed, setRightSidebarCollapsed] = useState<boolean>(false);
```

---

## Plan de Verificación

### Pruebas Manuales
1.  **Colapso Izquierdo**: Hacer clic en el botón de colapsar de la barra izquierda. Comprobar que se reduce a una columna vertical y solo muestra los iconos `◀/▶`, `📥` y `✨`.
2.  **Acciones Rápidas**: Hacer clic en el icono `📥` en modo colapsado y validar que abre el explorador de archivos. Hacer clic en `✨` y validar que se abre el selector de plantillas.
3.  **Tooltips**: Posicionar el cursor sobre el icono `✨` en modo colapsado y comprobar que muestra el tooltip nativo "Añadir Carta desde Plantilla".
4.  **Colapso Derecho**: Colapsar la barra derecha y verificar que el formulario desaparece y se muestra el botón de expansión.
5.  **Redimensión**: Verificar que el lienzo central se expande ocupando el espacio liberado por las barras colapsadas.
