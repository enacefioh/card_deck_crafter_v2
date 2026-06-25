# Ticket - TKT-015: Soporte Completo de Reducción de Arte al Borde en Plantillas

- **ID del Ticket**: TKT-015
- **Estado**: 🟢 Completado
- **Fecha de Registro**: 2026-06-25
- **Severidad**: Media-Alta (Desalineación y solapamiento visual en impresión/PDF)

---

## 1. Descripción del Requerimiento
La aplicación cuenta con una opción de configuración de carta llamada `"Borde corte (mm)"`. Su propósito es que, si la carta tiene un borde de corte de color (`bordeCorteMm > 0`), el diseño interior de la carta se encoja para dejar espacio libre para el borde, evitando que este se solape con el contenido o las ilustraciones.

Sin embargo, el comportamiento actual presenta un fallo grave cuando la carta utiliza una **plantilla** (diseño con capas):
1.  **En el Frontend**: El contenedor de renderizado de plantilla (`card-template-render`) ignora por completo la opción `reducirArteAlBorde`. Se dibuja a pantalla completa (`left: 0`, `top: 0`, `width: 100%`, `height: 100%`), haciendo que el borde de color se dibuje encima y tape el contenido periférico de las capas.
2.  **En el Servidor (PDF)**: El backend también renderiza de la misma manera el borde solapandolo al contenido.

- **Objetivo**:
  - Asegurar que, cuando el borde corte no sea 0:
    - Las dimensiones del contenedor de la plantilla se reduzcan al área interna disponible.
    - El diseño de la plantilla (todas sus capas de fondo, texto e imagen) se escale proporcionalmente mediante transformaciones CSS (`transform: scale(...)` y `transform-origin: top left`) tanto en el cliente como en la exportación a PDF para garantizar una fidelidad del 100% y evitar solapamientos.

---

## 2. Archivos Implicados
- [`client/src/App.tsx`](file:///c:/Users/victo/proyectos/cdc2/client/src/App.tsx) (Renderizado del lienzo principal)
- [`client/src/DetailModal.tsx`](file:///c:/Users/victo/proyectos/cdc2/client/src/DetailModal.tsx) (Renderizado de vista detallada)
- [`client/src/EditCardModal.tsx`](file:///c:/Users/victo/proyectos/cdc2/client/src/EditCardModal.tsx) (Previsualización del editor de carta)
- [`server/src/index.ts`](file:///c:/Users/victo/proyectos/cdc2/server/src/index.ts) (Generación de PDF en backend)
- [`server/src/debug_html.ts`](file:///c:/Users/victo/proyectos/cdc2/server/src/debug_html.ts) (Debug HTML en backend)

---

## 3. Plan de Verificación y Criterios de Aceptación
- [x] Crear un proyecto con una carta que use una plantilla con elementos de texto e imagen ubicados cerca de los bordes.
- [x] En la barra de configuración lateral, establecer un Borde de Corte de `5mm` de color rojo.
- [x] Comprobar que en el lienzo del frontend:
  - Todo el diseño de la plantilla se encoge de manera uniforme.
  - El borde rojo de 5mm se dibuja alrededor sin tapar el texto ni las imágenes periféricas.
- [x] Comprobar en el editor de carta modal (`EditCardModal.tsx`) que el borde no se solape ni oculte el contenido, mostrándose en su lugar un borde de contorno de referencia simple de 1px.
- [x] Exportar el proyecto a PDF y verificar que las cartas resultantes muestran exactamente el mismo escalado y que el contenido no se solapa con el borde (asegurando el reinicio del servidor backend para cargar los cambios de escala).
