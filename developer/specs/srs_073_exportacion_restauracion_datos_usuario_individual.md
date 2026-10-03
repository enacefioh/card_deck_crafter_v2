# Especificación Técnica - SRS-073: Exportación y Restauración de Datos de Usuario Individual en el Panel de Administración

- **ID de Especificación**: SRS-073
- **Título**: Exportación y Restauración de Datos de Usuario Individual en el Panel de Administración
- **Estado**: 🟡 Propuesta / En Definición
- **Fecha**: 2026-10-02
- **Autor**: Asistente de IA (Antigravity) & Usuario (enacefioh)
- **Hitos Previos**: 
  - [SRS-063 (Panel de Administración Dedicado estilo WordPress)](file:///c:/Users/victo/proyectos/cdc2/developer/specs/completed/srs_063_panel_administracion_wordpress.md)
  - [SRS-065 (Gestión de Cuota de Almacenamiento por Usuario)](file:///c:/Users/victo/proyectos/cdc2/developer/specs/completed/srs_065_gestion_cuota_almacenamiento_admin.md)
  - [SRS-066 (Almacenamiento de Proyectos en la Nube y Control de Cuota)](file:///c:/Users/victo/proyectos/cdc2/developer/specs/completed/srs_066_almacenamiento_proyectos_nube_cuota.md)

---

## 1. Introducción y Objetivos

### 1.1. Propósito
Proporcionar a los administradores del sistema, directamente desde la pestaña **"Usuarios"** del Panel de Administración (`AdminPanel.tsx`), la capacidad de **exportar** de manera aislada todos los proyectos y plantillas de un usuario específico a un archivo comprimido `.zip`, así como **restaurar** dichos datos en la cuenta del usuario en cualquier momento.

Esta funcionalidad permite gestionar de forma flexible el ciclo de vida de los usuarios en el servidor, facilitando el archivado de cuentas inactivas para liberar cuota de disco (especialmente en entornos como Raspberry Pi o servidores con almacenamiento limitado) y garantizando que sus trabajos puedan reincorporarse íntegramente si el usuario retoma su actividad.

### 1.2. Objetivos de Diseño
1. **Granularidad y Aislamiento por Usuario**: Operar estrictamente sobre los datos del usuario seleccionado (`server/data/users/<userId>/`), sin afectar a otros usuarios ni requerir copias masivas de toda la base de datos o del volumen Docker.
2. **Portabilidad y Claridad de Datos**: Empaquetar los proyectos `.cdc2` y plantillas de proyecto en una estructura limpia dentro de un archivo `.zip`, acompañada de un manifiesto descriptivo `user_data.json` que detalle los nombres reales, fechas, número de cartas y tamaños.
3. **Flujo de Restauración Fiel e Idempotente**: Permitir restaurar el paquete `.zip` en la cuenta del usuario (o incluso tras recrear la cuenta), volcando los archivos físicos a disco y actualizando de manera atómica las tablas SQLite `user_projects` y `user_templates`.
4. **Simplicidad de Procesamiento**: Manejar el empaquetado y la recepción directamente en memoria mediante `AdmZip` y `multer.memoryStorage()`, aprovechando que el espacio individual de un usuario está acotado por su cuota (habitualmente entre 50 MB y 1 GB).
5. **Experiencia de Usuario Integrada (UX)**: Incorporar acciones directas e intuitivas (botones 📦 *Exportar* y 📥 *Restaurar*) en la tabla de usuarios de `AdminPanel.tsx`, con confirmación previa y avisos claros de progreso.

---

## 2. Requisitos Funcionales y Casos de Uso

### RF-1: Exportación de Datos de Usuario (`GET /api/admin/users/:id/export`)
- **Permisos**: Requiere sesión con rol de Administrador (`requireAdmin`).
- **Flujo de Ejecución**:
  1. Valida que el usuario exista en la base de datos a través de su identificador `id`.
  2. Consulta en SQLite (`user_projects` y `user_templates`) los registros correspondientes al usuario.
  3. Localiza en el disco físico los archivos binarios `.cdc2`:
     - Proyectos: `<dataDir>/users/<userId>/projects/<filename>`
     - Plantillas: `<dataDir>/users/<userId>/templates/<filename>`
  4. Construye un documento de metadatos `user_data.json` con la información del usuario y el inventario de sus archivos.
  5. Empaqueta en memoria con `AdmZip`:
     - Archivo raíz `user_data.json`.
     - Carpeta `projects/` con los archivos `.cdc2` existentes.
     - Carpeta `templates/` con los archivos `.cdc2` existentes.
  6. Envía el archivo para descarga en el navegador con encabezados de adjunto:
     - Nombre de archivo: `usuario_<sanitized_email>_datos_<YYYYMMDD_HHMMSS>.zip`.
     - Si el usuario no tiene proyectos ni plantillas, se genera el ZIP únicamente con `user_data.json` indicando que la cuenta está vacía.

### RF-2: Restauración de Datos de Usuario (`POST /api/admin/users/:id/restore`)
- **Permisos**: Requiere sesión con rol de Administrador (`requireAdmin`).
- **Entrada**: Archivo `.zip` recibido mediante `multipart/form-data` (campo `backup`), procesado con `multer({ limits: { fileSize: 500 * 1024 * 1024 } })`.
- **Validaciones**:
  1. Comprueba que el archivo recibido sea un ZIP válido y contenga el archivo `user_data.json`.
  2. Valida la integridad del JSON de metadatos.
- **Flujo de Restauración**:
  1. Asegura la existencia de los directorios en disco del usuario: `<dataDir>/users/<userId>/projects/` y `<dataDir>/users/<userId>/templates/`.
  2. Extrae y escribe físicamente en disco los archivos `.cdc2` incluidos en `projects/` y `templates/`.
  3. En una transacción SQLite de base de datos:
     - Registra o actualiza (`INSERT OR REPLACE` / `UPSERT`) los metadatos en las tablas `user_projects` y `user_templates` vinculándolos al `userId` del usuario de destino.
  4. Recalcula el almacenamiento utilizado por el usuario en disco.
- **Respuesta JSON**:
  - `status`: `"OK"`
  - `message`: Mensaje descriptivo con el número de proyectos y plantillas restaurados.
  - `projectsRestored`: Total numérico de proyectos procesados.
  - `templatesRestored`: Total numérico de plantillas procesadas.
  - `usedStorageBytes`: Nuevo espacio ocupado por el usuario en disco.

### RF-3: Interfaz de Usuario en el Panel de Administración (`client/src/admin/AdminPanel.tsx`)
- En la tabla de la pestaña **"Usuarios"**:
  - En la columna **"Acciones"** de cada usuario, añadir:
    - Botón **📦 Exportar**:
      - Descarga directamente el archivo `.zip` con los datos del usuario.
      - Muestra un estado de carga mientras se genera la descarga.
    - Botón **📥 Restaurar**:
      - Abre un cuadro de diálogo / modal de confirmación solicitando seleccionar un archivo `.zip`.
      - Muestra un aviso advirtiendo de la acción e indicando el correo del usuario sobre el que se aplicará.
      - Tras seleccionar y enviar el archivo, muestra un indicador de progreso y notifica el resultado mediante el sistema de feedback existente (`showFeedback`).
      - Actualiza automáticamente la lista de usuarios y el espacio consumido (`usedStorageMb`).

---

## 3. Arquitectura y Diseño de Datos

### 3.1. Estructura del Archivo ZIP de Exportación
```
usuario_victor_at_ejemplo.com_datos_20261002_150000.zip
│
├── user_data.json                       # Metadatos del usuario, proyectos y plantillas
│
├── projects/                            # Archivos binarios de proyectos
│   ├── proj_64435e4e-1d2f-4956.cdc2
│   └── proj_a1b2c3d4-e5f6-7890.cdc2
│
└── templates/                           # Archivos binarios de plantillas
    └── tmpl_1790887591432_xi6b3es.cdc2
```

### 3.2. Formato del Manifiesto `user_data.json`
```json
{
  "version": "1.0.0",
  "exportedAt": "2026-10-02T13:00:00.000Z",
  "user": {
    "id": "ae7bcedf-819d-448b-a331-32a3ab240b77",
    "email": "victor@ejemplo.com",
    "role": "user",
    "storageQuotaMb": 100
  },
  "projects": [
    {
      "id": "proj_64435e4e-1d2f-4956-8a6c-c4430a88f063",
      "filename": "proj_64435e4e-1d2f-4956-8a6c-c4430a88f063.cdc2",
      "name": "Baraja Criaturas del Bosque",
      "description": "Edición inicial con 30 cartas",
      "cardCount": 30,
      "documentCount": 2,
      "fileSizeBytes": 1051984,
      "createdAt": "2026-10-01T11:40:00.000Z",
      "updatedAt": "2026-10-01T12:00:00.000Z"
    }
  ],
  "templates": [
    {
      "id": "tmpl_1790887591432_xi6b3es",
      "filename": "tmpl_1790887591432_xi6b3es.cdc2",
      "name": "Marco Estándar Criatura",
      "description": "Plantilla reutilizable con capas fijas",
      "cardCount": 1,
      "documentCount": 1,
      "fileSizeBytes": 524288,
      "createdAt": "2026-10-01T15:00:00.000Z",
      "updatedAt": "2026-10-01T15:00:00.000Z"
    }
  ]
}
```

---

## 4. Interfaces y Endpoints API

### 4.1. `GET /api/admin/users/:id/export`
- **Método**: `GET`
- **Seguridad**: `requireAdmin`
- **Parámetros URL**: `id` (identificador UUID del usuario)
- **Cabeceras de Respuesta**:
  - `Content-Type`: `application/zip`
  - `Content-Disposition`: `attachment; filename="usuario_<email>_datos_<fecha>.zip"`
- **Códigos de Estado**:
  - `200 OK`: Archivo ZIP transmitido.
  - `404 Not Found`: Usuario no encontrado.
  - `500 Internal Server Error`: Error durante el empaquetado.

### 4.2. `POST /api/admin/users/:id/restore`
- **Método**: `POST`
- **Seguridad**: `requireAdmin`
- **Parámetros URL**: `id` (identificador UUID del usuario sobre el que se restauran los datos)
- **Cuerpo**: `multipart/form-data` con campo de archivo `backup`
- **Códigos de Estado**:
  - `200 OK`: `{ status: "OK", message: "...", projectsRestored: 2, templatesRestored: 1, usedStorageBytes: 1576272 }`
  - `400 Bad Request`: Archivo no recibido, formato de archivo no válido o `user_data.json` ausente.
  - `404 Not Found`: Usuario destino no encontrado.
  - `500 Internal Server Error`: Fallo al escribir ficheros o actualizar la base de datos.

---

## 5. Estrategia de Verificación (Pruebas)

### 5.1. Pruebas Unitarias Automatizadas
1. **Exportación de usuario con datos**:
   - Crear un usuario de prueba en SQLite y persistir un proyecto y una plantilla en su directorio.
   - Invocar el método de exportación y comprobar que el ZIP devuelto contiene `user_data.json`, `projects/<filename>` y `templates/<filename>`.
   - Comprobar que `user_data.json` contiene la lista correcta de proyectos con sus nombres.
2. **Exportación de usuario vacío**:
   - Exportar un usuario sin proyectos ni plantillas y verificar que se genera un ZIP válido con `user_data.json` conteniendo arrays vacíos.
3. **Restauración sobre el mismo usuario**:
   - Tomar el ZIP generado y enviarlo al endpoint de restauración.
   - Comprobar que los archivos se escriben en disco y que las tablas `user_projects` y `user_templates` contienen los registros con la información adecuada.
4. **Restauración sobre un usuario diferente o cuenta recreada**:
   - Verificar que al restaurar el ZIP de un usuario sobre el ID de otro usuario, los registros quedan correctamente reasignados al nuevo `userId`.

### 5.2. Pruebas Manuales / Checklist de Aceptación
- [ ] Iniciar sesión como Administrador y entrar en el Panel de Administración (`/admin` o mediante el menú de usuario).
- [ ] En la pestaña **"Usuarios"**, localizar un usuario que tenga proyectos o plantillas guardadas en la nube.
- [ ] Hacer clic en el botón **📦 Exportar** de ese usuario y comprobar que se descarga el fichero `.zip`.
- [ ] Descomprimir el archivo en el sistema operativo y comprobar:
  - Presencia del archivo `user_data.json` con los metadatos correctos.
  - Existencia de las carpetas `projects/` y `templates/` con los archivos `.cdc2`.
- [ ] Probar la restauración:
  - Pulsar en **📥 Restaurar** en el usuario, seleccionar el archivo `.zip` descargado y confirmar.
  - Comprobar que se muestra el mensaje de confirmación y el espacio consumido en la tabla refleja los datos restaurados.
