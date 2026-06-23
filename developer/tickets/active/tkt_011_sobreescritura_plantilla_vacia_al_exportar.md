# Ticket - TKT-011: Sobreescritura de Plantillas por Defecto al Exportar desde una Carta

- **ID del Ticket**: TKT-011
- **Estado**: ⏳ Activo
- **Fecha de Registro**: 2026-06-23
- **Severidad**: Alta (Afecta a la creación de nuevas cartas con plantillas por defecto)

---

## 1. Descripción del Requerimiento / Bug
Al crear una nueva carta usando una plantilla por defecto (como "Plantilla Vacía" con ID `vacia`), editar su diseño/capas y hacer clic en **"Exportar Plantilla"**, la aplicación descarga el archivo `.cdc2t` pero mantiene el ID original de la plantilla (`vacia`) en el callback `onExportTemplate`.

### Causa Raíz:
1. En `EditCardModal.tsx`, la función `handleExportTemplate` genera un clon de la plantilla (`updatedTemplate`) usando `{ ...plantillaActiva }` pero **no cambia el ID de la plantilla** si esta era una plantilla por defecto (sigue teniendo `id: "vacia"`).
2. En `App.tsx`, el callback `onExportTemplate` recibe la plantilla y actualiza el map global `templatesMap`:
   ```typescript
   setTemplatesMap((prev) => ({
     ...prev,
     [plantilla.id]: plantilla,
   }));
   ```
   Dado que `plantilla.id` sigue siendo `"vacia"`, la plantilla vacía por defecto se sobreescribe en memoria con el nuevo diseño personalizado.
3. Al añadir posteriormente una nueva carta seleccionando la "Plantilla Vacía", se lee de `templatesMap["vacia"]`, que ahora contiene el diseño modificado anteriormente (con textos como `{{titulo}}`), en lugar de instanciarse una carta vacía.

### Comportamiento Esperado:
- Al exportar una plantilla desde una carta, si el ID de la plantilla base es de una plantilla por defecto (`"vacia"` o `"simple"`), la función debe generar un nuevo ID único (UUID o timestamp + aleatorio) para la plantilla exportada.
- De este modo, la plantilla exportada se añadirá como una plantilla independiente en el mapa global y en el panel de "Plantillas Importadas", dejando las plantillas por defecto (`"vacia"` y `"simple"`) completamente intactas y limpias.

---

## 2. Archivos Implicados
- [`client/src/EditCardModal.tsx`](file:///c:/Users/victo/proyectos/cdc2/client/src/EditCardModal.tsx) (función `handleExportTemplate`)
- [`client/src/App.tsx`](file:///c:/Users/victo/proyectos/cdc2/client/src/App.tsx) (callback `onExportTemplate` de `<EditCardModal />`)

---

## 3. Plan de Verificación y Criterios de Aceptación
- [ ] Crear un nuevo proyecto.
- [ ] Añadir una carta basada en la **Plantilla Vacía (Sólo Fondo)**.
- [ ] Abrir el modal de edición de esa carta, ir a la pestaña **Diseño** y añadir un elemento de texto.
- [ ] Hacer clic en **Exportar Plantilla** y guardarla como "Mi Nueva Plantilla".
- [ ] Cerrar el modal.
- [ ] Hacer clic en "Añadir Carta" y seleccionar de nuevo **Plantilla Vacía (Sólo Fondo)**.
- [ ] Verificar que la nueva carta añadida está completamente vacía (sólo fondo blanco) y no contiene el elemento de texto que se añadió a la otra carta.
- [ ] Verificar que la plantilla personalizada aparece correctamente listada de forma independiente bajo "Plantillas Importadas" con el nombre "Mi Nueva Plantilla".
