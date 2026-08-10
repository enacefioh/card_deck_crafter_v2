# Especificación Técnica - SRS-060: Integración de Google Analytics 4 mediante Configuración de Servidor (`config.json`)

- **ID del Requerimiento**: SRS-060
- **Módulo**: Servidor Backend (`server`), Configuración y Cliente Frontend (`client`)
- **Estado**: 🟢 Completado
- **Fecha de Registro**: 2026-08-11
- **Fecha de Resolución**: 2026-08-11

---

## 1. Introducción y Objetivos
Para monitorizar el uso de la aplicación en entornos de producción (origen de los usuarios, sesiones, páginas vistas y eventos clave como exportaciones de proyectos), se requiere integrar Google Analytics 4 (GA4).

Para prevenir la exposición pública de IDs de seguimiento privados en repositorios públicos de GitHub y mantener la configuración persistente durante despliegues automatizados (`git pull` / CI/CD):
- **Objetivo 1**: Implementada la arquitectura de configuración en el servidor mediante `server/config.json` (con plantilla segura `server/config.sample.json` versionada en Git y `config.json` ignorado por `.gitignore`).
- **Objetivo 2**: Creado el endpoint `/api/config` en el servidor backend que expone las configuraciones públicas del entorno al cliente frontend.
- **Objetivo 3**: Inyección dinámica de la etiqueta de seguimiento de Google Tag (`gtag.js`) en el cliente frontend únicamente si se configura un ID de medición válido (`G-XXXXXXXXXX`).
- **Objetivo 4**: Registrados los eventos clave de interacción del usuario (`export_pdf`, `export_zip`).

---

## 2. Requisitos Funcionales Implementados

- **RF-1: Plantilla y Archivo de Configuración de Servidor**:
  - Creado `server/config.sample.json` en el repositorio.
  - Incluido `server/config.json` en `.gitignore`.
- **RF-2: Endpoint de Configuración Pública Backend (`GET /api/config`)**:
  - Creado el endpoint GET `/api/config` que expone `googleAnalyticsId`.
- **RF-3: Inyección Dinámica e Inicialización de GA4 en Frontend**:
  - Implementado `client/src/utils/analytics.ts` consumiendo `/api/config` e inyectando `gtag.js`.
- **RF-4: Tracking de Eventos Clave de la Aplicación**:
  - Añadido el registro de eventos `export_pdf` y `export_zip` en `App.tsx`.

---

## 3. Archivos Implicados
- [`server/config.sample.json`](file:///c:/Users/victo/proyectos/cdc2/server/config.sample.json): Plantilla de configuración pública versionada en Git.
- [`.gitignore`](file:///c:/Users/victo/proyectos/cdc2/.gitignore): Adición de `server/config.json`.
- [`server/src/index.ts`](file:///c:/Users/victo/proyectos/cdc2/server/src/index.ts): Lectura de `config.json` y creación del endpoint `/api/config`.
- [`client/src/utils/analytics.ts`](file:///c:/Users/victo/proyectos/cdc2/client/src/utils/analytics.ts): Módulo cliente para inicializar GA4 e inyectar `gtag.js`.
- [`client/src/utils/analytics.test.ts`](file:///c:/Users/victo/proyectos/cdc2/client/src/utils/analytics.test.ts): Pruebas unitarias para validar GA4.
- [`client/src/App.tsx`](file:///c:/Users/victo/proyectos/cdc2/client/src/App.tsx): Inicialización y eventos de exportación.
- [`client/src/MenuBar.tsx`](file:///c:/Users/victo/proyectos/cdc2/client/src/MenuBar.tsx): Incremento de versión a `v2.260811.1`.

---

## 4. Criterios de Aceptación
- [x] Existe `server/config.sample.json` en el proyecto y `server/config.json` está en `.gitignore`.
- [x] Si `config.json` contiene un ID de GA4 real (`"G-1234567890"`), la etiqueta `gtag.js` se inyecta dinámicamente al cargar la app web.
- [x] Si `config.json` no tiene ID o está vacío, no se realiza ninguna petición externa a Google y la aplicación funciona 100% normal.
- [x] Los eventos principales (`export_pdf`, `export_zip`) envían métricas a GA4 cuando está activo.
- [x] La suite de 84 tests de Vitest pasa limpiamente al 100%.
