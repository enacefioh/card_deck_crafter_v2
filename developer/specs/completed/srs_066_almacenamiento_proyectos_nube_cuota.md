# SRS-066: Almacenamiento de Proyectos en la Nube y Control de Cuota

## 1. Introducción y Objetivos
- **Propósito**: Proporcionar a los usuarios autenticados la capacidad de guardar, gestionar y abrir sus proyectos (.cdc2) directamente en el servidor (almacenamiento en la nube privada), respetando su cuota individual de disco configurada en SRS-065 y garantizando que los usuarios anónimos sigan teniendo disponible la exportación/importación local tradicional.
- **Objetivos de Diseño**:
  - **Autonomía y portabilidad**: Los usuarios pueden continuar su trabajo desde cualquier dispositivo simplemente iniciando sesión.
  - **Control estricto de cuota (Fail-safe)**: Antes de persistir cualquier archivo, el servidor valida que el espacio restante en disco sea suficiente. En caso de superar la cuota, se ofrece al usuario exportar el proyecto a su PC para evitar cualquier pérdida de datos.
  - **Fuente única de verdad en disco**: La ocupación de almacenamiento se calcula dinámicamente sumando el peso de los archivos del usuario en su directorio dedicado (`server/data/users/<userId>/projects/`), garantizando consistencia absoluta ante restauraciones o borrados.
  - **Experiencia de usuario (UX) unificada**: 
    - Menú "Archivo" desplegable con opciones diferenciadas para PC y Nube.
    - Indicador de capacidad y porcentaje de uso en el menú de usuario.
    - Modal de gestión de proyectos que permite abrir, exportar a PC o eliminar proyectos para liberar espacio.

---

## 2. Requisitos Funcionales y Casos de Uso

### RF-1: Estructura de Directorios Personales de Usuario (`server`)
- Cada usuario autenticado tendrá una carpeta privada en el servidor bajo la ruta:
  `<dataDir>/users/<userId>/projects/`
- **Resolución de ruta y persistencia en despliegues**:
  - `dataDir` se resuelve de forma prioritaria a partir de `path.dirname(process.env.CDC2_DB_PATH)` cuando esté definida (ej. en Docker `/app/server/data`), garantizando que los archivos `.cdc2` se almacenen en el mismo volumen persistente que la base de datos SQLite (`cdc2_data`). Si no está definida, se resuelve de forma relativa a la raíz del servidor (`data/` o `server/data/`).
- El servicio de almacenamiento (`UserStorageService`) se asegurará mediante un proceso *lazy/on-demand* (`ensureUserStorageTree(userId)`) de que la estructura de carpetas exista antes de cualquier lectura o escritura.
- Esta estructura queda aislada por identificador de usuario (`userId`) y será empaquetada de forma natural dentro de las copias de seguridad del sistema (SRS-064).

### RF-2: Identificador Único de Proyecto (`id`) y Metadatos en SQLite (Migración v3)
- **ID Único de Proyecto**:
  - Todo proyecto dispone de un identificador único (`id` en `ProyectoCDC2` y en `project.json`) generado al crearlo (ej. `proj_<timestamp>_<random>`).
  - **Retrocompatibilidad**: Si un archivo `.cdc2` importado carece de `id` (proyectos generados en versiones previas), se le genera y asigna una nueva ID en el momento de cargarlo en memoria.
  - La persistencia y sobrescritura de proyectos en la nube se gestiona **exclusivamente por su ID única**, permitiendo que un usuario tenga múltiples proyectos con el mismo nombre (ej. "Mi Baraja") sin que se sobrescriban entre sí.
- Para facilitar la búsqueda, ordenación por fecha y presentación de información detallada, se registrarán metadatos de los proyectos en una nueva tabla SQLite `user_projects` mediante la migración `v3`:
  ```sql
  CREATE TABLE IF NOT EXISTS user_projects (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    filename TEXT NOT NULL,
    name TEXT NOT NULL,
    description TEXT DEFAULT '',
    card_count INTEGER NOT NULL DEFAULT 0,
    document_count INTEGER NOT NULL DEFAULT 0,
    file_size_bytes INTEGER NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE(user_id, filename)
  );
  CREATE INDEX IF NOT EXISTS idx_user_projects_user_updated ON user_projects(user_id, updated_at DESC);
  ```
- **Campos de metadatos**:
  - `id`: Identificador único del proyecto sincronizado con el cliente.
  - `name`: Título del proyecto (permite duplicados con distinta ID).
  - `description`: Breve descripción o notas del proyecto (opcional, editable en cada guardado).
  - `card_count`: Total de cartas activas en el proyecto.
  - `document_count`: Total de documentos/páginas del proyecto.
  - `file_size_bytes`: Tamaño real en bytes del archivo `.cdc2`.
  - `created_at` / `updated_at`: Marcas de tiempo ISO.

### RF-3: API Backend de Almacenamiento y Control de Cuota
Todos los endpoints requieren autenticación activa mediante cookie de sesión (`cdc2_session`).

1. `GET /api/user/storage`:
   - Calcula el tamaño total en bytes de los proyectos del usuario en `<dataDir>/users/<userId>/`.
   - Consulta la cuota asignada en `users.storage_quota_mb`.
   - Devuelve cuota, usado, disponible y porcentaje.
2. `GET /api/user/projects`:
   - Devuelve la lista de proyectos del usuario ordenados por `updated_at DESC`.
3. `POST /api/user/projects`:
   - Recibe mediante `multipart/form-data`:
     - `file`: Archivo `.cdc2` binario.
     - `id`: Identificador único del proyecto (requerido o autogenerado).
     - `name`: Nombre del proyecto.
     - `description`: Descripción corta (opcional).
     - `cardCount`: Número entero de cartas.
     - `documentCount`: Número entero de páginas.
   - **Identificación y Sobrescritura Estricta por ID**:
     - Se comprueba si existe un proyecto con la misma `id` para ese usuario.
     - Si existe por ID: se sobrescribe el archivo físico y se actualiza el registro en `user_projects`.
     - Si no existe: se crea un nuevo proyecto con esa ID (aunque coincida el nombre con otro proyecto existente).
   - **Validación de cuota**:
     - Si el archivo sobrescribe uno existente (misma ID), el espacio disponible efectivo descuenta el peso anterior.
     - Si el tamaño del nuevo archivo supera el espacio disponible, rechaza la operación con `HTTP 413 Payload Too Large` y detalle de cuota.
4. `GET /api/user/projects/:id/download`:
   - Descarga el archivo `.cdc2` para abrirlo en el navegador o exportarlo.
5. `DELETE /api/user/projects/:id`:
   - Elimina el archivo físico del disco y el registro en la base de datos, liberando el espacio de la cuota inmediatamente (si el archivo no existe en disco por anomalía previa, limpia el registro en la BD de forma segura).

### RF-4: Menú "Archivo" Desplegable en Cascada (Flyouts a la Derecha) (`MenuBar.tsx`)
- **Acción "📄 Nuevo Proyecto"**: Al seleccionarse desde el menú superior del editor, solicita confirmación si hay cambios sin guardar, resetea el lienzo, genera una nueva ID de proyecto y **abre directamente el popup de configuración de dimensiones y hoja** (sin pasar por el Welcome Hub de bienvenida).
- Para evitar saturar el menú verticalmente, las opciones complejas utilizan submenús desplegables a la derecha (*flyout submenus* al pasar el cursor o interactuar):
  1. **📂 Abrir Proyecto ▶**:
     - Despliega a la derecha:
       - **💻 Importar desde PC (.cdc2)...**: Disponible para todos los usuarios. Abre el selector de archivos local.
       - **☁️ Abrir desde la Nube...**:
         - *Usuario anónimo*: Se muestra atenuado con icono de candado 🔒; al pulsar abre el modal de Login.
         - *Usuario autenticado*: Abre el modal de **Gestión de Proyectos en la Nube**.
  2. **💾 Guardar Proyecto ▶**:
     - Despliega a la derecha:
       - **💻 Exportar a PC (.cdc2)**: Disponible para todos los usuarios. Descarga el archivo localmente como hasta ahora.
       - **☁️ Guardar en la Nube...**:
         - *Usuario anónimo*: Atenuado con icono de candado 🔒; al pulsar abre el modal de Login.
         - *Usuario autenticado*: Abre el modal de **Guardar en la Nube**.

### RF-5: Pantalla de Bienvenida (Hub de Acceso Rápido con 4 Botones Cuadrados)
- Al iniciar la aplicación sin un proyecto creado (`!projectCreated` y `!showCreateProjectForm`), se muestra un Hub de bienvenida con una cuadrícula 2x2 de botones grandes y cuadrados, con iconos representativos y descripciones claras:
  1. **Botón Dinámico de Usuario / Administración**:
     - **Usuario no autenticado (Anónimo)**: Botón **🔑 Iniciar Sesión** (abre modal de login/registro).
     - **Usuario administrador autenticado**: Botón **⚙️ Panel de Administración** (redirige a `/admin`).
     - **Usuario estándar autenticado**: Botón **👤 Hola, %Usuario%** (muestra porcentaje de uso de cuota y abre el modal de proyectos en la nube).
  2. **Botón Abrir desde PC**:
     - Icono 💻 / 📂: **Abrir desde PC**. Abre el selector de archivos locales `.cdc2`.
  3. **Botón Abrir desde la Nube**:
     - Icono ☁️: **Abrir desde la Nube**. Abre el modal de proyectos guardados si está autenticado, o el modal de login si es anónimo.
  4. **Botón Crear Nuevo Proyecto**:
     - Icono ✨: **Crear Nuevo Proyecto**. Al hacer clic, abre el popup secundario con el formulario completo de configuración de hoja, cartas y márgenes (permitiendo además regresar al menú inicial mediante un botón "← Volver").

### RF-6: Indicador de Capacidad y Menú de Usuario (`MenuBar.tsx`)
- En el desplegable del perfil de usuario (esquina superior derecha):
  - **Barra de Progreso de Almacenamiento**:
    - Texto descriptivo: `{usedMb} MB de {quotaMb} MB ({percentUsed}%)`.
    - Barra visual con color condicional:
      - Verde/Azul: $< 80\%$ de ocupación.
      - Amarillo/Ámbar: $80\% - 94\%$.
      - Rojo: $\ge 95\%$.
  - **Elemento de Menú**: `☁️ Gestionar mi almacenamiento`:
    - Abre el modal de gestión de proyectos en la nube.

### RF-7: Modal de Guardado en la Nube (`SaveCloudModal.tsx`)
- Formulario de guardado:
  - Nombre del proyecto (input de texto requerido, pre-cargado con el título de la baraja).
  - Descripción corta (textarea de 1-2 líneas, opcional).
  - Resumen informativo: Total de cartas y número de documentos/páginas.
  - Peso estimado del archivo y espacio disponible actual.
  - Botón "Guardar en la Nube".
- **Comportamiento ante Cuota Insuficiente**:
  - Si el servidor devuelve cuota insuficiente o el cliente detecta de antemano que no cabe:
    - Se muestra una advertencia visual prominente con el espacio restante, el tamaño requerido y la diferencia.
    - Se ofrece un botón directo y destacado: **"📥 Exportar a mi PC en su lugar"** para que el usuario no pierda sus cambios bajo ninguna circunstancia.

### RF-8: Modal de Gestión de Proyectos en la Nube (`CloudProjectsModal.tsx`)
- Encabezado con estado global de almacenamiento (barra de uso y porcentaje).
- Listado de proyectos ordenados por fecha de modificación decreciente:
  - Título y descripción corta.
  - Badges informativos: Total de cartas (`🃏 X`), páginas (`📄 Y`), tamaño (`💾 Z MB/KB`) y fecha relativa/absoluta.
- Acciones por cada proyecto:
  - **Abrir**: Carga el proyecto en el lienzo de la aplicación (solicita confirmación si hay cambios sin guardar).
  - **Exportar a PC**: Descarga directa del `.cdc2` sin cargarlo en el editor.
  - **Eliminar 🗑️**: Solicita confirmación y elimina el archivo liberando espacio de la cuota en tiempo real.
- Estado vacío amigable cuando el usuario aún no tiene proyectos guardados.

### RF-9: Panel de Administración: Métrica de Uso / Cuota y Sincronización en Sesiones Activas
- **Columna de Cuota en Tabla de Usuarios**:
  - En el panel de administración (`AdminPanel.tsx`), la columna de cuota muestra el espacio en disco utilizado por el usuario junto a su cuota total configurada: `💾 <usadoMb> / <cuotaMb> MB` (ej. `💾 0 / 1000 MB` o `💾 7 / 100 MB`).
  - La interfaz `UserSummary` en `shared/authTypes.ts` se extiende con `usedStorageMb?: number` y `usedStorageBytes?: number`.
  - El endpoint `GET /api/admin/users` computa en tiempo real para cada usuario los bytes reales ocupados en su directorio mediante `storageService.getDiskUsedStorageBytes(user.id)`.
- **Sincronización Dinámica en Sesiones Activas**:
  - `findSession` en `SqliteUserRepository` selecciona y mapea explícitamente `storage_quota_mb` del usuario autenticado.
  - Además, `GET /api/user/storage` y `POST /api/user/projects` consultan el usuario más reciente en la base de datos para garantizar que cualquier cambio realizado por un administrador en la cuota se refleje de manera inmediata en la interfaz y en los controles de guardado del usuario sin necesidad de reiniciar la sesión.

---

## 3. Arquitectura y Diseño de Datos

### 3.1. Modelo TypeScript Compartido (`shared/projectTypes.ts` o `shared/authTypes.ts`)
```typescript
export interface CloudProjectMetadata {
  id: string;
  userId: string;
  filename: string;
  name: string;
  description: string;
  cardCount: number;
  documentCount: number;
  fileSizeBytes: number;
  createdAt: string;
  updatedAt: string;
}

export interface UserStorageInfo {
  quotaMb: number;
  quotaBytes: number;
  usedBytes: number;
  usedMb: number;
  availableBytes: number;
  availableMb: number;
  percentUsed: number;
}
```

### 3.2. Estructura de Almacenamiento en Disco
```
server/data/
└── users/
    └── <userId>/
        └── projects/
            ├── <projectId>.cdc2
            └── ...
```

---

## 4. Interfaces de Componentes / API

### 4.1. Endpoints HTTP
| Método | Ruta | Auth | Payload | Respuesta |
| :--- | :--- | :--- | :--- | :--- |
| `GET` | `/api/user/storage` | Requerida | Ninguno | `UserStorageInfo` |
| `GET` | `/api/user/projects` | Requerida | Ninguno | `{ projects: CloudProjectMetadata[] }` |
| `POST` | `/api/user/projects` | Requerida | `multipart/form-data` | `{ status: "OK", project: CloudProjectMetadata, storage: UserStorageInfo }` |
| `GET` | `/api/user/projects/:id/download` | Requerida | Ninguno | Stream binario `.cdc2` |
| `DELETE` | `/api/user/projects/:id` | Requerida | Ninguno | `{ status: "OK", storage: UserStorageInfo }` |

---

## 5. Estrategia de Verificación (Pruebas)

### 5.1. Pruebas Automatizadas
1. **Migración SQLite v3 (`server/src/db/migrations.test.ts`)**:
   - Verificar la creación correcta de la tabla `user_projects` y sus índices.
2. **Servicio de Almacenamiento y Cuota (`server/src/storage/userStorageService.test.ts`)**:
   - Comprobar que `ensureUserStorageTree` crea la carpeta si no existe.
   - Comprobar el cálculo de espacio consumido en disco.
   - Comprobar que un archivo que excede la cuota es rechazado con error de cuota.
   - Comprobar que la sobrescritura descuenta el tamaño del archivo anterior.
   - Comprobar que el borrado elimina el archivo físico y libera el espacio.

### 5.2. Pruebas Manuales / Criterios de Aceptación (Checklist)
- [ ] Iniciar sesión como usuario estándar con cuota de 100 MB.
- [ ] En la barra superior, abrir el menú de usuario y comprobar la barra de cuota (debe mostrar `0 MB de 100 MB (0%)`).
- [ ] Crear cartas y acceder a `Archivo` -> `Guardar Proyecto` -> `Guardar en la Nube ☁️`.
- [ ] Rellenar nombre y descripción opcional; confirmar guardado.
- [ ] Verificar que el archivo se guarda y la barra de cuota refleja el incremento de espacio.
- [ ] Acceder a `Archivo` -> `Abrir Proyecto` -> `Abrir desde la Nube ☁️` y verificar que el proyecto aparece con sus metadatos (cartas, páginas, tamaño, fecha).
- [ ] Probar la opción de "Exportar a PC" desde el modal de proyectos en la nube.
- [ ] Crear un nuevo proyecto en blanco y cargar el proyecto desde la nube, comprobando que se restablecen todas sus cartas y páginas.
- [ ] Probar la opción de "Eliminar" en la nube y verificar que se libera el espacio.
- [ ] Cerrar sesión y verificar que las opciones de "Guardar en la Nube" y "Abrir desde la Nube" aparecen atenuadas con candado y abren el modal de Login al pulsarlas.
