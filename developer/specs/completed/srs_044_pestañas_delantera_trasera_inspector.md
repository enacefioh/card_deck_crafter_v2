# SRS-044: Pestañas Delantera/Trasera en Inspector de Propiedades

**Estado: Completado**

## Descripción
Esta especificación define la incorporación de dos pestañas ("Delantera" y "Trasera") en la parte superior de la barra lateral derecha ("Campos Editables"). Al activar el reverso de las cartas ("generarReversos"), el usuario podrá conmutar entre estas pestañas para visualizar y editar los campos expuestos de la cara frontal o de la cara trasera correspondientes. Además, al alternar la pestaña, la vista del lienzo principal se desplazará de forma automática para enfocar la cara activa de la carta seleccionada.

---

## Requisitos de Interfaz de Usuario (UI)

### RF-1: Pestañas de Selección de Cara
*   Se añadirán dos botones de pestañas en la parte superior del panel derecho:
    *   **Delantera**: Activo por defecto.
    *   **Trasera**: Solo habilitado si la opción "Generar Reversos (Doble Cara)" está activa y la carta o cartas seleccionadas disponen de una plantilla trasera válida (`plantillaTraseraId` o `plantillaTrasera`).
*   Si la opción "Generar Reversos" no está activa, las pestañas permanecerán ocultas o se desactivará la pestaña "Trasera".
*   Las pestañas tendrán un diseño moderno y minimalista integrado en el encabezado de "Campos Editables".

### RF-2: Conmutación de Atributos del Inspector
*   Al activar la pestaña **Delantera**:
    *   Se cargarán y editarán las propiedades expuestas asociadas a `plantilla` / `valoresCampos` / `capasOverrides`.
*   Al activar la pestaña **Trasera**:
    *   Se cargarán y editarán las propiedades expuestas asociadas a `plantillaTrasera` / `valoresCamposTrasera` / `capasOverridesTrasera`.

### RF-3: Auto-Enfoque y Scroll en Lienzo
*   Al cambiar de pestaña:
    *   Se localizará el elemento DOM correspondiente a la cara de la carta activa en el lienzo central.
    *   Se ejecutará un scroll automático suave (`scrollIntoView({ behavior: 'smooth', block: 'center' })` o similar) para desplazar el lienzo y centrar visualmente la cara que el usuario está editando.

### RF-4: Activación por Selección en Lienzo
*   Al hacer clic para seleccionar una carta en el lienzo central:
    *   Si se hace clic sobre la cara trasera de la carta, se activará automáticamente la pestaña **Trasera** en el inspector de propiedades.
    *   Si se hace clic sobre la cara delantera (o selección normal), se activará automáticamente la pestaña **Delantera** en el inspector de propiedades.

---

## Modificaciones del Estado (React State)
Se añadirá una nueva variable de estado en `App.tsx`:
```typescript
const [inspectorTab, setInspectorTab] = useState<"front" | "back">("front");
```

---

## Plan de Verificación

### Pruebas Manuales
1.  **Visibilidad de Pestañas**: Activar y desactivar la opción "Generar Reversos" y verificar que la pestaña "Trasera" responda correspondientemente.
2.  **Edición Condicional**: Modificar una propiedad en la pestaña "Delantera", cambiar a la pestaña "Trasera", modificar una propiedad allí, y verificar que no se sobreescriban entre sí y que ambas caras actualicen sus capas correspondientes.
3.  **Scroll Automático**: Hacer clic en la pestaña "Trasera" y comprobar que el contenedor del lienzo realiza scroll suave hasta la cara trasera de la carta seleccionada. Volver a hacer clic en "Delantera" y verificar el scroll inverso.
