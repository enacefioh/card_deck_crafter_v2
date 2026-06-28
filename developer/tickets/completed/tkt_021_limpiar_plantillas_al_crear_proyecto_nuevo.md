# Ticket - TKT-021: Limpiar Plantillas Importadas al Crear un Nuevo Proyecto

- **ID del Ticket**: TKT-021
- **Estado**: 🟢 Completado
- **Fecha de Registro**: 2026-06-28
- **Severidad**: Baja (Inconsistencia de estado en memoria)

---

## 1. Descripción del Requerimiento
Cuando un usuario crea un nuevo proyecto haciendo clic en el botón *"Crear Nuevo Proyecto"* (o mediante la barra de menú/opciones de reinicio), el sistema realiza un reset del estado de las cartas, el nombre del proyecto, la configuración del canvas, etc. 

Sin embargo, **no se limpia la lista de plantillas cargadas** (`templatesMap`). Esto provoca que las plantillas del proyecto anterior permanezcan visibles y disponibles en el nuevo proyecto, lo cual es incorrecto y confuso.

- **Objetivo**:
  - En la función `handleNuevoProyecto` de [`App.tsx`](file:///c:/Users/victo/proyectos/cdc2/client/src/App.tsx), limpiar el mapa de plantillas llamando a `setTemplatesMap({})` para asegurar un estado inicial totalmente limpio.

---

## 2. Archivos Implicados
- [`client/src/App.tsx`](file:///c:/Users/victo/proyectos/cdc2/client/src/App.tsx) (Función `handleNuevoProyecto`)

---

## 3. Plan de Verificación y Criterios de Aceptación
- [x] Importar o crear una plantilla en un proyecto activo.
- [x] Hacer clic en el botón para crear un nuevo proyecto ("Crear Nuevo Proyecto") y aceptar el aviso de confirmación.
- [x] Comprobar que en la lista de selección de plantillas de la interfaz, las plantillas del proyecto anterior ya no están disponibles.
