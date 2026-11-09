# TKT-067: Corrección de Colisión en Expresión Regular de Normalización de Esquemas (`user_asset://`, `project_asset://` y `symbol_asset://`)

## Estado: Completado
**Fecha:** 2026-11-09  
**Prioridad:** Alta (Crítica)  
**Tipo:** Corrección de Regresión / Resolución de Recursos  
**Alcance:** Frontend (`client/src/services/projectZipService.ts`, `client/src/TKT066AssetIdAndBackExportFix.test.tsx`) y Backend (`server/src/engine/cardRenderer.ts`, `server/src/engine/projectArchiveService.ts`)  
**Versión Objetivo:** `v2.261109.2`  

---

## 1. Descripción del Problema

Tras introducir la normalización defensiva de esquemas en **TKT-066**, al abrir un proyecto `.cdc2` en la aplicación (`v2.261109.1`), desaparecían tanto las ilustraciones de las cartas almacenadas en la galería de usuario/proyecto (`user_asset://...`, `project_asset://...`) como los iconos de la galería de símbolos (`symbol_asset://...`).

---

## 2. Causa Raíz Identificada (RCA)

En `normalizarEsquemaRecurso` (`client/src/services/projectZipService.ts`), `resolverRutaAssetFisica` (`server/src/engine/cardRenderer.ts`) y `processImageToAsset` (`server/src/engine/projectArchiveService.ts`), la expresión regular empleada para detectar esquemas `asset://` incrustados dentro de un URI corrupto era:

```ts
const embeddedAssetMatch = rawSrc.match(/asset:\/\/?([^/\\:]+)$/);
if (embeddedAssetMatch && !rawSrc.startsWith("asset://")) {
  return `asset://${cleanFile}`;
}
```

Dado que los esquemas válidos `user_asset://`, `project_asset://` y `symbol_asset://` terminan todos en la subcadena `asset://`, dicha expresión regular coincidía con el sufijo del propio esquema legítimo (`user_[asset://...]`, `project_[asset://...]`, `symbol_[asset://...]`) y, al no comenzar la cadena por `asset://`, reescribía cualquier recurso de usuario, proyecto o símbolo hacia `asset://...`. En consecuencia, `resolverAssetBlob` buscaba las ilustraciones y símbolos dentro de la carpeta `assets/` del ZIP en lugar de `user_assets/`, `project_assets/` y `symbols/`.

---

## 3. Solución Implementada

1. **Acotación Estricta de Detección de Esquemas Incrustados (`projectZipService.ts`, `cardRenderer.ts`, `projectArchiveService.ts`)**:
   - Se reemplazó `/asset:\/\/?([^/\\:]+)$/` por `/^(?:user_asset|project_asset):\/\/(?:u_asset_|p_asset_)*asset:\/\/?([^/\\:]+)$/`, de modo que únicamente se reconduzca a `asset://` cuando exista un segundo esquema `asset:` incrustado después del esquema principal `user_asset://` o `project_asset://`.
   - En `limpiarIdRecurso` y `esRecursoPlantillaCorruptoEnGaleria`, se exigió delimitador de inicio o guion bajo (`/(?:^|_)asset:/i` y `/(?:u_asset_|p_asset_)+asset:/i`) tras retirar el esquema principal.

2. **Ampliación de Tests de Regresión (`client/src/TKT066AssetIdAndBackExportFix.test.tsx`)**:
   - Se añadieron comprobaciones explícitas verificando que `normalizarEsquemaRecurso` y `esRecursoPlantillaCorruptoEnGaleria` preservan intactos los esquemas `user_asset://`, `project_asset://` y `symbol_asset://`.

---

## 4. Criterios de Aceptación

- [x] **CA-1:** `normalizarEsquemaRecurso` mantiene intactos los URIs legítimos `user_asset://...`, `project_asset://...` y `symbol_asset://...`, y sigue corrigiendo URIs corruptos con doble esquema (`user_asset://u_asset_asset://tmpl_asset_...` → `asset://tmpl_asset_...`).
- [x] **CA-2:** Al abrir un proyecto `.cdc2` en el cliente, tanto las ilustraciones de las cartas como los iconos de la galería de símbolos se cargan y renderizan correctamente.
- [x] **CA-3:** Suite de tests de regresión actualizada y en verde.
