# Ticket - TKT-018: Unificar Tipos de Texto y Añadir Flag Multilínea Explícito

- **ID del Ticket**: TKT-018
- **Estado**: 🟢 Completado
- **Fecha de Registro**: 2026-06-28
- **Severidad**: Media (Mejora de arquitectura y UX del editor)

---

## 1. Descripción del Requerimiento
Actualmente, el sistema decide de manera implícita si un control de edición de texto debe ser de una sola línea o multilínea evaluando si la altura de la capa es mayor a 15 mm (`altoMm > 15`). Esto produce un comportamiento confuso si el usuario redimensiona una capa por debajo de 15 mm. Además, al añadir elementos existen dos opciones separadas ("Texto de una línea" y "Texto multilínea") que duplican la intención de un mismo componente de texto.

El usuario requiere simplificar y unificar este comportamiento:
1. **Unificación de Componentes**:
   - En la ventana emergente de *"Añadir Elemento"*, se eliminarán las opciones separadas y se consolidarán en una única opción: **"Texto"**.
   - Al añadir un nuevo elemento "Texto", este se creará por defecto con la propiedad `multiline: false` y una altura inicial estándar (ej. `8mm`).
2. **Propiedad Explícita `multiline`**:
   - Se introduce la propiedad booleana `multiline` en el modelo de datos de las capas de texto.
   - En la pestaña **Diseño** del panel inspector, se añade el checkbox: *"Permitir saltos de línea (Multilínea)"*. Al alternarlo, se actualizará `capa.multiline` a `true` o `false`.
3. **Comportamiento del Renderizador**:
   - El editor (en pestaña Contenido y Diseño) renderizará un `<textarea>` si la capa es multilínea, y un `<input type="text">` en caso contrario.
   - **Tratamiento de indefinidos**: Si la propiedad `capa.multiline` es `undefined` (proyectos/plantillas heredadas), se interpretará por defecto como `true` (multilínea), sin evaluar la dimensión de altura de la capa.

---

## 2. Archivos Implicados
- [`client/src/EditCardModal.tsx`](file:///c:/Users/victo/proyectos/cdc2/client/src/EditCardModal.tsx) (UI de añadir elemento, inicialización de capa de texto, inspector de diseño, inspector de contenido y estados).

---

## 3. Plan de Verificación y Criterios de Aceptación
- [x] En la ventana emergente *"Añadir Elemento"*, comprobar que solo existe la opción **"Texto"**, además de Imagen e Imagen Switch.
- [x] Añadir un elemento "Texto" y verificar que se crea con `multiline: false` y se muestra un `<input>` de una sola línea en las pestañas Contenido y Diseño.
- [x] En la pestaña **Diseño**, activar el checkbox *"Permitir saltos de línea (Multilínea)":
  - [x] Comprobar que el control del Texto por defecto cambia instantáneamente a un `<textarea>`.
  - [x] Comprobar que en la pestaña **Contenido**, el editor de la carta también pasa a ser un `<textarea>`.
- [x] Redimensionar la capa en el lienzo para que su alto sea menor de `15mm` y verificar que el editor **sigue siendo un textarea** y no se convierte en una sola línea.
- [x] Desactivar el checkbox de multilínea y comprobar que el control vuelve a ser un `<input type="text">` de una sola línea.
