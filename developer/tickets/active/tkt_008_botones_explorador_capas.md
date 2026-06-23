# Ticket - TKT-008: Botones de Acción en el Explorador de Capas

- **ID del Ticket**: TKT-008
- **Estado**: ⏳ Activo
- **Fecha de Registro**: 2026-06-23
- **Severidad**: Baja (Mejora de UX y Productividad)

---

## 1. Descripción del Requerimiento
Añadir una barra de acciones rápidas o botones contextuales al explorador de capas (la lista de la columna izquierda del modal de edición de cartas).
Las acciones a incluir son:
- **Subir**: Desplazar la capa seleccionada una posición arriba en la jerarquía (orden de renderizado).
- **Bajar**: Desplazar la capa seleccionada una posición abajo en la jerarquía.
- **Duplicar**: Crear una copia exacta de la capa seleccionada y añadirla a la plantilla.
- **Eliminar**: Eliminar la capa seleccionada de la plantilla.

De esta manera se mejora la gestión del árbol de capas directamente desde el panel izquierdo.

---

## 2. Archivos Implicados
- [`client/src/EditCardModal.tsx`](file:///c:/Users/victo/proyectos/cdc2/client/src/EditCardModal.tsx)

---

## 3. Plan de Verificación y Criterios de Aceptación
- [ ] Verificar que aparecen los botones "Subir", "Bajar", "Duplicar" y "Eliminar" en la sección del explorador de capas.
- [ ] Probar "Subir" y "Bajar" y confirmar que altera el orden del array de capas de la plantilla y, por ende, el orden visual de solapamiento.
- [ ] Probar "Duplicar" y comprobar que se añade una nueva capa con propiedades idénticas y un ID auto-generado único.
- [ ] Probar "Eliminar" y verificar que la capa desaparece de la lista y del renderizado de la carta.
