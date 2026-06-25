# Ticket - TKT-014: Independizar Variables de Texto al Duplicar Capas

- **ID del Ticket**: TKT-014
- **Estado**: 🟢 Completado
- **Fecha de Registro**: 2026-06-25
- **Severidad**: Alta (Error de consistencia de datos / Comportamiento incorrecto)

---

## 1. Descripción del Requerimiento
Al duplicar una capa de tipo texto (`tipo === "text"`) en el editor modal (`EditCardModal`), la capa duplicada conserva exactamente el mismo `contenidoRaw` (por ejemplo, `{{campo_123}}`) que la original. 

Esto provoca que ambas capas apunten a la misma variable en el objeto `valoresCampos` de la carta. Al editar el texto de la capa duplicada, los cambios se reflejan de inmediato en la capa original (y viceversa), lo cual impide que el usuario tenga textos independientes.

- **Objetivo**:
  - En `handleDuplicateCapa` de `EditCardModal.tsx`, si la capa a duplicar es de tipo `"text"`:
    - Extraer la clave variable original (ej. `campo_123` de `{{campo_123}}`).
    - Generar una nueva clave de variable única (ej. `campo_1719283719`).
    - Modificar la propiedad `contenidoRaw` de la capa duplicada para que apunte a la nueva clave (ej. `{{campo_1719283719}}`).
    - Duplicar el registro de configuración del campo en `camposConfig` de la plantilla, asignándole un nuevo nombre legible (ej. `"Título (Copia)"`).
    - Duplicar el valor del texto actual en `valoresCampos` (o `valoresCamposTrasera` según corresponda) de la carta activa para inicializar la nueva variable con el mismo texto.

---

## 2. Archivos Implicados
- [`client/src/EditCardModal.tsx`](file:///c:/Users/victo/proyectos/cdc2/client/src/EditCardModal.tsx)

---

## 3. Plan de Verificación y Criterios de Aceptación
- [ ] Abrir la aplicación, seleccionar una carta y abrir el editor modal (`EditCardModal`).
- [ ] Crear o seleccionar una capa de texto, por ejemplo, con el contenido "Ataque".
- [ ] Hacer clic en el botón de duplicar capa para obtener una copia.
- [ ] Seleccionar la capa duplicada y modificar su contenido a "Defensa".
- [ ] Comprobar que la capa original sigue mostrando "Ataque" y no ha cambiado a "Defensa".
- [ ] En la pestaña de **Diseño**, verificar que ambas capas tienen claves de variable distintas en el inspector de propiedades.
