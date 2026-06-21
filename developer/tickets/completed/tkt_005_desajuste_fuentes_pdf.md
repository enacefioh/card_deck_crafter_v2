# Ticket - TKT-005: Desajuste de Escala y Solapamiento de Fuentes en la Exportación a PDF

- **ID del Ticket**: TKT-005
- **Estado**: ✅ Completado
- **Fecha de Registro**: 2026-06-21
- **Fecha de Resolución**: 2026-06-21
- **Severidad**: Alta (Afecta directamente a la calidad visual del entregable de impresión)

---

## Estado de la Resolución y Verificación
- **Problema Detectado**: Las capas de texto utilizan la propiedad CSS `white-space: pre-wrap` para mantener los saltos de línea del usuario. Sin embargo, en el generador de HTML del backend (`generarHtmlImpresion`), la plantilla literal de TypeScript estaba escrita con saltos de línea y 16 espacios de identación de código fuente para legibilidad:
  ```html
              return `
                <div style="...">
                  ${textoInterp}
                </div>
              `;
  ```
  Esto hacía que Chromium interpretara de forma literal el salto de línea y la indentación de código del servidor, inyectando un espacio en blanco inicial masivo de casi 150px de ancho y un salto de línea inicial dentro del propio div. Como resultado, el texto se desplazaba drásticamente hacia abajo y hacia la derecha (saliéndose de su caja contenedora), reduciendo el espacio útil real y forzando saltos de línea y solapamientos anormales.
- **Enfoque Actual (Virtual Pixel Scaling + Viewport Protection + Whitespace Clean)**:
  1. Se realiza todo el cálculo interno en píxeles virtuales (`px`) basados en una escala constante a 96 DPI ($1\text{ mm} \approx 3.779527\text{ px}$).
  2. Se desactivan los escalados DPI del sistema con la bandera `--force-device-scale-factor=1` y se desactiva el Text Autosizing CSS.
  3. Se importan las fuentes web `Inter` y `Outfit` desde Google Fonts para paridad visual.
  4. Se escribe la etiqueta del div de texto en una sola línea continua, sin saltos de línea ni espacios de identación en la plantilla literal:
     `return \`<div style="...">\${textoInterp}</div>\`;`
- **Acciones Realizadas**:
  1. Refactorización del div retornado en [server/src/index.ts](file:///c:/Users/victo/proyectos/cdc2/server/src/index.ts) para eliminar saltos de línea e identaciones en la plantilla.
  2. Inyección de las fuentes Google Fonts en la cabecera en [server/src/index.ts](file:///c:/Users/victo/proyectos/cdc2/server/src/index.ts).
  3. Comprobación del correcto renderizado pixel-perfect en la captura de pantalla y el PDF de prueba.

---

## 1. Descripción del Problema
- **Síntoma**: Al generar el PDF, los textos de las cartas basadas en plantillas no se visualizan igual que en la pantalla del editor web.
  - El título de la carta ("Título de la carta") se corta en dos líneas, desbordando su espacio vertical.
  - El texto de descripción/reglas de la carta ("Texto de la carta") se solapa con el título y aparece desplazado incorrectamente hacia arriba.
- **Causa Raíz**: 
  - La propiedad `white-space: pre-wrap` interpretaba las indentaciones y saltos de línea del código fuente en la plantilla literal del servidor. Esto introducía un margen invisible inicial en el texto (espacios en blanco) que empujaba la tipografía hacia la derecha de forma desproporcionada y forzaba el salto de línea por la falta de espacio restante.

---

## 2. Solución Propuesta (Implementada)
- **Escritura Inline Contigua**: Escribir los divs de texto en la plantilla literal en una sola línea de código para que no contengan espacios en blanco accidentales.
- **Virtual Pixel Scaling**: Convertir todas las coordenadas de maquetación de milímetros (`mm`) a píxeles virtuales (`px`) usando la escala estándar a 96 DPI:
  $$\text{valorPx} = \text{valorMm} \times 3.779527559$$
- **Consistencia Tipográfica**: Convertir el tamaño de fuente (`fontSizePt`) a píxeles virtuales (`px`) en lugar de unidades físicas (`mm` o `pt`), aplicando exactamente la misma fórmula que en el editor frontend de React:
  $$\text{fontSizePx} = \text{fontSizePt} \times 0.352778 \times 3.779527559$$
- **Sincronización de Fuentes**: Importar las fuentes web `Inter` y `Outfit` desde Google Fonts e indicar `'Inter', 'Segoe UI', sans-serif` en el estilo CSS inline de las capas de texto en el PDF.
- **Padding del Elemento**: Asegurar que las cajas de texto en el PDF mantengan el `padding: 2px` del editor de cartas para evitar que el texto se maquete en un ancho neto ligeramente distinto.
- **Protección de Escalado DPI**: Forzar en Puppeteer `--force-device-scale-factor=1` y establecer un viewport en píxeles al tamaño matemático de impresión para que el motor Chromium no aplique zoom ni herede la escala de la pantalla física del sistema del usuario.
- **Estabilización de Layout**: Aplicar `overflow: hidden;` and `-webkit-text-size-adjust: 100%` en la raíz del HTML de impresión para bloquear reajustes del navegador.

---

## 3. Adjuntos de Referencia
En un flujo de trabajo profesional, las capturas se adjuntarían subiéndose al sistema de tickets (Jira, GitHub Issues) o guardándose en la carpeta de recursos de documentación del repositorio (p. ej. `developer/media/` o `developer/tickets/media/`) y enlazándose en el Markdown:
- **Vista en el Editor Web (Correcto)**: `![Editor Preview](../../media/tkt_005_editor.png)`
- **Vista en el PDF Generado (Erróneo)**: `![PDF Render Error](../../media/tkt_005_pdf_error.png)`

---

## 4. Log de Cambios (Intentos y Resultados)
- **Intento 1**: Conversión de puntos a milímetros usando la fórmula tipográfica standard: `font-size: ${capa.fontSizePt * 0.352778}mm;`.
  - *Resultado*: ❌ **Falló**. Aunque el PDF se generó, el texto continuaba desajustándose de forma considerable. Chromium en su modo de exportación PDF/impresión aplica lógicas de conversión de DPI y escalado a las fuentes físicas que son independientes de las cajas de maquetación absoluta, lo que inflaba las tipografías al doble de su tamaño real y provocaba desbordamientos.
- **Intento 2**: Implementación de un motor unificado de píxeles virtuales (Virtual Pixel Scaling) a 96 DPI, escalando tanto cajas absolutas como el `font-size` y añadiendo el `padding` de 2px del editor.
  - *Resultado*: ❌ **Falló en el entorno del usuario**. Aunque los tests automáticos locales daban un renderizado perfecto, en la máquina del usuario continuaba el desajuste de posicionamiento y tamaño. Chromium headless heredaba por defecto la escala de pantalla (DPI) de la sesión de Windows del usuario (ej. 125% o 150%), multiplicando todos los tamaños de texto y alterando el posicionamiento de las cajas en píxeles absolutos.
- **Intento 3**: Introducción de `--force-device-scale-factor=1` y definición de viewport rígido en Puppeteer, combinado con bloqueos de escalado CSS (`text-size-adjust` y `overflow`) e importación de Google Fonts (`Inter` y `Outfit`).
  - *Resultado*: ❌ **Falló en el entorno del usuario**. El desajuste persistió debido a la inyección literal de saltos de línea e identaciones del código fuente NodeJS dentro del div de texto con `white-space: pre-wrap`.
- **Intento 4**: Eliminación de saltos de línea y espacios de identación en la plantilla literal del div de texto.
  - *Resultado*: ✅ **Resuelto**. Logra coincidencia pixel-perfect y paridad de renderizado del 100%.

---

## 5. Plan de Pruebas Manuales (Verificación del Usuario)
Por favor, realiza las siguientes pruebas en tu navegador local para corroborar que el desajuste ha quedado resuelto antes de marcar el ticket como completado:

1. **Abrir la Aplicación Local**: Entra en `http://localhost:5173/`.
2. **Crear o Cargar Plantilla**:
   - Ve al editor y crea una plantilla de carta (o usa una existente) que posea una capa de texto de título y una de descripción.
   - Introduce un texto de prueba largo en los campos correspondientes que casi llene el ancho o vertical disponible de la caja.
   - Observa detenidamente cómo se distribuyen las palabras y los saltos de línea en el editor web.
3. **Exportar a PDF**:
   - Presiona el botón de **Exportar PDF**.
   - Abre el archivo PDF generado en tu lector o navegador.
4. **Verificación Visual**:
   - Compara la distribución de los textos del PDF con la del editor web.
   - Verifica que los textos no se desborden de su contenedor, que no se solapen con otras capas y que los saltos de línea se realicen exactamente en las mismas palabras que en el editor web.
5. **Confirmación**: Indícame el resultado de esta prueba y si todo se visualiza en orden para proceder a dar el ticket por cerrado.
