# Ticket - TKT-040: Cruce de Referencias y Elementos Zombie al Eliminar Contenedores

**Estado: COMPLETADO**

---

## 1. Síntomas y Diagnóstico
Al trabajar en cartas complejas (como las de la segunda página "Habilidades" en `temp/project.json`):
1. **Propiedades Zombie de Capas Eliminadas**: Al borrar una capa de tipo contenedor (como `"Habilidad 1"`), las propiedades expuestas asociadas a elementos anidados en el contenedor borrado seguían apareciendo en el panel de edición lateral.
2. **Cruce de Referencias**: Al modificar valores o visibilidad de la nueva capa duplicada (`"Habilidad 2"`), el cambio afectaba erróneamente en el lienzo a la capa borrada (`"Habilidad 1"`), o bien las modificaciones de textos no tenían efecto en el elemento esperado.

### Causa:
- La función de eliminación de capas `handleDeleteCapa` de `EditCardModal.tsx` solo eliminaba la capa contenedora seleccionada. Todas las capas secundarias y textos anidados (hijos) dentro del contenedor no eran eliminadas y quedaban huérfanas pero vivas en el listado de capas de la plantilla (`plantilla.capas`).
- Las propiedades expuestas de estas capas huérfanas seguían en `exposedProperties`, haciendo referencia a las IDs zombies.
- Los valores específicos de carta (`valoresCampos` y `capasOverrides`) correspondientes a las IDs borradas no se limpiaban, lo que provocaba que al heredar nombres idénticos o cruzados por duplicaciones sucesivas, las referencias internas colisionaran.

---

## 2. Solución Aplicada
En `handleDeleteCapa` dentro de [EditCardModal.tsx](file:///c:/Users/victo/proyectos/cdc2/client/src/EditCardModal.tsx):
1. **Borrado Recursivo**: Implementada una función recursiva que identifica todos los IDs de capas descendientes del contenedor a borrar. Ahora se eliminan tanto la capa seleccionada como todas sus hijas en cascada del listado `capas`.
2. **Limpieza de Propiedades Expuestas**: Se filtran y eliminan del listado de propiedades expuestas (`exposedProperties`) todas aquellas cuya `layerId` pertenezca a la lista de capas eliminadas.
3. **Limpieza de Valores y Overrides**: Se eliminan de forma explícita las referencias del estado local (`valoresCampos`, `valoresCamposTrasera`, `capasOverrides` y `capasOverridesTrasera`) de todas las capas borradas para evitar que las referencias queden en memoria.
