# Ticket - TKT-041: Indexación Automática en Galería de Usuario al Subir Imágenes

- **ID del Ticket**: TKT-041
- **Estado**: 🟢 Completado
- **Fecha de Registro**: 2026-07-19
- **Fecha de Resolución**: 2026-07-19
- **Severidad**: Alta (Afecta directamente la experiencia del usuario y eficiencia de almacenamiento)

---

## 1. Descripción del Problema
Cuando un usuario sube una nueva imagen desde su explorador de archivos local del PC para asignarla a una capa de imagen (o reverso), el recurso se carga y se visualiza correctamente en la carta en curso. Sin embargo, esta imagen **no se indexa** en la "Galería de Usuario" (la biblioteca/galería local que permite reutilizar imágenes ya subidas).

Debido a esto, si el usuario desea emplear la misma imagen en diferentes cartas o componentes, se ve obligado a volver a buscar y subir el archivo local cada vez, en lugar de seleccionarla con un solo clic desde la galería de usuario disponible.

- **Objetivo**: Garantizar que cada vez que un usuario suba un recurso de imagen desde su equipo para asociarlo a una capa o propiedad de carta, este recurso se guarde e indexe automáticamente en la lista de assets de la galería de usuario del proyecto, de modo que aparezca como opción reutilizable.

---

## 2. Solución Implementada
1. **Paso de Propiedades en `EditCardModal.tsx`**:
   - Se añadieron `userAssets` (un array de assets locales) y `onAddUserAsset` (función callback) al contrato de props de `EditCardModal`.
   - Se instanció `EditCardModal` en `App.tsx` pasando el estado `userAssets` del componente principal y definiendo la función `onAddUserAsset` para actualizar dicho estado agregando nuevas imágenes. Esto resolvió el problema donde las imágenes subidas desde el editor de cartas no se guardaban en la galería global.

2. **Conversión de Imagen a Base64 y Empaquetado**:
   - En `EditCardModal.tsx`, se reemplazó el uso de `URL.createObjectURL(file)` (que produce enlaces blob volátiles e inválidos entre recargas/sesiones) por un lector `FileReader` que convierte el archivo cargado a Base64 de forma asíncrona.
   - Al finalizar la lectura, se invoca `onAddUserAsset(name, base64)` para indexar y persistir la imagen en la galería del usuario.
   - Se modificó `generarProyectoZip` en `App.tsx` para empaquetar imágenes que comiencen con `"data:"` (Base64) en el ZIP físico del proyecto, reemplazándolas por el esquema `user_asset://`. Esto evita que las imágenes de la galería del usuario queden como texto crudo base64 gigante en el archivo del proyecto y fallen al cargarse.

3. **Pestañas de Selección en Modales**:
   - Se añadió la pestaña `"Galería de Usuario (Subidas PC)"` tanto en el modal selector de recursos general como en el modal de selección de recursos para capas `Switch`.
   - Esto permite que cualquier imagen subida localmente por el usuario esté inmediatamente disponible para su reutilización con un solo clic.

4. **Resolución en el Servidor Backend**:
   - Se añadió soporte al resolutor de recursos del backend (`server/src/index.ts` y `server/src/debug_html.ts`) para interpretar el esquema `user_asset://` y resolverlo a la carpeta temporal local donde Puppeteer compila los recursos del PDF. Esto solventa el error donde las imágenes de usuario se mostraban vacías o rotas al generar el PDF.

---

## 3. Archivos Implicados
- [`client/src/EditCardModal.tsx`](file:///c:/Users/victo/proyectos/cdc2/client/src/EditCardModal.tsx): Lógica de carga de archivos de imagen desde el inspector de capas.
- [`client/src/App.tsx`](file:///c:/Users/victo/proyectos/cdc2/client/src/App.tsx): Gestión de la galería del proyecto, assets globales, empaquetado del archivo ZIP de exportación.
- [`server/src/index.ts`](file:///c:/Users/victo/proyectos/cdc2/server/src/index.ts): Resolutor de esquemas de imágenes para la generación del PDF físico.
- [`server/src/debug_html.ts`](file:///c:/Users/victo/proyectos/cdc2/server/src/debug_html.ts): Resolutor de imágenes para el depurador HTML del servidor.

---

## 4. Plan de Verificación y Criterios de Aceptación
- [x] Subir una imagen local de prueba desde el PC para asignarla a una capa de tipo Imagen en una carta.
- [x] Comprobar que la imagen se renderiza correctamente en el lienzo.
- [x] Abrir la Galería del Proyecto / Galería de Usuario y verificar que la imagen subida ahora se muestra indexada y listada.
- [x] Crear una segunda carta o añadir una nueva capa de imagen y verificar que se puede seleccionar directamente la imagen previamente subida desde la galería sin tener que cargar de nuevo el archivo del equipo.
- [x] Exportar el proyecto a `.cdc2`, volver a cargarlo, y comprobar que las imágenes de la galería del usuario se visualizan y se exportan al PDF final con éxito.
- [x] Validar que el proyecto compila correctamente sin errores de TypeScript o bundler.
