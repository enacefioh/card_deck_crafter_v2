# Ticket - TKT-005: Plantilla Vacía Autoadaptable al Tamaño del Proyecto

- **ID del Ticket**: TKT-005
- **Estado**: 🟢 Completado y Validado
- **Fecha de Registro**: 2026-06-28
- **Severidad**: Baja (Mejora de UX)

---

## 1. Descripción del Requerimiento
Eliminar las plantillas por defecto complejas del sistema y dejar únicamente una única plantilla vacía. Esta plantilla vacía no debe tener dimensiones estáticas (como los 63.5x88.9 mm fijos originales), sino que debe adaptarse de forma reactiva al tamaño de carta configurado en el proyecto activo actual. Al crear una carta (o aplicar un reverso) a partir de esta plantilla vacía, su ancho, alto y el tamaño de la capa de fondo (`background`) deben coincidir exactamente con los configurados en el proyecto.

- **Objetivos**:
  - Eliminar `"Plantilla Simple"` del módulo por defecto.
  - Hacer que `"Plantilla Vacía"` calcule dinámicamente sus dimensiones según la propiedad `cardConfig` del proyecto actual en el listado de selección.
  - Asegurar que al instanciar cartas o reversos a partir de la plantilla vacía, se actualicen sus capas de fondo y dimensiones a los del proyecto.

---

## 2. Archivos Implicados
- [`client/public/modules/default/module.json`](file:///c:/Users/victo/proyectos/cdc2/client/public/modules/default/module.json)
- [`client/src/App.tsx`](file:///c:/Users/victo/proyectos/cdc2/client/src/App.tsx)

---

## 3. Plan de Verificación y Criterios de Aceptación
- **Criterios de Aceptación**:
  - [x] El listado de plantillas por defecto contiene únicamente la "Plantilla Vacía".
  - [x] Las dimensiones mostradas para la "Plantilla Vacía" coinciden en tiempo real con el tipo de carta del proyecto.
  - [x] No se muestra icono de advertencia ⚠️ ni texto en gris para la "Plantilla Vacía".
  - [x] Al añadir una carta basada en la plantilla vacía, se crea con las dimensiones correctas de carta del proyecto y su capa de fondo cubre toda la superficie.
