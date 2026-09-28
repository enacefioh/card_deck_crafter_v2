# Especificación Técnica (SRS-063): Panel de Administración Dedicado estilo WordPress (`/admin`)

## 1. Introducción y Objetivos
- **Propósito**: Proporcionar una interfaz web centralizada y dedicada para la administración de **Card Deck Crafter v2**, accesible en una ruta `/admin` en una pestaña independiente del navegador, con un diseño y flujo de trabajo inspirado en WordPress (barra lateral izquierda de navegación y área de trabajo derecha con tablas y formularios).
- **Objetivos de Diseño**:
  - **Experiencia de Usuario Profesional**: Separar la herramienta de diseño gráfico de maquetación del panel de administración del sistema para evitar saturar la interfaz de diseño.
  - **Control de Acceso Estricto**: Restringir el acceso exclusivamente a usuarios autenticados con rol `admin`.
  - **Gestión Completa de Usuarios**: Permitir al administrador registrar nuevos usuarios por email (con clave vacía), resetear contraseñas para forzar reactivación, cambiar roles (`user`/`admin`) y eliminar usuarios.
  - **Preparación para Futuras Métricas y Módulos**: Estructurar el panel con una sección "Inicio" (Dashboard) lista para métricas de uso, cuotas de almacenamiento y futuras herramientas de publicación comunitaria.

---

## 2. Requisitos Funcionales y Casos de Uso

### RF-1: Ruta `/admin` y Guardias de Seguridad
- **Ruta Web Dedicada**:
  - La ruta `/admin` renderiza la vista de administración independiente (sin la barra superior de diseño de cartas ni el lienzo).
  - Apertura desde la aplicación: El botón "Panel de Administrador" del menú del avatar en [MenuBar.tsx](file:///c:/Users/victo/proyectos/cdc2/client/src/MenuBar.tsx) abre `/admin` en una nueva pestaña (`target="_blank"`).
- **Guardia de Acceso en Frontend**:
  - Si un usuario no autenticado o con rol `user` intenta acceder a `/admin`, se le muestra un mensaje claro de acceso denegado con un botón para volver a la aplicación principal.
- **Middleware de Autorización en Backend (`requireAdmin`)**:
  - Todos los endpoints de administración en `/api/admin/*` exigen sesión válida y verificación estricta de `role === 'admin'`. De lo contrario, responden HTTP 403 Forbidden.

### RF-2: Layout y Navegación estilo WordPress
- **Barra Lateral Izquierda (Sidebar de Administración)**:
  - Cabecera: Logotipo de Card Deck Crafter y etiqueta de "Administración".
  - Menú de navegación:
    - 📊 **Inicio** (Dashboard resumen).
    - 👥 **Usuarios** (Gestión de usuarios).
  - Pie del sidebar: Botón "Volver a la App" (redirige a la aplicación principal `/`).
- **Área de Trabajo Principal (Derecha)**:
  - Barra superior con indicador del administrador autenticado y botón de cierre de sesión.
  - Contenido dinámico según la sección seleccionada en el menú lateral.

### RF-3: Sección "Inicio" (Dashboard)
- **Tarjetas de Resumen**:
  - **Total de Usuarios Registrados**: Conteo numérico actualizado en tiempo real.
  - **Usuarios Activos**: Conteo de usuarios que ya han activado su contraseña.
  - **Usuarios Pendientes**: Conteo de usuarios con contraseña vacía pendientes de primer acceso.
- **Tarjeta de Información del Sistema**:
  - Versión del software actual (ej. `v2.260928.1`).
  - Motor de base de datos (`SQLite 3`).
  - Espacio de bienvenida con mensaje explicativo.

### RF-4: Sección "Usuarios" (CRUD y Operaciones Administrativas)
- **Tabla de Usuarios**:
  - Columnas:
    - **Avatar / Iniciales**: Círculo con iniciales y color determinista idéntico al de la barra principal.
    - **Email**: Dirección de correo del usuario.
    - **Rol**: Badge identificativo (`Admin` en púrpura / `Usuario` en gris).
    - **Estado de Clave**: Badge verde *"Activo"* (si tiene clave fijada) o badge amarillo *"Pendiente de activación"* (si `password_hash` es NULL).
    - **Fecha de Registro**: Formateada de forma legible.
    - **Acciones**: Botones de acción contextuales.
- **Buscador / Filtro**:
  - Campo de texto para filtrar usuarios por email en tiempo real.
- **Acción: "+ Añadir Usuario"**:
  - Botón destacado en la cabecera de la sección.
  - Abre un modal con campo para introducir el email.
  - Al confirmar, el backend crea el usuario con `password_hash = NULL` y rol `user`.
- **Acción: "Resetear Contraseña"**:
  - Botón por fila en la tabla.
  - Muestra un diálogo de confirmación: *"¿Deseas resetear la contraseña de este usuario? Se borrará su clave actual y deberá asignar una nueva al iniciar sesión."*
  - Al aceptar, llama a `POST /api/admin/users/:id/reset-password`, fijando `password_hash = NULL`.
- **Acción: "Cambiar Rol"**:
  - Selector en la fila o modal para alternar entre `user` y `admin`.
- **Acción: "Eliminar Usuario"**:
  - Diálogo de confirmación para eliminar la cuenta y sus sesiones.
  - **Restricción de seguridad**: El administrador no puede eliminarse a sí mismo ni revocar su propio rol de admin para evitar dejar el sistema sin administradores.

---

## 3. Interfaces de Componentes / API

### Endpoints del Backend (`server/api/admin`)

| Método | Endpoint | Descripción | Seguridad |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/admin/dashboard` | Métricas de conteo de usuarios y estado general | `requireAdmin` |
| `GET` | `/api/admin/users` | Listado completo de usuarios | `requireAdmin` |
| `POST` | `/api/admin/users` | Crea un nuevo usuario con clave vacía (`{ email, role? }`) | `requireAdmin` |
| `POST` | `/api/admin/users/:id/reset-password` | Resetea la contraseña de un usuario a `NULL` | `requireAdmin` |
| `PATCH` | `/api/admin/users/:id/role` | Actualiza el rol de un usuario (`{ role: 'admin' \| 'user' }`) | `requireAdmin` |
| `DELETE` | `/api/admin/users/:id` | Elimina un usuario y todas sus sesiones | `requireAdmin` |

---

## 4. Estrategia de Verificación (Pruebas)

### 4.1. Pruebas Unitarias Automatizadas
1. **Middleware `requireAdmin`**:
   - Peticiones sin cookie devuelven 401.
   - Peticiones con usuario de rol `user` devuelven 403 Forbidden.
   - Peticiones con usuario de rol `admin` permiten el paso.
2. **Endpoints de Usuarios**:
   - `POST /api/admin/users` crea usuario con `password_hash = NULL`.
   - `POST /api/admin/users/:id/reset-password` establece `password_hash` en `NULL`.
   - Auto-eliminación del propio admin autenticado bloqueada con error 400.

### 4.2. Pruebas Manuales / Criterios de Aceptación (Checklist)
1. **Acceso al Panel**:
   - Iniciar sesión como `admin`: verificar que el menú del avatar muestra la opción "Panel de Administrador".
   - Al hacer clic, se abre una pestaña nueva en `http://localhost:5173/admin`.
   - Iniciar sesión con un usuario estándar (`role: 'user'`): comprobar que la opción "Panel de Administrador" no aparece y que al intentar abrir `/admin` manualmente se deniega el acceso.
2. **Navegación WordPress**:
   - Comprobar el sidebar izquierdo con secciones "Inicio" y "Usuarios", con estilos oscuros coherentes con Card Deck Crafter v2.
   - Probar el botón "Volver a la App".
3. **Flujo de Alta y Reseteo**:
   - Crear un nuevo usuario `tester@cdc2.local` desde el panel de administración.
   - Verificar que aparece en la tabla con el badge amarillo "Pendiente de activación".
   - Abrir una ventana de incógnito, intentar iniciar sesión con `tester@cdc2.local`: comprobar que solicita fijar contraseña y luego accede correctamente.
   - Volver al panel de admin y pulsar "Resetear Contraseña" de `tester@cdc2.local`: comprobar que vuelve al estado pendiente.
