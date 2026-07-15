# SRS-051: Margen de Sangrado Incluido en el Tamaño de las Cartas

Este documento define el comportamiento y la especificación técnica para la implementación del **Margen de sangrado** en Card Deck Crafter v2.

---

## 1. Introducción y Objetivos
- **Propósito**: Configurar el margen perimetral de las cartas en el documento de manera que se sume de forma directa al tamaño de impresión de la carta.
- **Objetivo de Diseño**: El tamaño total físico de cada carta en la hoja/documento final será la suma del tamaño definido por el usuario más el doble del margen de sangrado.

---

## 2. Requisitos Funcionales y Criterios de Aceptación

- **RF-1: Parámetro de Configuración (UI)**:
  - En la interfaz del proyecto y configuración de carta se sustituirá el término antiguo "Sangrado" por **"Margen de sangrado"**.
  - El valor por defecto de este campo para nuevos proyectos/cartas será de **0,5 mm**.
  - El input en el formulario permitirá incrementos decimales con un `step` de **0,1 mm** y valor mínimo de `0`.

- **RF-2: Cálculo de Dimensiones en el Documento**:
  - El tamaño físico real de cada carta (y de sus slots en la distribución de hojas) se calculará de la siguiente manera:
    - $\text{Ancho total} = \text{Ancho nominal} + (2 \times \text{Margen de sangrado})$
    - $\text{Alto total} = \text{Alto nominal} + (2 \times \text{Margen de sangrado})$
  - Toda la maquetación automática (filas, columnas, márgenes de página) se calculará utilizando estas dimensiones totales reales.

- **RF-3: Sin Desplazamiento de Contenido**:
  - No existirá ningún desplazamiento automático de las capas ni compensación en el lienzo del editor ni en los slots del documento.
  - El origen de coordenadas `(0, 0)` de las capas de la carta corresponderá exactamente a la esquina superior izquierda del tamaño total físico (que incluye el sangrado). El contenido de las capas ocupará todo el tamaño disponible de la carta (incluyendo el sangrado).

- **RF-4: Marcas de Corte de Esquinas**:
  - Las marcas de esquina de corte (`corner-cut-mark`) y el borde de corte se posicionarán alineados con el tamaño físico total de la carta (incluyendo el margen de sangrado). Es decir, se dibujarán en los límites externos del slot de la carta (ej. `left: 0`, `top: 0`, `width: Ancho total`, `height: Alto total`).

---

## 3. Estrategia de Verificación (Pruebas)

### 3.1. Pruebas Unitarias
- Ejecución de las pruebas unitarias para validar que el motor de layout distribuye las cartas correctamente considerando el tamaño total con el margen de sangrado.

### 3.2. Pruebas Manuales
1. Crear un proyecto y verificar que el "Margen de sangrado" por defecto es `0,5 mm`.
2. Validar en el editor que las capas comienzan desde la esquina superior izquierda del lienzo ampliado sin ningún desplazamiento.
3. Validar en la vista de hojas que las marcas de esquina se sitúan en el borde exterior del slot físico.
