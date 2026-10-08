# SRS-075: Publicación de Plantillas en la Nube, Almacenamiento Público y Moderación Administrativa (Fase 1)

## 1. Introducción y Objetivos
- **Propósito**: Permitir que los usuarios de Card Deck Crafter v2 puedan compartir y publicar sus plantillas de proyecto (`.cdc2t`) en un repositorio público comunitario de plantillas del servidor. Este sistema establece las bases de almacenamiento, asignación de autor, ciclo de vida de publicación ("Publicar" / "Actualizar") y un panel de moderación para que los administradores aprueben o rechacen plantillas antes de que estén disponibles en la tienda comunitaria.
- **Objetivos de Diseño**:
  - **Identidad de Autor**: Cada usuario dispone de un nombre de usuario único (`username`). En caso de usuarios preexistentes sin nombre asignado, el sistema genera de forma determinista un identificador del tipo `user_<aleatorio>`. El administrador puede consultar y asignar nombres de usuario desde el panel de administración.
  - **Aislamiento y Directorio Público**: El servidor mantiene una carpeta desacoplada de plantillas públicas (`/server/data/public_templates`) gestionada por el servicio de almacenamiento. La publicación copia el archivo `.cdc2t` original a esta carpeta para que los cambios posteriores en el borrador personal del usuario no afecten a la versión pública sin una acción explícita de "Actualizar Plantilla".
  - **Control Editorial (Moderación)**: Toda plantilla publicada o actualizada entra en estado pendiente (`pending`). Solo tras la aprobación explícita de un administrador (`approved`) adquiere visibilidad pública.
  - **Rechazo Limpio**: Si el administrador rechaza una solicitud, se elimina el archivo físico de la carpeta pública y su registro asociado, devolviendo la plantilla personal a su estado original no publicada.
  - **Extensibilidad**: Prepara los metadatos y endpoints necesarios para la Fase 2 (SRS-076: Tienda Comunitaria `/store` y Ficha estilo App Store).

---

## 2. Requisitos Funcionales y Casos de Uso

### RF-1: Identificador y Nombre de Autor Único
- En la tabla de usuarios `users`, se añade el campo `username TEXT UNIQUE NULL`.
- Al crear nuevos usuarios desde el panel de administración, el administrador puede definir un nombre de usuario único.
- Si un usuario existente carece de `username`, al iniciar sesión o consultar sus datos se genera y persiste automáticamente un alias aleatorio tipo `user_XXXXXX` (ej. `user_849201`).
- En el Panel de Administración (`AdminPanel.tsx`), se expone y permite editar el nombre de usuario de cada cuenta.

### RF-2: Almacenamiento Físico y Modelo de Plantillas Públicas
- En el servidor, se crea y gestiona el directorio físico `public_templates` en el directorio de datos persistente (`/app/server/data/public_templates`).
- Se añade una migración de base de datos en SQLite para crear la tabla `public_templates`:
  - `id`: Identificador único público (UUID o nano-id).
  - `original_template_id`: ID de la plantilla original en `user_templates` del autor.
  - `author_id`: ID del usuario autor (`users.id`).
  - `author_name`: Nombre de usuario visible del autor al momento de publicar/actualizar.
  - `name`: Nombre de la plantilla.
  - `description`: Descripción pública.
  - `filename`: Nombre del archivo `.cdc2t` almacenado en `public_templates`.
  - `status`: Estado de moderación: `'pending'` (pendiente) o `'approved'` (aprobada).
  - `document_count`: Número de documentos que incluye la plantilla.
  - `template_count`: Número de diseños de cartas.
  - `file_size_bytes`: Tamaño del archivo en bytes.
  - `metadata_json`: Metadatos adicionales (lista de diseños de cartas con sus medidas y miniaturas).
  - `created_at`: Fecha ISO de publicación inicial.
  - `updated_at`: Fecha ISO de última actualización.
  - Restricción única: `UNIQUE(author_id, original_template_id)` para que un autor solo tenga una publicación activa por plantilla.

### RF-3: Publicación y Actualización desde "Mis Plantillas" y Modal de Edición Pública
- En `CloudProjectsModal.tsx`, pestaña **"Mis plantillas"**:
  - Cada elemento de plantilla consulta su estado de publicación (`isPublished`, `publicationStatus: 'pending' | 'approved' | null`).
  - **Modal Interactivo `PublishTemplateModal`**:
    - Al pulsar **"📢 Publicar Plantilla"** o **"🔄 Actualizar Plantilla"**, se abre un modal específico que permite al autor revisar y enriquecer los datos de la ficha pública:
      - **Título público**: Pre-rellenado con el nombre de la plantilla, pero editable para darle un nombre más atractivo o descriptivo de cara a la comunidad.
      - **Descripción pública (extendida)**: Pre-rellenada con la descripción privada de la plantilla, con un área de texto amplia que permite al autor explayarse, detallar mecánicas, instrucciones de uso o notas temáticas.
      - **Autor**: Muestra el nombre de usuario (`username`) asignado con el que se publicará la plantilla.
      - **Botones**: "Cancelar" y "🚀 Enviar a revisión pública".
  - **Si no está publicada**:
    - Se muestra el botón con icono **"📢 Publicar Plantilla"**.
    - Al confirmar en el modal, se envía la petición al servidor (`POST /api/cloud/templates/:id/publish` con `{ publicName, publicDescription }`).
    - El servidor copia el archivo `.cdc2t` a la carpeta pública, extrae los metadatos y crea el registro con `status = 'pending'`.
    - La interfaz actualiza el estado de la fila mostrando la etiqueta informativa **"⏳ En revisión"**.
  - **Si ya está publicada y aprobada**:
    - Se muestra la etiqueta **"🌐 Publicada"**.
    - El botón cambia a **"🔄 Actualizar Plantilla"**.
    - Al pulsar "Actualizar Plantilla", se abre `PublishTemplateModal` pre-rellenado con los últimos datos públicos, permitiendo modificar el texto y enviar la nueva versión del archivo a la carpeta pública. El estado cambia nuevamente a **"⏳ En revisión"** para que el administrador valide los cambios.
  - **Si está en revisión (`pending`)**:
    - Se muestra la etiqueta informativa **"⏳ En revisión"** y el botón de actualizar queda deshabilitado o con texto explicativo ("Actualización pendiente de moderación").

### RF-4: Panel de Moderación de Administradores
- En `AdminPanel.tsx`, se añade la pestaña / sección **"Plantillas Públicas"**:
  - Lista de plantillas en estado `'pending'`:
    - Nombre de la plantilla y autor.
    - Descripción.
    - Documentos, diseños de cartas, peso y fecha de envío.
    - Vista previa de las miniaturas de los diseños incluidos.
  - Acciones del Administrador:
    - **✅ Aprobar**: Invoca `POST /api/admin/public-templates/:id/approve`. Cambia el estado a `'approved'`. La plantilla queda formalmente publicada.
    - **❌ Rechazar**: Invoca `POST /api/admin/public-templates/:id/reject`. El servidor elimina el archivo físico `.cdc2t` de la carpeta `public_templates` y borra el registro de `public_templates`. La plantilla del usuario regresa a su estado inicial no publicada.
  - Lista de plantillas ya aprobadas (`'approved'`):
    - Permite al administrador consultar las plantillas vigentes y, de ser necesario, retirarlas de la tienda (**"Despublicar / Eliminar de tienda"**).

---

## 3. Arquitectura y Diseño de Datos

### 3.1. Migración SQLite (`server/src/db/migrations.ts`)
```sql
-- Versión 5 de migraciones: Soporte para autor y plantillas públicas
ALTER TABLE users ADD COLUMN username TEXT UNIQUE NULL;

CREATE TABLE IF NOT EXISTS public_templates (
  id TEXT PRIMARY KEY,
  original_template_id TEXT NOT NULL,
  author_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  author_name TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  filename TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending' | 'approved'
  document_count INTEGER NOT NULL DEFAULT 0,
  template_count INTEGER NOT NULL DEFAULT 0,
  file_size_bytes INTEGER NOT NULL,
  metadata_json TEXT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE(author_id, original_template_id)
);

CREATE INDEX IF NOT EXISTS idx_public_templates_status ON public_templates(status);
CREATE INDEX IF NOT EXISTS idx_public_templates_author ON public_templates(author_id);
```

### 3.2. Contratos TypeScript Compartidos (`shared/authTypes.ts`)
```typescript
export interface PublicTemplateMetadata {
  id: string;
  originalTemplateId: string;
  authorId: string;
  authorName: string;
  name: string;
  description: string;
  filename: string;
  status: "pending" | "approved";
  documentCount: number;
  templateCount: number;
  fileSizeBytes: number;
  metadataJson?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PublishTemplateResponse {
  success: boolean;
  publicTemplate: PublicTemplateMetadata;
}
```

### 3.3. Estructura de Directorios del Servidor
```
/server/data/
  ├── users.db
  ├── users/
  │    └── {userId}/
  │         ├── projects/
  │         └── templates/
  └── public_templates/
       ├── tmpl_pub_123.cdc2t
       └── tmpl_pub_456.cdc2t
```

---

## 4. Interfaces de Componentes / API

### 4.1. Endpoints de Usuario Autenticado
- `POST /api/cloud/templates/:id/publish`:
  - Publica o actualiza una plantilla personal del usuario en la cola pública.
  - Respuesta: `{ success: true, publicTemplate: PublicTemplateMetadata }`.
- `GET /api/cloud/templates/my-publications`:
  - Devuelve el mapa de estados de publicación de las plantillas del usuario activo `{ [originalTemplateId: string]: PublicTemplateMetadata }`.

### 4.2. Endpoints de Administrador (`requireAdmin`)
- `GET /api/admin/public-templates?status=pending|approved|all`:
  - Obtiene la lista de plantillas públicas filtradas por estado.
- `POST /api/admin/public-templates/:id/approve`:
  - Cambia el estado a `'approved'`.
- `POST /api/admin/public-templates/:id/reject`:
  - Borra el archivo físico de `public_templates` y elimina el registro en la base de datos.
- `PUT /api/admin/users/:id/username`:
  - Permite al administrador actualizar o asignar manualmente el nombre de usuario de una cuenta.

---

## 5. Estrategia de Verificación (Pruebas)

### 5.1. Pruebas Unitarias Automatizadas
- **Migración y Modelo**:
  - `server/src/db/migrations.test.ts`: Verificar la adición de `username` a `users` y la creación correcta de la tabla `public_templates` con sus restricciones únicas.
- **Servicio de Almacenamiento Público**:
  - `server/src/storage/publicTemplateService.test.ts`:
    - Publicar plantilla: copia de archivo a `public_templates/` y registro con estado `'pending'`.
    - Actualizar plantilla existente: sobrescritura segura del archivo y retorno a estado `'pending'`.
    - Aprobación admin: cambio de estado a `'approved'`.
    - Rechazo admin: eliminación de archivo en disco y borrado de la base de datos.
    - Generación automática de `user_XXXXXX` para usuarios sin `username`.
- **Integración de Componentes**:
  - `client/src/SRS075PublicacionPlantillas.test.tsx`:
    - Renderizado de botón "📢 Publicar Plantilla" en `CloudProjectsModal`.
    - Renderizado de badge "⏳ En revisión" y "🌐 Publicada".
    - Renderizado de botón "🔄 Actualizar Plantilla".
    - Pestaña de moderación en `AdminPanel` con botones de aprobar y rechazar.

### 5.2. Pruebas Manuales / Criterios de Aceptación (Checklist)
- [ ] **1. Asignación de Nombre de Usuario**:
  - Iniciar sesión con un usuario existente y verificar que se le asigna un nombre de usuario tipo `user_XXXXXX`.
  - Entrar al panel de administración como administrador y verificar que se puede modificar dicho nombre.
- [ ] **2. Publicar una plantilla**:
  - Ir a **Archivo ➜ Abrir Proyecto desde la Nube ☁️ ➜ Pestaña "Mis plantillas"**.
  - En una plantilla guardada, pulsar **"📢 Publicar Plantilla"**.
  - Confirmar la publicación y verificar que la fila pasa a mostrar la etiqueta **"⏳ En revisión"**.
  - Verificar que el archivo `.cdc2t` se ha copiado a `/server/data/public_templates/`.
- [ ] **3. Moderación desde el Panel de Administrador**:
  - Abrir el **Panel de Administración ➜ Pestaña "Plantillas Públicas"**.
  - Comprobar que aparece la plantilla recién enviada con sus metadatos y autor.
  - Pulsar **✅ Aprobar**.
  - Regresar a "Mis plantillas" del usuario: la plantilla debe mostrar **"🌐 Publicada"** y el botón **"🔄 Actualizar Plantilla"**.
- [ ] **4. Prueba de Actualización y Rechazo**:
  - Pulsar **"🔄 Actualizar Plantilla"** y verificar que regresa a **"⏳ En revisión"**.
  - En el panel de administración, pulsar **❌ Rechazar**.
  - Verificar que el archivo en `public_templates` se elimina y la plantilla en "Mis plantillas" vuelve a mostrar el botón inicial **"📢 Publicar Plantilla"**.
