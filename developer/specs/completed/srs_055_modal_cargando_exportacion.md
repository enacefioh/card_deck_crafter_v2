# Especificación Técnica - SRS-055: Modal de Carga Bloqueante Durante Exportaciones (PDF y PNG)

- **ID del Requerimiento**: SRS-055
- **Módulo**: Interfaz de Usuario / Barra Superior (`MenuBar` y `App`)
- **Estado**: 🟢 Completado
- **Fecha de Registro**: 2026-08-01
- **Fecha de Resolución**: 2026-08-01

---

## 1. Introducción y Objetivos
Actualmente, al hacer clic en "Exportar PDF" o "Exportar PNG", las funciones asíncronas se ejecutaban en segundo plano mientras el usuario podía seguir interactuando con el editor, lo que podía provocar clics duplicados o desorden en el canvas durante la generación de archivos pesados.

- **Objetivo**: Implementar un modal flotante bloqueante sobre un fondo oscuro (backdrop) con spinner de carga animado y mensaje informativo ("Preparando la descarga...", "Generando archivo PDF...", etc.) que capture los eventos para evitar la interacción con el editor durante el proceso de exportación y se cierre automáticamente al iniciar la descarga.

---

## 2. Requisitos Funcionales Implementados

- **RF-1: Activación del Modal de Carga**:
  - Al hacer clic en "Exportar PDF" o "Exportar PNG (.zip)", se muestra inmediatamente el modal bloqueante.
  - El modal incluye:
    - Fondo translúcido oscuro con desenfoque (`backdrop-filter: blur(8px)`).
    - Contenedor central animado (`.export-loading-modal`).
    - Spinner de carga rotativo animado con resplandor (`.export-loading-spinner`).
    - Mensaje descriptivo del estado actual (*"Generando documento PDF de alta resolución..."* o *"Empaquetando cartas a imágenes PNG..."*).

- **RF-2: Bloqueo de Interacción y Eventos**:
  - El backdrop del modal cubre la pantalla completa (`position: fixed`, `z-index: 10000`) bloqueando la propagación de eventos (`onClick={(e) => e.stopPropagation()}`) hacia el editor.

- **RF-3: Desactivación Automática**:
  - Una vez completada la generación del archivo (tras disparar la descarga directa en el navegador) o en caso de error, el modal se cierra automáticamente en el bloque `finally` restableciendo el acceso completo al editor.

---

## 3. Archivos Implicados
- [`client/src/App.tsx`](file:///c:/Users/victo/proyectos/cdc2/client/src/App.tsx): Renderización del modal de carga al exportar PDF/PNG.
- [`client/src/App.css`](file:///c:/Users/victo/proyectos/cdc2/client/src/App.css): Estilos CSS del modal de carga, backdrop y animación del spinner.
- [`client/src/MenuBar.tsx`](file:///c:/Users/victo/proyectos/cdc2/client/src/MenuBar.tsx): Incremento de versión a `v2.260801.3`.

---

## 4. Criterios de Aceptación
- [x] Al exportar a PDF o PNG, aparece el modal bloqueante sobre fondo oscuro con spinner animado.
- [x] Intentar hacer clic en el lienzo o botones del menú mientras carga no produce ninguna acción en el editor.
- [x] Al iniciarse la descarga del navegador, el modal desaparece permitiendo continuar trabajando.
- [x] Si ocurre un error, el modal se cierra y muestra el mensaje de error correspondiente.
