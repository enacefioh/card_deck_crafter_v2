# Ticket - TKT-042: Eliminar Imágenes de Plantilla (Assets de Plantilla)

- **ID del Ticket**: TKT-042
- **Estado**: 🔴 Activo (Pendiente)
- **Fecha de Registro**: 2026-07-19
- **Severidad**: Media-Baja (Limpieza y unificación de lógica)

---

## 1. Descripción del Problema
De acuerdo con la decisión de diseño de unificar las imágenes a nivel de proyecto (Imágenes del Proyecto) y no mantener activos a nivel de plantilla, la opción "Imágenes de la Plantilla" en los selectores de galería del editor de cartas debe desaparecer.

- **Objetivo**: Limpiar el código fuente de referencias a los assets de plantilla (tanto en el selector de imágenes de capa como en el de switch de imágenes de EditCardModal) y remover funciones de lectura, procesamiento y empaquetado del zip correspondientes a assets de plantilla que ya no son necesarios.

---

## 2. Archivos Implicados
- [`client/src/EditCardModal.tsx`](file:///c:/Users/victo/proyectos/cdc2/client/src/EditCardModal.tsx): Remover la pestaña "Imágenes de la Plantilla" y la lista correspondiente en el selector de imágenes y en el selector de switch. Remover la lógica de subida y procesamiento en la exportación de plantillas locales.
- [`client/src/App.tsx`](file:///c:/Users/victo/proyectos/cdc2/client/src/App.tsx): Limpiar el procesamiento de `clonedPlantilla.assets` en `generarProyectoZip` y la carga en `resolverAssetBlob`.
- [`client/src/utils/projectUtils.test.ts`](file:///c:/Users/victo/proyectos/cdc2/client/src/utils/projectUtils.test.ts): Adaptar o limpiar tests unitarios que hagan referencia a `plantilla.assets`.

---

## 3. Plan de Verificación y Criterios de Aceptación
- [ ] Abrir el modal de edición de carta y seleccionar una capa de Imagen.
- [ ] Comprobar que en el selector de galería solo aparecen las pestañas "Imágenes del Proyecto" y "Galería de Usuario", y que la pestaña "Imágenes de la Plantilla" ha sido eliminada por completo.
- [ ] Hacer lo mismo para una capa de tipo "image-switch" y verificar que el carrusel y selector no contienen referencias a assets de la plantilla.
- [ ] Validar que todo compila y que se pueden generar PDFs y guardar/cargar proyectos `.cdc2` correctamente.
