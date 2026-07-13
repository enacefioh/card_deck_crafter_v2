# Especificación Técnica - Corrección de Jerarquía de Capas en Editor (SRS-047)

Esta especificación detalla la solución a los problemas de ordenamiento y anidación de capas al añadir nuevos elementos y al moverlos (subir/bajar) dentro del árbol jerárquico del editor de diseño de plantillas.

---

## 1. Introducción y Objetivos
- **Propósito**: Resolver el bug en la edición de diseño de cartas donde los nuevos elementos siempre se insertan en el nivel superior (raíz), perdiendo la anidación en contenedores. Asimismo, corregir el comportamiento de subir/bajar capas para que respeten estrictamente el nivel de anidamiento de sus hermanos (mismo padre).
- **Objetivos de Diseño**:
  * **Anidamiento correcto**: Los elementos creados deben insertarse de acuerdo con el elemento seleccionado actual y su tipo.
  * **Consistencia Jerárquica**: Subir y bajar elementos no debe permitir romper las fronteras de su contenedor (`parentCapaId`).
  * **Rendimiento**: Realizar las mutaciones en un único paso del estado de React sobre el array de capas de la plantilla.

---

## 2. Requisitos Funcionales y Casos de Uso

### RF-1: Reglas de Inserción al Añadir Elementos
Al añadir una nueva capa (texto, imagen, contenedor, bloque) a través de la función `handleAddElement` de `EditCardModal.tsx`:
- **Caso 1: Sin selección** (`selectedLayerId === null`):
  * La nueva capa se insertará al final de la raíz (`parentCapaId = null`).
- **Caso 2: Contenedor seleccionado** (Capa seleccionada es de `tipo === "container"`):
  * La nueva capa se insertará **dentro** de este contenedor (`parentCapaId = contenedor_seleccionado.id`) en la última posición del sub-árbol.
- **Caso 3: Elemento no contenedor seleccionado** (Capa seleccionada de cualquier otro tipo):
  * La nueva capa compartirá el mismo padre que el elemento seleccionado (`parentCapaId = seleccionado.parentCapaId`).
  * Se insertará en la posición inmediatamente posterior a la del elemento seleccionado dentro de la lista general de capas de la plantilla.

### RF-2: Reglas de Desplazamiento (Subir/Bajar) en el Árbol
Al hacer clic en subir o bajar a través de la función `handleMoveCapa` de `EditCardModal.tsx`:
- El desplazamiento se restringe únicamente entre elementos hermanos que comparten exactamente el mismo `parentCapaId`.
- No se permite que un elemento suba o baje más allá de sus hermanos del mismo nivel de anidamiento (no puede escapar ni entrar en contenedores ajenos).
- **Criterio de Ordenamiento**:
  * Se filtra el conjunto de capas de la plantilla que comparten el mismo `parentCapaId`.
  * Se encuentra el índice del elemento a desplazar dentro de esa sublista de hermanos.
  * Si es "up", se intercambia su posición con el hermano inmediatamente anterior en la lista de hermanos.
  * Si es "down", se intercambia su posición con el hermano inmediatamente posterior en la lista de hermanos.
  * Una vez intercambiados en la lista de hermanos, se reconstruye el array completo de capas de la plantilla preservando el orden relativo resultante.

---

## 3. Arquitectura y Diseño de Datos
No se requieren cambios en las interfaces de datos; se mantienen `plantillaActiva.capas` y `parentCapaId: string | null`.

---

## 4. Estrategia de Verificación (Pruebas)

### 4.1. Pruebas Unitarias Automatizadas
- Crear/ampliar una suite de pruebas para verificar:
  * Inserción en la raíz cuando no hay selección.
  * Inserción dentro del contenedor cuando el contenedor está seleccionado.
  * Inserción como hermano posterior al elemento no contenedor seleccionado.
  * Movimiento correcto (subir/bajar) respetando el `parentCapaId` y su orden.

### 4.2. Pruebas Manuales (Checklist)
- [ ] Añadir un elemento sin seleccionar nada y verificar que queda en la raíz al final de la lista.
- [ ] Seleccionar un contenedor, añadir un elemento y comprobar que aparece tabulado debajo de este como su último hijo.
- [ ] Seleccionar un hijo dentro de un contenedor, añadir un elemento y verificar que se inserta justo después de este hijo manteniendo el mismo nivel de tabulación.
- [ ] Intentar mover un hijo de un contenedor hacia arriba cuando es el primero, comprobando que no sube por fuera del contenedor.
- [ ] Intentar mover un hijo hacia abajo cuando es el último, comprobando que no sale del contenedor.
