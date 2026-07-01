# TKT-029: Soporte de interpolación dinámica de placeholders en capas de texto

## Descripción del Problema
Al importar o cargar proyectos `.cdc2`, las capas de texto que utilizan variables muestran el texto sin procesar como `{{Variable}}` en lugar de su valor asignado (ej. `100`). Esto ocurre porque la función `renderizarTextoCapa` solo devuelve el valor del campo si coincide exactamente con el nombre de la capa, pero no procesa marcadores/placeholders de sustitución dinámicos como `{{clave}}` dentro de la cadena de texto base.

## Solución Propuesta
Modificar `renderizarTextoCapa` en el frontend (`App.tsx`, `EditCardModal.tsx`) y en el backend (`index.ts`, `debug_html.ts`) para que realice una sustitución global mediante una expresión regular `/\{\{([^}]+)\}\}/g`, reemplazando cada marcador con el valor correspondiente de `valoresCampos` si este existe.
