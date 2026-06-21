# Ticket - TKT-001: Corrección de Advertencia de Cierre, Color de Fondo de Plantillas y Exportación Vectorial a PDF

- **ID del Ticket**: TKT-001
- **Estado**: ✅ Completado
- **Fecha de Registro**: 2026-06-21
- **Fecha de Resolución**: 2026-06-21
- **Severidad**: Media-Alta (Afecta a la experiencia de usuario al guardar y a la funcionalidad básica de impresión en PDF)

---

## Resolución y Verificación

1. **Robustez en `isDirty`**: Se eliminó el `useEffect` global con dependencias asíncronas y se encapsuló en wrappers sobre los setters del useState (`setCanvasConfig`, `setCardConfig`, `setGenerarReversos`, `setImagenTraseraComun`, `setCartas`). Estos wrappers marcan automáticamente `isDirty = true` al realizar cualquier acción desde la UI. En los flujos de `handleCargarProyecto` y `handleNuevoProyecto` se usan los setters internos (`Internal`) sin alterar el flag `isDirty`. Al finalizar con éxito la carga, el reinicio o la exportación, `isDirty` se establece explícitamente a `false`.
2. **Restauración del Color de Fondo**: Se validó el flujo de carga y se garantizó la persistencia y lectura de `capasOverrides` en el cliente.
3. **Exportación Vectorial de Plantillas a PDF**: Se modificó `generarProyectoZip` en el cliente para inyectar `proyecto.templates` en el JSON. En el backend (`server/src/index.ts`), se adaptó `generarHtmlImpresion` para interceptar slots de plantilla y renderizar dinámicamente sus capas de fondo y texto utilizando HTML/CSS en milímetros. Esto produce PDF vectoriales perfectos en Puppeteer respetando el sangrado de forma milimétrica.
4. **Verificación**: Las pruebas unitarias pasaron y el cliente compila en producción sin errores en 139ms.

---

## 1. Problemas Identificados

### 1.1. Inconsistencia en la Advertencia de Cambios sin Guardar (Aviso al Cerrar/Actualizar)
- **Síntoma**: El aviso `beforeunload` se activa a veces de forma errónea al cargar proyectos o iniciar proyectos limpios, o no responde adecuadamente debido a condiciones de carrera con el `useEffect` reactivo de React.
- **Causa**: El tracking de `isDirty` en [`App.tsx`](file:///c:/Users/victo/proyectos/cdc2/client/src/App.tsx) monitoriza cambios de estados globales agrupados. Dado que la carga es asíncrona, múltiples renders intermedios consumen el ref `skipNextDirtyRef` antes de tiempo, marcando el proyecto como "modificado" erróneamente.

### 1.2. Pérdida del Color de Fondo de las Cartas de Plantilla al Cargar Proyecto
- **Síntoma**: El color de fondo personalizado de las cartas creadas a partir de plantillas vuelve a aparecer en blanco al cargar un archivo `.cdc2` exportado.
- **Causa**: Se necesita verificar el correcto flujo de restauración de `capasOverrides` desde el archivo JSON del proyecto para asegurar que no sea sobrescrito o descartado por otros flujos de inicialización en el cliente.

### 1.3. Cartas de Plantilla salen en Blanco en el PDF Exportado
- **Síntoma**: Al hacer clic en "Exportar PDF", las cartas basadas en plantillas se renderizan completamente vacías en el documento PDF generado por el servidor.
- **Causa**: El servidor de exportación Puppeteer (`server/src/index.ts`) calcula la maquetación física pero solo sabe dibujar fondos físicos a partir de imágenes en el slot (`imagenSrc`). Como las cartas de plantilla son dinámicas y se renderizan por HTML/CSS en el frontend, el servidor no dispone de los datos de la plantilla ni de lógica de renderizado vectorial de capas.

---

## 2. Solución Propuesta

1. **Gestión determinista de `isDirty`**: Eliminar el hook reactivo y forzar la asignación de `isDirty = true` directamente desde las acciones mutadoras iniciadas por el usuario (UI).
2. **Asegurar restauración de `capasOverrides`**: Auditar y certificar la carga de los overrides en el cliente.
3. **Renderizado de Plantillas en el PDF (Puppeteer)**:
   - Modificar la exportación en el cliente para adjuntar el mapa de plantillas utilizadas en el campo `proyecto.templates` dentro del ZIP `.cdc2`.
   - Modificar el backend para interpretar `proyecto.templates` y renderizar vectorialmente en HTML (Puppeteer) cada capa de fondo y de texto con sus respectivos textos, colores y anulaciones de diseño.

---

## 3. Plan de Verificación

- **Prueba Manual 1**: Verificar que al abrir o reiniciar el proyecto la app esté limpia y no alerte al cerrar. Realizar cambios y comprobar que alerta. Guardar y verificar que el aviso se desactiva.
- **Prueba Manual 2**: Guardar un proyecto con fondos de plantilla de colores y verificar que se carga manteniendo el color de fondo exacto.
- **Prueba Manual 3**: Exportar el PDF de una baraja con plantillas personalizadas de color y texto dinámico, y comprobar la fidelidad visual y resolución vectorial en el documento PDF resultante.
