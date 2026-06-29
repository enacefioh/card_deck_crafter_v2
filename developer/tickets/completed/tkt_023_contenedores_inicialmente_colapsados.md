# Ticket - TKT-023: Contenedores Inicialmente Colapsados al Abrir Editor

- **ID del Ticket**: TKT-023
- **Estado**: 🔴 Activo (Pendiente)
- **Fecha de Registro**: 2026-06-29
- **Severidad**: Baja (Mejora de UX y orden visual en el editor)

---

## 1. Descripción del Requerimiento
Al abrir el modal del editor de cartas (`EditCardModal.tsx`), el explorador lateral de la jerarquía de capas muestra todos los contenedores expandidos por defecto. En plantillas complejas con múltiples capas y contenedores anidados, esto genera saturación visual y dificulta la navegación inicial.

- **Objetivo**: 
  - Que al abrir el editor, todos los contenedores de diseño se muestren colapsados inicialmente.
  - El usuario podrá expandirlos manualmente haciendo clic en el botón de flecha correspondiente (`▶` / `▼`).
- **Implementación**:
  - Inicializar el estado `collapsedContainerIds` en `EditCardModal.tsx` con los IDs de todas las capas de tipo `"container"` presentes en la plantilla.

---

## 2. Archivos Implicados
- [`client/src/EditCardModal.tsx`](file:///c:/Users/victo/proyectos/cdc2/client/src/EditCardModal.tsx)

---

## 3. Plan de Verificación y Criterios de Aceptación
- [ ] Abrir el editor de cartas con una plantilla que posea al menos dos contenedores.
- [ ] Comprobar que en el explorador de capas lateral (panel izquierdo), los contenedores aparecen con el icono de flecha `▶` (colapsados) y sus capas hijas ocultas.
- [ ] Hacer clic en el icono `▶` de un contenedor y verificar que se expande correctamente mostrando sus capas hijas.
