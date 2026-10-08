import type { PlantillaCDC2 } from "shared";
import {
  calculateAutoDimensionsForFreeContainer,
  calculateLayerEffectiveDimensions,
  isFlexLayout,
  isVerticalLayout,
  isHorizontalLayout,
} from "shared";

export const THUMBNAIL_MAX_DIMENSION = 100;
export const THUMBNAIL_SUPERSAMPLE_FACTOR = 4;
export const THUMBNAIL_JPEG_QUALITY = 0.8;

/**
 * Carga una imagen HTML a partir de un src (blob, dataUrl, o url) con timeout seguro.
 */
function cargarImagen(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = (e) => reject(e);
    // Timeout de seguridad en caso de fallo
    setTimeout(() => reject(new Error("Timeout cargando imagen")), 3000);
    img.src = src;
  });
}

/**
 * Limpia y normaliza texto para el lienzo de Canvas:
 * - Sustituye campos de plantilla `{clave}` por su valorDefecto si existe.
 * - Limpia llaves sin sustituir `{...}`.
 * - Convierte `<br>` a saltos de línea `\n`.
 * - Elimina etiquetas HTML y sintaxis markdown para dejar texto limpio.
 */
export function limpiarTextoParaLienzo(rawText: string, camposConfig?: any[]): string {
  if (!rawText) return "";
  let text = String(rawText);

  // 1. Sustituir campos de plantilla por sus valores por defecto
  if (Array.isArray(camposConfig)) {
    for (const f of camposConfig) {
      if (f.clave && f.valorDefecto !== undefined) {
        text = text.replace(new RegExp(`\\{${f.clave}\\}`, "g"), String(f.valorDefecto));
      }
    }
  }

  // 2. Limpiar llaves restantes no resueltas
  text = text.replace(/\{[^}]+\}/g, "...");

  // 3. Reemplazar saltos de línea HTML por \n
  text = text.replace(/<br\s*\/?>/gi, "\n");

  // 4. Eliminar etiquetas HTML
  text = text.replace(/<[^>]+>/g, "");

  // 5. Limpiar sintaxis markdown común
  text = text.replace(/\+\+([^+]+)\+\+/g, "$1"); // CDC2 ++texto++
  text = text.replace(/\*\*([^*]+)\*\*/g, "$1"); // **negrita**
  text = text.replace(/__([^_]+)__/g, "$1");     // __subrayado__
  text = text.replace(/\*([^*]+)\*/g, "$1");      // *cursiva*

  return text;
}

/**
 * Mide el ancho en píxeles de una cadena en Canvas de forma segura,
 * tolerando entornos de prueba (Happy-DOM / Vitest) donde measureText puede no existir o retornar 0.
 */
export function medirAnchoTexto(
  ctx: CanvasRenderingContext2D,
  texto: string,
  fontSizePx: number
): number {
  if (typeof ctx.measureText === "function") {
    try {
      const metrics = ctx.measureText(texto);
      if (typeof metrics?.width === "number" && metrics.width > 0) {
        return metrics.width;
      }
    } catch {
      // Ignorar y usar estimación si falla
    }
  }
  // Estimación segura proporcional a caracteres y tamaño de fuente
  return texto.length * fontSizePx * 0.55;
}

/**
 * Divide un texto en múltiples líneas respetando saltos de línea explícitos (\n)
 * y partiendo párrafos largos por palabras para que se ajusten al ancho máximo disponible.
 */
export function dividirTextoEnLineas(
  ctx: CanvasRenderingContext2D,
  texto: string,
  maxWidth: number,
  fontSizePx: number
): string[] {
  if (!texto) return [];
  const lineasFinales: string[] = [];
  const parrafos = texto.split("\n");

  for (const parrafo of parrafos) {
    if (parrafo.trim() === "") {
      lineasFinales.push("");
      continue;
    }

    const palabras = parrafo.split(" ");
    let lineaActual = "";

    for (const palabra of palabras) {
      const lineaPrueba = lineaActual ? `${lineaActual} ${palabra}` : palabra;
      const ancho = medirAnchoTexto(ctx, lineaPrueba, fontSizePx);

      if (ancho > maxWidth && lineaActual !== "") {
        lineasFinales.push(lineaActual);
        lineaActual = palabra;
      } else {
        lineaActual = lineaPrueba;
      }
    }

    if (lineaActual) {
      lineasFinales.push(lineaActual);
    }
  }

  return lineasFinales;
}

/**
 * Resuelve las coordenadas absolutas en milímetros (xMm, yMm) y dimensiones (wMm, hMm) de una capa,
 * teniendo en cuenta jerarquía de padres, contenedores libres y flujo de contenedores flex.
 */
export function resolverGeometriaCapa(
  capa: any,
  capas: any[],
  cardWMm: number,
  cardHMm: number,
  cache: Map<string, { xMm: number; yMm: number; wMm: number; hMm: number }>,
  stack: Set<string> = new Set()
): { xMm: number; yMm: number; wMm: number; hMm: number } {
  if (cache.has(capa.id)) {
    return cache.get(capa.id)!;
  }
  if (stack.has(capa.id)) {
    // Evitar ciclo infinito
    return { xMm: 0, yMm: 0, wMm: cardWMm, hMm: cardHMm };
  }
  stack.add(capa.id);

  if (capa.tipo === "background") {
    const geo = { xMm: 0, yMm: 0, wMm: cardWMm, hMm: cardHMm };
    cache.set(capa.id, geo);
    return geo;
  }

  const parent = capa.parentCapaId ? capas.find((p: any) => p.id === capa.parentCapaId) : null;

  if (!parent) {
    const isFree = (capa.tipo === "container" || capa.tipo === "list") && !isFlexLayout(capa.layout);
    const autoDims = isFree ? calculateAutoDimensionsForFreeContainer(capa, capas) : null;
    const dims = calculateLayerEffectiveDimensions(capa, capas);

    const wMm = typeof capa.anchoMm === "number"
      ? capa.anchoMm
      : (autoDims ? autoDims.autoWidthMm : (dims.widthMm > 0 ? dims.widthMm : cardWMm));
    const hMm = typeof capa.altoMm === "number"
      ? capa.altoMm
      : (autoDims ? autoDims.autoHeightMm : (dims.heightMm > 0 ? dims.heightMm : cardHMm));

    const geo = {
      xMm: typeof capa.xMm === "number" ? capa.xMm : 0,
      yMm: typeof capa.yMm === "number" ? capa.yMm : 0,
      wMm,
      hMm,
    };
    cache.set(capa.id, geo);
    return geo;
  }

  // Resolver geometría del padre
  const parentGeo = resolverGeometriaCapa(parent, capas, cardWMm, cardHMm, cache, stack);
  const pPadTop = parent.paddingTopMm ?? parent.paddingMm ?? 0;
  const pPadBottom = parent.paddingBottomMm ?? parent.paddingMm ?? 0;
  const pPadLeft = parent.paddingLeftMm ?? parent.paddingMm ?? 0;
  const pPadRight = parent.paddingRightMm ?? parent.paddingMm ?? 0;
  const pBTop = parent.borderTopWidth ?? parent.borderWidth ?? 0;
  const pBBottom = parent.borderBottomWidth ?? parent.borderWidth ?? 0;
  const pBLeft = parent.borderLeftWidth ?? parent.borderWidth ?? 0;
  const pBRight = parent.borderRightWidth ?? parent.borderWidth ?? 0;

  const isParentVertical = isVerticalLayout(parent.layout);
  const isParentHorizontal = isHorizontalLayout(parent.layout);

  let xMm = 0;
  let yMm = 0;

  if (isParentVertical) {
    const siblings = capas.filter((c: any) =>
      c.parentCapaId === parent.id &&
      c.visible !== false &&
      c.visibility !== "hidden" &&
      c.visibility !== "collapsed"
    );
    const index = siblings.findIndex((c: any) => c.id === capa.id);
    let cumHeight = 0;
    for (let i = 0; i < index; i++) {
      const sibDims = calculateLayerEffectiveDimensions(siblings[i], capas);
      cumHeight += typeof siblings[i].altoMm === "number" ? siblings[i].altoMm : sibDims.heightMm;
    }

    xMm = parentGeo.xMm + pBLeft + pPadLeft + (typeof capa.xMm === "number" ? capa.xMm : 0);
    yMm = parentGeo.yMm + pBTop + pPadTop + cumHeight;
  } else if (isParentHorizontal) {
    const siblings = capas.filter((c: any) =>
      c.parentCapaId === parent.id &&
      c.visible !== false &&
      c.visibility !== "hidden" &&
      c.visibility !== "collapsed"
    );
    const index = siblings.findIndex((c: any) => c.id === capa.id);
    let cumWidth = 0;
    for (let i = 0; i < index; i++) {
      const sibDims = calculateLayerEffectiveDimensions(siblings[i], capas);
      cumWidth += typeof siblings[i].anchoMm === "number" ? siblings[i].anchoMm : sibDims.widthMm;
    }

    xMm = parentGeo.xMm + pBLeft + pPadLeft + cumWidth;
    yMm = parentGeo.yMm + pBTop + pPadTop + (typeof capa.yMm === "number" ? capa.yMm : 0);
  } else {
    // Padre contenedor libre
    xMm = parentGeo.xMm + (typeof capa.xMm === "number" ? capa.xMm : 0);
    yMm = parentGeo.yMm + (typeof capa.yMm === "number" ? capa.yMm : 0);
  }

  const dims = calculateLayerEffectiveDimensions(capa, capas);
  const isFreeChild = (capa.tipo === "container" || capa.tipo === "list") && !isFlexLayout(capa.layout);
  const autoDims = isFreeChild ? calculateAutoDimensionsForFreeContainer(capa, capas) : null;

  let wMm = typeof capa.anchoMm === "number"
    ? capa.anchoMm
    : (autoDims ? autoDims.autoWidthMm : dims.widthMm);
  let hMm = typeof capa.altoMm === "number"
    ? capa.altoMm
    : (autoDims ? autoDims.autoHeightMm : dims.heightMm);

  if (wMm <= 0) {
    wMm = Math.max(1, parentGeo.wMm - pBLeft - pBRight - pPadLeft - pPadRight);
  }
  if (hMm <= 0) {
    hMm = Math.max(1, parentGeo.hMm - pBTop - pBBottom - pPadTop - pPadBottom);
  }

  const geo = { xMm, yMm, wMm, hMm };
  cache.set(capa.id, geo);
  return geo;
}

/**
 * Renderiza una miniatura JPEG en Base64 para una plantilla dada utilizando
 * Super-Sampling Anti-Aliasing (SSAA 4x) y reducción bicúbica de alta calidad.
 *
 * - Lienzo interno de render en alta resolución (factor 4x).
 * - Interpolación bicúbica ('high') al downescalar a máx. 100px.
 * - Conservación de jerarquía tipográfica sin aplanamiento a 5px.
 * - Formateo multilínea y partición de texto sin compresión horizontal.
 * - Desplazamiento vertical acumulativo para contenedores flex.
 * - Peso JPEG final ~2-5 KB manteniendo plena compatibilidad.
 */
export async function generarMiniaturaPlantilla(
  plantilla: PlantillaCDC2 | any,
  anchoMmProp?: number,
  altoMmProp?: number
): Promise<string> {
  if (typeof document === "undefined") {
    return "";
  }

  const wMm = plantilla?.anchoMm || anchoMmProp || 63.5;
  const hMm = plantilla?.altoMm || altoMmProp || 88.9;

  // 1. Calcular dimensiones finales de la miniatura (lado mayor <= THUMBNAIL_MAX_DIMENSION)
  let thumbW: number;
  let thumbH: number;

  if (wMm >= hMm) {
    thumbW = THUMBNAIL_MAX_DIMENSION;
    thumbH = Math.max(10, Math.round((hMm / wMm) * THUMBNAIL_MAX_DIMENSION));
  } else {
    thumbH = THUMBNAIL_MAX_DIMENSION;
    thumbW = Math.max(10, Math.round((wMm / hMm) * THUMBNAIL_MAX_DIMENSION));
  }

  // 2. Buffer de alta resolución (Super-Sampling 4x)
  const renderW = Math.round(thumbW * THUMBNAIL_SUPERSAMPLE_FACTOR);
  const renderH = Math.round(thumbH * THUMBNAIL_SUPERSAMPLE_FACTOR);

  const renderCanvas = document.createElement("canvas");
  renderCanvas.width = renderW;
  renderCanvas.height = renderH;
  const ctx = renderCanvas.getContext("2d");

  if (!ctx) {
    return "";
  }

  // Fondo blanco inicial en buffer de render
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, renderW, renderH);

  const scaleX = renderW / wMm;
  const scaleY = renderH / hMm;

  const capas = Array.isArray(plantilla?.capas) ? plantilla.capas : [];
  const geoCache = new Map<string, { xMm: number; yMm: number; wMm: number; hMm: number }>();

  for (const capa of capas) {
    if (capa.visible === false || capa.visibility === "hidden" || capa.visibility === "collapsed") {
      continue;
    }

    const geo = resolverGeometriaCapa(capa, capas, wMm, hMm, geoCache);
    const x = geo.xMm * scaleX;
    const y = geo.yMm * scaleY;
    const w = geo.wMm * scaleX;
    const h = geo.hMm * scaleY;

    ctx.save();

    // Opacidad de capa si está definida
    if (typeof capa.opacity === "number" && capa.opacity >= 0 && capa.opacity <= 1) {
      ctx.globalAlpha = capa.opacity;
    }

    // Rotación de capa si está definida
    const rot = capa.rotacion ?? capa.rotation;
    if (rot) {
      const centerX = x + w / 2;
      const centerY = y + h / 2;
      ctx.translate(centerX, centerY);
      ctx.rotate((rot * Math.PI) / 180);
      ctx.translate(-centerX, -centerY);
    }

    if (capa.tipo === "background") {
      ctx.fillStyle = capa.colorFill || capa.backgroundColor || "#ffffff";
      ctx.fillRect(0, 0, renderW, renderH);
    } else if (
      capa.tipo === "shape" ||
      capa.tipo === "block" ||
      capa.tipo === "container" ||
      capa.tipo === "list"
    ) {
      const bgColor = capa.backgroundColor || capa.colorFill;
      const radiusVal = capa.borderRadius ?? capa.borderTopLeftRadius ?? 0;
      const radius = Math.min(radiusVal * scaleX, w / 2, h / 2);

      if (bgColor && bgColor !== "transparent") {
        ctx.fillStyle = bgColor;
        if (radius > 0 && typeof (ctx as any).roundRect === "function") {
          ctx.beginPath();
          (ctx as any).roundRect(x, y, w, h, radius);
          ctx.fill();
        } else {
          ctx.fillRect(x, y, w, h);
        }
      }

      const bWidth = capa.borderWidth || capa.borderTopWidth || 0;
      if (bWidth > 0) {
        ctx.strokeStyle = capa.borderColor || capa.borderTopColor || "#000000";
        ctx.lineWidth = Math.max(1, bWidth * scaleX);
        if (radius > 0 && typeof (ctx as any).roundRect === "function") {
          ctx.beginPath();
          (ctx as any).roundRect(x, y, w, h, radius);
          ctx.stroke();
        } else {
          ctx.strokeRect(x, y, w, h);
        }
      }
    } else if (capa.tipo === "image" || capa.tipo === "image-switch") {
      let src = capa.src;
      if (capa.tipo === "image-switch" && Array.isArray(capa.options) && capa.options.length > 0) {
        const selectedOpt =
          capa.options.find((o: any) => o.id === capa.selectedOptionId) || capa.options[0];
        if (selectedOpt && selectedOpt.src) {
          src = selectedOpt.src;
        }
      }

      const radiusVal = capa.borderRadius ?? capa.borderTopLeftRadius ?? 0;
      const radius = Math.min(radiusVal * scaleX, w / 2, h / 2);

      const drawImg = async () => {
        if (src && (src.startsWith("blob:") || src.startsWith("data:") || src.startsWith("http"))) {
          try {
            const img = await cargarImagen(src);
            ctx.drawImage(img, x, y, w, h);
          } catch {
            ctx.fillStyle = "#e2e8f0";
            ctx.fillRect(x, y, w, h);
          }
        } else {
          ctx.fillStyle = "#f1f5f9";
          ctx.fillRect(x, y, w, h);
        }
      };

      if (radius > 0 && typeof (ctx as any).roundRect === "function") {
        ctx.save();
        ctx.beginPath();
        (ctx as any).roundRect(x, y, w, h, radius);
        ctx.clip();
        await drawImg();
        ctx.restore();
      } else {
        await drawImg();
      }
    } else if (capa.tipo === "text") {
      // Fondo de texto
      if (capa.backgroundColor && capa.backgroundColor !== "transparent") {
        ctx.fillStyle = capa.backgroundColor;
        ctx.fillRect(x, y, w, h);
      }

      const rawText =
        capa.contenidoRaw !== undefined
          ? capa.contenidoRaw
          : capa.texto !== undefined
          ? capa.texto
          : capa.nombre || "";
      const textContent = limpiarTextoParaLienzo(rawText, plantilla?.camposConfig);

      // Jerarquía tipográfica real sin aplanamiento a 5px
      const fontSizePt =
        typeof capa.fontSizePt === "number" && capa.fontSizePt > 0 ? capa.fontSizePt : 10;
      const fontSizePx = Math.max(6, fontSizePt * 0.352778 * scaleY);
      const lineH =
        fontSizePx *
        (typeof capa.lineHeight === "number" && capa.lineHeight > 0 ? capa.lineHeight : 1.2);

      ctx.font = `${capa.bold ? "bold " : ""}${capa.italic ? "italic " : ""}${fontSizePx}px ${
        capa.fontFamily || "sans-serif"
      }`;
      ctx.fillStyle = capa.color || "#000000";
      ctx.textBaseline = "top";

      const padLeft = (capa.paddingLeftMm ?? capa.paddingMm ?? 0) * scaleX;
      const padRight = (capa.paddingRightMm ?? capa.paddingMm ?? 0) * scaleX;
      const padTop = (capa.paddingTopMm ?? capa.paddingMm ?? 0) * scaleY;
      const innerW = Math.max(1, w - padLeft - padRight);

      // Partición de texto multilínea sin compresión horizontal forzada
      const lineas = dividirTextoEnLineas(ctx, textContent, innerW, fontSizePx);

      let textX = x + padLeft;
      if (capa.alineacion === "center") {
        ctx.textAlign = "center";
        textX = x + padLeft + innerW / 2;
      } else if (capa.alineacion === "right") {
        ctx.textAlign = "right";
        textX = x + padLeft + innerW;
      } else {
        ctx.textAlign = "left";
        textX = x + padLeft;
      }

      // Dibujar líneas de texto dentro del área de la capa
      ctx.save();
      ctx.beginPath();
      ctx.rect(x, y, w, h);
      ctx.clip();

      let curY = y + padTop + 1;
      for (const linea of lineas) {
        if (curY + fontSizePx > y + h) {
          break; // Detener dibujo si excede la altura de la caja
        }
        if (capa.textOutlineWidth && capa.textOutlineColor) {
          ctx.strokeStyle = capa.textOutlineColor;
          ctx.lineWidth = Math.max(1, (capa.textOutlineWidth || 0.2) * scaleX);
          ctx.strokeText(linea, textX, curY);
        }
        ctx.fillText(linea, textX, curY);
        curY += lineH;
      }
      ctx.restore();
    }

    ctx.restore();
  }

  // 3. Downscaling bicúbico al canvas de miniatura final
  const thumbCanvas = document.createElement("canvas");
  thumbCanvas.width = thumbW;
  thumbCanvas.height = thumbH;
  const thumbCtx = thumbCanvas.getContext("2d");

  if (!thumbCtx) {
    return "";
  }

  thumbCtx.imageSmoothingEnabled = true;
  thumbCtx.imageSmoothingQuality = "high";
  thumbCtx.drawImage(renderCanvas, 0, 0, renderW, renderH, 0, 0, thumbW, thumbH);

  try {
    return thumbCanvas.toDataURL("image/jpeg", THUMBNAIL_JPEG_QUALITY);
  } catch (err) {
    console.warn("[thumbnail] Error generando toDataURL:", err);
    return "";
  }
}
