# Especificación Técnica - SRS-012: Reversos Basados en Plantillas

Este documento especifica el diseño y la implementación de la funcionalidad que permite diseñar y renderizar reversos (caras traseras) de cartas dinámicamente mediante plantillas vectoriales, unificando la lógica con el anverso (cara frontal).

---

## 1. Introducción y Objetivos
- **Propósito**: Permitir que los reversos de las cartas no se limiten únicamente a imágenes estáticas subidas por el usuario, sino que puedan ser diseñados a partir del motor de plantillas y capas dinámicas.
- **Objetivos de Diseño**:
  - **Unificación**: Reutilizar el mismo motor de capas vectoriales (background, text) y de reemplazo de variables del anverso en el reverso.
  - **Edición Independiente**: Asegurar que las variables, valores de campos e overrides de color de la cara frontal y la cara trasera sean independientes en la misma carta.
  - **Operaciones en Lote**: Facilitar la asignación de plantillas de reverso a una sola carta o a múltiples cartas seleccionadas en lote.
  - **Exportación Fiel**: Actualizar el exportador PDF en Puppeteer para renderizar dinámicamente las capas del reverso.

---

## 2. Requisitos Funcionales y Casos de Uso

- **RF-1: Asignar Plantilla de Reverso en Carta Individual**
  - Al seleccionar una carta en el panel principal, en el menú lateral derecho (debajo del botón de "Subir reverso") se agregará el botón "Asignar reverso desde plantilla".
  - Al pulsarlo, se abrirá un modal con la lista de plantillas disponibles en el proyecto.
  - Al seleccionar una plantilla y aceptar, la carta guardará la referencia del reverso y borrará la imagen trasera estática previa.

- **RF-2: Asignar Plantilla de Reverso en Lote**
  - Al seleccionar múltiples cartas en el panel principal, en el menú lateral derecho (debajo de "Asignar reverso en lote") se habilitará la opción "Asignar reverso en lote desde plantilla".
  - Al pulsarla, se abrirá la selección de plantilla y se aplicará el cambio en lote a todas las cartas seleccionadas.

- **RF-3: Quitar Plantilla de Reverso**
  - Si una carta tiene asignada una plantilla de reverso, en el panel lateral derecho se mostrará la opción de "Quitar plantilla de reverso" (o restablecer a trasera común/ninguna).

- **RF-4: Edición Interactiva en el Modal (`EditCardModal`)**
  - Al editar una carta en el modal interactivo, si `activeTab === "trasera"` y existe `plantillaTraseraId`:
    - **Jerarquía de Capas (Columna Izquierda)**: Mostrará la lista de capas asociadas a la plantilla del reverso.
    - **Lienzo de Previsualización (Columna Central)**: Renderizará en vivo las capas de la plantilla trasera con sus valores e overrides específicos del reverso.
    - **Inspector de Propiedades (Columna Derecha)**: Permitirá editar en vivo las variables y colores de relleno (overrides) específicas del reverso.

- **RF-5: Generación del PDF de Impresión**
  - Al exportar la baraja a PDF, si una carta tiene asignada una plantilla de reverso (`plantillaTraseraId`), las páginas de los reversos en [server/src/index.ts](file:///c:/Users/victo/proyectos/cdc2/server/src/index.ts) se generarán dinámicamente usando las capas vectoriales del reverso en lugar de la etiqueta de imagen estática de trasera.

---

## 3. Arquitectura y Diseño de Datos

### 3.1. Extensión del Modelo de Datos (`shared/layoutEngine.ts`)
Modificaremos la interfaz `Carta` para dar soporte a la estructura independiente de variables e overrides en el reverso:

```typescript
export interface Carta {
  id: string;
  nombre: string;
  imagenFrontal: string | null;
  imagenTrasera: string | null; // Imagen estática (fallback si no hay plantillaTraseraId)
  cantidad: number;
  
  // Cara Frontal (Anverso)
  plantillaId?: string;
  valoresCampos?: Record<string, string>;
  capasOverrides?: Record<string, {
    colorFill?: string;
  }>;
  
  // Cara Trasera (Reverso) - NUEVOS CAMPOS:
  plantillaTraseraId?: string;
  valoresCamposTrasera?: Record<string, string>;
  capasOverridesTrasera?: Record<string, {
    colorFill?: string;
  }>;
}
```

---

## 4. Diseño de la Interfaz de Usuario (UI) y Flujos

### 4.1. Panel Lateral Derecho (`client/src/App.tsx`)
- Se insertará una sección visual dedicada para el reverso:
  - Si la carta seleccionada tiene `plantillaTraseraId`:
    - Mostrar el nombre de la plantilla asignada.
    - Botón de **Editar Reverso** (que abre el `EditCardModal` directamente en la pestaña "Cara Trasera").
    - Botón de **Quitar plantilla de reverso**.
  - Si la carta no tiene `plantillaTraseraId`:
    - Botón de **Asignar reverso desde plantilla**.

### 4.2. Modal de Selección de Plantillas
- Diálogo modal básico que lista las plantillas disponibles (`templatesMap`). Al hacer clic sobre una, se confirma la selección para el reverso de la carta.

### 4.3. Flujo en `EditCardModal.tsx`
- Se unificará el estado temporal de valores e overrides para admitir tanto la cara frontal como la trasera:
  ```typescript
  const [tempValoresCamposTrasera, setTempValoresCamposTrasera] = useState<Record<string, string>>(() => ({
    ...(carta.valoresCamposTrasera || {}),
  }));
  const [tempCapasOverridesTrasera, setTempCapasOverridesTrasera] = useState<Record<string, any>>(() => ({
    ...(carta.capasOverridesTrasera || {}),
  }));
  ```
- Al guardar (`handleSave`), se llamará a `onSave` pasando los cuatro diccionarios temporales:
  ```typescript
  onSave(
    tempValoresCampos, 
    tempCapasOverrides,
    tempValoresCamposTrasera,
    tempCapasOverridesTrasera
  );
  ```

---

## 5. Estrategia de Verificación (Pruebas)

### 5.1. Pruebas Unitarias
- Escribir pruebas unitarias en `client/src/utils/projectUtils.test.ts` (o un nuevo archivo de tests) que comprueben:
  - Que al cambiar los campos dinámicos de la trasera, no se alteren los del anverso.
  - Que al asignar una plantilla de reverso en lote, todas las cartas seleccionadas actualicen correctamente `plantillaTraseraId` e inicialicen los valores de sus campos traseros.

### 5.2. Pruebas Manuales / Criterios de Aceptación
- [ ] **Asignación**: Seleccionar una carta, asignar la plantilla de reverso y verificar que se guarda en el modelo.
- [ ] **Edición**: Abrir el editor de carta, navegar a la pestaña "Cara Trasera", modificar el color del fondo de la trasera y el texto dinámico de la trasera, y verificar que no afecta a la frontal. Guardar y verificar que los cambios se mantienen al volver a abrir.
- [ ] **PDF**: Generar el PDF de una baraja donde algunas cartas tengan reversos basados en plantillas y comprobar que la hoja de traseras renderice el fondo vectorial y los textos dinámicos correspondientes del reverso.
