# Ticket - TKT-057: Ajustes de Espacio y Solapamientos en Inspector Compacto de EditCardModal (SRS-083)

- **ID del Ticket**: TKT-057
- **Estado**: 🟢 Completado
- **Fecha de Registro**: 2026-10-20
- **Fecha de Cierre**: 2026-10-21
- **Severidad**: Media (Defectos visuales de solapamiento en controles del inspector compacto en modal de cartas)

---

## 1. Descripción del Problema
Tras la implementación de la densidad visual del inspector (SRS-083), en resoluciones estándar se observan pequeños desbordamientos y solapamientos en varias filas tabulares:
1. **Alineación rápida y botón Editar en Lienzo**: El botón de "Editar en Lienzo" se solapa sobre el último botón (expandir ⏹️) de la barra de utilidades de alineación.
2. **Input de tamaño de texto**: El campo numérico de tamaño en pt queda excesivamente estrecho, viéndose únicamente los botones de incremento/decremento y ocultando el número.
3. **Color de texto y contorno**: El campo de código hexadecimal del color de texto invade y se superpone visualmente sobre la etiqueta "CONTORNO".
4. **Registro de subplantilla en capas de tipo Lista**: En el bloque de guardar elemento hijo como subplantilla, los inputs de texto quedan aplastados con ancho casi nulo y el botón "➕ Registrar Subplantilla" ocupa la mayor parte del espacio.
5. **Ancho general del inspector**: El inspector se beneficia de una ampliación de ancho (de 432px a 480px) aprovechando el espacio libre de la columna de previsualización.

---

## 2. Solución a Implementar
1. **Ampliación del inspector a 480px**:
   - Actualizar `--edit-inspector-width: 480px;` en `client/src/EditCardModal.css`.
2. **Alineación rápida y botón En Lienzo**:
   - Ajustar el contenedor derecho a `flex: 0 0 auto; margin-left: auto;` y el izquierdo a `flex: 1; min-width: 0;`, garantizando separación sin solapamiento.
3. **Input de tamaño de texto**:
   - Rebalancear proporciones flex en la fila de tipografía (`flex: 1.1` para fuente y `flex: 0.9` para tamaño), asegurando `min-width: 48px` en el input numérico.
4. **Color de texto y contorno**:
   - Ajustar la etiqueta compacta a "Color" (con tooltip completo "Color de Texto"), flex balanceado y ancho adecuado de 54px para el input hexadecimal.
5. **Registro de subplantilla en lista**:
   - Reducir el texto del botón a "Registrar", forzar `width: auto; flex: 0 0 auto; margin: 0;` para anular el `width: 100%` global de `.btn-primary` y permitir que los campos de Nombre y Tag se expandan con `flex: 1.2` y `flex: 0.8` sin desbordar el contenedor.

---

## 3. Archivos Implicados
- [`client/src/EditCardModal.css`](file:///c:/Users/victo/proyectos/cdc2/client/src/EditCardModal.css)
- [`client/src/EditCardModal.tsx`](file:///c:/Users/victo/proyectos/cdc2/client/src/EditCardModal.tsx)
- [`client/src/SRS083InspectorCompactoEditorCarta.test.tsx`](file:///c:/Users/victo/proyectos/cdc2/client/src/SRS083InspectorCompactoEditorCarta.test.tsx)
