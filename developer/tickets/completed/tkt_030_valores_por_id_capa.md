# TKT-030: Desvincular valores de capas de sus nombres legibles (Clave por ID de capa)

## Descripción del Problema
Cuando el usuario define múltiples capas de texto con el mismo nombre legible (por ejemplo, dos títulos en contenedores de habilidad diferentes con el nombre `"título"`), se produce una colisión en `valoresCampos` porque la clave utilizada para almacenar los valores de la carta es el nombre legible de la capa (`capa.nombre`). Como consecuencia:
1. Al editar el texto de una capa, se sobrescribe en tiempo real el valor de cualquier otra capa que comparta el mismo nombre.
2. Al duplicar elementos, los valores se acoplan.

## Análisis de otros Elementos
*   Las capas de tipo `image` e `image-switch` guardan sus valores específicos de carta en `capasOverrides` utilizando la clave `capa.id` (única e inmutable). Por tanto, **solo las capas de texto** sufren de este conflicto en `valoresCampos`.

## Solución Propuesta
1. Utilizar la propiedad interna única `capa.id` en lugar de `capa.nombre` como clave en `valoresCampos` y `valoresCamposTrasera`.
2. Actualizar las funciones `renderizarTextoCapa` en el frontend y en el backend para recuperar el valor de la capa usando `valoresCampos[capa.id]`.
3. Para la interpolación de placeholders (ej. `{{título}}`), buscar la capa en la plantilla por su nombre `capa.nombre === clave` y reemplazar con el valor asociado a su `id`.
4. **Migración Automática**: Al cargar un proyecto, si detectamos claves en `valoresCampos` que coinciden con los nombres de las capas en lugar de sus IDs, realizaremos una equivalencia automática a nivel de carga para que el usuario pueda seguir editando sus archivos sin perder información.
