# SRS-082: Descripciones Semánticas y Directrices para IA en Propiedades Expuestas de Plantillas

- **ID del Requisito**: SRS-082
- **Título**: Descripciones Semánticas y Directrices para IA en Propiedades Expuestas de Plantillas
- **Estado**: 📝 Borrador / Futura Planificación
- **Fecha**: 2026-10-18
- **Autor**: Antigravity & Usuario (CDC2 Team)

---

## 1. Introducción y Objetivos

### 1.1. Propósito
Actualmente, las propiedades expuestas en una plantilla de carta (`ExposedProperty`) disponen únicamente de una etiqueta (`label`), la cual suele ser corta (ej. `"Nombre"`, `"Ataque"`, `"Cuerpo"`) para encajar en el inspector lateral. Sin embargo, cuando agentes de Inteligencia Artificial consumen estas plantillas a través de la API REST, una etiqueta breve resulta ambigua o insuficiente para comprender las restricciones de diseño, el tono narrativo, la sintaxis de símbolos especiales o los límites de longitud (ej. "¿admite símbolos entre llaves como `{fuego}`?", "¿cuántas líneas caben sin desbordar?", "¿qué valores son válidos para este selector?").

Esta especificación tiene por objeto incorporar un campo opcional de **Descripción Semántica / Directrices para IA y Maquetadores** (`description`) a cada propiedad expuesta, permitiendo que el diseñador de la plantilla documente el propósito de cada campo directamente en el editor visual y que esta información viaje automáticamente en el esquema entregado a los agentes de IA vía API REST.

### 1.2. Objetivos de Diseño
1. **Enriquecimiento del Contrato Semántico**: Facilitar que los agentes de IA reciban indicaciones claras (directrices de estilo, restricciones de formato, consejos de balanceo) al inspeccionar la plantilla vía `GET /api/v1/projects/:id` o `GET /api/v1/cards/templates/:id`.
2. **Edición Intuitiva en el Editor de Plantillas**: Incorporar en el modal de configuración de campos expuestos un campo de texto multilínea opcional para redactar la descripción.
3. **Ayuda Visual para el Usuario Humano**: Mostrar esta descripción como tooltip o texto de ayuda (`helper text`) en el inspector de propiedades compactas de la vista principal.

---

## 2. Requisitos Funcionales Preliminares (Borrador)

### RF-1: Extensión del Modelo `ExposedProperty`
- Ampliar la interfaz `ExposedProperty` en `shared/layoutEngine.ts`:
  ```typescript
  export interface ExposedProperty {
    layerId: string;
    property: string;
    label: string;
    description?: string; // Directrices semánticas e indicaciones para IA / diseñador
  }
  ```

### RF-2: Editor Visual de Propiedades Expuestas en Plantillas
- En el modal de gestión de capas o propiedades expuestas de la plantilla (`PlantillaModal` o configurador de campos), añadir una columna o campo de edición *"Descripción / Indicaciones para IA"*.
- El campo será opcional y admitirá texto libre explicativo.

### RF-3: Exposición en el Esquema de la API REST (`TemplateFieldSchema`)
- En `shared/apiTypes.ts`, el campo `descripcion` de `TemplateFieldSchema` reflejará el texto definido por el diseñador:
  ```json
  {
    "clave": "campo_habilidades",
    "nombre": "Habilidades Especiales",
    "tipo": "multiline",
    "descripcion": "Texto de reglas de la carta. Soporta símbolos de maná entre llaves como {R}, {G}, {U}. Máximo 4 líneas recomendadas para no reducir el tamaño de fuente."
  }
  ```

### RF-4: Tooltips de Ayuda en el Inspector Compacto
- En el inspector lateral derecho de la vista principal (`App.tsx`), si un campo expuesto posee `description`, mostrar un icono discreto de información (`ℹ️`) o un tooltip enriquecido al posar el cursor sobre la etiqueta de la propiedad.

---

*(Este documento es la base conceptual acordada. Se completará con su arquitectura detallada y estrategia de pruebas cuando se priorice su implementación).*
