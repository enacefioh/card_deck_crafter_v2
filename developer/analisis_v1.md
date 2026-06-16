# Análisis del Proyecto Original (Card Deck Crafter v1)

Este documento analiza la implementación de la primera versión del proyecto `card_deck_crafter` a partir del repositorio original. El objetivo es identificar los puntos fuertes que debemos conservar y los fallos de diseño/proceso que causaron problemas de mantenimiento y escalabilidad para no repetirlos en la versión 2.

## Puntos Fuertes (Lo que funcionaba bien)

1. **Idea de Producto Muy Sólida**:
   - Resuelve un problema real para la comunidad de juegos de mesa: maquetar automáticamente cartas en hojas de tamaño estándar (A4/A3) para impresión casera o profesional.
   - La opción de mostrar/ocultar traseras alineadas correctamente es clave para la impresión a doble cara.
   
2. **Modularidad Basada en "Módulos"**:
   - El concepto de permitir que existan carpetas independientes para diferentes juegos (`general`, `one_page_rules`, `warhammer_underworlds2`) es excelente. Permite la especialización de estilos y plantillas según el juego.

3. **Portabilidad del Formato de Guardado**:
   - Uso de archivos `.cdc` para guardar y abrir proyectos. Esto permitía a los usuarios almacenar localmente sus progresos en un solo archivo.

4. **Uso de Librerías Ligeras y Clave**:
   - `html2canvas` para renderizar el DOM a imagen de manera puramente cliente.
   - `jszip` para comprimir las cartas exportadas en un solo archivo descargable.

---

## Puntos Débiles (Áreas de Mejora y Errores de Diseño)

1. **Estado Mutable Global (Espagueti de Variables)**:
   - Todo el estado de la aplicación reside en variables globales en [cartas.js](file:///temp/card_deck_crafter_old/js/cartas.js) (`version`, `num_cartas`, `zoom`, etc.). Esto provocaba que cualquier cambio en una funcionalidad pudiera corromper otra de forma inesperada (falta de aislamiento de estado).
   - Acoplamiento directo con el DOM mediante jQuery. La lógica de negocio está totalmente entrelazada con la manipulación visual.

2. **Plantillas Acopladas al Código JS (Gigantesco Tamaño)**:
   - Las plantillas HTML y los estilos CSS están embebidos dentro de variables de JavaScript en archivos como [script.js](file:///temp/card_deck_crafter_old/modulos/general/script.js).
   - El uso de imágenes en base64 directamente en las cadenas HTML de las plantillas hizo que [plantillas.js](file:///temp/card_deck_crafter_old/js/plantillas.js) pesara casi 1.5 MB. Esto dificulta enormemente la edición por humanos y herramientas de IA, ya que los archivos grandes saturan el contexto de los modelos de lenguaje y reducen el rendimiento del navegador.

3. **Carga Imperativa de Módulos (Inyección de Scripts)**:
   - Los módulos se cargaban creando elementos `<script>` y `<link>` dinámicamente en el DOM durante el tiempo de ejecución. Esto imposibilitaba el uso de bundlers modernos (como Vite o Webpack), herramientas de tipado (TypeScript) y dificultaba el debugging en consola.

4. **Inexistencia de un Servidor de Generación (Lado Cliente Exclusivo)**:
   - La generación dependía enteramente de `html2canvas` en el navegador del usuario. Aunque es portátil, tiene límites de resolución (PPP/DPI) e incompatibilidades con ciertas propiedades CSS modernas o fuentes, limitando la calidad para impresión profesional.

5. **Ausencia de Tests Automatizados de Integración y Regresión**:
   - Aunque existía una carpeta `tests/`, la validación de regresión (asegurar que un cambio no rompe lo anterior) requería intervención manual pesada. No había un arnés de pruebas automatizado que se ejecutara antes de cada commit.

6. **Dificultad de Despliegue y Retrocompatibilidad**:
   - Al no tener un sistema de versiones estructurado para las especificaciones de los archivos `.cdc`, cualquier cambio en la estructura de datos corría el riesgo de romper la compatibilidad con proyectos antiguos creados por los usuarios.

---

## Lecciones para Card Deck Crafter v2

- **Separación de Responsabilidades (MVVM / Arquitectura Limpia)**: Separar la lógica del motor de generación de cartas del renderizado de la interfaz de usuario.
- **Motor de Renderizado Headless**: Para permitir la API de servidor, el motor que genera las imágenes a partir de HTML/CSS debe poder ejecutarse en un entorno headless (ej. con Puppeteer o Playwright) para dar alta resolución (300 DPI o más).
- **Especificaciones antes que Código (Spec-Driven)**: Definir el formato de los datos `.cdc` y de las plantillas mediante esquemas JSON (JSON Schema) para garantizar la retrocompatibilidad.
- **Compilación Modernizada**: Usar TypeScript y un bundler moderno (Vite/Rollup) para estructurar el proyecto en componentes limpios y reutilizables.
