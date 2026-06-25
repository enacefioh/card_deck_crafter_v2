# Ticket - TKT-016: Colisión de IDs al Importar Múltiples Plantillas

- **ID del Ticket**: TKT-016
- **Estado**: 🟢 Completado
- **Fecha de Registro**: 2026-06-25
- **Severidad**: Media (Pérdida de datos de diseño / Sobreescritura no deseada)

---

## 1. Descripción del Requerimiento
Al importar plantillas de carta desde archivos `.cdc2t`, si el usuario importa una segunda plantilla que comparte el mismo ID interno que una ya importada (por ejemplo, porque ambas se derivaron del mismo diseño inicial o plantilla base), la última plantilla importada sobreescribe a la anterior en el catálogo (`templatesMap` y `importedTemplates`). La primera plantilla queda borrada o inaccesible en el listado.

Dado que en Card Deck Crafter v2 los diseños de cartas son independientes (TKT-012) y embeben el objeto de la plantilla, el ID de la plantilla solo se requiere para la instanciación inicial. Por tanto, para evitar colisiones involuntarias al exportar/importar plantillas, se debe asegurar que cada exportación genere un identificador único global para la plantilla exportada.

- **Objetivo**:
  - Modificar `prepararPlantillaParaExportacion` en `client/src/utils/projectUtils.ts` (o el flujo de exportación) para que **siempre** genere un nuevo ID único (`template_${Date.now()}_...`) para la plantilla que se va a exportar, independientemente de si la plantilla origen era una plantilla predeterminada (`vacia`, `simple`) o una personalizada.
  - De esta forma, cada archivo `.cdc2t` exportado tendrá garantizado un ID de plantilla único y nunca colisionará ni sobreescribirá a otros diseños al importarse en un proyecto.

---

## 2. Archivos Implicados
- [`client/src/utils/projectUtils.ts`](file:///c:/Users/victo/proyectos/cdc2/client/src/utils/projectUtils.ts)

---

## 3. Plan de Verificación y Criterios de Aceptación
- [ ] Crear un diseño de plantilla "Plantilla A" a partir de la vacía y exportarlo como archivo `.cdc2t`.
- [ ] Crear otro diseño diferente "Plantilla B" partiendo de "Plantilla A" (o en otra carta que use la misma plantilla) y exportarlo como archivo `.cdc2t`.
- [ ] En un proyecto nuevo o limpio, importar el primer archivo `.cdc2t` ("Plantilla A").
- [ ] Importar el segundo archivo `.cdc2t` ("Plantilla B").
- [ ] Verificar que en el listado de plantillas importadas de la barra lateral **se muestran ambas plantillas** ("Plantilla A" y "Plantilla B") simultáneamente y ninguna ha sido sobreescrita.
