# Especificación Técnica - SRS-052: Orden Jerárquico y Visibilidad Dinámica de Campos Expuestos

## 1. Introducción y Objetivos
- **Módulo**: Inspector de Campos Editables (Panel Lateral Izquierdo e Inspector de Configuración de Campos Expuestos).
- **Propósito**: Mejorar la experiencia de usuario y usabilidad del maquetador al ordenar las propiedades expuestas respetando el árbol de jerarquía visual (pre-order traversal de capas y contenedores) en lugar de presentarlas de forma agrupada por tipo de propiedad. Además, ocultar del panel lateral de edición de carta las propiedades pertenecientes a capas que estén marcadas como invisibles (`visible: false`) o cuyo componente contenedor padre esté oculto.
- **Objetivos**:
  - **Jerarquía Natural**: Asegurar que las propiedades expuestas en la edición de cartas se organicen como: `Elemento 1 > Propiedades, Elemento 2 > Propiedades`, siguiendo el mismo orden en que aparecen las capas en el panel de capas.
  - **Ocultación Dinámica**: Si una capa contenedora o elemento se marca como invisible (`visible: false`), ocultar de forma reactiva del menú lateral todas las demás propiedades expuestas asociadas a ese elemento y a sus descendientes.

---

## 2. Requisitos Funcionales

### RF-1: Ordenación Jerárquica de Campos Expuestos
- Al renderizar los campos editables de una carta en el panel lateral izquierdo, el orden de aparición de las propiedades expuestas debe coincidir con el orden visual de las capas (recorrido jerárquico desde la raíz hacia abajo y de arriba a abajo en el panel visual).
- En el modal de "Configuración de Campos Expuestos", el listado de propiedades disponibles para seleccionar/exponer debe mostrarse también en este mismo orden jerárquico, en lugar de agrupar todos los textos/imágenes primero y las visibilidades al final.
- El orden se determina mediante un recorrido en profundidad (DFS pre-order) de las capas del proyecto que respete los contenedores y su ordenamiento interno.

### RF-2: Visibilidad Dinámica en Edición de Carta
- Si una propiedad de visibilidad (`visible`) de una capa está expuesta y el usuario la desmarca (`false`):
  - Todas las demás propiedades expuestas de esa misma capa (ej. texto, imagen, etc.) deben ocultarse del panel lateral de edición de cartas.
  - Si la capa es de tipo contenedor (`container`), las propiedades expuestas de todos sus elementos hijos y descendientes también deben ocultarse de forma recursiva del panel lateral.
- Si la propiedad de visibilidad de la capa no está expuesta, pero la capa base de la plantilla tiene `visible: false`, se aplicará la misma regla de ocultación recursiva para sus propiedades expuestas en el panel lateral de edición.

---

## 3. Arquitectura y Diseño de Datos

### Algoritmo de Ordenación Jerárquica
Dado el array plano de capas `capas` y la estructura de herencia (`parentCapaId`):
1. Reconstruir el árbol de capas.
2. Realizar un recorrido en profundidad (DFS) comenzando por los elementos raíz (aquellos sin `parentCapaId`).
3. Para cada elemento visitado:
   - Añadir al resultado las propiedades expuestas asociadas a dicho elemento.
   - Visitar recursivamente a los hijos del elemento siguiendo el mismo orden del array de capas.

---

## 4. Interfaces y Cambios en la UI
- **Panel Lateral Izquierdo (`App.tsx`)**: La función que renderiza el formulario de campos expuestos recorrerá el array de propiedades expuestas ordenado jerárquicamente, y filtrará aquellas cuyas capas (o contenedores ancestros) no estén visibles.
- **Modal de Configuración de Campos Expuestos (`EditCardModal.tsx`)**: Se actualizará el orden de la lista de propiedades seleccionables para que coincida exactamente con el recorrido jerárquico de las capas.

---

## 5. Estrategia de Verificación (Pruebas)

### 5.1. Pruebas Unitarias Automatizadas
- Test unitarios para validar la función de ordenación jerárquica de capas expuestas.
- Test unitarios para validar que la visibilidad recursiva detecta correctamente cuándo un ancestro es invisible.

### 5.2. Pruebas Manuales / Criterios de Aceptación (Checklist)
- [ ] Crear un contenedor A, dentro poner un contenedor B, y dentro de B una imagen y un texto.
- [ ] Exponer la visibilidad del contenedor A, la visibilidad de B, y el origen de la imagen y el texto.
- [ ] Verificar que en el panel de edición lateral y en el modal de configuración de campos expuestos aparecen en orden: A (visibilidad) -> B (visibilidad) -> Imagen -> Texto.
- [ ] Desmarcar la visibilidad de A en el panel de edición y verificar que desaparecen del panel lateral las propiedades de B, de la imagen y del texto.
