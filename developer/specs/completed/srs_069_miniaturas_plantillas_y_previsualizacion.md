# SRS-069: Miniaturas de Plantillas de Carta, Previsualización Ampliada y Selector Unificado

## 1. Introducción y Objetivos
- **Propósito**: Modernizar la experiencia de selección y gestión de plantillas de cartas en Card Deck Crafter v2. Actualmente, el selector de plantillas utiliza iconos genéricos fijos (`📄` y `📦`) y separa artificialmente las plantillas por defecto de las importadas. Esta especificación introduce la generación y persistencia automática de miniaturas reales en formato JPEG Base64 de bajo peso, una lista unificada ordenada inteligentemente por compatibilidad con el documento activo, un tratamiento visual semitransparente con overlay `⚠️` para plantillas con dimensiones diferentes y un visor modal ampliado (`👁️`) con selección directa.
- **Objetivos de Diseño**:
  - **Autocontención y Ligereza**: La miniatura se almacena directamente como atributo `miniatura` dentro del JSON de la plantilla (`data:image/jpeg;base64,...`). Al tener un tope de 100x100px y compresión JPG (calidad 0.8), su peso ronda los 2-5 KB, eliminando la necesidad de archivos binarios sueltos en los archivos `.cdc2` o `.cdc2t`.
  - **Generación en Cliente Nativa**: El renderizado de la miniatura se realiza en un `<canvas>` offscreen en memoria al guardar la plantilla en `EditCardModal`, sin requerir peticiones de red al servidor.
  - **Ergonomía de Selección (UX)**: Fusión de plantillas en una lista única que prioriza la plantilla vacía y las plantillas con medidas coincidentes con las cartas del documento activo.
  - **Previsualización a Escala Real**: Inspección detallada de la carta montada mediante un botón con icono de ojo `👁️` antes de insertarla o asignarla como reverso.

---

## 2. Requisitos Funcionales y Casos de Uso

### RF-1: Atributo `miniatura` en el Modelo de Plantilla
- Se extiende el modelo de datos `Plantilla` en `shared/projectTypes.ts` y tipos de cliente con el campo opcional:
  ```typescript
  miniatura?: string; // Data URL en formato "data:image/jpeg;base64,..."
  ```
- Dimensiones máximas: 100 píxeles en su eje mayor (ancho o alto), conservando estrictamente la relación de aspecto de la carta (por ejemplo, para 63.5 x 88.9 mm el tamaño resultante es ~71 x 100 px).

### RF-2: Generación y Actualización Automática al Guardar
- En `EditCardModal.tsx`, al ejecutar las acciones:
  - "Guardar plantilla en el proyecto"
  - "Guardar plantilla como..."
  - Exportar plantilla como archivo local `.cdc2t`
- Se invoca la función utilitaria `generarMiniaturaPlantilla(plantilla, dimensiones, fuentes, colores)`.
- La miniatura generada se almacena en la plantilla, sobrescribiendo cualquier miniatura anterior para garantizar que siempre esté al día con los cambios en las capas.

### RF-3: Tratamiento para Plantillas sin Miniatura (Fallback)
- Si una plantilla (por ejemplo, plantillas por defecto antes de ser editadas o importaciones de versiones anteriores) no dispone del campo `miniatura`:
  - Se muestra una silueta de carta limpia (rectángulo blanco o gris claro con proporción estándar, borde sutil y fondo neutro), sin romper la cuadrícula ni mostrar iconos rotos.

### RF-4: Lista Unificada y Ordenación por Compatibilidad
- En el modal de plantillas (`showTemplateModal` en `App.tsx`, activo para "Añadir Carta desde Plantilla" y "Asignar Reverso desde Plantilla"):
  - Se eliminan las secciones separadas "Plantillas por Defecto" y "Plantillas Importadas", fusionando todas las plantillas en una única lista continua.
  - **Criterio estricto de ordenación**:
    1. **Plantilla Vacía** (`id === "vacia"`): Siempre en 1ª posición (sus dimensiones se amoldan automáticamente a la carta del documento).
    2. **Plantillas Compatibles**: Aquellas cuyas dimensiones en mm coinciden exactamente con la configuración de carta del documento activo (`Math.abs(plantilla.anchoMm - cardConfig.anchoMm) <= 0.1` y `Math.abs(plantilla.altoMm - cardConfig.altoMm) <= 0.1`).
    3. **Plantillas Incompatibles**: Aquellas con dimensiones diferentes.

### RF-5: Indicador Visual para Plantillas Incompatibles
- Para las plantillas con dimensiones diferentes a las del documento:
  - La miniatura se renderiza con opacidad reducida (`opacity: 0.45`).
  - Se superpone un distintivo flotante con el icono de advertencia `⚠️` centrado o en la esquina superior de la miniatura.
  - Se conserva el texto explicativo de dimensiones y tooltip informativo.

### RF-6: Botón de Inspección (`👁️`) y Modal de Previsualización Grande
- En cada elemento de la lista de plantillas, inmediatamente antes del botón "Seleccionar", se añade un botón cuadrado compacto con icono de ojo `👁️` (`title="Previsualizar plantilla"`).
- Al pulsar el botón `👁️`, se abre el modal `TemplatePreviewModal`:
  - Renderiza la carta completa con sus capas vectoriales/DOM, fuentes del proyecto y valores por defecto.
  - Presenta la ficha técnica: Nombre de plantilla, medidas en mm, cantidad de capas y badge de compatibilidad de medidas.
  - Botones de acción del modal:
    - **Cerrar** (o '✕'): Cierra el visor y regresa a la lista.
    - **✨ Seleccionar esta plantilla**: Selecciona de inmediato la plantilla para insertarla o asignarla como reverso, cerrando ambos modales en un solo clic.

---

## 3. Arquitectura y Modelos

### 3.1. Modelo TypeScript Compartido (`shared/projectTypes.ts`)
```typescript
export interface Plantilla {
  id: string;
  nombre: string;
  anchoMm?: number;
  altoMm?: number;
  capas: CapaConfig[];
  camposConfig?: CampoConfig[];
  exposedProperties?: ExposedPropertyConfig[];
  customFonts?: any[];
  miniatura?: string; // Data URL JPEG Base64 (max 100x100px)
  [key: string]: any;
}
```

### 3.2. Módulo de Renderizado Offscreen (`client/src/utils/thumbnailUtils.ts`)
```typescript
/**
 * Renderiza una miniatura JPEG en Base64 para una plantilla dada.
 * @param plantilla Objeto de plantilla con sus capas
 * @param anchoMm Ancho de la carta en milímetros
 * @param altoMm Alto de la carta en milímetros
 * @returns Promise<string> Data URL "data:image/jpeg;base64,..."
 */
export async function generarMiniaturaPlantilla(
  plantilla: Plantilla,
  anchoMm: number,
  altoMm: number
): Promise<string>;
```

---

## 4. Estrategia de Verificación (Pruebas)

### 4.1. Pruebas Unitarias Automatizadas (`client/src/SRS069MiniaturasPlantillas.test.tsx`)
1. **Generación de Miniatura**: Validar que `generarMiniaturaPlantilla` produce un Data URL `image/jpeg` válido y respeta el tope de 100px.
2. **Ordenación Unificada**: Probar el algoritmo de ordenación con una lista mixta (vacía, compatibles e incompatibles), certificando el orden: `vacia` ➔ compatibles ➔ incompatibles.
3. **Renderizado de Miniatura y Alerta**: Comprobar que las plantillas compatibles muestran su miniatura al 100% de opacidad y las incompatibles muestran semitransparencia y overlay `⚠️`.
4. **Fallback sin Miniatura**: Validar que una plantilla sin campo `miniatura` renderiza la tarjeta vacía sin errores.
5. **Previsualización con Ojo (`👁️`)**: Validar que hacer clic en el botón `👁️` abre el modal ampliado y que el botón "Seleccionar esta plantilla" dentro del visor invoca la selección.

### 4.2. Checklist de Verificación Manual
- [ ] Entrar en `EditCardModal`, modificar una plantilla y pulsar "Guardar plantilla en el proyecto".
- [ ] Abrir el modal "Añadir Carta desde Plantilla" y comprobar que la plantilla muestra su miniatura real.
- [ ] Verificar que la lista no tiene secciones separadas y sitúa primero la plantilla vacía, luego las de dimensiones exactas y al final las de distinto tamaño.
- [ ] Comprobar que las plantillas con dimensiones diferentes aparecen semitransparentes con el icono `⚠️` sobre la imagen.
- [ ] Pulsar el botón del ojo `👁️` en una plantilla y comprobar que se abre el modal ampliado con la carta montada.
- [ ] Pulsar "Seleccionar esta plantilla" desde el visor del ojo y confirmar que se añade la carta al documento activo.
- [ ] Repetir la prueba para "Asignar Reverso desde Plantilla".
