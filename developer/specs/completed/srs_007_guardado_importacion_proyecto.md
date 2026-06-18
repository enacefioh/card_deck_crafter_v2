# Especificación Técnica - SRS-007: Guardado e Importación de Proyectos (.cdc2)

## 1. Introducción y Objetivos
- **Módulo**: Gestor de Persistencia Local de Proyectos (Client-Side Storage & Portability).
- **Propósito**: Permitir al usuario descargar su proyecto actual completo (configuraciones, cartas, imágenes y cantidades) en un único archivo comprimido con extensión `.cdc2`. Así mismo, permitir subir un archivo `.cdc2` guardado previamente para continuar editándolo sin depender de servidores o bases de datos externas.
- **Objetivos de Diseño**:
  - **Ejecución Local**: Todo el proceso de compresión (guardado) y descompresión (carga) debe ocurrir localmente en el navegador del cliente mediante `JSZip`, reduciendo la carga del servidor y garantizando privacidad y velocidad.
  - **Integridad y Limpieza**: Garantizar que al cargar un proyecto se liberen los recursos de memoria previos (`URL.revokeObjectURL`) para evitar fugas de memoria (memory leaks) con los blobs de imágenes antiguas.
  - **Retrocompatibilidad**: Mantener total compatibilidad de estructura con la carpeta temporal que recibe el exportador de PDF en el servidor.

---

## 2. Requisitos Funcionales y Casos de Uso

### RF-1: Guardado de Proyecto (Exportar `.cdc2`)
- **RF-1.1**: El usuario debe poder exportar su estado actual haciendo clic en un botón "Guardar Proyecto" (`#btn-guardar-proyecto`).
- **RF-1.2**: El sistema recopilará todas las imágenes cargadas en la sesión actual (frontal, trasera, trasera común) y las empaquetará dentro del archivo ZIP en una carpeta `assets/` con nombres únicos generados (por ejemplo, `assets/frontal_<id>.png`).
- **RF-1.3**: El archivo `project.json` contendrá las configuraciones del lienzo, de la carta y el listado de cartas con las rutas relativas apuntando a la carpeta `assets/` interna.
- **RF-1.4**: El archivo ZIP resultante se descargará automáticamente con el nombre `proyecto_cdc2_<timestamp>.cdc2`.

### RF-2: Importación de Proyecto (Cargar `.cdc2`)
- **RF-2.1**: El usuario debe poder cargar un proyecto previo mediante un botón "Cargar Proyecto" o arrastrando un archivo `.cdc2` sobre el lienzo o el panel lateral.
- **RF-2.2**: El sistema descomprimirá el ZIP, leerá y validará el archivo `project.json`.
- **RF-2.3**: Para cada imagen almacenada en la carpeta `assets/` del ZIP que sea referenciada en `project.json`, el sistema extraerá su contenido binario (Blob) y creará un objeto de URL local del navegador (`URL.createObjectURL(blob)`).
- **RF-2.4**: Se reconstruirá el estado de la aplicación React con los nuevos datos (`canvasConfig`, `cardConfig`, `cartas` actualizadas con las nuevas URLs locales, etc.).
- **RF-2.5**: **Limpieza de Recursos**: Antes de aplicar el nuevo estado, se debe invocar `URL.revokeObjectURL()` para todas las imágenes de cartas del proyecto que estaba cargado anteriormente, evitando colapsar la memoria del navegador.

---

## 3. Arquitectura y Diseño de Datos

El flujo de descompresión y mapeado de imágenes se detalla a continuación:

```
[ Archivo .cdc2 ] 
       │
       ▼ (JSZip)
  Extraer "project.json" ──► Cargar configuraciones del lienzo y carta
       │
       ▼
  Recorrer "assets/" ──► Leer archivos como Blobs ──► URL.createObjectURL(blob)
       │
       ▼
  Reemplazar rutas relativas (ej. "assets/frontal_1.png") con "blob:http://..."
       │
       ▼
  Actualizar estado `cartas` y renderizar previsualización
```

---

## 4. Interfaz de Usuario (UI)
- Se añadirán dos botones en la cabecera del panel lateral (Sidebar Header):
  - **Guardar Proyecto**: Icono de disco 💾 con tooltip "Guardar proyecto local (.cdc2)".
  - **Cargar Proyecto**: Icono de carpeta 📂 con tooltip "Cargar proyecto (.cdc2)". Este botón disparará un input oculto `<input type="file" accept=".cdc2" />`.

---

## 5. Estrategia de Verificación (Pruebas)

### 5.1. Pruebas Unitarias Automatizadas (Vitest)
1. **Validación de Estructura de Proyecto**:
   - Verificar que un objeto de proyecto exportado cumple con el esquema básico de `ProyectoCDC2` (propiedades requeridas presentes).

### 5.2. Pruebas Manuales (Checklist de Aceptación)
- [ ] Cargar 3 imágenes frontales en la aplicación, configurar una trasera común y modificar las dimensiones a A3 horizontal.
- [ ] Hacer clic en "Guardar Proyecto". Verificar que se descarga el archivo con extensión `.cdc2`.
- [ ] Renombrar el archivo a `.zip` y extraerlo manualmente. Comprobar que contiene el `project.json` y la carpeta `assets/` con las 4 imágenes correctas.
- [ ] Recargar la pestaña del navegador para limpiar la memoria (el lienzo quedará vacío).
- [ ] Hacer clic en "Cargar Proyecto" y seleccionar el archivo descargado.
- [ ] Confirmar que el lienzo se reconfigura a A3 horizontal, que se muestran las 3 cartas con sus imágenes frontales correspondientes y que la trasera común se recupera correctamente.
- [ ] Modificar una cantidad en las cartas cargadas y exportar a PDF para asegurar que el backend de Puppeteer procesa la baraja importada sin fallos de ruta.
