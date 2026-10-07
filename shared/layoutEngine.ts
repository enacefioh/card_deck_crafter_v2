export interface CanvasConfig {
  tipo: "A4" | "A3" | "Custom";
  anchoMm: number;
  altoMm: number;
  orientacion: "vertical" | "horizontal";
  margenTopMm: number;
  margenBottomMm: number;
  margenLeftMm: number;
  margenRightMm: number;
  lineasCorteContinuas: boolean;
  marcasCorteEsquinas: boolean;
}

export interface CardConfig {
  anchoMm: number;
  altoMm: number;
  espaciadoXMm: number;
  espaciadoYMm: number;
  sangradoMm: number;
  bordeCorteMm: number;
  bordeCorteColor: string;
  modoAjuste?: "cover" | "contain";
  reducirArteAlBorde?: boolean;
}

export interface ExposedProperty {
  layerId: string;
  property: string;
  label: string;
}

export interface Carta {
  id: string;
  nombre: string;
  imagenFrontal?: string;
  imagenTrasera: string | null;
  cantidad: number;
  plantillaId?: string;
  valoresCampos?: Record<string, string>;
  capasOverrides?: Record<string, {
    colorFill?: string;
    src?: string;
    modoAjuste?: string;
    color?: string;
    alineacion?: "left" | "center" | "right" | "justify";
    contenidoRaw?: string;
    fontFamily?: string;
    fontSizePt?: number;
    textOutlineWidth?: number;
    textOutlineColor?: string;
    bold?: boolean;
    italic?: boolean;
    underline?: boolean;
    visibility?: "visible" | "hidden" | "collapsed";
  }>;
  plantillaTraseraId?: string;
  valoresCamposTrasera?: Record<string, string>;
  capasOverridesTrasera?: Record<string, {
    colorFill?: string;
    src?: string;
    modoAjuste?: string;
    color?: string;
    alineacion?: "left" | "center" | "right" | "justify";
    contenidoRaw?: string;
    fontFamily?: string;
    fontSizePt?: number;
    textOutlineWidth?: number;
    textOutlineColor?: string;
    bold?: boolean;
    italic?: boolean;
    underline?: boolean;
    visibility?: "visible" | "hidden" | "collapsed";
  }>;
  exposedProperties?: ExposedProperty[];
  plantilla?: PlantillaCDC2;
  plantillaTrasera?: PlantillaCDC2;
}

export interface PlantillaCDC2 {
  id: string;
  nombre: string;
  anchoMm?: number;
  altoMm?: number;
  capas: any[];
  camposConfig?: any[];
  assets?: Array<{
    id: string;
    nombre: string;
    src: string;
  }>;
  customFonts?: CustomFont[];
  exposedProperties?: ExposedProperty[];
  miniatura?: string; // Data URL en base64 de la miniatura JPG (max 100x100px)
  [key: string]: any;
}

export interface CustomFont {
  id: string;
  nombre: string;
  filename: string;
  type: string;
  data?: string; // base64
  src?: string;  // Object URL runtime
}

export interface ProjectAsset {
  id: string;
  nombre: string;
  src: string;
}

export interface DocumentoCDC2 {
  id: string;
  nombre: string;
  canvasConfig: CanvasConfig;
  cardConfig: CardConfig;
  modoTraseras: "comun" | "individual" | "ninguno";
  imagenTraseraComun: string | null;
  cards: Carta[];
}

export interface ProyectoCDC2 {
  version: "2.0.0" | "2.1.0";
  id?: string;
  isTemplate?: boolean;
  type?: "project" | "template";
  meta: {
    id?: string;
    nombre: string;
    fechaCreacion: string;
    fechaModificacion: string;
    isTemplate?: boolean;
    type?: "project" | "template";
  };
  // Campos antiguos para retrocompatibilidad
  canvasConfig?: CanvasConfig;
  cardConfig?: CardConfig;
  modoTraseras?: "comun" | "individual" | "ninguno";
  imagenTraseraComun?: string | null;
  cards?: Carta[];

  // Nuevos campos multidocumento
  documentos?: DocumentoCDC2[];
  activeDocumentoId?: string;

  templates?: Record<string, any>;
  assets?: ProjectAsset[];
  customFonts?: CustomFont[];
  projectSymbols?: any[];
}

export interface LayoutSlot {
  cartaId: string;
  xMm: number;
  yMm: number;
  anchoMm: number;
  altoMm: number;
  imagenSrc: string | null;
  sangradoMm: number;
  bordeCorteMm: number;
  bordeCorteColor: string;
}

export interface LayoutPage {
  pageIndex: number;
  tipo: "frontal" | "trasera";
  slots: LayoutSlot[];
}

export function calcularDistribucion(
  canvas: CanvasConfig,
  card: CardConfig,
  cartas: Carta[],
  modoTraseras: "comun" | "individual" | "ninguno" = "ninguno",
  imagenTraseraComun: string | null = null
): { paginasFrontales: LayoutPage[]; paginasTraseras: LayoutPage[] } {
  const paginasFrontales: LayoutPage[] = [];
  const paginasTraseras: LayoutPage[] = [];

  const sangrado = card.sangradoMm || 0;
  const cardAnchoTotal = card.anchoMm + 2 * sangrado;
  const cardAltoTotal = card.altoMm + 2 * sangrado;

  const anchoUtil = canvas.anchoMm - (canvas.margenLeftMm + canvas.margenRightMm);
  const altoUtil = canvas.altoMm - (canvas.margenTopMm + canvas.margenBottomMm);

  if (anchoUtil <= 0 || altoUtil <= 0) {
    return { paginasFrontales, paginasTraseras };
  }

  const columnas = Math.floor((anchoUtil + card.espaciadoXMm) / (cardAnchoTotal + card.espaciadoXMm));
  const filas = Math.floor((altoUtil + card.espaciadoYMm) / (cardAltoTotal + card.espaciadoYMm));

  if (columnas <= 0 || filas <= 0) {
    return { paginasFrontales, paginasTraseras };
  }

  const cartasPorPagina = columnas * filas;

  const listaCartasPlanas: Carta[] = [];
  for (const carta of cartas) {
    for (let i = 0; i < carta.cantidad; i++) {
      listaCartasPlanas.push(carta);
    }
  }

  if (listaCartasPlanas.length === 0) {
    return { paginasFrontales, paginasTraseras };
  }

  const anchoGrid = columnas * cardAnchoTotal + (columnas - 1) * card.espaciadoXMm;
  const altoGrid = filas * cardAltoTotal + (filas - 1) * card.espaciadoYMm;
  const sobranteX = anchoUtil - anchoGrid;
  const sobranteY = altoUtil - altoGrid;

  const startX = canvas.margenLeftMm + sobranteX / 2;
  const startY = canvas.margenTopMm + sobranteY / 2;

  const numPaginas = Math.ceil(listaCartasPlanas.length / cartasPorPagina);

  for (let p = 0; p < numPaginas; p++) {
    const slotsFrontales: LayoutSlot[] = [];
    const slotsTraseros: LayoutSlot[] = [];

    for (let f = 0; f < filas; f++) {
      for (let c = 0; c < columnas; c++) {
        const indexCarta = p * cartasPorPagina + f * columnas + c;
        if (indexCarta >= listaCartasPlanas.length) {
          break;
        }

        const carta = listaCartasPlanas[indexCarta];

        const xMmFrontal = startX + c * (cardAnchoTotal + card.espaciadoXMm);
        const yMm = startY + f * (cardAltoTotal + card.espaciadoYMm);

        slotsFrontales.push({
          cartaId: carta.id,
          xMm: xMmFrontal,
          yMm,
          anchoMm: cardAnchoTotal,
          altoMm: cardAltoTotal,
          imagenSrc: carta.imagenFrontal || null,
          sangradoMm: sangrado,
          bordeCorteMm: card.bordeCorteMm,
          bordeCorteColor: card.bordeCorteColor,
        });

        if (modoTraseras !== "ninguno") {
          const xMmTrasera = startX + (columnas - 1 - c) * (cardAnchoTotal + card.espaciadoXMm);

          let imagenSrcTrasera: string | null = carta.imagenTrasera || imagenTraseraComun;

          slotsTraseros.push({
            cartaId: carta.id,
            xMm: xMmTrasera,
            yMm,
            anchoMm: cardAnchoTotal,
            altoMm: cardAltoTotal,
            imagenSrc: imagenSrcTrasera,
            sangradoMm: sangrado,
            bordeCorteMm: card.bordeCorteMm,
            bordeCorteColor: card.bordeCorteColor,
          });
        }
      }
    }

    paginasFrontales.push({
      pageIndex: p,
      tipo: "frontal",
      slots: slotsFrontales,
    });

    if (modoTraseras !== "ninguno" && slotsTraseros.length > 0) {
      const slotsTraserosOrdenados = [...slotsTraseros].sort((a, b) => {
        if (Math.abs(a.yMm - b.yMm) > 0.01) {
          return a.yMm - b.yMm;
        }
        return a.xMm - b.xMm;
      });

      paginasTraseras.push({
        pageIndex: p,
        tipo: "trasera",
        slots: slotsTraserosOrdenados,
      });
    }
  }

  return { paginasFrontales, paginasTraseras };
}

// --- Tipos y Funciones de Utilidad para Layout de Contenedores (SRS-071) ---
export type ContainerLayout =
  | "none"
  | "vertical"
  | "vertical-center"
  | "vertical-reverse"
  | "horizontal"
  | "horizontal-center"
  | "horizontal-reverse";

export function isVerticalLayout(layout?: string): boolean {
  return layout === "vertical" || layout === "vertical-center" || layout === "vertical-reverse";
}

export function isHorizontalLayout(layout?: string): boolean {
  return layout === "horizontal" || layout === "horizontal-center" || layout === "horizontal-reverse";
}

export function isFlexLayout(layout?: string): boolean {
  return isVerticalLayout(layout) || isHorizontalLayout(layout);
}

export interface ContainerFlexStyle {
  display: "flex";
  flexDirection: "column" | "column-reverse" | "row" | "row-reverse";
  justifyContent?: "center";
}

export function getContainerFlexStyle(layout?: string): ContainerFlexStyle | null {
  if (!isFlexLayout(layout)) return null;

  switch (layout) {
    case "vertical-center":
      return { display: "flex", flexDirection: "column", justifyContent: "center" };
    case "vertical-reverse":
      return { display: "flex", flexDirection: "column-reverse" };
    case "vertical":
      return { display: "flex", flexDirection: "column" };
    case "horizontal-center":
      return { display: "flex", flexDirection: "row", justifyContent: "center" };
    case "horizontal-reverse":
      return { display: "flex", flexDirection: "row-reverse" };
    case "horizontal":
      return { display: "flex", flexDirection: "row" };
    default:
      return null;
  }
}

export function getContainerFlexCssString(layout?: string): string {
  const style = getContainerFlexStyle(layout);
  if (!style) return "";
  let css = `display: flex; flex-direction: ${style.flexDirection};`;
  if (style.justifyContent) {
    css += ` justify-content: ${style.justifyContent};`;
  }
  return css;
}

// --- Tipos y Funciones de Utilidad para Listas y Subplantillas Hijas (SRS-072) ---
export interface ChildTemplate {
  id: string;               // ID única de la subplantilla (ej. "tmpl_mele_1")
  tag: string;              // Etiqueta identificativa (ej. "mele")
  name: string;             // Nombre visible para el usuario (ej. "Ataque Melé")
  rootCapa: any;            // Clon de la capa raíz de la subplantilla
  descendantCapas?: any[];  // Capas anidadas hijas si rootCapa es un container
  exposedProperties?: any[]; // Propiedades expuestas asociadas a la plantilla
}

export function cloneLayerTreeWithNewIds(
  rootCapa: any,
  descendantCapas: any[] = [],
  targetParentId: string
): { newRoot: any; newDescendants: any[]; idMap: Map<string, string> } {
  const idMap = new Map<string, string>();

  // 1. Generar nueva ID para la raíz
  const newRootId = `layer_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  idMap.set(rootCapa.id, newRootId);

  // 2. Generar nuevas IDs para todas las descendientes
  descendantCapas.forEach((c) => {
    idMap.set(c.id, `layer_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`);
  });

  // 3. Clonar y reasignar raíz
  const newRoot = {
    ...JSON.parse(JSON.stringify(rootCapa)),
    id: newRootId,
    parentCapaId: targetParentId
  };

  // 4. Clonar y reasignar descendientes
  const newDescendants = descendantCapas.map((c) => {
    const cloned = JSON.parse(JSON.stringify(c));
    cloned.id = idMap.get(c.id)!;
    cloned.parentCapaId = idMap.get(c.parentCapaId) || newRootId;
    return cloned;
  });

  return { newRoot, newDescendants, idMap };
}

/**
 * Calcula las dimensiones efectivas (ancho y alto en mm) de una capa cualquiera,
 * considerando si sus propiedades 'anchoMm' o 'altoMm' están en 'auto' o son numéricas.
 */
export function calculateLayerEffectiveDimensions(
  layer: any,
  allLayers: any[],
  overrides?: Record<string, any>,
  visited: Set<string> = new Set()
): { widthMm: number; heightMm: number } {
  if (!layer) return { widthMm: 0, heightMm: 0 };

  const layerOverrides = overrides?.[layer.id];
  const resolved = layerOverrides ? { ...layer, ...layerOverrides } : layer;

  // Si ambas dimensiones son numéricas, retornar directamente
  if (typeof resolved.anchoMm === "number" && typeof resolved.altoMm === "number") {
    return { widthMm: resolved.anchoMm, heightMm: resolved.altoMm };
  }

  // 1. Contenedores y Listas
  if (resolved.tipo === "container" || resolved.tipo === "list") {
    if (!isFlexLayout(resolved.layout)) {
      // Contenedor Libre: recursión de bounding box
      const freeDims = calculateAutoDimensionsForFreeContainer(resolved, allLayers, overrides, visited);
      return {
        widthMm: typeof resolved.anchoMm === "number" ? resolved.anchoMm : freeDims.autoWidthMm,
        heightMm: typeof resolved.altoMm === "number" ? resolved.altoMm : freeDims.autoHeightMm
      };
    } else {
      // Contenedor Flex (vertical, horizontal, wrap)
      const bW = (resolved.borderLeftWidth || 0) + (resolved.borderRightWidth || 0);
      const bH = (resolved.borderTopWidth || 0) + (resolved.borderBottomWidth || 0);

      const children = allLayers.filter((c: any) => {
        if (c.parentCapaId !== resolved.id) return false;
        const chOv = overrides?.[c.id];
        const vis = chOv?.visibility !== undefined ? chOv.visibility : (c.visibility || "visible");
        return vis !== "collapsed";
      });

      if (children.length === 0) {
        return {
          widthMm: typeof resolved.anchoMm === "number" ? resolved.anchoMm : bW,
          heightMm: typeof resolved.altoMm === "number" ? resolved.altoMm : bH
        };
      }

      const childDims = children.map(c => calculateLayerEffectiveDimensions(c, allLayers, overrides, new Set(visited)));

      let flexAutoW = 0;
      let flexAutoH = 0;

      if (isVerticalLayout(resolved.layout)) {
        flexAutoW = Math.max(...childDims.map(d => d.widthMm), 0) + bW;
        flexAutoH = childDims.reduce((acc, d) => acc + d.heightMm, 0) + bH;
      } else {
        // Horizontal o wrap
        flexAutoW = childDims.reduce((acc, d) => acc + d.widthMm, 0) + bW;
        flexAutoH = Math.max(...childDims.map(d => d.heightMm), 0) + bH;
      }

      return {
        widthMm: typeof resolved.anchoMm === "number" ? resolved.anchoMm : Number(flexAutoW.toFixed(2)),
        heightMm: typeof resolved.altoMm === "number" ? resolved.altoMm : Number(flexAutoH.toFixed(2))
      };
    }
  }

  // 2. Capas de Texto
  if (resolved.tipo === "text") {
    const bW = (resolved.borderLeftWidth || 0) + (resolved.borderRightWidth || 0);
    const bH = (resolved.borderTopWidth || 0) + (resolved.borderBottomWidth || 0);
    const padW = (resolved.paddingLeftMm || 0) + (resolved.paddingRightMm || 0);
    const padH = (resolved.paddingTopMm || 0) + (resolved.paddingBottomMm || 0);

    const fontSizePt = typeof resolved.fontSizePt === "number" && resolved.fontSizePt > 0 ? resolved.fontSizePt : 12;
    const fontSizeMm = (fontSizePt * 25.4) / 72; // ~4.233 mm para 12pt
    const lineH = Math.max(fontSizeMm * 1.35, 5.0);
    const charWidthMm = fontSizeMm * 0.55;

    const text = resolved.contenidoRaw !== undefined ? resolved.contenidoRaw : (resolved.contenido !== undefined ? resolved.contenido : (resolved.nombre || ""));
    const rawLines = (text ? String(text) : "Texto").split("\n");

    let widthMm = typeof resolved.anchoMm === "number" ? resolved.anchoMm : 0;
    if (resolved.anchoMm === "auto" || typeof resolved.anchoMm !== "number") {
      const maxLineChars = Math.max(1, ...rawLines.map(l => l.length || 1));
      const estimatedW = (maxLineChars * charWidthMm) + padW + bW;
      widthMm = Number(Math.max(estimatedW, fontSizeMm * 2 + padW + bW).toFixed(2));
    }

    let heightMm = typeof resolved.altoMm === "number" ? resolved.altoMm : 0;
    if (resolved.altoMm === "auto" || typeof resolved.altoMm !== "number") {
      let visualLines = 0;
      if (resolved.anchoMm !== "auto" && widthMm > 0) {
        const innerW = Math.max(1, widthMm - padW - bW);
        const charsPerLine = Math.max(1, Math.floor(innerW / charWidthMm));
        for (const line of rawLines) {
          const len = line.length || 1;
          visualLines += Math.max(1, Math.ceil(len / charsPerLine));
        }
      } else {
        visualLines = Math.max(1, rawLines.length);
      }
      const estimatedH = (visualLines * lineH) + padH + bH;
      // Altura mínima para una línea de texto de 12pt con interlineado
      const minTextHeight = (Math.round((fontSizePt * 25.4 / 72) * 100) / 100) * 2;
      heightMm = Number(Math.max(estimatedH, minTextHeight + padH + bH).toFixed(2));
    }

    return { widthMm, heightMm };
  }

  // 3. Bloques
  if (resolved.tipo === "block") {
    const bW = (resolved.borderLeftWidth || 0) + (resolved.borderRightWidth || 0);
    const bH = (resolved.borderTopWidth || 0) + (resolved.borderBottomWidth || 0);
    const widthMm = typeof resolved.anchoMm === "number" ? resolved.anchoMm : (bW > 0 ? bW : 20);
    const heightMm = typeof resolved.altoMm === "number" ? resolved.altoMm : (bH > 0 ? bH : 20);
    return { widthMm, heightMm };
  }

  // 4. Imágenes y otros elementos
  const widthMm = typeof resolved.anchoMm === "number" ? resolved.anchoMm : 20;
  const heightMm = typeof resolved.altoMm === "number" ? resolved.altoMm : 20;
  return { widthMm, heightMm };
}

/**
 * Calcula las dimensiones automáticas (ancho y alto en mm) de un contenedor con layout libre ('none'),
 * ajustándose a la posición y tamaño del hijo situado más a la derecha (x + width) y más hacia abajo (y + height),
 * incluyendo los bordes del propio contenedor (box-sizing: border-box).
 */
export function calculateAutoDimensionsForFreeContainer(
  container: any,
  allLayers: any[],
  overrides?: Record<string, any>,
  visited: Set<string> = new Set()
): { autoWidthMm: number; autoHeightMm: number } {
  if (!container || !container.id || !Array.isArray(allLayers) || visited.has(container.id)) {
    return { autoWidthMm: 0, autoHeightMm: 0 };
  }
  visited.add(container.id);

  const containerOverrides = overrides?.[container.id];
  const resolvedContainer = containerOverrides ? { ...container, ...containerOverrides } : container;

  // Filtrar hijos directos que pertenezcan a este contenedor y no estén colapsados
  const directChildren = allLayers.filter((c: any) => {
    if (c.parentCapaId !== container.id) return false;
    const childOverrides = overrides?.[c.id];
    const vis = childOverrides?.visibility !== undefined ? childOverrides.visibility : (c.visibility || "visible");
    return vis !== "collapsed";
  });

  const borderLeft = typeof resolvedContainer.borderLeftWidth === "number" ? resolvedContainer.borderLeftWidth : 0;
  const borderRight = typeof resolvedContainer.borderRightWidth === "number" ? resolvedContainer.borderRightWidth : 0;
  const borderTop = typeof resolvedContainer.borderTopWidth === "number" ? resolvedContainer.borderTopWidth : 0;
  const borderBottom = typeof resolvedContainer.borderBottomWidth === "number" ? resolvedContainer.borderBottomWidth : 0;

  if (directChildren.length === 0) {
    return {
      autoWidthMm: Number((borderLeft + borderRight).toFixed(2)),
      autoHeightMm: Number((borderTop + borderBottom).toFixed(2))
    };
  }

  let maxX = 0;
  let maxY = 0;

  for (const child of directChildren) {
    const childOverrides = overrides?.[child.id];
    const resolvedChild = childOverrides ? { ...child, ...childOverrides } : child;

    const childX = typeof resolvedChild.xMm === "number" ? resolvedChild.xMm : 0;
    const childY = typeof resolvedChild.yMm === "number" ? resolvedChild.yMm : 0;

    const dims = calculateLayerEffectiveDimensions(resolvedChild, allLayers, overrides, new Set(visited));

    const childW = typeof resolvedChild.anchoMm === "number" ? resolvedChild.anchoMm : dims.widthMm;
    const childH = typeof resolvedChild.altoMm === "number" ? resolvedChild.altoMm : dims.heightMm;

    maxX = Math.max(maxX, childX + childW);
    maxY = Math.max(maxY, childY + childH);
  }

  return {
    autoWidthMm: Number((maxX + borderLeft + borderRight).toFixed(2)),
    autoHeightMm: Number((maxY + borderTop + borderBottom).toFixed(2))
  };
}


