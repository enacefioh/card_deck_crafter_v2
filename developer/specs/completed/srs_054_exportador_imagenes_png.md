# Especificación Técnica - SRS-054: Exportación de Cartas a Imágenes PNG en Archivo ZIP

## 1. Introducción y Objetivos
- **Módulo**: Backend (`server/src/index.ts`) y Frontend (`client/src/MenuBar.tsx` y `client/src/App.tsx`).
- **Propósito**: Permitir la exportación masiva de todas las cartas de todos los documentos del proyecto en formato de imágenes independientes PNG empacadas dentro de un archivo comprimido ZIP.
- **Objetivos de Diseño**:
  - **Estructura Organizada**: El archivo `.zip` contendrá una subcarpeta por cada documento del proyecto (`Documento 1`, `Documento 2`, etc.).
  - **Nomenclatura Secuencial Par/Impar**: Cada cara de la carta se nombrará con el patrón `cartaXXX-D.png` (cara delantera) y `cartaXXX-T.png` (cara trasera si aplica), donde `XXX` es un número secuencial formateado a 3 dígitos (`001`, `002`, `003`...). Esto garantiza que al descomprimir y ordenar los archivos por nombre, la delantera y trasera de cada carta queden contiguas.
  - **Calidad de Impresión (300 DPI)**: Las imágenes se renderización rasterizadas exactamente a 300 puntos por pulgada (DPI) basándose en las dimensiones físicas en milímetros del documento e incluyendo el sangrado (`sangradoMm`).
  - **Descarga Fluida**: El proceso se activará desde `Archivo > Exportar Imágenes (PNG)...` en el menú principal, desencadenando la descarga automática del archivo `.zip` en el navegador una vez procesado por Puppeteer en el backend.

---

## 2. Requisitos Funcionales

### RF-1: Opción en el Menú Principal
- En el menú `Archivo` de `MenuBar.tsx`, se añadirá la opción **Exportar Imágenes (PNG)...** situándose inmediatamente después de la opción de exportación PDF.
- Mientras el proceso esté en ejecución, el botón mostrará un indicador visual de carga (`⏳ Exportando imágenes...`) y permanecerá deshabilitado para evitar peticiones duplicadas.

### RF-2: Endpoint Backend `/api/exportar/png`
- Se creará un nuevo endpoint HTTP POST `/api/exportar/png` que aceptará la subida del archivo `.cdc2` (FormData con `archivoProyecto`).
- El backend descomprimirá el proyecto `.cdc2`, cargará las fuentes personalizadas y los recursos/assets locales, y procesará **todos los documentos** incluidos en el objeto `proyecto.documentos`.

### RF-3: Renderizado a Alta Resolución (300 DPI - Tamaño Neto sin Sangrado)
- Puppeteer configurará la página y la captura utilizando un factor de escala de densidad de píxeles `deviceScaleFactor = 3.125` ($\frac{300 \text{ DPI}}{96 \text{ DPI CSS}} = 3.125$).
- Las dimensiones en píxeles de cada captura se calcularán exclusivamente en base al tamaño neto de la carta (`anchoMm` × `altoMm`), **excluyendo el margen de sangrado**:
  $$\text{Ancho (px)} = \text{round}\left( \frac{\text{anchoMm}}{25.4} \times 300 \right)$$
  $$\text{Alto (px)} = \text{round}\left( \frac{\text{altoMm}}{25.4} \times 300 \right)$$
- Cada carta se renderizará de forma individual en el DOM con `overflow: hidden` ajustado al marco neto de corte.

### RF-4: Expansión por Copias (`card.cantidad`) y Estructura del ZIP
- Para cada carta en la lista `cards`, si posee `cantidad > 1`, se expandirán tantas copias independientes como indique su cantidad.
  - Ej: Si la primera carta tiene `cantidad = 2` y la segunda `cantidad = 1`, se generarán `carta001-D.png`, `carta002-D.png` (para la primera carta) y `carta003-D.png` (para la segunda carta).
- **Traseras individuales por copia**: Cada delantera tendrá su correspondiente `cartaXXX-T.png` cuando el documento tenga habilitadas las traseras (incluso si `modoTraseras === 'comun'`, duplicando el reverso común con el índice `cartaXXX-T.png` correspondiente a cada copia física).

El archivo `.zip` de descarga se organizará jerárquicamente de la siguiente forma:

```
[nombre_proyecto]_imagenes.zip
├── Documento_1/
│   ├── info.txt
│   ├── carta001-D.png
│   ├── carta001-T.png
│   ├── carta002-D.png
│   ├── carta002-T.png
│   └── carta003-D.png
└── Documento_2/
    ├── info.txt
    ├── carta001-D.png
    └── carta001-T.png
```

### RF-5: Archivo Informativo `info.txt`
En cada carpeta de documento se incluirá un archivo de texto plano `info.txt` con el resumen del documento exportado:
- Nombre del documento
- Cartas únicas en la lista
- Cartas totales procesadas (incluyendo copias `cantidad`)
- Total de imágenes delanteras y traseras generadas
- Dimensiones físicas netas (Ancho mm × Alto mm)
- Dimensiones en píxeles a 300 DPI
- Sangrado del documento (notificando que se excluyó de las imágenes)
- Fecha y hora de generación

- **Sanitización de nombres de carpetas**: Los nombres de los documentos se limpiarán para eliminar caracteres no permitidos en sistemas de archivos (`\ / : * ? " < > |`).
- **Cartas sin trasera**: Si el documento tiene `modoTraseras === 'ninguno'` o una carta concreta no tiene reverso definido, únicamente se generará el archivo `cartaXXX-D.png` omitiendo `cartaXXX-T.png`.
- **Modo Trasera Común**: Si el documento utiliza una trasera común (`modoTraseras === 'comun'` o `imagenTraseraComun`), se generará el archivo `cartaXXX-T.png` correspondiente a cada carta utilizando el reverso común, garantizando la paridad `D/T` constante al ordenar el directorio.

---

## 3. Arquitectura e Implementación Técnica

### 3.1. Frontend (`client`)
- **`MenuBar.tsx`**:
  - Propiedad callback `onExportarPng?: () => void;` y prop booleana `exportandoPng?: boolean;`.
  - Botón en el dropdown de Archivo con icono `🖼️` o `📥`.
- **`App.tsx`**:
  - Función `handleExportarPng`: empaqueta el proyecto actual mediante `guardarProyectoZip()`, construye un `FormData` y realiza un `fetch('/api/exportar/png', { method: 'POST', body: formData })`.
  - Al recibir la respuesta tipo Blob (`application/zip`), crea un enlace Blob temporal y simula el clic para descargar el archivo `[nombre_proyecto]_imagenes.zip`.

### 3.2. Backend (`server`)
- **`server/src/index.ts`**:
  - Función generadora de HTML individual para cartas `generarHtmlCartaSingle(...)` o maquetación con contenedores `#card-XXX-D` y `#card-XXX-T`.
  - Bucle de iteración sobre `proyecto.documentos`:
    - Para cada documento, crear el directorio virtual dentro del objeto `AdmZip`.
    - Iterar las cartas del documento ordenadamente.
    - Capturar screenshot PNG con Puppeteer.
    - Agregar el buffer PNG a `zip.addFile(`${docFolder}/carta${idxStr}-D.png`, bufferD)`.
    - Si existe reverso renderizable, agregar buffer PNG a `zip.addFile(`${docFolder}/carta${idxStr}-T.png`, bufferT)`.
  - Enviar el buffer del ZIP con encabezados `Content-Type: application/zip` y `Content-Disposition: attachment; filename="..."`.

---

## 4. Estrategia de Verificación

### 4.1. Pruebas Automatizadas
- Test de integración en backend (`server/src/index.test.ts` / `BackendHealth.test.ts`) verificando que el endpoint `/api/exportar/png` responda correctamente ante peticiones válidas.
- Test unitario de formateo de nombres y sanitización de carpetas.

### 4.2. Pruebas Manuales / Criterios de Aceptación
- [x] Hacer clic en `Archivo > Exportar Imágenes (PNG)...` con un proyecto de varios documentos.
- [x] Verificar que se descarga automáticamente un archivo `.zip`.
- [x] Descomprimir el ZIP y comprobar la creación de carpetas por documento.
- [x] Verificar que los archivos estén nombrados `carta001-D.png`, `carta001-T.png`... y ordenen correctamente por pares.
- [x] Inspeccionar las propiedades de la imagen exportada y comprobar que la resolución corresponda a 300 DPI físicos (ej. para 63.5 mm x 88.9 mm + sangrado 0.5 mm = 762 px x 1061 px aproximadamente).
