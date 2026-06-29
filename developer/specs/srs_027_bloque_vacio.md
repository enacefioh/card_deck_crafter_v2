# Especificación Técnica (SRS) - SRS-027: Bloque Vacío (Spacer / Elemento de Relleno)

Esta especificación describe el diseño e implementación de un nuevo tipo de capa en las plantillas denominado **Bloque Vacío** (`"block"`). Este elemento actúa como un contenedor estructural sin contenido (sin texto ni imagen), ideal para añadir espaciado o rellenos estéticos y estructurar el flujo en contenedores lineales (verticales/horizontales) o layouts libres.

---

## 1. Introducción y Objetivos
*   **Propósito**: Añadir un tipo de capa ligera (`tipo: "block"`) que sirva como espaciador o bloque de relleno visual configurable, sin la sobrecarga de un contenedor de capas hijo (`"container"`) ni elementos de contenido (`"text"`, `"image"`).
*   **Objetivos de Diseño**:
    *   **Simplicidad**: Permitir configurar solo propiedades de dimensiones, posición, color de fondo, bordes y esquinas redondeadas.
    *   **Compatibilidad**: Integrarse de forma nativa en la estructura de plantillas y en el motor de renderizado recursivo (flexbox y libre).
    *   **Consistencia**: Debe representarse en el editor, en el árbol de capas, previsualizaciones y en las exportaciones de PDF (Puppeteer).

---

## 2. Requisitos Funcionales y Casos de Uso

*   **RF-1: Registro del Tipo de Capa**:
    *   El sistema debe admitir capas con `tipo: "block"`.
    *   Al duplicar un `"block"`, este se copia de forma directa conservando sus dimensiones y estilos.
*   **RF-2: Menú de Creación / Adición**:
    *   En el modal de añadir elemento (`EditCardModal.tsx`), se añadirá la opción **"Bloque Vacío"** junto a las opciones de Texto, Imagen, Imagen Switch y Contenedor.
*   **RF-3: Visualización en el Inspector de Propiedades**:
    *   Cuando un `"block"` está seleccionado, el inspector de propiedades mostrará únicamente:
        *   **Pestaña Diseño**: Dimensiones (`xMm`, `yMm`, `anchoMm`, `altoMm`), contenedor padre y tipo de visualización.
        *   **Pestaña Estilos**: Color de fondo (`backgroundColor`), bordes configurables por lado (`borderTopWidth`, `borderTopColor`, etc.) y radios de esquina (`borderTopLeftRadius`, etc.).
    *   No mostrará la pestaña **Contenido** (o indicará que los bloques vacíos no poseen campos de contenido).
*   **RF-4: Renderizado de Diseño (Frontend y Backend)**:
    *   Debe dibujarse como un `div` con los estilos de fondo y bordes configurados en:
        *   El lienzo principal de edición.
        *   Las previsualizaciones frontales y traseras en los modales de detalle.
        *   El motor de renderizado de Puppeteer del backend (`server/src/index.ts` y `server/src/debug_html.ts`).
*   **RF-5: Integración en el Explorador de Capas**:
    *   En la jerarquía lateral, se representará con el icono `⬜` y su nombre correspondiente.

---

## 3. Arquitectura y Diseño de Datos

### Definición de Capa de tipo Bloque (`tipo: "block"`)
La estructura de datos JSON de una capa tipo bloque es la siguiente:

```typescript
interface CapaBloqueVacio {
  id: string;
  nombre: string;
  tipo: "block";
  xMm: number;
  yMm: number;
  anchoMm: number;
  altoMm: number;
  parentCapaId: string | null;
  
  // Estética (SRS-024)
  backgroundColor?: string; // Hex color o transparente
  
  borderTopWidth?: number;
  borderRightWidth?: number;
  borderBottomWidth?: number;
  borderLeftWidth?: number;
  borderTopColor?: string;
  borderRightColor?: string;
  borderBottomColor?: string;
  borderLeftColor?: string;
  
  borderTopLeftRadius?: number;
  borderTopRightRadius?: number;
  borderBottomRightRadius?: number;
  borderBottomLeftRadius?: number;
}
```

---

## 4. Estrategia de Verificación (Pruebas)

### 4.1. Pruebas Unitarias Automatizadas
*   Añadir pruebas unitarias en `client/src/EditCardModal.test.tsx` o un nuevo archivo de test para verificar la creación e inserción de una capa de tipo `"block"`.

### 4.2. Pruebas Manuales / Criterios de Aceptación
1.  **Crear un Bloque Vacío**:
    *   Abrir el editor de cartas, pulsar en "Añadir Elemento", seleccionar "Bloque Vacío".
    *   Verificar que se inserta la capa con el icono `⬜` en la jerarquía lateral y con el nombre por defecto "Bloque".
2.  **Configurar Estilos**:
    *   Seleccionar el bloque y comprobar que no tiene pestaña de contenido editable.
    *   Modificar el color de fondo, añadir bordes (ej. 2mm rojo arriba) y esquinas redondeadas. Verificar que el lienzo renderiza correctamente dichos estilos.
3.  **Uso como Espaciador en Contenedores**:
    *   Crear un contenedor con Layout Lineal (Vertical).
    *   Arrastrar el bloque vacío entre dos elementos de texto.
    *   Comprobar que actúa de forma efectiva como separador en el flujo lineal usando sus dimensiones (`altoMm`).
4.  **Exportación PDF**:
    *   Exportar el proyecto a PDF y comprobar que los bloques vacíos se renderizan perfectamente en Puppeteer.
