# Ticket - TKT-039: Pérdida de Textos Modificados y Propiedades Expuestas al Duplicar Capas

**Estado: COMPLETADO**

---

## 1. Síntomas y Diagnóstico
Al duplicar una capa (especialmente de tipo **Texto**) en el editor de plantillas (`EditCardModal.tsx`):
1. **Pérdida de Texto de la Carta**: La copia del elemento de texto se crea con el texto por defecto de la plantilla en lugar de conservar el texto modificado en la carta activa.
2. **Pérdida de Propiedades Expuestas**: Si la capa original tenía alguna propiedad expuesta (como su contenido, visibilidad, etc.), la nueva capa duplicada no hereda estas exposiciones (queda oculta en el editor de páginas).

### Causa:
- En la lógica de guardado de variables del editor de cartas, los valores personalizados de cada carta (`tempValoresCampos`) se indexan por el identificador único de la capa (`capa.id`), no por su propiedad `nombre`.
- Al duplicar la capa en `handleDuplicateCapa`, se intentaba leer el valor de la carta usando `node.nombre` (el cual devolvía `undefined`), por lo que se inicializaba con el valor por defecto de la plantilla.
- El array de estado `tempExposedProperties` no se actualizaba para clonar los registros expuestos del `layerId` de origen.

---

## 2. Solución Aplicada
1. **Identificadores Internos Únicos**: Se mantiene el nombre original en el explorador de capas (permitiendo nombres duplicados legibles para el maquetador).
2. **Asociación de Valores**: Se lee el valor de la carta usando `tempValoresCampos[node.id]` y se asocia al nuevo `layerId` generado (`tempValoresCampos[nodeNewId]`), garantizando que la copia conserve el texto modificado de la carta.
3. **Clonación de Propiedades Expuestas**: Mapeamos y añadimos en `tempExposedProperties` las propiedades expuestas del antiguo `layerId` asignadas al nuevo `layerId`, manteniendo el estado de exposición de forma idéntica.

