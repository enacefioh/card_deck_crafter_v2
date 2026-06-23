# Especificación Técnica - SRS-015: Capas de Imagen tipo Switch o Variaciones

Este documento describe la estructura y diseño propuesto para permitir capas de imagen que admitan múltiples variaciones predefinidas (tipo "switch") seleccionables por carta.

## 1. Objetivos
- Permitir al diseñador de la plantilla definir una lista de imágenes alternativas para una misma capa (ej: diferentes traseras, marcos elementales, iconos de tipo).
- Proveer un control simple de selección (dropdown o miniaturas) en la pestaña Contenido para que el usuario elija la variación de imagen activa para cada carta.

## 2. Modelo de Datos Propuesto (Sugerencia)
```typescript
export interface CapaImageSwitch extends CapaBase {
  tipo: "image_switch";
  variaciones: Array<{
    id: string;
    nombre: string;
    src: string; // Ruta de asset (ej: "assets/fuego.png")
  }>;
  variacionDefectoId: string;
}
```

## 3. Interfaz de Edición Propuesta
- **Pestaña Diseño (Creador de Plantilla)**:
  - Definir la lista de variaciones (añadir/quitar recursos, asignar nombres legibles como "Fuego", "Agua", "Tierra").
- **Pestaña Contenido (Edición de Carta)**:
  - En lugar de subir un archivo, se muestra un selector dropdown con las variaciones predefinidas de la plantilla para cambiar el recurso en tiempo de ejecución.

---

## 4. Casos de Uso (Estructura Vacía para Completar)
*(Para ser desarrollado por el usuario)*
- **Caso de Uso 1**: Configurar variaciones en la plantilla.
- **Caso de Uso 2**: Seleccionar variación para una carta individual.
