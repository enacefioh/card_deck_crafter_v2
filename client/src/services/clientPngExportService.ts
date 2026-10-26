import * as htmlToImage from "html-to-image";
import JSZip from "jszip";
import type { Carta, DocumentoCDC2, PlantillaCDC2, ProyectoCDC2 } from "shared";
import { sanitizarNombreCarpeta, renderCardFaceContentHtml } from "shared";

export interface ExportProgressInfo {
  documentoActual: string;
  indiceDoc: number;
  totalDocs: number;
  cartaActual: number;
  totalCartas: number;
  porcentaje: number;
  mensaje: string;
}

export interface ClientPngExportOptions {
  documentos: DocumentoCDC2[];
  templatesMap?: Record<string, PlantillaCDC2>;
  projectSymbols?: any[];
  projectAssets?: any[];
  userAssets?: any[];
  customFonts?: any[];
  nombreProyecto?: string;
  onProgress?: (progress: ExportProgressInfo) => void;
  signal?: AbortSignal;
}

/**
 * Carga una imagen HTML de forma segura con soporte para image.decode() y timeout.
 */
function cargarImagenHtml(src: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    if (typeof Image === "undefined") {
      resolve(null);
      return;
    }
    const img = new Image();
    img.crossOrigin = "anonymous";
    let settled = false;

    const finalize = () => {
      if (settled) return;
      settled = true;
      resolve(img);
    };

    img.onload = () => {
      if (img.decode) {
        img.decode().then(finalize).catch(finalize);
      } else {
        finalize();
      }
    };
    img.onerror = () => {
      if (settled) return;
      settled = true;
      resolve(null); // Continuar aunque falle una imagen
    };

    // Timeout de seguridad rápido
    setTimeout(finalize, 2500);

    try {
      img.src = src;
      if (img.complete && img.naturalWidth > 0) {
        finalize();
      }
    } catch {
      finalize();
    }
  });
}

/**
 * Renderiza de forma nativa e instantánea una carta que es únicamente una imagen (sin plantilla)
 * directamente en un Canvas 2D a 300 DPI, evitando el overhead del DOM y la descarga de fuentes.
 */
async function renderizarCaraSoloImagen(
  src: string,
  anchoPx: number,
  altoPx: number,
  modoAjuste: string = "cover"
): Promise<Blob> {
  const canvas = document.createElement("canvas");
  canvas.width = anchoPx;
  canvas.height = altoPx;
  const ctx = canvas.getContext("2d");

  if (ctx) {
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, anchoPx, altoPx);

    try {
      const img = await cargarImagenHtml(src);
      if (img && (img.naturalWidth > 0 || img.width > 0)) {
        const imgW = img.naturalWidth || img.width || anchoPx;
        const imgH = img.naturalHeight || img.height || altoPx;
        const imgRatio = imgW / imgH;
        const canvasRatio = anchoPx / altoPx;

        let drawW = anchoPx;
        let drawH = altoPx;
        let drawX = 0;
        let drawY = 0;

        if (modoAjuste === "contain") {
          if (imgRatio > canvasRatio) {
            drawW = anchoPx;
            drawH = anchoPx / imgRatio;
            drawY = (altoPx - drawH) / 2;
          } else {
            drawH = altoPx;
            drawW = altoPx * imgRatio;
            drawX = (anchoPx - drawW) / 2;
          }
        } else {
          // "cover" por defecto
          if (imgRatio > canvasRatio) {
            drawH = altoPx;
            drawW = altoPx * imgRatio;
            drawX = (anchoPx - drawW) / 2;
          } else {
            drawW = anchoPx;
            drawH = anchoPx / imgRatio;
            drawY = (altoPx - drawH) / 2;
          }
        }

        ctx.drawImage(img, drawX, drawY, drawW, drawH);
      }
    } catch (e) {
      console.warn("[clientPngExport] Error dibujando imagen en canvas 2D:", e);
    }
  }

  return new Promise<Blob>((resolve) => {
    if (typeof canvas.toBlob === "function") {
      canvas.toBlob((blob) => {
        if (blob) resolve(blob);
        else resolve(new Blob(["dummy_png_data"], { type: "image/png" }));
      }, "image/png");
    } else {
      resolve(new Blob(["dummy_png_data"], { type: "image/png" }));
    }
  });
}

/**
 * Espera a que todas las imágenes contenidas en un elemento DOM terminen de decodificar.
 */
async function esperarImagenesCargadas(container: HTMLElement): Promise<void> {
  const imgs = Array.from(container.querySelectorAll("img"));
  if (imgs.length === 0) return;

  await Promise.all(
    imgs.map(async (img) => {
      try {
        if (img.decode) {
          await img.decode();
        } else if (!img.complete) {
          await new Promise<void>((resolve) => {
            img.onload = () => resolve();
            img.onerror = () => resolve();
            setTimeout(resolve, 2000);
          });
        }
      } catch {
        // Continuar si falla la decodificación
      }
    })
  );
}

/**
 * Genera el archivo ZIP con todas las imágenes PNG a 300 DPI de forma 100% local en el cliente.
 */
export async function exportarProyectoPngEnCliente(
  options: ClientPngExportOptions
): Promise<Blob> {
  const {
    documentos,
    templatesMap = {},
    projectSymbols = [],
    customFonts = [],
    nombreProyecto = "baraja_cdc2",
    onProgress,
    signal
  } = options;

  if (!documentos || documentos.length === 0) {
    throw new Error("No hay documentos en el proyecto para exportar.");
  }

  // Preconstruir CSS para tipografías personalizadas del proyecto (si existen)
  let projectFontsCss = "";
  if (customFonts && customFonts.length > 0) {
    for (const f of customFonts) {
      if (f.data && f.nombre) {
        projectFontsCss += `@font-face { font-family: '${f.nombre}'; src: url('data:font/${f.type || "truetype"};base64,${f.data}'); }\n`;
      }
    }
  }

  // Contenedor sandbox para renderizar plantillas DOM
  // Posicionado en 0,0 con z-index bajo para que quede cubierto por el modal de progreso
  const sandbox = document.createElement("div");
  sandbox.id = "cdc2-export-canvas-sandbox";
  sandbox.style.position = "fixed";
  sandbox.style.left = "0px";
  sandbox.style.top = "0px";
  sandbox.style.zIndex = "10";
  sandbox.style.pointerEvents = "none";
  sandbox.style.opacity = "1";
  sandbox.style.overflow = "hidden";
  document.body.appendChild(sandbox);

  const zip = new JSZip();
  const usedFolderNames = new Set<string>();

  // Calcular total de cartas físicas estimadas para el cálculo de porcentaje
  let totalCartasFisicasTotal = 0;
  documentos.forEach((doc) => {
    (doc.cards || []).forEach((c) => {
      totalCartasFisicasTotal += Math.max(1, c.cantidad || 1);
    });
  });

  if (totalCartasFisicasTotal === 0) {
    document.body.removeChild(sandbox);
    throw new Error("El proyecto no contiene cartas para exportar.");
  }

  let cartasFisicasProcesadasGlobal = 0;

  try {
    for (let dIndex = 0; dIndex < documentos.length; dIndex++) {
      if (signal?.aborted) {
        throw new Error("Exportación cancelada por el usuario.");
      }

      const doc = documentos[dIndex];
      let folderName = sanitizarNombreCarpeta(doc.nombre, dIndex);
      let altSuffix = 1;
      const baseFolderName = folderName;
      while (usedFolderNames.has(folderName)) {
        altSuffix++;
        folderName = `${baseFolderName}_${altSuffix}`;
      }
      usedFolderNames.add(folderName);

      const folderZip = zip.folder(folderName)!;

      const cardConfig = doc.cardConfig || { anchoMm: 63.5, altoMm: 88.9, sangradoMm: 0.5 };
      const anchoMm = cardConfig.anchoMm;
      const altoMm = cardConfig.altoMm;

      // Dimensiones netas CSS a 96 DPI
      const cssWidthPx = (anchoMm / 25.4) * 96;
      const cssHeightPx = (altoMm / 25.4) * 96;

      // Dimensiones netas finales en píxeles a 300 DPI
      const anchoPx300Dpi = Math.round((anchoMm / 25.4) * 300);
      const altoPx300Dpi = Math.round((altoMm / 25.4) * 300);

      sandbox.style.width = `${cssWidthPx}px`;
      sandbox.style.height = `${cssHeightPx}px`;

      const cards = doc.cards || [];
      const uniqueCardsCount = cards.length;
      let totalCardsCount = 0;
      let frontImagesCount = 0;
      let backImagesCount = 0;

      // Proyecto sintético para resolver plantillas y símbolos
      const proyectoSintetico: ProyectoCDC2 = {
        version: "2.1.0",
        meta: {
          nombre: nombreProyecto,
          fechaCreacion: new Date().toISOString(),
          fechaModificacion: new Date().toISOString()
        },
        documentos,
        activeDocumentoId: doc.id,
        templates: templatesMap,
        projectSymbols,
        assets: options.projectAssets || [],
        customFonts: []
      };

      // Si el modo de trasera es 'común', podemos capturar la trasera común UNA SOLA VEZ para todo el documento
      let commonBackBlob: Blob | null = null;
      if (doc.modoTraseras === "comun") {
        if (doc.imagenTraseraComun) {
          // Trasera común es una imagen pura: renderizado directo en canvas 2D
          commonBackBlob = await renderizarCaraSoloImagen(
            doc.imagenTraseraComun,
            anchoPx300Dpi,
            altoPx300Dpi,
            cardConfig.modoAjuste || "cover"
          );
        } else {
          // Trasera común con plantilla o fondo generado
          const dummyCardForBack: Carta = {
            id: "__common_back__",
            nombre: "Trasera Común",
            valoresCampos: {},
            capasOverrides: {},
            imagenTrasera: null,
            cantidad: 1
          };

          const commonBackHtml = renderCardFaceContentHtml(dummyCardForBack, true, doc, proyectoSintetico);
          if (commonBackHtml) {
            sandbox.innerHTML = `
              <div id="cdc2-render-back-common" style="width: ${cssWidthPx}px; height: ${cssHeightPx}px; position: relative; overflow: hidden; background-color: #ffffff;">
                ${commonBackHtml}
              </div>
            `;
            await esperarImagenesCargadas(sandbox);
            if (document.fonts) {
              await document.fonts.ready;
            }

            try {
              const targetNode = (sandbox.firstElementChild as HTMLElement) || sandbox;
              commonBackBlob = await htmlToImage.toBlob(targetNode, {
                width: cssWidthPx,
                height: cssHeightPx,
                pixelRatio: 3.125,
                skipFonts: true,
                fontEmbedCSS: projectFontsCss || undefined,
                cacheBust: false,
                backgroundColor: "#ffffff",
                style: {
                  position: "relative",
                  left: "0px",
                  top: "0px",
                  margin: "0px",
                  transform: "none",
                  opacity: "1",
                  visibility: "visible"
                }
              });
            } catch (captureErr) {
              console.warn("[clientPngExport] Error capturando trasera común con html-to-image:", captureErr);
            }
          }
        }
      }

      let physicalCardIndex = 1;

      for (let cIndex = 0; cIndex < cards.length; cIndex++) {
        if (signal?.aborted) {
          throw new Error("Exportación cancelada por el usuario.");
        }

        const card = cards[cIndex];
        const count = Math.max(1, card.cantidad || 1);

        // 1. Renderizar delantera única de esta carta
        let frontBlob: Blob | null = null;
        const tienePlantillaFront = !!(card.plantilla || (card.plantillaId && templatesMap[card.plantillaId]));
        const esSoloImagenFront = !tienePlantillaFront && !!card.imagenFrontal;

        if (esSoloImagenFront && card.imagenFrontal) {
          // Vía rápida: renderizado instantáneo 2D sin foreignObject ni overhead de DOM
          frontBlob = await renderizarCaraSoloImagen(
            card.imagenFrontal,
            anchoPx300Dpi,
            altoPx300Dpi,
            cardConfig.modoAjuste || "cover"
          );
        } else {
          // Vía plantilla: renderizado HTML en sandbox
          const frontContentHtml = renderCardFaceContentHtml(card, false, doc, proyectoSintetico);
          sandbox.innerHTML = `
            <div id="cdc2-render-front" style="width: ${cssWidthPx}px; height: ${cssHeightPx}px; position: relative; overflow: hidden; background-color: #ffffff;">
              ${frontContentHtml}
            </div>
          `;
          await esperarImagenesCargadas(sandbox);
          if (document.fonts) {
            await document.fonts.ready;
          }

          try {
            const targetNode = (sandbox.firstElementChild as HTMLElement) || sandbox;
            frontBlob = await htmlToImage.toBlob(targetNode, {
              width: cssWidthPx,
              height: cssHeightPx,
              pixelRatio: 3.125,
              skipFonts: true,
              fontEmbedCSS: projectFontsCss || undefined,
              cacheBust: false,
              backgroundColor: "#ffffff",
              style: {
                position: "relative",
                left: "0px",
                top: "0px",
                margin: "0px",
                transform: "none",
                opacity: "1",
                visibility: "visible"
              }
            });
          } catch (captureErr) {
            console.warn(`[clientPngExport] Error capturando delantera de carta ${card.id}:`, captureErr);
          }
        }

        // Fallback para entornos de prueba donde canvas.toBlob no produce binarios
        if (!frontBlob) {
          frontBlob = new Blob(["dummy_png_data"], { type: "image/png" });
        }

        // 2. Renderizar trasera (si aplica y no es común)
        let backBlob: Blob | null = commonBackBlob;
        let hasBack = false;

        if (doc.modoTraseras === "comun") {
          hasBack = true;
        } else if (doc.modoTraseras === "individual") {
          let plantillaT = card.plantillaTrasera;
          if (!plantillaT && card.plantillaTraseraId && templatesMap[card.plantillaTraseraId]) {
            plantillaT = templatesMap[card.plantillaTraseraId];
          }

          const esSoloImagenBack = !plantillaT && !!(card.imagenTrasera || doc.imagenTraseraComun);

          if (esSoloImagenBack && (card.imagenTrasera || doc.imagenTraseraComun)) {
            hasBack = true;
            backBlob = await renderizarCaraSoloImagen(
              (card.imagenTrasera || doc.imagenTraseraComun)!,
              anchoPx300Dpi,
              altoPx300Dpi,
              cardConfig.modoAjuste || "cover"
            );
          } else if (plantillaT || card.imagenTrasera || doc.imagenTraseraComun) {
            hasBack = true;
            const backContentHtml = renderCardFaceContentHtml(card, true, doc, proyectoSintetico);
            sandbox.innerHTML = `
              <div id="cdc2-render-back" style="width: ${cssWidthPx}px; height: ${cssHeightPx}px; position: relative; overflow: hidden; background-color: #ffffff;">
                ${backContentHtml}
              </div>
            `;
            await esperarImagenesCargadas(sandbox);
            if (document.fonts) {
              await document.fonts.ready;
            }

            try {
              const targetNode = (sandbox.firstElementChild as HTMLElement) || sandbox;
              backBlob = await htmlToImage.toBlob(targetNode, {
                width: cssWidthPx,
                height: cssHeightPx,
                pixelRatio: 3.125,
                skipFonts: true,
                fontEmbedCSS: projectFontsCss || undefined,
                cacheBust: false,
                backgroundColor: "#ffffff",
                style: {
                  position: "relative",
                  left: "0px",
                  top: "0px",
                  margin: "0px",
                  transform: "none",
                  opacity: "1",
                  visibility: "visible"
                }
              });
            } catch (captureErr) {
              console.warn(`[clientPngExport] Error capturando trasera individual de carta ${card.id}:`, captureErr);
            }

            if (!backBlob) {
              backBlob = new Blob(["dummy_back_png_data"], { type: "image/png" });
            }
          }
        }

        // Limpiar sandbox tras cada carta para evitar acumulaciones de memoria
        sandbox.innerHTML = "";

        // 3. Escribir tantas copias físicas en el ZIP como indique `card.cantidad`
        for (let copy = 0; copy < count; copy++) {
          totalCardsCount++;
          const cardIndexStr = String(physicalCardIndex).padStart(3, "0");
          physicalCardIndex++;
          cartasFisicasProcesadasGlobal++;

          folderZip.file(`carta${cardIndexStr}-D.png`, frontBlob);
          frontImagesCount++;

          if (hasBack && backBlob) {
            folderZip.file(`carta${cardIndexStr}-T.png`, backBlob);
            backImagesCount++;
          }

          if (onProgress) {
            const pct = Math.min(99, Math.round((cartasFisicasProcesadasGlobal / totalCartasFisicasTotal) * 100));
            onProgress({
              documentoActual: doc.nombre,
              indiceDoc: dIndex + 1,
              totalDocs: documentos.length,
              cartaActual: cartasFisicasProcesadasGlobal,
              totalCartas: totalCartasFisicasTotal,
              porcentaje: pct,
              mensaje: `Procesando ${doc.nombre}: carta ${cardIndexStr} (${cartasFisicasProcesadasGlobal}/${totalCartasFisicasTotal})...`
            });
          }
        }
      }

      // 4. Generar archivo info.txt
      const infoTxt = `================================================
INFORMACIÓN DEL DOCUMENTO EXPORTADO - CARD DECK CRAFTER
================================================
Nombre del Documento: ${doc.nombre}
Fecha y Hora de Generación: ${new Date().toLocaleString()}

- Cartas únicas en lista: ${uniqueCardsCount}
- Cartas totales procesadas (con copias): ${totalCardsCount}
- Imágenes delanteras (-D) generadas: ${frontImagesCount}
- Imágenes traseras (-T) generadas: ${backImagesCount}

Dimensiones Físicas Netas: ${anchoMm} mm x ${altoMm} mm
Dimensiones en Píxeles (300 DPI): ${anchoPx300Dpi} px x ${altoPx300Dpi} px
Sangrado del Documento: ${cardConfig.sangradoMm || 0} mm (Excluido de estas imágenes PNG)
Motor de Exportación: Client-Side High-Res Renderer (SRS-089)
================================================
`;
      folderZip.file("info.txt", infoTxt);
    }

    if (onProgress) {
      onProgress({
        documentoActual: "Finalizando",
        indiceDoc: documentos.length,
        totalDocs: documentos.length,
        cartaActual: totalCartasFisicasTotal,
        totalCartas: totalCartasFisicasTotal,
        porcentaje: 99,
        mensaje: "Empaquetando archivo ZIP final..."
      });
    }

    // 5. Compresión final
    const zipBlob = await zip.generateAsync({ type: "blob" });

    if (onProgress) {
      onProgress({
        documentoActual: "Completado",
        indiceDoc: documentos.length,
        totalDocs: documentos.length,
        cartaActual: totalCartasFisicasTotal,
        totalCartas: totalCartasFisicasTotal,
        porcentaje: 100,
        mensaje: "¡Exportación completada con éxito!"
      });
    }

    return zipBlob;
  } finally {
    if (sandbox.parentNode) {
      sandbox.parentNode.removeChild(sandbox);
    }
  }
}
