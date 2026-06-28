# Ticket - TKT-018: Conversión Inesperada de Texto Multilínea a Línea Simple

- **ID del Ticket**: TKT-018
- **Estado**: 🔴 Activo (Pendiente)
- **Fecha de Registro**: 2026-06-28
- **Severidad**: Baja/Media (Comportamiento confuso de la interfaz)

---

## 1. Descripción del Requerimiento
El usuario ha reportado que, en ocasiones, al añadir o editar un texto multilínea, este se convierte de forma inesperada en un campo de texto de una sola línea. No ha podido replicar el problema con exactitud.

### Causa Identificada (Análisis del Código)
Al revisar la estructura de [`EditCardModal.tsx`](file:///c:/Users/victo/proyectos/cdc2/client/src/EditCardModal.tsx), tanto en la pestaña de **Contenido** como en la de **Diseño**, la decisión de renderizar un control de texto de una sola línea (`<input type="text">`) o multilínea (`<textarea>`) depende exclusivamente del alto físico de la capa en milímetros:
```typescript
selectedCapa.altoMm > 15 ? <textarea ... /> : <input type="text" ... />
```

Si el usuario reduce el alto de la capa (mediante redimensionado interactivo o cambiando manualmente el valor en milímetros a `15` o menos), el editor de texto se transforma automáticamente a un `<input>` de una línea, lo que colapsa visualmente los saltos de línea del contenido.

- **Objetivo**:
  - Registrar este ticket para documentar la causa.
  - El usuario no ha podido reproducir el problema con pasos exactos en esta sesión, por lo que este ticket servirá para recopilar notas o proponer una solución estructurada si vuelve a suceder.
  - Posibles soluciones a considerar en el futuro:
    * Añadir una propiedad explícita en el modelo de la capa (ej. `multiline: boolean`) independiente de la dimensión física de la capa.
    * Ajustar o flexibilizar el umbral de `15` mm.

---

## 2. Archivos Implicados
- [`client/src/EditCardModal.tsx`](file:///c:/Users/victo/proyectos/cdc2/client/src/EditCardModal.tsx) (Líneas ~1563 y ~1981)

---

## 3. Plan de Verificación y Criterios de Aceptación
- [ ] Documentar y mantener este ticket activo para seguimiento del usuario.
- [ ] En futuras sesiones, definir si se prefiere una opción explícita (check de multilínea) para fijar el comportamiento de la capa.
