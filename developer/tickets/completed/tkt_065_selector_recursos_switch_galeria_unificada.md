# TKT-065: Actualización del Selector de Recursos para Imágenes Switch a la Galería Multimedia Unificada por Secciones

## Estado: Completado
**Fecha de Finalización:** 2026-10-28  
**Prioridad:** Media  
**Tipo:** Corrección de Bug / Mejora de UX  
**Alcance:** Frontend (`client/src/EditCardModal.tsx`, `client/src/App.tsx`, `client/src/EditCardModal.css`)  
**Versión Objetivo:** `v2.261028.1`  

---

## 1. Descripción del Problema

Con la implementación de **SRS-094** (*Galería Multimedia Unificada con Galerías al Mismo Nivel: Plantilla, Por Defecto, Personalizadas y Usuario*), la gestión de recursos de imagen de la aplicación pasó a organizarse mediante una barra de pestañas horizontal unificada (`.gallery-tabs-row`) que expone todas las carpetas del proyecto y la galería de la plantilla.

Sin embargo, al editar una carta en `EditCardModal`:
1. Al acceder a la configuración de una capa de tipo **Imagen Switch (`image-switch`)** y pulsar *"⚙️ Seleccionar recursos"*, el modal emergente (`showSwitchResourcesPopup`) continúa utilizando el diseño antiguo y monolítico de dos únicas pestañas fijas (*"Imágenes del Proyecto"* y *"Galería de Usuario"*).
2. No se muestran las carpetas personalizadas de proyecto (`assetFolders`, ej. *"Personajes"*, *"Fondos"*, etc.) ni la galería propia de la plantilla (`templateAssets`).
3. Esto impide a los diseñadores organizar sus opciones de switch aprovechando las categorías creadas en el proyecto, provocando inconsistencia visual y funcional con el resto de la suite.
4. Adicionalmente, el selector individual de imagen de capa estándar (`showGallerySelector` en `EditCardModal`) padece de la misma desactualización, debiendo unificarse bajo la misma arquitectura de navegación por pestañas.

---

## 2. Causas Identificadas

1. **Falta de paso de props desde `App.tsx`**:
   - `App.tsx` no pasa `assetFolders` ni `templateAssets` a `<EditCardModal />`, por lo que el modal de edición de carta no tiene conocimiento del árbol completo de carpetas multimedia ni de las imágenes de la plantilla.

2. **Estructura estática y diseño estrecho en `EditCardModal.tsx`**:
   - El estado `switchSelectorTab` está tipado estrictamente como `"project" | "user"` en lugar de `string` para soportar `template`, `Por Defecto`, `user` y cualquier carpeta dinámica.
   - El contenedor modal usa `.gallery-popup-container` en lugar del layout ampliado `.gallery-popup-container.multimedia-gallery-wide`.
   - El renderizado de pestañas está implementado con botones inline arcaicos en lugar del estándar `.gallery-tabs-row` y `.gallery-tab-btn`.
   - La resolución de IDs al pulsar *"Guardar"* en el switch (`allAssets`) solo fusiona `projectAssets` y `userAssets`, ignorando `templateAssets`.

---

## 3. Solución Propuesta

1. **Actualización de Props en `App.tsx` y `EditCardModalProps`**:
   - Añadir `assetFolders?: string[]` y `templateAssets?: any[]` a `EditCardModalProps`.
   - Pasar `assetFolders={assetFolders}` y `templateAssets={templateAssets}` en la instanciación de `<EditCardModal />` en `App.tsx`.

2. **Modernización de `showSwitchResourcesPopup` en `EditCardModal.tsx`**:
   - Cambiar `switchSelectorTab` a tipo `string` (valor por defecto: `"Por Defecto"` o `"template"` si tiene imágenes).
   - Aplicar la clase `.multimedia-gallery-wide` al contenedor del modal.
   - Renderizar la barra unificada de pestañas horizontales (`.gallery-tabs-row`):
     - 📄 **Galería de la Plantilla** (`template`) con contador `templateAssets.length`.
     - 📦 **Por Defecto** con contador de assets generales del proyecto (`folder === "Por Defecto"` o indefinido).
     - 📁 **Galerías Personalizadas** (`assetFolders` filtrando las distintas a *"Por Defecto"*) con sus contadores.
     - 👤 **Galería de Usuario** (`user`) con contador `userAssets.length`.
   - El grid filtrará los recursos según la pestaña activa, manteniendo intacta la selección múltiple persistente (`tempSelectedOptionIds`) con checkboxes.
   - Al guardar, resolver los assets seleccionados combinando `templateAssets`, `projectAssets` y `userAssets`.

3. **Modernización de `showGallerySelector` (Selector Individual de Capa Imagen)**:
   - Aplicar la misma barra de pestañas `.gallery-tabs-row` al selector individual de imágenes de capa para una experiencia homogénea en todo el editor.

4. **Pruebas Automatizadas**:
   - Crear suite de pruebas de regresión y verificación para comprobar que el popup de selección de switch y de imagen individual renderizan las pestañas de carpetas y permiten seleccionar recursos de carpetas personalizadas.

---

## 4. Criterios de Aceptación y Verificación

1. Al pulsar *"⚙️ Seleccionar recursos"* en una capa `image-switch` dentro de `EditCardModal`, el modal se abre en formato ancho (`multimedia-gallery-wide`) con las pestañas completas: *Plantilla*, *Por Defecto*, carpetas personalizadas del proyecto y *Galería de Usuario*.
2. El usuario puede navegar libremente entre las carpetas y marcar/desmarcar imágenes con checkbox, conservando la selección acumulada.
3. Al pulsar *"Guardar"*, las imágenes seleccionadas de cualquier carpeta o galería se asignan correctamente a la propiedad `options` de la capa switch.
4. El selector individual de imagen de capa (`📂 Cargar desde Galería`) también muestra la navegación unificada por carpetas.
5. Todas las pruebas del proyecto (`npm test`) y la compilación (`npm run client:build`) se completan con 0 errores.
