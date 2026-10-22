# TKT-062: Aislamiento de cartas existentes al actualizar o sobreescribir plantillas

## Estado: Completado
**Fecha:** 2026-10-22
**Prioridad:** Alta
**Tipo:** Bugfix / Arquitectura

---

## Descripción del Problema
Cuando un usuario guardaba o sobreescribía una plantilla en el proyecto (mediante "Guardar Plantilla" en `EditCardModal` o al importar un archivo `.cdc2t`), el sistema propagaba ciegamente la propiedad `plantilla` a todas las cartas del proyecto que compartían el mismo `plantillaId`.

Esta propagación destructiva provocaba que:
1. Las cartas preexistentes que poseían elementos dinámicos en capas de tipo Lista (`tipo: "list"`) vieran sus capas reseteadas y reemplazadas por las que tuviese la plantilla en el momento de exportar.
2. Elementos legítimos añadidos en otras cartas desaparecían, mientras que elementos de la plantilla guardada se forzaban en todas las cartas.

## Solución Implementada (Opción A - Aislamiento)
1. **Aislamiento en `onExportTemplate` (`App.tsx`)**:
   - Se actualiza el catálogo de plantillas del proyecto (`templatesMap` e `importedTemplates`) con la definición actualizada para que esté disponible para futuras cartas.
   - Se eliminó la sobreescritura masiva de `c.plantilla` y `c.plantillaTrasera` sobre las cartas existentes en `cartas` y `documentos`.
2. **Aislamiento en `handleImportTemplateFile` (`App.tsx`)**:
   - Se actualiza el catálogo de plantillas importadas sin sobreescribir las cartas existentes en el proyecto.
3. **Tests automatizados y verificación**:
   - Se crearon pruebas unitarias en `TKT062TemplateIsolationCards.test.tsx` verificando que:
     - Al sobreescribir una plantilla, las cartas existentes conservan sus capas y elementos de lista dinámicos intactos.
     - `templatesMap` se actualiza correctamente y las nuevas cartas creadas a partir de dicha plantilla incorporan los cambios.
   - Aprobado y verificado por el usuario.
