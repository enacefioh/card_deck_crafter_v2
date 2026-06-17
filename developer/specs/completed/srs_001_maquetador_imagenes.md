# Especificación Técnica - SRS-001: Maquetador de Imágenes en Bloque (Lienzo e Impresión)

## 1. Introducción y Objetivos
- **Módulo**: Motor de Maquetación y Distribución del Lienzo (Core Layout Engine).
- **Propósito**: Permitir al usuario importar un lote de imágenes de cartas y distribuirlas automáticamente en páginas de tamaño estándar o personalizado (A4, A3, etc.), preparándolas en una cuadrícula (grid) óptima tanto para las caras frontales como para las traseras (que deben alinearse simétricamente al imprimir a doble cara).
- **Objetivos de Diseño**:
  - **Función Pura de Distribución**: Toda la lógica de colocación de cartas en las páginas debe ser una función pura de TypeScript. Esto facilita las pruebas automáticas y elimina efectos secundarios.
  - **Independencia del DOM**: El cálculo no depende de medidas del navegador ni de CSS real; trabaja con unidades físicas (milímetros) y de píxeles abstractos.
  - **Retrocompatibilidad**: Formato de archivo de proyecto estructurado (`.cdc2`) con versionado semántico.

---

## 2. Requisitos Funcionales y Casos de Uso

### RF-1: Configuración de la Hoja (Lienzo / Canvas)
- **RF-1.1**: El sistema debe permitir configurar el tamaño de la hoja utilizando estándares: **A4** (210x297mm), **A3** (297x420mm) o **Personalizado** (especificando ancho y alto en mm).
- **RF-1.2**: El sistema debe permitir cambiar la orientación de la hoja: **Vertical (Portrait)** u **Horizontal (Landscape)**.
- **RF-1.3**: El sistema debe permitir configurar márgenes físicos de la página en milímetros (Superior, Inferior, Izquierda, Derecha).
- **RF-1.4**: El sistema debe permitir activar **marcas de corte en las esquinas** de cada carta para guiar el guillotinado.
- **RF-1.5**: El sistema debe permitir activar **líneas de corte continuas (de borde a borde)**. Estas son 4 líneas por carta (2 horizontales y 2 verticales) que cruzan todo el ancho y alto del papel, facilitando cortes rápidos y continuos con regla y cuchilla sin necesidad de medir en el centro de la hoja. Las líneas que se solapen geométricamente deben fusionarse automáticamente para evitar exceso de grosor.

### RF-2: Configuración del Tamaño de las Cartas, Sangrado y Bordes
- **RF-2.1**: El sistema debe permitir configurar el tamaño físico de las cartas en milímetros (Ancho y Alto). Debe incluir preajustes estándar de la comunidad:
  - vertical_standard: 63.5 x 88.9 mm (Magic, Poker, etc.)
  - vertical_mini: 44.4 x 63.5 mm (Mini Chimera, etc.)
  - vertical_tarot: 70 x 120 mm
- **RF-2.2**: El sistema debe permitir configurar el espacio (gap) horizontal y vertical entre cartas en milímetros.
- **RF-2.3**: El sistema debe permitir configurar un **sangrado físico (bleed)** en milímetros (típicamente de 1 a 3 mm). Este sangrado extiende la ilustración de la carta hacia afuera de su tamaño de corte final. Si la guillotina se desplaza ligeramente durante el corte, se evita que queden bordes blancos.
- **RF-2.4**: El sistema debe permitir añadir un **borde perimetral de color fijo** (ancho en mm y color) a cada carta para facilitar su visualización y guillotinado (solución compatible con v1).

### RF-3: Importación y Distribución en Bloque
- **RF-3.1**: El usuario debe poder arrastrar y soltar (o seleccionar) múltiples archivos de imagen a la vez.
- **RF-3.2**: El sistema creará una entrada de carta por cada imagen importada, asignando la imagen a la cara frontal de forma predeterminada y estableciendo la cantidad de copias inicial en `1`.
- **RF-3.3**: El sistema calculará automáticamente cuántas cartas caben por página de acuerdo a la configuración física del lienzo y de la carta. Si el número de cartas supera la capacidad de una página, el sistema creará dinámicamente páginas adicionales.
- **RF-3.4**: El sistema debe soportar **tres modos de gestión de caras traseras**:
  - **Modo A (Trasera Única)**: Una única imagen común para todos los reversos del proyecto.
  - **Modo B (Traseras Individuales)**: Cada carta puede configurarse con su propio archivo de imagen para el reverso.
  - **Modo C (Sin Trasera)**: Solo se generan y exportan las caras delanteras, omitiendo por completo las páginas de traseras.
- **RF-3.5**: Cuando esté activo el modo A o B, las páginas se organizarán en dos secciones independientes pero sincronizadas:
  - **Páginas Frontales**: Renderizan las caras delanteras de las cartas de izquierda a derecha.
  - **Páginas Traseras**: Renderizan las caras traseras. Para que coincidan al imprimir a doble cara, **el orden de las columnas de cada fila debe invertirse de forma horizontal (espejada)** con respecto a la página frontal correspondiente.

---

## 3. Arquitectura y Diseño de Datos

### 3.1. Formato Físico de Guardado y Portabilidad (`.cdc2`)
Para que un usuario pueda enviar su proyecto a un amigo y este contenga todas las imágenes de forma autónoma, el archivo con extensión `.cdc2` será un **contenedor ZIP** comprimido que agrupa el JSON del proyecto y las imágenes locales.

#### Estructura del archivo `.cdc2` (Archivo ZIP comprimido):
```text
archivo_proyecto.cdc2 (ZIP)
├── project.json            <-- El JSON plano de la estructura del proyecto (ProyectoCDC2)
└── assets/                 <-- Carpeta con las imágenes importadas por el usuario
    ├── 1a2b3c-front.png    <-- Nombre único basado en hash/UUID para evitar duplicados
    └── 4d5e6f-back.jpg
```

Cualquier referencia en `project.json` a una imagen guardada localmente dentro del proyecto utilizará el protocolo virtual `asset://` (ej. `asset://1a2b3c-front.png`). El cliente web o Tauri interceptará este protocolo para renderizar la imagen:
- **Cliente Web**: Extraerá el binario del ZIP usando `jszip` y creará una URL de objeto temporal en memoria (`blob:URL`).
- **Escritorio (Tauri)**: Descomprimirá el archivo en un directorio temporal del sistema operativo y servirá las imágenes directamente desde el disco mediante un protocolo nativo de Tauri.

### 3.2. Modelo de Datos del Proyecto (`project.json` dentro del `.cdc2`)
El JSON contenido en el archivo de proyecto tendrá la siguiente interfaz TypeScript:

```typescript
export interface ProyectoCDC2 {
  version: "2.0.0";
  meta: {
    nombre: string;
    fechaCreacion: string;
    fechaModificacion: string;
  };
  canvasConfig: CanvasConfig;
  cardConfig: CardConfig;
  modoTraseras: "comun" | "individual" | "ninguno";
  imagenTraseraComun: string | null; // asset:// o URL
  cards: Carta[];
}

export interface CanvasConfig {
  tipo: "A4" | "A3" | "Custom";
  anchoMm: number; // Ej. 210
  altoMm: number;  // Ej. 297
  orientacion: "vertical" | "horizontal";
  margenTopMm: number;
  margenBottomMm: number;
  margenLeftMm: number;
  margenRightMm: number;
  lineasCorteContinuas: boolean; // Líneas de corte de lado a lado
  marcasCorteEsquinas: boolean;  // Marcas de corte en las esquinas de cada carta
}

export interface CardConfig {
  anchoMm: number;
  altoMm: number;
  espaciadoXMm: number;
  espaciadoYMm: number;
  sangradoMm: number; // Extensión de sangrado hacia el exterior de la línea de corte
  bordeCorteMm: number; // Borde interior de color fijo
  bordeCorteColor: string;
}

export interface Carta {
  id: string;
  nombre: string;
  imagenFrontal: string; // asset:// o URL
  imagenTrasera: string | null; // asset:// o URL (solo si modoTraseras === "individual")
  cantidad: number; // Número de copias de esta carta a maquetar
}
```

### 3.3. Estructura de Salida Calculada (Layout Result)
Para pintar en el cliente (React) o renderizar en el servidor (Puppeteer), usaremos una función pura que procesa la entrada y devuelve la distribución por páginas:

```typescript
export interface LayoutPage {
  pageIndex: number;
  tipo: "frontal" | "trasera";
  slots: LayoutSlot[];
}

export interface LayoutSlot {
  cartaId: string;
  xMm: number; // Posición horizontal del corte final de la carta (relativo al lienzo)
  yMm: number; // Posición vertical del corte final de la carta (relativo al lienzo)
  anchoMm: number;
  altoMm: number;
  imagenSrc: string | null;
  sangradoMm: number;
  bordeCorteMm: number;
  bordeCorteColor: string;
}
```

### 3.4. Algoritmo de Limpieza de Recursos (Garbage Collector de Assets)
Al guardar el proyecto en el archivo comprimido `.cdc2`, la aplicación ejecutará automáticamente una rutina de limpieza para evitar el crecimiento innecesario del tamaño del archivo.

1. **Escaneo de Referencias**: Recorrer recursivamente el objeto `ProyectoCDC2` y extraer todas las cadenas de texto que comiencen por `asset://`. Esto incluye:
   - `imagenFrontal` e `imagenTrasera` de todas las cartas en el array `cards`.
   - `imagenTraseraComun` en la raíz del proyecto.
   - Capas de imágenes dinámicas o estáticas dentro de las plantillas (definidas en SRS-002).
2. **Construcción del Conjunto Activo**: Crear una lista de nombres de archivos válidos (ej. `["1a2b3c-front.png", "4d5e6f-back.jpg"]`).
3. **Comparación y Eliminación**: Recorrer los ficheros en la subcarpeta `assets/` dentro del ZIP y eliminar físicamente cualquier archivo cuyo nombre no se encuentre en la lista de recursos activos en uso.
4. **Compresión Final**: Generar y guardar el ZIP limpio y optimizado.

---

## 4. Algoritmo de Distribución (Firma de Función)

El motor de distribución expondrá la siguiente función pura:

```typescript
export function calcularDistribucion(
  canvas: CanvasConfig,
  card: CardConfig,
  cartas: Carta[]
): { paginasFrontales: LayoutPage[]; paginasTraseras: LayoutPage[] } {
  // 1. Calcular área útil de la página (AnchoHoja - márgenes, AltoHoja - márgenes)
  // 2. Calcular cuántas columnas y filas de cartas caben por página
  // 3. Crear lista plana de slots a rellenar multiplicando cada carta por su cantidad
  // 4. Agrupar la lista plana en páginas frontales colocándolas de izquierda a derecha
  // 5. Para cada página frontal, generar su página trasera correspondiente:
  //    - Mapear las traseras asociadas a cada slot frontal.
  //    - Invertir horizontalmente la columna de cada ranura en la cuadrícula de la página trasera (Espejado).
  // 6. Devolver páginas distribuidas.
}
```

---

## 5. Estrategia de Verificación (Pruebas)

### 5.1. Pruebas Unitarias Automatizadas (Vitest/Jest)
Debemos verificar matemáticamente que el algoritmo de distribución es infalible.

1. **Test: Dimensiones y Límites**
   - Entrada: Hoja A4 Vertical (210x297), márgenes de 10mm. Cartas de 63.5x88.9mm, espaciado de 0mm.
   - Salida esperada: Debe calcular exactamente 3 columnas y 3 filas (9 cartas por página).
2. **Test: Multi-página**
   - Entrada: Lote de 12 cartas estándar en A4 (capacidad 9 por página).
   - Salida esperada: Generar 2 páginas frontales. Página 1 con 9 cartas, Página 2 con 3 cartas.
3. **Test: Espejado de Traseras**
   - Entrada: Fila con 3 cartas frontales: `[Carta A, Carta B, Carta C]`.
   - Salida esperada para la trasera: La fila trasera debe ordenarse como `[Trasera C, Trasera B, Trasera A]` y sus coordenadas `xMm` deben ajustarse simétricamente respecto al eje central de la página.
4. **Test: Distribución en Gran Formato (A3 Horizontal)**
   - Entrada: Hoja A3 Horizontal (420x297), márgenes de 10mm. Cartas de 63.5x88.9mm, espaciado de 2mm.
   - Salida esperada: Debe calcular exactamente 6 columnas y 3 filas (18 cartas por página, ya que el ancho útil de 400mm aloja 6 columnas que ocupan 391mm, y el alto útil de 277mm aloja 3 filas que ocupan 270.7mm), distribuyendo las posiciones de los slots de forma simétrica.

### 5.2. Pruebas Manuales (Lista de Verificación / Checklist)
- [ ] Arrastrar 15 imágenes de cartas al editor: Verificar que se crean las páginas necesarias.
- [ ] Cambiar el tamaño de A4 a A3: Las cartas deben redistribuirse automáticamente ocupando el nuevo espacio.
- [ ] Activar "Mostrar Traseras": El lienzo debe mostrar las páginas de los reversos debajo o al lado de las páginas frontales correspondientes.
- [ ] Activar "Líneas de corte continuas" y "Marcas de corte": Verificar en pantalla y en PDF que se dibujan correctamente de lado a lado y en las esquinas.
- [ ] Exportar PDF de prueba a doble cara en impresora casera: Cortar usando las marcas continuas y comprobar que el frente y el reverso están alineados físicamente (con un margen de error menor a 1mm).
