# Ticket - TKT-006: Abrir Editor Modal al Hacer Doble Clic sobre una Carta

- **ID del Ticket**: TKT-006
- **Estado**: ✅ Completado
- **Fecha de Registro**: 2026-06-22
- **Fecha de Resolución**: 2026-06-23
- **Severidad**: Baja (Mejora de UX)

---

## Resolución e Implementación
- **Solución Aplicada**:
  - Se añadieron manejadores `onDoubleClick` a los contenedores visuales de cartas (`card-slot`) tanto en la maquetación de la página frontal como en la página trasera en [client/src/App.tsx](file:///c:/Users/victo/proyectos/cdc2/client/src/App.tsx).
  - Al recibir el evento de doble clic, se propaga la llamada `setEditingCardId(slot.cartaId)` para abrir el modal `EditCardModal` correspondiente a esa carta.
  - Se incluye `e.stopPropagation()` para evitar interferir con las lógicas nativas del contenedor de página o clics simples de selección de cartas.

---

## 1. Descripción del Requerimiento
Para agilizar el flujo de trabajo, el usuario debería poder abrir el editor de cartas modal a pantalla completa (`EditCardModal`) haciendo doble clic (`double click`) directamente sobre cualquier carta de la baraja representada en el lienzo principal, en lugar de tener que seleccionarla primero y navegar por el menú o usar el botón correspondiente.

- **Comportamiento Esperado**:
  - Al realizar un doble clic sobre el contenedor visual de una carta en el panel central de previsualización de hojas:
    - Se debe disparar la apertura del `EditCardModal` para esa carta específica.
    - Esto debe ser equivalente a hacer clic en el botón de edición `✏️` de la carta.

---

## 2. Archivos Implicados
- [`client/src/App.tsx`](file:///c:/Users/victo/proyectos/cdc2/client/src/App.tsx)

---

## 3. Plan de Verificación y Criterios de Aceptación
- [x] Hacer doble clic sobre una carta del lienzo.
- [x] Comprobar que se abre inmediatamente el modal de edición `EditCardModal` cargando los datos de la carta correspondiente.
- [x] Asegurarse de que el comportamiento no interfiere con el clic simple para seleccionar/deseleccionar cartas de forma normal.
