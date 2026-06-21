# Ticket - TKT-004: Optimización de Impresión Nativa del Navegador (@media print)

- **ID del Ticket**: TKT-004
- **Estado**: 🔴 Activo (Pendiente)
- **Fecha de Registro**: 2026-06-21
- **Severidad**: Media (Funcionalidad alternativa de impresión física)

---

## 1. Descripción del Requerimiento
Actualmente, si un usuario pulsa `Ctrl + P` (o clic derecho -> Imprimir) en el navegador para imprimir la página web directamente, se intenta imprimir toda la interfaz de usuario del editor (el panel lateral, los botones, la barra superior, etc.), lo cual desmaqueta las cartas y desperdicia hojas.

- **Objetivo**: Añadir reglas CSS específicas de impresión (`@media print`) para:
  - Ocultar la barra superior de menú (`MenuBar`), el panel lateral de ajustes (`sidebar`), el header del canvas, los botones de zoom, y cualquier otra interfaz de usuario que no sean las cartas.
  - Asegurar que el contenedor del lienzo principal (`virtual-page-container`) se posicione de manera óptima en el papel, centrándose y ocupando el ancho completo de impresión.
  - Ocultar guías visuales o contornos de selección interactivos de las cartas cuando se está imprimiendo.
  - Configurar las dimensiones físicas de la página de acuerdo al estándar de CSS Paged Media si es viable.

---

## 2. Archivos Implicados
- [`client/src/App.css`](file:///c:/Users/victo/proyectos/cdc2/client/src/App.css)
- [`client/src/index.css`](file:///c:/Users/victo/proyectos/cdc2/client/src/index.css)

---

## 3. Plan de Verificación y Criterios de Aceptación
- [ ] Conectar la app e ir a la página de edición con cartas maquetadas.
- [ ] Presionar `Ctrl + P` para abrir el diálogo de impresión nativo del navegador.
- [ ] Comprobar que en la vista previa de impresión:
  - Únicamente se visualizan las hojas del Canvas de Impresión Virtual (con su distribución de cartas y líneas de corte).
  - No aparece ningún elemento de la interfaz de usuario del editor (panel lateral de control, botones, fondo gris del área de trabajo, etc.).
  - Las dimensiones se corresponden con la escala de la hoja elegida.
