# SRS-093: Menú Contextual para Cartas en la Mesa de Trabajo (Lienzo)

**Estado**: Completado  
**Fecha**: 2026-10-27  
**Autor**: Card Deck Crafter Team & AI Pair Programmer  
**Alcance**: Frontend (`client/src/components/CardContextMenu.tsx`, `client/src/components/CardContextMenu.css`, `client/src/App.tsx`, `client/src/App.css`)  
**Versión**: `v2.261027.2`  

---

## 1. Introducción y Objetivos

### 1.1. Propósito
Actualmente, para realizar acciones sobre una o varias cartas en el lienzo principal (como duplicar, eliminar, mover de posición o inspeccionar detalles), el usuario debe recurrir a la barra de menú superior (`MenuBar`) o a la barra de herramientas del workspace (`.workspace-toolbar`). 

Esta especificación técnica introduce un **menú contextual nativo de la aplicación** que se despliega al hacer clic derecho (`contextmenu`) sobre cualquier carta del lienzo, agilizando el flujo de trabajo tanto para cartas individuales como para selecciones múltiples de cartas.

### 1.2. Objetivos de Diseño
1. **Acceso Inmediato en el Punto de Acción**: El menú contextual emerge en las coordenadas `(x, y)` del cursor sobre la carta pulsada, evitando desplazamientos a la barra de herramientas superior.
2. **Respeto y Gestión de Selección Inteligente**:
   - Si la carta sobre la que se hace clic derecho **no está seleccionada**, se deseleccionan las anteriores y pasa a ser la única carta seleccionada, abriendo el menú para ella.
   - Si la carta sobre la que se hace clic derecho **ya forma parte de una selección múltiple**, se conserva la selección completa y las opciones del menú se aplican sobre todo el lote seleccionado.
3. **Paridad con las Opciones del Menú Superior**: Incorpora las acciones clave ya existentes en la barra de menú:
   - **Ver Detalles**: Abre el visor / modal de inspección detallada (`DetailModal`), disponible para selecciones individuales.
   - **Duplicar**: Duplica la carta o cartas seleccionadas (`handleDuplicarSeleccion`).
   - **Mover Selección Arriba**: Desplaza las cartas seleccionadas una posición hacia arriba (`handleMoverSeleccion("arriba")`).
   - **Mover Selección Abajo**: Desplaza las cartas seleccionadas una posición hacia abajo (`handleMoverSeleccion("abajo")`).
   - **Eliminar**: Elimina la carta o grupo de cartas seleccionadas (`handleEliminarSeleccion`).
4. **Prevención de Desbordamiento de Pantalla (View Boundary Safety)**: Ajusta automáticamente su posición si el clic ocurre cerca de los bordes derecho o inferior del viewport para no salirse de la ventana.
5. **Cierre Natural y Accesibilidad**: Se cierra automáticamente al pulsar fuera (`mousedown`), al pulsar la tecla `Escape` o al ejecutar cualquiera de sus acciones.

---

## 2. Requisitos Funcionales y Casos de Uso

### RF-1: Disparo de Menú Contextual al Clic Derecho en Carta
- Al hacer clic con el botón derecho (`contextmenu`) sobre una cara de carta (anverso o reverso en `.card-slot`):
  - Se previene el menú contextual predeterminado del navegador (`e.preventDefault()`).
  - Se detiene la propagación del evento (`e.stopPropagation()`).
  - Se determina la selección de cartas según el estado previo:
    - Si `cartaId` no está en `selectedCardIds`, se actualiza la selección para que únicamente contenga `cartaId`.
    - Si `cartaId` ya está en `selectedCardIds`, se mantiene la selección existente.
  - Se abre el menú contextual en la posición del puntero del ratón.

### RF-2: Opciones del Menú Contextual y Estado Habilitado/Deshabilitado
1. **Ver Detalles**:
   - Icono: `🔍`.
   - Habilitado únicamente cuando hay exactamente 1 carta seleccionada (`selectedCount === 1`).
   - Al pulsar: abre `DetailModal` para la carta seleccionada y cierra el menú.
2. **Duplicar**:
   - Icono: `👥`. Texto: *"Duplicar"*.
   - Habilitado si hay al menos 1 carta seleccionada (`selectedCount > 0`).
   - Atajo visible: `Ctrl+D`.
   - Al pulsar: ejecuta `handleDuplicarSeleccion()` y cierra el menú.
3. **Mover Selección Arriba**:
   - Icono: `⬆️`. Texto: *"Mover Arriba"*.
   - Habilitado si `puedeMoverArriba === true`.
   - Atajo visible: `Alt+↑`.
   - Al pulsar: ejecuta `handleMoverSeleccion("arriba")` y cierra el menú.
4. **Mover Selección Abajo**:
   - Icono: `⬇️`. Texto: *"Mover Abajo"*.
   - Habilitado si `puedeMoverAbajo === true`.
   - Atajo visible: `Alt+↓`.
   - Al pulsar: ejecuta `handleMoverSeleccion("abajo")` y cierra el menú.
5. **Eliminar**:
   - Icono: `🗑️`. Texto: *"Eliminar"*.
   - Habilitado si hay al menos 1 carta seleccionada (`selectedCount > 0`).
   - Atajo visible: `Supr`.
   - Estilo visual de peligro (`color: var(--text-danger)`).
   - Al pulsar: ejecuta `handleEliminarSeleccion()` y cierra el menú.

### RF-3: Posicionamiento Seguro y Cierre del Menú
- El menú calcula su posición considerando el ancho y alto del menú (aprox. 210px x 200px) contra `window.innerWidth` y `window.innerHeight`.
- Si `clientX + menuWidth > window.innerWidth`, se alinea hacia la izquierda del cursor.
- Si `clientY + menuHeight > window.innerHeight`, se alinea hacia arriba del cursor.
- Se cierra automáticamente:
  - Al hacer clic en cualquier lugar fuera del menú (`mousedown`).
  - Al pulsar la tecla `Escape`.
  - Al hacer scroll en la mesa de trabajo o zoom.

---

## 3. Arquitectura y Componentes

### 3.1. Componente `CardContextMenu.tsx`
Componente presentacional y de gestión de eventos ubicado en `client/src/components/CardContextMenu.tsx`:
```typescript
interface CardContextMenuProps {
  x: number;
  y: number;
  selectedCount: number;
  puedeMoverArriba: boolean;
  puedeMoverAbajo: boolean;
  onVerDetalles: () => void;
  onDuplicar: () => void;
  onMoverArriba: () => void;
  onMoverAbajo: () => void;
  onEliminar: () => void;
  onClose: () => void;
}
```

### 3.2. Estilos `CardContextMenu.css`
Clases compatibles con la estética Deep Space / Sleek Dark del sistema:
- `.card-context-menu`: Contenedor flotante con `position: fixed`, `z-index: 10000`, fondo translúcido con desenfoque (`backdrop-filter: blur(10px)`), borde sutil y sombras de elevación.
- Reutiliza `.menu-item`, `.menu-separator`, `.menu-item-icon` y `.menu-item-shortcut`.

---

## 4. Estrategia de Verificación y Pruebas

### Pruebas Automatizadas (`client/src/SRS093CardContextMenu.test.tsx`):
1. **Renderizado y Posicionamiento**: Comprobar que el menú contextual se renderiza en las coordenadas indicadas con `role="menu"` o clase `.card-context-menu`.
2. **Acción Ver Detalles**: Habilitada con 1 carta seleccionada y deshabilitada con selección múltiple.
3. **Acción Duplicar**: Ejecuta el callback y cierra el menú.
4. **Acción Eliminar**: Ejecuta el callback y cierra el menú.
5. **Mover Arriba / Abajo**: Respeta los flags `puedeMoverArriba` y `puedeMoverAbajo`.
6. **Cierre con Escape y Clic Exterior**: Se invoca `onClose` al pulsar `Escape` o mousedown exterior.
