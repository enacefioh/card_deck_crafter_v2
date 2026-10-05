# Ticket - TKT-050: Eliminación de Opción Redundante "Exportar Proyecto Como" en Menú Guardar

- **ID del Ticket**: TKT-050
- **Estado**: 🟢 Completado
- **Fecha de Registro**: 2026-10-05
- **Fecha de Resolución**: 2026-10-05
- **Severidad**: Baja (Limpieza y simplificación de interfaz de usuario / UX)

---

## 1. Descripción del Problema
En el submenú "Guardar Proyecto" del menú superior "Archivo" existen actualmente dos opciones para exportar proyectos locales en formato `.cdc2`:
1. `Exportar a PC (.cdc2)`
2. `Exportar Proyecto Como... (.cdc2)`

En el contexto de una aplicación web que se ejecuta en el navegador, el motor del navegador no tiene capacidad de sobreescribir directamente archivos existentes en el sistema de archivos del usuario sin disparar un diálogo de descarga. Ambas opciones ejecutan la generación del archivo ZIP `.cdc2` y lanzan una descarga, resultando redundantes y confusas para el usuario. Por tanto, se solicita eliminar la opción "Exportar Proyecto Como... (.cdc2)" para mantener el menú limpio y conciso.

---

## 2. Solución Propuesta / Implementada
1. **Eliminación en `MenuBar.tsx`**:
   - Retirar el botón `Exportar Proyecto Como... (.cdc2)` del submenú `activeSubmenu === "guardar"`.
   - Mantener las opciones restantes:
     - `Exportar a PC (.cdc2)`
     - `Exportar Plantilla de Proyecto (.cdc2)`
     - `Guardar Proyecto en la Nube...` (si aplica)
     - `Guardar como Plantilla en la Nube...` (si aplica)
2. **Limpieza en `App.tsx`**:
   - Retirar la prop `onGuardarProyectoComo` pasada al componente `MenuBar`.
3. **Actualización de Pruebas Unitarias**:
   - Ajustar `client/src/SRS067PlantillasProyecto.test.tsx` eliminando la aserción y clic sobre `Exportar Proyecto Como... (.cdc2)`.

---

## 3. Archivos Implicados
- [`client/src/MenuBar.tsx`](file:///c:/Users/victo/proyectos/cdc2/client/src/MenuBar.tsx): Eliminación de la opción de menú y su propiedad.
- [`client/src/App.tsx`](file:///c:/Users/victo/proyectos/cdc2/client/src/App.tsx): Limpieza de la invocación de prop.
- [`client/src/SRS067PlantillasProyecto.test.tsx`](file:///c:/Users/victo/proyectos/cdc2/client/src/SRS067PlantillasProyecto.test.tsx): Actualización de aserciones.

---

## 4. Plan de Verificación y Criterios de Aceptación
- [x] Verificar que en "Archivo" ▶ "Guardar Proyecto", la opción "Exportar Proyecto Como... (.cdc2)" ya no aparece.
- [x] Verificar que "Exportar a PC (.cdc2)" y las opciones de plantilla y nube continúan funcionando perfectamente.
- [x] Ejecutar la suite completa de pruebas unitarias (`npm test`) y build (`npm run client:build`).
- [x] Recompilar la imagen Docker (`npm run docker:build`) y reiniciar servicios.
