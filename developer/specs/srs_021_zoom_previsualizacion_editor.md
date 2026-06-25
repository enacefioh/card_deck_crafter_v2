# Especificación Técnica - SRS-021: Control de Zoom en Previsualización del Editor de Cartas

Este documento describe la especificación técnica para implementar un control de zoom dinámico en la previsualización del editor interactivo de cartas (`EditCardModal`). Esto permitirá a los usuarios ajustar de forma libre el tamaño del lienzo de trabajo según la resolución y dimensiones de sus monitores.

---

## 1. Introducción y Objetivos
*   **Propósito**: Añadir un control deslizante (slider) de zoom en la columna de previsualización del modal de edición de carta, permitiendo inspeccionar detalles finos a altas escalas o ver la carta al completo en pantallas de menores dimensiones.
*   **Objetivos de Diseño**:
    *   **Consistencia**: El zoom por defecto del editor debe alinearse inicialmente con el zoom configurado por el usuario en el lienzo de páginas de la aplicación principal.
    *   **Interactividad**: El cambio en el control de zoom debe actualizar inmediatamente las dimensiones del marco de previsualización y el escalado de todas sus capas interactivas sin romper la funcionalidad de arrastrar y redimensionar.

---

## 2. Requisitos Funcionales y Casos de Uso

*   **RF-1: Inicialización Dinámica del Zoom**:
    *   Al abrir el modal, la escala de previsualización (`scale`) se debe inicializar utilizando el valor actual de `zoomFactor` (lienzo principal).
    *   Si se proporciona una escala previa en el estado del editor, se mantendrá durante la sesión del modal.
*   **RF-2: Control Deslizante de Zoom**:
    *   Se debe renderizar un control de tipo `<input type="range">` al lado del título "Previsualización" en el editor de cartas.
    *   Rango de valores permitido: de `1.5` a `6.0` con saltos (`step`) de `0.1`.
    *   Debe mostrar visualmente el factor de escala (ej. `3.5x`).
*   **RF-3: Escalado Responsivo del Lienzo**:
    *   El lienzo de la carta (`edit-card-preview-frame`), los contornos de sangrado, las líneas de corte, las posiciones de las capas y sus tamaños de fuente en píxeles virtuales se deben redimensionar dinámicamente según el factor de escala actual.

---

## 3. Interfaces y UI

### Props de EditCardModal
Se extenderán las propiedades aceptadas por `EditCardModal`:
```typescript
interface EditCardModalProps {
  // ... props existentes
  initialZoom?: number; // Factor de zoom inicial del lienzo principal
}
```

### Componente de UI
En `EditCardModal.tsx`, dentro de la cabecera de la columna central de previsualización:
```tsx
<div className="column-title" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
  <span>Previsualización</span>
  <div className="editor-zoom-control" style={{ display: "flex", alignItems: "center", gap: "8px" }}>
    <label style={{ margin: 0, fontSize: "11px", fontWeight: "normal" }}>Zoom</label>
    <input
      type="range"
      min="1.5"
      max="6.0"
      step="0.1"
      value={scale}
      onChange={(e) => setScale(Number(e.target.value))}
      style={{ width: "100px", margin: 0, cursor: "pointer" }}
    />
    <span style={{ fontSize: "11px", fontFamily: "monospace" }}>{scale.toFixed(1)}x</span>
  </div>
</div>
```

---

## 4. Estrategia de Verificación (Pruebas)

### 4.1. Pruebas Automatizadas
*   Verificar mediante pruebas de componente que `EditCardModal` inicializa su estado de escala (`scale`) con la propiedad `initialZoom` cuando se proporciona.

### 4.2. Pruebas Manuales (Checklist)
1.  **Zoom Inicial**:
    *   Establece el zoom de la pantalla principal a `2.0x`.
    *   Abre el modal de edición de una carta.
    *   Verifica que el zoom inicial del modal también es de `2.0x` y la carta tiene el tamaño correspondiente.
2.  **Ajuste del Slider**:
    *   Mueve el deslizador a `1.5x`. Comprueba que el lienzo de la carta se reduce limpiamente sin desbordar el contenedor.
    *   Mueve el deslizador a `5.5x` o `6.0x`. Comprueba que la carta se agranda y se leen perfectamente las fuentes pequeñas.
3.  **Interactividad a Escala**:
    *   Con el zoom en `5.0x`, selecciona un elemento de texto o imagen.
    *   Arrastra y redimensiona el elemento. Verifica que se mueve de manera fluida y que los límites de arrastre se calculan correctamente.
