# Ticket - TKT-002: Navegación por Tabulador en el Editor Visual de Cartas

- **ID del Ticket**: TKT-002
- **Estado**: ✅ Completado
- **Fecha de Registro**: 2026-06-21
- **Fecha de Resolución**: 2026-06-21
- **Severidad**: Baja (Mejora de UX / Productividad)

---

## Resolución e Implementación
- **Solución Aplicada**:
  1. Se ha añadido un `useEffect` en [client/src/EditCardModal.tsx](file:///c:/Users/victo/proyectos/cdc2/client/src/EditCardModal.tsx) que escucha de forma global la tecla `Tab` cuando el modal está abierto en la pestaña frontal. Intercepta el evento (`e.preventDefault()`) para evitar la pérdida de foco fuera del editor y cambia cíclicamente el estado `selectedLayerId` secuencialmente entre todas las capas de la plantilla.
  2. Shift + Tab retrocede en la lista en sentido inverso.
  3. Se ha implementado un segundo `useEffect` que escucha los cambios de `selectedLayerId`. Introduce un breve retraso (`setTimeout` de 50ms) para permitir que React monte el nuevo inspector en el DOM, busca el input del inspector correspondiente (`.inspector-textarea`, `.inspector-input`, `.color-hex-input` o `.color-picker-input`) y le aplica el `.focus()` y `.select()` de forma automática.
- **Acciones Realizadas**:
  - Implementación de la lógica de Tab/Shift+Tab y auto-foco en [client/src/EditCardModal.tsx](file:///c:/Users/victo/proyectos/cdc2/client/src/EditCardModal.tsx).

---

## 1. Descripción del Requerimiento
Al editar una carta en el editor visual de pantalla completa (`EditCardModal`), el usuario debe poder navegar de forma rápida entre los distintos campos o capas de la carta usando el teclado para maximizar la productividad.

- Al presionar la tecla **Tabulador (`Tab`)**:
  - El sistema seleccionará automáticamente el **siguiente elemento** (capa) de la carta en la jerarquía (explorador izquierdo).
  - El sistema pondrá el foco en el panel de propiedades derecho para que el usuario pueda empezar a escribir de inmediato en el campo de texto o selector de color correspondiente.
- Al presionar **Shift + Tab**:
  - Debería navegar en sentido inverso (hacia el elemento anterior).

---

## 2. Archivos Implicados
- [`client/src/EditCardModal.tsx`](file:///c:/Users/victo/proyectos/cdc2/client/src/EditCardModal.tsx)
- [`client/src/EditCardModal.css`](file:///c:/Users/victo/proyectos/cdc2/client/src/EditCardModal.css)

---

## 3. Plan de Verificación y Criterios de Aceptación
- [x] Abrir el modal de edición de una carta con plantilla.
- [x] Pulsar la tecla `Tab` repetidamente: Comprobar que la selección en el árbol izquierdo cambia secuencialmente del fondo al título, y luego al texto de reglas.
- [x] Verificar que el cursor de escritura se enfoca automáticamente en el input o textarea de la derecha del elemento seleccionado.
- [x] Pulsar `Shift + Tab` y comprobar que la selección retrocede de forma coherente.
