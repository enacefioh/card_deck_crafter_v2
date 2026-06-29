# Especificación Técnica (SRS) - SRS-026: Tipografías Personalizadas (Custom Fonts)

Esta especificación describe la arquitectura y los requisitos para permitir a los usuarios subir, gestionar y renderizar fuentes personalizadas (como `.ttf`, `.otf`, `.woff`, `.woff2`) tanto a nivel de proyecto como de plantilla, incluyendo la exportación/importación persistente y el renderizado PDF en el backend.

---

## 1. Introducción y Objetivos
*   **Propósito**: Permitir que los usuarios personalicen las tipografías de sus cartas usando archivos de fuentes locales, eliminando la dependencia exclusiva de las fuentes preinstaladas del sistema.
*   **Objetivos de Diseño**:
    *   **Portabilidad**: Las fuentes personalizadas se incrustan en formato base64 en los archivos de proyecto (`.cd2c`) y plantilla (`.cd2t`) para que funcionen en cualquier ordenador o navegador sin necesidad de instalación manual.
    *   **Consistencia**: El motor de exportación a PDF en el backend (Puppeteer) debe poder renderizar exactamente las mismas tipografías usando inyecciones CSS `@font-face` basadas en Data URIs.
    *   **Facilidad de Uso**: Integrar las tipografías personalizadas en el selector dropdown existente en el inspector de capas de texto.

---

## 2. Requisitos Funcionales

*   **RF-1: Carga y Almacenamiento de Fuentes del Proyecto**
    *   Se debe permitir subir archivos de fuente `.ttf`, `.otf`, `.woff` y `.woff2`.
    *   A nivel de frontend, se generará una URL de objeto (`URL.createObjectURL`) para habilitar la carga en tiempo de ejecución.
    *   Se inyectará dinámicamente una regla CSS `@font-face` para cada tipografía cargada.
*   **RF-2: Carga y Almacenamiento de Fuentes de Plantilla**
    *   Se añadirá un botón "Tipografías de Plantilla" en el menú de opciones del editor de cartas (EditCardModal), junto al gestor de la galería.
    *   Permitirá subir fuentes exclusivas de la plantilla que se empaquetarán al exportar solo la plantilla (`.cd2t`).
*   **RF-3: Integración en el Inspector de Propiedades**
    *   El selector de tipografía para capas de texto debe listar las fuentes personalizadas del proyecto y de la plantilla activa en una sección diferenciada del menú desplegable.
*   **RF-4: Exportación e Importación de Proyectos/Plantillas**
    *   Al guardar/exportar un proyecto (`.cd2c`), las fuentes en `projectAssets` o en una estructura `customFonts` se codificarán en base64.
    *   Al importar, se decodificarán y registrarán de inmediato en el navegador.
*   **RF-5: Renderizado en PDF (Backend)**
    *   El exportador de PDF convertirá el contenido de `customFonts` de la plantilla activa a reglas `@font-face` inyectadas en la página HTML enviada a Puppeteer con el formato `src: url(data:font/...;base64,...)`.

---

## 3. Arquitectura y Diseño de Datos

### 3.1. Extensión de Modelos de Datos (`shared/layoutEngine.ts`)

```typescript
export interface CustomFont {
  id: string;
  nombre: string;     // Nombre de la familia de fuente, ej: "MyFont-Bold"
  filename: string;   // Nombre del archivo, ej: "myfont.ttf"
  type: string;       // MIME tipo, ej: "font/ttf"
  data?: string;      // String base64 (solo persistencia)
  src?: string;       // URL en tiempo de ejecución (blob url en frontend)
}
```

*   Se añadirá `customFonts?: CustomFont[]` en `ProyectoCDC2`.
*   Se añadirá `customFonts?: CustomFont[]` en las estructuras `plantilla` y `plantillaTrasera` dentro de `Carta`.

---

## 4. Plan de Implementación Dividido en Partes

Dado que es una funcionalidad compleja que abarca almacenamiento, UI, inyección de estilos dinámicos, exportación/importación de ZIP y renderizado Puppeteer en backend, dividiremos la implementación en las siguientes partes acotadas:

*   **Parte 1**: Modificación de las interfaces en `shared/layoutEngine.ts` y lógica de inyección de estilos CSS dinámicos en el cliente (`App.tsx` e `EditCardModal.tsx`).
*   **Parte 2**: Modales de gestión de fuentes (subir, listar y eliminar) a nivel de proyecto y a nivel de plantilla en el editor de cartas.
*   **Parte 3**: Integración de las tipografías personalizadas en el panel inspector de la capa de texto y lienzo de previsualización.
*   **Parte 4**: Integración en exportación/importación del proyecto (`.cd2c`), plantilla (`.cd2t`) en base64, e inyección de Data URIs en el backend de Puppeteer para renderizado en PDF.

---

## 5. Estrategia de Verificación (Pruebas)

### 5.1. Pruebas Automatizadas
*   Añadir pruebas unitarias en `client/src/utils/projectUtils.test.ts` para validar que la importación/exportación de proyectos que contienen tipografías personalizadas no rompe la estructura del JSON y procesa correctamente los base64.

### 5.2. Pruebas Manuales
1.  Subir una tipografía `.ttf` al proyecto.
2.  Crear una capa de texto y seleccionarla en el inspector.
3.  Comprobar que el tipo de fuente aparece en el selector y se renderiza correctamente en el lienzo.
4.  Exportar el proyecto a un archivo `.cd2c`, cerrar el navegador, volver a abrirlo, importar el proyecto y verificar que la tipografía sigue disponible y renderizada.
5.  Exportar a PDF y validar que el PDF generado por Puppeteer muestra la tipografía personalizada seleccionada.
