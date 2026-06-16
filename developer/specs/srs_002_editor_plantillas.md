# Especificación Técnica - SRS-002: Editor de Cartas Base e Interfaz de Plantillas

## 1. Introducción y Objetivos
- **Módulo**: Editor de Plantillas Dinámicas y Capas (Template Editor & Composition Engine).
- **Propósito**: Permitir al usuario diseñar la estructura visual de una carta (el "esqueleto") agregando capas (textos, imágenes, fondos) y vinculando campos dinámicos para que múltiples cartas individuales puedan usar la misma plantilla con diferentes textos e ilustraciones.
- **Objetivos de Diseño**:
  - **Composición Basada en Capas**: La visualización de la carta se compondrá de un árbol ordenado de capas de renderizado (Z-Index implícito por su orden en la lista).
  - **Lógica de Datos Desacoplada**: La plantilla solo define el diseño (ej. "dónde va el título"). Los datos de la carta son solo pares clave-valor (ej. `{ titulo: "Espada de Fuego" }`). Esto minimiza el tamaño del archivo y asegura la consistencia.
  - **Soporte de Fuentes y Estilos**: Personalización de fuentes, alineaciones, colores y tintes de imagen mediante CSS estándar mapeado de forma declarativa.

---

## 2. Requisitos Funcionales y Casos de Uso

### RF-1: Gestión de Plantillas
- **RF-1.1**: El usuario debe poder crear, duplicar y eliminar plantillas de cartas.
- **RF-1.2**: Cada plantilla debe definir un nombre y dimensiones físicas en milímetros (Ancho y Alto).

### RF-2: Sistema de Capas (Layers)
El diseño visual se compone apilando capas. El sistema debe soportar al menos los siguientes tipos de capas:
- **RF-2.1: Capa de Fondo (Background)**: Color sólido o degradado lineal que ocupa todo el lienzo de la carta.
- **RF-2.2: Capa de Imagen (Image)**: 
  - Puede ser una imagen estática (ej. un marco de carta, textura) cargada desde el ordenador.
  - Puede ser una imagen dinámica vinculada a un campo de la carta (ej. la ilustración de la carta).
  - Debe soportar opciones de ajuste: `Cover` (rellenar), `Contain` (ajustar sin recortar) o `Stretch` (estirar).
  - Debe soportar la aplicación de un color de tinte (CSS blend mode o filter) para recolorear elementos.
- **RF-2.3: Capa de Texto (Text)**:
  - Renderiza texto en coordenadas relativas `(x, y)` y dimensiones `(ancho, alto)` definidas en milímetros o porcentaje.
  - Permite configurar tipografía: familia de fuente, tamaño (en puntos o mm), alineación (izquierda, centro, derecha, justificado), color y peso (bold, normal).
  - Soporta interpolación de variables utilizando la sintaxis de doble llave: `{{nombre_campo}}` (ej. `Daño: {{fuerza}}`).
- **RF-2.4: Capa de Forma (Shape)**:
  - Dibuja rectángulos, rectángulos redondeados o círculos con color de relleno y bordes configurables. Útil para servir de fondo a textos o marcos de atributos.

### RF-3: Campos Dinámicos (Variables)
- **RF-3.1**: El creador de la plantilla define qué variables requiere su diseño (ej. `titulo`, `fuerza`, `descripcion`, `foto_personaje`).
- **RF-3.2**: Cada variable debe tener un tipo de datos asociado: `text`, `number` o `image`.
- **RF-3.3**: Al crear una carta concreta asignada a esa plantilla, la interfaz de usuario generará automáticamente un formulario con campos de entrada basados en estas variables.

---

## 3. Arquitectura y Diseño de Datos

### 3.1. Modelo de Datos de Plantilla (`Plantilla`)
El esquema JSON/TypeScript para representar las plantillas de cartas en la v2 es:

```typescript
export interface Plantilla {
  id: string;
  nombre: string;
  anchoMm: number;
  altoMm: number;
  camposConfig: CampoVariableConfig[];
  capas: Capa[];
}

export interface CampoVariableConfig {
  clave: string; // Ej. "fuerza"
  nombreLegible: string; // Ej. "Puntos de Ataque"
  tipo: "text" | "number" | "image";
  valorDefecto: string;
}

export type TipoCapa = "background" | "image" | "text" | "shape";

export interface CapaBase {
  id: string;
  nombre: string;
  visible: boolean;
  tipo: TipoCapa;
  xMm: number;      // Posición horizontal
  yMm: number;      // Posición vertical
  anchoMm: number;  // Ancho de la capa
  altoMm: number;   // Alto de la capa
  opacidad: number; // 0.0 a 1.0
}

export interface CapaBackground extends CapaBase {
  tipo: "background";
  colorFill: string; // Ej. "#ff0000" o gradiente CSS
}

export interface CapaImage extends CapaBase {
  tipo: "image";
  src: string;          // Ruta local, remota o clave de variable dinaminizada (ej. "{{ilustracion}}")
  modoAjuste: "cover" | "contain" | "stretch";
  tinteColor: string | null; // Color de tinte para blend-mode
}

export interface CapaText extends CapaBase {
  tipo: "text";
  contenidoRaw: string; // Ej. "Fuerza: {{fuerza}}"
  fontFamily: string;
  fontSizePt: number;
  color: string;
  alineacion: "left" | "center" | "right" | "justify";
  bold: boolean;
  italic: boolean;
}

export interface CapaShape extends CapaBase {
  tipo: "shape";
  forma: "rect" | "circle";
  borderRadiusMm: number; // Para rectángulos redondeados
  colorFill: string;
  colorBorde: string;
  anchoBordeMm: number;
}

export type Capa = CapaBackground | CapaImage | CapaText | CapaShape;
```

### 3.2. Vinculación de la Carta con la Plantilla
Una carta basada en una plantilla ya no almacena estilos ni código HTML, solo los datos planos que rellenan el formulario:

```typescript
export interface CartaConPlantilla {
  id: string;
  plantillaId: string; // Referencia a la Plantilla
  cantidad: number;
  valoresCampos: Record<string, string>; // Ej: { "titulo": "Espada de Fuego", "fuerza": "5" }
}
```

---

## 4. Algoritmo de Combinación (Template Interpolation Engine)

Para renderizar la carta, el cliente y el servidor utilizarán una función de utilidad que combina una plantilla y los valores de una carta para producir un árbol de capas "resuelto" (listo para ser pintado en el DOM mediante divs posicionados de forma absoluta):

```typescript
export interface CapaResuelta extends Capa {
  // Capa con las variables interpoladas (ej. contenidoRaw "Fuerza: {{fuerza}}" -> contenidoResuelto "Fuerza: 5")
  contenidoResuelto?: string;
  srcResuelto?: string;
}

export function combinarPlantillaYValores(
  plantilla: Plantilla,
  valoresCampos: Record<string, string>
): CapaResuelta[] {
  return plantilla.capas.map((capa) => {
    const capaResuelta = { ...capa } as CapaResuelta;

    if (capa.tipo === "text") {
      // Reemplazar {{variable}} con su valor correspondiente
      let texto = (capa as CapaText).contenidoRaw;
      for (const [clave, valor] of Object.entries(valoresCampos)) {
        texto = texto.replace(new RegExp(`\\{\\{\\s*${clave}\\s*\\}\\}`, "g"), valor);
      }
      capaResuelta.contenidoResuelto = texto;
    }

    if (capa.tipo === "image") {
      let src = (capa as CapaImage).src;
      // Comprobar si src es una variable
      if (src.startsWith("{{") && src.endsWith("}}")) {
        const clave = src.replace(/[{}]/g, "").trim();
        capaResuelta.srcResuelto = valoresCampos[clave] || (plantilla.camposConfig.find(c => c.clave === clave)?.valorDefecto || "");
      } else {
        capaResuelta.srcResuelto = src;
      }
    }

    return capaResuelta;
  });
}
```

---

## 5. Estrategia de Verificación (Pruebas)

### 5.1. Pruebas Unitarias Automatizadas (Vitest/Jest)
1. **Test: Interpolación de Variables de Texto**
   - Entrada: Capa de texto con `contenidoRaw = "HP: {{vida}} / {{vidaMax}}"`, y valores de carta `{ vida: "10", vidaMax: "15" }`.
   - Salida esperada: El campo `contenidoResuelto` de la capa resultante debe ser exactamente `"HP: 10 / 15"`.
2. **Test: Interpolación de Variables de Imagen**
   - Entrada: Capa de imagen con `src = "{{foto}}"` y valores de carta `{ foto: "dragon.png" }`.
   - Salida esperada: `srcResuelto` debe ser exactamente `"dragon.png"`.
3. **Test: Respetar Valores por Defecto**
   - Entrada: Capa de imagen con `src = "{{foto}}"` y valores vacíos `{}`.
   - Salida esperada: `srcResuelto` debe resolverse con el valor por defecto configurado para la clave `"foto"` en `camposConfig`.

### 5.2. Pruebas Manuales (Lista de Verificación / Checklist)
- [ ] Crear una plantilla: Configurar dimensiones 63.5 x 88.9 mm y añadir una capa de fondo color azul.
- [ ] Añadir campos dinámicos a la plantilla: crear una variable `nombre` (tipo texto) y otra `ilustracion` (tipo imagen).
- [ ] Añadir una capa de texto a la plantilla posicionada a `x=5, y=5`, con contenido `"Héroe: {{nombre}}"`.
- [ ] Crear una carta basada en esta plantilla: rellenar el formulario dinámico con `nombre = "Lancelot"`. Verificar en el lienzo en tiempo real que la carta muestra "Héroe: Lancelot".
- [ ] Reordenar la lista de capas (arrastrándola de abajo a arriba): comprobar que se actualiza el orden de superposición visual en el lienzo inmediatamente.
