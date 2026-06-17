# Skill de IA: Modelador de Cartas de Juegos de Mesa (Card Game Modeler Skill)

Este documento es una guía instruccional ("Skill") para agentes de Inteligencia Artificial que trabajen en el proyecto *Card Deck Crafter v2*. Define cómo estructurar, modelar y codificar el soporte para nuevos juegos de mesa dentro de la aplicación sin corromper la arquitectura existente.

---

## 1. Fase de Análisis del Juego
Al solicitar soporte para un nuevo juego de mesa, el agente de IA debe analizar las cartas físicas del juego e identificar:
1.  **Dimensiones físicas**: Tamaño oficial en milímetros (ancho y alto).
2.  **Campos de información (Variables)**: Atributos específicos que cambian de una carta a otra (ej. Nombre, Nivel, Ataque, Ilustración, Texto de Habilidad, Iconos de Facción).
3.  **Estructura visual (Capas)**: Cuántas capas de diseño componen el esqueleto de la carta (ej. Imagen de fondo, Ilustración central, Marco perimetral, Cajas de texto, Iconos flotantes).

---

## 2. Definición de la Especificación del Módulo (Spec)
Antes de escribir código, se debe crear un archivo de especificación en `developer/specs/srs_XXX_[nombre_juego].md` con el siguiente formato:
- **Detalle de Variables**: Nombre de la clave, tipo de datos (texto, número, imagen) y descripción.
- **Detalle de Capas**: Lista de capas y su orden de superposición (de fondo a frente) con coordenadas estimadas en mm.

---

## 3. Estructura de Datos en el Código
Cada nuevo juego se implementa como un módulo declarativo dentro del sistema de plantillas.
- **Ubicación**: Se registra una configuración de plantilla por defecto en la carpeta de plantillas del cliente.
- **Tipado**: Todos los campos variables deben estar estrictamente tipados.

### Ejemplo de Plantilla Estándar del Skill:
```typescript
import { Plantilla } from "../core/layoutEngine";

export const PlantillaMiJuego: Plantilla = {
  id: "mi_juego_estandar",
  nombre: "Mi Juego - Plantilla Estándar",
  anchoMm: 63.5,
  altoMm: 88.9,
  camposConfig: [
    { clave: "titulo", nombreLegible: "Nombre de la Carta", tipo: "text", valorDefecto: "Nueva Carta" },
    { clave: "ilustracion", nombreLegible: "Imagen de Ilustración", tipo: "image", valorDefecto: "" },
    { clave: "fuerza", nombreLegible: "Puntos de Fuerza", tipo: "number", valorDefecto: "1" }
  ],
  capas: [
    {
      id: "bg_color",
      nombre: "Color de Fondo",
      visible: true,
      tipo: "background",
      xMm: 0, yMm: 0, anchoMm: 63.5, altoMm: 88.9, opacidad: 1,
      colorFill: "#1e293b"
    },
    {
      id: "art_layer",
      nombre: "Ilustración Central",
      visible: true,
      tipo: "image",
      xMm: 5, yMm: 15, anchoMm: 53.5, altoMm: 45, opacidad: 1,
      src: "{{ilustracion}}",
      modoAjuste: "cover",
      tinteColor: null
    },
    {
      id: "title_text",
      nombre: "Nombre",
      visible: true,
      tipo: "text",
      xMm: 5, yMm: 5, anchoMm: 53.5, altoMm: 8, opacidad: 1,
      contenidoRaw: "{{titulo}}",
      fontFamily: "Outfit",
      fontSizePt: 12,
      color: "#ffffff",
      alineacion: "center",
      bold: true,
      italic: false
    }
  ]
};
```

---

## 4. Validación de Calidad (Checklist de la IA)
Al finalizar el modelado, el agente debe verificar que:
- [ ] No existan estilos en línea ad-hoc en componentes de React; toda la maquetación debe realizarse a través del array de capas de la plantilla.
- [ ] No se incrusten imágenes en Base64 en el código; deben usarse rutas a archivos externos o claves de variables dinámicas `{{ilustracion}}`.
- [ ] El esquema sea compatible con la función pura de combinación de la SRS-002.
- [ ] Se añadan pruebas unitarias en la suite para verificar que los textos del nuevo juego se interpolan correctamente.
