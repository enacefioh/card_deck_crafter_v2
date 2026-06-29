# Ticket - TKT-024: Desalineación y Corte de Imágenes con Borde al Variar Zoom

- **ID del Ticket**: TKT-024
- **Estado**: 🔴 Activo (Pendiente)
- **Fecha de Registro**: 2026-06-29
- **Severidad**: Media (Error visual de layout en el tablero principal)

---

## 1. Descripción del Requerimiento
En el tablero de la página principal (`App.tsx`), cuando las cartas renderizan capas de imagen (`"image"` o `"image-switch"`) que poseen bordes configurados, estas aparecen desalineadas, ligeramente desplazadas hacia la derecha/abajo, y cortadas por la parte inferior. Este error de desalineación se vuelve proporcionalmente más grave a medida que disminuye el `zoomFactor`.

- **Causa Raíz**: 
  - A diferencia del editor de cartas (`EditCardModal.tsx`), el contenedor `div` de la capa de imagen en `App.tsx` carece de una distribución flexbox (`display: "flex"`, `alignItems: "center"`, `justifyContent: "center"`).
  - Dado que la etiqueta `<img>` es por defecto un elemento `inline`, el navegador deja una holgura inferior (descender/baseline gap) basada en la tipografía/line-height del contenedor padre.
  - Al no estar escalada la línea de base tipográfica por el `zoomFactor`, cuando el zoom disminuye, esta holgura constante en píxeles representa un porcentaje cada vez mayor del tamaño de la carta, provocando un desfase visual y un recorte notorio en la parte inferior de la imagen.

- **Objetivo**:
  - Homogeneizar el estilo del contenedor de imagen de `App.tsx` (anverso y reverso) para que utilice `display: "flex"`, `alignItems: "center"`, y `justifyContent: "center"`, eliminando el desfase de la línea de base y alineando la imagen de forma idéntica a como se ve en el editor.

---

## 2. Archivos Implicados
- [`client/src/App.tsx`](file:///c:/Users/victo/proyectos/cdc2/client/src/App.tsx)

---

## 3. Plan de Verificación y Criterios de Aceptación
- [ ] Configurar una carta con una imagen con borde (ej. 3px negro).
- [ ] Comprobar que en la página de inicio (tablero general) la imagen se visualiza perfectamente alineada y sin recortes por la parte inferior.
- [ ] Modificar el zoom general del tablero usando el slider deslizador y verificar que a cualquier nivel de zoom (máximo o mínimo) las imágenes con borde se mantienen perfectamente encuadradas y proporcionadas.
