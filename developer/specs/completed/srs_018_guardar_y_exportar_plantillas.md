# Especificación Técnica - SRS-018: Guardar y Exportar Plantillas en Editor

## 1. Introducción y Objetivos
- **Propósito**: Facilitar la gestión de plantillas personalizadas en el modal `EditCardModal`, permitiendo al usuario guardar su plantilla de forma local en el proyecto actual (para reutilización en otras cartas) sin obligarlo a descargar un archivo `.cdc2t`, o permitiéndole exportar la plantilla de forma externa sin añadirla al proyecto.
- **Objetivos de Diseño**:
  - **Eficiencia (UX)**: Evitar la fricción de descargar archivos innecesarios cuando el usuario solo desea guardar la plantilla dentro de su proyecto de sesión actual.
  - **Interfaz Compacta (Dropdown)**: Usar un desplegable de opciones junto al botón de acción principal para mantener limpio el panel lateral de capas y evitar la saturación de botones.

---

## 2. Requisitos Funcionales y Casos de Uso

### RF-1: Botón Principal de "Guardar Plantilla"
- **RF-1.1**: En la parte inferior del panel de jerarquía de capas (columna izquierda de `EditCardModal.tsx`), se añadirá un grupo de botones de guardado y exportación.
- **RF-1.2**: El botón principal será **Guardar Plantilla** (representado por el icono `💾`).
- **RF-1.3**: Al hacer clic en este botón principal:
  - Se solicitará un nombre para la plantilla mediante un diálogo (o mantendrá el actual si el usuario lo confirma).
  - Se generará un nuevo ID de plantilla único (si la plantilla base era por defecto como `"vacia"` o `"simple"`, de acuerdo a SRS-017 / TKT-011).
  - Se llamará al callback `onExportTemplate` para registrar y guardar la plantilla en el catálogo local (`templatesMap` e `importedTemplates`) del proyecto actual.
  - **No se descargará ningún archivo `.cdc2t`**.
  - Se mostrará una confirmación en pantalla al usuario: `Plantilla "Nombre" guardada en el proyecto.`

### RF-2: Botón de Más Opciones y Menú Desplegable
- **RF-2.1**: Al lado derecho del botón principal, se ubicará un botón pequeño de utilidades (representado por el icono `⚙️` o `🔽`).
- **RF-2.2**: Al pulsar este botón, se mostrará un menú desplegable (dropdown menu) posicionado de forma absoluta sobre el contenido.
- **RF-2.3**: El menú desplegable ofrecerá dos opciones:
  - 📥 **Guardar y Exportar**:
    - Solicita el nombre.
    - Guarda la plantilla en el catálogo local del proyecto (llama a `onExportTemplate`).
    - Comprime las capas/assets y descarga el archivo `.cdc2t` en el ordenador del usuario.
  - 📤 **Exportar sin Guardar**:
    - Solicita el nombre.
    - Comprime las capas/assets y descarga el archivo `.cdc2t` en el ordenador del usuario.
    - **No** altera el catálogo local del proyecto (la plantilla no se añade a `importedTemplates` ni sobrescribe a las existentes).
- **RF-2.4**: El menú desplegable se cerrará al hacer clic en cualquiera de las opciones o al pulsar en cualquier parte exterior de la pantalla (clic fuera).

---

## 3. Arquitectura y Lógica de Negocio

La lógica de exportación en `EditCardModal.tsx` se unificará en una función parametrizada:
```typescript
const ejecutarExportacion = async (guardarEnProyecto: boolean, descargarArchivo: boolean) => {
  // 1. Solicitar nombre y calcular nuevo ID único si es built-in
  // 2. Si guardarEnProyecto === true:
  //    - Actualizar estado local tempPlantilla/tempPlantillaTrasera con el nuevo ID y nombre.
  //    - Invocar onExportTemplate(updatedTemplate)
  // 3. Si descargarArchivo === true:
  //    - Generar el ZIP y descargar el archivo `.cdc2t`.
}
```

---

## 4. Interfaces de Componentes / UI
- Estructura HTML:
  ```html
  <div className="template-actions-group">
    <button className="btn-main-save" onClick={...}>💾 Guardar Plantilla</button>
    <button className="btn-options-dropdown" onClick={...}>🔽</button>
    
    <!-- Dropdown Menu -->
    {showDropdown && (
      <div className="options-dropdown-menu">
        <button onClick={...}>📥 Guardar y Exportar (.cdc2t)</button>
        <button onClick={...}>📤 Exportar sin Guardar</button>
      </div>
    )}
  </div>
  ```
- Estilos CSS en `EditCardModal.css` para crear un botón dividido (split button) elegante y un menú desplegable flotante con sombra y bordes redondeados siguiendo la estética premium de la aplicación.

---

## 5. Estrategia de Verificación (Pruebas)

### 5.1. Pruebas Unitarias Automatizadas
Se añadirán pruebas unitarias en `projectUtils.test.ts` para verificar la lógica de la función parametrizada, asegurando que cuando se especifica `guardarEnProyecto = true` se asocian correctamente los campos actualizados, y que el catálogo se mantiene intacto si `guardarEnProyecto = false`.

### 5.2. Pruebas Manuales / Criterios de Aceptación (Checklist)
- [ ] Verificar que el botón principal muestra "💾 Guardar Plantilla" y que el botón de dropdown "🔽" está justo a su lado.
- [ ] Hacer clic en **Guardar Plantilla**:
  - Comprobar que solicita nombre, muestra la alerta de éxito y la plantilla aparece inmediatamente disponible en la sección de "Plantillas Importadas".
  - Comprobar que NO se inicia ninguna descarga en el navegador.
- [ ] Hacer clic en el desplegable y elegir **Guardar y Exportar**:
  - Comprobar que se descarga el archivo `.cdc2t` y se guarda en el proyecto.
- [ ] Hacer clic en el desplegable y elegir **Exportar sin Guardar**:
  - Comprobar que se descarga el archivo `.cdc2t`.
  - Comprobar que la plantilla NO se añade a la sección de "Plantillas Importadas" (el proyecto local no sufre modificaciones).
- [ ] Comprobar que el dropdown se cierra correctamente al hacer clic fuera de él.
