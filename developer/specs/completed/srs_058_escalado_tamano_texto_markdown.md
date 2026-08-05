# Especificación Técnica - SRS-058: Escalado de Tamaño de Texto Inline mediante Sintaxis `++`

- **ID del Requerimiento**: SRS-058
- **Módulo**: Parser de Formato de Texto (`projectUtils.ts`), Ayudante de Formato UI (ℹ️), Lienzo y Exportaciones (`client` y `server`)
- **Estado**: 🟢 Completado
- **Fecha de Registro**: 2026-08-05
- **Fecha de Resolución**: 2026-08-05

---

## 1. Introducción y Objetivos
Para evitar colisiones con signos de más aislados en textos convencionales (ej. `+5 Fuerza` o `1+1`), se establece que la sintaxis de tamaño de texto inline requerirá como mínimo dos signos `++` para activar el primer nivel de escalado (+25%). Cada signo adicional agregará un nivel acumulativo del 25% (`1.25^N`).

Actualmente, el sistema admite marcado básico para negrita (`**`), cursiva (`*`) y subrayado (`_`).

- **Objetivo**: Añadir la sintaxis `++texto++` para aumentar el tamaño de fuente inline al **125%** (Nivel 1), `+++texto+++` al **156.25%** (Nivel 2), y así sucesivamente. Actualizar el parser de Markdown, la ayuda informativa (ℹ️) y garantizar su renderizado uniforme en pantalla y exportaciones (PDF/PNG).

---

## 2. Requisitos Funcionales Implementados

- **RF-1: Regla de Sintaxis y Multiplicador**:
  - Nivel 1 (`++texto++`): **2 signos `+`** -> Multiplicador **125%** (`1.25x`).
    - *Ejemplo*: `"Hola soy ++Edu++ feliz navidad"` -> `"Edu"` se renderiza al 125% respecto al texto base.
  - Nivel 2 (`+++texto+++`): **3 signos `+`** -> Multiplicador acumulativo `1.25 * 1.25` = **156.25%**.
    - *Ejemplo*: `"Hola soy +++Edu+++ feliz navidad"` -> `"Edu"` se renderiza al 156.25%.
  - Nivel N (**K signos `+`** con K >= 2): Multiplicador `1.25^(K - 1)`.
  - Signo aislado (`+5 fuerza`): Se ignora como marca de formato y se renderiza como texto literal normal.

- **RF-2: Parser y Conversión a HTML (`parseMarkdownToHtml`)**:
  - Implementado en `client/src/utils/projectUtils.ts` y en `server/src/index.ts` reemplazo recursivo regex de secuencias de 2 o más `+` (`/(\+{2,})([^+]+)\1/g`) convertidas a `<span style="font-size: X%;">...</span>`.

- **RF-3: Actualización del Tooltip/Modal de Ayuda Informativa (ℹ️)**:
  - Actualizado el tooltip de ayuda en `EditCardModal.tsx` para incluir los ejemplos de la sintaxis `++` (+25%) y `+++` (+56%).

- **RF-4: Renderizado en Lienzo, PNG y PDF**:
  - Se confirmó el renderizado uniforme en lienzo interactivo, modal de edición y exportación a PDF vía Puppeteer.

---

## 3. Archivos Implicados
- [`client/src/utils/projectUtils.ts`](file:///c:/Users/victo/proyectos/cdc2/client/src/utils/projectUtils.ts): Función centralizada `parseMarkdownToHtml` con soporte para sintaxis `++`.
- [`client/src/utils/projectUtils.test.ts`](file:///c:/Users/victo/proyectos/cdc2/client/src/utils/projectUtils.test.ts): Pruebas unitarias para `++`, `+++`, preservación de `+` simples y combinaciones.
- [`client/src/EditCardModal.tsx`](file:///c:/Users/victo/proyectos/cdc2/client/src/EditCardModal.tsx): Actualización del tooltip informativo ℹ️ y consumo de `parseMarkdownToHtml` centralizado.
- [`client/src/App.tsx`](file:///c:/Users/victo/proyectos/cdc2/client/src/App.tsx): Reemplazo de parser duplicado por la utilidad centralizada.
- [`client/src/DetailModal.tsx`](file:///c:/Users/victo/proyectos/cdc2/client/src/DetailModal.tsx): Reemplazo de parser duplicado por la utilidad centralizada.
- [`server/src/index.ts`](file:///c:/Users/victo/proyectos/cdc2/server/src/index.ts): Inyección de la regla en `parseMarkdownToHtml` de servidor para exportación PDF en Puppeteer.
- [`client/src/MenuBar.tsx`](file:///c:/Users/victo/proyectos/cdc2/client/src/MenuBar.tsx): Incremento de versión a `v2.260805.1`.

---

## 4. Criterios de Aceptación
- [x] `+texto+` (un solo `+`) NO cambia el tamaño de fuente y se muestra como texto plano literal.
- [x] `++texto++` (dos `+`) convierte el texto a `<span style="font-size: 125%;">...</span>`.
- [x] `+++texto+++` (tres `+`) convierte el texto al 156.25%.
- [x] El botón ℹ️ muestra los ejemplos claros de la sintaxis `++` para orientar a los maquetadores.
- [x] Los textos agrandados se visualizan idénticos en lienzo principal, modal y PDF exportado.
- [x] El 100% de la suite de Vitest (`npm run test`) pasa limpiamente (81 tests pasando).
