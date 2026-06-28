# Ticket - TKT-020: Desacoplar Clave de Variable y Texto por Defecto en Capas de Texto

- **ID del Ticket**: TKT-020
- **Estado**: 🔴 Activo (Pendiente)
- **Fecha de Registro**: 2026-06-28
- **Severidad**: Alta (Problema crítico de consistencia e interfaz de usuario)

---

## 1. Descripción del Requerimiento
Actualmente, el sistema acopla la **Clave de Variable (Nombre de Variable)** y el **Texto por Defecto** en la propiedad `contenidoRaw` de la capa de texto. 
- La clave se infiere buscando un patrón de llaves `{{mi_variable}}` en `contenidoRaw`.
- Al escribir en el campo *"Nombre de Variable"*, se sobreescribe `contenidoRaw` con `{{nueva_variable}}`, borrando el texto por defecto anterior.
- Al escribir en *"Texto por defecto"*, se sobreescribe `contenidoRaw` con el texto plano, borrando la clave `{{variable}}` y perdiendo la relación de enlace de datos de la carta.

El usuario requiere un comportamiento **independiente** y limpio:
1. **Nombre de la Variable (Clave)**:
   - Su único propósito es vincular la capa de texto con los valores de la carta (`valoresCampos`).
   - Al modificarse, debe actualizar la clave del campo (e.g., sincronizarse con `capa.nombre` de la capa en el explorador y con las claves correspondientes en `camposConfig` y los valores de las cartas).
   - No debe interactuar ni modificar el **Texto por Defecto**.
2. **Texto por Defecto**:
   - Debe definir el valor inicial que tendrá este componente cuando se cree una nueva carta basada en esta plantilla.
   - Debe guardarse de manera limpia en la capa (por ejemplo, en `contenidoRaw` directamente como texto plano) sin necesidad de envolverlo con llaves `{{...}}`.

### Funcionamiento esperado al renderizar:
- Al renderizar una carta, para cada capa de texto:
  - Si la carta tiene un valor específico asignado en `valoresCampos` para la clave de esta capa (e.g. `valoresCampos[claveVariable]`), se renderiza ese valor.
  - Si no tiene un valor específico, se renderiza el texto plano guardado en `capa.contenidoRaw` (Texto por defecto).
  - La interpolación ya no dependerá de buscar llaves `{{clave}}` en el texto de la capa, sino de asociar la capa directamente por su clave/nombre al objeto de valores de la carta.

---

## 2. Archivos Implicados
- [`client/src/EditCardModal.tsx`](file:///c:/Users/victo/proyectos/cdc2/client/src/EditCardModal.tsx)
- [`client/src/App.tsx`](file:///c:/Users/victo/proyectos/cdc2/client/src/App.tsx)
- [`client/src/DetailModal.tsx`](file:///c:/Users/victo/proyectos/cdc2/client/src/DetailModal.tsx)
- [`client/src/utils/projectUtils.ts`](file:///c:/Users/victo/proyectos/cdc2/client/src/utils/projectUtils.ts)
- [`server/src/index.ts`](file:///c:/Users/victo/proyectos/cdc2/server/src/index.ts)
- [`server/src/debug_html.ts`](file:///c:/Users/victo/proyectos/cdc2/server/src/debug_html.ts)

---

## 3. Plan de Verificación y Criterios de Aceptación
- [ ] Crear una plantilla y añadir una capa de texto.
- [ ] En la pestaña **Diseño**, escribir la variable clave: `"titulo"`.
  - [ ] Comprobar que el nombre de la capa en el explorador izquierdo cambia automáticamente a `"titulo"`.
- [ ] En *"Texto por defecto"*, escribir: `"Pon tu título aquí"`.
  - [ ] Comprobar que al modificar este campo, el nombre de la variable `"titulo"` no se borra ni se modifica.
- [ ] Crear una nueva carta basada en esta plantilla:
  - [ ] Comprobar que se inicializa con el texto `"Pon tu título aquí"`.
- [ ] Modificar el texto de la nueva carta a `"Caballero Elfo"`.
  - [ ] Comprobar que la carta muestra `"Caballero Elfo"`, pero la plantilla original mantiene `"Pon tu título aquí"`.
