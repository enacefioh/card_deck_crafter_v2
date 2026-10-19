/**
 * Contenido oficial del Skill para Agentes de IA que interactúan con Card Deck Crafter v2.
 * Compatible con Antigravity, Cursor, Claude Code y OpenAI Code Interpreter.
 */
export const AGENT_SKILL_MARKDOWN = `---
name: card-deck-crafter
description: Protocolo e instrucciones de API REST para que agentes de IA diseñen, automaticen, generen y validen cartas y barajas (con anverso y reverso) en Card Deck Crafter v2.
---

# Card Deck Crafter v2 - Agent Skill & Protocolo REST API

Este Skill dota a cualquier agente de Inteligencia Artificial de las instrucciones y capacidades necesarias para interactuar con **Card Deck Crafter v2** (CDC2). Permite crear proyectos en la nube, estructurar barajas en documentos, inyectar cartas con anverso y reverso basados en plantillas, validar el diseño mediante previsualizaciones PNG a 300 DPI y descargar el archivo final \`.cdc2\` listo para imprimir o editar.

---

## 1. Servidor por Defecto, Parámetros y Autenticación

### 1.1. Host Base del Servidor
- **URL por Defecto (Producción Oficial)**: \`https://cdc2.enacefio.com\`
- **Entorno Local / Autoalojado**: \`http://localhost:3000\` o \`http://localhost:80\`

> El agente debe utilizar \`https://cdc2.enacefio.com\` como servidor base salvo que el usuario indique explícitamente una URL local o alternativa.

### 1.2. Parámetros que el Agente Debe Solicitar al Usuario
Antes de ejecutar llamadas a la API, el agente debe verificar o solicitar al usuario:
1. **API Key (\`X-API-Key\`)**: Clave de acceso con prefijo \`cdc2_live_...\`. El usuario puede generarla en CDC2 accediendo a su menú de usuario > **🔑 Acceso API** o en el modal de **Mis Proyectos en la Nube**.
2. **ID del Proyecto (\`projectId\`)**:
   - **Si el usuario ya tiene un proyecto creado**: Solicitar el ID del proyecto (visible y copiable con un clic desde la tarjeta del proyecto en CDC2).
   - **Si se desea crear un proyecto nuevo**: Solicitar el ID de la plantilla base (\`templateId\`) y el nombre para el proyecto. El agente creará el proyecto mediante \`POST /api/v1/projects\`.

### 1.3. Cabeceras HTTP Obligatorias
Todas las peticiones a la API deben incluir:
\`\`\`http
X-API-Key: cdc2_live_TU_API_KEY_AQUI
Content-Type: application/json
\`\`\`

---

## 2. Flujo de Trabajo Recomendado para Agentes

Cuando el usuario solicite diseñar o generar cartas:

1. **Verificar Parámetros**:
   - Si no dispone de la API Key: solicitarla cordialmente al usuario indicando dónde obtenerla en la plataforma.
   - Si no se indicó un \`projectId\`: consultar al usuario si desea trabajar sobre un proyecto existente (pidiendo su ID) o crear uno nuevo (pidiendo el \`templateId\` de la plantilla y el nombre).
2. **Inspeccionar Plantillas (\`exposedFields\` vs \`fullStructure\`)**:
   - Consultar el esquema del proyecto (\`GET /api/v1/projects/:id\`) o de la plantilla pública (\`GET /api/v1/templates/:id/schema\`).
   - Priorizar los campos listados en **\`exposedFields\`** (variables de diseño pensadas para ser rellenadas). Consultar **\`fullStructure\`** únicamente si se requiere manipular capas técnicas internas.
3. **Estructurar Documentos y Modo de Reversos**:
   - Para cartas con reverso, asegurar que el documento tenga configurado \`modoTraseras: "individual"\` (o \`"comun"\` si comparten una imagen fija).
4. **Inyectar Cartas con Anverso y Reverso**:
   - Enviar cartas mediante \`POST /api/v1/projects/:id/cards\` usando \`cardTemplateId\` (anverso), \`backCardTemplateId\` (reverso con plantilla), campos (\`fields\` / \`backFields\`) e ilustraciones (\`images\` / \`backImages\` en Base64 o URLs remotas).
5. **Validar Visualmente y Entregar**:
   - Descargar previsualizaciones PNG (\`?side=front\` y \`?side=back\`) para verificar balance visual.
   - Facilitar al usuario el enlace de descarga del archivo binario \`.cdc2\` (\`GET /api/v1/projects/:id/download\`).

---

## 3. Endpoints Principales (Base: https://cdc2.enacefio.com)

### 3.1. Inspeccionar Plantilla y Esquema Dual
\`\`\`http
GET https://cdc2.enacefio.com/api/v1/templates/:templateId/schema
GET https://cdc2.enacefio.com/api/v1/projects/:projectId
\`\`\`
Devuelve un objeto de diseño con dos apartados fundamentales:
- **\`exposedFields\`**: Array de campos que el diseñador de la plantilla marcó para ser editados (\`clave\`, \`nombre\`, \`tipo\`, \`descripcion\`). **El agente debe priorizar estos campos y leer atentamente \`descripcion\`**, ya que contiene las directrices semánticas y estilísticas del creador (ej. \`"Tamaño Fuente (PT) de Nombre_Monstruo (Nombre del monstruo, siempre debe ir en mayúsculas)"\`).
- **\`fullStructure\`**: Jerarquía técnica de todas las capas (\`id\`, \`nombre\`, \`tipo\`, \`descripcion\`, dimensiones, texto base) para modificaciones avanzadas.

### 3.2. Crear Proyecto en la Nube
\`\`\`http
POST https://cdc2.enacefio.com/api/v1/projects
Content-Type: application/json

{
  "templateId": "ID_DE_LA_PLANTILLA_BASE",
  "name": "Expansión Fantasía - Baraja Épica",
  "description": "50 cartas con anverso y reverso diseñadas por Agente IA",
  "modoTraseras": "individual"
}
\`\`\`

### 3.3. Crear Documentos Adicionales (Multidocumento)
\`\`\`http
POST https://cdc2.enacefio.com/api/v1/projects/:projectId/documents
Content-Type: application/json

{
  "nombre": "Mazo Criaturas Aladas",
  "modoTraseras": "individual"
}
\`\`\`

### 3.4. Añadir Cartas con Anverso y Reverso (Plantillas y Overrides)
\`\`\`http
POST https://cdc2.enacefio.com/api/v1/projects/:projectId/cards
Content-Type: application/json

{
  "documentId": "ID_DEL_DOCUMENTO_OPCIONAL",
  "cards": [
    {
      "name": "Dragón de la Tormenta",
      "count": 2,
      "cardTemplateId": "template_criatura_frontal",
      "fields": {
        "Nombre": "Dragón de la Tormenta",
        "Coste": "4",
        "Reglas": "**Vuelo**. Al entrar, destruye una criatura enemiga."
      },
      "images": {
        "Ilustracion": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="
      },
      "backCardTemplateId": "template_criatura_trasera",
      "backFields": {
        "Lore": "Nacido en el vórtice de las cumbres prohibidas.",
        "Nivel": "Rango Élite"
      },
      "backImages": {
        "Emblema": "https://ejemplo.com/emblema_dragon.png"
      }
    }
  ]
}
\`\`\`

### 3.5. Modificar una Carta Existente
\`\`\`http
PUT https://cdc2.enacefio.com/api/v1/projects/:projectId/cards/:cardId
Content-Type: application/json

{
  "name": "Dragón de la Tormenta Ancestral",
  "count": 3,
  "fields": {
    "Coste": "5"
  },
  "backFields": {
    "Lore": "Antiguo señor de los cielos desatados."
  }
}
\`\`\`

### 3.6. Validar Visualmente con Previsualización PNG (300 DPI)
\`\`\`http
# Cara Frontal (por defecto o side=front)
GET https://cdc2.enacefio.com/api/v1/projects/:projectId/cards/:cardId/preview?side=front&dpi=300

# Cara Trasera (side=back)
GET https://cdc2.enacefio.com/api/v1/projects/:projectId/cards/:cardId/preview?side=back&dpi=300
\`\`\`

### 3.7. Descarga del Proyecto CDC2
\`\`\`http
GET https://cdc2.enacefio.com/api/v1/projects/:projectId/download
\`\`\`
Descarga el archivo \`.cdc2\` empaquetado para entregarlo al usuario humano o guardarlo localmente.

---

## 4. Códigos de Estado y Manejo de Cuotas

- **200 OK / 201 Created**: Operación completada satisfactoriamente.
- **400 Bad Request**: Parámetros obligatorios faltantes o identificador de plantilla inválido.
- **401 Unauthorized**: Falta la cabecera \`X-API-Key\` o la clave es incorrecta.
- **404 Not Found**: El proyecto, documento, carta o plantilla no existe.
- **413 Payload Too Large / QUOTA_EXCEEDED**: El usuario ha alcanzado el límite de almacenamiento asignado en su cuenta.
- **500 Internal Server Error**: Error en el motor de renderizado o procesamiento.
`;
