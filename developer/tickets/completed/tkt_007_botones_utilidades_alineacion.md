# Ticket - TKT-007: Botones de Utilidades de Posición y Tamaño en Editor

- **ID del Ticket**: TKT-007
- **Estado**: 📝 Convertido en Spec (SRS-017)
- **Fecha de Registro**: 2026-06-23
- **Severidad**: Baja (Mejora de UX y Productividad)

---

## 1. Descripción del Requerimiento
Añadir varios botones de utilidades rápidas en la zona de posición y tamaño (inspector de diseño del editor modal). Estos botones permitirán realizar ajustes geométricos instantáneos sobre la capa seleccionada.

Se deben posicionar como iconos en la parte superior antes de los campos específicos de posición y tamaño. Las opciones son:
- **Arriba**: Mover la capa al borde superior de la carta (Y = 0).
- **Abajo**: Mover la capa al borde inferior (Y = alto de la carta - alto de la capa).
- **Izquierda**: Mover la capa al borde izquierdo (X = 0).
- **Derecha**: Mover la capa al borde derecho (X = ancho de la carta - ancho de la capa).
- **Ancho Máximo**: Ajustar el ancho de la capa al ancho total de la carta (ancho = ancho de la carta).
- **Alto Máximo**: Ajustar el alto de la capa al alto total de la carta (alto = alto de la carta).
- **Expandir**: Ajustar la capa a pantalla completa (X = 0, Y = 0, ancho = ancho de la carta, alto = alto de la carta).

---

## 2. Archivos Implicados
- [`client/src/EditCardModal.tsx`](file:///c:/Users/victo/proyectos/cdc2/client/src/EditCardModal.tsx)

---

## 3. Plan de Verificación y Criterios de Aceptación
- [ ] Verificar que aparecen los iconos/botones de utilidades arriba de los campos de entrada de X, Y, Ancho, Alto.
- [ ] Seleccionar una capa y pulsar cada botón:
  - "Arriba" coloca Y en 0.
  - "Abajo" coloca Y al final.
  - "Izquierda" coloca X en 0.
  - "Derecha" coloca X al final.
  - "Ancho Máximo" ajusta el ancho de la capa al de la carta.
  - "Alto Máximo" ajusta el alto de la capa al de la carta.
  - "Expandir" aplica todos los límites máximos y posición inicial 0,0.
- [ ] Asegurarse de que el lienzo central de previsualización se redibuja en tiempo real.
