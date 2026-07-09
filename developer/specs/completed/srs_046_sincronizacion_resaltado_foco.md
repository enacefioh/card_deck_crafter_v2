# Especificación Técnica - Resaltado Bidireccional y Foco Rotativo (SRS-046)

Esta especificación describe la implementación de una interacción fluida y bidireccional entre las capas visuales de la carta en el lienzo y los campos de propiedad correspondientes en el inspector lateral derecho.

---

## 1. Introducción y Objetivos
- **Propósito**: Facilitar la edición intuitiva de propiedades asociando visualmente las capas de la carta con sus inputs de control en el inspector derecho.
- **Objetivos de Diseño**:
  * **Resaltado Bidireccional al pasar el ratón (Hover Sync)**: Pasar el ratón sobre un elemento del lienzo resalta sus inputs en el inspector, y viceversa.
  * **Rotación y Foco al Hacer Clic**: Hacer clic sobre un elemento del lienzo desplaza el inspector (scroll) y enfoca alternativamente (rota) los inputs asociados a esa capa.
  * **Rendimiento**: Evitar re-renderizados pesados y mantener el lienzo fluido usando selectores CSS y clases dinámicas.
  * **Estado del Panel**: Tanto el resaltado bidireccional como el foco y scroll rotativos al hacer clic solo estarán activos cuando la barra lateral derecha esté **expandida** (no colapsada).

---

## 2. Requisitos Funcionales y Casos de Uso

### RF-1: Resaltado de Inputs al Hover en el Lienzo
- Al pasar el puntero sobre cualquier capa visible de una carta en el lienzo (texto, imagen, contenedor, etc.), se debe añadir una clase de resaltado a los campos del formulario en el inspector que estén vinculados a dicha capa.
- Para identificar la vinculación, se usará el `capaId` o el par `capaId` + `propiedad`.
- Visualmente, el campo del inspector debe mostrar un borde destacado sutil (ej. borde de 1.5px de color de acento o sombra sutil) y un fondo ligeramente más claro para indicar la relación.

### RF-2: Resaltado de Capas en el Lienzo al Hover en el Inspector
- Al pasar el puntero sobre un campo de propiedades en el inspector (input, select, textarea o su contenedor de fila), se deben resaltar los elementos visuales correspondientes en **todas** las cartas seleccionadas que estén activas en el lienzo.
- El resaltado en el lienzo consistirá en un contorno punteado o línea exterior sutil alrededor del elemento correspondiente (ej. `outline: 2px dashed var(--accent-primary)`).

### RF-3: Scroll y Foco Rotativo al Hacer Clic en Capas
- Al hacer clic en un elemento/capa en el lienzo:
  1. Se calcula la lista de todos los inputs correspondientes a esa capa en el inspector.
  2. Si ninguno de esos inputs está enfocado actualmente, se desplaza el inspector (`scrollIntoView` suave) para centrar el primer input de la lista y se le asigna el foco (`focus()`).
  3. Si uno de estos inputs ya tiene el foco, el foco pasa al *siguiente* input de la lista (ej. de "Texto" a "Familia tipográfica", de ahí a "Color", etc.).
  4. Si el input actualmente enfocado es el último de la lista, el foco vuelve al primero (rotación cíclica).

---

## 3. Arquitectura y Diseño de Interfaz

### Identificación de Elementos vinculados
Para hacer el emparejamiento eficiente sin mutar constantemente el estado de React en cada hover (lo que arruinaría el rendimiento), utilizaremos atributos de datos del DOM (`data-attributes`) y un estado ligero de hover:
- En los elementos del lienzo: `data-capa-id={capa.id}`
- En los contenedores de campos del inspector: `data-inspector-capa-id={capa.id}`

### Estado de Hover de Capa Activa
Se definirá un estado ligero `hoveredCapaId: string | null` en el contexto compartido o `App.tsx` para coordinar el resaltado bidireccional.
- Al hacer `onMouseEnter` en un elemento del lienzo o en un campo del inspector, se establece `hoveredCapaId = capaId`.
- Al hacer `onMouseLeave`, se restablece a `null`.

---

## 4. Estrategia de Verificación (Pruebas)

### 4.1. Pruebas Unitarias Automatizadas
- Crear [AppHoverFocusSync.test.tsx](file:///c:/Users/victo/proyectos/cdc2/client/src/AppHoverFocusSync.test.tsx) para verificar:
  * El cambio de clase de resaltado al hacer hover en el lienzo.
  * La rotación cíclica del foco al hacer clics repetidos en una capa simulada.

### 4.2. Pruebas Manuales (Checklist)
- [ ] Pasar el ratón sobre un elemento de la carta seleccionada en el lienzo y verificar que los campos asociados en la barra lateral cambien de aspecto.
- [ ] Pasar el ratón sobre un input de texto en el inspector y verificar que se dibuje un borde de color en el elemento de la carta del lienzo.
- [ ] Hacer clic repetidamente en una capa de la carta y comprobar que el foco rote por sus inputs correspondientes en el inspector derecho.
