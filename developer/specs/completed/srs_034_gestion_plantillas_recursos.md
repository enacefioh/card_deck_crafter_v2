# SRS-034: Gestor de Plantillas y Consolidación de Recursos

## Descripción del Problema
Actualmente, las opciones para gestionar recursos globales del proyecto como la "Galería del proyecto" y "Tipografías del proyecto" se encuentran dispersas en la interfaz o en menús generales. Además, no existe un visor o interfaz dedicada para ver, cambiar el nombre o eliminar las plantillas personalizadas que han sido importadas o guardadas en el proyecto.

## Requisitos Funcionales

### RF-1: Nuevo Menú "Recursos" en MenuBar
*   Se creará una pestaña principal llamada **Recursos** en el menú superior (`MenuBar`).
*   Bajo esta pestaña se agruparán las siguientes opciones:
    1.  **Galería de Imágenes**: Abre la galería multimedia del proyecto (anteriormente en el panel lateral o menús generales).
    2.  **Fuentes Tipográficas**: Abre el gestor de tipografías personalizadas del proyecto.
    3.  **Gestor de Plantillas**: Nueva opción que abrirá el modal de gestión de plantillas.

### RF-2: Modal del Gestor de Plantillas
Al hacer clic en "Gestor de Plantillas", se abrirá un modal popup dedicado que mostrará la lista completa de plantillas del proyecto (`templatesMap` / `importedTemplates`) y permitirá:
1.  **Visualización**: Listar todas las plantillas activas cargadas en el proyecto con su nombre e ID.
2.  **Renombrar**: Modificar el nombre descriptivo de cualquiera de las plantillas existentes.
3.  **Eliminar**: Borrar una plantilla personalizada del proyecto.
    *   *Nota*: Si una plantilla está siendo usada por alguna carta, el sistema debe pedir confirmación antes de eliminarla, o notificar el uso de la misma.
4.  **Acceso de Importación**: Un botón integrado para importar un archivo de plantilla `.cdc2t` directamente desde este gestor.

### RF-3: Limpieza e Integración de la Interfaz
*   Se moverán los disparadores de los estados correspondientes (`showProjectGallery`, `showProjectFonts`) para que estén vinculados al menú de Recursos.
*   Se añadirá un nuevo estado `showTemplatesManager` en `App.tsx` para controlar la visibilidad del nuevo gestor de plantillas.
