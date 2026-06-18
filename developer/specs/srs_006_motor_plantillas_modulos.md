# Especificación Técnica - SRS-006: Motor de Módulos y Plantillas Dinámicas (.cdc2t y Símbolos Inline)

## 1. Introducción y Objetivos
- **Módulo**: Core Template & Module Engine (Client + Server).
- **Propósito**: Permitir al usuario crear barajas dinámicas a partir de plantillas estructuradas agrupadas en módulos lógicos (.cdc2t). Facilita el autocompletado interactivo de iconos y símbolos inline en las cartas (como maná de MTG o iconos de fuerza en juegos de miniaturas).
- **Objetivos de Diseño**:
  - **Desacoplamiento Absoluto**: Separar el diseño visual (plantilla en el módulo) de los datos del proyecto (textos e imágenes específicas de las cartas en el proyecto).
  - **Portabilidad Autónoma**: Permitir incrustar módulos personalizados dentro del archivo de proyecto `.cdc2` para evitar dependencias rotas al compartir barajas.
  - **UX Ágil de Autocompletado**: Entrada de texto con autocompletado mediante disparador `/` que diferencie de manera inteligente entre un símbolo lúdico (ej. `/W`) y una barra divisoria estándar (ej. `3/3`).

---

## 2. Requisitos Funcionales y Casos de Uso

### RF-1: Estructura del Módulo de Plantillas (`.cdc2t`)
- **RF-1.1**: Un módulo se distribuirá como un archivo ZIP con extensión `.cdc2t` y contendrá obligatoriamente:
  - `module.json`: Metadatos del módulo y definición de símbolos disponibles.
  - `templates/`: Ficheros JSON estructurados con las capas y variables requeridas de cada plantilla (siguiendo el esquema de capas de la SRS-002).
  - `assets/`: Imágenes de marcos, texturas e iconos.
- **RF-1.2**: Estructura del archivo `module.json`:
  ```json
  {
    "id": "mtg_base_v1",
    "nombre": "Mapeador de Magic: The Gathering",
    "version": "1.0.0",
    "autor": "CDC Team",
    "simbolos": [
      { "token": "{W}", "atajo": "/W", "nombre": "Maná Blanco", "archivo": "assets/mana_w.svg" },
      { "token": "{R}", "atajo": "/R", "nombre": "Maná Rojo", "archivo": "assets/mana_r.svg" }
    ],
    "plantillas": [
      { "id": "criatura", "nombre": "Plantilla de Criatura", "archivo": "templates/criatura.json" }
    ]
  }
  ```

### RF-2: Integración y Portabilidad del Proyecto (`.cdc2`)
- **RF-2.1**: El archivo `project.json` del proyecto guardará un listado de los IDs de los módulos requeridos (`modulosRequeridos: string[]`).
- **RF-2.2**: Al guardar el proyecto, el editor ofrecerá la opción de **"Incrustar módulos personalizados"**. Si se activa, los archivos `.cdc2t` de los módulos no-nativos se guardarán dentro de la carpeta `modules/` dentro del ZIP `.cdc2`.
- **RF-2.3**: Al abrir un archivo `.cdc2`, el cliente comprobará las dependencias. Si un módulo requerido no está preinstalado en la app y está incrustado en el ZIP, lo extraerá y cargará de forma temporal en memoria.

### RF-3: Autocompletado de Símbolos en la UI (UX de la barra `/`)
- **RF-3.1**: Los campos de texto de las plantillas marcados con `"permiteSimbolos": true` habilitarán la ayuda interactiva de símbolos.
- **RF-3.2**: Al pulsar la tecla barra diagonal `/`, se desplegará un menú emergente flotante (Popover) sobre la caja de texto.
- **RF-3.3**: El menú flotante tendrá el siguiente comportamiento:
  - La **primera opción** siempre será la propia barra diagonal literal `/` (para casos como escribir `3/3`).
  - Si el usuario pulsa `/` una segunda vez consecutiva, se seleccionará la primera opción de forma automática, insertando un carácter `/` literal en el input y cerrando el popover.
  - El usuario puede seguir escribiendo (ej. `/w`). La lista de símbolos del menú se filtrará dinámicamente en base al texto escrito.
  - Si el usuario pulsa `Espacio` o selecciona un elemento del menú, la abreviatura se sustituirá en el campo por el token formal del símbolo (ej. `{W}`).
  - Si escribe una abreviatura no existente (ej. `/j`) y continúa escribiendo, se mantendrá el texto literal `/j` sin alterar la carta.

### RF-4: Renderizado de Símbolos Inline (Cliente y Servidor)
- **RF-4.1**: El parser del motor de previsualización (React) y el backend de exportación (Puppeteer HTML) interceptarán el texto de las capas.
- **RF-4.2**: Cualquier token como `{W}` se reemplazará por una etiqueta de imagen inline:
  ```html
  <img src="file:///ruta_temporal_modulo/assets/mana_w.svg" class="inline-symbol" style="height: 1em; vertical-align: middle;" />
  ```

---

## 3. Arquitectura y Estructura de Datos

### Interfaces de Datos Extendidas (TypeScript)
```typescript
export interface SimboloConfig {
  token: string;    // Ej: "{W}"
  atajo: string;    // Ej: "/W"
  nombre: string;   // Ej: "Maná Blanco"
  archivo: string;  // Ruta relativa dentro del ZIP .cdc2t
}

export interface MetadatosModulo {
  id: string;
  nombre: string;
  version: string;
  autor: string;
  simbolos: SimboloConfig[];
  plantillas: { id: string; nombre: string; archivo: string; }[];
}

export interface ProyectoCDC2 {
  version: "2.0.0";
  meta: any;
  canvasConfig: any;
  cardConfig: any;
  modoTraseras: any;
  imagenTraseraComun: any;
  cards: Carta[];
  modulosRequeridos: string[]; // [NEW]
}
```

---

## 4. Estrategia de Verificación (Pruebas)

### 4.1. Pruebas Unitarias Automatizadas (Vitest)
1.  **Test del Parser de Texto (Inline symbols)**:
    *   Entrada: Texto `"Coste: {W}{W} y {R}"` con diccionario de imágenes de símbolos en rutas temporales.
    *   Salida esperada: HTML formateado con las imágenes correspondientes sustituyendo a los tokens.
2.  **Test de Doble Barra (Literal divisor)**:
    *   Verificar que la entrada de texto `3/3` no realiza ninguna transformación de tokens y se renderiza como texto plano.

### 4.2. Pruebas Manuales (Checklist de Aceptación)
- [ ] Activar un módulo con autocompletado y situar el cursor en un campo de descripción.
- [ ] Pulsar `/` una vez. Verificar que se despliega el popover.
- [ ] Pulsar `/` otra vez. Confirmar que se escribe `/` en el input y se cierra el menú flotante.
- [ ] Escribir `/w` y pulsar espacio. Verificar que el texto cambia automáticamente al token `{W}` en el campo de texto y que la carta previsualizada dibuja el icono de maná blanco.
- [ ] Escribir `/j` y verificar que el texto permanece como `/j` sin generar errores ni renderizar iconos inexistentes.
- [ ] Guardar el proyecto con un módulo personalizado incrustado, abrirlo en un navegador en limpio y comprobar que las plantillas y los iconos del módulo se cargan inmediatamente.
