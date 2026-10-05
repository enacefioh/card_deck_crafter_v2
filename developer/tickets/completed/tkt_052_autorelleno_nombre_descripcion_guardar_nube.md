# Ticket - TKT-052: Autorelleno de Nombre y Descripción al Guardar o Guardar Como Proyecto o Plantilla en la Nube

- **ID del Ticket**: TKT-052
- **Estado**: 🟢 Completado
- **Fecha de Registro**: 2026-10-05
- **Fecha de Resolución**: 2026-10-05
- **Severidad**: Baja / Mejora de Usabilidad (UX)

---

## 1. Descripción del Problema
Al pulsar sobre "Guardar Proyecto en la Nube", el modal `SaveCloudModal` no autorellena la descripción actual del proyecto (siempre se inicializaba vacía) y el nombre caía en fallbacks ("Mi baraja") en lugar de sincronizarse con el nombre real del proyecto en edición (`nombreProyecto`).

Además, al utilizar la opción "Guardar Proyecto en la Nube Como..." o "Guardar Plantilla en la Nube Como...", el usuario espera que se conserve el título del proyecto o plantilla actual con el sufijo ` (Copia)` al final (ej. `Nombre Proyecto (Copia)`), permitiendo editarlo con facilidad antes de confirmar el guardado como una entidad independiente.

---

## 2. Solución Propuesta / Implementada
1. **Soporte de `initialDescription` en `SaveCloudModal`**:
   - Extender la interfaz `SaveCloudModalProps` para aceptar `initialDescription?: string`.
   - Inicializar el estado de `description` con `initialDescription || ""` y actualizarlo en el efecto al abrir el modal (`useEffect` con `isOpen`, `initialName`, `initialDescription`).
2. **Gestión de Estado de Descripción de Proyecto en `App.tsx`**:
   - Crear el estado `descripcionProyecto` (y sincronizarlo al cargar proyectos locales o desde la nube).
   - Crear el estado `currentCloudProjectDescription` y `currentCloudTemplateDescription` (o actualizar `descripcionProyecto` directamente).
   - Al cargar un proyecto (local o de la nube), restaurar su descripción (`proyecto.meta?.descripcion || project.description || ""`).
   - Al guardar en la nube (proyecto o plantilla), persistir la descripción introducida en `descripcionProyecto` (o en la plantilla) y en los metadatos de `project.json` dentro del archivo `.cdc2`.
3. **Lógica de Autorelleno de Nombre y Descripción en Modales**:
   - **Guardar Proyecto en la Nube**:
     - Nombre: `nombreProyecto`
     - Descripción: `descripcionProyecto`
   - **Guardar Proyecto en la Nube Como...**:
     - Nombre: `${nombreProyecto} (Copia)`
     - Descripción: `descripcionProyecto`
   - **Guardar Plantilla en la Nube**:
     - Nombre: si existe plantilla en la nube activa, el nombre actual de la plantilla; en su defecto `Plantilla ${nombreProyecto}`.
     - Descripción: la descripción actual de la plantilla o del proyecto.
   - **Guardar Plantilla en la Nube Como...**:
     - Nombre: `${baseName} (Copia)`
     - Descripción: la descripción actual.
4. **Sincronización al Confirmar Guardado**:
   - Al confirmar el guardado, actualizar `nombreProyecto` con el nombre guardado y `descripcionProyecto` con la descripción guardada.
   - Si se guarda como copia (`saveCloudAsNew`), la nueva entidad en edición asume el nuevo nombre, descripción y nuevo ID.
5. **Incremento de Versión de Sesión**:
   - Actualizar versión a `v2.261005.3` en `MenuBar.tsx`, `server/src/index.ts` y `AdminPanel.tsx`.

---

## 3. Archivos Implicados
- [`client/src/components/SaveCloudModal.tsx`](file:///c:/Users/victo/proyectos/cdc2/client/src/components/SaveCloudModal.tsx)
- [`client/src/App.tsx`](file:///c:/Users/victo/proyectos/cdc2/client/src/App.tsx)
- [`client/src/MenuBar.tsx`](file:///c:/Users/victo/proyectos/cdc2/client/src/MenuBar.tsx)
- [`client/src/admin/AdminPanel.tsx`](file:///c:/Users/victo/proyectos/cdc2/client/src/admin/AdminPanel.tsx)
- [`server/src/index.ts`](file:///c:/Users/victo/proyectos/cdc2/server/src/index.ts)
- [`client/src/TKT052AutofillCloudSave.test.tsx`](file:///c:/Users/victo/proyectos/cdc2/client/src/TKT052AutofillCloudSave.test.tsx)

---

## 4. Plan de Verificación y Criterios de Aceptación
- [x] Abrir "Guardar Proyecto en la Nube": el campo de nombre muestra el nombre real del proyecto y la descripción muestra la descripción existente.
- [x] Abrir "Guardar Proyecto en la Nube Como...": el campo de nombre muestra `${nombre} (Copia)` y conserva la descripción existente.
- [x] Abrir "Guardar Plantilla en la Nube": el campo de nombre y descripción se autorellenan adecuadamente.
- [x] Abrir "Guardar Plantilla en la Nube Como...": el campo de nombre muestra `${nombrePlantilla} (Copia)` y conserva la descripción.
- [x] Confirmar el guardado y verificar que `nombreProyecto` y `descripcionProyecto` se actualizan correctamente.
- [x] Batería de pruebas automatizadas pasando al 100%.
- [x] Recompilación de imagen Docker y reinicio de servicios.
