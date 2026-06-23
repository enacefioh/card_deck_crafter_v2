# Ticket - TKT-012: Diseño Independiente de Cartas (Plantillas como Preset Inicial)

## Descripción del Problema
Actualmente, las plantillas se referencian por ID (`plantillaId`) desde las cartas, compartiendo el mismo objeto de diseño en el catálogo global (`templatesMap`). Aunque en el guardado del modal se intenta clonar la plantilla si hay diferencias, esto ensucia el catálogo global y genera confusión. Además, si el usuario modifica el diseño de una carta, no debería alterar el diseño de otras cartas que comparten la misma plantilla de partida. Las plantillas deben funcionar como un preset inicial puro (punto de partida), y a partir de ahí cada carta debe gestionar su diseño (capas y campos config) de forma 100% independiente.

## Criterios de Aceptación
1.  **Independencia de Diseño**: Modificar las capas, estilos, fuentes, o campos config en una carta no debe afectar a ninguna otra carta del proyecto, independientemente de si comparten plantilla inicial.
2.  **Estructura Embebida**: Cada objeto `Carta` almacenará su propio diseño de capas y configuración de campos (embebiendo el objeto `plantilla` y `plantillaTrasera` dentro de la carta).
3.  **Limpieza del Catálogo**: Modificar una carta ya no creará nuevas plantillas clónicas en `templatesMap`. El catálogo de plantillas se mantendrá limpio, conteniendo solo las plantillas predeterminadas e importadas/guardadas explícitamente.

## Archivos Afectados (Estimados)
- `shared/layoutEngine.ts` (Modificación de la interfaz `Carta`)
- `client/src/utils/projectUtils.ts` (Migración y compatibilidad en `validarYParsearProyecto`)
- `client/src/App.tsx` (Lógica de guardado de carta, instanciación desde plantilla y renderizado)
- `client/src/EditCardModal.tsx` (Adaptación a las propiedades embebidas de la carta)
