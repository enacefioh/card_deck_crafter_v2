# Ticket - TKT-009: Pérdida de Contenido en Otras Cartas al Renombrar Variable de Texto

- **ID del Ticket**: TKT-009
- **Estado**: ✅ Completado
- **Fecha de Registro**: 2026-06-23
- **Severidad**: Alta (Pérdida de datos en UI)

---

## 1. Descripción del Requerimiento / Bug
Al editar una capa de tipo texto en la pestaña **Diseño** y modificar el campo **"Nombre de Variable (Clave)"**, el contenido anteriormente rellenado en las cartas basadas en esta plantilla se pierde o se muestra vacío.

### Análisis del Problema:
* Cuando se renombra la clave de variable (ej: de `titulo` a `titulo_carta`):
  1. En `EditCardModal.tsx`, la función `actualizarClavePlantillaYValores` actualiza el `contenidoRaw` de la plantilla y mueve la clave en el diccionario `tempValoresCampos` **únicamente de la carta que se está editando actualmente**.
  2. Al guardar los cambios, la plantilla se actualiza en el `templatesMap` global del proyecto con la nueva clave.
  3. **El Bug**: Todas las demás cartas del proyecto que utilicen esa misma plantilla no tienen sus diccionarios de `valoresCampos` actualizados con la nueva clave. Siguen guardando el contenido bajo la clave antigua (`titulo`).
  4. Al renderizarse las demás cartas en el lienzo principal, buscan el valor para la nueva clave `titulo_carta` en su diccionario local, y al no encontrarlo, se renderizan en blanco/vacías.

### Comportamiento Esperado:
* Cuando se modifique la clave de una variable de texto en la pestaña Diseño de una plantilla, el guardado en cascada (`handleSaveCardEdits` en `App.tsx`) debe encargarse de escanear todas las cartas de la baraja y renombrar la clave en sus diccionarios `valoresCampos` y `valoresCamposTrasera` si coinciden con la plantilla editada, de forma que conserven su contenido asociado bajo el nuevo nombre de la variable.

---

## 2. Archivos Implicados
- [`client/src/App.tsx`](file:///c:/Users/victo/proyectos/cdc2/client/src/App.tsx) (función `handleSaveCardEdits`)

---

## 3. Plan de Verificación y Criterios de Aceptación
- [ ] Tener un proyecto con 3 cartas que usen la misma plantilla, cada una con un título escrito (ej: "Dragón", "Globin", "Elfo") bajo la variable `titulo`.
- [ ] Abrir el editor modal para "Dragón", ir a la pestaña Diseño y renombrar la variable `titulo` a `nombre_personaje`.
- [ ] Guardar los cambios.
- [ ] Verificar que la carta editada conserva su texto ("Dragón") bajo el nuevo nombre.
- [ ] Verificar que las otras dos cartas ("Globin" y "Elfo") **siguen mostrando sus textos correspondientes** en el lienzo central y no quedan vacías.

---

## 4. Revisión / Extensión (Acentos y Caracteres Especiales)
- **Fecha de Revisión**: 2026-06-23
- **Problema Detectado**: Al escribir un carácter acentuado (como `í` en `Título`), el filtro de saneamiento de claves (`replace(/[^a-zA-Z0-9_]/g, "")`) eliminaba el carácter especial, haciendo que la nueva clave saneada coincidiera con la clave del paso de tecleado anterior. Esto provocaba que `sanitizedClave === oldClave` fuera verdadero.
- **El Bug**: Dentro de `actualizarClavePlantillaYValores` en `projectUtils.ts`, el borrado de la clave anterior (`delete updatedValores[oldClave]`) se ejecutaba incondicionalmente, por lo que al coincidir `sanitizedClave` y `oldClave`, se borraba el valor del diccionario de campos, vaciando el texto de la carta al teclear el acento.
- **Solución**: Se añadió una validación para realizar el renombrado de la clave y el posterior borrado de la clave antigua en el diccionario de valores y la configuración de campos **solo si** `sanitizedClave !== oldClave`.
- **Archivos Modificados**:
  * [`client/src/utils/projectUtils.ts`](file:///c:/Users/victo/proyectos/cdc2/client/src/utils/projectUtils.ts)
  * [`client/src/utils/projectUtils.test.ts`](file:///c:/Users/victo/proyectos/cdc2/client/src/utils/projectUtils.test.ts) (Test unitario añadido)
