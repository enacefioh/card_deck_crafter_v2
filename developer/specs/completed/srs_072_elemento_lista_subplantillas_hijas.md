# Especificación Técnica - SRS-072: Elemento Lista con Subplantillas Hijas y Gestión Dinámica en Editor e Inspector

- **ID de Especificación**: SRS-072
- **Título**: Elemento Lista (LinearLayout Dinámico) con Subplantillas Hijas en el Editor de Plantillas y Gestión desde el Inspector General
- **Estado**: 🟡 Propuesta / En Definición
- **Fecha**: 2026-10-03
- **Autor**: Asistente de IA (Antigravity) & Usuario (enacefioh)
- **Hitos Previos**: 
  - [SRS-050 (Dimensiones Automáticas Ancho y Alto en Contenedores y Textos)](file:///c:/Users/victo/proyectos/cdc2/developer/specs/completed/srs_050_dimensiones_automaticas.md)
  - [SRS-070 (Unificación de Campos en el Inspector del Editor de Cartas)](file:///c:/Users/victo/proyectos/cdc2/developer/specs/completed/srs_070_unificacion_campos_inspector_editor_cartas.md)
  - [SRS-071 (Nuevos Tipos de Layout para Contenedores)](file:///c:/Users/victo/proyectos/cdc2/developer/specs/completed/srs_071_nuevos_tipos_layout_contenedores.md)

---

## 1. Introducción y Objetivos

### 1.1. Propósito
Dotar a **Card Deck Crafter v2** de un nuevo componente de maquetación llamado **Lista (`tipo: "list"`)**. 

La Lista actúa como un contenedor `LinearLayout` dinámico que almacena un conjunto de **Subplantillas Hijas (Child Blueprints)** definidas por el usuario maquetador (por ejemplo: *"Ataque Melé"*, *"Ataque a Distancia"*, *"Rasgo Pasivo"*). 

A partir de estas subplantillas, el usuario editor que crea o rellena sus barajas en el lienzo general ([`App.tsx`](file:///c:/Users/victo/proyectos/cdc2/client/src/App.tsx)) puede **añadir tantas copias de cada elemento como requiera cada carta particular**, reordenarlas, duplicarlas, eliminarlas y editar sus propiedades expuestas directamente desde el panel lateral derecho, sin necesidad de abrir el modal complejo de maquetación ni diseñar múltiples plantillas rígidas para cartas con diferente número de elementos.

### 1.2. Objetivos de Diseño
1. **Comportamiento LinearLayout Nativo**: Reutilizar el motor de layout Flexbox desarrollado en [SRS-071](file:///c:/Users/victo/proyectos/cdc2/developer/specs/completed/srs_071_nuevos_tipos_layout_contenedores.md), admitiendo todas sus variantes (`vertical`, `horizontal`, centrados e inversos).
2. **Subplantillas Desacopladas (Blueprints Persistentes)**: Las definiciones de los elementos hijos disponibles se almacenan en la configuración de la propia lista (`childTemplates`). Aunque el maquetador elimine visualmente todas las instancias de la plantilla base, las subplantillas permanecen listas para ser instanciadas en cualquier carta.
3. **Instanciación Atómica y Segura (Regeneración Recursiva de IDs)**: Cada elemento hijo es una capa raíz única (un texto, una imagen o un sub-contenedor que agrupe varios elementos). Al instanciar o duplicar un elemento, se regeneran recursivamente todos los identificadores únicos (`id`) de sus capas y subcapas hijas, garantizando que nunca existan colisiones de claves ni desvinculaciones de `parentCapaId`.
4. **Dimensiones Automáticas y Control de Desbordamiento**: 
   - En listas con dimensión automática (`altoMm: "auto"` en verticales o `anchoMm: "auto"` en horizontales), la lista crece o decrece conforme se agregan o quitan elementos.
   - En listas con tamaño fijo en milímetros, el contenido sobrante se oculta elegantemente mediante `overflow: "hidden"`.
5. **Edición Ágil en el Inspector General ([`App.tsx`](file:///c:/Users/victo/proyectos/cdc2/client/src/App.tsx))**: Exposición predeterminada de la lista en el panel lateral del lienzo principal mediante acordeones interactivos por cada elemento, permitiendo reordenar (arriba/abajo), duplicar, borrar y rellenar textos/colores/imágenes expuestos de forma inmediata.

---

## 2. Requisitos Funcionales y Casos de Uso

### RF-1: Nuevo Tipo de Capa `tipo: "list"`
- Se incorpora `"list"` al conjunto de tipos reconocidos de capa (`"text" | "image" | "image-switch" | "container" | "block" | "list"`).
- **Iconografía**: Identificada con el icono `📋` en el selector de nuevos elementos, árbol de jerarquía e inspectores.
- **Propiedades del Contenedor Lista**:
  - `layout`: `"vertical"` (por defecto), `"vertical-center"`, `"vertical-reverse"`, `"horizontal"`, `"horizontal-center"`, `"horizontal-reverse"`.
  - `anchoMm` / `altoMm`: Valores numéricos en milímetros o `"auto"` (según la orientación).
  - `childTemplates`: Array de definiciones de subplantillas disponibles (`ChildTemplate[]`).
  - Estilos visuales comunes: `backgroundColor`, bordes individuales (`borderTopWidth`, etc.), colores de borde y radios de esquina (`borderRadius`).
  - `overflow`: `"hidden"` en su renderizado para evitar que elementos excedentes se salgan de la caja cuando las dimensiones son fijas.

### RF-2: Definición de Subplantillas Hijas por el Maquetador ([`EditCardModal.tsx`](file:///c:/Users/victo/proyectos/cdc2/client/src/EditCardModal.tsx))
- El usuario maquetador añade y diseña capas hijas dentro de la lista normalmente (ej: un texto simple o un sub-contenedor con icono + título + valor numérico).
- Al seleccionar la capa de tipo Lista en [`EditCardModal.tsx`](file:///c:/Users/victo/proyectos/cdc2/client/src/EditCardModal.tsx), el inspector derecho muestra la sección **"Subplantillas de Elementos Hijas"**:
  - **Asignar hijo como Subplantilla**: Muestra un selector desplegable con los hijos inmediatos de la lista que aún no son subplantillas, permitiendo pulsar *"➕ Guardar como Subplantilla"*.
  - **Inventario de Subplantillas Registradas**: Muestra las subplantillas guardadas, permitiendo:
    - Editar su nombre descriptivo visible (ej: *"Ataque Melé"*).
    - Editar su etiqueta interna `tag` (ej: `"mele"`).
    - Eliminar la subplantilla de la lista de disponibles (con confirmación).
  - **Persistencia Garantizada**: Aunque el maquetador borre todas las capas hijas visibles del lienzo en la plantilla, el array `childTemplates` se preserva intacto dentro de la lista.
  - **Instanciación en Plantilla**: Botones *"➕ Añadir [Nombre Subplantilla]"* para insertar instancias vivas en la plantilla por defecto.

### RF-3: Instanciación, Duplicación y Regeneración Recursiva de IDs
- Al instanciar una subplantilla o duplicar un elemento existente de la lista:
  1. Se localiza la capa raíz del elemento y, si es un sub-contenedor, todas las capas descendientes asociadas recursivamente mediante `parentCapaId`.
  2. Se genera un mapa de sustitución de IDs: `{ [oldId]: crypto.randomUUID() }`.
  3. Se clonan los objetos de capa aplicando los nuevos IDs generados.
  4. Los `parentCapaId` de las capas descendientes se actualizan para apuntar a los nuevos IDs correspondientes.
  5. El `parentCapaId` de la capa raíz instanciada se vincula a la lista (`list.id`).
  6. La nueva capa raíz se inserta al final de los elementos de la lista en el orden jerárquico.
  7. Se conserva en la capa instanciada una referencia informativa opcional `originTemplateId` para conocer de qué subplantilla procede.

### RF-4: Gestión Rápida e Interactiva en el Inspector General ([`App.tsx`](file:///c:/Users/victo/proyectos/cdc2/client/src/App.tsx))
- En el inspector lateral derecho de la vista principal del documento ([`App.tsx`](file:///c:/Users/victo/proyectos/cdc2/client/src/App.tsx)), al tener seleccionada una carta que posee una capa de tipo lista:
  - **Sección de la Lista**: Encabezado claro con el nombre de la lista (ej: `📋 Lista de Ataques`).
  - **Botonera de Creación Rápida**: Botones visibles para cada subplantilla registrada:
    - `[➕ Añadir Ataque Melé]` `[➕ Añadir Ataque a Distancia]`
  - **Lista de Elementos Actuales (Acordeón)**:
    - Cada elemento de la lista se muestra como una tarjeta colapsable con:
      - Título con índice y nombre (ej: `1. Ataque Melé`).
      - Botones de acción rápida:
        - 🔼 Mover elemento hacia arriba en la lista.
        - 🔽 Mover elemento hacia abajo en la lista.
        - 📋 Duplicar elemento completo.
        - 🗑️ Eliminar elemento de la lista.
      - Botón para desplegar / colapsar los campos del elemento.
    - **Apertura Automática**: Al pulsar sobre *"➕ Añadir [Subplantilla]"*, el nuevo elemento añadido se coloca al final y **aparece automáticamente desplegado** para que el usuario pueda escribir de inmediato.
    - **Campos Expuestos del Elemento**: Dentro del acordeón desplegado, se presentan los controles de edición de todas las propiedades expuestas (texto, tipografía, tamaño, color, imágenes, etc.) correspondientes a la capa del elemento y a sus subcapas anidadas.
    - Modificar cualquier valor actualiza de forma reactiva la carta y su lienzo.

### RF-5: Reordenación y Gestión en el Modal de Edición ([`EditCardModal.tsx`](file:///c:/Users/victo/proyectos/cdc2/client/src/EditCardModal.tsx))
- En el árbol jerárquico de capas (Hierarchy List) de [`EditCardModal.tsx`](file:///c:/Users/victo/proyectos/cdc2/client/src/EditCardModal.tsx):
  - Los hijos de la lista se representan anidados bajo la lista con su icono correspondiente.
  - Se permite reordenar arrastrando (*drag and drop*) o utilizando las opciones de subir/bajar capa.
  - Al seleccionar la lista, el inspector derecho también ofrece la sección de elementos instanciados con las mismas facilidades de reordenar, duplicar y eliminar.

### RF-6: Renderizado Unificado en Visores y Exportación PDF
- En todos los puntos de renderizado del proyecto:
  - Lienzo interactivo del editor ([`EditCardModal.tsx`](file:///c:/Users/victo/proyectos/cdc2/client/src/EditCardModal.tsx)).
  - Lienzo del documento en vista previa ([`App.tsx`](file:///c:/Users/victo/proyectos/cdc2/client/src/App.tsx)).
  - Visor ampliado de carta ([`DetailModal.tsx`](file:///c:/Users/victo/proyectos/cdc2/client/src/DetailModal.tsx)).
  - Visor de plantillas ([`TemplatePreviewModal.tsx`](file:///c:/Users/victo/proyectos/cdc2/client/src/components/TemplatePreviewModal.tsx)).
  - Generador de HTML para PDF y Puppeteer ([`server/src/index.ts`](file:///c:/Users/victo/proyectos/cdc2/server/src/index.ts) y [`server/src/debug_html.ts`](file:///c:/Users/victo/proyectos/cdc2/server/src/debug_html.ts)).
- La capa de tipo `"list"` se renderiza aplicando `getContainerFlexStyle(capa.layout || "vertical")` con `overflow: "hidden"` (cuando las dimensiones son fijas) y ordenando sus capas hijas inmediatas según su posición secuencial en la lista.

---

## 3. Arquitectura y Diseño de Datos

### 3.1. Definición de Tipos TypeScript (`shared/layoutEngine.ts`)

```typescript
export interface ChildTemplate {
  id: string;               // ID única de la subplantilla (ej. "tmpl_mele_1")
  tag: string;              // Etiqueta identificativa (ej. "mele")
  name: string;             // Nombre visible para el usuario (ej. "Ataque Melé")
  rootCapa: any;            // Clon de la capa raíz de la subplantilla
  descendantCapas?: any[];  // Capas anidadas hijas si rootCapa es un container
}

export interface CapaList extends CapaBase {
  tipo: "list";
  layout: ContainerLayout;  // "vertical" | "vertical-center" | "vertical-reverse" | "horizontal" | ...
  anchoMm: number | "auto";
  altoMm: number | "auto";
  childTemplates: ChildTemplate[];
  originTemplateId?: string; // Para elementos que fueron instanciados desde una subplantilla
  // Propiedades de bordes, fondo y radio comunes de contenedor
}
```

### 3.2. Función Auxiliar de Clonación Recursiva de IDs (`shared/layoutEngine.ts` o utilidades)

```typescript
export function cloneLayerTreeWithNewIds(
  rootCapa: any,
  descendantCapas: any[] = [],
  targetParentId: string
): { newRoot: any; newDescendants: any[] } {
  const idMap = new Map<string, string>();
  
  // 1. Generar nueva ID para la raíz
  const newRootId = `layer_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  idMap.set(rootCapa.id, newRootId);
  
  // 2. Generar nuevas IDs para todas las descendientes
  descendantCapas.forEach((c) => {
    idMap.set(c.id, `layer_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`);
  });
  
  // 3. Clonar y reasignar raíz
  const newRoot = {
    ...JSON.parse(JSON.stringify(rootCapa)),
    id: newRootId,
    parentCapaId: targetParentId
  };
  
  // 4. Clonar y reasignar descendientes
  const newDescendants = descendantCapas.map((c) => {
    const cloned = JSON.parse(JSON.stringify(c));
    cloned.id = idMap.get(c.id)!;
    cloned.parentCapaId = idMap.get(c.parentCapaId) || newRootId;
    return cloned;
  });
  
  return { newRoot, newDescendants };
}
```

---

## 4. Interfaces de Usuario y Flujo de Interacción

### 4.1. Maquetación en `EditCardModal.tsx`
```
┌─────────────────────────────────────────────────────────────┐
│ Inspector Capa: Lista de Habilidades [📋]                   │
├─────────────────────────────────────────────────────────────┤
│ Tipo de Layout: [ Linear Vertical (Top-to-Bottom) ▼ ]       │
│ Ancho (mm): [ 50 ]   Alto (mm): [ auto ] ☑ Alto Auto       │
├─────────────────────────────────────────────────────────────┤
│ 📦 SUBPLANTILLAS DISPONIBLES:                               │
│  • [⚔️ Ataque Melé] (tag: mele)       [✏️ Renombrar] [🗑️]   │
│  • [🏹 Ataque Distancia] (tag: dist)  [✏️ Renombrar] [🗑️]   │
│                                                             │
│ Guardar hijo existente como subplantilla:                   │
│ [ Contenedor_Ataque_01 ▼ ]  [ ➕ Registrar Subplantilla ]   │
├─────────────────────────────────────────────────────────────┤
│ ➕ INSERTAR EN PLANTILLA:                                   │
│  [ + Añadir Ataque Melé ]   [ + Añadir Ataque Distancia ]   │
└─────────────────────────────────────────────────────────────┘
```

### 4.2. Edición Rápida en el Inspector de `App.tsx`
```
┌─────────────────────────────────────────────────────────────┐
│ 📋 LISTA: Lista de Habilidades                              │
│ Añadir elemento:                                            │
│ [ ➕ Ataque Melé ]  [ ➕ Ataque Distancia ]                 │
├─────────────────────────────────────────────────────────────┤
│ ▼ Elemento 1: Ataque Melé              [🔼][🔽][📋][🗑️]     │
│   ┌───────────────────────────────────────────────────────┐ │
│   │ Nombre:  [ Golpe Contundente                        ] │ │
│   │ Daño:    [ 15                                       ] │ │
│   │ Texto:   [ Causa aturdimiento en el objetivo.       ] │ │
│   └───────────────────────────────────────────────────────┘ │
│ ► Elemento 2: Ataque Distancia         [🔼][🔽][📋][🗑️]     │
│   (colapsado)                                               │
└─────────────────────────────────────────────────────────────┘
```

---

## 5. Estrategia de Verificación (Pruebas)

### 5.1. Pruebas Unitarias Automatizadas
1. **Creación de Lista y Registro de Subplantillas**:
   - Verificar que una capa de tipo `"list"` puede registrar y almacenar subplantillas en `childTemplates`.
   - Verificar que al eliminar del árbol de capas las instancias hijas, `childTemplates` conserva sus definiciones intactas.
2. **Clonación y Regeneración Recursiva de IDs**:
   - Clonar un sub-contenedor con dos niveles de capas anidadas.
   - Comprobar que todos los IDs generados son nuevos y únicos.
   - Comprobar que los `parentCapaId` de las subcapas apuntan a los nuevos IDs correspondientes y no a los originales.
3. **Reordenación y Eliminación de Elementos en la Lista**:
   - Insertar 3 elementos en la lista.
   - Probar la función de mover arriba/abajo y comprobar el nuevo orden de los elementos hijos.
   - Probar la eliminación y verificar que se eliminan tanto la raíz del elemento como todas sus subcapas hijas asociadas.
4. **Dimensiones Automáticas y Flex Layout**:
   - Comprobar que `isVerticalLayout("vertical")` y las funciones de `layoutEngine` aplican correctamente a `capa.tipo === "list"`.

### 5.2. Pruebas Manuales / Checklist de Aceptación
- [ ] En [`EditCardModal.tsx`](file:///c:/Users/victo/proyectos/cdc2/client/src/EditCardModal.tsx), añadir una nueva capa de tipo **Lista (`📋`)**.
- [ ] Crear dentro de la lista un elemento (ej. un texto o un contenedor con icono y texto).
- [ ] Seleccionar la Lista y en el inspector guardar el hijo como subplantilla con el nombre *"Ataque Melé"*.
- [ ] Crear un segundo elemento diferente y guardarlo como subplantilla *"Ataque a Distancia"*.
- [ ] Eliminar los elementos de prueba del lienzo para dejar la plantilla limpia (o dejar uno solo).
- [ ] Guardar la plantilla y volver a la vista principal ([`App.tsx`](file:///c:/Users/victo/proyectos/cdc2/client/src/App.tsx)).
- [ ] Seleccionar la carta creada con esa plantilla y verificar que en el panel lateral derecho aparece la sección de la lista con los botones `[➕ Ataque Melé]` y `[➕ Ataque a Distancia]`.
- [ ] Pulsar en añadir varios ataques y comprobar que:
  - Se agregan al final de la lista en el lienzo.
  - El último añadido se muestra desplegado en el inspector.
  - Los campos de texto, tamaño y color expuestos se pueden editar individualmente por cada ataque.
  - Los botones de subir (🔼) y bajar (🔽) reordenan correctamente los elementos en el lienzo.
  - El botón duplicar (📋) crea una copia exacta del elemento con sus valores.
  - El botón borrar (🗑️) elimina el elemento de la carta.
- [ ] Exportar a PDF / previsualizar en visor de detalle y verificar que la lista se dibuja fielmente con los elementos añadidos.
