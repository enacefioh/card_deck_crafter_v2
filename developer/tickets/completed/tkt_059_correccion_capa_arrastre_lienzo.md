# TKT-059: Corrección de capa objetivo al arrastrar o redimensionar en el lienzo principal

## Estado: Completado
**Fecha:** 2026-10-22
**Prioridad:** Alta
**Tipo:** Bugfix

---

## Descripción del Problema
Cuando el usuario expone la propiedad de "Posición y Dimensiones (Lienzo)" (`canvasEditMode`) para mover o redimensionar un elemento libremente con el ratón en el lienzo de la carta en `App.tsx`, al hacer clic y arrastrar dicho elemento sobre el lienzo, se mueve o modifica una capa distinta a la que tiene la propiedad expuesta activa.

## Causa Raíz
En `client/src/App.tsx` (`handleLayerCanvasMouseDown`), la resolución del ID de capa objetivo para cada carta seleccionada realizaba la siguiente búsqueda:
```tsx
const exposed = isBack ? (p?.exposedProperties || []) : (c.exposedProperties || p?.exposedProperties || []);
const originalProp = exposed.find((eo: any) => eo.layerId === targetCapaId);
let targetLayerId = targetCapaId;
if (originalProp) {
  const match = exposed.find((eo: any) => eo.property === originalProp.property);
  if (match) {
    targetLayerId = match.layerId;
  }
}
```
Si varias capas tenían expuesta la propiedad `canvasEditMode` (o cualquier otra propiedad que coincidiera con `originalProp.property`), `exposed.find` devolvía siempre la **primera** capa del array que compartía dicha propiedad. Esto provocaba que `targetLayerId` se reasignara a esa primera capa en lugar de conservar `targetCapaId`, aplicando las modificaciones de posición (`xMm`, `yMm`) y tamaño (`anchoMm`, `altoMm`) a la capa equivocada.

## Solución Implementada
1. En `handleLayerCanvasMouseDown` de `client/src/App.tsx`:
   - Se eliminó la búsqueda errónea que reasignaba `targetLayerId` mediante `exposed.find((eo) => eo.property === originalProp.property)`.
   - Se estableció `targetLayerId = targetCapaId` de manera directa para garantizar que el arrastre actúe siempre sobre la capa objetivo seleccionada.
   - En caso de selección múltiple de cartas donde una carta seleccionada posea una variante de plantilla con distintos IDs de capa, se verifica `p.capas.some(x => x.id === targetCapaId)` y, de no existir, se busca por coincidencia de `nombre` y `tipo` respecto a la carta base.
2. Se añadieron pruebas unitarias automatizadas (`TKT059CanvasEditTargetLayer.test.tsx`) que comprueban que el arrastre sobre el lienzo solo afecta a `targetCapaId` y resuelve correctamente en plantillas clonadas.
3. Se verificó el funcionamiento manual y el usuario confirmó su aprobación.
