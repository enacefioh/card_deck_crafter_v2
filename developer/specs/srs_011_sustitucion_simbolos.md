# Especificación Técnica - SRS-011: Motor de Sustitución de Símbolos en Capas de Texto

## 1. Introducción y Objetivos
- **Módulo**: Rich Text Rules Parser & Auto-complete System.
- **Propósito**: Permitir al usuario subir, gestionar y usar imágenes de símbolos personalizadas (ej. recursos, elementos, acciones) y que se rendericen inline como texto en las cartas mediante atajos/slugs con llaves/corchetes, por ejemplo `{tag}`.
- **Objetivos**:
  - **Galería de Símbolos**: Crear una interfaz para subir imágenes y asociarlas a un tag o slug único sin espacios.
  - **Redimensionado en Servidor**: Las imágenes de símbolos se guardan y el servidor las redimensiona a un tamaño de 100x100px para optimizar el rendimiento.
  - **Sustitución en el Lienzo**: Parsear dinámicamente las cadenas de texto del lienzo para renderizar los iconos inline, con dimensiones acopladas al tamaño de fuente (`1em`).
  - **Asistente de Inserción (Helper 🖼️)**: Añadir un botón o icono al lado de la información del campo de texto que permita desplegar la lista de símbolos y hacer clic para insertar el tag en la posición del cursor o al final si no está enfocado.

---

## 2. Requisitos Funcionales

### RF-1: Galería de Símbolos (Menú Recursos)
- En el menú principal de navegación (Recursos), se añadirá la opción **"Galería de símbolos"**.
- Al pulsarla, se abrirá un modal dedicado donde el usuario podrá:
  - Subir una nueva imagen (PNG, JPG, SVG, WebP, etc.).
  - Introducir un **tag / slug** para la imagen (cadena de texto sin espacios, ej. `fuego`, `tap`, `oro`).
  - Ver el listado de símbolos registrados con su miniatura y su respectivo tag.
  - Editar el tag de los símbolos existentes (validando que no tenga espacios ni caracteres reservados que rompan el formato).
  - Eliminar símbolos.

### RF-2: Redimensionado de Símbolos en Servidor
- Cuando el servidor recibe una imagen para la galería de símbolos, se procesará y se guardará redimensionada a un tamaño máximo de **100x100 píxeles** (manteniendo la relación de aspecto si es posible, o reescalando).
- Los símbolos se guardarán en un directorio del proyecto (ej. `public/symbols/` o en el almacenamiento de recursos del proyecto).
- El servidor expondrá rutas API REST para:
  - `POST /api/symbols` (subir e inicializar símbolo con tag).
  - `GET /api/symbols` (listar todos los símbolos registrados).
  - `PUT /api/symbols/:id` (actualizar tag/slug).
  - `DELETE /api/symbols/:id` (eliminar símbolo).

### RF-3: Motor de Renderizado e Inserción Inline
- Al renderizar cualquier capa de texto en el lienzo (Canvas), se procesará su valor raw. Cualquier aparición de un patrón como `{tag}` (donde `tag` es un slug de símbolo registrado) se sustituirá en el HTML generado por una etiqueta de imagen:
  - `<img src="/api/symbols/raw/:filename" class="symbol-inline-icon" alt="tag" style="height: 1em; width: auto; vertical-align: middle; display: inline-block;" />`
- Esto garantiza que el icono fluya inline con el texto ordinario de la carta y cambie su tamaño automáticamente de acuerdo al `fontSize` de la capa de texto.
- En los campos de formulario del editor de cartas (inputs de texto y áreas de texto), el texto se mostrará en formato crudo/raw (es decir, el tag literal `{tag}`).

### RF-4: Asistente Visual de Inserción (Helper 🖼️)
- Junto al icono de información ℹ️ en la etiqueta de cada input/textarea de texto (tanto en el editor de cartas como en las propiedades expuestas en la barra del lienzo), se añadirá un icono de imagen/cuadro 🖼️.
- Al hacer clic en 🖼️, se abrirá un desplegable/popover contextual con el listado de todos los símbolos disponibles y su slug al lado.
- Al hacer clic en uno de los símbolos del listado:
  - Se insertará el tag `{tag}` en la posición actual del cursor (selectionStart/selectionEnd) en el input/textarea correspondiente.
  - Si el input no tenía el foco, se añadirá el tag `{tag}` al final del texto.
  - Se disparará el evento de actualización para que el lienzo redibuje la carta con el nuevo símbolo de forma inmediata.

---

## 3. Arquitectura y Datos

### Estructura de Datos (Símbolo)
```typescript
interface Simbolo {
  id: string;
  tag: string; // Ej: "fuego" (se usará como {fuego})
  filename: string; // Ruta del archivo local en el servidor
}
```

### Rutas API Backend
- `GET /api/projects/:projectId/symbols` - Obtener lista de símbolos.
- `POST /api/projects/:projectId/symbols` - Subir imagen de símbolo (multipart/form-data) con su respectivo tag, aplicando redimensionamiento en servidor.
- `PUT /api/projects/:projectId/symbols/:symbolId` - Editar el tag del símbolo.
- `DELETE /api/projects/:projectId/symbols/:symbolId` - Borrar el archivo y el registro del símbolo.

---

## 4. Estrategia de Verificación
- **Pruebas Unitarias**:
  - Testear la función `parsearTextoConSimbolos` con diferentes tags de entrada, asegurando que se transforman correctamente en etiquetas `<img>` y se escapan otros caracteres de forma segura.
  - Testear el validador de tags (sin espacios, sin caracteres extraños).
- **Pruebas Manuales**:
  - Subir una imagen grande de 500x500px, comprobar en el disco del servidor que se ha guardado escalada a 100x100px.
  - Crear una carta, agregar `{fuego}` en el texto y verificar que se muestra el icono en el lienzo del tamaño correcto de la letra.
  - Usar el botón 🖼️ en el inspector lateral y en el editor de cartas para verificar que inserta `{slug}` en el cursor y refresca el lienzo en tiempo real.
