# Ticket - TKT-047: Imágenes Traseras en Blanco al Exportar PDF con Archivos Locales (JPG/PNG)

- **ID del Ticket**: TKT-047
- **Estado**: 🔴 Activo (Pendiente)
- **Fecha de Registro**: 2026-08-01
- **Severidad**: Alta (Fallo funcional en exportación de PDF de impresión)

---

## 1. Descripción del Problema
Al maquetar cartas cargando imágenes directamente en la cara delantera y posteriormente asignar imágenes a la cara trasera mediante importación de archivos de imagen locales (JPG o PNG desde el PC):
- En la interfaz web y en la vista previa del editor, las caras traseras parecen mostrar la imagen correctamente.
- Sin embargo, al generar y descargar el archivo PDF para impresión, las caras traseras no renderizan el arte de la imagen y aparecen completamente en blanco.

---

## 2. Diagnóstico Preliminar
- El motor de exportación a PDF (Puppeteer en el backend) recibe el estado del proyecto con los datos de las cartas e imágenes.
- Es posible que los datos/rutas de las imágenes locales en las caras traseras (`capasOverridesTrasera` o resolución de URLs blob/base64 de la galería de usuario) no se estén serializando, incrustando o convirtiendo a Data URIs correctamente antes de enviar el HTML al generador de PDF.

---

## 3. Archivos Implicados (A Investigar)
- [`client/src/App.tsx`](file:///c:/Users/victo/proyectos/cdc2/client/src/App.tsx): Generación de la payload del proyecto para exportación a PDF.
- [`server/src/index.ts`](file:///c:/Users/victo/proyectos/cdc2/server/src/index.ts): Procesamiento del HTML/PDF con Puppeteer.
- [`client/src/utils/projectUtils.ts`](file:///c:/Users/victo/proyectos/cdc2/client/src/utils/projectUtils.ts): Procesamiento y resolución de recursos de imágenes del usuario.

---

## 4. Plan de Verificación y Criterios de Aceptación
- [ ] Asignar imágenes locales (JPG/PNG) a las caras delanteras y traseras de las cartas.
- [ ] Exportar el proyecto a PDF desde el botón de la barra superior.
- [ ] Verificar que en el PDF generado las imágenes de las caras traseras se muestran correctamente con la misma fidelidad que en la vista previa web.
- [ ] Verificar mediante tests de Vitest la correcta conversión y presencia de `capasOverridesTrasera` en el payload de exportación.
