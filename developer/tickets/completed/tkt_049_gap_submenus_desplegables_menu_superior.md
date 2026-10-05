# Ticket - TKT-049: Separación y Cierre Accidental en Submenús Desplegables del Menú Superior

- **ID del Ticket**: TKT-049
- **Estado**: 🟢 Completado
- **Fecha de Registro**: 2026-10-05
- **Fecha de Resolución**: 2026-10-05
- **Severidad**: Media (Problema de usabilidad/UX en la navegación de menús principales)

---

## 1. Descripción del Problema
En la barra de menú superior (`MenuBar.tsx`), al abrir el menú "Archivo" y posar el cursor sobre "Abrir Proyecto" o "Guardar Proyecto", se despliega el submenú lateral correspondiente (`.menu-submenu`). 

Sin embargo, debido a un margen físico (`margin-left: 4px;`) en los estilos CSS de `.menu-submenu`, existe una separación vacía entre el elemento contenedor padre (`.menu-item-submenu`) y el submenú hijo. Al intentar desplazar el cursor hacia el submenú, el puntero atraviesa dicho hueco, disparando inmediatamente el evento `onMouseLeave` y provocando el cierre prematuro del submenú antes de que el usuario pueda interactuar con sus opciones.

---

## 2. Solución Propuesta / Implementada
1. **Eliminación del Gap y Puente de Cursor (Hover Bridge) en CSS (`client/src/MenuBar.css`)**:
   - Ajustar la posición de `.menu-submenu` eliminando la separación física (`margin-left: 0;`).
   - Añadir un pseudo-elemento invisible (`::before`) que cubra la zona de transición lateral y diagonal (`left: -12px; width: 14px; top: -8px; bottom: -8px;`), evitando que el cursor pierda el área activa durante movimientos diagonales.
2. **Buffer / Margen de Gracia en JavaScript (`client/src/MenuBar.tsx`)**:
   - Implementar un temporizador de gracia breve (~180ms) en la función de cierre de submenú (`handleSubmenuLeave`), cancelado de forma inmediata al volver a entrar en el elemento o sus hijos (`handleSubmenuEnter`). Esto proporciona una tolerancia natural a movimientos rápidos o imprecisos del ratón.
3. **Actualización de Versión del Proyecto**:
   - Actualizar la versión visible a `v2.261005.1` en `MenuBar.tsx`, `server/src/index.ts` y `AdminPanel.tsx`.

---

## 3. Archivos Implicados
- [`client/src/MenuBar.css`](file:///c:/Users/victo/proyectos/cdc2/client/src/MenuBar.css): Ajuste de posicionamiento y puente `::before` para `.menu-submenu`.
- [`client/src/MenuBar.tsx`](file:///c:/Users/victo/proyectos/cdc2/client/src/MenuBar.tsx): Lógica de debounce/gracia para el estado `activeSubmenu` y actualización de versión.
- [`server/src/index.ts`](file:///c:/Users/victo/proyectos/cdc2/server/src/index.ts): Actualización de versión.
- [`client/src/admin/AdminPanel.tsx`](file:///c:/Users/victo/proyectos/cdc2/client/src/admin/AdminPanel.tsx): Actualización de versión de fallback.
- [`client/src/TKT049SubmenuGap.test.tsx`](file:///c:/Users/victo/proyectos/cdc2/client/src/TKT049SubmenuGap.test.tsx): Pruebas unitarias de temporizador de gracia y cierre inmediato.

---

## 4. Plan de Verificación y Criterios de Aceptación
- [x] Posicionamiento del submenú adyacente al menú padre sin huecos vacíos que causen pérdida de hover.
- [x] Tránsito fluido del cursor tanto horizontal como diagonalmente hacia el submenú sin cierre accidental.
- [x] Cierre inmediato al posar el cursor sobre otros elementos directos del menú (ej. "Nuevo Proyecto", "Nueva Página").
- [x] Comprobación con tests automáticos (`npm test`) y build (`npm run client:build`).
- [x] Recompilación de imagen Docker (`npm run docker:build`) y reinicio de servicios.
