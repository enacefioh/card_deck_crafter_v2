# TKT-063: Consolidación de Historial por Foco/Blur en Campos de Texto del Inspector del Lienzo (SRS-088)

## Estado: Pendiente de Implementación
**Fecha:** 2026-10-26  
**Prioridad:** Media  
**Tipo:** Mejora de UX / Refactorización de Historial  
**Relacionado con:** [SRS-088: Historial de Deshacer y Rehacer en el Lienzo](developer/specs/completed/srs_088_historial_deshacer_rehacer_lienzo.md)  
**Alcance:** Frontend (`client/src/App.tsx`)  

---

## 1. Descripción del Problema

En la implementación actual del historial de deshacer y rehacer del lienzo general (SRS-088), al modificar campos de texto de las cartas a través del inspector lateral (por ejemplo, textos de capa, nombres de cartas o valores de variables de plantilla), cada evento `onChange` desencadena una actualización en `setDocumentosHistory(nuevosDocumentos)`. 

Esto provoca que:
1. Al escribir una palabra o frase de 15 caracteres, se creen 15 estados intermedios en la pila `past` de `useHistory`.
2. Para deshacer un cambio de texto, el usuario debe pulsar `Ctrl+Z` tantas veces como caracteres haya tecleado, en lugar de deshacer el bloque de edición completo.
3. Se consumen rápidamente los 40 pasos máximos configurados en el historial del lienzo con fragmentos parciales de texto, desplazando del historial acciones anteriores más importantes (como duplicación o borrado de cartas).

---

## 2. Solución Propuesta

Implementar la misma política de consolidación atómica que la definida en **SRS-090** para los campos de texto del inspector lateral de la mesa de trabajo (`App.tsx`):

1. **Captura de Valor Inicial (`onFocus`)**:
   - Al hacer clic o tabular hacia cualquier campo de texto o textarea editable del inspector, se memoriza el valor de partida en una referencia o estado transitorio (`focusedValueRef.current = valorActual`).

2. **Edición Fluida en Tiempo Real (`onChange`)**:
   - Cada pulsación de tecla actualiza los documentos en memoria para que la carta en el lienzo se actualice visualmente al instante a 60 FPS, pero utilizando la opción `{ skipHistory: true }`:
     ```typescript
     setDocumentosHistory(nuevosDocs, { skipHistory: true });
     ```

3. **Consolidación Definitiva en Desenfoque (`onBlur`)**:
   - Al salir del campo de texto o cambiar el foco a otro elemento de la interfaz:
     - Si el valor final coincide con `focusedValueRef.current`, no se realiza ninguna acción.
     - Si el valor final es diferente, se ejecuta un commit explícito en el historial sin `skipHistory`:
       ```typescript
       setDocumentosHistory(nuevosDocs); // Registra 1 único paso atómico
       ```

---

## 3. Criterios de Aceptación y Verificación

1. Escribir una palabra completa en cualquier campo de texto del inspector del lienzo (ej. *"Héroe legendario"*) solo debe generar **un único paso** en el historial al perder el foco (`blur`).
2. Al pulsar `Deshacer (Ctrl+Z)` o el botón `↶` del lienzo tras editar un texto, el campo debe retornar inmediatamente a su texto original completo previo al foco, sin pasar por letras intermedias.
3. Los cambios instantáneos que no son campos de texto (ej. sliders, selectores de color, duplicar o mover cartas) continuarán registrándose inmediatamente en el historial como hasta ahora.
4. Crear pruebas unitarias que validen la secuencia `focus -> multiple change (skipHistory) -> blur (commit)` en el inspector de `App.tsx`.
