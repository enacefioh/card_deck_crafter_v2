# Ticket - TKT-006: Abrir Editor Modal al Hacer Doble Clic sobre una Carta

- **ID del Ticket**: TKT-006
- **Estado**: ⏳ Activo
- **Fecha de Registro**: 2026-06-22
- **Severidad**: Baja (Mejora de UX)

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
- [ ] Hacer doble clic sobre una carta del lienzo.
- [ ] Comprobar que se abre inmediatamente el modal de edición `EditCardModal` cargando los datos de la carta correspondiente.
- [ ] Asegurarse de que el comportamiento no interfiere con el clic simple para seleccionar/deseleccionar cartas de forma normal.
