# Especificación Técnica - SRS-015: Capas de Imagen Switch (Variaciones Rápidas)

Este documento describe la especificación técnica para las **Capas de Imagen Switch** (o capas de selección rápida de imágenes). Este tipo de elemento permite definir una colección de recursos visuales de la galería de la plantilla para una capa específica, permitiendo al usuario cambiar entre ellos con un solo clic mediante un carrusel horizontal.

---

## 1. Modelo de Datos

Las capas de tipo `"image-switch"` extienden la estructura básica de una capa. En [layoutEngine.ts](file:///c:/Users/victo/proyectos/cdc2/shared/layoutEngine.ts), se añade el tipo `"image-switch"` y las siguientes propiedades:

```typescript
export interface CapaImageSwitch extends CapaBase {
  tipo: "image-switch";
  // Opciones de imágenes asignadas al switch (subconjunto de assets de la galería de la plantilla)
  options: Array<{
    id: string;      // ID único del asset
    nombre: string;  // Nombre descriptivo (ej: "Fuego", "Tierra")
    src: string;     // Ruta de la imagen (blob: o asset://)
  }>;
  // ID de la opción seleccionada por defecto en la plantilla
  selectedOptionId?: string;
  // Ruta de la imagen activa por defecto (copiada de la opción activa)
  src: string;
  // Ajuste de escala ("cover" | "contain" | "stretch")
  modoAjuste?: "cover" | "contain" | "stretch";
}
```

### Anulaciones por Carta (Overrides)
Al igual que las capas de imagen convencionales, cada carta individual puede anular la opción activa de la capa.
* Si el usuario selecciona una de las opciones predefinidas, se guarda en el override de la carta:
  ```typescript
  card.capasOverrides[capaId] = {
    src: selectedAssetSrc,
    selectedOptionId: selectedAssetId
  };
  ```
* Si el usuario opta por cargar una imagen personalizada desde su ordenador, se almacena en el override:
  ```typescript
  card.capasOverrides[capaId] = {
    src: localBlobUrl,
    selectedOptionId: undefined // Al ser personalizada, no corresponde a ninguna opción predefinida
  };
  ```

---

## 2. Interfaz de Usuario y Comportamiento

### A. Pestaña de Diseño (Editor de Plantilla)
Cuando se selecciona una capa de tipo `"image-switch"`, en la columna derecha de propiedades (pestaña **Diseño**) se mostrarán los siguientes controles:
1. **Controles Estándar**: Nombre de la capa, dimensiones (X, Y, Ancho, Alto) y Modo de Ajuste.
2. **Botón "Seleccionar recursos para este elemento"**: 
   * Abre un popup modal que lista **todos** los recursos disponibles en la galería de la plantilla activa (`plantillaActiva.assets`).
   * Cada miniatura se muestra con una casilla de selección (checkbox).
   * El usuario puede marcar múltiples recursos para asociarlos a esta capa switch.
   * Al pulsar **"Guardar"**, los elementos seleccionados se guardan en la propiedad `options` de la capa.

### B. Pestaña de Contenido (Edición de Carta)
Cuando se selecciona una capa de tipo `"image-switch"`, en la pestaña **Contenido** se muestran las siguientes secciones de edición:
1. **Vista Previa de Imagen Activa**: Muestra la imagen actualmente seleccionada para la carta (o la imagen por defecto si no tiene override).
2. **Botón "Restablecer"**: Visible si hay un override activo, para restaurar el diseño original de la plantilla.
3. **Carrusel de Selección Horizontal (Scroll en Mosaico)**:
   * Muestra una tira deslizable horizontalmente con miniaturas cuadradas de todos los recursos en `options` configurados para esta capa.
   * Debajo de cada miniatura, se muestra el nombre descriptivo del asset truncado si es necesario.
   * La miniatura activa actualmente para la carta se resalta con un borde violeta destacado.
   * Al hacer clic en cualquiera de las miniaturas, se asigna inmediatamente esa imagen a la carta guardando el override correspondiente.
4. **Botón "Subir archivo personalizado" (Selector del PC)**:
   * Al final del carrusel horizontal se mostrará una opción con el icono `+` para subir un archivo local desde el PC.
   * Abre el cuadro de diálogo estándar del sistema operativo. Al seleccionar una imagen válida, se asigna como anulación directa para esa carta.

---

## 3. Casos de Uso Detallados

### Caso de Uso 1: Configurar Opciones de la Capa Switch en Diseño
*   **Actor**: Diseñador de Plantilla.
*   **Precondición**: El editor de la plantilla está abierto, hay una capa de tipo `"image-switch"` seleccionada, y la galería de la plantilla contiene recursos de imagen previamente subidos.
*   **Flujo Principal**:
    1. El usuario hace clic en el botón *"Seleccionar recursos para este elemento"* en la pestaña Diseño.
    2. El sistema abre el popup mostrando todas las imágenes de la galería de la plantilla.
    3. El usuario marca las casillas de las imágenes que desea asociar a esta capa (ej: "Icono_Fuego.png", "Icono_Agua.png").
    4. El usuario hace clic en *"Guardar"*.
    5. El sistema asocia los assets a la propiedad `options` de la capa y cierra el popup.
*   **Flujos Alternativos**:
    *   *Galería vacía*: En el paso 2, si la galería no tiene assets, el popup muestra un mensaje indicando que debe subir recursos a la galería primero y ofrece un enlace/botón para abrir el Gestor de Galería.
    *   *Cancelar selección*: En el paso 4, si el usuario pulsa *"Cancelar"*, se cierra el popup sin guardar cambios.
*   **Postcondición**: Las imágenes seleccionadas quedan registradas como opciones válidas para la capa switch en la plantilla.

### Caso de Uso 2: Seleccionar Opción Predefinida en Contenido
*   **Actor**: Creador de Carta.
*   **Precondición**: La carta activa tiene asignada la plantilla que contiene una capa `"image-switch"` configurada con opciones disponibles.
*   **Flujo Principal**:
    1. El usuario selecciona la capa `"image-switch"` en el editor.
    2. El sistema muestra la pestaña Contenido con el carrusel horizontal de miniaturas y la imagen activa destacada.
    3. El usuario hace clic sobre una de las miniaturas del carrusel.
    4. El sistema actualiza el lienzo de la carta con la imagen seleccionada y guarda la anulación (`capasOverrides`) correspondiente a nivel de carta.
*   **Postcondición**: La carta individual muestra el recurso seleccionado y mantiene la referencia al asset predefinido.

### Caso de Uso 3: Cargar Imagen Personalizada desde el Dispositivo
*   **Actor**: Creador de Carta.
*   **Precondición**: La carta activa está seleccionada y se está editando la capa `"image-switch"`.
*   **Flujo Principal**:
    1. El usuario pulsa el botón `+` ("Subir personalizado") al final del carrusel horizontal.
    2. El sistema abre el selector de archivos del navegador.
    3. El usuario elige una imagen local de su disco duro.
    4. El sistema genera un Object URL temporal (`blob:`), lo asigna al `src` del override de la capa para esa carta y desmarca cualquier selección predefinida en el carrusel.
*   **Postcondición**: La carta muestra la imagen cargada localmente y se almacena en el override de la carta con `selectedOptionId` establecido en `undefined`.

---

## 4. Plan de Verificación

### Pruebas Automatizadas (Unitarias)
1.  **Validación de Estructura de Datos**:
    *   Testear que una capa con `tipo: "image-switch"` se instancia correctamente con un array de opciones `options` vacío o poblado.
2.  **Clonación y Duplicación**:
    *   Verificar que al clonar/duplicar una carta con capas de tipo switch, la propiedad `options` y la selección activa se duplican sin mantener referencias mutables de objeto compartidas.
3.  **Serialización de Assets**:
    *   Comprobar que en la función de exportación a ZIP, todas las imágenes asociadas en `options` se escriben a rutas `asset://...` y se empaquetan en la carpeta `/assets` del ZIP.

### Pruebas Manuales
1.  **Configuración en Diseño**:
    *   Crear una capa `"image-switch"`.
    *   Abrir el popup, seleccionar 2 imágenes y guardar.
    *   Verificar que el panel de contenido muestra exactamente esas 2 opciones en el carrusel.
2.  **Selección Rápida**:
    *   Hacer clic en la primera opción del carrusel, verificar el cambio en el lienzo.
    *   Hacer clic en la segunda, verificar el cambio y comprobar que la miniatura seleccionada se marca con el borde destacado.
3.  **Subida Externa**:
    *   Pulsar el botón `+` en el carrusel y seleccionar un archivo local.
    *   Verificar que la carta muestra la nueva imagen externa y que ninguna miniatura del carrusel aparece seleccionada.
4.  **Limpieza/Reset**:
    *   Pulsar el botón de *"Restablecer"* en la pestaña contenido tras aplicar un override.
    *   Verificar que la capa recupera la imagen por defecto configurada en la plantilla.
5.  **Exportación a PDF**:
    *   Generar un PDF de un proyecto que contenga una carta con una opción switch activa y otra con una imagen personalizada.
    *   Comprobar que el PDF se genera sin errores y muestra las imágenes correctas en las cartas respectivas.
