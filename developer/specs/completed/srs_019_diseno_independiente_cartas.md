# Especificación Técnica - SRS-019: Diseño Independiente de Cartas (Plantillas como Preset)

## 1. Introducción y Objetivos
- **Propósito**: Cambiar la arquitectura de datos del proyecto para desacoplar el diseño de cada carta del catálogo global de plantillas. Las plantillas pasarán a ser exclusivamente "presets iniciales" o puntos de partida reutilizables, y el diseño completo de cada carta (capas y configuración de campos) se almacenará embebido en ella de forma 100% independiente.
- **Objetivos de Diseño**:
  - **Evitar Efectos Secundarios**: Modificar el diseño de una carta no debe alterar el de otras cartas que comenzaron a partir de la misma plantilla.
  - **Limpieza del Catálogo**: Eliminar la clonación automática y la acumulación de IDs de plantilla huérfanos/clónicos en `templatesMap`.
  - **Autonomía del Objeto Carta**: Cada carta transportará su propio árbol de capas, facilitando la exportación e importación individual de cartas con sus propios diseños.

---

## 2. Cambios en la Estructura de Datos (Modelos)

### 2.1. Interfaz de `Carta` (`shared/layoutEngine.ts` / `client`)
La interfaz `Carta` se modificará para embeber las propiedades del diseño directamente:
```typescript
export interface Carta {
  id: string;
  nombre: string;
  imagenFrontal?: string;
  imagenTrasera: string | null;
  cantidad: number;
  
  // Metadatos informativos de la plantilla de origen (opcionales)
  plantillaId?: string;
  plantillaTraseraId?: string;
  
  // Diseño Frontal propio embebido
  plantilla?: {
    id: string;
    nombre: string;
    capas: any[];
    camposConfig: any[];
  };
  valoresCampos?: Record<string, string>;
  capasOverrides?: Record<string, any>; // Mantenido para overrides de campos dinámicos
  
  // Diseño Trasero propio embebido
  plantillaTrasera?: {
    id: string;
    nombre: string;
    capas: any[];
    camposConfig: any[];
  };
  valoresCamposTrasera?: Record<string, string>;
  capasOverridesTrasera?: Record<string, any>;
}
```

---

## 3. Flujo de Trabajo y Lógica de Negocio

### RF-1: Creación de Cartas basadas en Plantillas
- Al añadir o duplicar una carta, o al aplicar una plantilla a una carta existente:
  - Se obtendrá la plantilla del catálogo global.
  - Se realizará una copia profunda (clon) del objeto plantilla.
  - Se asignará este clon a `carta.plantilla` (o `carta.plantillaTrasera`).
  - La carta quedará ligada a su propio diseño local independiente.

### RF-2: Edición de Cartas en el Modal (`EditCardModal.tsx`)
- Al abrir el editor para una carta:
  - Los estados iniciales `tempPlantilla` y `tempPlantillaTrasera` se inicializarán directamente desde `carta.plantilla` y `carta.plantillaTrasera` (si no existen, se inicializarán como objetos vacíos o con la plantilla vacía predeterminada).
  - Al modificar capas, posiciones, fuentes o configuraciones de campos en el inspector, se actualizarán estos estados de forma normal.
  - Al pulsar "Guardar", se enviarán estos diseños actualizados (`plantillaActualizada` y `plantillaTraseraActualizada`) en el callback `onSave`.

### RF-3: Guardado de Cambios en `App.tsx` (`handleSaveCard`)
- En `handleSaveCard`, al recibir los diseños actualizados:
  - Se guardarán directamente en `carta.plantilla` y `carta.plantillaTrasera` de la carta correspondiente.
  - **SE ELIMINA** la lógica de comprobación de igualdad de strings y la clonación de plantillas en `templatesMap`. El catálogo `templatesMap` ya no sufre mutaciones ni adición de plantillas clonadas temporales.

---

## 4. Estrategia de Verificación

### 4.1. Pruebas Unitarias
- Añadir o adaptar pruebas en `projectUtils.test.ts` para verificar la inicialización de cartas a partir de plantillas copiando la estructura interna.

### 4.2. Pruebas Manuales
1.  **Edición Independiente**:
    *   Crear dos cartas (Carta A y Carta B) asociadas a la plantilla `"simple"`.
    *   Editar la Carta A: mover la capa "Título" a otra posición o cambiar su tamaño de fuente. Guardar.
    *   Verificar que la Carta A muestra el nuevo diseño y que la Carta B mantiene el diseño original de la plantilla simple intacto.
2.  **Catálogo Limpio**:
    *   Verificar que al guardar cambios de diseño en una carta, no se añaden nuevas plantillas clónicas al catálogo global de plantillas en el panel de configuración.
3.  **Persistencia**:
    *   Guardar el proyecto como archivo `.cdc2`, refrescar la página, volver a cargarlo y comprobar que los diseños independientes se mantienen tal y como se editaron.
