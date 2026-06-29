# Especificación Técnica (SRS) - SRS-029: Soporte Multidocumento

Esta especificación describe el diseño de la arquitectura y la interfaz para dotar a Card Deck Crafter v2 de soporte para múltiples documentos independientes dentro de un único proyecto. Esto permitirá organizar cartas de distintas dimensiones, orientaciones o temáticas compartiendo las mismas plantillas, assets y fuentes del proyecto.

---

## 1. Introducción y Objetivos
*   **Propósito**: Permitir que un único archivo de proyecto `.cdc2` almacene múltiples hojas o documentos (por ejemplo, un documento para "Cartas de Héroe" verticales y otro para "Cartas de Escenario" horizontales).
*   **Objetivos de Diseño**:
    *   **Recursos Compartidos**: Compartir globalmente entre todos los documentos las plantillas (`templates`), la galería de imágenes (`assets`) y las tipografías del proyecto (`customFonts`).
    *   **Navegación Intuitiva**: Incorporar una barra de navegación/pestañas en el menú superior para cambiar ágilmente de documento.
    *   **Retrocompatibilidad**: Asegurar que los archivos `.cdc2` de la versión anterior (`2.0.0`) se importen y migren automáticamente al nuevo formato multidocumento.

---

## 2. Requisitos Funcionales y Casos de Uso

*   **RF-1: Estructura Multidocumento**:
    *   Un proyecto debe poder almacenar una lista de documentos independientes.
    *   Cada documento debe tener su propio ID único, nombre descriptivo, configuración de canvas (`CanvasConfig`), configuración de carta (`CardConfig`), modo de traseras y listado de cartas (`Carta[]`).
*   **RF-2: Navegación entre Documentos (UI)**:
    *   En la barra superior de la interfaz (`MenuBar`), se incorporará un panel central con pestañas o iconos interactivos para cada documento.
    *   El documento activo se destacará visualmente (con color de acento).
    *   Al pasar el ratón (hover) sobre cada pestaña, se mostrará un tooltip con el nombre completo del documento.
    *   Al pulsar sobre una pestaña, se cambiará inmediatamente el área de trabajo y el lienzo al documento seleccionado.
*   **RF-3: Creación de Documentos**:
    *   Al final del listado de pestañas se presentará un botón de añadir (`➕`). Adicionalmente, se incluirá la opción "Nueva Página" en el menú de "Archivo".
    *   Al activar cualquiera de estas opciones, se abrirá un popup de configuración adaptado (basado en el de inicio): sin campo de "Nombre del Proyecto" (sustituido por "Nombre del Documento"), sin botón de "Abrir Proyecto", y cuyo botón principal sea "Crear Nuevo Documento en el Proyecto". Permitiendo añadir la nueva página al final de la lista.
*   **RF-4: Gestión de Documentos (Renombrar/Eliminar)**:
    *   El usuario podrá hacer doble clic sobre la pestaña activa para renombrar el documento.
    *   Cada pestaña (excepto si queda un único documento) mostrará un botón discreto de cerrar/eliminar (`×`) al pasar el cursor por encima, pidiendo confirmación antes de borrar.
*   **RF-5: Advertencia de Incompatibilidad de Plantillas**:
    *   Al asignar una plantilla a una carta, el sistema comprobará si las dimensiones de la plantilla (ancho/alto de sus capas) coinciden con el tamaño de carta (`CardConfig`) configurado en el documento activo.
    *   En caso de discrepancia, se mostrará un icono de advertencia (`⚠️`) en la lista de plantillas con un tooltip explicativo.

---

## 3. Arquitectura y Diseño de Datos

### Modelo de Datos del Proyecto CDC2 (Versión 2.1.0)
Se evoluciona la estructura del proyecto en `shared/layoutEngine.ts` para agrupar la configuración por documentos:

```typescript
export interface DocumentoCDC2 {
  id: string;
  nombre: string;
  canvasConfig: CanvasConfig;
  cardConfig: CardConfig;
  modoTraseras: "comun" | "individual" | "ninguno";
  imagenTraseraComun: string | null;
  cards: Carta[];
}

export interface ProyectoCDC2 {
  version: "2.1.0";
  meta: {
    nombre: string;
    fechaCreacion: string;
    fechaModificacion: string;
  };
  documentos: DocumentoCDC2[];
  activeDocumentoId: string;
  
  // Recursos globales compartidos
  templates?: Record<string, any>;
  assets?: ProjectAsset[];
  customFonts?: CustomFont[];
}
```

### Estrategia de Migración (Retrocompatibilidad)
Al cargar un proyecto que no posea la propiedad `documentos` (estructura clásica 2.0.0):
1.  Crear un documento inicial por defecto.
2.  Extraer las propiedades `canvasConfig`, `cardConfig`, `modoTraseras`, `imagenTraseraComun` y `cards` del proyecto clásico y volcarlas al documento inicial.
3.  Asignar el nombre "Documento 1" a este documento.
4.  Establecer `activeDocumentoId` al ID de este documento.
5.  Actualizar la versión del proyecto a `"2.1.0"`.

---

## 4. Estrategia de Verificación (Pruebas)

### 4.1. Pruebas Unitarias
*   Implementar un test en `client/src/utils/projectUtils.test.ts` para verificar la migración correcta de un esquema clásico a un esquema multidocumento.
*   Probar que al importar y exportar un archivo `.cdc2` multidocumento, la integridad de los datos de todos los documentos y los recursos globales compartidos se mantenga intacta.

### 4.2. Pruebas Manuales
1.  **Crear Múltiples Hojas**: Añadir una página vertical (A4) y una página horizontal (A3). Verificar que cada una mantiene su escala y distribución independientes en el área de trabajo.
2.  **Verificar Compartidos**: Subir una imagen a la galería en la Página 1, cambiar a la Página 2 y comprobar que la imagen sigue disponible.
3.  **Renombrar y Eliminar**: Cambiar el nombre a un documento mediante doble clic, eliminar un documento y comprobar que el estado se actualiza correctamente seleccionando la página adyacente.
