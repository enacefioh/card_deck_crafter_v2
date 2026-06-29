# Ticket - TKT-022: Corrección de Bordes en Capas de Imagen

- **ID del Ticket**: TKT-022
- **Estado**: 🔴 Activo (Pendiente)
- **Fecha de Registro**: 2026-06-29
- **Severidad**: Media-Alta (Error visual en el editor y previsualización de cartas)

---

## 1. Descripción del Requerimiento
En el editor de cartas (`EditCardModal.tsx`) y en el detalle de cartas (`DetailModal.tsx`), cuando se clona o añade una capa de imagen, los bordes configurados por el usuario desde el inspector de propiedades no se visualizan correctamente, a pesar de que el estado y el inspector contienen los valores adecuados.

- **Causa Raíz**: 
  - La propiedad shorthand `border` se asigna dinámicamente como `border: showPlaceholder ? "1px dashed #cbd5e1" : undefined`.
  - Esta declaración de `border` sobrescribe y anula las propiedades específicas de bordes por lados (`borderTop`, `borderRight`, etc.) que se inyectan a través de `...borderCornersStyle`.
- **Objetivo**:
  - Evitar el uso de la propiedad shorthand `border` al construir el objeto de estilos en React para el elemento de imagen.
  - Si `showPlaceholder` es verdadero, los bordes punteados del placeholder deben aplicarse de forma individual para evitar conflictos de sobreescritura.

---

## 2. Archivos Implicados
- [`client/src/EditCardModal.tsx`](file:///c:/Users/victo/proyectos/cdc2/client/src/EditCardModal.tsx)
- [`client/src/DetailModal.tsx`](file:///c:/Users/victo/proyectos/cdc2/client/src/DetailModal.tsx)

---

## 3. Plan de Verificación y Criterios de Aceptación
- [ ] Crear o duplicar una capa de imagen.
- [ ] Modificar sus bordes en el inspector (ej. 3px sólido rojo).
- [ ] Cargar una imagen en la capa y comprobar que el borde de 3px rojo se visualiza inmediatamente en el editor y al abrir la vista de detalle de la carta.
