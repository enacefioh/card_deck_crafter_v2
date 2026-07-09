# SRS-045: Galería de Usuario y Simplificación de Recursos

**Estado: En Revisión**

## Descripción
Esta especificación define la eliminación de los recursos a nivel de plantilla (tanto la galería de imágenes como de fuentes de plantilla), simplificando la gestión de recursos de modo que todo se controle a nivel global del proyecto. Asimismo, se rediseña el popup de la galería de imágenes del inspector de propiedades para ofrecer dos pestañas: "Imágenes del Proyecto" (precargadas de forma global) e "Imágenes de Usuario" (imágenes que el usuario ha cargado en algún momento en los formularios de las cartas).

---

## Requisitos de Interfaz de Usuario (UI) y Comportamiento

### RF-1: Eliminación de Recursos a Nivel de Plantilla
*   Se eliminarán las opciones para subir y gestionar fuentes (`customFonts`) o imágenes (`assets`) específicos del editor de plantillas (`EditCardModal.tsx`).
*   Los selectores de fuentes en el editor de plantillas y en el editor de cartas mostrarán la lista global de fuentes del proyecto en su lugar.

### RF-2: Galería de Usuario (`userAssets`)
*   Se creará un nuevo listado global de recursos del usuario (`userAssets`).
*   Cada vez que el usuario suba una imagen a través del selector de archivos en el inspector de propiedades de una carta, esta imagen se registrará automáticamente en `userAssets` (evitando duplicados basados en el contenido base64 de la imagen).
*   Los recursos cargados por el usuario en `userAssets` se guardarán y exportarán dentro del archivo de proyecto (`.cdc2`).

### RF-3: Pestañas de la Galería en el Inspector
*   El popup de selección de galería de la barra lateral derecha tendrá las siguientes pestañas:
    *   **Imágenes del Proyecto**: Muestra las imágenes globales precargadas del proyecto (`projectAssets`).
    *   **Imágenes de Usuario**: Muestra todas las imágenes cargadas por el usuario (`userAssets`), permitiendo su reutilización directa con un simple clic.

---

## Modificaciones del Estado y Persistencia
1.  **Nuevo Estado en React (`App.tsx`)**:
    ```typescript
    const [userAssets, setUserAssets] = useState<any[]>([]);
    ```
2.  **Persistencia del Proyecto**:
    *   El exportador de archivos `.cdc2` incluirá los archivos de la galería de usuario en la carpeta `user_assets/` del zip y los listará en el JSON del proyecto.
    *   El importador de archivos `.cdc2` descomprimirá y cargará la galería de usuario en el estado `userAssets`.

---

## Plan de Verificación

### Pruebas Manuales
1.  **Eliminación en Editor**: Abrir el creador de plantillas y verificar que ya no existen secciones de carga de fuentes o imágenes de plantilla.
2.  **Carga e Inserción**: Subir una imagen en el inspector de una carta y verificar que se aplica a la carta.
3.  **Visualización en Galería**: Abrir la galería desde otra carta y comprobar que la imagen previamente subida aparece en la pestaña "Imágenes de Usuario".
4.  **Guardado y Carga**: Exportar el proyecto, recargar la aplicación, importar el proyecto y verificar que las imágenes de la galería de usuario persisten y se visualizan correctamente.
