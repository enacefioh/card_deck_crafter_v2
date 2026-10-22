# TKT-060: Despliegue inicial de contenedores y botones de Colapsar/Expandir todo en el inspector lateral

## Estado: Completado
**Fecha:** 2026-10-22
**Prioridad:** Media
**Tipo:** Mejora de UX

---

## Descripción del Problema
Actualmente, en el panel lateral de campos editables de la mesa de trabajo (`App.tsx`), todos los contenedores jerárquicos se inicializaban colapsados por defecto (según RF-7.1 de SRS-080). Con las mejoras recientes en la maquetación (como la alineación vertical sin necesidad de contenedores adicionales), las anidaciones se han simplificado drásticamente, haciendo preferible ver todo el contenido editable desplegado desde el inicio.
Adicionalmente, se requería disponer de controles rápidos para colapsar y expandir todos los elementos (contenedores e items de listas) con un solo clic.

## Requerimientos y Solución Implementada
1. **Despliegue inicial por defecto**:
   - Al cargar o seleccionar cartas, todos los grupos y contenedores jerárquicos se muestran desplegados (abiertos) por defecto mediante `collapsedSections[item.id] === true`.
   - Los elementos de las listas (acordeón de items de lista) se inicializan desplegados mediante `expandedListItems[child.id] !== false`.
2. **Botones de Colapsar y Expandir Todo**:
   - Se añadieron dos botones precediendo al checkbox de *"Mostrar todos los campos"* en la cabecera del panel lateral derecho.
   - Textos de los botones: `▶ Colapsar` y `▼ Expandir`.
   - **Colapsar todo**: colapsa todos los contenedores jerárquicos y todos los items de listas de las cartas seleccionadas.
   - **Expandir todo**: expande todos los contenedores jerárquicos y todos los items de listas de las cartas seleccionadas.
3. **Tests automatizados y verificación**:
   - Se crearon pruebas unitarias en `TKT060InspectorExpandCollapseAll.test.tsx` que verifican el estado por defecto y las acciones masivas.
   - Verificado manualmente y aprobado por el usuario.
