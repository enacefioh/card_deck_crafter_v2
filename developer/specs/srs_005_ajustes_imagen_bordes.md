# Especificación Técnica - SRS-005: Ajustes de Ilustración y Bordes de Corte Personalizados

## 1. Introducción y Objetivos
- **Módulo**: Motor de Composición Visual (React Canvas + Puppeteer HTML Generator).
- **Propósito**: Permitir al usuario un control preciso sobre cómo se encuadra la ilustración de la carta (evitando recortes indeseados si las proporciones varían) y cómo interactúa el borde físico de corte con el contenido de la carta (evitando el solapamiento del borde sobre detalles críticos del arte).
- **Objetivos de Diseño**:
  - **Fidelidad Pixel-Perfect**: Las propiedades de ajuste y bordes definidas en el cliente deben replicarse milimétricamente en el servidor de PDF.
  - **Control de Composición**: Ofrecer opciones para enmarcar las cartas con bordes de color personalizados y contraer la ilustración automáticamente dentro del borde seguro de corte.

---

## 2. Requisitos Funcionales y Casos de Uso

### RF-1: Modos de Ajuste de Ilustración
- **RF-1.1**: El usuario podrá seleccionar entre dos modos de ajuste para las imágenes frontales y traseras de las cartas:
  - **Recortar para rellenar (Cover)** (Por defecto): La ilustración se expande para rellenar todo el slot (incluyendo el sangrado). Los excesos debidos a diferencias de proporción se recortan de forma simétrica.
  - **Ajustar sin recortar (Contain)**: La ilustración se escala hasta que encaja por completo en la carta, de modo que toda la imagen es visible y no se pierde ningún detalle, aunque queden márgenes vacíos.
- **RF-1.2**: El modo seleccionado se almacenará en `cardConfig.modoAjuste`.

### RF-2: Personalización del Borde de Corte
- **RF-2.1**: El panel de control debe incluir un selector de color interactivo (`<input type="color">`) que se activará cuando el grosor del borde de corte (`bordeCorteMm`) sea superior a 0.
- **RF-2.2**: El color por defecto será `#000000` (negro) y se guardará en `cardConfig.bordeCorteColor`.
- **RF-2.3**: El borde de corte se dibujará tanto en la vista previa como en el PDF usando la propiedad CSS `border-color`.

### RF-3: Opción de No Solapamiento del Borde (Reducir Arte)
- **RF-3.1**: El panel debe incluir una opción con checkbox llamada "Ajustar imagen al borde (No solapar)".
- **RF-3.2**: Por defecto, el borde se superpone sobre el contenido (el arte se extiende por debajo).
- **RF-3.3**: Si la opción de no solapamiento está activa, el tamaño y posición del contenedor de la ilustración (`.card-image-render`) se reajustarán matemáticamente para caber exactamente por dentro de los límites del borde de corte, actuando este como un marco.
- **RF-3.4**: Las fórmulas matemáticas para el renderizado (tanto en cliente como en servidor) serán:
  - **Coordenadas y dimensiones normales (Solapamiento activo)**:
    $$x_{\text{render}} = -S_{\text{sangrado}}$$
    $$y_{\text{render}} = -S_{\text{sangrado}}$$
    $$\text{ancho}_{\text{render}} = A_{\text{carta}} + 2 \cdot S_{\text{sangrado}}$$
    $$\text{alto}_{\text{render}} = H_{\text{carta}} + 2 \cdot S_{\text{sangrado}}$$
  - **Coordenadas y dimensiones enmarcadas (Solapamiento desactivado / Reducir activo)**:
    $$x_{\text{render}} = B_{\text{borde}} - S_{\text{sangrado}}$$
    $$y_{\text{render}} = B_{\text{borde}} - S_{\text{sangrado}}$$
    $$\text{ancho}_{\text{render}} = A_{\text{carta}} - 2 \cdot B_{\text{borde}} + 2 \cdot S_{\text{sangrado}}$$
    $$\text{alto}_{\text{render}} = H_{\text{carta}} - 2 \cdot B_{\text{borde}} + 2 \cdot S_{\text{sangrado}}$$
    *(Donde $A_{\text{carta}}$ es `anchoMm`, $H_{\text{carta}}$ es `altoMm`, $B_{\text{borde}}$ es `bordeCorteMm` y $S_{\text{sangrado}}$ es `sangradoMm`)*.

---

## 3. Estructuras de Datos y Modelo de Configuración

Se extienden las interfaces en [`shared/layoutEngine.ts`](file:///c:/Users/victo/proyectos/cdc2/shared/layoutEngine.ts) para soportar las nuevas variables:

```typescript
export interface CardConfig {
  anchoMm: number;
  altoMm: number;
  espaciadoXMm: number;
  espaciadoYMm: number;
  sangradoMm: number;
  bordeCorteMm: number;
  bordeCorteColor: string;
  modoAjuste: "cover" | "contain"; // [NEW]
  reducirArteAlBorde: boolean;     // [NEW]
}
```

---

## 4. Estrategia de Verificación (Pruebas)

### 4.1. Pruebas Unitarias Automatizadas
- [ ] **Test de encogimiento de arte**: Verificar mediante prueba unitaria que la reducción de coordenadas de posición y tamaño concuerda exactamente con la fórmula en función de los milímetros asignados en la especificación física.

### 4.2. Pruebas Manuales (Checklist de Aceptación)
- [ ] **Ajuste Contain**: Cargar una imagen cuadrada en una carta rectangular vertical. Cambiar ajuste a "Ajustar sin recortar (Contain)". Verificar que la imagen no se deforma ni se corta en pantalla ni en el PDF resultante.
- [ ] **Personalización de color**: Cambiar el color del borde de corte a verde (`#00ff00`). Verificar que tanto la pantalla como el PDF final muestran el borde en verde.
- [ ] **Alineación de bordes (Safe Zone)**: Configurar un borde de `4mm`. Activar el checkbox "Ajustar imagen al borde". Verificar visualmente que la ilustración se encoje y el borde azul/negro queda pintado alrededor de toda la imagen sin pisar ninguna porción de ella.
