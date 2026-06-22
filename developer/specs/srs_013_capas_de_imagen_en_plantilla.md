# Especificación Técnica - SRS-013: Capas de Imagen en Plantilla

Este documento sirve como referencia futura para la implementación de capas de imágenes (tanto estáticas como dinámicas) en el motor de plantillas y en el editor interactivo de composición de cartas.

## 1. Objetivos
- Permitir la colocación de recursos visuales en la carta (ej. marcos, bordes, iconos, ilustraciones de personajes).
- Soportar el enlazado de imágenes dinámicas a variables del modelo de datos de la carta.
- Proveer modos de ajuste (cover, contain, stretch) e interpolación de recursos en tiempo de impresión.

## 2. Tipos de Capas de Imagen
- **Imágenes Estáticas**: Elementos de diseño que forman parte del esqueleto de la carta (ej. texturas de fondo, marcos del título). Estas imágenes se guardan como recursos físicos dentro del archivo de la plantilla (.cdc2t) o el módulo.
- **Imágenes Dinámicas**: Marcadores de posición que leen el recurso desde los valores de la carta (ej. la clave `{{ilustracion}}` o `{{icono_elemento}}`). El usuario suministrará el archivo final en el formulario de la carta.

## 3. Modelo de Datos Propuesto
```typescript
export interface CapaImage extends CapaBase {
  tipo: "image";
  src: string;          // Ruta de asset estático o clave dinámica: "{{ilustracion}}"
  modoAjuste: "cover" | "contain" | "stretch";
  tinteColor: string | null; // Filtro de color (blend mode o CSS filter)
}
```

## 4. Interfaz de Edición Futura
- En el modal del editor de cartas, al añadir una capa tipo "Imagen":
  - **Layout**: Permitir definir posición y tamaño en la pestaña de maquetación.
  - **Inspector**: Permitir subir un archivo local temporal (Blob URL) o vincular una clave de campo dinámico.
  - **Propiedades de Ajuste**: Selectores visuales para Cover, Contain o Stretch.
