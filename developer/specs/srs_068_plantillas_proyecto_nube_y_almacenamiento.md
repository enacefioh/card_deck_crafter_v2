# SRS-068: Plantillas de Proyecto en la Nube y Almacenamiento Separado

## 1. Introducción y Objetivos
- **Propósito**: Extender el sistema de almacenamiento en la nube privada (introducido en SRS-066) para soportar la persistencia, gestión y reutilización de **Plantillas de Proyecto** (.cdc2) en el servidor personal de cada usuario, manteniendo una separación limpia de directorios (`projects/` vs `templates/`), unificando el control de cuota de disco compartida y dotando a la interfaz de pestañas de navegación para proyectos y plantillas.
- **Objetivos de Diseño**:
  - **Aislamiento Físico y Lógico**: Separar en el servidor los proyectos completos de las plantillas base en directorios dedicados (`<userId>/projects/` y `<userId>/templates/`).
  - **Cuota Compartida Transparente**: Toda plantilla de proyecto guardada computa contra la cuota total de MB asignada al usuario (`projectsBytes + templatesBytes <= quotaBytes`).
  - **Instanciación Rápida ("Usar Plantilla")**: Abrir una plantilla desde la nube genera al instante un proyecto de trabajo en memoria con un ID nuevo, impidiendo que el usuario sobreescriba accidentalmente la plantilla maestra al guardar su trabajo.
  - **Base para Biblioteca Comunitaria**: Estructura de base de datos preparada para incorporar en el futuro visibilidad pública (`is_public`) y catálogo compartido entre usuarios.

---

## 2. Requisitos Funcionales y Casos de Uso

### RF-1: Estructura de Directorios Dedicada en el Servidor
- El servicio `UserStorageService` gestionará dos directorios independientes por usuario:
  - `<dataDir>/users/<userId>/projects/` (proyectos con cartas).
  - `<dataDir>/users/<userId>/templates/` (plantillas de proyecto limpias sin cartas).
- Ambos directorios se aseguran mediante creación perezosa (*lazy*) antes de cualquier lectura o escritura.

### RF-2: Esquema de Base de Datos SQLite (Migración v4: `user_templates`)
- Se introduce la tabla `user_templates` para indexar metadatos de las plantillas:
  ```sql
  CREATE TABLE IF NOT EXISTS user_templates (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    filename TEXT NOT NULL,
    name TEXT NOT NULL,
    description TEXT DEFAULT '',
    document_count INTEGER NOT NULL DEFAULT 0,
    template_count INTEGER NOT NULL DEFAULT 0,
    file_size_bytes INTEGER NOT NULL,
    is_public INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE(user_id, filename)
  );
  CREATE INDEX IF NOT EXISTS idx_user_templates_user_updated ON user_templates(user_id, updated_at DESC);
  ```

### RF-3: Control Unificado de Cuota de Disco
- El cálculo de espacio consumido por un usuario sumará el tamaño real de todos los archivos contenidos tanto en `projects/` como en `templates/`:
  $$\text{usedBytes} = \text{getDiskUsedProjectsBytes(userId)} + \text{getDiskUsedTemplatesBytes(userId)}$$
- Los endpoints de consulta (`GET /api/user/storage`) y el panel de administración reflejarán el total acumulado de ambos conceptos.

### RF-4: API Backend para Plantillas de Proyecto
Todos los endpoints requieren autenticación activa mediante cookie de sesión.

1. `GET /api/user/templates`:
   - Lista las plantillas guardadas por el usuario autenticado ordenadas por `updated_at DESC`.
2. `POST /api/user/templates`:
   - Recibe mediante `multipart/form-data`:
     - `file`: Archivo `.cdc2` de la plantilla.
     - `id`: Identificador de la plantilla.
     - `name`: Nombre de la plantilla.
     - `description`: Descripción corta (opcional).
     - `documentCount`: Total de documentos.
     - `templateCount`: Total de diseños de plantilla incluidos.
   - Valida la cuota disponible antes de persistir (teniendo en cuenta la diferencia de peso si es una sobrescritura por ID).
   - Guarda el archivo en `<dataDir>/users/<userId>/templates/<id>.cdc2` y actualiza `user_templates`.
3. `GET /api/user/templates/:id/download`:
   - Descarga el archivo `.cdc2` de la plantilla.
4. `DELETE /api/user/templates/:id`:
   - Elimina el archivo físico de `templates/` y el registro de la base de datos, liberando la cuota.

### RF-5: Guardado de Plantillas en la Nube ("Guardar" y "Guardar Como...")
- En el submenú "Archivo ▶ Guardar Proyecto ▶":
  - ☁️ **Guardar Plantilla en la Nube...**:
    - Abre el modal `SaveCloudTemplateModal` (idéntica interfaz y experiencia de usuario que el guardado de proyectos).
    - Muestra nombre, descripción, espacio disponible y peso estimado.
    - Si la plantilla ya tiene una ID en la nube, la sobrescribe.
  - 📑☁️ **Guardar Plantilla en la Nube Como...**:
    - Permite definir un nuevo nombre y genera una nueva ID de plantilla, creando una bifurcación independiente en el almacenamiento del usuario.

### RF-6: Modal de Gestión de Nube Unificado con Pestañas
- El modal de almacenamiento en la nube incorpora dos pestañas principales:
  - **[📁 Mis Proyectos]**: Muestra la lista de proyectos completos con cartas.
  - **[📐 Mis Plantillas]**: Muestra las plantillas de proyecto guardadas.
- **Acciones en la pestaña de plantillas**:
  - **✨ Usar Plantilla**: Descarga la plantilla, vacía cualquier carta que pudiera tener, le asigna una nueva ID de proyecto (`proj_<timestamp>_<random>`) y la carga en el editor como un nuevo proyecto activo.
  - **📥 Exportar a PC**: Descarga el archivo `.cdc2` al ordenador.
  - **🗑️ Eliminar**: Elimina la plantilla y libera espacio en disco en tiempo real.

---

## 3. Arquitectura y Modelos

### 3.1. Modelo TypeScript Compartido (`shared/projectTypes.ts`)
```typescript
export interface CloudTemplateMetadata {
  id: string;
  userId: string;
  filename: string;
  name: string;
  description: string;
  documentCount: number;
  templateCount: number;
  fileSizeBytes: number;
  isPublic?: boolean;
  createdAt: string;
  updatedAt: string;
}
```

---

## 4. Estrategia de Verificación (Pruebas)

### 4.1. Pruebas Backend Automatizadas
- Migración v4 de base de datos creando la tabla `user_templates`.
- Guardado, actualización por ID y borrado de plantillas verificando la liberación de cuota.
- Validación de rechazo (`HTTP 413`) cuando una plantilla supera el espacio libre.
- Verificación de que la suma de disco en `getUserStorageInfo` contempla tanto `projects/` como `templates/`.

### 4.2. Pruebas Manuales / Checklist
- [ ] Guardar una plantilla de proyecto en la nube y verificar que aparece en la pestaña "Mis Plantillas".
- [ ] Pulsar "Usar Plantilla" y comprobar que carga los documentos y plantillas, pero con una ID de proyecto nueva y sin cartas.
- [ ] Verificar que en el menú de usuario la barra de porcentaje de almacenamiento refleja el peso combinado de proyectos y plantillas.
- [ ] Eliminar una plantilla desde el modal y constatar que el espacio se libera al instante.
