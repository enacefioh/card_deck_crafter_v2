# Especificación Técnica - SRS-004: Dropzones de Caras Traseras (Drag & Drop)

## 1. Introducción y Objetivos
- **Módulo**: Panel de Control Lateral / Gestor de Caras Traseras (Client UI).
- **Propósito**: Mejorar la usabilidad de la gestión de reversos de cartas, sustituyendo los botones tradicionales de selección de archivos por zonas de arrastrar y soltar (Dropzones) interactivas, idénticas en comportamiento y estética al importador de caras delanteras (frontales).
- **Objetivos de Diseño**:
  - **Consistencia Visual**: Las dropzones secundarias de caras traseras deben mantener una línea de diseño coherente con la dropzone principal de importación frontal, pero de tamaño más compacto para encajar en el menú lateral.
  - **Facilidad de Uso**: Soporte para arrastrar una sola imagen (trasera común) o múltiples imágenes (traseras en lote) y cargarlas instantáneamente como blobs locales.

---

## 2. Requisitos Funcionales y Casos de Uso

### RF-1: Dropzone de Trasera Común (Default Back Face)
- **RF-1.1**: El panel de control lateral debe mostrar una dropzone compacta para la trasera común cuando la opción "Generar Reversos" esté activa.
- **RF-1.2**: Debe aceptar arrastrar y soltar un único archivo de imagen (`image/*`).
- **RF-1.3**: Si el usuario suelta más de un archivo, se debe tomar solo el primero e ignorar el resto.
- **RF-1.4**: Al soltar el archivo, el sistema generará una URL de tipo blob local (`URL.createObjectURL(file)`) y actualizará el estado de la trasera común (`imagenTraseraComun`).

### RF-2: Dropzone de Importación de Traseras en Bloque (Bulk Back Faces)
- **RF-2.1**: Se debe mostrar una dropzone compacta específica para importar traseras en lote cuando "Generar Reversos" esté activo y existan cartas importadas en el proyecto.
- **RF-2.2**: Debe aceptar la entrada de múltiples archivos de imagen de forma simultánea.
- **RF-2.3**: El orden de asignación de los archivos arrastrados debe emparejarse con el orden de las cartas frontales en la lista actual del cliente (ej. si se arrastran 3 imágenes traseras, se asignarán secuencialmente a las cartas 1, 2 y 3).

### RF-3: Comportamientos de Interacción Comunes
- **RF-3.1**: Ambas dropzones deben reaccionar visualmente a los eventos `dragover` y `dragenter` cambiando el estilo de su borde y color de fondo para indicar que están listas para recibir archivos.
- **RF-3.2**: Al hacer clic en cualquier parte de la dropzone, se debe abrir el diálogo nativo del explorador de archivos del navegador (`<input type="file">` oculto) con el filtro `accept="image/*"`.

---

## 3. Arquitectura e Interfaz de Usuario (UI)

### Diseño Conceptual de la UI (Barra Lateral)
```
+------------------------------------+
| [x] Generar Reversos (Doble Cara)  |
|                                    |
|  TRASERA COMÚN (POR DEFECTO)       |
|  +------------------------------+  |
|  |       📥 Soltar archivo      |  |
|  |     o haz clic para subir    |  |
|  +------------------------------+  |
|                                    |
|  IMPORTAR TRASERAS EN BLOQUE       |
|  +------------------------------+  |
|  |    🔄 Soltar traseras lote   |  |
|  |     o haz clic para subir    |  |
|  +------------------------------+  |
+------------------------------------+
```

### Eventos y Estado
1.  **`onDragOver` / `onDragLeave`**: Alterna un estado booleano de arrastre activo (`isDragActive`) para aplicar clases CSS dinámicas como `.drag-hover`.
2.  **`onDrop`**: Captura `e.dataTransfer.files`, filtra por tipo MIME de imagen y llama a las funciones de importación correspondientes:
    *   Trasera común: `setImagenTraseraComun(URL.createObjectURL(files[0]))`
    *   Lote de traseras: Asigna las imágenes recibidas a la lista de cartas secuencialmente.

---

## 4. Estrategia de Verificación (Pruebas)

### 4.1. Pruebas Manuales (Checklist de Aceptación)
- [ ] **Test 1: Subida de trasera única**: Arrastrar un archivo `back_card.png` a la dropzone de Trasera Común. Verificar que se actualiza el estado y aparece la miniatura de previsualización en el visor lateral.
- [ ] **Test 2: Subida múltiple en lote**: Tener 3 cartas frontales cargadas. Seleccionar y arrastrar 3 imágenes a la dropzone de "Importar traseras en bloque". Verificar que se asignan correctamente en el orden correspondiente a cada una de las 3 cartas y se muestran en los reversos del lienzo.
- [ ] **Test 3: Click alternativo**: Hacer clic en la dropzone de trasera común. Confirmar que se despliega el explorador de archivos del sistema operativo, permitiendo elegir una imagen y cargándola con éxito.
- [ ] **Test 4: Feedback de arrastre**: Arrastrar una imagen sobre una dropzone sin soltarla. Verificar que el color del borde cambia a morado/activo y vuelve a su estado normal al retirar el ratón (`dragleave`).
