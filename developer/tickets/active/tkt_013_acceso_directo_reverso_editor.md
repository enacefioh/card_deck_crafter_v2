# Ticket - TKT-013: Acceso Directo para Añadir Reverso desde Plantilla en el Editor

- **ID del Ticket**: TKT-013
- **Estado**: 🔴 Activo (Pendiente)
- **Fecha de Registro**: 2026-06-25
- **Severidad**: Baja (Mejora de Usabilidad / Acceso directo)

---

## 1. Descripción del Requerimiento
Cuando un usuario edita una carta en el editor modal (`EditCardModal`) y cambia a la pestaña del reverso ("Reverso" o tab trasero), si la carta no tiene un reverso asignado (ni imagen trasera individual ni plantilla trasera), el lienzo interactivo muestra una zona vacía con el texto `"Sin reverso configurado"`.

Para mejorar el flujo de trabajo y la usabilidad, se desea añadir un botón directo dentro de este estado vacío que permita asignar una plantilla de reverso a la carta, replicando la misma funcionalidad del botón "Usar Plantilla" del panel de propiedades lateral de la aplicación principal.

- **Objetivo**:
  - En `EditCardModal.tsx`, si `activeTab === "trasera"` y `traseraUrl` es nula/indefinida (es decir, no hay reverso individual ni plantilla), mostrar un botón con el texto `"📄 Usar Plantilla de Reverso"`.
  - Al hacer clic en este botón, invocar un callback prop `onAssignBackTemplate` provisto por el componente padre (`App.tsx`).
  - En `App.tsx`, este callback debe abrir el modal de selección de plantilla en modo asignación de reverso (`abrirModalPlantillaParaTrasera()`).

---

## 2. Archivos Implicados
- [`client/src/EditCardModal.tsx`](file:///c:/Users/victo/proyectos/cdc2/client/src/EditCardModal.tsx)
- [`client/src/App.tsx`](file:///c:/Users/victo/proyectos/cdc2/client/src/App.tsx)

---

## 3. Plan de Verificación y Criterios de Aceptación
- [ ] Abrir la aplicación y seleccionar una carta que no tenga ningún reverso configurado.
- [ ] Hacer doble clic para abrir el editor modal de la carta (`EditCardModal`).
- [ ] Cambiar a la pestaña de diseño trasero (**Reverso**).
- [ ] Comprobar que en el centro de la pantalla, debajo del texto `"Sin reverso configurado"`, aparece el botón `"📄 Usar Plantilla de Reverso"`.
- [ ] Hacer clic en el botón y verificar que se abre el modal selector de plantilla en modo asignación de reverso.
- [ ] Seleccionar una plantilla de reverso, confirmar la acción, y comprobar que el lienzo del editor de la carta se actualiza mostrando el nuevo reverso configurado.
