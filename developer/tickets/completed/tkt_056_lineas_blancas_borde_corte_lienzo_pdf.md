# Ticket - TKT-056: Eliminación de Líneas Blancas (Costuras Subpíxel) en Bordes de Corte en Lienzo y PDF

- **ID del Ticket**: TKT-056
- **Estado**: 🟢 Completado
- **Fecha de Cierre**: 2026-10-20
- **Fecha de Registro**: 2026-10-20
- **Severidad**: Media-Alta (Defecto visual de renderizado en bordes de corte tanto en pantalla como en exportación a PDF)

---

## 1. Descripción del Problema
Al añadir un borde de corte a las cartas (por ejemplo, `bordeCorteMm: 2` de color negro `#000000`), incluso cuando el fondo de la carta es completamente negro o con texturas oscuras, aparecen unas líneas blancas nítidas de 1 píxel alrededor del perímetro de la carta (en la frontera entre el borde de corte y el contenido interior). Este fallo se manifiesta tanto en la vista previa del lienzo en pantalla (`App.tsx`) como en el archivo PDF exportado generado mediante Puppeteer (`generarHtmlImpresion`).

### Causa Raíz Técnica:
1. **Falta de relleno de fondo en el slot de carta (`.card-slot`)**:  
   El contenedor exterior `.card-slot` no tiene color de fondo definido (es transparente). Por detrás se encuentra la hoja de impresión (`.canvas-page` en frontend o `.page` en PDF), cuyo fondo es blanco `#ffffff`.
2. **Fondo forzado a blanco en el contenedor escalado de la plantilla**:  
   El contenedor de renderizado de la plantilla (`.card-template-render` en frontend y `.card-template-render-wrapper` en backend) tiene estilizado `backgroundColor: "#ffffff"` codificado de forma rígida.
3. **Discrepancia de rasterizado y costura subpíxel (T-Junction / Seam)**:  
   Cuando `bordeCorteMm > 0`, el borde se dibuja mediante un elemento superpuesto con CSS `border: ${bordeCorteMm}px solid ${bordeCorteColor}`, mientras que el diseño de la carta se reduce exactamente al área interior disponible mediante `transform: scale(scaleX, scaleY)` con origen en `top left` y desplazamiento `left: borderMm, top: borderMm`.  
   Al calcular posiciones en coma flotante con factores de zoom y conversión DPI, el borde y el contenido escalado sufren redondeos independientes a nivel de subpíxel. Al encontrarse con una tolerancia de 0px de solapamiento, se genera una rendija microscópica (0.2–0.8px) entre el borde y el contenido, dejando expuesto el fondo blanco subyacente.

---

## 2. Solución Propuesta
1. **Underfill en `.card-slot` con el color del borde de corte**:  
   Cuando `bordeCorteMm > 0`, establecer `backgroundColor: slot.bordeCorteColor` en `.card-slot`. Cualquier microfisura subpíxel entre el borde y el contenido mostrará el color del borde (ej. negro `#000000`) y jamás el blanco de la página.
2. **Sincronización del color de fondo de la plantilla**:  
   En `.card-template-render` y `.card-template-render-wrapper`, si la plantilla cuenta con una capa de tipo `"background"`, emplear su `colorFill` (o `slot.bordeCorteColor` cuando hay borde de corte activo) en lugar de forzar `#ffffff`.
3. **Solapamiento / Sangrado Subpíxel Seguro (Técnica Estándar de Artes Gráficas)**:  
   El contenido interior se escala permitiendo un sangrado microscópico por debajo del borde de corte (ej. `overlap = Math.min(0.2, borderMm * 0.15)` mm, aproximadamente 1px). Dado que el elemento `.card-border-cut` se sitúa por encima en la pila visual (z-index superior), su borde sólido cubre con precisión milimétrica el sangrado, garantizando matemáticamente que no quede ningún hueco subpíxel visible.
4. **Aplicación Unificada en Todos los Motores**:  
   - Frontend: `client/src/App.tsx` (anverso y reverso).
   - Frontend: `client/src/DetailModal.tsx` (modal de detalle).
   - Backend: `server/src/index.ts` (`generarHtmlImpresion` para PDF y previsualizaciones).

---

## 3. Archivos Implicados
- [`client/src/App.tsx`](file:///c:/Users/victo/proyectos/cdc2/client/src/App.tsx)
- [`client/src/DetailModal.tsx`](file:///c:/Users/victo/proyectos/cdc2/client/src/DetailModal.tsx)
- [`server/src/index.ts`](file:///c:/Users/victo/proyectos/cdc2/server/src/index.ts)

---

## 4. Plan de Verificación y Criterios de Aceptación
- [ ] Configurar un documento con una carta con fondo oscuro/negro y un borde de corte negro de 1.5mm o 2mm.
- [ ] Inspeccionar el lienzo con diferentes niveles de zoom y verificar que no aparece ninguna línea blanca entre el borde de corte y la ilustración.
- [ ] Verificar tanto el anverso como el reverso de la carta.
- [ ] Exportar el documento a PDF y comprobar que en el visor de PDF tampoco aparecen líneas blancas en los perímetros de corte.
- [ ] Ejecutar la suite de pruebas unitarias y verificar que todas pasan sin regresiones.
