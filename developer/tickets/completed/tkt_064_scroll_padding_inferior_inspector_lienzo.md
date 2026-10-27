# TKT-064: Corrección de Scroll y Adición de Padding Inferior de 100px en el Inspector del Lienzo

## Estado: Completado
**Fecha:** 2026-10-27  
**Prioridad:** Media  
**Tipo:** Corrección de Bug / Mejora de UX  
**Alcance:** Frontend (`client/src/App.css`, `client/src/App.tsx`)  
**Versión:** `v2.261027.1`  

---

## 1. Descripción del Problema

Al seleccionar cartas en el lienzo principal (`App.tsx`), se carga el panel lateral derecho de propiedades e inspector compacto (`.sidebar-right`). En ciertas condiciones (especialmente al tener un número elevado de capas y campos editables, o cuando se activa "Mostrar todos los campos"), el scroll vertical del panel no llegaba hasta el final, dejando los campos de la zona inferior de la pantalla inaccesibles e inalcanzables para el usuario.

---

## 2. Causas Identificadas

1. **Ausencia de `min-height: 0` en el contenedor flex scrollable (`.sidebar-content`)**:
   - En CSS Flexbox, los elementos con `flex: 1` tienen por defecto `min-height: auto`.
   - Cuando el contenido interno es muy alto, el navegador evalúa el tamaño mínimo en base a su contenido (`min-content`) en lugar de restringirlo estrictamente a la altura disponible del padre (`.sidebar-right`).
   - Esto provocaba que `.sidebar-content` desbordara físicamente por debajo de `.sidebar-right`, siendo recortado silenciosamente por el `overflow: hidden` de `.app-container` o `.app-layout`.

2. **Ausencia de `overflow: hidden` y `min-height: 0` en `.sidebar-right`**:
   - El panel lateral derecho no tenía `overflow: hidden`, lo que permitía que elementos hijos desplazaran la caja visual fuera de la pantalla.

3. **Falta de `flex-shrink: 0` en las cabeceras fijas del inspector**:
   - `.sidebar-right .sidebar-header` y `.inspector-tabs-container` (pestañas Delantera / Trasera) no tenían `flex-shrink: 0`, pudiendo interactuar negativamente en el cálculo del espacio residual para el área scrollable.

4. **Padding inferior casi nulo (`padding: 6px 10px`)**:
   - El contenedor tenía únicamente 6px de padding inferior, dejando los últimos campos pegados al borde inferior de la pantalla sin margen de maniobra, provocando que cualquier descuadre de subpíxeles o redondeo ocultara la última fila.

---

## 3. Solución Implementada

1. **Aislamiento y Restricción Flexbox en `App.css`**:
   - Se añadió `min-height: 0` y `overflow: hidden` a `.sidebar-right` y `.sidebar`.
   - Se añadió `flex-shrink: 0` a `.sidebar-right .sidebar-header`, `.sidebar-header` y `.inspector-tabs-container`.
   - Se añadió `min-height: 0` a `.sidebar-content` y `.app-container`.
   - Se actualizó el padding del contenido del inspector derecho en `App.css`:
     ```css
     .sidebar-right .sidebar-content {
       padding: 6px 10px 100px 10px;
       gap: 0;
       min-height: 0;
     }
     ```

2. **Refuerzo en el JSX (`App.tsx`)**:
   - Se incorporó `minHeight: 0` en el contenedor `.sidebar-content` del inspector derecho para garantizar el cálculo correcto en todos los navegadores.

3. **Pruebas Automatizadas (`client/src/TKT064ScrollPaddingInferiorInspector.test.tsx`)**:
   - Pruebas que validan la presencia de `min-height: 0`, `overflow: hidden`, `flex-shrink: 0` y el `padding-bottom: 100px`.

---

## 4. Criterios de Aceptación y Verificación

1. Al seleccionar cartas con plantillas complejas y muchos campos, la barra de scroll permite desplazarse suavemente hasta el final de la lista.
2. Los últimos elementos cuentan con un margen inferior de 100px respecto al borde de la pantalla, asegurando total accesibilidad y visibilidad limpia.
3. Las pruebas automatizadas pasan al 100%.
