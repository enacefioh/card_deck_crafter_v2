# Especificación Técnica - SRS-016: Acciones en el Explorador de Capas

Esta especificación describe el diseño y la implementación de las acciones del explorador de capas (Subir, Bajar, Duplicar y Eliminar) dentro del modal de edición visual de cartas (`EditCardModal`).

---

## 1. Introducción y Objetivos
* **Propósito**: Facilitar la gestión y composición de la estructura jerárquica de la plantilla directamente desde el explorador de capas (columna izquierda), mejorando drásticamente la productividad.
* **Objetivos de Diseño**:
  * **Reactividad en tiempo real**: Los cambios en el orden, copia o eliminación de las capas deben verse reflejados de inmediato tanto en el lienzo central de previsualización como en los datos del proyecto.
  * **Seguridad de datos**: Evitar la pérdida de datos accidentales al eliminar capas y limpiar correctamente referencias muertas de campos de variables.
  * **Interactividad y Accesibilidad**: Barra de herramientas intuitiva con estados activos/inactivos contextuales e información al posar el cursor (*tooltips*).

---

## 2. Requisitos Funcionales y Casos de Uso

### RF-1: Barra de Acciones y Estados de Habilitación Contextual
* **Descripción**: Una fila de botones en la parte inferior de la jerarquía de capas, por encima de "Añadir Elemento".
* **Criterios de Aceptación**:
  * Los botones deben corresponder a: **Subir (⬆️)**, **Bajar (⬇️)**, **Duplicar (👥 / 📋)** y **Eliminar (🗑️)**.
  * Si no hay ninguna capa seleccionada: Todos los botones de la barra deben estar inactivos (disabled).
  * **Subir**: Deshabilitado si la capa seleccionada es la primera de la lista (índice 0). *(Nota: la capa "background" suele ser la primera/fondo, ¿se permite moverla o tiene restricciones?)*
  * **Bajar**: Deshabilitado si la capa seleccionada es la última de la lista.
  * **Eliminar**: Deshabilitado para la capa de fondo obligatoria (`background`), si procede.

### RF-2: Reordenamiento de Capas (Subir / Bajar)
* **Descripción**: Cambiar el orden secuencial de la capa seleccionada en el array de capas de la plantilla.
* **Criterios de Aceptación**:
  * Modifica la posición relativa en el array `plantilla.capas`.
  * Como el renderizado se realiza secuencialmente en el lienzo, cambiar el índice altera el orden de apilado visual (Z-index).
  * La selección de la capa activa debe mantenerse en su nuevo índice tras el movimiento.

### RF-3: Duplicar Capa
* **Descripción**: Clonar la capa seleccionada creando una réplica exacta con un nuevo identificador único.
* **Criterios de Aceptación**:
  * Genera un nuevo `id` único (ej: `layer_cloned_xxxx`).
  * Si es una capa de tipo texto con clave de variable (ej: `{{titulo}}`), la copia apuntará inicialmente al mismo campo dinámico. *(Sugerencia: ¿Debería auto-generarse una nueva clave única como `titulo_copia` o mantener la referencia para que compartan valor?)*
  * Si es una capa de tipo imagen, se duplica su recurso por defecto.
  * La nueva capa se inserta inmediatamente debajo de la capa seleccionada y se selecciona de forma automática.

### RF-4: Eliminar Capa
* **Descripción**: Eliminar permanentemente la capa de la plantilla.
* **Criterios de Aceptación**:
  * Quita el elemento de `plantilla.capas`.
  * **Limpieza de variables**: Si la capa eliminada era de tipo texto y era la *única* que utilizaba una variable determinada en la plantilla (ej: `{{personaje}}`), se debe eliminar esa clave del diccionario `valoresCampos` de todas las cartas del proyecto para evitar almacenamiento de datos basura.
  * **Limpieza de overrides**: Eliminar las anulaciones asociadas a ese `capa.id` en `capasOverrides` y `capasOverridesTrasera` en todas las cartas del proyecto.

---

## 3. Arquitectura y Diseño de Datos

### Flujo de Mutación del Estado (Sugerencia)
Para mantener la reactividad en `EditCardModal.tsx`, se pueden implementar manejadores dedicados en el cliente que muten `tempPlantilla` (o `tempPlantillaTrasera`) y propaguen la limpieza a `tempValoresCampos` y `tempCapasOverrides`.

```typescript
// Firmas propuestas
const handleSubirCapa = (capaId: string) => void;
const handleBajarCapa = (capaId: string) => void;
const handleDuplicarCapa = (capaId: string) => void;
const handleEliminarCapa = (capaId: string) => void;
```

---

## 4. UI y Experiencia de Usuario
* **Disposición**: Justo debajo del contenedor `.hierarchy-list` y sobre el botón `"Añadir Elemento"`.
* **Tooltip**: Mostrar un atributo `title` descriptivo (ej: `"Subir capa en la jerarquía"`) al pasar el ratón.
* **Confirmación**: ¿Debería mostrarse un popup de confirmación (`confirm`) al eliminar una capa que contiene información o desactivarse la advertencia para flujos rápidos?

---

## 5. Estrategia de Verificación (Pruebas)

### 5.1. Pruebas Unitarias Automatizadas
* Verificar que `duplicarCapa` asigna una clave e ID únicos.
* Verificar que `eliminarCapa` elimina las referencias en los `capasOverrides` de todas las cartas del proyecto.
* Probar el reordenamiento del array de capas.

### 5.2. Pruebas Manuales / Criterios de Aceptación
* Comprobar deshabilitación de botones al inicio.
* Validar que mover una capa arriba/abajo altera su visibilidad de solapamiento en el lienzo central.
