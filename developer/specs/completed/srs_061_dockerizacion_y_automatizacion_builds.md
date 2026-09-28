# Especificación Técnica (SRS-061): Dockerización y Automatización de Construcción Multiplataforma (PC y Raspberry Pi)

## 1. Introducción y Objetivos
- **Propósito**: Permitir la ejecución aislada, portable y reproducible de **Card Deck Crafter v2** (Frontend React/Vite + Backend Express/Puppeteer) en un contenedor Docker unificado, compatible tanto con arquitecturas `x86_64` (PC / Servidores) como `arm64/arm` (Raspberry Pi 3/4/5), y automatizar el ciclo de generación de imágenes tras hitos de desarrollo.
- **Objetivos de Diseño**:
  - **Portabilidad Total**: Levantar el sistema completo en cualquier máquina con un único comando (`docker run` o `npm run docker:run`).
  - **Soporte Chromium/Puppeteer Headless**: Garantizar que el motor de exportación PDF y PNG de Puppeteer cuente con todas las bibliotecas nativas de Linux dentro del contenedor sin fallos de dependencias.
  - **Multi-Arquitectura**: Aprovechar Docker Buildx para generar imágenes compatibles con `linux/amd64` y `linux/arm64` para Raspberry Pi.
  - **Automatización Integrada**: Disponer de scripts en `package.json` para facilitar la construcción, ejecución y publicación voluntaria en Docker Hub (`enacefio/cdc2`), integrándolo en el flujo de trabajo del agente tras cada hito completado.

---

## 2. Requisitos Funcionales y Casos de Uso

### RF-1: Definición de Imagen Dockerfile Unificada
- **Base**: Utilizar `node:20-slim` (Debian base ligera).
- **Dependencias Chromium**: Instalar paquetes esenciales del sistema (`chromium`, `ca-certificates`, `fonts-liberation`, `libnss3`, `libatk-bridge2.0-0`, `libcairo2`, `libpango-1.0-0`, etc.) y configurar las variables de entorno:
  - `PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true`
  - `PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium`
- **Gestión de Workspaces NPM**: Optimizar el cacheo de capas Docker copiando en primer lugar `package.json` raíz y los `package.json` de `client`, `server` y `shared` antes de ejecutar `npm install`.
- **Servicio Concurrente**: Utilizar `concurrently` (o script equivalente) para ejecutar simultáneamente el servidor backend (puerto 3000) y el servidor frontend Vite (puerto 5173).
- **Puertos Expuestos**: `5173` (Frontend) y `3000` (Backend API).

### RF-2: Configuración de Red y Exclusión de Archivos
- **`.dockerignore`**: Excluir `node_modules`, `client/node_modules`, `server/node_modules`, `dist`, `client/dist`, `.git`, `.gitignore`, `.agents`, y archivos temporales para acelerar el contexto de construcción.
- **`client/vite.config.ts`**: Configurar el servidor de Vite con `host: '0.0.0.0'` y `allowedHosts: true` para permitir conexiones desde la red local o desde fuera del contenedor (imprescindible cuando se ejecuta en una Raspberry Pi accesible por IP).

### RF-3: Scripts NPM de Automatización (`package.json`)
Añadir al archivo `package.json` del monorepo los siguientes scripts:
- `docker:build`: Construye la imagen local etiquetada como `cdc2:local` y `enacefio/cdc2:latest`.
- `docker:run`: Levanta el contenedor con mapeo de puertos (`-p 5173:5173 -p 3000:3000`).
- `docker:build:multiarch`: Ejecuta `docker buildx build --platform linux/amd64,linux/arm64` utilizando el builder multiplataforma configurado.
- `docker:push`: Publica las etiquetas correspondientes a Docker Hub (`enacefio/cdc2`).

### RF-4: Protocolo del Asistente tras Hitos
- Al finalizar con éxito cada especificación o ticket y tras recibir la aprobación del usuario antes de commit, o tras el commit, se podrá ejecutar la verificación de construcción de Docker para asegurar que la imagen se mantiene estable y lista para su despliegue en la Raspberry Pi.

---

## 3. Arquitectura y Diseño de Datos

### 3.1. Estructura de Archivos
```
/
├── Dockerfile                   # Definición unificada de la imagen
├── .dockerignore                # Reglas de exclusión de contexto
├── package.json                 # Scripts de orquestación docker:*
├── client/
│   └── vite.config.ts           # Configuración de host 0.0.0.0 y proxy
└── server/
    └── src/index.ts             # Backend escuchando en 0.0.0.0 / puerto 3000
```

### 3.2. Topología de Red Interna del Contenedor
```
[Navegador / Cliente Remoto]
        │
        ├── Port 5173 ──► [Vite Dev Server (host: 0.0.0.0)]
        │                         │  (Proxy /api)
        │                         ▼
        └── Port 3000 ──► [Express API / Puppeteer Server (localhost:3000)]
```

---

## 4. Interfaces de Comandos / NPM Scripts

| Comando NPM | Acción |
| :--- | :--- |
| `npm run docker:build` | `docker build -t cdc2:local -t enacefio/cdc2:latest .` |
| `npm run docker:run` | `docker run -it --rm -p 5173:5173 -p 3000:3000 --name cdc2_app cdc2:local` |
| `npm run docker:build:multiarch` | `docker buildx build --platform linux/amd64,linux/arm64 -t enacefio/cdc2:latest --load .` (o `--push` si se desea subir directamente) |
| `npm run docker:push` | `docker push enacefio/cdc2:latest` |

---

## 5. Estrategia de Verificación (Pruebas)

### 5.1. Pruebas Automatizadas
- Ejecutar la suite de pruebas Vitest existente (`npm run test`) para comprobar que los cambios en `vite.config.ts` o `package.json` no rompen la suite de pruebas.

### 5.2. Pruebas Manuales / Criterios de Aceptación
1. **Construcción de Imagen Local**:
   - Ejecutar `npm run docker:build` y validar que finaliza con código de salida `0` sin errores en las dependencias de Debian o Node.
2. **Ejecución del Contenedor**:
   - Ejecutar `docker run` y acceder desde el navegador local a `http://localhost:5173/`.
   - Comprobar que la aplicación carga correctamente.
3. **Verificación de Puppeteer en Headless Linux**:
   - Generar una exportación de PDF o PNG desde la interfaz en Docker y verificar que Chromium procesa la exportación sin errores de sandbox o librerías faltantes.
