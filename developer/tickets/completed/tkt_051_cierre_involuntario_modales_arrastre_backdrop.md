# Ticket - TKT-051: Cierre Involuntario de Modales al Seleccionar Texto y Arrastrar Cursor hacia el Backdrop

- **ID del Ticket**: TKT-051
- **Estado**: 🟢 Completado
- **Fecha de Registro**: 2026-10-05
- **Fecha de Resolución**: 2026-10-05
- **Severidad**: Media (Pérdida de datos ingresados en formularios al seleccionar texto)

---

## 1. Descripción del Problema
Al interactuar con ventanas modales (como el popup de "Guardar Proyecto en la Nube", configuración de proyecto, plantillas, etc.), si un usuario hace clic dentro de un campo de texto (`mousedown`), arrastra el cursor para seleccionar texto y suelta el botón del ratón (`mouseup`) fuera de los límites de la ventana modal (sobre el fondo o backdrop), el modal se cierra involuntariamente.

Este comportamiento ocurre porque el evento `click` del navegador se despacha al elemento ancestro común más cercano (`.modal-backdrop`), el cual tenía asignado un manejador `onClick={onClose}`. Esto provoca que el usuario pierda los datos recién introducidos en el formulario y tenga que volver a abrirlo y rellenarlo desde el principio.

---

## 2. Solución Propuesta / Implementada
1. **Detección Estricta de Clic en el Backdrop (`mousedown` + `mouseup`)**:
   - En lugar de confiar en el evento genérico `onClick`, se implementa una comprobación en dos fases:
     - `onMouseDown`: Comprueba y registra si el clic se originó directamente en el fondo (`e.target === e.currentTarget`).
     - `onMouseUp`: Solo si el `mousedown` ocurrió en el fondo Y el `mouseup` también ocurre en el fondo (`e.target === e.currentTarget`), se dispara el cierre (`onClose`).
   - Si el usuario originó el clic dentro de un input u otro elemento interno del modal, `isMouseDownOnBackdrop` es `false`, por lo que soltar el ratón sobre el fondo no cerrará el modal.
2. **Revisión y Aplicación en Todos los Modales de la Aplicación**:
   - `client/src/components/SaveCloudModal.tsx` ("Guardar Proyecto en la Nube").
   - `client/src/components/CloudProjectsModal.tsx` ("Almacenamiento en la Nube").
   - `client/src/components/TemplatePreviewModal.tsx` ("Previsualización de Plantilla").
   - `client/src/DetailModal.tsx` ("Ficha de Carta").
   - `client/src/AuthModals.tsx` ("Iniciar Sesión" y "Activar Contraseña").
   - `client/src/App.tsx`:
     - Modal de selección de plantilla (`showTemplateModal`).
     - Modal de galería de imágenes del proyecto (`showProjectGallery`).
     - Modal de paleta de colores del proyecto (`showProjectColors`).
     - Modal de fuentes del proyecto (`showProjectFonts`).
     - Modal del gestor de plantillas (`showTemplatesManager`).
     - Selector de imagen de galería en barra lateral (`showSidebarGallerySelector`).
     - Modal de configuración del proyecto / página (`showProjectConfig`).
   - `client/src/admin/AdminPanel.tsx` (Modales de administración de usuarios y cuotas).
3. **Respeto Estricto de las Reglas de Hooks de React**:
   - Se aseguró que `useSafeBackdrop` se invoque incondicionalmente en la parte superior del componente antes de cualquier retorno temprano (`if (!isOpen) return null;`) en `SaveCloudModal`, `CloudProjectsModal` y `TemplatePreviewModal`, previniendo errores de orden de Hooks en tiempo de ejecución ("Rendered more hooks than during previous render").
4. **Incremento de Versión de la Sesión**:
   - Actualización de versión a `v2.261005.2` en `MenuBar.tsx`, `server/src/index.ts` y `AdminPanel.tsx`.

---

## 3. Archivos Implicados
- [`client/src/utils/modalUtils.ts`](file:///c:/Users/victo/proyectos/cdc2/client/src/utils/modalUtils.ts)
- [`client/src/components/SaveCloudModal.tsx`](file:///c:/Users/victo/proyectos/cdc2/client/src/components/SaveCloudModal.tsx)
- [`client/src/components/CloudProjectsModal.tsx`](file:///c:/Users/victo/proyectos/cdc2/client/src/components/CloudProjectsModal.tsx)
- [`client/src/components/TemplatePreviewModal.tsx`](file:///c:/Users/victo/proyectos/cdc2/client/src/components/TemplatePreviewModal.tsx)
- [`client/src/DetailModal.tsx`](file:///c:/Users/victo/proyectos/cdc2/client/src/DetailModal.tsx)
- [`client/src/AuthModals.tsx`](file:///c:/Users/victo/proyectos/cdc2/client/src/AuthModals.tsx)
- [`client/src/App.tsx`](file:///c:/Users/victo/proyectos/cdc2/client/src/App.tsx)
- [`client/src/admin/AdminPanel.tsx`](file:///c:/Users/victo/proyectos/cdc2/client/src/admin/AdminPanel.tsx)
- [`client/src/MenuBar.tsx`](file:///c:/Users/victo/proyectos/cdc2/client/src/MenuBar.tsx)
- [`server/src/index.ts`](file:///c:/Users/victo/proyectos/cdc2/server/src/index.ts)

---

## 4. Plan de Verificación y Criterios de Aceptación
- [x] Arrastrar desde el interior de un campo de texto hacia el fondo exterior del modal y soltar: el modal debe permanecer abierto con el texto seleccionado.
- [x] Hacer clic directamente en el fondo (presionar y soltar fuera): el modal debe cerrarse correctamente.
- [x] Hacer clic en el botón de cerrar (`✕` o Cancelar): el modal debe cerrarse con normalidad.
- [x] Ejecutar suite completa de tests (`npm test`) y build (`npm run client:build`).
- [x] Recompilar imagen Docker y reiniciar servicios.
