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
  `server/data/users/<userId>/projects/`
- El servicio de almacenamiento (`UserStorageService`) se asegurará mediante un proceso *lazy/on-demand* (`ensureUserStorageTree(userId)`) de que la estructura de carpetas exista antes de cualquier lectura o escritura.
- Esta estructura queda aislada por identificador de usuario (`userId`) y será empaquetada de forma natural dentro de las copias de seguridad del sistema (SRS-064).

### RF-2: Metadatos de Proyectos y Migración SQLite (Migración v3)
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
  - `name`: Título del proyecto (por defecto el nombre de la baraja o asignado por el usuario).
  - `description`: Breve descripción o notas del proyecto (opcional, editable en cada guardado).
  - `card_count`: Total de cartas activas en el proyecto.
  - `document_count`: Total de documentos/páginas del proyecto.
  - `file_size_bytes`: Tamaño real en bytes del archivo `.cdc2`.
  - `created_at` / `updated_at`: Marcas de tiempo ISO.

### RF-3: API Backend de Almacenamiento y Control de Cuota
Todos los endpoints requieren autenticación activa mediante cookie de sesión (`cdc2_session`).

1. `GET /api/user/storage`:
   - Calcula el tamaño total en bytes de los proyectos del usuario en `server/data/users/<userId>/`.
   - Consulta la cuota asignada en `users.storage_quota_mb`.
   - Devuelve:
     ```json
     {
       "quotaMb": 100,
       "quotaBytes": 104857600,
       "usedBytes": 33554432,
       "usedMb": 32.0,
       "availableBytes": 71303168,
       "availableMb": 68.0,
       "percentUsed": 32
     }
     ```
2. `GET /api/user/projects`:
   - Devuelve la lista de proyectos del usuario ordenados por `updated_at DESC`.
3. `POST /api/user/projects`:
   - Recibe mediante `multipart/form-data`:
     - `file`: Archivo `.cdc2` binario.
     - `name`: Nombre del proyecto.
     - `description`: Descripción corta (opcional).
     - `cardCount`: Número entero de cartas.
     - `documentCount`: Número entero de páginas.
     - `projectId` o `filename` (opcional si es actualización de un proyecto previo).
   - **Validación de cuota**:
     - Si el archivo sobrescribe uno existente del mismo usuario, el espacio disponible efectivo se calcula como:
       $\text{EspacioDisponible} = \text{Cuota} - (\text{UsadoTotal} - \text{TamañoArchivoPrevio})$.
     - Si el tamaño del nuevo archivo supera el espacio disponible, rechaza la operación con `HTTP 413 Payload Too Large` y detalle de cuota.
   - Si la cuota es suficiente: guarda el archivo en `users/<userId>/projects/`, actualiza el registro en `user_projects` y devuelve `HTTP 200`.
4. `GET /api/user/projects/:id/download`:
   - Descarga el archivo `.cdc2` para abrirlo en el navegador o exportarlo.
5. `DELETE /api/user/projects/:id`:
   - Elimina el archivo físico del disco y el registro en la base de datos, liberando el espacio de la cuota inmediatamente.

### RF-4: Menú "Archivo" Desplegable en Cascada (`MenuBar.tsx`)
- **Guardar Proyecto**:
  - Se despliega en dos opciones:
    1. **Exportar a PC (.cdc2)**: Disponible para todos los usuarios. Descarga el archivo localmente como hasta ahora.
    2. **Guardar en la Nube ☁️**:
       - *Usuario anónimo*: Se muestra atenuado (50% opacidad) con icono de candado 🔒. Al hacer clic, abre el modal de inicio de sesión (`LoginModal`).
       - *Usuario autenticado*: Abre el modal de **Guardar en la Nube**.
- **Abrir Proyecto**:
  - Se despliega en dos opciones:
    1. **Importar desde PC (.cdc2)**: Disponible para todos los usuarios. Abre el selector de archivos local.
    2. **Abrir desde la Nube ☁️**:
       - *Usuario anónimo*: Se muestra atenuado con candado 🔒; al hacer clic abre el modal de inicio de sesión.
       - *Usuario autenticado*: Abre el modal de **Gestión de Proyectos en la Nube**.

### RF-5: Pantalla de Bienvenida (Welcome Modal)
- El botón existente "Abrir Proyecto Existente (.cdc2)" pasa a llamarse:
  **📂 Abrir desde PC (.cdc2)**
- Se incorpora un nuevo botón:
  **☁️ Abrir desde la Nube**
  - Si el usuario está identificado, abre directamente el modal de proyectos en la nube.
  - Si no está identificado, abre el modal de Login.

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
