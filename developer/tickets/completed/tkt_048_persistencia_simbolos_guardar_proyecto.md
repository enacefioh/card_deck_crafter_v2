# Ticket - TKT-048: Fallo de Persistencia y Carga de Símbolos al Reabrir Proyectos Guardados (.cdc2)

- **ID del Ticket**: TKT-048
- **Estado**: 🟢 Completado
- **Fecha de Registro**: 2026-08-04
- **Fecha de Resolución**: 2026-08-04
- **Severidad**: Alta (Pérdida de recursos visuales al guardar/cargar proyectos)

---

## 1. Descripción del Problema
Al crear un nuevo proyecto y añadir símbolos a la Galería de Símbolos (`projectSymbols`), los símbolos se podían insertar y visualizar correctamente durante la sesión activa. Sin embargo, al guardar el proyecto en un archivo `.cdc2` y abrirlo en una nueva sesión o equipo diferente, los símbolos ya no cargaban correctamente y se mostraban en blanco o rotos.

---

## 2. Solución Implementada
1. **Empaquetado Completo de Símbolos (`client/src/App.tsx`)**:
   - Se ajustó el bucle de `generarProyectoZip` modificando la condición restrictiva por `if (sym.src && !sym.src.startsWith("symbol_asset://"))`.
   - Con esto, cualquier símbolo (incluidos los que tienen URLs del servidor como `/api/symbols/raw/...` o URLs de red) es descargado vía `fetch` e incrustado físicamente dentro de la carpeta `symbols/` del archivo ZIP `.cdc2`.
2. **Consolidación en `userAssets` y `projectAssets`**:
   - Se aplicó la misma verificación preventiva a `userAssets` (`!user_asset://`) y `projectAssets` (`!project_asset://`).

---

## 3. Archivos Implicados
- [`client/src/App.tsx`](file:///c:/Users/victo/proyectos/cdc2/client/src/App.tsx): Ajustes en el empaquetado de `projectSymbols`, `userAssets` y `projectAssets` en `generarProyectoZip`.
- [`client/src/MenuBar.tsx`](file:///c:/Users/victo/proyectos/cdc2/client/src/MenuBar.tsx): Incremento de versión a `v2.260804.1`.

---

## 4. Plan de Verificación y Criterios de Aceptación
- [x] Ampliar `generarProyectoZip` para empaquetar todos los símbolos en la carpeta `symbols/` del ZIP.
- [x] Crear un proyecto, añadir símbolos a la galería e insertarlos en el texto de las cartas.
- [x] Guardar el proyecto como `.cdc2` y recargar la página por completo.
- [x] Abrir el archivo `.cdc2` guardado y verificar que todos los símbolos cargan perfectamente.
- [x] Ejecutar la suite de pruebas unitarias (`npm run test`) comprobando que 77 tests pasan correctamente.
