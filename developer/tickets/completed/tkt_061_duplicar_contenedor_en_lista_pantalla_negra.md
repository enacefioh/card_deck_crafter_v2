# TKT-061: Error fatal (pantalla negra) al duplicar un contenedor dentro de una lista

## Estado: Completado
**Fecha:** 2026-10-22
**Prioridad:** Crítica
**Tipo:** Bugfix

---

## Descripción del Problema
Al crear o usar una capa de tipo Lista (`list`) cuyo elemento hijo directo es un Contenedor (`container`) con otras subcapas dentro (ej. textos, imágenes u otros contenedores), al pulsar el botón de duplicar elemento (`📋`) en el acordeón del inspector en `App.tsx`, la aplicación fallaba de forma catastrófica (crash de renderizado en React), desmontando toda la interfaz gráfica y dejando únicamente la pantalla con el fondo oscuro, obligando a recargar.

## Causa Raíz
En `handleDuplicateListItem` de `client/src/App.tsx`:
```tsx
const descendants = getDescendantIds(rootCapa.id, p.capas);
const { newRoot, newDescendants, idMap } = cloneLayerTreeWithNewIds(rootCapa, descendants, listLayerId);
```
1. `getDescendantIds` devuelve un array de strings con los identificadores de capa (`string[]`).
2. `cloneLayerTreeWithNewIds` espera recibir objetos de capa (`descendantCapas: any[]`) para acceder a `c.id` y `c.parentCapaId`.
3. Al recibir cadenas, `c.id` resultaba `undefined`, el mapa de identificadores (`idMap`) no registraba las nuevas IDs de los hijos y `newDescendants` resultaba en elementos no-objeto o huérfanos que se empalmaban directamente en `p.capas`.
4. Asimismo, las propiedades expuestas (`p.exposedProperties`) asignaban `layerId: idMap.get(ep.layerId)!` que resultaba en `undefined`.
5. Durante el siguiente ciclo de renderizado de React, tanto el motor de renderizado de lienzo como el inspector intentaban acceder a propiedades de estos elementos corruptos (`capa.tipo`, `mapaCartaCapaId`, etc.), lanzando un `TypeError: Cannot read properties of undefined` no controlado que desmontaba la raíz de React dejando la pantalla oscura.

## Solución Implementada
1. En `client/src/App.tsx` (`handleDuplicateListItem`):
   - Se mapean los identificadores de `descendantIds` a sus objetos de capa correspondientes en `p.capas` (`descendantCapas`), pasando objetos válidos a `cloneLayerTreeWithNewIds`.
   - Se securizó el mapeo de `newExposed`, asegurando que `idMap.get(ep.layerId)` exista y filtrando propiedades huérfanas para no introducir `layerId: undefined`.
2. En `shared/layoutEngine.ts` (`cloneLayerTreeWithNewIds`):
   - Se robusteció la función para que soporte defensivamente arrays con objetos de capa o strings de IDs y descarte elementos que no sean objetos válidos en `newDescendants`.
3. Pruebas automatizadas y verificación:
   - Se crearon pruebas unitarias en `TKT061DuplicateContainerInList.test.tsx` comprobando la duplicación completa de contenedores con capas hijas y propiedades expuestas.
   - Comprobado y verificado manualmente por el usuario.
