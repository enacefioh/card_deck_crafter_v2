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
  }>;
}

export interface ProyectoCDC2 {
  version: "2.0.0";
  meta: {
    nombre: string;
    fechaCreacion: string;
    fechaModificacion: string;
  };
  canvasConfig: CanvasConfig;
  cardConfig: CardConfig;
  modoTraseras: "comun" | "individual" | "ninguno";
  imagenTraseraComun: string | null;
  cards: Carta[];
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

  const anchoUtil = canvas.anchoMm - (canvas.margenLeftMm + canvas.margenRightMm);
  const altoUtil = canvas.altoMm - (canvas.margenTopMm + canvas.margenBottomMm);

  if (anchoUtil <= 0 || altoUtil <= 0) {
    return { paginasFrontales, paginasTraseras };
  }

  const columnas = Math.floor((anchoUtil + card.espaciadoXMm) / (card.anchoMm + card.espaciadoXMm));
  const filas = Math.floor((altoUtil + card.espaciadoYMm) / (card.altoMm + card.espaciadoYMm));

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

  const anchoGrid = columnas * card.anchoMm + (columnas - 1) * card.espaciadoXMm;
  const altoGrid = filas * card.altoMm + (filas - 1) * card.espaciadoYMm;
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

        const xMmFrontal = startX + c * (card.anchoMm + card.espaciadoXMm);
        const yMm = startY + f * (card.altoMm + card.espaciadoYMm);

        slotsFrontales.push({
          cartaId: carta.id,
          xMm: xMmFrontal,
          yMm,
          anchoMm: card.anchoMm,
          altoMm: card.altoMm,
          imagenSrc: carta.imagenFrontal || null,
          sangradoMm: card.sangradoMm,
          bordeCorteMm: card.bordeCorteMm,
          bordeCorteColor: card.bordeCorteColor,
        });

        if (modoTraseras !== "ninguno") {
          const xMmTrasera = startX + (columnas - 1 - c) * (card.anchoMm + card.espaciadoXMm);

          let imagenSrcTrasera: string | null = null;
          if (modoTraseras === "comun") {
            imagenSrcTrasera = imagenTraseraComun;
          } else if (modoTraseras === "individual") {
            imagenSrcTrasera = carta.imagenTrasera || imagenTraseraComun;
          }

          slotsTraseros.push({
            cartaId: carta.id,
            xMm: xMmTrasera,
            yMm,
            anchoMm: card.anchoMm,
            altoMm: card.altoMm,
            imagenSrc: imagenSrcTrasera,
            sangradoMm: card.sangradoMm,
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
