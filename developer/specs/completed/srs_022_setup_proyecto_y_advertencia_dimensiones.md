# Especificación Técnica - SRS-022: Setup Inicial del Proyecto, Diálogo de Configuración y Advertencia de Dimensiones

## 1. Introducción y Objetivos
- **Propósito**: Simplificar y mejorar la experiencia de usuario (UX) al crear, configurar y cargar proyectos. En lugar de permitir la edición caótica de las dimensiones físicas en la barra lateral mientras se trabaja, se centralizarán en pantallas de bienvenida y de configuración del proyecto específicas. Además, se advertirá visualmente al usuario cuando intente usar plantillas de cartas que no coincidan con las dimensiones configuradas para el proyecto.
- **Objetivos de Diseño**:
  - **Claridad Inicial**: Mostrar una pantalla centralizada al abrir el editor que permita crear un nuevo proyecto o abrir uno existente.
  - **Prevención de Glitches**: Trabajar sobre estados temporales de configuración geométrica y aplicarlos únicamente al presionar "Aplicar".
  - **Advertencias de Compatibilidad**: Indicar con un icono amarillo `⚠️` y texto gris las plantillas de la lista cuyas dimensiones no coincidan con las del proyecto.
  - **Personalización de Exportación**: Nombrar los archivos `.cdc2` y `.pdf` utilizando el nombre del proyecto como prefijo.

---

## 2. Requisitos Funcionales y Casos de Uso

### RF-1: Pantalla de Setup Inicial (Bienvenida)
- **RF-1.1**: Si no hay un proyecto cargado en la sesión activa (por defecto en la primera carga), se mostrará un modal de gran tamaño bloqueando la interfaz de fondo.
- **RF-1.2**: El modal contendrá dos flujos principales:
  1. **Crear Nuevo Proyecto**:
     - Campo de texto obligatorio: **Nombre del Proyecto** (valor por defecto: `"Mi Baraja"`).
     - Configuración de página: Tipo de hoja (A4, A3, personalizado), orientación (vertical, horizontal), márgenes.
     - Configuración de cartas: Tipo de carta (Poker/Standard Vertical, Poker/Standard Horizontal, Mini Chimera Vertical, Mini Chimera Horizontal, Tarot Vertical, Tarot Horizontal, personalizado), sangrado, espaciado X/Y, borde de corte (grosor y color) y modo de ajuste de ilustración.
     - Botón: `"Crear Nuevo Proyecto"` que inicializa el estado y cierra el modal.
  2. **Abrir Proyecto Existente**:
     - Botón: `"Abrir Proyecto (.cdc2)"` que abre el selector de archivos local, carga el proyecto y cierra el modal.

### RF-2: Diálogo de Configuración del Proyecto y Barra de Menú
- **RF-2.1**: Se añadirán dos estados en la aplicación: `nombreProyecto` (nombre del proyecto activo) y `projectCreated` (booleano que indica si la pantalla inicial se ha completado).
- **RF-2.2**: Se eliminarán de la barra lateral izquierda (`sidebar`) los grupos de opciones de "Ajustes de Página" y "Dimensiones de Carta". La barra lateral ahora solo albergará la sección de "Caras Traseras" (reverso común) y la lista de cartas/acciones de selección.
- **RF-2.3**: En el menú superior **Archivo**, se añadirá la opción **Configuración del Proyecto...**.
- **RF-2.4**: Esta opción abrirá un diálogo con el mismo diseño que el de creación de proyecto, pero con las siguientes particularidades:
  - Sin el botón/flujo de "Abrir Proyecto".
  - El botón de confirmación dirá `"Guardar Configuración"` o `"Aplicar"`.
- **RF-2.5**: Los campos de entrada del diálogo modificarán un estado temporal local (`tempConfig`). Al presionar "Aplicar", se transferirán los valores al estado real del proyecto. Si se cancela o cierra, se descartan los cambios.

### RF-3: Advertencia de Discrepancia de Dimensiones de Plantilla
- **RF-3.1**: En el modal de añadir carta o asignar reverso desde plantilla (`showTemplateModal`), se validará si las dimensiones de cada plantilla coinciden con las configuradas en el proyecto.
- **RF-3.2**: La condición de coincidencia será:
  `Math.abs(plantilla.anchoMm - cardConfig.anchoMm) < 0.1 && Math.abs(plantilla.altoMm - cardConfig.altoMm) < 0.1`
- **RF-3.3**: Si no coincide:
  - El icono actual (`📄` para plantillas por defecto o `📦` para importadas) será sustituido por un icono amarillo de advertencia `⚠️`.
  - Al colocar el cursor sobre el icono de advertencia, aparecerá un tooltip indicando:
    `"El tamaño de la plantilla (${plantilla.anchoMm}x${plantilla.altoMm}mm) no coincide con las dimensiones de las cartas configuradas en el proyecto (${cardConfig.anchoMm}x${cardConfig.altoMm}mm)"`
  - El color de la tipografía de ese elemento de plantilla pasará a gris (`var(--text-secondary)`).
  - El usuario podrá seguir haciendo clic y añadiendo la carta, pero con la advertencia visual visible.

### RF-4: Nombre de Archivo Dinámico en la Exportación
- **RF-4.1**: Al guardar el proyecto (.cdc2) o exportar a PDF, se limpiarará el nombre del proyecto (`nombreProyecto`) reemplazando espacios y caracteres especiales por guiones bajos.
- **RF-4.2**: Los nombres de archivo resultantes seguirán el formato:
  - Proyecto: `<nombre_proyecto_limpio>_<timestamp>.cdc2`
  - PDF: `<nombre_proyecto_limpio>_<timestamp>.pdf`

---

## 3. Estado de la Especificación
- **Estado**: 🟢 Completada y Validada (Sesión actual)
