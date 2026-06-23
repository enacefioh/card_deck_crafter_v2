# Ticket - TKT-010: Capturar Valores de Campos como Valores por Defecto al Exportar Plantilla

- **ID del Ticket**: TKT-010
- **Estado**: ⏳ Activo
- **Fecha de Registro**: 2026-06-23
- **Severidad**: Baja (Mejora de UX y Conveniencia)

---

## 1. Descripción del Requerimiento / Bug
Cuando un usuario crea y diseña una plantilla en el modal de edición visual, rellena textos descriptivos de ejemplo (ej. "pon aquí tu título", "coste de maná") en los campos de la pestaña **Contenido**. 
Sin embargo, al exportar la plantilla (`.cdc2t`), los textos que escribió no se guardan como los valores predeterminados de la plantilla. Al importar esa plantilla en un proyecto limpio y crear una nueva carta, los campos dinámicos se inicializan con el texto genérico e impersonal `"Texto de ejemplo..."`.

### Comportamiento Esperado:
Al hacer clic en **"Exportar Plantilla"**, el sistema debe:
1. Leer los valores textuales actuales del editor (`tempValoresCampos` y `tempValoresCamposTrasera`).
2. Actualizar la propiedad `valorDefecto` en el array `camposConfig` de la plantilla clonada con esos valores.
3. De esta forma, el archivo `.cdc2t` empaquetará la plantilla con esos valores predeterminados personalizados. Al importar la plantilla en cualquier proyecto y añadir una nueva carta, esta nacerá con los textos de ejemplo descriptivos creados por el diseñador en lugar del marcador genérico.

---

## 2. Archivos Implicados
- [`client/src/EditCardModal.tsx`](file:///c:/Users/victo/proyectos/cdc2/client/src/EditCardModal.tsx) (función `handleExportTemplate`)

---

## 3. Plan de Verificación y Criterios de Aceptación
- [ ] Crear una plantilla nueva y añadir una capa de texto de una línea.
- [ ] En la pestaña **Contenido**, escribir `"Ejemplo de Título de Carta"`.
- [ ] Pulsar el botón **"Exportar Plantilla"** y guardar el archivo `.cdc2t`.
- [ ] En un proyecto limpio (o tras borrar la plantilla de la sesión), importar el archivo `.cdc2t` generado.
- [ ] Añadir una nueva carta basada en la plantilla importada.
- [ ] Verificar que la nueva carta se inicializa con el texto `"Ejemplo de Título de Carta"` y no con `"Texto de ejemplo..."`.
