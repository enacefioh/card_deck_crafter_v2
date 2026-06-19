# Especificación Técnica - SRS-009: Selección y Edición Avanzada de Cartas (Acciones en Lote, Ordenación y Detalle)

## 1. Introducción y Objetivos
- **Módulo**: Gestor de Selección y Acciones Contextuales (Card Selection & Contextual Operations Engine).
- **Propósito**: Proveer una interfaz interactiva de selección individual y múltiple sobre el listado de cartas en la barra lateral. Permite realizar operaciones en lote (eliminar, duplicar, reasignar) y de ordenación (mover posición) manteniendo la consistencia de las caras traseras y el flujo de cuadrícula, además de ofrecer una vista detallada de inspección.
- **Objetivos de Diseño**:
  - **Eficiencia de Flujo**: Optimizar el espacio visual eliminando redundancias en la barra lateral e integrando estadísticas globales en la barra de menú superior.
  - **Robustez de Re-ordenación**: Asegurar que las operaciones de movimiento de cartas contiguas preserven las relaciones posicionales y reajusten automáticamente el layout para la impresión.
  - **UX Desktop-Grade**: Soportar atajos rápidos y controles contextuales dinámicos que se habiliten/deshabiliten según el estado de selección.

---

## 2. Requisitos Funcionales y Casos de Uso

### RF-1: Limpieza Visual e Integración de Menús
- **RF-1.1**: Eliminar el encabezado decorativo superior de la barra lateral izquierda (`.sidebar-header` con el título "Card Deck Crafter v2") puesto que ya se muestra en la barra de menú superior. El listado de cartas y controles ocuparán todo el alto disponible de la barra lateral.
- **RF-1.2**: Simplificar la barra de herramientas del lienzo (`.workspace-toolbar`):
  - Eliminar el botón "Exportar PDF" (ya centralizado en el menú Archivo).
  - Mover la información de distribución de hojas ("Hojas: X") a la sección de badges de estado a la derecha de la barra de menú superior (`MenuBar`). El nuevo formato de badges de estado será: `[ Hojas: X ] [ Cartas: Y ] [ Zoom: Zx ]`.

### RF-2: Selección Individual y Múltiple
- **RF-2.1**: Al hacer clic en un elemento de carta en la lista lateral, esta quedará "seleccionada".
- **RF-2.2**: Soporte de multiselección:
  - Cada item de la carta tendrá un checkbox visual de selección en su miniatura o esquina.
  - Si el usuario mantiene pulsada la tecla `Ctrl` (o `Cmd` en Mac) o `Shift` mientras hace clic, se sumará o restará la carta a la selección activa.
- **RF-2.3**: Agregar dos botones globales sobre la lista de cartas:
  - **Seleccionar Todas**: Marca todas las cartas del listado como seleccionadas.
  - **Deseleccionar**: Limpia toda la selección.
  - *(Opcional Sugerido)* **Invertir Selección**: Invierte el estado de selección de la lista.

### RF-3: Acciones Contextuales y Operaciones
Cuando existan cartas seleccionadas, se mostrará una barra de acciones rápidas contextuales sobre el listado, con los siguientes comportamientos:

- **RF-3.1: Editar (Inspección en Detalle)**:
  - *Disponibilidad*: Activo solo si hay **exactamente una** carta seleccionada.
  - *Comportamiento*: Abre un popup/modal emergente centrado.
  - *Contenido del Modal*:
    - Previsualización grande de la cara frontal y la cara trasera (si tiene) una al lado de la otra.
    - Cuadro de metadatos de la carta: nombre, dimensiones físicas actuales en milímetros, márgenes de sangrado, color y grosor del borde de corte.
- **RF-3.2: Eliminar**:
  - *Disponibilidad*: Activo si hay **una o más** cartas seleccionadas.
  - *Comportamiento*: Elimina las cartas seleccionadas. **Requisito crítico**: Antes de proceder con el borrado de las cartas y sus reversos, el sistema mostrará un cuadro de confirmación (`window.confirm`) advirtiendo al usuario de la acción. Si confirma, se eliminan y el resto de las cartas se desplazan secuencialmente para rellenar los huecos.
- **RF-3.3: Mover Anterior / Arriba**:
  - *Disponibilidad*: Activo si las cartas seleccionadas son contiguas (o es una sola) y hay al menos una carta antes de la selección.
  - *Comportamiento*: Mueve el bloque de cartas seleccionadas una posición hacia arriba/anterior en la lista, desplazando la carta inmediatamente anterior a la posición posterior de la selección.
- **RF-3.4: Mover Posterior / Abajo**:
  - *Disponibilidad*: Activo si las cartas seleccionadas son contiguas (o es una sola) y hay al menos una carta después de la selección.
  - *Comportamiento*: Mueve el bloque de cartas seleccionadas una posición hacia abajo/posterior en la lista, desplazando la carta inmediatamente posterior a la posición anterior de la selección.
- **RF-3.5: Duplicar**:
  - *Disponibilidad*: Activo si hay **una o más** cartas seleccionadas.
  - *Comportamiento*: Crea una copia exacta de cada carta seleccionada (incluyendo sus cantidades y reverso individual) e inserta la copia inmediatamente después de la carta de origen.

### RF-4: Acciones Adicionales y Atajos de Teclado
- **RF-4.1: Asignar Reverso en Lote**:
  - *Disponibilidad*: Activo si hay **dos o más** cartas seleccionadas y el reverso individual está activo.
  - *Comportamiento*: Botón para seleccionar una imagen trasera y aplicarla como reverso individual a todas las cartas seleccionadas simultáneamente.
- **RF-4.2: Integración en Menú "Edición" con Atajos**:
  - Se extenderá el submenú de **Edición** en la barra superior (`MenuBar`) para incluir las siguientes opciones con sus atajos de teclado visualizados en la etiqueta:
    - *Seleccionar Todo* (`Ctrl + A`)
    - *Deseleccionar Todo* (`Esc`)
    - *Invertir Selección* (`Ctrl + I`)
    - *Separador*
    - *Duplicar Selección* (`Ctrl + D`)
    - *Eliminar Selección* (`Supr` / `Delete`)
    - *Mover Selección Arriba* (`Alt + ↑`)
    - *Mover Selección Abajo* (`Alt + ↓`)
  - El sistema detectará las pulsaciones de estas teclas a nivel global (siempre que el foco no esté dentro de un input de texto) y ejecutará la acción correspondiente.


---

## 3. Diseño de la Interfaz del Modal de Inspección
El modal se estructurará de la siguiente forma:
```
┌─────────────────────────────────────────────────────────────┐
│ DETALLE DE CARTA: [Nombre de Carta]                    [ X ]│
├──────────────────────────────┬──────────────────────────────┤
│                              │                              │
│  [ PREVISUALIZACIÓN FRENTE ] │  [ PREVISUALIZACIÓN REVERSO ]│
│                              │                              │
├──────────────────────────────┴──────────────────────────────┤
│ DETALLES FÍSICOS Y DE COMPOSICIÓN:                          │
│ - Dimensiones de Carta: 63.5 x 88.9 mm                      │
│ - Margen de Sangrado: 3 mm                                  │
│ - Borde de Corte: 1.5 mm (Color: #000000)                   │
│ - Cantidad en Baraja: [ 5 ] copias                          │
└─────────────────────────────────────────────────────────────┘
```

---

## 4. Estrategia de Verificación (Pruebas)

### 4.1. Pruebas Unitarias (Vitest)
1. **Lógica de Desplazamiento (Mover Arriba/Abajo)**:
   - Entrada: Lista de cartas `[A, B, C, D]`, selección `[B, C]` (bloque contiguo).
   - Movimiento: Arriba.
   - Salida esperada: `[B, C, A, D]`.
2. **Duplicado Secuencial**:
   - Entrada: Lista `[A, B, C]`, selección `[A, C]`.
   - Salida esperada: `[A, A_copia, B, C, C_copia]`.

### 4.2. Pruebas Manuales (Checklist)
- [ ] Verificar que no aparece el encabezado de Card Deck Crafter v2 en la barra lateral.
- [ ] Confirmar que el número de hojas está a la derecha en la barra superior.
- [ ] Seleccionar una carta y comprobar que se activan "Editar", "Eliminar", "Duplicar" y los botones de mover (si la posición lo permite).
- [ ] Probar el botón "Editar", verificar que el modal muestra frontal y reverso side-by-side junto a las dimensiones correctas.
- [ ] Seleccionar múltiples cartas (con `Ctrl + Click` o checkboxes) y presionar "Duplicar". Verificar que se duplica cada una a su lado correspondiente.
