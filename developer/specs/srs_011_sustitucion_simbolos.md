# Especificación Técnica - SRS-011: Motor de Sustitución de Símbolos en Capas de Texto (Borrador Futuro)

## 1. Introducción y Objetivos
- **Módulo**: Rich Text Rules Parser & Auto-complete System.
- **Propósito**: Permitir al usuario escribir atajos o códigos de símbolos (ej. `{R}`, `{A}`, `{tap}`) en el campo de texto de las cartas y que estos se rendericen automáticamente como iconos/símbolos gráficos en el lienzo, además de ofrecer un selector asistido (tipo menú autocomplete).
- **Objetivos**:
  - **Reemplazo en Caliente**: Analizar las cadenas de texto y renderizar nodos HTML con imágenes o glifos correspondientes.
  - **Menú de Autocompletado**: Mostrar un popup contextual al escribir caracteres especiales (como `/` o `{`) en el input del editor para seleccionar de forma rápida los símbolos disponibles del módulo.

---

## 2. Requisitos Funcionales Propuestos

### RF-1: Definición de Símbolos en `module.json`
- Cada módulo podrá especificar en su `module.json` una lista de símbolos mapeados a imágenes o iconos vectoriales:
  ```json
  "simbolos": [
    { "codigo": "{T}", "imagen": "symbols/tap.svg", "nombreLegible": "Girar / Tap" },
    { "codigo": "{R}", "imagen": "symbols/red_mana.svg", "nombreLegible": "Recurso Rojo" }
  ]
  ```

### RF-2: Parser de Texto en Capas de Plantilla
- Al renderizar una capa de texto, el sistema buscará patrones que coincidan con los códigos definidos (ej. entre llaves `{}`) y generará dinámicamente elementos inline (`<img src="..." class="symbol-icon" />`) en lugar de texto plano.
- Los estilos CSS asegurarán que las imágenes de los símbolos se alineen correctamente con la línea de texto (`vertical-align: middle`) y escalen de acuerdo al tamaño de la fuente.

### RF-3: Autocomplete en el Input de Edición
- Al escribir en el panel de edición, si el usuario pulsa un carácter disparador (ej. `/` o abre `{`), aparecerá un pequeño selector flotante debajo del cursor del teclado mostrando las opciones disponibles.
- Al seleccionar una opción con las flechas del teclado y pulsar `Enter`, se insertará el código del símbolo correspondiente en el texto.

---

## 3. Estrategia de Verificación Futura
- Test unitarios para validar que la función de formateo (`parsearTextoConSimbolos`) devuelve los nodos HTML correctos sin romper caracteres de escape ni alterar etiquetas básicas.
- Pruebas manuales en el editor escribiendo `{T}` y verificando que el lienzo se actualiza y muestra el icono del símbolo correspondiente.
