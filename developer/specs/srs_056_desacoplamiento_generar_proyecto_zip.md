# Especificación Técnica - SRS-056: Desacoplamiento de `generarProyectoZip` de `App.tsx`

- **ID del Requerimiento**: SRS-056
- **Módulo**: Arquitectura Client / Servicios de Exportación y Persistencia (`client/src/services`)
- **Estado**: 🔴 Activo (Pendiente de Planificación)
- **Fecha de Registro**: 2026-08-04

---

## 1. Introducción y Objetivos
Actualmente, la función `generarProyectoZip` se encuentra definida directamente dentro del componente principal `App.tsx`. Dado que realiza múltiples tareas complejas (extracción de blobs, empaquetado de assets de usuario, proyecto y símbolos, reemplazo de URIs a esquemas `user_asset://`, `project_asset://`, `symbol_asset://` y `asset://`, y serialización en formato `.cdc2`), contribuye a la sobrecarga de líneas y responsabilidades en `App.tsx`.

- **Objetivo**: Extraer y refactorizar la lógica de serialización y generación de ZIPs de proyectos a un servicio o utilidad independiente en la capa de cliente (ej. `client/src/services/projectZipService.ts`), mejorando la modularidad, mantenibilidad y facilitando las pruebas unitarias aisladas.

---

## 2. Requisitos Funcionales y de Arquitectura

- **RF-1: Creación del Servicio de Serialización de Proyectos**:
  - Crear el módulo `client/src/services/projectZipService.ts` (o `client/src/utils/zipUtils.ts`).
  - Definir la función pura o servicio `generarProyectoZip(params)` que reciba el estado necesario del proyecto (documentos, plantillas, assets del proyecto, assets del usuario, símbolos, fuentes personalizadas, etc.).

- **RF-2: Preservación del Comportamiento**:
  - Mantener exactamente el mismo esquema de empaquetado ZIP (`assets/`, `project_assets/`, `user_assets/`, `symbols/`, `templates/`, `project.json`).
  - Conservar sin alteraciones el tratamiento de las URIs `asset://`, `user_asset://`, `project_asset://` y `symbol_asset://`.

- **RF-3: Integración en `App.tsx`**:
  - Sustituir la definición inline de `generarProyectoZip` en `App.tsx` por la llamada al nuevo servicio extraído.

---

## 3. Archivos Implicados
- [`client/src/services/projectZipService.ts`](file:///c:/Users/victo/proyectos/cdc2/client/src/services/projectZipService.ts): Nuevo servicio de serialización ZIP.
- [`client/src/App.tsx`](file:///c:/Users/victo/proyectos/cdc2/client/src/App.tsx): Refactorización para consumir el nuevo servicio.

---

## 4. Plan de Verificación y Criterios de Aceptación
- [ ] La función `generarProyectoZip` opera desde el nuevo servicio aislado sin depender del estado interno de `App.tsx`.
- [ ] Exportación a PDF, PNG y Guardar Proyecto funcionan exactamente igual que antes.
- [ ] Ejecución exitosa de la suite completa de pruebas unitarias (`npm run test`).
