# SRS-041: Error al Añadir Carta desde Plantilla

**Estado: Completado**

## Síntoma
Cuando un usuario intenta añadir una carta desde plantilla utilizando la opción "Añadir Carta desde Plantilla" (tanto en la barra de menú superior como en el panel lateral), la carta no se añade al listado y parece no tener efecto.

## Causa Raíz
El modal de selección de plantilla utiliza el estado `templateModalMode` para decidir si el usuario está:
1. Añadiendo una nueva carta (`addCard`).
2. Asignando un reverso a la carta seleccionada (`assignBack`).

Cuando el usuario asienta o asigna un reverso a una carta, `templateModalMode` se establece en `"assignBack"`. Sin embargo, al abrir el modal para "Añadir Carta desde Plantilla" desde el menú o el botón del lateral, solo se llama a `setShowTemplateModal(true)` y **no se restablece** `templateModalMode` a `"addCard"`. Esto provoca que el modal intente erróneamente asignar un reverso en lugar de instanciar la nueva carta.

## Corrección Propuesta
Actualizar los disparadores de apertura del modal de plantillas en [App.tsx](file:///c:/Users/victo/proyectos/cdc2/client/src/App.tsx) para asegurar que siempre inicialicen `templateModalMode` en `"addCard"` al querer agregar una carta:
1. En la propiedad `onAddCardFromTemplate` de `MenuBar`.
2. En el botón "Añadir Carta desde Plantilla" del panel de importar/crear cartas.

## Plan de Verificación

### Pruebas Unitarias
Crear o añadir un test automatizado para verificar que `templateModalMode` se comporte correctamente o que las funciones de añadir cartas no sean ignoradas debido a un modo de estado persistente incorrecto.

### Pruebas Manuales
1. Crear una plantilla de reverso o asignar una plantilla como reverso a una carta existente (esto cambia el modo a `assignBack`).
2. Cerrar/terminar esa acción.
3. Hacer clic en "Añadir Carta desde Plantilla" en el menú lateral o superior.
4. Seleccionar cualquier plantilla y verificar que ahora se añade correctamente una nueva carta al final del listado y se selecciona de forma automática.
