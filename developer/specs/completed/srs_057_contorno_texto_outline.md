# Especificación Técnica - SRS-057: Contorno de Texto (Text Outline / Stroke)

- **ID del Requerimiento**: SRS-057
- **Módulo**: Inspector de Propiedades, Lienzo de Maquetación y Renderizador de Exportación (`client` y `server`)
- **Estado**: 🟢 Completado
- **Fecha de Registro**: 2026-08-04
- **Fecha de Resolución**: 2026-08-04

---

## 1. Introducción y Objetivos
Al maquetar cartas para impresión, a menudo es necesario aplicar un borde o contorno visual (*stroke / outline*) alrededor de los caracteres de texto para garantizar su legibilidad sobre fondos complejos o ilustraciones con contrastes variados.

- **Objetivo**: Añadir la propiedad **Text Outline** (Contorno de Texto) a las capas de tipo `text`, editable en el inspector de propiedades inmediatamente después de los controles de alineación. Esta propiedad consta de grosor/tamaño de contorno (en píxeles, por defecto `0`) y color del contorno (por defecto `#000000`).

---

## 2. Requisitos Funcionales Implementados

- **RF-1: Extensión del Modelo de Datos (`Carta` / `Capa`)**:
  - Extendido `capasOverrides` y `capasOverridesTrasera` en `shared/layoutEngine.ts` con:
    - `textOutlineWidth?: number;` (Grosor del contorno en px, valor por defecto `0`).
    - `textOutlineColor?: string;` (Color hexadecimal/RGB del contorno, valor por defecto `#000000`).

- **RF-2: Inspector de Propiedades (`EditCardModal` y Panel Lateral de `App.tsx`)**:
  - En la sección de propiedades de capa de texto, justo después de los botones de alineación, se ha incluido el grupo **Contorno de Texto (Text Outline)** con controles de grosor y color.
  - Registradas las propiedades `textOutlineWidth` y `textOutlineColor` en la lista de propiedades exponibles (`exposedProperties`).

- **RF-3: Visualización en Tiempo Real y Exportación PDF/PNG**:
  - Aplicadas las reglas CSS equivalentes a `-webkit-text-stroke` (`-webkit-text-stroke-width`, `-webkit-text-stroke-color` y `paint-order: stroke fill`) tanto en el editor de carta interactivo (`EditCardModal.tsx`), como en el lienzo de la hoja principal (`App.tsx`) y en el renderizador de PDF de Puppeteer (`server/src/index.ts`).

---

## 3. Archivos Implicados
- [`shared/layoutEngine.ts`](file:///c:/Users/victo/proyectos/cdc2/shared/layoutEngine.ts): Extensión del modelo de datos para soportes de stroke de texto.
- [`client/src/App.tsx`](file:///c:/Users/victo/proyectos/cdc2/client/src/App.tsx): Aplicación de contorno de texto en el lienzo principal de la hoja.
- [`client/src/EditCardModal.tsx`](file:///c:/Users/victo/proyectos/cdc2/client/src/EditCardModal.tsx): Inspector de propiedades y vista previa del editor de carta.
- [`server/src/index.ts`](file:///c:/Users/victo/proyectos/cdc2/server/src/index.ts): Inyección de reglas CSS `-webkit-text-stroke` en la plantilla HTML para exportación PDF en Puppeteer.
- [`client/src/MenuBar.tsx`](file:///c:/Users/victo/proyectos/cdc2/client/src/MenuBar.tsx): Incremento de versión a `v2.260804.2`.

---

## 4. Criterios de Aceptación
- [x] En el inspector de texto, aparece el grupo **Contorno de Texto (Text Outline)** con controles de grosor y color justo después de la alineación.
- [x] Ajustar el grosor a mayor que 0 aplica en tiempo real el borde de color seleccionado alrededor de las letras en el editor y en la hoja principal.
- [x] Al exportar a PDF, Puppeteer renderiza el contorno de texto con la misma fidelidad que en pantalla.
- [x] La suite completa de tests de Vitest (`npm run test`) pasa limpiamente.
