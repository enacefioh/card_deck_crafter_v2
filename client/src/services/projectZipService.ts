import JSZip from "jszip";
import type { DocumentoCDC2, PlantillaCDC2 } from "shared";
import { generarMiniaturaPlantilla } from "../utils/thumbnailUtils";

export interface GenerarProyectoZipOptions {
  asTemplate?: boolean;
  newId?: string;
  newName?: string;
  newDescription?: string;
}

export interface GenerarProyectoZipParams extends GenerarProyectoZipOptions {
  documentos: DocumentoCDC2[];
  activeDocumentoId?: string;
  currentProjectId?: string;
  nombreProyecto: string;
  descripcionProyecto?: string;
  templatesMap?: Record<string, PlantillaCDC2>;
  importedTemplates?: PlantillaCDC2[];
  projectSymbols?: any[];
  templateAssets?: any[];
  projectAssets?: any[];
  assetFolders?: string[];
  userAssets?: any[];
  projectFonts?: any[];
  fontFolders?: string[];
  projectColors?: any[];
}

/**
 * Serializa y empaqueta un proyecto o plantilla CDC2 completo en un archivo ZIP (.cdc2 / .cdc2t).
 * Extraído de App.tsx como parte de SRS-056 para modularidad y testing aislado.
 */
export async function generarProyectoZip(params: GenerarProyectoZipParams): Promise<Blob> {
  const {
    asTemplate = false,
    newId,
    newName,
    newDescription,
    documentos = [],
    activeDocumentoId = documentos[0]?.id || "",
    currentProjectId = `proj_${Date.now()}`,
    nombreProyecto,
    descripcionProyecto = "",
    templatesMap = {},
    importedTemplates = [],
    projectSymbols = [],
    templateAssets = [],
    projectAssets = [],
    assetFolders = ["Por Defecto"],
    userAssets = [],
    projectFonts = [],
    fontFolders = ["Por Defecto"],
    projectColors = [],
  } = params;

  const isTemplate = asTemplate === true;
  const zip = new JSZip();
  const assetsFolder = zip.folder("assets")!;
  const projectAssetsFolder = isTemplate ? null : zip.folder("project_assets");
  const userAssetsFolder = isTemplate ? null : zip.folder("user_assets");
  const symbolsFolder = zip.folder("symbols")!;
  const imagenMap = new Map<string, string>(); // blobUrl -> assetPath
  const projectAssetMap = new Map<string, string>(); // blobUrl -> projectAssetPath
  const userAssetMap = new Map<string, string>(); // blobUrl -> userAssetPath
  const symbolAssetMap = new Map<string, string>(); // blobUrl -> symbolAssetPath
  const processedTemplateAssets: any[] = [];
  const processedProjectAssets: any[] = [];
  const processedUserAssets: any[] = [];
  const processedProjectSymbols: any[] = [];

  // Procesar recursos de la galería de símbolos (SRS-011)
  for (const sym of projectSymbols) {
    if (sym.src && !sym.src.startsWith("symbol_asset://")) {
      try {
        const res = await fetch(sym.src);
        const blob = await res.blob();

        let extension = "png";
        if (blob.type === "image/jpeg") extension = "jpg";
        else if (blob.type === "image/webp") extension = "webp";
        else if (blob.type === "image/gif") extension = "gif";
        else if (blob.type === "image/svg+xml") extension = "svg";

        const filename = `${sym.id}.${extension}`;
        symbolsFolder.file(filename, blob);

        const assetPath = `symbol_asset://${filename}`;
        symbolAssetMap.set(sym.src, assetPath);
        processedProjectSymbols.push({
          id: sym.id,
          tag: sym.tag,
          src: assetPath,
        });
      } catch (err) {
        console.error("Error al procesar símbolo en generarProyectoZip:", sym, err);
      }
    } else if (sym.src && sym.src.startsWith("symbol_asset://")) {
      symbolAssetMap.set(sym.src, sym.src);
      processedProjectSymbols.push(sym);
    }
  }

  // Procesar recursos de la galería de usuario (SRS-045) - Se omiten si se exporta como plantilla (SRS-067)
  if (!isTemplate) {
    for (const asset of userAssets) {
      if (asset.src && !asset.src.startsWith("user_asset://")) {
        try {
          const res = await fetch(asset.src);
          const blob = await res.blob();

          let extension = "png";
          if (blob.type === "image/jpeg") extension = "jpg";
          else if (blob.type === "image/webp") extension = "webp";
          else if (blob.type === "image/gif") extension = "gif";

          const filename = `${asset.id}.${extension}`;
          userAssetsFolder!.file(filename, blob);

          const assetPath = `user_asset://${filename}`;
          userAssetMap.set(asset.src, assetPath);
          processedUserAssets.push({
            id: asset.id,
            nombre: asset.nombre,
            src: assetPath,
          });
        } catch (err) {
          console.error("Error al procesar recurso de la galería de usuario:", asset, err);
        }
      } else if (asset.src && asset.src.startsWith("user_asset://")) {
        userAssetMap.set(asset.src, asset.src);
        processedUserAssets.push(asset);
      }
    }
  }

  // Procesar recursos de la galería de plantilla (SRS-094)
  for (const asset of templateAssets) {
    if (asset.src && !asset.src.startsWith("asset://")) {
      try {
        const res = await fetch(asset.src);
        const blob = await res.blob();

        let extension = "png";
        if (blob.type === "image/jpeg") extension = "jpg";
        else if (blob.type === "image/webp") extension = "webp";
        else if (blob.type === "image/gif") extension = "gif";
        else if (blob.type === "image/svg+xml") extension = "svg";

        const filename = `${asset.id}.${extension}`;
        assetsFolder.file(filename, blob);

        const assetPath = `asset://${filename}`;
        imagenMap.set(asset.src, assetPath);
        processedTemplateAssets.push({
          id: asset.id,
          nombre: asset.nombre,
          src: assetPath,
        });
      } catch (err) {
        console.error("Error al procesar recurso de la galería de plantilla:", asset, err);
      }
    } else if (asset.src && asset.src.startsWith("asset://")) {
      imagenMap.set(asset.src, asset.src);
      processedTemplateAssets.push(asset);
    }
  }

  // Procesar recursos de la galería del proyecto (SRS-014 / SRS-094) - Se omiten si se exporta como plantilla
  if (!isTemplate) {
  for (const asset of projectAssets) {
    if (asset.src && !asset.src.startsWith("project_asset://")) {
      try {
        const res = await fetch(asset.src);
        const blob = await res.blob();

        let extension = "png";
        if (blob.type === "image/jpeg") extension = "jpg";
        else if (blob.type === "image/webp") extension = "webp";
        else if (blob.type === "image/gif") extension = "gif";

        const filename = `${asset.id}.${extension}`;
        projectAssetsFolder!.file(filename, blob);

        const assetPath = `project_asset://${filename}`;
        projectAssetMap.set(asset.src, assetPath);
        processedProjectAssets.push({
          id: asset.id,
          nombre: asset.nombre,
          src: assetPath,
          folder: asset.folder || "Por Defecto",
        });
      } catch (err) {
        console.error("Error al procesar recurso de la galería del proyecto:", asset, err);
      }
    } else if (asset.src && asset.src.startsWith("project_asset://")) {
      projectAssetMap.set(asset.src, asset.src);
      processedProjectAssets.push({
        ...asset,
        folder: asset.folder || "Por Defecto",
      });
    }
  }
  }

  const addBlobToZip = async (blobUrl: string, baseName: string): Promise<string> => {
    if (!blobUrl) return "";
    if (
      blobUrl.startsWith("asset://") ||
      blobUrl.startsWith("user_asset://") ||
      blobUrl.startsWith("project_asset://") ||
      blobUrl.startsWith("symbol_asset://")
    ) {
      return blobUrl;
    }
    if (userAssetMap.has(blobUrl)) {
      return userAssetMap.get(blobUrl)!;
    }
    if (projectAssetMap.has(blobUrl)) {
      return projectAssetMap.get(blobUrl)!;
    }
    if (imagenMap.has(blobUrl)) {
      return imagenMap.get(blobUrl)!;
    }

    try {
      const res = await fetch(blobUrl);
      const blob = await res.blob();

      let extension = "png";
      if (blob.type === "image/jpeg") extension = "jpg";
      else if (blob.type === "image/webp") extension = "webp";
      else if (blob.type === "image/gif") extension = "gif";

      const filename = `${baseName}_${imagenMap.size}.${extension}`;
      assetsFolder.file(filename, blob);

      const assetPath = `asset://${filename}`;
      imagenMap.set(blobUrl, assetPath);
      return assetPath;
    } catch (err) {
      console.error("Error al procesar recurso de imagen:", blobUrl, err);
      return "";
    }
  };

  const processedDocumentos: DocumentoCDC2[] = [];
  for (const doc of documentos) {
    const processedCards = [];
    if (!isTemplate) {
      for (const card of doc.cards) {
        let imagenFrontalPath = undefined;
        if (card.imagenFrontal) {
          imagenFrontalPath = await addBlobToZip(card.imagenFrontal, "frontal");
        }
        let imagenTraseraPath = null;
        if (card.imagenTrasera) {
          imagenTraseraPath = await addBlobToZip(card.imagenTrasera, "trasera");
        }

        // Procesar overrides frontal
        const processedOverrides: Record<string, any> = {};
        if (card.capasOverrides) {
          for (const [capaId, overrideVal] of Object.entries(card.capasOverrides)) {
            if (overrideVal && typeof overrideVal === "object") {
              const nextOverride = { ...overrideVal };
              if (nextOverride.src && (nextOverride.src.startsWith("blob:") || nextOverride.src.startsWith("data:"))) {
                nextOverride.src = await addBlobToZip(nextOverride.src, `override_${capaId}`);
              }
              processedOverrides[capaId] = nextOverride;
            }
          }
        }

        // Procesar overrides trasera
        const processedOverridesTrasera: Record<string, any> = {};
        if (card.capasOverridesTrasera) {
          for (const [capaId, overrideVal] of Object.entries(card.capasOverridesTrasera)) {
            if (overrideVal && typeof overrideVal === "object") {
              const nextOverride = { ...overrideVal };
              if (nextOverride.src && (nextOverride.src.startsWith("blob:") || nextOverride.src.startsWith("data:"))) {
                nextOverride.src = await addBlobToZip(nextOverride.src, `override_trasera_${capaId}`);
              }
              processedOverridesTrasera[capaId] = nextOverride;
            }
          }
        }

        let processedPlantilla = undefined;
        if (card.plantilla) {
          const clonedPlantilla = JSON.parse(JSON.stringify(card.plantilla));
          if (clonedPlantilla.capas) {
            for (let i = 0; i < clonedPlantilla.capas.length; i++) {
              const capa = clonedPlantilla.capas[i];
              if ((capa.tipo === "image" || capa.tipo === "image-switch") && capa.src && (capa.src.startsWith("blob:") || capa.src.startsWith("data:"))) {
                capa.src = await addBlobToZip(capa.src, `card_${card.id}_template_image_${i}`);
              }
              if (capa.tipo === "image-switch" && capa.options) {
                for (let o = 0; o < capa.options.length; o++) {
                  const opt = capa.options[o];
                  if (opt.src && (opt.src.startsWith("blob:") || opt.src.startsWith("data:"))) {
                    opt.src = await addBlobToZip(opt.src, `card_${card.id}_template_image_switch_option_${i}_${o}`);
                  }
                }
              }
            }
            processedPlantilla = clonedPlantilla;
          }
        }

        let processedPlantillaTrasera = undefined;
        if (card.plantillaTrasera) {
          const clonedPlantillaTrasera = JSON.parse(JSON.stringify(card.plantillaTrasera));
          if (clonedPlantillaTrasera.capas) {
            for (let i = 0; i < clonedPlantillaTrasera.capas.length; i++) {
              const capa = clonedPlantillaTrasera.capas[i];
              if ((capa.tipo === "image" || capa.tipo === "image-switch") && capa.src && (capa.src.startsWith("blob:") || capa.src.startsWith("data:"))) {
                capa.src = await addBlobToZip(capa.src, `card_${card.id}_back_template_image_${i}`);
              }
              if (capa.tipo === "image-switch" && capa.options) {
                for (let o = 0; o < clonedPlantillaTrasera.capas[i].options.length; o++) {
                  const opt = clonedPlantillaTrasera.capas[i].options[o];
                  if (opt.src && (opt.src.startsWith("blob:") || opt.src.startsWith("data:"))) {
                    opt.src = await addBlobToZip(opt.src, `card_${card.id}_back_template_image_switch_option_${i}_${o}`);
                  }
                }
              }
            }
            processedPlantillaTrasera = clonedPlantillaTrasera;
          }
        }

        processedCards.push({
          id: card.id,
          nombre: card.nombre,
          imagenFrontal: imagenFrontalPath,
          imagenTrasera: imagenTraseraPath,
          cantidad: card.cantidad,
          plantillaId: card.plantillaId,
          valoresCampos: card.valoresCampos,
          capasOverrides: processedOverrides,
          plantillaTraseraId: card.plantillaTraseraId,
          valoresCamposTrasera: card.valoresCamposTrasera,
          capasOverridesTrasera: processedOverridesTrasera,
          plantilla: processedPlantilla,
          plantillaTrasera: processedPlantillaTrasera,
        });
      }
    }

    let commonBackPath = null;
    if (doc.imagenTraseraComun) {
      commonBackPath = await addBlobToZip(doc.imagenTraseraComun, "trasera_comun");
    }

    processedDocumentos.push({
      id: doc.id,
      nombre: doc.nombre,
      canvasConfig: doc.canvasConfig,
      cardConfig: doc.cardConfig,
      modoTraseras: doc.modoTraseras,
      imagenTraseraComun: commonBackPath,
      cards: processedCards
    });
  }

  // Guardar las plantillas personalizadas en una carpeta "templates/" del ZIP
  const templatesFolder = zip.folder("templates")!;
  const processedTemplatesMap: Record<string, any> = {};
  const processedImportedTemplates: any[] = [];

  for (const template of importedTemplates) {
    const clonedTemplate = JSON.parse(JSON.stringify(template));
    if (clonedTemplate.capas) {
      for (let i = 0; i < clonedTemplate.capas.length; i++) {
        const capa = clonedTemplate.capas[i];
        if ((capa.tipo === "image" || capa.tipo === "image-switch") && capa.src && (capa.src.startsWith("blob:") || capa.src.startsWith("data:"))) {
          capa.src = await addBlobToZip(capa.src, `template_${template.id}_image_${i}`);
        }
        if (capa.tipo === "image-switch" && capa.options) {
          for (let o = 0; o < capa.options.length; o++) {
            const opt = capa.options[o];
            if (opt.src && (opt.src.startsWith("blob:") || opt.src.startsWith("data:"))) {
              opt.src = await addBlobToZip(opt.src, `template_${template.id}_image_switch_option_${i}_${o}`);
            }
          }
        }
      }
    }
    // Generar miniatura de plantilla si no la tiene (SRS-074 / SRS-076)
    if (!clonedTemplate.miniatura && typeof generarMiniaturaPlantilla === "function") {
      try {
        clonedTemplate.miniatura = await generarMiniaturaPlantilla(
          clonedTemplate,
          clonedTemplate.anchoMm,
          clonedTemplate.altoMm
        );
      } catch (err) {
        console.warn("[zip] Error al generar miniatura para plantilla:", err);
      }
    }
    templatesFolder.file(`${template.id}.json`, JSON.stringify(clonedTemplate, null, 2));
    processedImportedTemplates.push(clonedTemplate);
    processedTemplatesMap[template.id] = clonedTemplate;
  }

  // Procesar cualquier otra plantilla en templatesMap que no esté en importedTemplates (p.ej. por defecto)
  for (const [id, template] of Object.entries(templatesMap)) {
    if (processedTemplatesMap[id]) continue;
    const clonedTemplate = JSON.parse(JSON.stringify(template));
    if (clonedTemplate.capas) {
      for (let i = 0; i < clonedTemplate.capas.length; i++) {
        const capa = clonedTemplate.capas[i];
        if ((capa.tipo === "image" || capa.tipo === "image-switch") && capa.src && (capa.src.startsWith("blob:") || capa.src.startsWith("data:"))) {
          capa.src = await addBlobToZip(capa.src, `template_${id}_image_${i}`);
        }
        if (capa.tipo === "image-switch" && capa.options) {
          for (let o = 0; o < clonedTemplate.capas[i].options.length; o++) {
            const opt = clonedTemplate.capas[i].options[o];
            if (opt.src && (opt.src.startsWith("blob:") || opt.src.startsWith("data:"))) {
              opt.src = await addBlobToZip(opt.src, `template_${id}_image_switch_option_${i}_${o}`);
            }
          }
        }
      }
    }
    // Generar miniatura de plantilla si no la tiene (SRS-074 / SRS-076)
    if (!clonedTemplate.miniatura && typeof generarMiniaturaPlantilla === "function") {
      try {
        clonedTemplate.miniatura = await generarMiniaturaPlantilla(
          clonedTemplate,
          clonedTemplate.anchoMm,
          clonedTemplate.altoMm
        );
      } catch (err) {
        console.warn("[zip] Error al generar miniatura para plantilla:", err);
      }
    }
    processedTemplatesMap[id] = clonedTemplate;
  }

  const targetId = newId || (isTemplate ? `tmpl_${Date.now()}_${Math.random().toString(36).substring(2, 9)}` : currentProjectId);
  const targetNombre = newName || nombreProyecto;
  const targetDescripcion = newDescription !== undefined ? newDescription : descripcionProyecto;

  const proyecto = {
    version: "2.1.0" as const,
    id: targetId,
    ...(isTemplate ? { isTemplate: true, type: "template" as const } : { type: "project" as const }),
    meta: {
      id: targetId,
      nombre: targetNombre,
      descripcion: targetDescripcion,
      fechaCreacion: new Date().toISOString(),
      fechaModificacion: new Date().toISOString(),
      ...(isTemplate ? { isTemplate: true, type: "template" as const } : { type: "project" as const }),
    },
    documentos: processedDocumentos,
    activeDocumentoId,
    templates: processedTemplatesMap,
    assets: processedTemplateAssets,
    projectAssets: isTemplate ? [] : processedProjectAssets,
    assetFolders: isTemplate ? ["Por Defecto"] : (assetFolders && assetFolders.length > 0 ? assetFolders : ["Por Defecto"]),
    userAssets: isTemplate ? [] : processedUserAssets,
    projectSymbols: processedProjectSymbols,
    fontFolders: fontFolders && fontFolders.length > 0 ? fontFolders : ["Por Defecto"],
    customFonts: projectFonts.map((f: any) => ({
      id: f.id,
      nombre: f.nombre,
      filename: f.filename,
      type: f.type,
      folder: f.folder || "Por Defecto",
      data: f.data
    })),
    projectColors: projectColors
  };

  zip.file("project.json", JSON.stringify(proyecto, null, 2));
  return await zip.generateAsync({ type: "blob" });
}
