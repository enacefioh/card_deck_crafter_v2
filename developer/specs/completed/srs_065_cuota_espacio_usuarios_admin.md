# SRS-065: Cuota de Espacio por Usuario y Gestión Administrativa

## 1. Introducción y Objetivos
- **Propósito**: Incorporar una asignación explícita de cuota de almacenamiento individual (en megabytes, MB) para cada usuario en la base de datos SQLite y proporcionar en el Panel de Administración una acción para que los administradores puedan consultar y modificar dicho límite.
- **Objetivos de Diseño**:
  - **Evolución limpia del esquema**: Emplear el motor de migraciones SQLite (`MigrationManager` con `PRAGMA user_version = 2`) sin alterar los datos existentes.
  - **Valor por defecto seguro**: Todo usuario existente y nuevo recibirá inicialmente una cuota estándar de **100 MB**.
  - **Extensibilidad**: Dejar el modelo preparado para que futuras specs de guardado de proyectos, imágenes y plantillas puedan verificar el tamaño acumulado respecto a esta cuota.
  - **UX intuitiva en Admin**: Visualizar la cuota en la lista de usuarios y permitir editarla mediante un modal interactivo con validación de enteros positivos.

---

## 2. Requisitos Funcionales y Casos de Uso

### RF-1: Migración de Base de Datos (Migración v2)
- Se añadirá una migración `v2` en el motor `MigrationManager`:
  ```sql
  ALTER TABLE users ADD COLUMN storage_quota_mb INTEGER NOT NULL DEFAULT 100;
  ```
- Al arrancar el servidor o conectar a la base de datos, `MigrationManager` detectará si `PRAGMA user_version < 2` y aplicará la migración de forma atómica incrementando la versión a 2.
- Todos los registros existentes en la tabla `users` recibirán el valor `100`.

### RF-2: Actualización de Contratos de Datos (`shared`)
- Extender la interfaz `User` con la propiedad `storageQuotaMb: number`.
- Extender la interfaz `UserSummary` con `storageQuotaMb: number`.
- Añadir el método en `IUserRepository`:
  ```typescript
  updateStorageQuota(userId: string, quotaMb: number): Promise<void>;
  ```

### RF-3: Persistencia en Repositorio SQLite (`server`)
- `SqliteUserRepository.createUser`: Asignará por defecto `100` si no se especifica otra cantidad.
- `SqliteUserRepository.listUsers`, `findById`, `findByEmail`: Mapearán `storage_quota_mb` a `storageQuotaMb`.
- `SqliteUserRepository.updateStorageQuota`: Ejecutará un `UPDATE users SET storage_quota_mb = ?, updated_at = ? WHERE id = ?`.

### RF-4: Endpoint de Modificación de Cuota en Backend
- Endpoint: `PATCH /api/admin/users/:id/quota`
- Protección: Restringido exclusivamente a usuarios con rol `admin` (`requireAdmin`).
- Parámetros:
  - Ruta: `id` del usuario.
  - Body JSON: `{ quotaMb: number }`
- Validaciones:
  - `quotaMb` debe ser un número entero mayor o igual a 1 (ej. mínimo 1 MB).
  - Si el usuario no existe, devolver `404 Not Found`.
  - Si la cuota no es válida, devolver `400 Bad Request`.
- Respuesta exitosa: `HTTP 200 { status: "OK", quotaMb: number }`.

### RF-5: Interfaz en el Panel de Administración (`client`)
- En la tabla de usuarios de `AdminPanel.tsx`:
  - Añadir la columna **"Cuota"** mostrando la cuota formateada (ej. `100 MB`).
  - Añadir en el menú de acciones o botón de fila una acción **"💾 Modificar Cuota"**.
- Modal de Modificación de Cuota:
  - Muestra el correo del usuario seleccionado y su cuota actual.
  - Campo numérico para introducir el nuevo valor en MB (con validación de número entero positivo).
  - Botones "Cancelar" y "Guardar Cuota".
  - Notificación visual tipo feedback tras actualizar con éxito.

---

## 3. Arquitectura y Diseño de Datos

### 3.1. Modelo TypeScript (`shared/authTypes.ts`)
```typescript
export interface User {
  id: string;
  email: string;
  passwordHash: string | null;
  role: UserRole;
  storageQuotaMb: number;
  createdAt: string;
  updatedAt: string;
}

export interface UserSummary {
  id: string;
  email: string;
  role: UserRole;
  hasPassword: boolean;
  storageQuotaMb: number;
  createdAt: string;
}
```

### 3.2. Migración SQLite v2 (`server/src/db/migrations.ts`)
```typescript
{
  version: 2,
  description: "Añadir columna storage_quota_mb a la tabla users con valor por defecto 100",
  up: (db) => {
    db.exec("ALTER TABLE users ADD COLUMN storage_quota_mb INTEGER NOT NULL DEFAULT 100;");
  }
}
```

---

## 4. Interfaces de Componentes / API

### 4.1. Endpoint HTTP
| Método | Ruta | Headers | Payload | Respuesta |
| :--- | :--- | :--- | :--- | :--- |
| `PATCH` | `/api/admin/users/:id/quota` | `Cookie: cdc2_session` | `{ "quotaMb": 250 }` | `{ "status": "OK", "quotaMb": 250 }` |

### 4.2. Flujo de Interacción UI (AdminPanel)
```
[Tabla de Usuarios] -> Botón "💾 Cuota" -> [Modal Modificar Cuota] -> Introduce valor -> Guardar -> Recarga lista
```

---

## 5. Estrategia de Verificación (Pruebas)

### 5.1. Pruebas Unitarias Automatizadas
- **Pruebas de Migración (`server/src/db/migrations.test.ts`)**:
  - Verificar que una base de datos creada en versión 1 ejecuta la migración v2 y añade la columna `storage_quota_mb`.
  - Verificar que el valor por defecto para usuarios existentes es 100.
- **Pruebas de Repositorio y Endpoint (`server/src/auth/adminEndpoints.test.ts`)**:
  - Verificar que `createUser` guarda `storageQuotaMb: 100`.
  - Verificar que `updateStorageQuota` modifica el valor correctamente.
  - Verificar que valores no válidos (negativos, 0, no enteros) son rechazados con error.

### 5.2. Pruebas Manuales / Criterios de Aceptación (Checklist)
- [ ] Entrar al panel de administración en `/admin`.
- [ ] Verificar que en la tabla de usuarios aparece la columna de cuota con `100 MB` para los usuarios existentes.
- [ ] Pulsar en la acción de modificar cuota de un usuario, cambiar a `250 MB` y confirmar.
- [ ] Comprobar que la tabla se actualiza visualmente con el nuevo valor `250 MB`.
- [ ] Recargar la página y verificar que el valor persiste en la base de datos SQLite.
