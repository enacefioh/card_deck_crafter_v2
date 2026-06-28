# Ticket - TKT-019: Anulación de la Navegación de Capas Mediante la Tecla Tabulador

- **ID del Ticket**: TKT-019
- **Estado**: 🟢 Completado
- **Fecha de Registro**: 2026-06-28
- **Severidad**: Baja/Media (Conflicto de usabilidad con inputs del inspector)

---

## 1. Descripción del Requerimiento
Anteriormente se implementó en el ticket **TKT-002** una funcionalidad para navegar cíclicamente entre las capas del editor visual presionando la tecla **Tab** (y Shift+Tab para retroceder), enfocando automáticamente el primer campo del inspector.

Sin embargo, con la adición de nuevas propiedades (como bordes individuales, esquinas redondeadas y colores de fondo), el panel del inspector ahora contiene múltiples campos numéricos, selectores de color y checkboxes. Al presionar **Tab** con la intención de saltar al siguiente campo de formulario (comportamiento nativo de los navegadores), el sistema intercepta el evento e interrumpe la edición cambiando de capa de forma indeseada.

- **Objetivo**:
  - Eliminar o inhabilitar la interceptación global de la tecla **Tab** que cambia de elemento seleccionado.
  - Restaurar la navegación nativa por tabulador del navegador para permitir el desplazamiento fluido entre los controles del panel inspector.

---

## 2. Archivos Implicados
- [`client/src/EditCardModal.tsx`](file:///c:/Users/victo/proyectos/cdc2/client/src/EditCardModal.tsx) (Líneas ~234 a ~287 eliminadas)

---

## 3. Plan de Verificación y Criterios de Aceptación
- [x] Eliminar la escucha de la tecla Tab (`e.key === "Tab"`) y el auto-foco automático del inspector en `EditCardModal.tsx`.
- [x] Abrir el modal de edición de una carta.
- [x] Ir a la pestaña **Diseño** o **Contenido**.
- [x] Seleccionar un campo (por ejemplo, el ancho de una capa) y presionar la tecla **Tab**.
- [x] Verificar que el foco se mueve al siguiente input (ej. el alto de la capa) en lugar de cambiar la capa seleccionada.
