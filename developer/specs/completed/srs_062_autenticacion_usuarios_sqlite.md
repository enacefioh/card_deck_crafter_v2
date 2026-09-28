# Especificación Técnica (SRS-062): Sistema de Autenticación de Usuarios, Persistencia SQLite y Acceso en MenuBar

## 1. Introducción y Objetivos
- **Propósito**: Implementar un sistema de autenticación de usuarios local, autónomo y desacoplado para **Card Deck Crafter v2**, utilizando SQLite como base de datos embebida, soporte para sesiones persistentes de 30 días, asistente de primer uso (setup inicial del administrador maestro sin credenciales en texto plano en archivos), flujo de activación para nuevos usuarios con contraseñas vacías, y componentes visuales en la barra superior (Login modal y Avatar dinámico estilo Gmail).
- **Objetivos de Diseño**:
  - **Seguridad**: Contraseñas cifradas mediante `bcrypt` (10 salt rounds), cookies de sesión HTTP-only seguras (`SameSite=Lax`, duración 30 días), y eliminación total de contraseñas en texto plano dentro de archivos del repositorio.
  - **Portabilidad y Persistencia**: Base de datos SQLite embebida guardada en `server/data/users.db` (fácilmente mapeable a un volumen Docker `-v cdc2_data:/app/server/data`).
  - **Desacoplamiento (Patrón Repositorio)**: Definición de la interfaz `IUserRepository` para permitir una sustitución limpia en el futuro por PostgreSQL, Supabase o una API cloud comunitaria sin alterar los controladores ni el frontend.
  - **Experiencia de Usuario**: Asistente de bienvenida en el primer arranque si la base de datos está vacía; avatar circular con color determinista e iniciales estilo contacto de Gmail.

---

## 2. Requisitos Funcionales y Casos de Uso

### RF-1: Persistencia y Repositorio SQLite Desacoplado
- **Ubicación de la BD**: `server/data/users.db` (o configurable por `CDC2_DB_PATH`).
- **Tablas en SQLite**:
  - `users`:
    - `id` (TEXT PRIMARY KEY / UUID)
    - `email` (TEXT UNIQUE NOT NULL)
    - `password_hash` (TEXT NULL) — *NULL indica usuario pendiente de activación o reseteado*
    - `role` (TEXT NOT NULL DEFAULT 'user') — *Valores: `'admin'` o `'user'`*
    - `created_at` (TEXT NOT NULL)
    - `updated_at` (TEXT NOT NULL)
  - `sessions`:
    - `id` (TEXT PRIMARY KEY / UUID o token de 64 caracteres)
    - `user_id` (TEXT NOT NULL, FOREIGN KEY a `users(id)`)
    - `expires_at` (TEXT NOT NULL)
    - `created_at` (TEXT NOT NULL)
- **Contrato TypeScript (`IUserRepository`)**:
  - `findByEmail(email: string): Promise<User | null>`
  - `findById(id: string): Promise<User | null>`
  - `createUser(email: string, role?: 'user' | 'admin', passwordHash?: string | null): Promise<User>`
  - `setPassword(userId: string, passwordHash: string): Promise<void>`
  - `resetPassword(userId: string): Promise<void>`
  - `updateRole(userId: string, role: 'user' | 'admin'): Promise<void>`
  - `deleteUser(userId: string): Promise<void>`
  - `countUsers(): Promise<number>`
  - `listUsers(): Promise<UserSummary[]>`

### RF-2: Asistente de Primer Uso (Setup Inicial del Administrador)
- **Comprobación de Estado**:
  - Endpoint `GET /api/auth/status` devuelve `{ initialized: boolean, usersCount: number }`.
- **Detección Automática**:
  - Si `initialized === false` (0 usuarios en la base de datos), el cliente web muestra de forma prioritaria la pantalla de bienvenida modal **"Configuración Inicial de Administrador"**.
  - El usuario ingresa el email que desea para el administrador maestro y la contraseña (confirmada dos veces, mínimo 6 caracteres).
  - Al pulsar "Crear cuenta de Administrador", el backend valida que `usersCount === 0`, cifra la clave con `bcrypt`, inserta el usuario con `role: 'admin'`, inicia sesión automáticamente y fija la cookie `cdc2_session`.
- **Soporte Desatendido (Docker / CI)**:
  - Si se definen las variables de entorno `CDC2_ADMIN_EMAIL` y `CDC2_ADMIN_PASSWORD`, el servidor puede inicializar automáticamente el admin al arrancar si la base de datos está vacía, sin requerir interacción web.

### RF-3: Flujo de Autenticación, Sesión y Activación
- **Inicio de Sesión (`POST /api/auth/login`)**:
  - Recibe `email` y `password`.
  - Si el usuario no existe: Retorna HTTP 401 (`"Credenciales incorrectas"`).
  - Si el usuario existe y `password_hash === null`: Retorna HTTP 200 con `{ status: "REQUIRES_ACTIVATION", email }` para disparar el flujo de primera vez.
  - Si el usuario existe y la contraseña es correcta: Crea registro en `sessions`, genera cookie `cdc2_session` (HttpOnly, Path=/, MaxAge=30 días) y retorna `{ status: "OK", user: { id, email, role } }`.
- **Activación de Contraseña (`POST /api/auth/activate-password`)**:
  - Utilizado cuando un usuario fue creado por el admin con clave vacía o tras un reseteo de contraseña.
  - Recibe `email`, `password`, `confirmPassword`.
  - Valida que `password === confirmPassword` y longitud mínima de 6 caracteres.
  - Valida que el usuario tenga actualmente `password_hash === null`.
  - Cifra con `bcrypt`, actualiza la base de datos, crea sesión y devuelve la cookie correspondiente.
- **Sesión Actual (`GET /api/auth/me`)**:
  - Valida la cookie `cdc2_session` contra la tabla `sessions` y fecha de expiración.
  - Devuelve los datos públicos del usuario autenticado `{ id, email, role }` o `null` si no hay sesión.
- **Cierre de Sesión (`POST /api/auth/logout`)**:
  - Elimina la sesión en la base de datos y borra la cookie en el cliente.

### RF-4: Componentes de UI en MenuBar
- **Botón "Iniciar Sesión"**:
  - Ubicado en la esquina superior derecha de [MenuBar.tsx](file:///c:/Users/victo/proyectos/cdc2/client/src/MenuBar.tsx).
  - Al pulsar, abre el modal emergente con los campos de *Email* y *Contraseña*.
- **Modal de Activación**:
  - Si el login detecta `REQUIRES_ACTIVATION`, cambia al modal "Bienvenido a Card Deck Crafter - Asigna tu contraseña" con campos de contraseña y confirmación.
- **Avatar Circular estilo Gmail**:
  - Una vez autenticado, el botón de login se sustituye por un avatar circular de 34x34px.
  - Muestra las **2 primeras letras del email en mayúsculas**.
  - Fondo y color de texto calculados con una función hash determinista a partir de los caracteres del email (asegurando colores consistentes y alto contraste legible).
  - Al hacer clic en el avatar, se despliega un menú contextual con:
    - Email del usuario y etiqueta de rol (`Administrador` o `Usuario`).
    - Botón **"Panel de Administrador"** (abre `/admin` en una pestaña nueva, solo visible si `role === 'admin'`).
    - Botón **"Cerrar Sesión"**.

---

## 3. Arquitectura y Diseño de Datos

### 3.1. Esquema de Base de Datos SQLite (`server/data/users.db`)
```sql
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NULL,
  role TEXT NOT NULL DEFAULT 'user',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
```

### 3.2. Interfaces TypeScript (`shared/src/types.ts` o `server/src/auth/types.ts`)
```typescript
export interface User {
  id: string;
  email: string;
  passwordHash: string | null;
  role: 'admin' | 'user';
  createdAt: string;
  updatedAt: string;
}

export interface UserSummary {
  id: string;
  email: string;
  role: 'admin' | 'user';
  hasPassword: boolean;
  createdAt: string;
}

export interface AuthSession {
  id: string;
  userId: string;
  expiresAt: string;
  createdAt: string;
}

export interface IUserRepository {
  findByEmail(email: string): Promise<User | null>;
  findById(id: string): Promise<User | null>;
  createUser(email: string, role?: 'admin' | 'user', passwordHash?: string | null): Promise<User>;
  setPassword(userId: string, passwordHash: string): Promise<void>;
  resetPassword(userId: string): Promise<void>;
  updateRole(userId: string, role: 'admin' | 'user'): Promise<void>;
  deleteUser(userId: string): Promise<void>;
  countUsers(): Promise<number>;
  listUsers(): Promise<UserSummary[]>;
}
```

---

## 4. Interfaces de Componentes / API

### Endpoints del Backend (`server`)

| Método | Endpoint | Descripción | Acceso |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/auth/status` | Comprueba si el sistema tiene usuarios creados | Público |
| `POST` | `/api/auth/setup-admin` | Crea el administrador maestro en el primer arranque | Solo si `usersCount === 0` |
| `POST` | `/api/auth/login` | Autentica usuario y crea cookie de sesión | Público |
| `POST` | `/api/auth/activate-password` | Fija contraseña para usuarios sin clave | Solo si `password_hash === NULL` |
| `GET` | `/api/auth/me` | Devuelve el perfil del usuario autenticado | Sesión activa |
| `POST` | `/api/auth/logout` | Invalida sesión y limpia cookie | Sesión activa |

---

## 5. Estrategia de Verificación (Pruebas)

### 5.1. Pruebas Unitarias Automatizadas (Vitest)
1. **Pruebas de Repositorio SQLite**:
   - Creación de usuario, búsqueda por email, actualización de hash y reseteo a `NULL`.
   - Inserción y eliminación de sesiones, comprobación de expiración.
2. **Pruebas de Utilidad de Avatar**:
   - Función generadora de color determinista: verificar que produce colores hexadecimales válidos y con contraste para cualquier string de email.
3. **Pruebas de Endpoints de Autenticación**:
   - `setup-admin` denegado si ya existe al menos un usuario.
   - `login` correcto genera cookie y valida hash `bcrypt`.
   - `login` devuelve `REQUIRES_ACTIVATION` cuando `password_hash` es `null`.
   - `activate-password` rechaza contraseñas de menos de 6 caracteres o que no coincidan.

### 5.2. Pruebas Manuales / Criterios de Aceptación (Checklist)
1. **Instalación Inicial**:
   - Arrancar la aplicación con base de datos limpia: verificar que aparece la pantalla de bienvenida pidiendo configurar el administrador.
   - Configurar `admin@admin.com` con clave de prueba: verificar que entra directamente como admin y desaparece la pantalla inicial.
2. **Avatar en MenuBar**:
   - Comprobar que en la esquina superior derecha se muestra el avatar con las 2 letras (ej. `"AD"` para `admin@...`) con color determinista.
   - Desplegar el menú y pulsar "Cerrar Sesión": verificar que el botón vuelve a decir "Iniciar Sesión".
3. **Flujo de Activación**:
   - Crear un usuario con contraseña vacía (vía endpoint o test) e intentar loguearse: comprobar que el modal redirige al formulario de activación de contraseña.
   - Introducir nueva clave y comprobar que se autentica automáticamente con éxito.
4. **Persistencia**:
   - Recargar el navegador: comprobar que la cookie de 30 días mantiene la sesión abierta sin pedir login de nuevo.
