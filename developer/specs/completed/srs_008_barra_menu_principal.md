# Especificación Técnica - SRS-008: Barra de Menú Principal (Classic Dropdown Menu Bar con Estilo Moderno)

## 1. Introducción y Objetivos
- **Módulo**: Interfaz de Navegación y Control Global (Main Menu Navigation & Global Actions).
- **Propósito**: Implementar una barra de menú superior horizontal (similar al menú de aplicaciones clásicas de escritorio) para consolidar y organizar de forma estructurada todas las acciones del sistema (Guardar/Cargar, Importar/Exportar, Ajustes del Lienzo y Módulos de Plantillas). Esto descongestiona el panel lateral y prepara la aplicación para su escalabilidad futura.
- **Objetivos de Diseño**:
  - **Organización Semántica**: Agrupar acciones relacionadas en menús desplegables lógicos (Archivo, Edición, Módulos, Ver).
  - **Ajuste Estético Moderno**: Diseño translúcido de alta calidad (Glassmorphism), sombras suaves, fuentes cuidadas y micro-animaciones en hover.
  - **Comportamiento Clásico**: El menú se despliega al hacer clic, y si está activo, pasar el cursor por otros menús superiores los abre automáticamente sin clics adicionales.

---

## 2. Requisitos Funcionales y Casos de Uso

### RF-1: Estructura del Menú Superior
La barra ocupará todo el ancho superior de la pantalla y contendrá los siguientes elementos y submenús:
- **Menú "Archivo"**:
  - *Nuevo Proyecto*: Resetea el editor a sus valores por defecto (solicita confirmación para evitar pérdida accidental).
  - *Cargar Proyecto (.cdc2)*: Abre el selector de archivos local.
  - *Guardar Proyecto (.cdc2)*: Descarga la baraja actual comprimida.
  - *Separador*
  - *Importar Ilustraciones Frontales*: Dispara la selección de imágenes.
  - *Exportar a PDF*: Inicia el procesamiento y la descarga de Puppeteer.
- **Menú "Edición"**:
  - *Configurar Hojas/Lienzo*: Atajo para enfocar los inputs de tamaño de hoja y márgenes.
  - *Configurar Cartas/Dimensiones*: Atajo para enfocar los inputs de sangrado y bordes de corte.
- **Menú "Ver"**:
  - *Aumentar Zoom / Reducir Zoom*: Controla la escala visual del lienzo.
  - *Líneas de Corte Continuas* (Checkbox/Toggle): Activa o desactiva las líneas discontinuas.
  - *Marcas de Esquina* (Checkbox/Toggle): Activa o desactiva las marcas físicas en bordes.

### RF-2: Interactividad y Comportamiento Desktop-Like
- **RF-2.1**: Al hacer clic en un encabezado del menú superior (ej. "Archivo"), este se expande hacia abajo mostrando su listado.
- **RF-2.2**: Si un menú está desplegado y el usuario desplaza el cursor a otro encabezado (ej. de "Archivo" a "Ver"), el menú de "Archivo" se cierra inmediatamente y el de "Ver" se abre de forma automática.
- **RF-2.3**: Hacer clic fuera del menú desplegado o presionar `Escape` cerrará cualquier menú abierto.
- **RF-2.4**: Se incluirán separadores visuales sutiles y estados visuales (checked/toggle) para opciones booleanas (ej. la visibilidad de líneas de corte).

---

## 3. Arquitectura y Diseño de Datos

### Estructura de Componentes React (Propuesta)
```typescript
interface MenuItem {
  label: string;
  action?: () => void;
  type?: "item" | "separator" | "checkbox";
  checked?: boolean;
}

interface MenuDropdown {
  title: string;
  items: MenuItem[];
}
```

El estado global de React controlará qué menú está expandido activamente:
`const [menuAbierto, setMenuAbierto] = useState<string | null>(null);`

---

## 4. Estilos y Estética (CSS)
- Contenedor con `backdrop-filter: blur(10px)` y borde inferior semi-transparente.
- Colores acentuados en hover con bordes ligeramente redondeados.
- Menús desplegables posicionados de forma absoluta con alta prioridad de Z-Index (`z-index: 1000`).
- Sombras envolventes (`box-shadow: 0 10px 30px rgba(0,0,0,0.3)`).

---

## 5. Estrategia de Verificación (Pruebas)

### 5.1. Pruebas Manuales (Checklist de Aceptación)
- [ ] Hacer clic en "Archivo" -> verificar que se despliega el submenú correspondiente.
- [ ] Mover el cursor sobre "Ver" (sin hacer clic). Confirmar que se cierra "Archivo" y se abre "Ver" al instante.
- [ ] Hacer clic en "Ver -> Líneas de Corte Continuas". Verificar que se actualiza el lienzo del editor alternando la visibilidad de las líneas discontinuas y que la marca de verificación en el menú se sincroniza.
- [ ] Hacer clic en un área vacía del lienzo. Comprobar que el menú se cierra por completo.
- [ ] Verificar que la barra ocupa la parte superior de la pantalla y empuja el sidebar y el workspace hacia abajo sin tapar contenidos.
