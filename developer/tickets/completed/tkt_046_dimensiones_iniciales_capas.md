# Ticket - TKT-046: Rediseño de Dimensiones y Posición Inicial de Nuevas Capas

- **ID del Ticket**: TKT-046
- **Estado**: 🟢 Completado
- **Fecha de Registro**: 2026-07-20
- **Fecha de Resolución**: 2026-07-20
- **Severidad**: Baja (Usabilidad y consistencia en el diseño de plantillas)

---

## 1. Descripción del Problema
Al añadir elementos de tipo Imagen o Imagen Switch en el editor de cartas, es deseable que inicialmente se posicionen en la coordenada `0, 0` con el ancho y alto del contenedor padre (o del lienzo de la carta si no tiene contenedor).
En el caso del Texto, se requiere que tenga el ancho del contenedor padre (o del lienzo), la posición `0, 0` e inicialmente una altura equivalente a `24pt` (el doble de los `12pt` base) para evitar que se recorte visualmente en pantallas y renderizados de PDF.

---

## 2. Solución Implementada
1. **Deducción Dinámica del Tamaño del Padre**:
   - En `handleAddElement` de `EditCardModal.tsx`, se busca si hay una capa seleccionada y se determina su contenedor inmediato.
   - Se obtienen las dimensiones del contenedor (`parentWidth` y `parentHeight`). Si no existe, se deflacta a las dimensiones del lienzo del proyecto (`cardConfig.anchoMm`/`cardConfig.altoMm`).
2. **Dimensionado y Posicionamiento Inicial**:
   - Capas `image` e `image-switch`: Posición en `(0, 0)` y dimensiones al 100% de `parentWidth`/`parentHeight`.
   - Capas `text`: Posición `(0, 0)`, ancho del 100% (`parentWidth`) e inicialización del alto a `8.46 mm` (el doble de 12pt en milímetros).

---

## 3. Archivos Implicados
- [`client/src/EditCardModal.tsx`](file:///c:/Users/victo/proyectos/cdc2/client/src/EditCardModal.tsx): Ajustar los valores de inicialización en `handleAddElement`.
- [`client/src/MenuBar.tsx`](file:///c:/Users/victo/proyectos/cdc2/client/src/MenuBar.tsx): Incrementar la versión visible a la `v2.260720.1`.

---

## 4. Plan de Verificación y Criterios de Aceptación
- [x] Añadir una capa de Imagen y verificar que se ajusta al tamaño total de la carta (o de su contenedor contenedor) en la coordenada (0, 0).
- [x] Añadir una capa de Imagen Switch y verificar el mismo ajuste del 100% de ancho/alto y posición (0, 0).
- [x] Añadir una capa de Texto y verificar que su ancho es del 100% de su padre, su posición x/y es (0, 0) y su alto inicial es de `8.46 mm` (doble de la altura de 12pt).
- [x] Ejecutar la suite de tests de Vitest para garantizar que todo compila y pasa correctamente.
