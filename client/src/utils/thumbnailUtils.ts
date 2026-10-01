import type { PlantillaCDC2 } from "shared";

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

function calcularCoordenadasAbsolutas(capa: any, capas: any[]): { xMm: number; yMm: number } {
  let x = capa.xMm ?? 0;
  let y = capa.yMm ?? 0;
  let current = capa;
  let depth = 0;
  while (current && current.parentCapaId && depth < 10) {
    depth++;
    const parent = capas.find((p: any) => p.id === current.parentCapaId);
    if (!parent) break;
    x += parent.xMm ?? 0;
    y += parent.yMm ?? 0;
    current = parent;
  }
  return { xMm: x, yMm: y };
}

/**
 * Renderiza una miniatura JPEG en Base64 para una plantilla dada.
 * - Ancho o alto máximo de 100px.
 * - Mantiene fielmente la relación de aspecto de la carta.
 * - Calidad de compresión JPEG de 0.8 (peso ~2-5 KB).
 */
export async function generarMiniaturaPlantilla(
  plantilla: PlantillaCDC2 | any,
  anchoMmProp?: number,
  altoMmProp?: number
): Promise<string> {
  if (typeof document === "undefined") {
    return "";
  }

  const maxDimensionPx = 100;
  const wMm = plantilla.anchoMm || anchoMmProp || 63.5;
  const hMm = plantilla.altoMm || altoMmProp || 88.9;

  let canvasW: number;
  let canvasH: number;

  if (wMm >= hMm) {
    canvasW = maxDimensionPx;
    canvasH = Math.max(10, Math.round((hMm / wMm) * maxDimensionPx));
  } else {
    canvasH = maxDimensionPx;
    canvasW = Math.max(10, Math.round((wMm / hMm) * maxDimensionPx));
  }

  const canvas = document.createElement("canvas");
  canvas.width = canvasW;
  canvas.height = canvasH;
  const ctx = canvas.getContext("2d");

  if (!ctx) {
    return "";
  }

  // 1. Fondo blanco inicial
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvasW, canvasH);

  const scaleX = canvasW / wMm;
  const scaleY = canvasH / hMm;

  const capas = Array.isArray(plantilla.capas) ? plantilla.capas : [];

  for (const capa of capas) {
    if (capa.visible === false || capa.visibility === "hidden" || capa.visibility === "collapsed") {
      continue;
    }

    const { xMm, yMm } = calcularCoordenadasAbsolutas(capa, capas);
    const x = xMm * scaleX;
    const y = yMm * scaleY;
    const w = (capa.anchoMm === "auto" ? wMm : (capa.anchoMm ?? wMm)) * scaleX;
    const h = (capa.altoMm === "auto" ? hMm : (capa.altoMm ?? hMm)) * scaleY;

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
      ctx.fillRect(0, 0, canvasW, canvasH);
    } else if (capa.tipo === "shape" || capa.tipo === "block" || capa.tipo === "container") {
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
        const selectedOpt = capa.options.find((o: any) => o.id === capa.selectedOptionId) || capa.options[0];
        if (selectedOpt && selectedOpt.src) {
          src = selectedOpt.src;
        }
      }

      if (src && (src.startsWith("blob:") || src.startsWith("data:") || src.startsWith("http"))) {
        try {
          const img = await cargarImagen(src);
          ctx.drawImage(img, x, y, w, h);
        } catch {
          // Placeholder si falla la carga
          ctx.fillStyle = "#e2e8f0";
          ctx.fillRect(x, y, w, h);
        }
      } else {
        // Placeholder gris si no tiene src
        ctx.fillStyle = "#f1f5f9";
        ctx.fillRect(x, y, w, h);
      }
    } else if (capa.tipo === "text") {
      // Fondo de texto
      if (capa.backgroundColor && capa.backgroundColor !== "transparent") {
        ctx.fillStyle = capa.backgroundColor;
        ctx.fillRect(x, y, w, h);
      }

      let textContent = capa.contenidoRaw || capa.texto || capa.nombre || "";
      // Reemplazo de campos por valorDefecto
      if (Array.isArray(plantilla.camposConfig)) {
        for (const f of plantilla.camposConfig) {
          if (f.clave && f.valorDefecto) {
            textContent = textContent.replace(new RegExp(`\\{${f.clave}\\}`, "g"), f.valorDefecto);
          }
        }
      }
      // Limpiar etiquetas no renderizables como llaves restantes
      textContent = textContent.replace(/\{[^}]+\}/g, "...");

      const fontSizePx = Math.max(5, (capa.fontSizePt || 10) * 0.352778 * scaleY);
      ctx.font = `${capa.bold ? "bold " : ""}${capa.italic ? "italic " : ""}${fontSizePx}px ${capa.fontFamily || "sans-serif"}`;
      ctx.fillStyle = capa.color || "#000000";
      ctx.textBaseline = "top";

      // Alineación
      let textX = x;
      if (capa.alineacion === "center") {
        ctx.textAlign = "center";
        textX = x + w / 2;
      } else if (capa.alineacion === "right") {
        ctx.textAlign = "right";
        textX = x + w;
      } else {
        ctx.textAlign = "left";
      }

      // Dibujar texto con recorte al contenedor
      ctx.save();
      ctx.beginPath();
      ctx.rect(x, y, w, h);
      ctx.clip();
      ctx.fillText(textContent, textX, y + 2, w);
      ctx.restore();
    }

    ctx.restore();
  }

  try {
    return canvas.toDataURL("image/jpeg", 0.8);
  } catch (err) {
    console.warn("[thumbnail] Error generando toDataURL:", err);
    return "";
  }
}
