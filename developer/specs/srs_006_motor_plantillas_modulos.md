# Especificación Técnica - SRS-006: Motor de Plantillas y Módulo por Defecto (Carga Básica)

## 1. Introducción y Objetivos
- **Módulo**: Core Template & Module Engine (Client).
- **Propósito**: Permitir al usuario añadir una carta basada en una plantilla inicial cargada de forma local y de la manera más simple posible.
- **Alcance**: 
  - La plantilla inicial constará de una carta en blanco, con un título (texto de una sola línea en la parte superior) y un texto en el resto de la carta.
  - Los textos por defecto serán `"Título de la carta"` y `"Texto de la carta"`, respectivamente.
  - Se creará una estructura física de carpetas y archivos locales dentro de la carpeta `modules`.

---

## 2. Caso de Uso: Añadir una carta desde una plantilla por defecto de la aplicación

- **Nombre**: Añadir una carta desde una plantilla por defecto de la aplicación
- **Actor**: Usuario del editor
- **Precondiciones**: Ninguna, abrir el editor y hacerlo.
- **Flujo Principal (Happy Path)**:
  1. El usuario abre la barra de menú superior u otra interfaz de trigger para añadir carta desde plantilla.
  2. El sistema detecta y carga el módulo por defecto (`default/module.json`) y recupera la definición de la plantilla simple (`simple.json`).
  3. El sistema muestra un diálogo o modal para seleccionar la plantilla disponible (en este caso, la plantilla "Simple").
  4. El usuario selecciona la plantilla y confirma la acción ("Aceptar" / "Añadir").
  5. El sistema crea una nueva carta basada en la plantilla "Simple", con los campos inicializados con sus valores por defecto ("Título de la carta" y "Texto de la carta").
  6. **Posicionamiento**: La carta queda añadida en la página en la posición siguiente a la carta seleccionada o, si no hay nada seleccionado, se coloca al final de la lista.
- **Excepciones**:
  - **E1. El usuario cierra y no termina el flujo**: Si el usuario cierra el modal (haciendo clic en la '✕', en "Cancelar", fuera del modal, o pulsando `Escape`), el flujo se cancela y no se añade ninguna carta.

---

## 3. Estructura de Carpetas de Módulos (Carga Local)
Los archivos se guardarán localmente en la carpeta del cliente `client/public/modules/`:
```
client/public/modules/
└── default/
    ├── module.json
    └── templates/
        └── simple.json
```

### 3.1. `module.json`
Contiene los metadatos del módulo default y la referencia a sus plantillas:
```json
{
  "id": "default",
  "nombre": "Módulo por Defecto",
  "version": "1.0.0",
  "plantillas": [
    {
      "id": "simple",
      "nombre": "Plantilla Simple",
      "archivo": "templates/simple.json"
    }
  ]
}
```

### 3.2. `templates/simple.json`
Define el tamaño de la carta y las capas visuales básicas de la plantilla:
```json
{
  "id": "simple",
  "nombre": "Plantilla Simple",
  "anchoMm": 63.5,
  "altoMm": 88.9,
  "camposConfig": [
    {
      "clave": "titulo",
      "nombreLegible": "Título",
      "tipo": "text",
      "valorDefecto": "Título de la carta"
    },
    {
      "clave": "texto",
      "nombreLegible": "Texto",
      "tipo": "text",
      "valorDefecto": "Texto de la carta"
    }
  ],
  "capas": [
    {
      "id": "background",
      "nombre": "Fondo Blanco",
      "tipo": "background",
      "xMm": 0,
      "yMm": 0,
      "anchoMm": 63.5,
      "altoMm": 88.9,
      "colorFill": "#ffffff"
    },
    {
      "id": "titulo",
      "nombre": "Título de la Carta",
      "tipo": "text",
      "xMm": 5,
      "yMm": 5,
      "anchoMm": 53.5,
      "altoMm": 8,
      "contenidoRaw": "{{titulo}}",
      "fontFamily": "sans-serif",
      "fontSizePt": 14,
      "color": "#000000",
      "alineacion": "center",
      "bold": true,
      "italic": false
    },
    {
      "id": "texto",
      "nombre": "Texto de la Carta",
      "tipo": "text",
      "xMm": 5,
      "yMm": 15,
      "anchoMm": 53.5,
      "altoMm": 68.9,
      "contenidoRaw": "{{texto}}",
      "fontFamily": "sans-serif",
      "fontSizePt": 10,
      "color": "#333333",
      "alineacion": "left",
      "bold": false,
      "italic": false
    }
  ]
}
```

---

## 4. Renderizado y Compatibilidad
1. **Lienzo del Editor**: Si una carta posee `plantillaId` y `valoresCampos`, el visor iterará sobre las `capas` definidas en la plantilla cargada:
   - Capas tipo `background`: Se dibuja un contenedor con el color `colorFill`.
   - Capas tipo `text`: Se renderiza el texto obtenido al reemplazar `{{clave}}` por el valor correspondiente en `valoresCampos`.
2. Las capas se posicionarán usando CSS absoluto basado en las dimensiones `xMm`, `yMm`, `anchoMm` y `altoMm` escaladas por el `zoomFactor` (px/mm) actual.
3. El tamaño del texto se calculará dinámicamente con `fontSizePx = fontSizePt * 0.352778 * zoomFactor` para escalar proporcionalmente con el zoom.
4. **Compatibilidad Legacy**: Si la carta no tiene `plantillaId` (es una carta importada mediante imagen), continuará renderizándose con `imagenFrontal` en el slot del lienzo.

---

## 5. Estrategia de Verificación (Pruebas)

### 5.1. Pruebas Automatizadas (Vitest)
Se implementarán pruebas unitarias en `client/src/utils/projectUtils.test.ts` para validar la lógica de inserción posicional `insertarCartaDesdePlantilla`:
- **Caso 1: Inserción sin selección activa**: Verificar que al añadir una carta con `selectedIds = []`, se añade al final del array de cartas.
- **Caso 2: Inserción con una carta seleccionada**: Verificar que al añadir una carta estando seleccionada la carta con ID `X`, la nueva carta se inserta exactamente en el índice posterior a `X`.
- **Caso 3: Inserción con selección múltiple**: Verificar que al añadir una carta estando seleccionadas las cartas con IDs `[X, Y]` (siendo `Y` posterior), la nueva carta se inserta en el índice posterior al mayor índice seleccionado (después de `Y`).

### 5.2. Pruebas Manuales (Checklist de Aceptación)
- [ ] **Acceso y Carga**: Confirmar que al abrir el menú superior **Edición** > **Añadir Carta desde Plantilla...** o el botón del panel lateral se abre el modal selector y se listan correctamente las plantillas disponibles (ej. *Plantilla Simple*).
- [ ] **Cancelación (Excepción E1)**: Verificar que pulsar "Cancelar", hacer clic fuera del modal o presionar la tecla `Escape` cierra el diálogo sin añadir cartas al proyecto.
- [ ] **Añadir sin selección**: Con la lista de cartas vacía o sin seleccionar ninguna, pulsar "Añadir". Comprobar que la nueva carta se añade al final de la baraja en el lienzo.
- [ ] **Añadir con selección**: Seleccionar una carta del lienzo y pulsar "Añadir". Verificar que la nueva carta se renderiza inmediatamente a continuación de la carta seleccionada.
- [ ] **Escalado de Capas**: Modificar el zoom del editor (ej. de `2.5` a `1.5` o `3.5`) y verificar que las capas de fondo, título y texto de reglas escalan de forma perfectamente proporcional.
- [ ] **Visualización en Ficha de Detalle**: Hacer doble clic o inspeccionar la carta basada en plantilla para abrir el modal de detalle (`DetailModal`) y corroborar que el renderizado de la plantilla se muestra correctamente a escala `2.5`.

