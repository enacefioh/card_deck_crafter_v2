# SRS-078: Sistema de Autenticación con API Keys para Usuarios Registrados y Gestión en Modal de Almacenamiento

---

## 1. Introducción y Objetivos

### Propósito
Proveer un sistema seguro y estandarizado de generación, validación y revocación de **API Keys** (`cdc2_live_...`) vinculadas a cuentas de usuario registradas en Card Deck Crafter v2 (CDC2). Este sistema permite a agentes de Inteligencia Artificial (Claude, ChatGPT, Cursor, agentes MCP o scripts externos) interactuar de forma programática y autorizada con los recursos de la plataforma en nombre de un usuario legítimo.

Asimismo, esta especificación integra la gestión de tokens y la visualización de rutas del API directamente en el modal de almacenamiento en la nube (`CloudProjectsModal`), proporcionando una experiencia centralizada donde el usuario gestiona sus proyectos, plantillas y accesos programáticos sin salir de su flujo de trabajo.

### Objetivos de Diseño
- **Seguridad Criptográfica**: Las API Keys se generan como tokens pseudoaleatorios de alta entropía con prefijo identificativo (`cdc2_live_`). En base de datos únicamente se almacena el hash criptográfico (SHA-256) y un prefijo público para visualización; el secreto en texto plano solo se muestra una vez al momento de su creación.
- **Acceso Exclusivo a Usuarios Registrados**: Solo los usuarios con sesión activa pueden crear y revocar sus propias claves.
- **Middleware Unificado de Autenticación**: El backend debe permitir autenticar peticiones tanto mediante cookies de sesión tradicionales (`session_token`) como mediante cabeceras estándar de API (`X-API-Key: cdc2_live_...` o `Authorization: Bearer cdc2_live_...`).
- **Trazabilidad y Control**: Cada clave registra su fecha de creación, último uso y nombre identificativo (ej. "Cursor Agent", "Discord Bot"), permitiendo revocar claves comprometidas o en desuso de forma instantánea.
- **UI Integrada en CloudProjectsModal**: Pestaña dedicada con interfaz reactiva para listar claves, generar nuevas claves, copiar el secreto al portapapeles y consultar accesos rápidos a las rutas de la API.

---

## 2. Requisitos Funcionales y Casos de Uso

### RF-1: Esquema de Base de Datos y Persistencia de API Keys
- **Descripción**: Crear la tabla `user_api_keys` mediante una migración formal de SQLite en `server/src/db/migrations.ts` (versión 6).
- **Criterios de Aceptación**:
  - Campos obligatorios:
    - `id`: Identificador único UUID de la clave.
    - `user_id`: Referencia a `users(id)` con eliminación en cascada (`ON DELETE CASCADE`).
    - `name`: Nombre descriptivo asignado por el usuario (ej. "Agente Claude", "Script Local").
    - `key_hash`: Hash SHA-256 del token completo en formato hexadecimal (64 caracteres).
    - `prefix`: Primeros 16 caracteres de la clave legible para identificación visual (ej. `cdc2_live_a1b2...`).
    - `last_used_at`: Timestamp ISO de la última petición exitosa realizada con la clave (o `NULL` si no se ha usado).
    - `created_at`: Timestamp ISO de creación.
  - Índices:
    - Índice único o de búsqueda rápida en `key_hash` para resolución $O(1)$ en middleware.
    - Índice en `(user_id, created_at DESC)` para listados rápidos.

### RF-2: Ciclo de Vida de API Keys (Generación, Listado y Revocación)
- **Descripción**: Endpoints protegidos por sesión de usuario para la gestión de claves:
  - `GET /api/auth/api-keys`: Devuelve la lista de claves activas del usuario autenticado (sin el secreto completo).
  - `POST /api/auth/api-keys`: Genera una nueva clave a partir de un nombre recibido en el cuerpo JSON `{ name: string }`.
  - `DELETE /api/auth/api-keys/:id`: Revoca y elimina permanentemente la clave indicada perteneciente al usuario.
- **Criterios de Aceptación**:
  - Al crear una clave:
    - Formato del token en texto plano: `cdc2_live_` seguido de 32 bytes aleatorios codificados en hexadecimal (64 caracteres alfanuméricos).
    - La respuesta devuelve `{ id, name, prefix, createdAt, apiKey }` donde `apiKey` es el secreto completo.
    - Se debe registrar `last_used_at = null`.
  - Al listar claves:
    - La respuesta incluye `{ id, name, prefix, createdAt, lastUsedAt }` para cada clave. En ningún caso se devuelve el `apiKey` completo ni el `key_hash`.
  - Al revocar una clave:
    - Un usuario solo puede revocar sus propias claves. Intentar revocar una clave ajena devuelve `404 Not Found` o `403 Forbidden`.

### RF-3: Middleware de Autenticación Express por API Key
- **Descripción**: Middleware en `server/src/auth/` que valida la presencia y autenticidad de una API Key en las cabeceras HTTP.
- **Criterios de Aceptación**:
  - Detección de cabeceras soportadas:
    - `X-API-Key: <token>`
    - `Authorization: Bearer <token>`
  - Proceso de validación:
    1. Si el token tiene formato `cdc2_live_...`, se calcula su SHA-256.
    2. Se busca en la tabla `user_api_keys`. Si no existe o el usuario asociado no es válido, responde `401 Unauthorized` con `{ error: "API Key inválida o revocada." }`.
    3. Si es válida, se inyecta en el objeto `req.user` la información del usuario propietario (incluyendo su `storage_quota_mb` y rol) y se actualiza de forma asíncrona `last_used_at = new Date().toISOString()`.
    4. Permite el paso transparente a los endpoints protegidos.

### RF-4: Pestaña "🔑 Acceso API & Tokens" en el Modal de Almacenamiento en la Nube
- **Descripción**: Ampliar el componente [client/src/components/CloudProjectsModal.tsx](file:///c:/Users/victo/proyectos/cdc2/client/src/components/CloudProjectsModal.tsx) añadiendo una tercera pestaña activa junto a "Proyectos" y "Plantillas".
- **Criterios de Aceptación**:
  - **Selector de Pestaña**: Botón con etiqueta `🔑 Acceso API` en la barra superior del modal.
  - **Listado de Claves**:
    - Tabla o tarjetas que muestran: Nombre, Prefijo/Identificador (`cdc2_live_xxxx...`), Fecha de Creación, Último Uso ("Nunca" o fecha formateada) y botón de eliminación/revocación con diálogo de confirmación.
  - **Creación de Nueva Clave**:
    - Botón `+ Generar Nueva API Key` que abre un diálogo o formulario inline solicitando el nombre de la clave.
    - Tras la creación, muestra un banner o modal destacado con el token generado, botón para **Copiar al Portapapeles** y advertencia clara: *"Guarda esta clave en un lugar seguro. Por motivos de seguridad, no volverá a mostrarse."*
  - **Panel de Referencia de Rutas del API**:
    - Bloque colapsable o tarjeta informativa con las rutas principales del sistema:
      - `GET /api/v1/templates/:id/schema`
      - `POST /api/v1/projects` (Crear proyecto desde plantilla)
      - `POST /api/v1/projects/:id/cards` (Añadir cartas)
      - `GET /api/v1/projects/:id/cards/:cardId/preview`
    - Botón de enlace directo a la documentación completa `/developers`.

---

## 3. Arquitectura y Diseño de Datos

### 3.1. Esquema SQLite (`server/src/db/migrations.ts` - Versión 6)

```sql
CREATE TABLE IF NOT EXISTS user_api_keys (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  key_hash TEXT NOT NULL UNIQUE,
  prefix TEXT NOT NULL,
  last_used_at TEXT NULL,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_user_api_keys_hash ON user_api_keys(key_hash);
CREATE INDEX IF NOT EXISTS idx_user_api_keys_user ON user_api_keys(user_id, created_at DESC);
```

### 3.2. Interfaces TypeScript Compartidas (`shared/authTypes.ts`)

```typescript
export interface UserApiKeyMetadata {
  id: string;
  userId: string;
  name: string;
  prefix: string;
  lastUsedAt: string | null;
  createdAt: string;
}

export interface CreateApiKeyResponse {
  id: string;
  name: string;
  prefix: string;
  createdAt: string;
  apiKey: string; // Token en texto plano, solo presente en la respuesta de creación
}
```

---

## 4. Interfaces de Componentes / API

### 4.1. Endpoints de Backend

| Método | Ruta | Autenticación Requerida | Descripción |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/auth/api-keys` | Sesión (Cookie) | Lista las API Keys activas del usuario |
| `POST` | `/api/auth/api-keys` | Sesión (Cookie) | Genera una nueva API Key para el usuario |
| `DELETE` | `/api/auth/api-keys/:id` | Sesión (Cookie) | Revoca y elimina permanentemente la API Key |

### 4.2. Middleware `requireApiKeyOrSession`

Función de middleware en Express que intenta autenticar la petición en el siguiente orden de prelación:
1. Cabecera `X-API-Key` o `Authorization: Bearer cdc2_live_...`.
2. Si no hay clave de API, comprueba la cookie de sesión `session_token`.
3. Si ninguna de las dos es válida, responde con `401 Unauthorized`.

---

## 5. Estrategia de Verificación (Pruebas)

### 5.1. Pruebas Unitarias Automatizadas
- **`server/src/auth/apiKeyService.test.ts`**:
  - Generación de claves con formato válido (`cdc2_live_...`) y longitud adecuada.
  - Almacenamiento seguro: comprobación de que en base de datos solo existe el hash SHA-256.
  - Listado de claves sin revelar el secreto original.
  - Revocación correcta y verificación de que una clave revocada ya no puede autenticar peticiones.
  - Aislamiento de usuarios: un usuario A no puede listar ni revocar claves de un usuario B.
- **`client/src/SRS078ApiKeysManagement.test.tsx`**:
  - Renderizado de la pestaña `🔑 Acceso API` en `CloudProjectsModal`.
  - Carga y visualización de la lista de claves existentes.
  - Flujo de creación de clave: envío del nombre, renderizado del token generado con botón de copia.
  - Revocación de clave y actualización inmediata de la lista.

### 5.2. Checklist de Pruebas Manuales
1. Iniciar sesión como usuario registrado en CDC2.
2. Abrir el modal de proyectos en la nube ("Mis Proyectos").
3. Hacer clic en la pestaña "🔑 Acceso API".
4. Crear una nueva clave con el nombre "Test Agent".
5. Copiar la clave al portapapeles y verificar la advertencia de un solo uso.
6. Realizar una petición cURL utilizando la cabecera `X-API-Key: cdc2_live_...` a un endpoint protegido y verificar código `200 OK`.
7. Revocar la clave desde la interfaz y comprobar que la misma petición cURL devuelve `401 Unauthorized`.
