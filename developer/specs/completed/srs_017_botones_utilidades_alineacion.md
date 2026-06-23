# Especificación Técnica - SRS-017: Botones de Utilidades de Posición y Tamaño en Editor

## 1. Introducción y Objetivos
- **Propósito**: Facilitar el posicionamiento y escalado geométrico rápido de las capas seleccionadas (tanto de texto como de imagen) dentro de la carta durante su edición en el modal `EditCardModal`. Añade botones de acceso rápido de alineación e igualación de dimensiones al inspector de diseño.
- **Objetivos de Diseño**:
  - **Usabilidad (UX)**: Evitar que el usuario tenga que calcular o escribir manualmente las coordenadas `x`, `y` y dimensiones `anchoMm`, `altoMm` para casos comunes como centrar a los bordes, extender a pantalla completa, o forzar ancho/alto máximo.
  - **Previsualización en tiempo real**: Los cambios geométricos se aplican instantáneamente al estado de la plantilla y se previsualizan en el lienzo central.
  - **Consistencia de Unidades**: Mantener el uso consistente de milímetros (mm) en todos los cálculos y transformaciones.

---

## 2. Requisitos Funcionales y Casos de Uso

### RF-1: Barra de Utilidades en Inspector de Diseño
- **RF-1.1**: El inspector de diseño (la pestaña "Diseño" en la columna derecha de `EditCardModal` al seleccionar una capa) presentará un grupo de botones de utilidades rápidas antes de los campos de entrada numérica específicos de posición y tamaño.
- **RF-1.2**: El grupo de utilidades contendrá 7 botones con iconos y tooltips claros (mediante el atributo `title` nativo):
  - ⬆️ **Alineación Superior (Arriba)**: Establece `yMm = 0` para la capa.
  - ⬇️ **Alineación Inferior (Abajo)**: Establece `yMm = alto_carta - alto_capa`.
  - ⬅️ **Alineación Izquierda**: Establece `xMm = 0` para la capa.
  - ➡️ **Alineación Derecha**: Establece `xMm = ancho_carta - ancho_capa`.
  - ↔️ **Ancho Máximo**: Establece `anchoMm = ancho_carta` y `xMm = 0`.
  - ↕️ **Alto Máximo**: Establece `altoMm = alto_carta` y `yMm = 0`.
  - ⏹️ **Expandir a Pantalla Completa**: Establece `xMm = 0`, `yMm = 0`, `anchoMm = ancho_carta`, `altoMm = alto_carta`.

- **RF-1.3**: El formulario original de posición y tamaño será compactado visualmente en una sola fila o bloque de grid reducido con las etiquetas abreviadas **X**, **Y**, **W** (Ancho/Width) y **H** (Alto/Height) seguidas de sus respectivos inputs de número. Al pasar el cursor por encima de estas etiquetas o inputs, se mostrará un tooltip nativo (vía atributo `title`) detallando la descripción completa (ej: `"Posición X (mm)"`, `"Posición Y (mm)"`, `"Ancho (mm)"`, `"Alto (mm)"`).

### RF-2: Aplicación en Tiempo Real y Restricciones
- **RF-2.1**: Al pulsar cualquier botón de utilidad, se mutarán los valores geométricos correspondientes en la capa de la plantilla que se está editando (`tempPlantilla` o `tempPlantillaTrasera`).
- **RF-2.2**: Los campos de entrada numérica en el inspector reflejarán de inmediato los nuevos valores físicos resultantes.
- **RF-2.3**: El lienzo del editor modal redibujará la carta en tiempo real según la nueva geometría.
- **RF-2.4**: Las utilidades de alineación deben estar deshabilitadas o no ser aplicables si la capa es de tipo `background` (ya que esta siempre tiene posición y tamaño fijos en la carta).

---

## 3. Arquitectura y Diseño de Datos

### Entidades y Dimensiones involucradas:
- **Dimensiones de la Carta**:
  - Ancho de la carta: `plantillaActiva.anchoMm` (o por defecto `cardConfig.anchoMm` si no estuviera en la plantilla).
  - Alto de la carta: `plantillaActiva.altoMm` (o por defecto `cardConfig.altoMm` si no estuviera en la plantilla).
- **Dimensiones de la Capa seleccionada**:
  - `xMm`: Posición horizontal.
  - `yMm`: Posición vertical.
  - `anchoMm`: Anchura de la capa.
  - `altoMm`: Altura de la capa.

### Cálculos de Transformación:
- **Alineación Superior (Arriba)**: `yMm = 0`
- **Alineación Inferior (Abajo)**: `yMm = alto_carta - alto_capa`
- **Alineación Izquierda**: `xMm = 0`
- **Alineación Derecha**: `xMm = ancho_carta - ancho_capa`
- **Ancho Máximo**: `anchoMm = ancho_carta`, `xMm = 0`
- **Alto Máximo**: `altoMm = alto_carta`, `yMm = 0`
- **Expandir**: `xMm = 0`, `yMm = 0`, `anchoMm = ancho_carta`, `altoMm = alto_carta`

*Nota: Todos los cálculos deben redondearse a un decimal (ej. `.toFixed(1)`) para evitar problemas de precisión en coma flotante al persistir.*

---

## 4. Interfaces de Componentes / UI
- Se ubicará un panel `<div className="inspector-alignment-utilities">` en la pestaña de Diseño de `EditCardModal.tsx`, justo antes del formulario numérico.
- Los botones estarán estilizados mediante reglas específicas en `EditCardModal.css` usando micro-animaciones en hover y estados deshabilitados limpios.

---

## 5. Estrategia de Verificación (Pruebas)

### 5.1. Pruebas Unitarias Automatizadas
Se añadirán pruebas unitarias en [client/src/utils/projectUtils.test.ts](file:///c:/Users/victo/proyectos/cdc2/client/src/utils/projectUtils.test.ts) que simulen las transformaciones sobre una capa ficticia en base a dimensiones de carta de ejemplo (`63.5` x `88.9` mm) y validen las coordenadas resultantes.

### 5.2. Pruebas Manuales / Criterios de Aceptación (Checklist)
- [ ] Verificar que aparecen los iconos/botones de utilidades arriba de los campos de entrada de X, Y, Ancho, Alto.
- [ ] Seleccionar una capa de tipo texto o imagen y pulsar cada botón:
  - "Arriba" coloca Y en 0.
  - "Abajo" coloca Y al final.
  - "Izquierda" coloca X en 0.
  - "Derecha" coloca X al final.
  - "Ancho Máximo" ajusta el ancho al de la carta y centra X en 0.
  - "Alto Máximo" ajusta el alto al de la carta y centra Y en 0.
  - "Expandir" aplica todos los límites máximos y posición inicial 0,0.
- [ ] Asegurarse de que el lienzo central de previsualización se redibuja en tiempo real.
- [ ] Probar que las utilidades no modifican la capa `background` si está seleccionada.
