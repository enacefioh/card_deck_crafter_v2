# Especificación Técnica - SRS-053: Rotación de Elementos y Capas de la Carta

## 1. Introducción y Objetivos
- **Módulo**: Motor de Maquetación de Capas (Canvas / Preview / Backend PDF Exporter / Inspector de Propiedades).
- **Propósito**: Permitir aplicar una rotación angular (en grados de -180° a 180°) a las capas de la carta (texto, imágenes, formas y contenedores). El control de rotación se situará al final del panel de propiedades por ser una característica avanzada/secundaria.
- **Objetivos de Diseño**:
  - **Transformación desde el Centro**: La rotación se realiza siempre respecto al centro geométrico del objeto (`transform-origin: center center`) y se aplica como una transformación CSS (`transform: rotate(deg)`), conservando su posición y espacio bounding box original.
  - **Manipulación Segura en Lienzo ("Editar en Lienzo")**: Para evitar inconsistencias matemáticas al arrastrar o redimensionar elementos inclinados en 2D, cuando el usuario active la edición interactiva en el lienzo sobre una capa con rotación distinta de 0°, la rotación se pausará (ajustando a 0° temporalmente), permitiendo ajustar posición/tamaño de forma ortogonal, y reaplicando la rotación al finalizar el movimiento.
  - **Fidelidad Multicanal**: Visualización consistente 1:1 en la vista previa del cliente SPA, editor de plantillas/cartas, previsualización detallada y exportación backend a PDF mediante el servidor de exportación Puppeteer.

---

## 2. Requisitos Funcionales

### RF-1: Atributo de Rotación en la Capa (`rotacion`)
- Toda capa (de tipo `texto`, `imagen`, `contenedor`, `bloque`, etc.) incluirá una propiedad opcional `rotacion` de tipo numérico (grados, valor por defecto `0`).
- **Rango soportado**: `-180°` a `180°`. Los valores se almacenarán como números (flotantes o enteros) dentro de este rango.

### RF-2: Posicionamiento en el Inspector de Propiedades
- El control de **Rotación (º)** se ubicará **al final de la lista de propiedades** de la capa en el inspector lateral (sección avanzada o al pie de dimensiones/transformación).
- Incluirá un campo de texto numérico restringido entre `-180` y `180` con botones de incremento/decremento y un slider intuitivo para ajustes rápidos de ángulo.

### RF-3: Renderizado CSS en Frontend y Backend (Exportación PDF)
- En las vistas web (Canvas, previsualizaciones y editor), se aplicará el estilo CSS inline `transform: rotate(${capa.rotacion || 0}deg)` junto con `transform-origin: center center`.
- **Renderizado Backend (Servidor PDF)**: La plantilla HTML generada en el servidor backend para la renderización headless con Puppeteer aplicará exactamente el mismo estilo CSS inline `transform: rotate(${capa.rotacion || 0}deg)` en el contenedor de la capa, asegurando que la exportación en PDF conserve la rotación y posición exactas sin desalineaciones.

### RF-4: Desactivación Temporal de Rotación en "Editar en Lienzo"
- Al iniciar una acción de arrastre o redimensionado en lienzo ("Editar en Lienzo") sobre una capa con `rotacion !== 0`:
  1. Se almacena en el estado/referencia interactiva el ángulo original (`rotacionGuardada`).
  2. Se establece temporalmente el estilo visual de rotación de la capa en `0°` mientras dura la interacción.
  3. El usuario arrastra o redimensiona el bounding box en ejes X/Y ortogonales de forma precisa.
  4. Al soltar el clic / terminar la edición en lienzo, se reasigna `capa.rotacion = rotacionGuardada` y se renderiza con el ángulo guardado en las nuevas coordenadas/dimensiones.

---

## 3. Arquitectura y Diseño de Datos

### Interfaces de TypeScript (`client/src/types` / `shared`)
```typescript
export interface Capa {
  id: string;
  nombre: string;
  tipo: 'texto' | 'imagen' | 'contenedor' | 'forma';
  x: number;
  y: number;
  ancho: number;
  alto: number;
  rotacion?: number; // Ángulo en grados (-180 a 180). Por defecto 0.
  // ... resto de propiedades existentes
}
```

---

## 4. Interfaces y Cambios en la UI y Backend
- **Inspector de Propiedades (`App.tsx` y `EditCardModal.tsx`)**:
  - Inclusión del control `<input type="number" min="-180" max="180" value={capa.rotacion || 0} />` al final del formulario de la capa seleccionada.
- **Manejador de Eventos de Lienzo (`App.tsx` / handlers de Drag & Resize)**:
  - `onDragStart` / `onResizeStart`: si `capa.rotacion`, guardar en `activeDragState.originalRotation` y setear `tempRotation = 0`.
  - `onDragEnd` / `onResizeEnd`: restaurar la rotación guardada al objeto actualizado.
- **Renderizador de Servidor (`server/src/services/pdfService.ts` / generador HTML)**:
  - Inyectar el atributo `transform: rotate(...)` en el bloque de estilos inline de cada capa procesada durante la exportación a PDF.

---

## 5. Estrategia de Verificación (Pruebas)

### 5.1. Pruebas Unitarias Automatizadas
- Test unitarios en `projectUtils.test.ts` para verificar la serialización, duplicado y guardado del atributo `rotacion` restringido entre `-180` y `180`.
- Test de renderizado en `App.test.tsx` o `EditCardModal.test.tsx` verificando que el estilo `transform: rotate(...)` se inyecta en el elemento HTML correspondiente.
- Test en el servicio PDF (`pdfService.test.ts` o equivalente) para asegurar que las capas rotadas incluyen la regla `transform: rotate(...)` en el HTML enviado a Puppeteer.

### 5.2. Pruebas Manuales / Criterios de Aceptación (Checklist)
- [ ] Crear una capa de texto e ingresar `45` en el campo "Rotación (º)" al final del panel.
- [ ] Verificar que el rango del campo numérico y del slider esté delimitado entre `-180°` y `180°`.
- [ ] Hacer clic en "Editar en Lienzo" o arrastrar la capa rotada: verificar que mientras se arrastra se muestra a `0°` y al soltar vuelve a `45°`.
- [ ] Exportar el proyecto a PDF mediante la ruta del servidor y confirmar que el PDF final renderiza la capa con sus `45°` de rotación exactamente igual a la vista en pantalla.
