# Ticket - TKT-003: Error en el Servidor al Generar/Exportar PDF

- **ID del Ticket**: TKT-003
- **Estado**: ✅ Completado
- **Fecha de Registro**: 2026-06-21
- **Fecha de Resolución**: 2026-06-21
- **Severidad**: Alta (Bloqueante para la función de exportación física)

---

## Resolución y Verificación
- **Causa del Error**: El backend intentaba importar de `"shared"` como alias de paquete. Debido a que `shared/package.json` no contenía `"type": "module"`, Node.js y tsx interpretaban el paquete `shared` como CommonJS implícito, lo que causaba un `SyntaxError` en runtime al intentar extraer la exportación nombrada `calcularDistribucion` en el servidor (el cual sí opera en modo ESM nativo). Asimismo, había un error de TypeScript en `src/index.ts` por tipos implícitos `any` en una función predicate de búsqueda.
- **Resolución**: 
  1. Se añadió `"type": "module"` en [shared/package.json](file:///c:/Users/victo/proyectos/cdc2/shared/package.json) para que sea resuelto correctamente como ESM.
  2. Se corrigió el import de `shared` en [index.ts](file:///c:/Users/victo/proyectos/cdc2/server/src/index.ts) para usar la ruta del paquete en lugar de caminos relativos.
  3. Se tipó el parámetro `c` como `Carta` en la búsqueda por id en `proyecto.cards`.
  4. Se desactivó el script `watch` de TSX en [package.json](file:///c:/Users/victo/proyectos/cdc2/server/package.json) para el entorno dev del servidor, previniendo cuelgues o consumos excesivos de CPU por watchers en el entorno virtualizado de Windows.
- **Verificación**: Compilación con `tsc --noEmit` limpia y ejecución exitosa de [test_export.ts](file:///c:/Users/victo/proyectos/cdc2/server/src/test_export.ts) confirmando la generación del PDF con éxito (HTTP 200).

---

## 1. Descripción del Problema
- **Comportamiento Esperado**: Al presionar "Exportar PDF" en el editor principal de la web, se compila el proyecto y el servidor Puppeteer genera un archivo PDF que se descarga localmente.
- **Comportamiento Obtenido**: Tras las últimas implementaciones de plantillas y overrides, el cliente muestra el siguiente mensaje de error en un popup de alerta:
  > Error al generar el PDF: Error en el servidor al generar el PDF.
- **Objetivos**:
  - Investigar los logs del backend para identificar la causa del fallo (p. ej. errores de tipado, propiedades no definidas, dependencias faltantes al procesar `proyecto.templates` o `proyecto.cards`).
  - Corregir el bug de compilación o renderizado en el servidor Puppeteer.
  - Implementar pruebas de integración de la ruta de exportación en el servidor ([`server/src/test_export.ts`](file:///c:/Users/victo/proyectos/cdc2/server/src/test_export.ts) o similar) para asegurar que no vuelva a ocurrir.

---

## 2. Archivos Implicados
- [`server/src/index.ts`](file:///c:/Users/victo/proyectos/cdc2/server/src/index.ts)
- [`shared/layoutEngine.ts`](file:///c:/Users/victo/proyectos/cdc2/shared/layoutEngine.ts)
- [`client/src/App.tsx`](file:///c:/Users/victo/proyectos/cdc2/client/src/App.tsx)

---

## 3. Plan de Verificación
- [ ] Ejecutar el servidor de desarrollo y la interfaz web.
- [ ] Crear un proyecto mixto con cartas basadas en imágenes y cartas basadas en plantillas (con overrides de color y textos modificados).
- [ ] Pulsar "Exportar PDF". Verificar que la solicitud se completa con código HTTP 200 y se descarga un archivo PDF funcional y sin desbordes.
- [ ] Ejecutar la suite de tests del servidor y verificar que el test de exportación automatizada pasa correctamente.
