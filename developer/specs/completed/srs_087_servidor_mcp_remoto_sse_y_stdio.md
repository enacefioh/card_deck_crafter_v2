# SRS-087: Servidor MCP (Model Context Protocol) con Transporte Remoto SSE y Stdio

- **ID de Especificación**: SRS-087
- **Título**: Servidor MCP (Model Context Protocol) Integrado con Transporte Remoto SSE y CLI Stdio
- **Estado**: 🟡 Activo / En Definición
- **Fecha**: 2026-10-23
- **Autor**: Asistente de IA (Antigravity) & Usuario (enacefioh)
- **Hitos Previos**:
  - [SRS-077: Motor API REST de Generación de Cartas e IA](file:///c:/Users/victo/proyectos/cdc2/developer/specs/completed/srs_077_motor_api_rest_generacion_cartas_ia_plantillas_publicas.md)
  - [SRS-078: Sistema de Autenticación de API Keys de Usuarios Registrados](file:///c:/Users/victo/proyectos/cdc2/developer/specs/completed/srs_078_sistema_autenticacion_api_keys_usuarios_registrados.md)
  - [SRS-079: Motor REST de Proyectos en la Nube y Multidocumento](file:///c:/Users/victo/proyectos/cdc2/developer/specs/completed/srs_079_motor_rest_proyectos_nube_multidocumento_y_cartas_ia.md)
  - [SRS-081: Reversos de Plantillas y Skill Docs para Agentes](file:///c:/Users/victo/proyectos/cdc2/developer/specs/completed/srs_081_reversos_plantillas_y_skill_docs.md)
  - [SRS-082: Descripciones Semánticas para Automatización con IA](file:///c:/Users/victo/proyectos/cdc2/developer/specs/completed/srs_082_descripciones_semanticas.md)

---

## 1. Introducción y Objetivos

### 1.1. Propósito
Dotar a **Card Deck Crafter v2 (CDC2)** de un **Servidor MCP (Model Context Protocol)** oficial y estandarizado, basado en el SDK de Anthropic (`@modelcontextprotocol/sdk`). 

A diferencia de la documentación de texto estática en Markdown ([SRS-081](file:///c:/Users/victo/proyectos/cdc2/developer/specs/completed/srs_081_reversos_plantillas_y_skill_docs.md)), el servidor MCP expone un protocolo interactivo en tiempo real (JSON-RPC 2.0) que permite a cualquier agente o aplicación compatible con MCP (Claude Desktop, Cursor, Antigravity, Windsurf, Cline, LibreChat, etc.) interactuar directamente con la cuenta del usuario para **consultar plantillas, crear proyectos multidocumento, maquetar cartas e inspeccionar previsualizaciones gráficas de manera autónoma**.

### 1.2. Objetivos de Diseño
1. **Acceso Remoto Nativo (SSE)**: Exponer endpoints de Server-Sent Events en el servidor Express (`/mcp/sse` y `/mcp/messages`) para que usuarios y agentes puedan conectarse en remoto a su Raspberry Pi o servidor cloud sin necesidad de instalar el código en local.
2. **Acceso Local por Terminal (`stdio`)**: Disponer de un binario/wrapper CLI ejecutable (`node dist/mcp/cli.js` o `npx cdc2-mcp`) para entornos de escritorio que se comunican exclusivamente por entrada/salida estándar.
3. **Autenticación Unificada (Reutilización de API Keys SRS-078)**: El servidor MCP valida las credenciales a través de la cabecera `Authorization: Bearer <API_KEY>`, reutilizando el almacén de claves seguras y garantizando que cada agente opere exclusivamente sobre los proyectos del usuario autenticado.
4. **Catálogo Completo de Herramientas (Tools)**: Mapeo directo y tipado de los endpoints de negocio existentes en `/api/v1/` mediante esquemas estructurados JSON Schema / Zod.
5. **Arquitectura Modular y Extensible**: Diseñar el registro de herramientas de manera que cualquier nueva funcionalidad o endpoint futuro de CDC2 pueda exponerse al MCP simplemente añadiendo una definición de herramienta.
6. **Integración en la Documentación de Desarrolladores**: Añadir en el portal `/docs/api` una pestaña interactiva para MCP con bloques de configuración listos para copiar y pegar en Claude Desktop, Cursor y otros clientes.

---

## 2. Arquitectura del Servidor MCP

```
+-------------------------------------------------------------------------------+
|                        CLIENTES DE IA (MCP CLIENTS)                           |
|   Claude Desktop  |  Cursor / Windsurf  |  Antigravity / Cline  |  LibreChat  |
+---------------------------------------+---------------------------------------+
                                        |
                   Transporte Remoto     |     Transporte Local
                   (HTTP SSE / POST)    |     (stdio CLI bridge)
                                        |
                                        v
+-------------------------------------------------------------------------------+
|                       CDC2 BACKEND (EXPRESS APP)                              |
|                                                                               |
|  [ Middleware Auth API Key (SRS-078) ] -> Valida Bearer Token                 |
|                                                                               |
|  +-------------------------------------------------------------------------+  |
|  |                 SERVIDOR MCP (@modelcontextprotocol/sdk)                |  |
|  |                                                                         |  |
|  |  * Endpoints HTTP SSE:   GET  /mcp/sse                                  |  |
|  |                          POST /mcp/messages?sessionId=...               |  |
|  |  * CLI Stdio:            cdc2-mcp --url <url> --key <key>               |  |
|  |                                                                         |  |
|  |  * Protocolo JSON-RPC 2.0:                                              |  |
|  |    - Tools (Herramientas ejecutables para el LLM)                       |  |
|  |    - Resources (Acceso declarativo a proyectos y esquemas)              |  |
|  |    - Prompts (Instrucciones guiadas para el agente)                     |  |
|  +-------------------------------------+-----------------------------------+  |
|                                        |                                      |
|                                        v                                      |
|  +-------------------------------------------------------------------------+  |
|  |                     CAPA DE SERVICIOS (CDC2 CORE)                       |  |
|  |  projectArchiveService  |  userStorageService  |  cardEngineService     |  |
|  +-------------------------------------------------------------------------+  |
+-------------------------------------------------------------------------------+
```

---

## 3. Requisitos Funcionales

### RF-1: Transportes del Protocolo MCP
- **RF-1.1 (Transporte Remoto SSE)**:
  - Ruta de inicialización: `GET /mcp/sse`.
  - El cliente se conecta enviando la cabecera `Authorization: Bearer <API_KEY>` (o parámetro de consulta `?apiKey=...`).
  - El servidor inicializa una sesión SSE mediante `SSEServerTransport`, devuelve las cabeceras `Content-Type: text/event-stream`, genera un `sessionId` único y emite el evento `endpoint` indicando la URI de envío de mensajes.
  - Ruta de mensajes: `POST /mcp/messages?sessionId=<sessionId>`, recibiendo las invocaciones JSON-RPC del cliente y enviando las respuestas por el stream SSE abierto.
  - Al cerrar la conexión HTTP, el servidor limpia la sesión asociada de memoria.
- **RF-1.2 (Transporte Stdio CLI)**:
  - Se proveerá un script ejecutable (`server/src/mcp/cli.ts` / paquete CLI) que utiliza `StdioServerTransport` para comunicarse con Claude Desktop u otros clientes que ejecutan subprocesos locales.
  - El CLI admite parámetros `--url <URL_SERVIDOR>` y `--key <API_KEY>` (o variables de entorno `CDC2_SERVER_URL` y `CDC2_API_KEY`) para redirigir las llamadas al backend de CDC2.

### RF-2: Autenticación y Control de Sesión
- **RF-2.1**: Toda petición entrante al transporte SSE debe validar la API Key contra la base de datos de usuarios (`userStorageService.verifyApiKey`).
- **RF-2.2**: Si la clave es inválida, expirada o ausente, la conexión SSE se rechaza inmediatamente con código `401 Unauthorized`.
- **RF-2.3**: Las herramientas ejecutadas dentro de la sesión heredan el contexto del usuario autenticado (`userId`), impidiendo cualquier acceso o manipulación de proyectos ajenos.

### RF-3: Catálogo de Herramientas (Tools de MCP)
Cada herramienta se registrará con nombre canónico, descripción clara con semántica para LLMs y su esquema JSON de argumentos:

1. **`cdc2_list_projects`**:
   - *Descripción*: Lista los proyectos en la nube (`.cdc2`) del usuario autenticado con su ID, nombre, número de cartas y fecha de modificación.
   - *Parámetros*: Ninguno obligatorio.
   - *Retorno*: `{ projects: [{ id, name, description, cardCount, documentCount, updatedAt }] }`.

2. **`cdc2_get_project`**:
   - *Descripción*: Obtiene la estructura interna de un proyecto (documentos, plantillas instaladas, configuración de mesa y resumen de cartas).
   - *Parámetros*: `projectId` (string, obligatorio).
   - *Retorno*: Metadatos completos y array de documentos con sus cartas.

3. **`cdc2_create_project`**:
   - *Descripción*: Crea un nuevo proyecto en la nube clonando una plantilla base (pública o privada del usuario).
   - *Parámetros*:
     - `name` (string, obligatorio): Nombre del proyecto.
     - `templateId` (string, obligatorio): ID de la plantilla origen (ej. `standard-poker`, `tarot`, o ID de plantilla de la tienda).
     - `description` (string, opcional): Descripción informativa.
   - *Retorno*: Metadatos del nuevo proyecto creado con ID asignado.

4. **`cdc2_list_documents`**:
   - *Descripción*: Lista los documentos independientes (mazos/secciones) contenidos en un proyecto.
   - *Parámetros*: `projectId` (string, obligatorio).
   - *Retorno*: `{ documents: [{ id, nombre, cardCount }] }`.

5. **`cdc2_create_document`**:
   - *Descripción*: Añade un nuevo documento (mazo) dentro de un proyecto multidocumento.
   - *Parámetros*:
     - `projectId` (string, obligatorio).
     - `nombre` (string, obligatorio): Nombre del documento (ej. *"Mazo Fuego"*, *"Cartas de Objeto"*).
   - *Retorno*: Documento creado con su ID.

6. **`cdc2_get_template_schema`**:
   - *Descripción*: Inspecciona los campos editables, propiedades expuestas, descripciones semánticas y dimensiones de una plantilla. Crucial para que el agente sepa qué campos rellenar.
   - *Parámetros*:
     - `templateId` (string, obligatorio).
     - `projectId` (string, opcional): Si la plantilla está contenida dentro de un proyecto específico.
   - *Retorno*: `{ templateId, name, widthMm, heightMm, exposedProperties, semanticDescriptions }`.

7. **`cdc2_add_cards`**:
   - *Descripción*: Inserción de una o varias cartas en un documento del proyecto, especificando sus textos, imágenes (en Base64 Data URL o URL remota) y overrides.
   - *Parámetros*:
     - `projectId` (string, obligatorio).
     - `documentId` (string, opcional): Si se omite, se insertan en el primer documento.
     - `cards` (array de objetos, obligatorio): Cada carta contiene `nombre`, `cantidad`, `valoresCampos` (diccionario clave/valor), `capasOverrides` (opcional).
   - *Retorno*: `{ addedCardsCount, cards: [{ id, nombre }] }`.

8. **`cdc2_update_card`**:
   - *Descripción*: Modifica los valores textuales o estilos de una carta concreta ya existente.
   - *Parámetros*:
     - `projectId` (string, obligatorio).
     - `cardId` (string, obligatorio).
     - `valoresCampos` (objeto, opcional): Campos a actualizar.
     - `capasOverrides` (objeto, opcional): Overrides visuales a actualizar.
   - *Retorno*: `{ success: true, updatedCard }`.

9. **`cdc2_delete_card`**:
   - *Descripción*: Elimina una carta del proyecto.
   - *Parámetros*: `projectId` (string), `cardId` (string).
   - *Retorno*: `{ success: true }`.

10. **`cdc2_render_card_preview`**:
    - *Descripción*: Renderiza una carta específica del proyecto a imagen PNG de alta fidelidad para que el modelo la evalúe visualmente.
    - *Parámetros*:
      - `projectId` (string, obligatorio).
      - `cardId` (string, obligatorio).
      - `face` (string, opcional: `"front"` o `"back"`).
    - *Retorno*: Imagen PNG embebida en base64 en la respuesta del protocolo MCP para inspección multimodelo.

### RF-4: Recursos Declarativos (MCP Resources)
- Exponer URIs de lectura directa:
  - `cdc2://projects/{id}`: Devuelve el manifiesto JSON del proyecto.
  - `cdc2://templates/{id}`: Devuelve el esquema JSON de la plantilla.

### RF-5: Extensibilidad Modular para el Futuro
- El registro de herramientas se estructurará en un directorio desacoplado `server/src/mcp/tools/`:
  - Cada herramienta implementa una interfaz estándar:
    ```typescript
    export interface McpToolDefinition {
      name: string;
      description: string;
      parameters: z.ZodObject<any> | any;
      execute: (args: any, context: McpRequestContext) => Promise<any>;
    }
    ```
  - Cuando se implementen nuevas funciones en CDC2 (ej. exportación masiva a PDF, gestión de símbolos, estadísticas de mazo), bastará con añadir un nuevo archivo de herramienta en dicha carpeta y registrarlo en el índice del MCP.

### RF-6: Documentación Interactiva en la Interfaz Web (`/docs/api`)
- En el panel de Documentación de Desarrolladores ([`DeveloperDocs.tsx`](file:///c:/Users/victo/proyectos/cdc2/client/src/docs/DeveloperDocs.tsx)):
  - Incorporar una nueva pestaña o bloque destacado **"Model Context Protocol (MCP)"**.
  - Explicación de cómo conectar Claude Desktop, Cursor y otros agentes.
  - Selector dinámico de API Key del usuario: al seleccionar una clave generada, el bloque JSON se autocompleta con su token real.
  - Botón de un solo clic para **"Copiar configuración MCP"** para `claude_desktop_config.json` y `cursor`.

---

## 4. Plan de Implementación

### Fase 1: Dependencias y Estructura del Servidor MCP
1. Añadir `@modelcontextprotocol/sdk` y `zod` a `server/package.json`.
2. Crear el módulo `server/src/mcp/`:
   - `server/src/mcp/server.ts`: Inicialización del `McpServer`.
   - `server/src/mcp/tools/`: Definición de las 10 herramientas descritas en RF-3.
   - `server/src/mcp/transport/sse.ts`: Manejador de Express para `/mcp/sse` y `/mcp/messages`.

### Fase 2: Integración en Express y Autenticación
1. Conectar las rutas SSE en `server/src/index.ts` protegidas por el middleware de API Keys.
2. Comprobar gestión de sesiones concurrentes y desconexión ordenada.

### Fase 3: Pruebas Unitarias y de Integración
1. Crear `server/src/mcp/mcpServer.test.ts` utilizando el `Client` del SDK de MCP para verificar:
   - Conexión, saludo e intercambio de capacidades (*handshake*).
   - Listado de herramientas (`tools/list`).
   - Ejecución de `cdc2_list_projects`, `cdc2_get_template_schema`, `cdc2_add_cards` y `cdc2_render_card_preview`.
   - Rechazo de peticiones con API Keys no válidas.

### Fase 4: Frontend y Documentación Interactiva
1. Actualizar `client/src/docs/DeveloperDocs.tsx` con la nueva sección y ejemplos de configuración para Claude Desktop y Cursor.
2. Verificar tests del frontend (`DeveloperDocs.test.tsx` y `SRS079ApiDeveloperDocs.test.tsx`).
3. Compilación de cliente, construcción de imagen Docker y reinicio de contenedores.

---

## 5. Criterios de Aceptación y Verificación

- [ ] Un cliente MCP estándar (o test de integración) puede conectarse vía SSE a `/mcp/sse` con `Authorization: Bearer <API_KEY>`.
- [ ] El cliente recibe la lista completa de herramientas de CDC2 con sus descripciones y parámetros tipados.
- [ ] La invocación de `cdc2_add_cards` añade cartas correctamente a un proyecto en la nube del usuario y se reflejan en el editor web.
- [ ] La invocación de `cdc2_render_card_preview` devuelve una imagen válida legible por modelos multimodales.
- [ ] En `/docs/api` el usuario puede copiar con un clic la configuración JSON con su API Key incrustada.
- [ ] La suite de tests automatizados pasa al 100% y Docker compila sin errores.
