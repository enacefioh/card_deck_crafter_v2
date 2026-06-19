# Especificación Técnica - SRS-010: Editor de Propiedades de Carta (Campos Dinámicos y Formulario del Sidebar)

## 1. Introducción y Objetivos
- **Módulo**: Dynamic Card Form Generator & Property Inspector.
- **Propósito**: Generar dinámicamente formularios de edición en el panel lateral (sidebar) basados en la configuración de campos de la plantilla activa. Permite al usuario rellenar los datos dinámicos (título, texto, ilustraciones) de cada carta de manera individual.
- **Objetivos de Diseño**:
  - **Generación Dinámica de Componentes**: Generar inputs de texto, selectores de números o cargadores de imágenes de acuerdo con el tipo de datos del campo de la plantilla.
  - **Vinculación Reactiva**: Sincronización instantánea entre la edición en el formulario y el lienzo central de previsualización.

---

## 2. Requisitos Funcionales

### RF-1: Generación de Inputs según Tipo de Campo
Cuando el usuario seleccione una carta basada en una plantilla, el panel de propiedades lateral renderizará un formulario iterando sobre `camposConfig` de la plantilla:
- **Campos de tipo `text`**: Renderiza un `<input type="text" />` para textos de una línea o `<textarea>` para textos multilinea.
- **Campos de tipo `number`**: Renderiza controles de cantidad (`+` / `-`).
- **Campos de tipo `image`**: Renderiza una dropzone compacta donde el usuario puede arrastrar o cargar un archivo. Este archivo se guardará localmente como una URL de objeto temporal en `valoresCampos[clave]`.

### RF-2: Renombrado de Cartas Automático
- Si la plantilla posee una variable llamada `nombre` o `titulo`, cambiar ese campo en el formulario actualizará automáticamente la propiedad `nombre` de la carta principal en la lista.

### RF-3: Sincronización del Renderizador
- Cada pulsación de tecla o carga de imagen en el formulario actualizará el estado global `cartas` mediante:
  ```typescript
  const handleUpdateCampoValue = (cartaId: string, claveCampo: string, valor: string) => {
    setCartas((prev) =>
      prev.map((c) =>
        c.id === cartaId
          ? { ...c, valoresCampos: { ...c.valoresCampos, [claveCampo]: valor } }
          : c
      )
    );
  };
  ```
- El visor volverá a evaluar `combinarPlantillaYValores` y repintará el slot al instante.

---

## 3. Estrategia de Verificación

### Pruebas Manuales
- Seleccionar una carta basada en plantilla.
- Verificar que el sidebar muestra un input para el "Título" y otro para el "Texto".
- Escribir en el input "Título" y confirmar que el lienzo central se actualiza en tiempo real letra por letra.
- Cargar una ilustración en el campo de imagen y comprobar que se visualiza en la carta.
