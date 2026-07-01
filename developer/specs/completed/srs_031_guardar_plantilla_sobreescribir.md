# SRS-031: Guardar y Sobrescribir Plantillas en el Editor de Cartas

## Descripción del Problema
Actualmente, el botón **Guardar Plantilla** en el editor de cartas siempre genera una copia con un nuevo ID, lo que provoca duplicaciones innecesarias cuando el usuario realiza múltiples ediciones sobre la misma plantilla.

## Requisitos Funcionales

### RF-1: División de Acciones
El botón único de guardar plantilla en la esquina inferior izquierda del editor de cartas se dividirá en dos opciones diferenciadas:
1. **Guardar Plantilla**:
   * Si la plantilla activa es nueva o es una por defecto (`"simple"`, `"vacia"`), solicitará el nombre al usuario y guardará una nueva plantilla con un nuevo ID.
   * Si la plantilla activa ya es una plantilla personalizada existente (ya posee un ID de usuario), guardará los cambios sobrescribiendo la versión existente con el mismo ID y nombre, sin solicitar confirmación de nombre al usuario.
2. **Guardar Plantilla como...**:
   * Solicitará siempre un nuevo nombre al usuario y creará una copia independiente con un nuevo ID.

### RF-2: Conservar Referencias en Cartas Existentes
* Al sobrescribir una plantilla con el mismo ID, las cartas que ya tuvieran asignada esa plantilla no verán alterado su contenido interno inmediatamente (cada carta almacena su propia copia de `plantilla` al asignarse).

### RF-3: Alerta de Descarte al Cerrar
* Al cerrar o cancelar el editor de cartas, la aplicación únicamente advertirá al usuario si desea descartar los cambios realizados sobre la **carta misma**, sin emitir alertas relacionadas a la edición de la plantilla. Esto permite modificar temporalmente una carta con textos genéricos para exportar/guardar la plantilla, y luego salir descartando los cambios de la carta para restaurarla a su estado original.

## Cambios Propuestos

### Componente del Editor (`client`)
* **EditCardModal.tsx**:
  * Modificar `ejecutarExportacion` para aceptar el parámetro `esGuardarComo`.
  * Adaptar `prepararPlantillaParaExportacion` (o crear una variante) para permitir reutilizar el ID existente si no es un "Guardar como" y no es una plantilla por defecto.
  * Cambiar el bloque de botones en `template-actions-group` para mostrar tanto el botón **Guardar Plantilla** como **Guardar como...**.
