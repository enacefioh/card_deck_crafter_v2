import React, { useState, useEffect } from "react";
import type { CardConfig, Carta, ExposedProperty } from "shared";
import JSZip from "jszip";
import { actualizarClavePlantillaYValores, prepararPlantillaParaExportacion } from "./utils/projectUtils";
import "./EditCardModal.css";

interface EditCardModalProps {
  carta: Carta;
  cardConfig: CardConfig;
  templatesMap: Record<string, any>;
  generarReversos: boolean;
  imagenTraseraComun: string | null;
  onSave: (
    valoresCampos: Record<string, string>,
    capasOverrides: Record<string, any>,
    valoresCamposTrasera?: Record<string, string>,
    capasOverridesTrasera?: Record<string, any>,
    plantillaActualizada?: any,
    plantillaTraseraActualizada?: any
  ) => void;
  onClose: () => void;
  onExportTemplate?: (template: any) => void;
  initialZoom?: number;
  onAssignBackTemplate?: () => void;
  projectAssets?: any[];
  projectFonts?: any[];
}

function renderizarTextoCapa(capa: any, valoresCampos?: Record<string, string>, capasDePlantilla?: any[]): string {
  let texto = capa.contenidoRaw || "";
  if (valoresCampos && valoresCampos[capa.id] !== undefined) {
    texto = valoresCampos[capa.id];
  }
  if (valoresCampos) {
    texto = texto.replace(/\{\{([^}]+)\}\}/g, (match: string, clave: string) => {
      const trimmedClave = clave.trim();
      if (capasDePlantilla) {
        const targetCapa = capasDePlantilla.find(c => c.nombre === trimmedClave);
        if (targetCapa && valoresCampos[targetCapa.id] !== undefined) {
          return valoresCampos[targetCapa.id];
        }
      }
      return match;
    });
  }
  return texto;
}

function parseMarkdownToHtml(text: string): string {
  if (!text) return "";
  let escaped = text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
  escaped = escaped.replace(/\n/g, "<br />");
  escaped = escaped.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  escaped = escaped.replace(/\*([^*]+)\*/g, "<em>$1</em>");
  escaped = escaped.replace(/__([^_]+)__/g, "<u>$1</u>");
  return escaped;
}

export default function EditCardModal({
  carta,
  cardConfig,
  templatesMap,
  generarReversos,
  imagenTraseraComun,
  onSave,
  onClose,
  onExportTemplate,
  initialZoom,
  onAssignBackTemplate,
  projectAssets = [],
  projectFonts = [],
}: EditCardModalProps) {
  // --- Estados de Plantilla Editables Localmente ---
  const [tempPlantilla, setTempPlantilla] = useState<any>(() => {
    if (carta.plantilla) return JSON.parse(JSON.stringify(carta.plantilla));
    return carta.plantillaId && templatesMap[carta.plantillaId]
      ? JSON.parse(JSON.stringify(templatesMap[carta.plantillaId]))
      : null;
  });
  const [tempPlantillaTrasera, setTempPlantillaTrasera] = useState<any>(() => {
    if (carta.plantillaTrasera) return JSON.parse(JSON.stringify(carta.plantillaTrasera));
    return carta.plantillaTraseraId && templatesMap[carta.plantillaTraseraId]
      ? JSON.parse(JSON.stringify(templatesMap[carta.plantillaTraseraId]))
      : null;
  });

  // --- Estados locales temporales de valores ---
  const [tempValoresCampos, setTempValoresCampos] = useState<Record<string, string>>(() => ({
    ...(carta.valoresCampos || {}),
  }));
  const [tempCapasOverrides, setTempCapasOverrides] = useState<Record<string, any>>(() => ({
    ...(carta.capasOverrides || {}),
  }));

  const [tempValoresCamposTrasera, setTempValoresCamposTrasera] = useState<Record<string, string>>(() => ({
    ...(carta.valoresCamposTrasera || {}),
  }));
  const [tempCapasOverridesTrasera, setTempCapasOverridesTrasera] = useState<Record<string, any>>(() => ({
    ...(carta.capasOverridesTrasera || {}),
  }));

  const [selectedLayerId, setSelectedLayerId] = useState<string | null>(null);
  const [hoveredLayerId, setHoveredLayerId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"frontal" | "trasera">("frontal");

  // Popup de añadir elementos
  const [showAddElementPopup, setShowAddElementPopup] = useState<boolean>(false);
  const [selectedNewType, setSelectedNewType] = useState<"text" | "image" | "image-switch" | "container" | "block">("text");
  const [showSwitchResourcesPopup, setShowSwitchResourcesPopup] = useState<boolean>(false);
  const [tempSwitchCapaId, setTempSwitchCapaId] = useState<string | null>(null);
  const [tempSelectedOptionIds, setTempSelectedOptionIds] = useState<string[]>([]);

  // Estado del menú desplegable de opciones de plantilla
  const [showDropdown, setShowDropdown] = useState<boolean>(false);

  // Estados para el Modal de Configuración de Campos Editables (SRS-036)
  const [showExposedConfigModal, setShowExposedConfigModal] = useState<boolean>(false);
  const [tempExposedProperties, setTempExposedProperties] = useState<ExposedProperty[]>([]);
  const [expandedConfigLayerIds, setExpandedConfigLayerIds] = useState<string[]>([]);
  const [collapsedConfigContainerIds, setCollapsedConfigContainerIds] = useState<string[]>([]);

  // Estados para jerarquía y arrastre (SRS-025)
  const [collapsedContainerIds, setCollapsedContainerIds] = useState<string[]>(() => {
    const list: string[] = [];
    const collectIds = (plantilla: any) => {
      if (plantilla && plantilla.capas) {
        plantilla.capas.forEach((c: any) => {
          if (c.tipo === "container") {
            list.push(c.id);
          }
        });
      }
    };
    const pFront = carta.plantilla || (carta.plantillaId ? templatesMap[carta.plantillaId] : null);
    const pBack = carta.plantillaTrasera || (carta.plantillaTraseraId ? templatesMap[carta.plantillaTraseraId] : null);
    collectIds(pFront);
    collectIds(pBack);
    return list;
  });
  const [draggedLayerId, setDraggedLayerId] = useState<string | null>(null);
  const [dragOverLayerId, setDragOverLayerId] = useState<string | null>(null);
  const [isDragOverRoot, setIsDragOverRoot] = useState<boolean>(false);

  // Estados para expansión de controles de bordes y esquinas (SRS-024)
  const [expandBorders, setExpandBorders] = useState<boolean>(false);
  const [expandRadii, setExpandRadii] = useState<boolean>(false);
  const [expandPadding, setExpandPadding] = useState<boolean>(false);

  // Estados para Galería de la Plantilla (SRS-020)
  const [showGalleryManager, setShowGalleryManager] = useState<boolean>(false);
  const [showTemplateFonts, setShowTemplateFonts] = useState<boolean>(false);
  const [showGallerySelector, setShowGallerySelector] = useState<boolean>(false);
  const [activeSelectorTarget, setActiveSelectorTarget] = useState<{ type: "override" | "default"; capaId: string } | null>(null);

  // Estados para las pestañas de selección de recursos (SRS-014)
  const [selectorTab, setSelectorTab] = useState<"project" | "template">("project");
  const [switchSelectorTab, setSwitchSelectorTab] = useState<"project" | "template">("project");

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (showDropdown && !target.closest(".template-actions-group")) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("click", handleOutsideClick);
    return () => {
      document.removeEventListener("click", handleOutsideClick);
    };
  }, [showDropdown]);

  // Resolver estructuras activas según la pestaña activa
  const plantillaActiva = activeTab === "frontal" ? tempPlantilla : tempPlantillaTrasera;
  const tempValoresActivos = activeTab === "frontal" ? tempValoresCampos : tempValoresCamposTrasera;
  const tempCapasOverridesActivos = activeTab === "frontal" ? tempCapasOverrides : tempCapasOverridesTrasera;
  const setTempCapasOverridesActivos = activeTab === "frontal" ? setTempCapasOverrides : setTempCapasOverridesTrasera;

  // Escala para la edición interactiva en el modal (inicializada con zoomFactor)
  const [scale, setScale] = useState<number>(() => initialZoom || 3.5);

  // --- Comprobar si hay cambios sin guardar ---
  const hasChanges = () => {
    // Estructuras de plantillas (Omitimos para advertir únicamente sobre cambios de la carta, según SRS-031 RF-3)

    // Frontal
    const originalValores = carta.valoresCampos || {};
    const originalOverrides = carta.capasOverrides || {};

    const keysValores = Array.from(new Set([...Object.keys(tempValoresCampos), ...Object.keys(originalValores)]));
    for (const k of keysValores) {
      if ((tempValoresCampos[k] || "") !== (originalValores[k] || "")) {
        return true;
      }
    }

    const layers = tempPlantilla?.capas || [];
    for (const capa of layers) {
      const tempColor = tempCapasOverrides[capa.id]?.colorFill;
      const originalColor = originalOverrides[capa.id]?.colorFill;
      if ((tempColor || "") !== (originalColor || "")) {
        return true;
      }
      const tempSrc = tempCapasOverrides[capa.id]?.src;
      const originalSrc = originalOverrides[capa.id]?.src;
      if ((tempSrc || "") !== (originalSrc || "")) {
        return true;
      }
    }

    // Trasera
    const originalValoresTrasera = carta.valoresCamposTrasera || {};
    const originalOverridesTrasera = carta.capasOverridesTrasera || {};

    const keysValoresTrasera = Array.from(new Set([...Object.keys(tempValoresCamposTrasera), ...Object.keys(originalValoresTrasera)]));
    for (const k of keysValoresTrasera) {
      if ((tempValoresCamposTrasera[k] || "") !== (originalValoresTrasera[k] || "")) {
        return true;
      }
    }

    const layersTrasera = tempPlantillaTrasera?.capas || [];
    for (const capa of layersTrasera) {
      const tempColor = tempCapasOverridesTrasera[capa.id]?.colorFill;
      const originalColor = originalOverridesTrasera[capa.id]?.colorFill;
      if ((tempColor || "") !== (originalColor || "")) {
        return true;
      }
      const tempSrc = tempCapasOverridesTrasera[capa.id]?.src;
      const originalSrc = originalOverridesTrasera[capa.id]?.src;
      if ((tempSrc || "") !== (originalSrc || "")) {
        return true;
      }
    }

    return false;
  };

  // --- Manejo de la acción de cancelar/cerrar ---
  const handleCancel = () => {
    if (hasChanges()) {
      const confirmDiscard = window.confirm(
        "Tienes cambios sin guardar. ¿Seguro que deseas salir y descartar las modificaciones?"
      );
      if (confirmDiscard) {
        onClose();
      }
    } else {
      onClose();
    }
  };

  // --- Escucha de atajos de teclado (Escape, Delete, Backspace) ---
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeEl = document.activeElement;
      const isTyping = activeEl && (
        activeEl.tagName === "INPUT" ||
        activeEl.tagName === "TEXTAREA" ||
        activeEl.getAttribute("contenteditable") === "true"
      );

      if (e.key === "Escape") {
        handleCancel();
      } else if (e.key === "Delete" || e.key === "Backspace") {
        const layers = plantillaActiva?.capas || [];
        const currentSelectedCapa = layers.find((c: any) => c.id === selectedLayerId);
        if (!isTyping && selectedLayerId && currentSelectedCapa && currentSelectedCapa.tipo !== "background") {
          e.preventDefault();
          if (confirm("¿Estás seguro de que deseas eliminar esta capa de la plantilla? Esta acción no se puede deshacer y limpiará los valores de las cartas asociadas.")) {
            handleDeleteCapa(selectedLayerId);
          }
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [selectedLayerId, plantillaActiva, tempValoresCampos, tempCapasOverrides, tempValoresCamposTrasera, tempCapasOverridesTrasera, tempPlantilla, tempPlantillaTrasera]);



  // --- Sincronizar reverso cuando se asigna una plantilla de reverso desde el exterior (TKT-013) ---
  useEffect(() => {
    if (carta.plantillaTrasera && !tempPlantillaTrasera) {
      setTempPlantillaTrasera(JSON.parse(JSON.stringify(carta.plantillaTrasera)));
      setTempValoresCamposTrasera((prev) => ({
        ...prev,
        ...(carta.valoresCamposTrasera || {}),
      }));
    } else if (carta.plantillaTraseraId && templatesMap[carta.plantillaTraseraId] && !tempPlantillaTrasera) {
      const p = templatesMap[carta.plantillaTraseraId];
      setTempPlantillaTrasera(JSON.parse(JSON.stringify(p)));
      setTempValoresCamposTrasera((prev) => ({
        ...prev,
        ...(carta.valoresCamposTrasera || {}),
      }));
    }
  }, [carta.plantillaTrasera, carta.plantillaTraseraId, templatesMap]);

  // --- Manejo de Guardar ---
  const handleSave = () => {
    onSave(
      tempValoresCampos,
      tempCapasOverrides,
      tempValoresCamposTrasera,
      tempCapasOverridesTrasera,
      tempPlantilla,
      tempPlantillaTrasera
    );
  };

  const handleOpenExposedConfigModal = () => {
    if (!plantillaActiva) return;
    
    let list: ExposedProperty[] = [];
    if (plantillaActiva.exposedProperties && plantillaActiva.exposedProperties.length > 0) {
      list = JSON.parse(JSON.stringify(plantillaActiva.exposedProperties));
    } else {
      (plantillaActiva.capas || []).forEach((capa: any) => {
        if (capa.tipo === "text") {
          list.push({
            layerId: capa.id,
            property: "contenidoRaw",
            label: capa.nombre || "Texto",
          });
        } else if (capa.tipo === "image" || capa.tipo === "image-switch") {
          list.push({
            layerId: capa.id,
            property: "src",
            label: capa.nombre || "Imagen",
          });
        }
      });
    }
    
    setTempExposedProperties(list);
    setShowExposedConfigModal(true);
  };

  // --- Añadir Elemento ---
  const handleAddElement = () => {
    if (!plantillaActiva) return;

    const isText = selectedNewType === "text";
    const isImage = selectedNewType === "image";
    const isImageSwitch = selectedNewType === "image-switch";
    const isContainer = selectedNewType === "container";
    const isBlock = selectedNewType === "block";
    const newId = `layer_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const newClave = `campo_${Date.now().toString().slice(-4)}`;

    let newLayer: any;
    if (isImage) {
      const size = Math.round((cardConfig.anchoMm * 0.3) * 10) / 10;
      newLayer = {
        id: newId,
        nombre: "Nueva Imagen",
        visible: true,
        tipo: "image" as const,
        xMm: Math.round(((cardConfig.anchoMm - size) / 2) * 10) / 10,
        yMm: Math.round(((cardConfig.altoMm - size) / 2) * 10) / 10,
        anchoMm: size,
        altoMm: size,
        src: "",
        modoAjuste: "cover" as const,
        tinteColor: null,
      };
    } else if (isImageSwitch) {
      const size = Math.round((cardConfig.anchoMm * 0.3) * 10) / 10;
      newLayer = {
        id: newId,
        nombre: "Nueva Imagen Switch",
        visible: true,
        tipo: "image-switch" as const,
        xMm: Math.round(((cardConfig.anchoMm - size) / 2) * 10) / 10,
        yMm: Math.round(((cardConfig.altoMm - size) / 2) * 10) / 10,
        anchoMm: size,
        altoMm: size,
        src: "",
        options: [],
        selectedOptionId: undefined,
        modoAjuste: "cover" as const,
        tinteColor: null,
      };
    } else if (isContainer) {
      newLayer = {
        id: newId,
        nombre: `contenedor_${Date.now().toString().slice(-4)}`,
        visible: true,
        tipo: "container" as const,
        xMm: Math.round((cardConfig.anchoMm * 0.1) * 10) / 10,
        yMm: Math.round((cardConfig.altoMm * 0.1) * 10) / 10,
        anchoMm: 50,
        altoMm: 50,
        parentCapaId: null,
        layout: "none" as const,
        backgroundColor: "",
        borderTopWidth: 0,
        borderRightWidth: 0,
        borderBottomWidth: 0,
        borderLeftWidth: 0,
        borderTopColor: "#000000",
        borderRightColor: "#000000",
        borderBottomColor: "#000000",
        borderLeftColor: "#000000",
        borderTopLeftRadius: 0,
        borderTopRightRadius: 0,
        borderBottomRightRadius: 0,
        borderBottomLeftRadius: 0
      };
    } else if (isBlock) {
      newLayer = {
        id: newId,
        nombre: `bloque_${Date.now().toString().slice(-4)}`,
        visible: true,
        tipo: "block" as const,
        xMm: Math.round((cardConfig.anchoMm * 0.1) * 10) / 10,
        yMm: Math.round((cardConfig.altoMm * 0.1) * 10) / 10,
        anchoMm: 20,
        altoMm: 20,
        parentCapaId: null,
        backgroundColor: "",
        borderTopWidth: 0,
        borderRightWidth: 0,
        borderBottomWidth: 0,
        borderLeftWidth: 0,
        borderTopColor: "#000000",
        borderRightColor: "#000000",
        borderBottomColor: "#000000",
        borderLeftColor: "#000000",
        borderTopLeftRadius: 0,
        borderTopRightRadius: 0,
        borderBottomRightRadius: 0,
        borderBottomLeftRadius: 0
      };
    } else {
      const defaultText = "Texto de ejemplo...";
      newLayer = {
        id: newId,
        nombre: newClave,
        visible: true,
        tipo: "text" as const,
        xMm: Math.round((cardConfig.anchoMm * 0.05) * 10) / 10,
        yMm: Math.round((cardConfig.altoMm * 0.45) * 10) / 10,
        anchoMm: Math.round((cardConfig.anchoMm * 0.9) * 10) / 10,
        altoMm: 8,
        fontFamily: "sans-serif",
        fontSizePt: 12,
        color: "#000000",
        alineacion: "center" as const,
        bold: false,
        italic: false,
        contenidoRaw: defaultText,
        multiline: false
      };
    }

    const newCampo = isText ? {
      clave: newClave,
      nombreLegible: newClave,
      tipo: "text" as const,
      valorDefecto: "Texto de ejemplo..."
    } : null;

    const updater = (prev: any) => {
      const updatedCapas = [...prev.capas];
      const updatedCamposConfig = [...(prev.camposConfig || [])];

      // Insertar después del seleccionado
      const selectedIndex = updatedCapas.findIndex((c) => c.id === selectedLayerId);
      if (selectedIndex !== -1) {
        updatedCapas.splice(selectedIndex + 1, 0, newLayer);
      } else {
        updatedCapas.push(newLayer);
      }

      // Registrar variable si es de texto
      if (newCampo && !updatedCamposConfig.some((f) => f.clave === newClave)) {
        updatedCamposConfig.push(newCampo);
      }

      return {
        ...prev,
        capas: updatedCapas,
        camposConfig: updatedCamposConfig
      };
    };

    if (activeTab === "frontal") {
      setTempPlantilla(updater);
      if (newCampo) {
        setTempValoresCampos((prev) => ({
          ...prev,
          [newClave]: newCampo.valorDefecto
        }));
      }
    } else {
      setTempPlantillaTrasera(updater);
      if (newCampo) {
        setTempValoresCamposTrasera((prev) => ({
          ...prev,
          [newClave]: newCampo.valorDefecto
        }));
      }
    }

    setSelectedLayerId(newId);
    setShowAddElementPopup(false);
  };

  // --- Guardar y Exportar Plantilla ---
  const ejecutarExportacion = async (guardarEnProyecto: boolean, descargarArchivo: boolean, esGuardarComo: boolean = false) => {
    if (!plantillaActiva) return;

    let name = plantillaActiva.nombre || "Mi Plantilla";
    let idOverride: string | undefined = undefined;

    const isDefaultTemplate = plantillaActiva.id === "simple" || plantillaActiva.id === "vacia";

    if (esGuardarComo || isDefaultTemplate) {
      const promptName = window.prompt("Nombre de la plantilla:", isDefaultTemplate ? "Mi Plantilla" : `${name} (Copia)`);
      if (!promptName) return;
      name = promptName;
    } else {
      // Si no es guardar como y no es por defecto, sobrescribimos reutilizando el ID existente
      idOverride = plantillaActiva.id;
    }

    const valoresActivos = activeTab === "frontal" ? tempValoresCampos : tempValoresCamposTrasera;
    const updatedTemplate = prepararPlantillaParaExportacion(plantillaActiva, name, valoresActivos, idOverride);

    if (guardarEnProyecto) {
      if (activeTab === "frontal") {
        setTempPlantilla(updatedTemplate);
      } else {
        setTempPlantillaTrasera(updatedTemplate);
      }
    }

    try {
      let zipBlob: Blob | null = null;
      let finalTemplate = updatedTemplate;

      if (descargarArchivo) {
        const zip = new JSZip();
        const assetsFolder = zip.folder("assets")!;
        const imagenMap = new Map<string, string>(); // blobUrl -> assetPath

        const zipCapas = await Promise.all(
          updatedTemplate.capas.map(async (capa: any) => {
            if (capa.tipo === "image-switch" && capa.options) {
              const nextOptions = await Promise.all(
                capa.options.map(async (opt: any) => {
                  if (opt.src && opt.src.startsWith("blob:")) {
                    if (imagenMap.has(opt.src)) {
                      return { ...opt, src: imagenMap.get(opt.src)! };
                    }
                    try {
                      const res = await fetch(opt.src);
                      const blob = await res.blob();
                      let extension = "png";
                      if (blob.type === "image/jpeg") extension = "jpg";
                      else if (blob.type === "image/webp") extension = "webp";
                      else if (blob.type === "image/gif") extension = "gif";
                      const filename = `template_image_switch_option_${imagenMap.size}.${extension}`;
                      assetsFolder.file(filename, blob);
                      const assetPath = `asset://${filename}`;
                      imagenMap.set(opt.src, assetPath);
                      return { ...opt, src: assetPath };
                    } catch (err) {
                      console.error("Error al empaquetar imagen de opción switch:", opt.src, err);
                      return opt;
                    }
                  }
                  return opt;
                })
              );
              let nextCapa = { ...capa, options: nextOptions };
              if (capa.src && capa.src.startsWith("blob:")) {
                if (imagenMap.has(capa.src)) {
                  nextCapa.src = imagenMap.get(capa.src)!;
                } else {
                  try {
                    const res = await fetch(capa.src);
                    const blob = await res.blob();
                    let extension = "png";
                    if (blob.type === "image/jpeg") extension = "jpg";
                    else if (blob.type === "image/webp") extension = "webp";
                    else if (blob.type === "image/gif") extension = "gif";
                    const filename = `template_image_${imagenMap.size}.${extension}`;
                    assetsFolder.file(filename, blob);
                    const assetPath = `asset://${filename}`;
                    imagenMap.set(capa.src, assetPath);
                    nextCapa.src = assetPath;
                  } catch (err) {
                    console.error("Error al empaquetar imagen de plantilla:", capa.src, err);
                  }
                }
              }
              return nextCapa;
            }

            if (capa.tipo === "image" && capa.src && capa.src.startsWith("blob:")) {
              if (imagenMap.has(capa.src)) {
                return { ...capa, src: imagenMap.get(capa.src)! };
              }
              try {
                const res = await fetch(capa.src);
                const blob = await res.blob();
                
                let extension = "png";
                if (blob.type === "image/jpeg") extension = "jpg";
                else if (blob.type === "image/webp") extension = "webp";
                else if (blob.type === "image/gif") extension = "gif";
                
                const filename = `template_image_${imagenMap.size}.${extension}`;
                assetsFolder.file(filename, blob);
                
                const assetPath = `asset://${filename}`;
                imagenMap.set(capa.src, assetPath);
                return { ...capa, src: assetPath };
              } catch (err) {
                console.error("Error al empaquetar imagen de plantilla:", capa.src, err);
                return capa;
              }
            }
            return capa;
          })
        );

        const zipAssets = updatedTemplate.assets ? await Promise.all(
          updatedTemplate.assets.map(async (asset: any) => {
            if (asset.src && asset.src.startsWith("blob:")) {
              if (imagenMap.has(asset.src)) {
                return { ...asset, src: imagenMap.get(asset.src)! };
              }
              try {
                const res = await fetch(asset.src);
                const blob = await res.blob();
                
                let extension = "png";
                if (blob.type === "image/jpeg") extension = "jpg";
                else if (blob.type === "image/webp") extension = "webp";
                else if (blob.type === "image/gif") extension = "gif";
                
                const filename = `template_asset_${imagenMap.size}.${extension}`;
                assetsFolder.file(filename, blob);
                
                const assetPath = `asset://${filename}`;
                imagenMap.set(asset.src, assetPath);
                return { ...asset, src: assetPath };
              } catch (err) {
                console.error("Error al empaquetar asset de plantilla:", asset.src, err);
                return asset;
              }
            }
            return asset;
          })
        ) : undefined;

        finalTemplate = {
          ...updatedTemplate,
          capas: zipCapas,
          assets: zipAssets,
        };

        zip.file("template.json", JSON.stringify(finalTemplate, null, 2));
        zipBlob = await zip.generateAsync({ type: "blob" });
      }

      if (descargarArchivo && zipBlob) {
        const downloadUrl = URL.createObjectURL(zipBlob);
        const link = document.createElement("a");
        link.href = downloadUrl;
        link.download = `${name.replace(/\s+/g, "_").toLowerCase()}.cdc2t`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(downloadUrl);
      }

      if (guardarEnProyecto && onExportTemplate) {
        onExportTemplate(updatedTemplate);
      }

      if (guardarEnProyecto && descargarArchivo) {
        alert(`Plantilla "${name}" guardada en el proyecto y exportada con éxito como archivo .cdc2t.`);
      } else if (guardarEnProyecto) {
        alert(`Plantilla "${name}" guardada en el proyecto.`);
      } else if (descargarArchivo) {
        alert(`Plantilla "${name}" exportada con éxito como archivo .cdc2t.`);
      }
    } catch (err: any) {
      alert(`Error al procesar la plantilla: ${err.message || err}`);
    }
  };

  // --- Funciones para Galería de la Plantilla (SRS-020) ---
  const handleUploadGalleryFiles = (files: FileList) => {
    const newAssets: Array<{ id: string; nombre: string; src: string }> = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (!file.type.startsWith("image/")) {
        alert(`El archivo "${file.name}" no es una imagen válida.`);
        continue;
      }
      const id = "asset_" + Math.random().toString(36).substr(2, 9) + "_" + Date.now();
      const nombre = file.name;
      const src = URL.createObjectURL(file);
      newAssets.push({ id, nombre, src });
    }

    if (newAssets.length === 0) return;

    const updater = (prev: any) => {
      if (!prev) return prev;
      const currentAssets = prev.assets || [];
      return {
        ...prev,
        assets: [...currentAssets, ...newAssets]
      };
    };

    if (activeTab === "frontal") {
      setTempPlantilla(updater);
    } else {
      setTempPlantillaTrasera(updater);
    }
  };

  const handleDeleteGalleryAsset = (assetId: string) => {
    const updater = (prev: any) => {
      if (!prev) return prev;
      const currentAssets = prev.assets || [];
      return {
        ...prev,
        assets: currentAssets.filter((asset: any) => asset.id !== assetId)
      };
    };

    if (activeTab === "frontal") {
      setTempPlantilla(updater);
    } else {
      setTempPlantillaTrasera(updater);
    }
  };

  // --- Funciones para Tipografías de la Plantilla (SRS-026) ---
  const handleUploadTemplateFonts = (files: FileList) => {
    const validExtensions = [".ttf", ".otf", ".woff", ".woff2"];
    const newFonts: any[] = [];
    
    let filesProcessed = 0;
    const processFile = (file: File) => {
      const ext = file.name.substring(file.name.lastIndexOf(".")).toLowerCase();
      if (!validExtensions.includes(ext)) {
        alert(`El archivo "${file.name}" no es una tipografía soportada (.ttf, .otf, .woff, .woff2).`);
        filesProcessed++;
        if (filesProcessed === files.length && newFonts.length > 0) {
          applyNewFonts();
        }
        return;
      }
      
      const familyName = file.name
        .substring(0, file.name.lastIndexOf("."))
        .replace(/[^a-zA-Z0-9_-]/g, "");

      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        const base64Data = result.split(",")[1];
        
        const fontSrc = URL.createObjectURL(file);
        
        newFonts.push({
          id: `font_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
          nombre: familyName,
          filename: file.name,
          type: file.type || `font/${ext.replace(".", "")}`,
          data: base64Data,
          src: fontSrc
        });

        filesProcessed++;
        if (filesProcessed === files.length) {
          applyNewFonts();
        }
      };
      reader.readAsDataURL(file);
    };

    const applyNewFonts = () => {
      const updater = (prev: any) => {
        if (!prev) return prev;
        const currentFonts = prev.customFonts || [];
        return {
          ...prev,
          customFonts: [...currentFonts, ...newFonts]
        };
      };
      if (activeTab === "frontal") {
        setTempPlantilla(updater);
      } else {
        setTempPlantillaTrasera(updater);
      }
    };

    if (files.length === 0) return;
    for (let i = 0; i < files.length; i++) {
      processFile(files[i]);
    }
  };

  const handleDeleteTemplateFont = (fontId: string) => {
    const targetFont = (plantillaActiva?.customFonts || []).find((f: any) => f.id === fontId);
    if (!targetFont) return;
    
    if (window.confirm(`¿Estás seguro de que deseas eliminar la tipografía "${targetFont.nombre}"?`)) {
      if (targetFont.src) {
        URL.revokeObjectURL(targetFont.src);
      }
      const updater = (prev: any) => {
        if (!prev) return prev;
        const currentFonts = prev.customFonts || [];
        return {
          ...prev,
          customFonts: currentFonts.filter((f: any) => f.id !== fontId)
        };
      };
      if (activeTab === "frontal") {
        setTempPlantilla(updater);
      } else {
        setTempPlantillaTrasera(updater);
      }
    }
  };

  const handleRenameTemplateFont = (fontId: string) => {
    const targetFont = (plantillaActiva?.customFonts || []).find((f: any) => f.id === fontId);
    if (!targetFont) return;
    
    const nuevoNombre = window.prompt("Introduce el nuevo nombre de la familia de fuentes (sin espacios ni caracteres especiales):", targetFont.nombre);
    if (nuevoNombre) {
      const sanitized = nuevoNombre.replace(/[^a-zA-Z0-9_-]/g, "").trim();
      if (!sanitized) return;
      
      const updater = (prev: any) => {
        if (!prev) return prev;
        const currentFonts = prev.customFonts || [];
        return {
          ...prev,
          customFonts: currentFonts.map((f: any) => f.id === fontId ? { ...f, nombre: sanitized } : f)
        };
      };
      if (activeTab === "frontal") {
        setTempPlantilla(updater);
      } else {
        setTempPlantillaTrasera(updater);
      }
    }
  };

  const handleSelectGalleryAsset = (assetSrc: string) => {
    if (!activeSelectorTarget) return;
    const { type, capaId } = activeSelectorTarget;
    if (type === "override") {
      setTempCapasOverridesActivos((prev) => ({
        ...prev,
        [capaId]: {
          ...(prev[capaId] || {}),
          src: assetSrc,
        },
      }));
    } else {
      handleUpdateCapaProp(capaId, "src", assetSrc);
    }
    setShowGallerySelector(false);
    setActiveSelectorTarget(null);
  };

  // --- Modificar Propiedad de Capa ---
  const handleUpdateCapaProp = (capaId: string, propKey: string, propVal: any) => {
    const updater = (prev: any) => {
      const updatedCapas = prev.capas.map((c: any) => {
        if (c.id === capaId) {
          return {
            ...c,
            [propKey]: propVal
          };
        }
        // Si cambiamos el layout de un contenedor, ponemos a 0 la X e Y de sus hijos directos
        if (propKey === "layout" && c.parentCapaId === capaId) {
          return {
            ...c,
            xMm: 0,
            yMm: 0
          };
        }
        return c;
      });
      return {
        ...prev,
        capas: updatedCapas
      };
    };

    if (activeTab === "frontal") {
      setTempPlantilla(updater);
    } else {
      setTempPlantillaTrasera(updater);
    }
  };

  // --- Aplicar Utilidades Geométricas / Alineación (SRS-017) ---
  const handleApplyAlignment = (type: "izq" | "der" | "arr" | "abj" | "anchoMax" | "altoMax" | "expandir") => {
    if (!selectedCapa || selectedCapa.tipo === "background") return;

    // Obtener dimensiones base (por defecto las de la carta)
    let anchoCarta = plantillaActiva.anchoMm || cardConfig.anchoMm || 63.5;
    let altoCarta = plantillaActiva.altoMm || cardConfig.altoMm || 88.9;

    // Si tiene un contenedor padre, usar sus dimensiones
    if (selectedCapa.parentCapaId) {
      const parentCapa = plantillaActiva.capas?.find((c: any) => c.id === selectedCapa.parentCapaId);
      if (parentCapa && parentCapa.tipo === "container") {
        anchoCarta = parentCapa.anchoMm || 0;
        altoCarta = parentCapa.altoMm || 0;
      }
    }

    // Dimensiones actuales de la capa
    const w = selectedCapa.anchoMm || 0;
    const h = selectedCapa.altoMm || 0;

    let nextCoords: Record<string, number> = {};

    switch (type) {
      case "izq":
        nextCoords = { xMm: 0 };
        break;
      case "der":
        nextCoords = { xMm: Number((anchoCarta - w).toFixed(1)) };
        break;
      case "arr":
        nextCoords = { yMm: 0 };
        break;
      case "abj":
        nextCoords = { yMm: Number((altoCarta - h).toFixed(1)) };
        break;
      case "anchoMax":
        nextCoords = { xMm: 0, anchoMm: Number(anchoCarta.toFixed(1)) };
        break;
      case "altoMax":
        nextCoords = { yMm: 0, altoMm: Number(altoCarta.toFixed(1)) };
        break;
      case "expandir":
        nextCoords = {
          xMm: 0,
          yMm: 0,
          anchoMm: Number(anchoCarta.toFixed(1)),
          altoMm: Number(altoCarta.toFixed(1))
        };
        break;
      default:
        return;
    }

    const updater = (prev: any) => {
      const updatedCapas = prev.capas.map((c: any) => {
        if (c.id === selectedCapa.id) {
          return {
            ...c,
            ...nextCoords
          };
        }
        return c;
      });
      return {
        ...prev,
        capas: updatedCapas
      };
    };

    if (activeTab === "frontal") {
      setTempPlantilla(updater);
    } else {
      setTempPlantillaTrasera(updater);
    }
  };

  // --- Subir o Bajar Capa en la Jerarquía (SRS-016) ---
  const handleMoveCapa = (capaId: string, direction: "up" | "down") => {
    if (!plantillaActiva) return;
    const capas = plantillaActiva.capas || [];
    const index = capas.findIndex((c: any) => c.id === capaId);
    if (index === -1) return;
    const capa = capas[index];
    if (capa.tipo === "background") return;

    let targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= capas.length) return;
    if (targetIndex === 0 && capas[0].tipo === "background") return;

    const updater = (prev: any) => {
      const nextCapas = [...prev.capas];
      const temp = nextCapas[index];
      nextCapas[index] = nextCapas[targetIndex];
      nextCapas[targetIndex] = temp;
      return {
        ...prev,
        capas: nextCapas
      };
    };

    if (activeTab === "frontal") {
      setTempPlantilla(updater);
    } else {
      setTempPlantillaTrasera(updater);
    }
  };

  // --- Árbol Jerárquico y Drag and Drop (SRS-025 Parte 3) ---
  const toggleCollapseContainer = (containerId: string) => {
    setCollapsedContainerIds(prev =>
      prev.includes(containerId)
        ? prev.filter(id => id !== containerId)
        : [...prev, containerId]
    );
  };

  const isDescendant = (potentialDescendantId: string, ancestorId: string): boolean => {
    if (!plantillaActiva) return false;
    let currentId: string | null = potentialDescendantId;
    while (currentId) {
      const currentLayer = plantillaActiva.capas.find((c: any) => c.id === currentId);
      if (!currentLayer) break;
      if (currentLayer.parentCapaId === ancestorId) {
        return true;
      }
      currentId = currentLayer.parentCapaId;
    }
    return false;
  };

  const handleDragStart = (e: React.DragEvent, layerId: string) => {
    setDraggedLayerId(layerId);
    e.dataTransfer.setData("text/plain", layerId);
  };

  const handleDragOver = (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    if (!draggedLayerId || draggedLayerId === targetId) return;
    if (isDescendant(targetId, draggedLayerId)) return;
    setDragOverLayerId(targetId);
  };

  const handleDragLeave = (_e: React.DragEvent, targetId: string) => {
    if (dragOverLayerId === targetId) {
      setDragOverLayerId(null);
    }
  };

  const handleDrop = (e: React.DragEvent, targetId: string | null) => {
    e.preventDefault();
    e.stopPropagation();
    const sourceId = draggedLayerId || e.dataTransfer.getData("text/plain");
    console.log("[CDC DND] handleDrop called - sourceId:", sourceId, "targetId:", targetId);
    setDraggedLayerId(null);
    setDragOverLayerId(null);
    setIsDragOverRoot(false);

    if (!sourceId || !plantillaActiva) {
      console.log("[CDC DND] aborted: no sourceId or plantillaActiva");
      return;
    }
    if (sourceId === targetId) {
      console.log("[CDC DND] aborted: sourceId matches targetId");
      return;
    }
    if (targetId && isDescendant(targetId, sourceId)) {
      console.log("[CDC DND] aborted: circular hierarchy detected (targetId is descendant of sourceId)");
      return;
    }

    const updater = (prev: any) => {
      const nextCapas = [...prev.capas];
      const sourceIndex = nextCapas.findIndex((c: any) => c.id === sourceId);
      if (sourceIndex === -1) {
        console.log("[CDC DND] updater aborted: sourceIndex -1");
        return prev;
      }

      const sourceLayer = { ...nextCapas[sourceIndex] };
      console.log("[CDC DND] updater sourceLayer:", sourceLayer.nombre, "tipo:", sourceLayer.tipo);

      if (targetId === null) {
        console.log("[CDC DND] updater target is null, setting parentCapaId null");
        sourceLayer.parentCapaId = null;
        nextCapas[sourceIndex] = sourceLayer;
        return { ...prev, capas: nextCapas };
      }

      const targetIndex = nextCapas.findIndex((c: any) => c.id === targetId);
      if (targetIndex === -1) {
        console.log("[CDC DND] updater aborted: targetIndex -1");
        return prev;
      }

      const targetLayer = nextCapas[targetIndex];
      console.log("[CDC DND] updater targetLayer:", targetLayer.nombre, "tipo:", targetLayer.tipo);

      if (targetLayer.tipo === "container") {
        console.log("[CDC DND] updater target is container");
        sourceLayer.parentCapaId = targetLayer.id;
        nextCapas.splice(sourceIndex, 1);

        const newTargetIndex = nextCapas.findIndex((c: any) => c.id === targetId);
        let insertIndex = newTargetIndex;

        const isDescendantOfTarget = (c: any): boolean => {
          let currentId = c.parentCapaId;
          let depth = 0;
          while (currentId) {
            depth++;
            if (currentId === targetId) return true;
            const parent = nextCapas.find((p: any) => p.id === currentId);
            currentId = parent ? parent.parentCapaId : null;
            if (depth > 10) break;
          }
          return false;
        };

        while (insertIndex + 1 < nextCapas.length && isDescendantOfTarget(nextCapas[insertIndex + 1])) {
          insertIndex++;
        }

        console.log("[CDC DND] inserting sourceLayer at index:", insertIndex + 1);
        nextCapas.splice(insertIndex + 1, 0, sourceLayer);
        return { ...prev, capas: nextCapas };
      }

      console.log("[CDC DND] updater target is normal layer, setting same parentCapaId");
      sourceLayer.parentCapaId = targetLayer.parentCapaId;
      nextCapas.splice(sourceIndex, 1);
      const newTargetIndex = nextCapas.findIndex((c: any) => c.id === targetId);
      console.log("[CDC DND] inserting sourceLayer after target at index:", newTargetIndex + 1);
      nextCapas.splice(newTargetIndex + 1, 0, sourceLayer);

      return {
        ...prev,
        capas: nextCapas
      };
    };

    if (activeTab === "frontal") {
      setTempPlantilla(updater);
    } else {
      setTempPlantillaTrasera(updater);
    }
  };

  // --- Duplicar Capa Seleccionada (SRS-016) ---
  const handleDuplicateCapa = (capaId: string) => {
    if (!plantillaActiva) return;
    const index = plantillaActiva.capas?.findIndex((c: any) => c.id === capaId);
    if (index === -1) return;
    const capa = plantillaActiva.capas[index];
    if (capa.tipo === "background") return;

    // Almacén para capas duplicadas en orden, campos duplicados y sus valores
    const duplicatedLayers: any[] = [];
    const idMap = new Map<string, string>();
    const fieldsToDuplicate: Array<{ oldClave: string; newClave: string; copiedCampoConfig: any; initialVal: string }> = [];
    const overridesToDuplicate: Array<{ oldId: string; newId: string }> = [];

    // Función recursiva interna para duplicar nodos y sus hijos
    const duplicateLayerNode = (node: any, parentNewId: string | null) => {
      const nodeNewId = `layer_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      idMap.set(node.id, nodeNewId);
      overridesToDuplicate.push({ oldId: node.id, newId: nodeNewId });

      const nodeNewNombre = node.nombre || (node.tipo === "image" ? "Imagen" : node.tipo === "image-switch" ? "Imagen Switch" : node.tipo === "container" ? "Contenedor" : node.tipo === "block" ? "Bloque" : "Texto");

      const dupNode = {
        ...node,
        id: nodeNewId,
        nombre: nodeNewNombre,
        parentCapaId: parentNewId,
        options: node.tipo === "image-switch" && node.options ? node.options.map((opt: any) => ({ ...opt })) : undefined,
      };

      if (node.tipo === "text") {
        const oldNombre = node.nombre || "texto";
        const newNombre = oldNombre;
        
        dupNode.nombre = newNombre;

        const origCampo = plantillaActiva.camposConfig?.find((f: any) => f.clave === oldNombre);
        let copiedCampoConfig = null;
        
        const currentValFront = tempValoresCampos[oldNombre];
        const currentValBack = tempValoresCamposTrasera[oldNombre];
        const initialVal = (activeTab === "frontal" ? currentValFront : currentValBack) !== undefined
          ? (activeTab === "frontal" ? currentValFront : currentValBack)
          : (origCampo ? origCampo.valorDefecto : node.contenidoRaw || "");

        if (origCampo) {
          copiedCampoConfig = {
            ...origCampo,
            clave: newNombre,
            nombreLegible: origCampo.nombreLegible || oldNombre
          };
        } else {
          copiedCampoConfig = {
            clave: newNombre,
            nombreLegible: newNombre,
            tipo: "text",
            valorDefecto: node.contenidoRaw || ""
          };
        }

        console.log("[CDC DUPLICATE] text layer cloned:", oldNombre, "->", newNombre, "initialVal:", initialVal);
        fieldsToDuplicate.push({ oldClave: oldNombre, newClave: newNombre, copiedCampoConfig, initialVal });
      }

      duplicatedLayers.push(dupNode);

      // Buscar todos los hijos directos del nodo original
      const children = (plantillaActiva.capas || []).filter((c: any) => c.parentCapaId === node.id);
      for (const child of children) {
        duplicateLayerNode(child, nodeNewId);
      }
    };

    // Iniciar duplicación recursiva
    duplicateLayerNode(capa, capa.parentCapaId);

    // Encontrar el último descendiente de la capa original para insertar la copia justo después
    const isDescendantOfOriginal = (c: any): boolean => {
      let currentId = c.parentCapaId;
      let depth = 0;
      while (currentId) {
        depth++;
        if (currentId === capaId) return true;
        const parent = plantillaActiva.capas.find((p: any) => p.id === currentId);
        currentId = parent ? parent.parentCapaId : null;
        if (depth > 10) break;
      }
      return false;
    };

    let lastDescendantIndex = index;
    while (lastDescendantIndex + 1 < plantillaActiva.capas.length && isDescendantOfOriginal(plantillaActiva.capas[lastDescendantIndex + 1])) {
      lastDescendantIndex++;
    }

    const updater = (prev: any) => {
      const nextCapas = [...prev.capas];
      nextCapas.splice(lastDescendantIndex + 1, 0, ...duplicatedLayers);
      
      let nextCamposConfig = [...(prev.camposConfig || [])];
      for (const field of fieldsToDuplicate) {
        if (field.copiedCampoConfig && !nextCamposConfig.some((f: any) => f.clave === field.newClave)) {
          nextCamposConfig.push(field.copiedCampoConfig);
        }
      }

      return {
        ...prev,
        capas: nextCapas,
        camposConfig: nextCamposConfig
      };
    };

    if (activeTab === "frontal") {
      setTempPlantilla(updater);
      for (const field of fieldsToDuplicate) {
        setTempValoresCampos((prev: any) => ({
          ...prev,
          [field.newClave]: field.initialVal
        }));
      }
      // Duplicar overrides de capas
      setTempCapasOverrides((prev: any) => {
        const next = { ...prev };
        for (const item of overridesToDuplicate) {
          if (prev[item.oldId]) {
            next[item.newId] = JSON.parse(JSON.stringify(prev[item.oldId]));
          }
        }
        return next;
      });
    } else {
      setTempPlantillaTrasera(updater);
      for (const field of fieldsToDuplicate) {
        setTempValoresCamposTrasera((prev: any) => ({
          ...prev,
          [field.newClave]: field.initialVal
        }));
      }
      // Duplicar overrides de capas trasera
      setTempCapasOverridesTrasera((prev: any) => {
        const next = { ...prev };
        for (const item of overridesToDuplicate) {
          if (prev[item.oldId]) {
            next[item.newId] = JSON.parse(JSON.stringify(prev[item.oldId]));
          }
        }
        return next;
      });
    }

    const rootDuplicatedId = idMap.get(capaId);
    if (rootDuplicatedId) {
      setSelectedLayerId(rootDuplicatedId);
    }
  };

  // --- Eliminar Capa de la Plantilla (SRS-016) ---
  const handleDeleteCapa = (capaId: string) => {
    if (!plantillaActiva) return;
    const capa = plantillaActiva.capas?.find((c: any) => c.id === capaId);
    if (!capa || capa.tipo === "background") return;

    const updater = (prev: any) => {
      const nextCapas = prev.capas.filter((c: any) => c.id !== capaId);
      
      let nextCamposConfig = [...(prev.camposConfig || [])];
      let deletedClave: string | null = null;
      
      if (capa.tipo === "text") {
        const clave = capa.nombre;
        if (clave) {
          const isClaveUsed = nextCapas.some((c: any) => 
            c.tipo === "text" && c.nombre === clave
          );
          if (!isClaveUsed) {
            nextCamposConfig = nextCamposConfig.filter((f: any) => f.clave !== clave);
            deletedClave = clave;
          }
        }
      }

      return {
        ...prev,
        capas: nextCapas,
        camposConfig: nextCamposConfig,
        _deletedClave: deletedClave
      };
    };

    if (activeTab === "frontal") {
      setTempPlantilla((prev: any) => {
        const next = updater(prev);
        const { [capaId]: _, ...nextOverrides } = tempCapasOverrides;
        setTempCapasOverrides(nextOverrides);
        if (next._deletedClave) {
          const { [next._deletedClave]: __, ...nextValores } = tempValoresCampos;
          setTempValoresCampos(nextValores);
        }
        delete next._deletedClave;
        return next;
      });
    } else {
      setTempPlantillaTrasera((prev: any) => {
        const next = updater(prev);
        const { [capaId]: _, ...nextOverrides } = tempCapasOverridesTrasera;
        setTempCapasOverridesTrasera(nextOverrides);
        if (next._deletedClave) {
          const { [next._deletedClave]: __, ...nextValores } = tempValoresCamposTrasera;
          setTempValoresCamposTrasera(nextValores);
        }
        delete next._deletedClave;
        return next;
      });
    }

    setSelectedLayerId(null);
  };

  // --- Modificar Clave de Capa (Sincronizada con camposConfig y valores de carta) ---
  const handleUpdateCapaClave = (capaId: string, oldClave: string | null, newClave: string) => {
    const sanitizedClave = newClave.replace(/[^a-zA-Z0-9_ ]/g, "").replace(/\s+/g, " ").trim();
    if (!sanitizedClave) return;

    if (activeTab === "frontal") {
      const result = actualizarClavePlantillaYValores(
        tempPlantilla,
        tempValoresCampos,
        capaId,
        oldClave,
        sanitizedClave
      );
      setTempPlantilla(result.plantilla);
      setTempValoresCampos(result.valoresCampos);
    } else {
      const result = actualizarClavePlantillaYValores(
        tempPlantillaTrasera,
        tempValoresCamposTrasera,
        capaId,
        oldClave,
        sanitizedClave
      );
      setTempPlantillaTrasera(result.plantilla);
      setTempValoresCamposTrasera(result.valoresCampos);
    }
  };

  // --- Obtener la capa actualmente seleccionada ---
  const selectedCapa = plantillaActiva?.capas?.find((c: any) => c.id === selectedLayerId);

  const handleUpdateBorderWidthGeneral = (capaId: string, val: number) => {
    handleUpdateCapaProp(capaId, "borderTopWidth", val);
    handleUpdateCapaProp(capaId, "borderRightWidth", val);
    handleUpdateCapaProp(capaId, "borderBottomWidth", val);
    handleUpdateCapaProp(capaId, "borderLeftWidth", val);
  };

  const handleUpdatePaddingGeneral = (capaId: string, val: number) => {
    handleUpdateCapaProp(capaId, "paddingTopMm", val);
    handleUpdateCapaProp(capaId, "paddingRightMm", val);
    handleUpdateCapaProp(capaId, "paddingBottomMm", val);
    handleUpdateCapaProp(capaId, "paddingLeftMm", val);
  };

  const handleUpdateBorderColorGeneral = (capaId: string, color: string) => {
    handleUpdateCapaProp(capaId, "borderTopColor", color);
    handleUpdateCapaProp(capaId, "borderRightColor", color);
    handleUpdateCapaProp(capaId, "borderBottomColor", color);
    handleUpdateCapaProp(capaId, "borderLeftColor", color);
  };

  const handleUpdateBorderRadiusGeneral = (capaId: string, radius: number) => {
    handleUpdateCapaProp(capaId, "borderTopLeftRadius", radius);
    handleUpdateCapaProp(capaId, "borderTopRightRadius", radius);
    handleUpdateCapaProp(capaId, "borderBottomRightRadius", radius);
    handleUpdateCapaProp(capaId, "borderBottomLeftRadius", radius);
  };

  const fieldKey = selectedCapa && selectedCapa.tipo === "text" ? selectedCapa.nombre : null;

  // Reverso a renderizar cuando no es dinámico
  const traseraUrl = carta.imagenTrasera || imagenTraseraComun;

  return (
    <div className="edit-modal-backdrop" onClick={handleCancel}>
      <div className="edit-modal-container" onClick={(e) => e.stopPropagation()}>
        <style>
          {((tempPlantilla?.customFonts || []) as any[]).map((font) => `
            @font-face {
              font-family: '${font.nombre}';
              src: url('${font.src || ""}');
            }
          `).join("\n")}
          {((tempPlantillaTrasera?.customFonts || []) as any[]).map((font) => `
            @font-face {
              font-family: '${font.nombre}';
              src: url('${font.src || ""}');
            }
          `).join("\n")}
        </style>
        
        {/* Cabecera del modal */}
        <header className="edit-modal-header">
          <div className="edit-modal-title-area">
            <h2>Editor de Carta: {carta.nombre}</h2>
            {generarReversos && (
              <div className="edit-modal-tabs">
                <button
                  type="button"
                  className={`tab-btn ${activeTab === "frontal" ? "active" : ""}`}
                  onClick={() => {
                    setActiveTab("frontal");
                    setSelectedLayerId(null);
                  }}
                >
                  Cara Frontal
                </button>
                <button
                  type="button"
                  className={`tab-btn ${activeTab === "trasera" ? "active" : ""}`}
                  onClick={() => {
                    setActiveTab("trasera");
                    setSelectedLayerId(null);
                  }}
                >
                  Cara Trasera
                </button>
              </div>
            )}
          </div>
          <div className="edit-modal-actions">
            <button type="button" className="btn-secondary" onClick={handleCancel}>
              Cancelar
            </button>
            <button type="button" className="btn-primary" onClick={handleSave}>
              Guardar Cambios
            </button>
          </div>
        </header>

        {/* Cuerpo del modal (3 Columnas) */}
        <div className="edit-modal-body">
          
          {/* COLUMNA 1: Explorador de Jerarquía */}
          <aside className="hierarchy-column">
            <div className="column-title">Explorador de Capas</div>
            <div className="column-content">
              {!plantillaActiva || !plantillaActiva.capas || plantillaActiva.capas.length === 0 ? (
                <div className="empty-message-inline">
                  {activeTab === "frontal"
                    ? "Nada que editar"
                    : "El reverso no posee capas editables en plantilla."}
                </div>
              ) : (
                 <div 
                  className={`hierarchy-list ${isDragOverRoot ? "drag-over-root" : ""}`}
                  onDragOver={(e) => {
                    e.preventDefault();
                    setIsDragOverRoot(true);
                  }}
                  onDragLeave={() => setIsDragOverRoot(false)}
                  onDrop={(e) => handleDrop(e, null)}
                >
                  {(() => {
                    const isAnyAncestorCollapsed = (c: any): boolean => {
                      let currentId = c.parentCapaId;
                      while (currentId) {
                        if (collapsedContainerIds.includes(currentId)) {
                          return true;
                        }
                        const parent = plantillaActiva.capas.find((p: any) => p.id === currentId);
                        currentId = parent ? parent.parentCapaId : null;
                      }
                      return false;
                    };

                    const visibleLayers = plantillaActiva.capas.filter((c: any) => !isAnyAncestorCollapsed(c));

                    return visibleLayers.map((capa: any) => {
                      let title = capa.nombre;
                      let subtitle = "";

                      if (capa.tipo === "background") {
                        title = capa.nombre;
                        subtitle = "Fondo";
                      } else if (capa.tipo === "text") {
                        title = capa.nombre;
                        subtitle = capa.altoMm > 15 ? "Texto multilínea" : "Texto de una línea";
                      } else if (capa.tipo === "image" || capa.tipo === "image-switch") {
                        title = capa.nombre || (capa.tipo === "image" ? "Imagen" : "Imagen Switch");
                        subtitle = capa.tipo === "image" ? "Capa de Imagen" : "Imagen Switch";
                      } else if (capa.tipo === "container") {
                        title = capa.nombre;
                        subtitle = capa.layout === "vertical" ? "Contenedor Vertical" : capa.layout === "horizontal" ? "Contenedor Horizontal" : "Contenedor Libre";
                      } else if (capa.tipo === "block") {
                        title = capa.nombre || "Bloque";
                        subtitle = "Bloque Vacío";
                      }

                      // Calcular profundidad de anidación para margen/indentación
                      const getDepth = (c: any): number => {
                        let depth = 0;
                        let current = c;
                        while (current && current.parentCapaId) {
                          depth++;
                          const parent = plantillaActiva.capas.find((p: any) => p.id === current.parentCapaId);
                          current = parent;
                          if (depth > 10) break; // Prevenir bucles infinitos
                        }
                        return depth;
                      };
                      const depth = getDepth(capa);

                      const isDragOver = dragOverLayerId === capa.id;
                      const dragOverClass = isDragOver
                        ? (capa.tipo === "container" ? "drag-over-container" : "drag-over")
                        : "";

                      return (
                        <div
                          key={capa.id}
                          className={`hierarchy-item ${selectedLayerId === capa.id ? "selected" : ""} ${
                            hoveredLayerId === capa.id ? "hovered" : ""
                          } ${dragOverClass}`}
                          style={{ marginLeft: `${depth * 16}px` }}
                          draggable={capa.tipo !== "background"}
                          onDragStart={(e) => handleDragStart(e, capa.id)}
                          onDragOver={(e) => handleDragOver(e, capa.id)}
                          onDragLeave={(e) => handleDragLeave(e, capa.id)}
                          onDrop={(e) => handleDrop(e, capa.id)}
                          onDragEnd={() => {
                            setDraggedLayerId(null);
                            setDragOverLayerId(null);
                          }}
                          onClick={() => setSelectedLayerId(capa.id)}
                          onMouseEnter={() => setHoveredLayerId(capa.id)}
                          onMouseLeave={() => setHoveredLayerId(null)}
                        >
                          {capa.tipo === "container" ? (
                            <button
                              type="button"
                              className="collapse-toggle-btn"
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleCollapseContainer(capa.id);
                              }}
                            >
                              {collapsedContainerIds.includes(capa.id) ? "▶" : "▼"}
                            </button>
                          ) : (
                            <span className="collapse-placeholder" />
                          )}
                          <span className="hierarchy-icon">
                            {capa.tipo === "background" ? "🎨" : (capa.tipo === "image" || capa.tipo === "image-switch") ? "🖼️" : capa.tipo === "container" ? "📦" : capa.tipo === "block" ? "⬜" : "📝"}
                          </span>
                          <div className="hierarchy-text-container" style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                            <span className="hierarchy-label" style={{ fontWeight: 600, fontSize: "13px" }}>{title}</span>
                            <span className="hierarchy-subtitle">{subtitle}</span>
                          </div>
                        </div>
                      );
                    });
                  })()}
                </div>
              )}
            </div>

            {/* Acciones de Edición de Plantilla */}
            {plantillaActiva && (
              <div className="hierarchy-column-footer">
                {/* Barra de Acciones de Capas (SRS-016) */}
                <div className="layer-actions-toolbar">
                  <button
                    type="button"
                    className="layer-action-btn"
                    title="Subir capa en la jerarquía"
                    disabled={
                      !selectedLayerId ||
                      selectedCapa?.tipo === "background" ||
                      (() => {
                        const idx = plantillaActiva.capas?.findIndex((c: any) => c.id === selectedLayerId);
                        return idx === undefined || idx <= 1;
                      })()
                    }
                    onClick={() => selectedLayerId && handleMoveCapa(selectedLayerId, "up")}
                  >
                    ⬆️
                  </button>
                  <button
                    type="button"
                    className="layer-action-btn"
                    title="Bajar capa en la jerarquía"
                    disabled={
                      !selectedLayerId ||
                      selectedCapa?.tipo === "background" ||
                      (() => {
                        const idx = plantillaActiva.capas?.findIndex((c: any) => c.id === selectedLayerId);
                        return idx === undefined || idx === -1 || idx === (plantillaActiva.capas?.length - 1);
                      })()
                    }
                    onClick={() => selectedLayerId && handleMoveCapa(selectedLayerId, "down")}
                  >
                    ⬇️
                  </button>
                  <button
                    type="button"
                    className="layer-action-btn"
                    title="Duplicar capa seleccionada"
                    disabled={!selectedLayerId || selectedCapa?.tipo === "background"}
                    onClick={() => selectedLayerId && handleDuplicateCapa(selectedLayerId)}
                  >
                    👥
                  </button>
                  <button
                    type="button"
                    className="layer-action-btn btn-danger-action"
                    title="Eliminar capa seleccionada"
                    disabled={!selectedLayerId || selectedCapa?.tipo === "background"}
                    onClick={() => {
                      if (selectedLayerId && confirm("¿Estás seguro de que deseas eliminar esta capa de la plantilla? Esta acción no se puede deshacer y limpiará los valores de las cartas asociadas.")) {
                        handleDeleteCapa(selectedLayerId);
                      }
                    }}
                  >
                    🗑️
                  </button>
                </div>
                <button
                  type="button"
                  className="btn-add-element"
                  onClick={() => {
                    setSelectedNewType("text");
                    setShowAddElementPopup(true);
                  }}
                >
                  <span>➕</span> Añadir Elemento
                </button>
                <button
                  type="button"
                  className="btn-configure-exposed"
                  onClick={handleOpenExposedConfigModal}
                  style={{
                    width: "100%",
                    padding: "8px 12px",
                    backgroundColor: "var(--bg-app)",
                    border: "1px solid var(--border-color)",
                    color: "var(--text-primary)",
                    borderRadius: "6px",
                    fontFamily: "var(--font-sans)",
                    fontSize: "13px",
                    fontWeight: "500",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "6px",
                    transition: "all 0.15s ease",
                  }}
                >
                  <span>⚙️</span> Configurar campos editables
                </button>
                <div className="template-actions-group">
                  <button
                    type="button"
                    className="btn-main-save"
                    onClick={() => ejecutarExportacion(true, false)}
                    title="Guardar plantilla en el proyecto"
                  >
                    <span>💾</span> Guardar Plantilla
                  </button>
                  <button
                    type="button"
                    className="btn-options-dropdown"
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowDropdown(!showDropdown);
                    }}
                    title="Opciones de plantilla"
                  >
                    🔽
                  </button>
                  {showDropdown && (
                    <div className="options-dropdown-menu">
                      <button
                        type="button"
                        onClick={() => {
                          setShowDropdown(false);
                          ejecutarExportacion(true, false, true);
                        }}
                      >
                        <span>💾</span> Guardar plantilla como...
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setShowDropdown(false);
                          ejecutarExportacion(true, true, false);
                        }}
                      >
                        <span>📥</span> Guardar y Exportar (.cdc2t)
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setShowDropdown(false);
                          ejecutarExportacion(false, true, false);
                        }}
                      >
                        <span>📤</span> Exportar sin Guardar
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </aside>

          {/* COLUMNA 2: Previsualización de Carta */}
          <main className="preview-column">
            <div className="column-title" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span>Previsualización</span>
              <div className="editor-zoom-control" style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <label style={{ margin: 0, fontSize: "11px", fontWeight: "normal", textTransform: "none" }}>Zoom</label>
                <input
                  type="range"
                  min="0.5"
                  max="12.0"
                  step="0.1"
                  value={scale}
                  onChange={(e) => setScale(Number(e.target.value))}
                  style={{ width: "100px", margin: 0, cursor: "pointer" }}
                />
                <span style={{ fontSize: "11px", fontFamily: "monospace", textTransform: "none" }}>{scale.toFixed(1)}x</span>
              </div>
            </div>
            <div className="column-content preview-canvas-wrapper">
              <div
                className="edit-card-preview-frame"
                style={{
                  width: `${cardConfig.anchoMm * scale}px`,
                  height: `${cardConfig.altoMm * scale}px`,
                  border: "1px solid #cbd5e1",
                  position: "relative",
                  overflow: "hidden",
                  boxShadow: "0 10px 25px rgba(0, 0, 0, 0.4)",
                  backgroundColor: "#ffffff",
                }}
              >
                {plantillaActiva && plantillaActiva.capas && plantillaActiva.capas.length > 0 ? (
                  (() => {
                    const renderCapaRecursiva = (parentId: string | null): React.ReactNode => {
                      const layers = plantillaActiva?.capas || [];
                      const filteredLayers = layers.filter((c: any) => {
                        if (parentId === null) {
                          return !c.parentCapaId;
                        }
                        return c.parentCapaId === parentId;
                      });

                      return filteredLayers.map((capa: any) => {
                        const parentCapa = layers.find((p: any) => p.id === capa.parentCapaId);
                        const isParentFlex = parentCapa && (parentCapa.layout === "vertical" || parentCapa.layout === "horizontal");
                        const isParentVertical = parentCapa && parentCapa.layout === "vertical";
                        const isParentHorizontal = parentCapa && parentCapa.layout === "horizontal";

                        const isSelected = selectedLayerId === capa.id;
                        const isHovered = hoveredLayerId === capa.id;

                        const layerStyle: React.CSSProperties = {
                          position: isParentFlex ? "relative" : "absolute",
                          left: isParentFlex 
                            ? (isParentVertical ? `${capa.xMm * scale}px` : undefined)
                            : `${capa.xMm * scale}px`,
                          top: isParentFlex 
                            ? (isParentHorizontal ? `${capa.yMm * scale}px` : undefined)
                            : `${capa.yMm * scale}px`,
                          width: `${capa.anchoMm * scale}px`,
                          height: `${capa.altoMm * scale}px`,
                          cursor: "pointer",
                          boxSizing: "border-box",
                          transition: "outline 0.1s ease",
                          outline: isSelected
                            ? "2px solid var(--accent-primary)"
                            : isHovered
                            ? "2px dashed var(--accent-primary-half, rgba(139, 92, 246, 0.5))"
                            : "none",
                          outlineOffset: "-1px",
                          zIndex: isSelected ? 10 : isHovered ? 9 : 1,
                          flexShrink: 0,
                        };

                        if (capa.tipo === "background") {
                          const colorFill = tempCapasOverridesActivos[capa.id]?.colorFill || capa.colorFill || "#ffffff";
                          return (
                            <div
                              key={capa.id}
                              style={{
                                ...layerStyle,
                                backgroundColor: colorFill,
                              }}
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedLayerId(capa.id);
                              }}
                              onMouseEnter={() => setHoveredLayerId(capa.id)}
                              onMouseLeave={() => setHoveredLayerId(null)}
                            />
                          );
                        }

                        if (capa.tipo === "block") {
                          const overrides = tempCapasOverridesActivos[capa.id];
                          const resolvedCapa = overrides ? { ...capa, ...overrides } : capa;

                          // Bordes y Esquinas (SRS-024)
                          const borderTopPx = (resolvedCapa.borderTopWidth || 0) * scale;
                          const borderRightPx = (resolvedCapa.borderRightWidth || 0) * scale;
                          const borderBottomPx = (resolvedCapa.borderBottomWidth || 0) * scale;
                          const borderLeftPx = (resolvedCapa.borderLeftWidth || 0) * scale;

                          const radiusTopLeftPx = (resolvedCapa.borderTopLeftRadius || 0) * scale;
                          const radiusTopRightPx = (resolvedCapa.borderTopRightRadius || 0) * scale;
                          const radiusBottomRightPx = (resolvedCapa.borderBottomRightRadius || 0) * scale;
                          const radiusBottomLeftPx = (resolvedCapa.borderBottomLeftRadius || 0) * scale;

                          const borderCornersStyle = {
                            borderTop: borderTopPx > 0 ? `${borderTopPx}px solid ${resolvedCapa.borderTopColor || "#000000"}` : "none",
                            borderRight: borderRightPx > 0 ? `${borderRightPx}px solid ${resolvedCapa.borderRightColor || "#000000"}` : "none",
                            borderBottom: borderBottomPx > 0 ? `${borderBottomPx}px solid ${resolvedCapa.borderBottomColor || "#000000"}` : "none",
                            borderLeft: borderLeftPx > 0 ? `${borderLeftPx}px solid ${resolvedCapa.borderLeftColor || "#000000"}` : "none",
                            borderTopLeftRadius: `${radiusTopLeftPx}px`,
                            borderTopRightRadius: `${radiusTopRightPx}px`,
                            borderBottomRightRadius: `${radiusBottomRightPx}px`,
                            borderBottomLeftRadius: `${radiusBottomLeftPx}px`,
                            boxSizing: "border-box" as const,
                            overflow: "hidden" as const,
                          };

                          return (
                            <div
                              key={capa.id}
                              style={{
                                ...layerStyle,
                                ...borderCornersStyle,
                                backgroundColor: resolvedCapa.backgroundColor || "transparent",
                              }}
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedLayerId(capa.id);
                              }}
                              onMouseEnter={() => setHoveredLayerId(capa.id)}
                              onMouseLeave={() => setHoveredLayerId(null)}
                            />
                          );
                        }

                        if (capa.tipo === "container") {
                          const overrides = tempCapasOverridesActivos[capa.id];
                          const resolvedCapa = overrides ? { ...capa, ...overrides } : capa;

                          // Bordes y Esquinas (SRS-024)
                          const borderTopPx = (resolvedCapa.borderTopWidth || 0) * scale;
                          const borderRightPx = (resolvedCapa.borderRightWidth || 0) * scale;
                          const borderBottomPx = (resolvedCapa.borderBottomWidth || 0) * scale;
                          const borderLeftPx = (resolvedCapa.borderLeftWidth || 0) * scale;

                          const radiusTopLeftPx = (resolvedCapa.borderTopLeftRadius || 0) * scale;
                          const radiusTopRightPx = (resolvedCapa.borderTopRightRadius || 0) * scale;
                          const radiusBottomRightPx = (resolvedCapa.borderBottomRightRadius || 0) * scale;
                          const radiusBottomLeftPx = (resolvedCapa.borderBottomLeftRadius || 0) * scale;

                          const borderCornersStyle = {
                            borderTop: borderTopPx > 0 ? `${borderTopPx}px solid ${resolvedCapa.borderTopColor || "#000000"}` : "none",
                            borderRight: borderRightPx > 0 ? `${borderRightPx}px solid ${resolvedCapa.borderRightColor || "#000000"}` : "none",
                            borderBottom: borderBottomPx > 0 ? `${borderBottomPx}px solid ${resolvedCapa.borderBottomColor || "#000000"}` : "none",
                            borderLeft: borderLeftPx > 0 ? `${borderLeftPx}px solid ${resolvedCapa.borderLeftColor || "#000000"}` : "none",
                            borderTopLeftRadius: `${radiusTopLeftPx}px`,
                            borderTopRightRadius: `${radiusTopRightPx}px`,
                            borderBottomRightRadius: `${radiusBottomRightPx}px`,
                            borderBottomLeftRadius: `${radiusBottomLeftPx}px`,
                          };

                          const isFlex = resolvedCapa.layout === "vertical" || resolvedCapa.layout === "horizontal";
                          const flexStyle: React.CSSProperties = isFlex ? {
                            display: "flex",
                            flexDirection: resolvedCapa.layout === "vertical" ? "column" : "row",
                          } : {};

                          return (
                            <div
                              key={capa.id}
                              style={{
                                ...layerStyle,
                                ...borderCornersStyle,
                                ...flexStyle,
                                backgroundColor: resolvedCapa.backgroundColor || "transparent",
                                overflow: "hidden",
                              }}
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedLayerId(capa.id);
                              }}
                              onMouseEnter={() => setHoveredLayerId(capa.id)}
                              onMouseLeave={() => setHoveredLayerId(null)}
                            >
                              {renderCapaRecursiva(capa.id)}
                            </div>
                          );
                        }

                        if (capa.tipo === "text") {
                          const overrides = tempCapasOverridesActivos[capa.id];
                          const resolvedCapa = overrides ? { ...capa, ...overrides } : capa;
                          const textoInterp = renderizarTextoCapa(resolvedCapa, tempValoresActivos, plantillaActiva?.capas);
                          const htmlText = parseMarkdownToHtml(textoInterp);
                          const fontSizePx = (resolvedCapa.fontSizePt || 12) * 0.352778 * scale;

                          // Padding (SRS-033)
                          const paddingTopPx = (resolvedCapa.paddingTopMm || 0) * scale;
                          const paddingRightPx = (resolvedCapa.paddingRightMm || 0) * scale;
                          const paddingBottomPx = (resolvedCapa.paddingBottomMm || 0) * scale;
                          const paddingLeftPx = (resolvedCapa.paddingLeftMm || 0) * scale;

                          // Bordes y Esquinas (SRS-024)
                          const borderTopPx = (resolvedCapa.borderTopWidth || 0) * scale;
                          const borderRightPx = (resolvedCapa.borderRightWidth || 0) * scale;
                          const borderBottomPx = (resolvedCapa.borderBottomWidth || 0) * scale;
                          const borderLeftPx = (resolvedCapa.borderLeftWidth || 0) * scale;

                          const radiusTopLeftPx = (resolvedCapa.borderTopLeftRadius || 0) * scale;
                          const radiusTopRightPx = (resolvedCapa.borderTopRightRadius || 0) * scale;
                          const radiusBottomRightPx = (resolvedCapa.borderBottomRightRadius || 0) * scale;
                          const radiusBottomLeftPx = (resolvedCapa.borderBottomLeftRadius || 0) * scale;

                          const borderCornersStyle = {
                            borderTop: borderTopPx > 0 ? `${borderTopPx}px solid ${resolvedCapa.borderTopColor || "#000000"}` : "none",
                            borderRight: borderRightPx > 0 ? `${borderRightPx}px solid ${resolvedCapa.borderRightColor || "#000000"}` : "none",
                            borderBottom: borderBottomPx > 0 ? `${borderBottomPx}px solid ${resolvedCapa.borderBottomColor || "#000000"}` : "none",
                            borderLeft: borderLeftPx > 0 ? `${borderLeftPx}px solid ${resolvedCapa.borderLeftColor || "#000000"}` : "none",
                            borderTopLeftRadius: `${radiusTopLeftPx}px`,
                            borderTopRightRadius: `${radiusTopRightPx}px`,
                            borderBottomRightRadius: `${radiusBottomRightPx}px`,
                            borderBottomLeftRadius: `${radiusBottomLeftPx}px`,
                            overflow: "hidden" as const,
                          };

                          return (
                            <div
                              key={capa.id}
                              style={{
                                ...layerStyle,
                                ...borderCornersStyle,
                                fontFamily: resolvedCapa.fontFamily || "sans-serif",
                                fontSize: `${fontSizePx}px`,
                                color: resolvedCapa.color || "#000000",
                                backgroundColor: resolvedCapa.backgroundColor || "transparent",
                                textAlign: (resolvedCapa.alineacion === "center"
                                  ? "center"
                                  : resolvedCapa.alineacion === "right"
                                  ? "right"
                                  : "justify" === resolvedCapa.alineacion
                                  ? "justify"
                                  : "left") as any,
                                fontWeight: resolvedCapa.bold ? "bold" : "normal",
                                fontStyle: resolvedCapa.italic ? "italic" : "normal",
                                textDecoration: resolvedCapa.underline ? "underline" : "none",
                                whiteSpace: "pre-wrap",
                                wordBreak: "break-word",
                                lineHeight: 1.2,
                                paddingTop: paddingTopPx > 0 ? `${paddingTopPx}px` : "2px",
                                paddingRight: paddingRightPx > 0 ? `${paddingRightPx}px` : "2px",
                                paddingBottom: paddingBottomPx > 0 ? `${paddingBottomPx}px` : "2px",
                                paddingLeft: paddingLeftPx > 0 ? `${paddingLeftPx}px` : "2px",
                                userSelect: "none",
                              }}
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedLayerId(capa.id);
                              }}
                              onMouseEnter={() => setHoveredLayerId(capa.id)}
                              onMouseLeave={() => setHoveredLayerId(null)}
                              dangerouslySetInnerHTML={{ __html: htmlText }}
                            />
                          );
                        }

                        if (capa.tipo === "image" || capa.tipo === "image-switch") {
                          const overrides = tempCapasOverridesActivos[capa.id];
                          const resolvedCapa = overrides ? { ...capa, ...overrides } : capa;
                          const src = resolvedCapa.src;
                          const showPlaceholder = !src;

                          // Bordes y Esquinas (SRS-024)
                          const borderTopPx = (resolvedCapa.borderTopWidth || 0) * scale;
                          const borderRightPx = (resolvedCapa.borderRightWidth || 0) * scale;
                          const borderBottomPx = (resolvedCapa.borderBottomWidth || 0) * scale;
                          const borderLeftPx = (resolvedCapa.borderLeftWidth || 0) * scale;

                          const radiusTopLeftPx = (resolvedCapa.borderTopLeftRadius || 0) * scale;
                          const radiusTopRightPx = (resolvedCapa.borderTopRightRadius || 0) * scale;
                          const radiusBottomRightPx = (resolvedCapa.borderBottomRightRadius || 0) * scale;
                          const radiusBottomLeftPx = (resolvedCapa.borderBottomLeftRadius || 0) * scale;

                          const borderCornersStyle = {
                            borderTop: showPlaceholder ? "1px dashed #cbd5e1" : (borderTopPx > 0 ? `${borderTopPx}px solid ${resolvedCapa.borderTopColor || "#000000"}` : "none"),
                            borderRight: showPlaceholder ? "1px dashed #cbd5e1" : (borderRightPx > 0 ? `${borderRightPx}px solid ${resolvedCapa.borderRightColor || "#000000"}` : "none"),
                            borderBottom: showPlaceholder ? "1px dashed #cbd5e1" : (borderBottomPx > 0 ? `${borderBottomPx}px solid ${resolvedCapa.borderBottomColor || "#000000"}` : "none"),
                            borderLeft: showPlaceholder ? "1px dashed #cbd5e1" : (borderLeftPx > 0 ? `${borderLeftPx}px solid ${resolvedCapa.borderLeftColor || "#000000"}` : "none"),
                            borderTopLeftRadius: `${radiusTopLeftPx}px`,
                            borderTopRightRadius: `${radiusTopRightPx}px`,
                            borderBottomRightRadius: `${radiusBottomRightPx}px`,
                            borderBottomLeftRadius: `${radiusBottomLeftPx}px`,
                            overflow: "hidden" as const,
                          };

                          return (
                            <div
                              key={capa.id}
                              style={{
                                ...layerStyle,
                                ...borderCornersStyle,
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                backgroundColor: showPlaceholder ? "#e2e8f0" : (resolvedCapa.backgroundColor || "transparent"),
                              }}
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedLayerId(capa.id);
                              }}
                              onMouseEnter={() => setHoveredLayerId(capa.id)}
                              onMouseLeave={() => setHoveredLayerId(null)}
                            >
                              {showPlaceholder ? (
                                <span style={{ fontSize: `${Math.min(capa.anchoMm, capa.altoMm) * 0.4 * scale}px`, userSelect: "none" }}>
                                  🖼️
                                </span>
                              ) : (
                                <img
                                  src={src}
                                  alt={capa.nombre}
                                  style={{
                                    width: "100%",
                                    height: "100%",
                                    objectFit: resolvedCapa.modoAjuste === "stretch" ? "fill" : (resolvedCapa.modoAjuste || "cover") as any,
                                    pointerEvents: "none",
                                    borderRadius: "inherit",
                                  }}
                                />
                              )}
                            </div>
                          );
                        }

                        return null;
                      });
                    };
                    return renderCapaRecursiva(null);
                  })()
                ) : activeTab === "trasera" && traseraUrl ? (
                  <div
                    style={{
                      width: "100%",
                      height: "100%",
                      backgroundImage: `url(${traseraUrl})`,
                      backgroundSize: cardConfig.modoAjuste || "cover",
                      backgroundRepeat: "no-repeat",
                      backgroundPosition: "center",
                    }}
                  />
                ) : (
                  <div className="preview-empty-text" style={{ display: "flex", flexDirection: "column", gap: "12px", alignItems: "center", justifyContent: "center", height: "100%" }}>
                    <span>{activeTab === "frontal" ? "Nada que editar" : "Sin reverso configurado"}</span>
                    {activeTab === "trasera" && onAssignBackTemplate && (
                      <button
                        className="btn-primary"
                        onClick={onAssignBackTemplate}
                        style={{ fontSize: "12px", padding: "6px 12px", cursor: "pointer" }}
                      >
                        📄 Usar Plantilla de Reverso
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          </main>

          {/* COLUMNA 3: Inspector de Propiedades */}
          <aside className="inspector-column">
            <div className="column-title">Inspector de Propiedades</div>
            <div className="column-content">
              {selectedLayerId && selectedCapa ? (
                <div className="inspector-panel">
                  <div className="inspector-layer-header">
                    <span className="inspector-layer-icon">
                      {selectedCapa.tipo === "background" ? "🎨" : (selectedCapa.tipo === "image" || selectedCapa.tipo === "image-switch") ? "🖼️" : selectedCapa.tipo === "container" ? "📦" : selectedCapa.tipo === "block" ? "⬜" : "📝"}
                    </span>
                    <h3>{selectedCapa.nombre}</h3>
                  </div>
                  <hr className="inspector-separator" />

                  {/* Formulario Unificado de Propiedades (SRS-035) */}
                  <div className="inspector-properties-form" style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                    
                    {/* Capa de Fondo (Background) */}
                    {selectedCapa.tipo === "background" && (
                      <div className="inspector-group-section">
                        <h4 className="inspector-group-title">Apariencia del Fondo</h4>
                        <div className="inspector-section">
                          <label className="inspector-label">Color de Relleno (Carta)</label>
                          <div className="color-picker-group">
                            <input
                              type="color"
                              className="color-picker-input"
                              value={tempCapasOverridesActivos[selectedCapa.id]?.colorFill || selectedCapa.colorFill || "#ffffff"}
                              onChange={(e) => {
                                setTempCapasOverridesActivos((prev) => ({
                                  ...prev,
                                  [selectedCapa.id]: {
                                    ...(prev[selectedCapa.id] || {}),
                                    colorFill: e.target.value,
                                  },
                                }));
                              }}
                            />
                            <input
                              type="text"
                              className="color-hex-input"
                              value={tempCapasOverridesActivos[selectedCapa.id]?.colorFill || selectedCapa.colorFill || "#ffffff"}
                              onChange={(e) => {
                                const val = e.target.value;
                                if (/^#[0-9A-F]{6}$/i.test(val)) {
                                  setTempCapasOverridesActivos((prev) => ({
                                    ...prev,
                                    [selectedCapa.id]: {
                                      ...(prev[selectedCapa.id] || {}),
                                      colorFill: val,
                                    },
                                  }));
                                }
                              }}
                            />
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Capa de Texto */}
                    {selectedCapa.tipo === "text" && (
                      <>
                        {/* Sección 1: Contenido y Anulaciones de la Carta */}
                        <div className="inspector-group-section">
                          <h4 className="inspector-group-title">Contenido y Anulaciones (Carta)</h4>
                          
                          <div className="inspector-section">
                            <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "4px" }}>
                              <label className="inspector-label" style={{ margin: 0 }}>
                                {selectedCapa.nombre || "Texto"}
                              </label>
                              <span
                                style={{ cursor: "help", fontSize: "14px" }}
                                title="Formato disponible: **negrita**, *cursiva* y __subrayado__ para texto enriquecido."
                              >
                                ℹ️
                              </span>
                            </div>
                            {selectedCapa.multiline !== false ? (
                              <textarea
                                className="inspector-textarea"
                                value={tempValoresActivos[selectedCapa.id] !== undefined ? tempValoresActivos[selectedCapa.id] : (selectedCapa.contenidoRaw || "")}
                                rows={4}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  if (activeTab === "frontal") {
                                    setTempValoresCampos((prev) => ({ ...prev, [selectedCapa.id]: val }));
                                  } else {
                                    setTempValoresCamposTrasera((prev) => ({ ...prev, [selectedCapa.id]: val }));
                                  }
                                }}
                              />
                            ) : (
                              <input
                                type="text"
                                className="inspector-input"
                                value={tempValoresActivos[selectedCapa.id] !== undefined ? tempValoresActivos[selectedCapa.id] : (selectedCapa.contenidoRaw || "")}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  if (activeTab === "frontal") {
                                    setTempValoresCampos((prev) => ({ ...prev, [selectedCapa.id]: val }));
                                  } else {
                                    setTempValoresCamposTrasera((prev) => ({ ...prev, [selectedCapa.id]: val }));
                                  }
                                }}
                              />
                            )}
                          </div>

                          <div className="inspector-section" style={{ marginTop: "12px" }}>
                            <label className="inspector-label">Tipografía (Anulación)</label>
                            <select
                              className="inspector-input"
                              value={tempCapasOverridesActivos[selectedCapa.id]?.fontFamily || selectedCapa.fontFamily || "sans-serif"}
                              onChange={(e) => {
                                setTempCapasOverridesActivos((prev) => ({
                                  ...prev,
                                  [selectedCapa.id]: {
                                    ...(prev[selectedCapa.id] || {}),
                                    fontFamily: e.target.value,
                                  },
                                }));
                              }}
                            >
                              <option value="sans-serif">Inter (Sans Serif)</option>
                              <option value="Outfit">Outfit</option>
                              <option value="Arial">Arial</option>
                              <option value="Times New Roman">Times New Roman</option>
                              <option value="Courier New">Courier New (Monospace)</option>
                              {projectFonts && projectFonts.length > 0 && (
                                <optgroup label="Fuentes del Proyecto">
                                  {projectFonts.map((f: any) => (
                                    <option key={f.id} value={f.nombre}>{f.nombre}</option>
                                  ))}
                                </optgroup>
                              )}
                              {plantillaActiva?.customFonts && plantillaActiva.customFonts.length > 0 && (
                                <optgroup label="Fuentes de la Plantilla">
                                  {plantillaActiva.customFonts.map((f: any) => (
                                    <option key={f.id} value={f.nombre}>{f.nombre}</option>
                                  ))}
                                </optgroup>
                              )}
                            </select>
                          </div>

                          <div className="layout-form-grid" style={{ marginTop: "12px" }}>
                            <div className="inspector-section">
                              <label className="inspector-label">Tamaño Fuente (pt) (Anulación)</label>
                              <input
                                type="number"
                                step="1"
                                min="4"
                                className="inspector-input"
                                value={tempCapasOverridesActivos[selectedCapa.id]?.fontSizePt || selectedCapa.fontSizePt || 12}
                                onChange={(e) => {
                                  setTempCapasOverridesActivos((prev) => ({
                                    ...prev,
                                    [selectedCapa.id]: {
                                      ...(prev[selectedCapa.id] || {}),
                                      fontSizePt: Number(e.target.value),
                                    },
                                  }));
                                }}
                              />
                            </div>
                            <div className="inspector-section">
                              <label className="inspector-label">Color de Texto (Anulación)</label>
                              <div className="color-picker-group">
                                <input
                                  type="color"
                                  className="color-picker-input"
                                  value={tempCapasOverridesActivos[selectedCapa.id]?.color || selectedCapa.color || "#000000"}
                                  onChange={(e) => {
                                    setTempCapasOverridesActivos((prev) => ({
                                      ...prev,
                                      [selectedCapa.id]: {
                                        ...(prev[selectedCapa.id] || {}),
                                        color: e.target.value,
                                      },
                                    }));
                                  }}
                                />
                                <input
                                  type="text"
                                  className="color-hex-input"
                                  value={tempCapasOverridesActivos[selectedCapa.id]?.color || selectedCapa.color || "#000000"}
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    if (/^#[0-9A-F]{6}$/i.test(val)) {
                                      setTempCapasOverridesActivos((prev) => ({
                                        ...prev,
                                        [selectedCapa.id]: {
                                          ...(prev[selectedCapa.id] || {}),
                                          color: val,
                                        },
                                      }));
                                    }
                                  }}
                                />
                              </div>
                            </div>
                          </div>

                          <div className="inspector-section" style={{ marginTop: "12px" }}>
                            <label className="inspector-label">Alineación (Anulación)</label>
                            <div className="alignment-group">
                              {(["left", "center", "right", "justify"] as const).map((align) => {
                                const activeAlign = tempCapasOverridesActivos[selectedCapa.id]?.alineacion || selectedCapa.alineacion || "left";
                                return (
                                  <button
                                    key={align}
                                    type="button"
                                    className={`align-btn ${activeAlign === align ? "active" : ""}`}
                                    onClick={() => {
                                      setTempCapasOverridesActivos((prev) => ({
                                        ...prev,
                                        [selectedCapa.id]: {
                                          ...(prev[selectedCapa.id] || {}),
                                          alineacion: align,
                                        },
                                      }));
                                    }}
                                    title={`Alinear ${align}`}
                                  >
                                    {align === "left" ? "⬅️" : align === "center" ? "↔️" : align === "right" ? "➡️" : "↕️"}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        </div>

                        {/* Sección 2: Definición de Plantilla (Diseño) */}
                        <div className="inspector-group-section" style={{ borderTop: "1px solid var(--border-color)", paddingTop: "16px" }}>
                          <h4 className="inspector-group-title">Definición de Plantilla</h4>

                          <div className="inspector-section">
                            <label className="inspector-label">Nombre de Variable (Clave)</label>
                            <input
                              type="text"
                              className="inspector-input"
                              value={fieldKey || ""}
                              placeholder="ej. titulo"
                              onChange={(e) => handleUpdateCapaClave(selectedCapa.id, fieldKey, e.target.value)}
                            />
                          </div>

                          <div className="inspector-section" style={{ marginTop: "12px" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "4px" }}>
                              <label className="inspector-label" style={{ margin: 0 }}>Texto por defecto</label>
                              <span
                                style={{ cursor: "pointer", fontSize: "14px" }}
                                title="Copiar el texto del contenido"
                                onClick={() => {
                                  const currentValue = tempValoresActivos[selectedCapa.id] || "";
                                  handleUpdateCapaProp(selectedCapa.id, "contenidoRaw", currentValue);
                                }}
                              >
                                📋
                              </span>
                            </div>
                            {selectedCapa.multiline !== false ? (
                              <textarea
                                className="inspector-textarea"
                                value={selectedCapa.contenidoRaw || ""}
                                rows={4}
                                onChange={(e) => handleUpdateCapaProp(selectedCapa.id, "contenidoRaw", e.target.value)}
                              />
                            ) : (
                              <input
                                type="text"
                                className="inspector-input"
                                value={selectedCapa.contenidoRaw || ""}
                                onChange={(e) => handleUpdateCapaProp(selectedCapa.id, "contenidoRaw", e.target.value)}
                              />
                            )}
                          </div>

                          <div style={{ display: "flex", flexDirection: "row", alignItems: "center", gap: "8px", marginTop: "12px" }}>
                            <input
                              type="checkbox"
                              id={`capa-multiline-${selectedCapa.id}`}
                              checked={selectedCapa.multiline !== false}
                              onChange={(e) => handleUpdateCapaProp(selectedCapa.id, "multiline", e.target.checked)}
                              style={{ width: "auto", margin: 0, cursor: "pointer" }}
                            />
                            <label htmlFor={`capa-multiline-${selectedCapa.id}`} className="inspector-label" style={{ margin: 0, cursor: "pointer" }}>
                              Multilínea
                            </label>
                          </div>

                          <div className="inspector-section" style={{ marginTop: "12px" }}>
                            <label className="inspector-label">Tipografía por defecto</label>
                            <select
                              className="inspector-input"
                              value={selectedCapa.fontFamily || "sans-serif"}
                              onChange={(e) => handleUpdateCapaProp(selectedCapa.id, "fontFamily", e.target.value)}
                            >
                              <option value="sans-serif">Inter (Sans Serif)</option>
                              <option value="Outfit">Outfit</option>
                              <option value="Arial">Arial</option>
                              <option value="Times New Roman">Times New Roman</option>
                              <option value="Courier New">Courier New (Monospace)</option>
                              {projectFonts && projectFonts.length > 0 && (
                                <optgroup label="Fuentes del Proyecto">
                                  {projectFonts.map((f: any) => (
                                    <option key={f.id} value={f.nombre}>{f.nombre}</option>
                                  ))}
                                </optgroup>
                              )}
                              {plantillaActiva?.customFonts && plantillaActiva.customFonts.length > 0 && (
                                <optgroup label="Fuentes de la Plantilla">
                                  {plantillaActiva.customFonts.map((f: any) => (
                                    <option key={f.id} value={f.nombre}>{f.nombre}</option>
                                  ))}
                                </optgroup>
                              )}
                            </select>
                          </div>

                          <div className="layout-form-grid" style={{ marginTop: "12px" }}>
                            <div className="inspector-section">
                              <label className="inspector-label">Tamaño Fuente por defecto (pt)</label>
                              <input
                                type="number"
                                step="1"
                                min="4"
                                className="inspector-input"
                                value={selectedCapa.fontSizePt || 12}
                                onChange={(e) => handleUpdateCapaProp(selectedCapa.id, "fontSizePt", Number(e.target.value))}
                              />
                            </div>
                            <div className="inspector-section">
                              <label className="inspector-label">Color de Texto por defecto</label>
                              <input
                                type="color"
                                className="color-picker-input"
                                style={{ width: "100%", height: "38px" }}
                                value={selectedCapa.color || "#000000"}
                                onChange={(e) => handleUpdateCapaProp(selectedCapa.id, "color", e.target.value)}
                              />
                            </div>
                          </div>

                          <div className="inspector-section" style={{ marginTop: "12px" }}>
                            <label className="inspector-label">Estilos y Alineación por defecto</label>
                            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                              <div className="style-toggle-buttons">
                                <button
                                  type="button"
                                  className={`style-btn ${selectedCapa.bold ? "active" : ""}`}
                                  onClick={() => handleUpdateCapaProp(selectedCapa.id, "bold", !selectedCapa.bold)}
                                >
                                  Negrita (B)
                                </button>
                                <button
                                  type="button"
                                  className={`style-btn ${selectedCapa.italic ? "active" : ""}`}
                                  onClick={() => handleUpdateCapaProp(selectedCapa.id, "italic", !selectedCapa.italic)}
                                >
                                  Cursiva (I)
                                </button>
                                <button
                                  type="button"
                                  className={`style-btn ${selectedCapa.underline ? "active" : ""}`}
                                  onClick={() => handleUpdateCapaProp(selectedCapa.id, "underline", !selectedCapa.underline)}
                                >
                                  Subrayado (U)
                                </button>
                              </div>
                              <div className="alignment-group">
                                <button
                                  type="button"
                                  className={`align-btn ${selectedCapa.alineacion === "left" ? "active" : ""}`}
                                  onClick={() => handleUpdateCapaProp(selectedCapa.id, "alineacion", "left")}
                                  title="Alinear Izquierda"
                                >
                                  ⬅️
                                </button>
                                <button
                                  type="button"
                                  className={`align-btn ${selectedCapa.alineacion === "center" ? "active" : ""}`}
                                  onClick={() => handleUpdateCapaProp(selectedCapa.id, "alineacion", "center")}
                                  title="Alinear Centro"
                                >
                                  ↔️
                                </button>
                                <button
                                  type="button"
                                  className={`align-btn ${selectedCapa.alineacion === "right" ? "active" : ""}`}
                                  onClick={() => handleUpdateCapaProp(selectedCapa.id, "alineacion", "right")}
                                  title="Alinear Derecha"
                                >
                                  ➡️
                                </button>
                                <button
                                  type="button"
                                  className={`align-btn ${selectedCapa.alineacion === "justify" ? "active" : ""}`}
                                  onClick={() => handleUpdateCapaProp(selectedCapa.id, "alineacion", "justify")}
                                  title="Justificado"
                                >
                                  ↕️
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      </>
                    )}

                    {/* Capas de Imagen */}
                    {selectedCapa.tipo === "image" && (
                      <>
                        {/* Sección 1: Imagen de la Carta (Anulación) */}
                        <div className="inspector-group-section">
                          <h4 className="inspector-group-title">Imagen de esta Carta (Anulación)</h4>
                          <div className="inspector-section">
                            {tempCapasOverridesActivos[selectedCapa.id]?.src ? (
                              <div className="image-override-preview-container">
                                <img
                                  src={tempCapasOverridesActivos[selectedCapa.id].src}
                                  alt="Vista previa de anulación"
                                  className="inspector-image-preview"
                                  style={{
                                    width: "100%",
                                    maxHeight: "150px",
                                    objectFit: "contain",
                                    borderRadius: "6px",
                                    backgroundColor: "#f1f5f9",
                                    border: "1px solid #cbd5e1",
                                    marginBottom: "8px",
                                  }}
                                />
                                <button
                                  type="button"
                                  className="btn-danger-sec"
                                  style={{ width: "100%" }}
                                  onClick={() => {
                                    setTempCapasOverridesActivos((prev) => {
                                      const next = { ...prev };
                                      if (next[selectedCapa.id]) {
                                        const { src, ...rest } = next[selectedCapa.id];
                                        if (Object.keys(rest).length === 0) {
                                          delete next[selectedCapa.id];
                                        } else {
                                          next[selectedCapa.id] = rest;
                                        }
                                      }
                                      return next;
                                    });
                                  }}
                                >
                                  Quitar Anulación (Heredar plantilla)
                                </button>
                              </div>
                            ) : (
                              <div className="image-upload-dropzone">
                                <input
                                  type="file"
                                  accept="image/*"
                                  id={`file-override-${selectedCapa.id}`}
                                  style={{ display: "none" }}
                                  onChange={(e) => {
                                    if (e.target.files && e.target.files[0]) {
                                      const file = e.target.files[0];
                                      if (!file.type.startsWith("image/")) {
                                        alert("Por favor, selecciona un archivo de imagen válido.");
                                        return;
                                      }
                                      const url = URL.createObjectURL(file);
                                      setTempCapasOverridesActivos((prev) => ({
                                        ...prev,
                                        [selectedCapa.id]: {
                                          ...(prev[selectedCapa.id] || {}),
                                          src: url,
                                        },
                                      }));
                                    }
                                  }}
                                />
                                <label
                                  htmlFor={`file-override-${selectedCapa.id}`}
                                  className="dropzone-label"
                                  onDragOver={(e) => e.preventDefault()}
                                  onDrop={(e) => {
                                    e.preventDefault();
                                    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                                      const file = e.dataTransfer.files[0];
                                      if (!file.type.startsWith("image/")) {
                                        alert("Por favor, selecciona un archivo de imagen válido.");
                                        return;
                                      }
                                      const url = URL.createObjectURL(file);
                                      setTempCapasOverridesActivos((prev) => ({
                                        ...prev,
                                        [selectedCapa.id]: {
                                          ...(prev[selectedCapa.id] || {}),
                                          src: url,
                                        },
                                      }));
                                    }
                                  }}
                                  style={{
                                    display: "flex",
                                    flexDirection: "column",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    padding: "20px",
                                    border: "2px dashed #cbd5e1",
                                    borderRadius: "6px",
                                    cursor: "pointer",
                                    backgroundColor: "#f8fafc",
                                    textAlign: "center",
                                  }}
                                >
                                  <span style={{ fontSize: "24px" }}>📤</span>
                                  <span style={{ fontSize: "12px", marginTop: "8px", fontWeight: 500 }}>
                                    Subir imagen para esta carta
                                  </span>
                                </label>

                                <button
                                  type="button"
                                  className="btn-secundario-galeria"
                                  onClick={() => {
                                    setActiveSelectorTarget({ type: "override", capaId: selectedCapa.id });
                                    setShowGallerySelector(true);
                                  }}
                                >
                                  📂 Cargar desde Galería
                                </button>

                                {selectedCapa.src ? (
                                  <p style={{ fontSize: "11px", color: "#64748b", marginTop: "6px", textAlign: "center" }}>
                                    Heredando imagen por defecto de la plantilla
                                  </p>
                                ) : (
                                  <p style={{ fontSize: "11px", color: "#94a3b8", marginTop: "6px", textAlign: "center" }}>
                                    Sin imagen cargada
                                  </p>
                                )}
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Sección 2: Definición de la Plantilla (Diseño) */}
                        <div className="inspector-group-section" style={{ borderTop: "1px solid var(--border-color)", paddingTop: "16px" }}>
                          <h4 className="inspector-group-title">Definición de Plantilla</h4>

                          <div className="inspector-section">
                            <label className="inspector-label">Nombre de Variable / Capa</label>
                            <input
                              type="text"
                              className="inspector-input"
                              value={selectedCapa.nombre || ""}
                              placeholder="ej. Ilustración"
                              onChange={(e) => handleUpdateCapaProp(selectedCapa.id, "nombre", e.target.value)}
                            />
                          </div>

                          <div className="inspector-section" style={{ marginTop: "12px" }}>
                            <label className="inspector-label">Imagen por Defecto (Plantilla)</label>
                            {selectedCapa.src ? (
                              <div className="image-template-preview-container">
                                <img
                                  src={selectedCapa.src}
                                  alt="Imagen plantilla"
                                  style={{
                                    width: "100%",
                                    maxHeight: "150px",
                                    objectFit: "contain",
                                    borderRadius: "6px",
                                    backgroundColor: "#f1f5f9",
                                    border: "1px solid #cbd5e1",
                                    marginBottom: "8px",
                                  }}
                                />
                                <button
                                  type="button"
                                  className="btn-danger-sec"
                                  style={{ width: "100%" }}
                                  onClick={() => handleUpdateCapaProp(selectedCapa.id, "src", "")}
                                >
                                  Quitar Imagen
                                </button>
                              </div>
                            ) : (
                              <div className="image-upload-dropzone">
                                <input
                                  type="file"
                                  accept="image/*"
                                  id={`file-template-${selectedCapa.id}`}
                                  style={{ display: "none" }}
                                  onChange={(e) => {
                                    if (e.target.files && e.target.files[0]) {
                                      const file = e.target.files[0];
                                      if (!file.type.startsWith("image/")) {
                                        alert("Por favor, selecciona un archivo de imagen válido.");
                                        return;
                                      }
                                      const url = URL.createObjectURL(file);
                                      handleUpdateCapaProp(selectedCapa.id, "src", url);
                                    }
                                  }}
                                />
                                <label
                                  htmlFor={`file-template-${selectedCapa.id}`}
                                  className="dropzone-label"
                                  onDragOver={(e) => e.preventDefault()}
                                  onDrop={(e) => {
                                    e.preventDefault();
                                    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                                      const file = e.dataTransfer.files[0];
                                      if (!file.type.startsWith("image/")) {
                                        alert("Por favor, selecciona un archivo de imagen válido.");
                                        return;
                                      }
                                      const url = URL.createObjectURL(file);
                                      handleUpdateCapaProp(selectedCapa.id, "src", url);
                                    }
                                  }}
                                  style={{
                                    display: "flex",
                                    flexDirection: "column",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    padding: "20px",
                                    border: "2px dashed #cbd5e1",
                                    borderRadius: "6px",
                                    cursor: "pointer",
                                    backgroundColor: "#f8fafc",
                                    textAlign: "center",
                                  }}
                                >
                                  <span style={{ fontSize: "24px" }}>📤</span>
                                  <span style={{ fontSize: "12px", marginTop: "8px", fontWeight: 500 }}>
                                    Subir imagen por defecto
                                  </span>
                                </label>

                                <button
                                  type="button"
                                  className="btn-secundario-galeria"
                                  onClick={() => {
                                    setActiveSelectorTarget({ type: "default", capaId: selectedCapa.id });
                                    setShowGallerySelector(true);
                                  }}
                                >
                                  📂 Cargar desde Galería
                                </button>
                              </div>
                            )}
                          </div>

                          <div className="inspector-section" style={{ marginTop: "12px" }}>
                            <label className="inspector-label">Modo de Ajuste</label>
                            <select
                              className="inspector-input"
                              value={selectedCapa.modoAjuste || "cover"}
                              onChange={(e) => handleUpdateCapaProp(selectedCapa.id, "modoAjuste", e.target.value)}
                            >
                              <option value="cover">Cover (Rellenar)</option>
                              <option value="contain">Contain (Contener)</option>
                              <option value="stretch">Stretch (Estirar)</option>
                            </select>
                          </div>
                        </div>
                      </>
                    )}

                    {/* Capas de Imagen Switch */}
                    {selectedCapa.tipo === "image-switch" && (
                      <>
                        {/* Sección 1: Selección de Imagen Switch (Carta) */}
                        <div className="inspector-group-section">
                          <h4 className="inspector-group-title">Selección de Imagen (Carta)</h4>
                          <div className="inspector-section">
                            {!selectedCapa.options || selectedCapa.options.length === 0 ? (
                              <div className="switch-no-options-notice" style={{
                                padding: "20px 16px",
                                backgroundColor: "var(--bg-app)",
                                border: "1px dashed var(--border-color)",
                                borderRadius: "8px",
                                textAlign: "center",
                                fontSize: "12.5px",
                                color: "var(--text-secondary)",
                                lineHeight: "1.4",
                                marginTop: "8px"
                              }}>
                                <span style={{ fontSize: "22px", display: "block", marginBottom: "8px" }}>ℹ️</span>
                                Configura los recursos del switch en la definición de la plantilla a continuación.
                              </div>
                            ) : (
                              <>
                                <div className="image-override-preview-container">
                                  <img
                                    src={tempCapasOverridesActivos[selectedCapa.id]?.src || selectedCapa.src || ""}
                                    alt="Vista previa activa"
                                    className="inspector-image-preview"
                                    style={{
                                      width: "100%",
                                      maxHeight: "120px",
                                      objectFit: "contain",
                                      borderRadius: "6px",
                                      backgroundColor: "#f1f5f9",
                                      border: "1px solid #cbd5e1",
                                      marginBottom: "8px",
                                    }}
                                  />
                                  {tempCapasOverridesActivos[selectedCapa.id]?.src && (
                                    <button
                                      type="button"
                                      className="btn-danger-sec"
                                      style={{ width: "100%", marginBottom: "12px" }}
                                      onClick={() => {
                                        setTempCapasOverridesActivos((prev) => {
                                          const next = { ...prev };
                                          if (next[selectedCapa.id]) {
                                            delete next[selectedCapa.id];
                                          }
                                          return next;
                                        });
                                      }}
                                    >
                                      Restablecer a defecto
                                    </button>
                                  )}
                                </div>

                                <label className="inspector-label" style={{ marginTop: "8px" }}>Seleccionar Opción:</label>
                                <div className="switch-options-carousel">
                                  {(selectedCapa.options || []).map((opt: any) => {
                                    const isSelected = tempCapasOverridesActivos[selectedCapa.id]
                                      ? tempCapasOverridesActivos[selectedCapa.id].selectedOptionId === opt.id
                                      : selectedCapa.selectedOptionId === opt.id;
                                    return (
                                      <div
                                        key={opt.id}
                                        className={`switch-carousel-item ${isSelected ? "active" : ""}`}
                                        onClick={() => {
                                          setTempCapasOverridesActivos((prev) => ({
                                            ...prev,
                                            [selectedCapa.id]: {
                                              src: opt.src,
                                              selectedOptionId: opt.id
                                            }
                                          }));
                                        }}
                                      >
                                        <div className="switch-carousel-img-container">
                                          <img src={opt.src} alt={opt.nombre} className="switch-carousel-img" />
                                        </div>
                                        <span className="switch-carousel-text" title={opt.nombre}>{opt.nombre}</span>
                                      </div>
                                    );
                                  })}

                                  <div className="switch-carousel-item-upload">
                                    <input
                                      type="file"
                                      accept="image/*"
                                      id={`switch-file-pc-${selectedCapa.id}`}
                                      style={{ display: "none" }}
                                      onChange={(e) => {
                                        if (e.target.files && e.target.files[0]) {
                                          const file = e.target.files[0];
                                          if (!file.type.startsWith("image/")) {
                                            alert("Por favor, selecciona un archivo de imagen válido.");
                                            return;
                                          }
                                          const url = URL.createObjectURL(file);
                                          setTempCapasOverridesActivos((prev) => ({
                                            ...prev,
                                            [selectedCapa.id]: {
                                              src: url,
                                              selectedOptionId: undefined
                                            }
                                          }));
                                        }
                                      }}
                                    />
                                    <label htmlFor={`switch-file-pc-${selectedCapa.id}`} className="switch-carousel-upload-btn">
                                      <span className="switch-carousel-plus-icon">+</span>
                                      <span className="switch-carousel-text">Subir PC</span>
                                    </label>
                                  </div>
                                </div>
                              </>
                            )}
                          </div>
                        </div>

                        {/* Sección 2: Definición de la Plantilla (Diseño) */}
                        <div className="inspector-group-section" style={{ borderTop: "1px solid var(--border-color)", paddingTop: "16px" }}>
                          <h4 className="inspector-group-title">Definición de Plantilla</h4>

                          <div className="inspector-section">
                            <label className="inspector-label">Nombre de Variable / Capa</label>
                            <input
                              type="text"
                              className="inspector-input"
                              value={selectedCapa.nombre || ""}
                              placeholder="ej. Icono Switch"
                              onChange={(e) => handleUpdateCapaProp(selectedCapa.id, "nombre", e.target.value)}
                            />
                          </div>

                          <div className="inspector-section" style={{ marginTop: "12px" }}>
                            <label className="inspector-label">Recursos Asignados al Switch</label>
                            <div style={{ fontSize: "12px", color: "var(--text-secondary)", marginBottom: "8px" }}>
                              {selectedCapa.options?.length || 0} imágenes asignadas
                            </div>
                            <button
                              type="button"
                              className="btn-secundario-galeria"
                              style={{ width: "100%" }}
                              onClick={() => {
                                const targetCapa = plantillaActiva.capas.find((c: any) => c.id === selectedCapa.id);
                                setTempSwitchCapaId(selectedCapa.id);
                                setTempSelectedOptionIds(targetCapa?.options?.map((opt: any) => opt.id) || []);
                                setShowSwitchResourcesPopup(true);
                              }}
                            >
                              ⚙️ Seleccionar recursos para este elemento
                            </button>
                          </div>

                          <div className="inspector-section" style={{ marginTop: "12px" }}>
                            <label className="inspector-label">Modo de Ajuste</label>
                            <select
                              className="inspector-input"
                              value={selectedCapa.modoAjuste || "cover"}
                              onChange={(e) => handleUpdateCapaProp(selectedCapa.id, "modoAjuste", e.target.value)}
                            >
                              <option value="cover">Cover (Rellenar)</option>
                              <option value="contain">Contain (Contener)</option>
                              <option value="stretch">Stretch (Estirar)</option>
                            </select>
                          </div>
                        </div>
                      </>
                    )}

                    {/* Capas de Contenedor */}
                    {selectedCapa.tipo === "container" && (
                      <div className="inspector-group-section">
                        <h4 className="inspector-group-title">Definición de Plantilla (Contenedor)</h4>
                        
                        <div className="inspector-section">
                          <label className="inspector-label">Nombre del Contenedor</label>
                          <input
                            type="text"
                            className="inspector-input"
                            value={selectedCapa.nombre || ""}
                            placeholder="ej. Contenedor de Atributos"
                            onChange={(e) => handleUpdateCapaProp(selectedCapa.id, "nombre", e.target.value)}
                          />
                        </div>

                        <div className="inspector-section" style={{ marginTop: "12px" }}>
                          <label className="inspector-label">Tipo de Layout</label>
                          <select
                            className="inspector-input"
                            value={selectedCapa.layout || "none"}
                            onChange={(e) => handleUpdateCapaProp(selectedCapa.id, "layout", e.target.value)}
                          >
                            <option value="none">Libre (FrameLayout)</option>
                            <option value="vertical">Lineal Vertical</option>
                            <option value="horizontal">Lineal Horizontal</option>
                          </select>
                        </div>

                        <div className="inspector-section" style={{ marginTop: "12px" }}>
                          <label className="inspector-label">Contenedor Padre</label>
                          <select
                            className="inspector-input"
                            value={selectedCapa.parentCapaId || ""}
                            onChange={(e) => handleUpdateCapaProp(selectedCapa.id, "parentCapaId", e.target.value === "" ? null : e.target.value)}
                          >
                            <option value="">(Raíz)</option>
                            {(plantillaActiva.capas || [])
                              .filter((c: any) => c.tipo === "container" && c.id !== selectedCapa.id && !isDescendant(c.id, selectedCapa.id))
                              .map((c: any) => (
                                <option key={c.id} value={c.id}>
                                  {c.nombre || `Contenedor ${c.id}`}
                                </option>
                              ))}
                          </select>
                        </div>
                      </div>
                    )}

                    {/* Capas de Bloque */}
                    {selectedCapa.tipo === "block" && (
                      <div className="inspector-group-section">
                        <h4 className="inspector-group-title">Definición de Plantilla (Bloque)</h4>
                        
                        <div className="inspector-section">
                          <label className="inspector-label">Nombre del Bloque</label>
                          <input
                            type="text"
                            className="inspector-input"
                            value={selectedCapa.nombre || ""}
                            placeholder="ej. Bloque de Fondo"
                            onChange={(e) => handleUpdateCapaProp(selectedCapa.id, "nombre", e.target.value)}
                          />
                        </div>
                      </div>
                    )}

                    {/* Alineación y Posición (Común para text, image, image-switch, container, block) */}
                    {(selectedCapa.tipo === "text" || selectedCapa.tipo === "image" || selectedCapa.tipo === "image-switch" || selectedCapa.tipo === "container" || selectedCapa.tipo === "block") && (
                      <div className="inspector-group-section" style={{ borderTop: "1px solid var(--border-color)", paddingTop: "16px" }}>
                        <h4 className="inspector-group-title">Posición y Dimensiones</h4>
                        
                        <div className="inspector-section" style={{ marginBottom: "12px" }}>
                          <label className="inspector-label">Alineación Rápida</label>
                          <div className="inspector-alignment-utilities">
                            <button
                              type="button"
                              className="alignment-utility-btn"
                              title="Alinear al borde izquierdo (X = 0)"
                              onClick={() => handleApplyAlignment("izq")}
                              disabled={selectedCapa.tipo === "background"}
                            >
                              ⬅️
                            </button>
                            <button
                              type="button"
                              className="alignment-utility-btn"
                              title="Ajustar al ancho total de la carta (X = 0, Ancho = 100%)"
                              onClick={() => handleApplyAlignment("anchoMax")}
                              disabled={selectedCapa.tipo === "background"}
                            >
                              ↔️
                            </button>
                            <button
                              type="button"
                              className="alignment-utility-btn"
                              title="Alinear al borde derecho"
                              onClick={() => handleApplyAlignment("der")}
                              disabled={selectedCapa.tipo === "background"}
                            >
                              ➡️
                            </button>
                            <button
                              type="button"
                              className="alignment-utility-btn"
                              title="Alinear al borde superior (Y = 0)"
                              onClick={() => handleApplyAlignment("arr")}
                              disabled={selectedCapa.tipo === "background"}
                            >
                              ⬆️
                            </button>
                            <button
                              type="button"
                              className="alignment-utility-btn"
                              title="Ajustar al alto total de la carta (Y = 0, Alto = 100%)"
                              onClick={() => handleApplyAlignment("altoMax")}
                              disabled={selectedCapa.tipo === "background"}
                            >
                              ↕️
                            </button>
                            <button
                              type="button"
                              className="alignment-utility-btn"
                              title="Alinear al borde inferior"
                              onClick={() => handleApplyAlignment("abj")}
                              disabled={selectedCapa.tipo === "background"}
                            >
                              ⬇️
                            </button>
                            <button
                              type="button"
                              className="alignment-utility-btn"
                              title="Expandir a pantalla completa (X = 0, Y = 0, 100% de la carta)"
                              onClick={() => handleApplyAlignment("expandir")}
                              disabled={selectedCapa.tipo === "background"}
                            >
                              ⏹️
                            </button>
                          </div>
                        </div>

                        <div className="layout-form-grid-compact">
                          <div className="inspector-section-compact" title="Posición X (mm)">
                            <label className="inspector-label-compact">X</label>
                            <input
                              type="number"
                              step="0.5"
                              className="inspector-input"
                              value={selectedCapa.xMm}
                              onChange={(e) => handleUpdateCapaProp(selectedCapa.id, "xMm", Number(Number(e.target.value).toFixed(1)))}
                              disabled={selectedCapa.tipo === "background"}
                            />
                          </div>
                          <div className="inspector-section-compact" title="Posición Y (mm)">
                            <label className="inspector-label-compact">Y</label>
                            <input
                              type="number"
                              step="0.5"
                              className="inspector-input"
                              value={selectedCapa.yMm}
                              onChange={(e) => handleUpdateCapaProp(selectedCapa.id, "yMm", Number(Number(e.target.value).toFixed(1)))}
                              disabled={selectedCapa.tipo === "background"}
                            />
                          </div>
                          <div className="inspector-section-compact" title="Ancho (mm)">
                            <label className="inspector-label-compact">W</label>
                            <input
                              type="number"
                              step="0.5"
                              className="inspector-input"
                              value={selectedCapa.anchoMm}
                              onChange={(e) => handleUpdateCapaProp(selectedCapa.id, "anchoMm", Number(Number(e.target.value).toFixed(1)))}
                              disabled={selectedCapa.tipo === "background"}
                            />
                          </div>
                          <div className="inspector-section-compact" title="Alto (mm)">
                            <label className="inspector-label-compact">H</label>
                            <input
                              type="number"
                              step="0.5"
                              className="inspector-input"
                              value={selectedCapa.altoMm}
                              onChange={(e) => handleUpdateCapaProp(selectedCapa.id, "altoMm", Number(Number(e.target.value).toFixed(1)))}
                              disabled={selectedCapa.tipo === "background"}
                            />
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Padding del Texto (Solo text) */}
                    {selectedCapa.tipo === "text" && (
                      <div className="inspector-group-section" style={{ borderTop: "1px solid var(--border-color)", paddingTop: "16px" }}>
                        <div className="section-header-row" onClick={() => setExpandPadding(!expandPadding)}>
                          <h4 className="inspector-group-title" style={{ cursor: "pointer", margin: 0 }}>Padding del Texto</h4>
                          <span className={`expand-toggle-icon ${expandPadding ? "expanded" : ""}`}>▶</span>
                        </div>

                        {!expandPadding ? (
                          <div className="inspector-section" style={{ marginTop: "8px" }}>
                            <label className="inspector-label">Padding General (mm)</label>
                            <input
                              type="number"
                              step="0.5"
                              min="0"
                              className="inspector-input"
                              value={selectedCapa.paddingTopMm !== undefined ? selectedCapa.paddingTopMm : 0}
                              onChange={(e) => handleUpdatePaddingGeneral(selectedCapa.id, Number(e.target.value))}
                            />
                          </div>
                        ) : (
                          <div className="expanded-inputs-grid" style={{ marginTop: "8px" }}>
                            <div className="expanded-input-item">
                              <label>Sup. (mm)</label>
                              <input
                                type="number"
                                step="0.5"
                                min="0"
                                className="inspector-input"
                                value={selectedCapa.paddingTopMm !== undefined ? selectedCapa.paddingTopMm : 0}
                                onChange={(e) => handleUpdateCapaProp(selectedCapa.id, "paddingTopMm", Number(e.target.value))}
                              />
                            </div>
                            <div className="expanded-input-item">
                              <label>Der. (mm)</label>
                              <input
                                type="number"
                                step="0.5"
                                min="0"
                                className="inspector-input"
                                value={selectedCapa.paddingRightMm !== undefined ? selectedCapa.paddingRightMm : 0}
                                onChange={(e) => handleUpdateCapaProp(selectedCapa.id, "paddingRightMm", Number(e.target.value))}
                              />
                            </div>
                            <div className="expanded-input-item">
                              <label>Inf. (mm)</label>
                              <input
                                type="number"
                                step="0.5"
                                min="0"
                                className="inspector-input"
                                value={selectedCapa.paddingBottomMm !== undefined ? selectedCapa.paddingBottomMm : 0}
                                onChange={(e) => handleUpdateCapaProp(selectedCapa.id, "paddingBottomMm", Number(e.target.value))}
                              />
                            </div>
                            <div className="expanded-input-item">
                              <label>Izq. (mm)</label>
                              <input
                                type="number"
                                step="0.5"
                                min="0"
                                className="inspector-input"
                                value={selectedCapa.paddingLeftMm !== undefined ? selectedCapa.paddingLeftMm : 0}
                                onChange={(e) => handleUpdateCapaProp(selectedCapa.id, "paddingLeftMm", Number(e.target.value))}
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Bordes, Esquinas y Fondo (text, image, image-switch, container, block) */}
                    {(selectedCapa.tipo === "text" || selectedCapa.tipo === "image" || selectedCapa.tipo === "image-switch" || selectedCapa.tipo === "container" || selectedCapa.tipo === "block") && (
                      <div className="inspector-group-section" style={{ borderTop: "1px solid var(--border-color)", paddingTop: "16px" }}>
                        
                        {/* Sección de Bordes */}
                        <div className="section-header-row" onClick={() => setExpandBorders(!expandBorders)}>
                          <h4 className="inspector-group-title" style={{ cursor: "pointer", margin: 0 }}>Bordes de la Capa</h4>
                          <span className={`expand-toggle-icon ${expandBorders ? "expanded" : ""}`}>▶</span>
                        </div>
                        
                        {!expandBorders ? (
                          <div className="layout-form-grid" style={{ marginTop: "8px" }}>
                            <div className="inspector-section">
                              <label className="inspector-label">Grosor General (mm)</label>
                              <input
                                type="number"
                                step="0.1"
                                min="0"
                                className="inspector-input"
                                value={selectedCapa.borderTopWidth !== undefined ? selectedCapa.borderTopWidth : 0}
                                onChange={(e) => handleUpdateBorderWidthGeneral(selectedCapa.id, Number(e.target.value))}
                              />
                            </div>
                            <div className="inspector-section">
                              <label className="inspector-label">Color General</label>
                              <input
                                type="color"
                                className="color-picker-input"
                                style={{ width: "100%", height: "38px" }}
                                value={selectedCapa.borderTopColor || "#000000"}
                                onChange={(e) => handleUpdateBorderColorGeneral(selectedCapa.id, e.target.value)}
                              />
                            </div>
                          </div>
                        ) : (
                          <div className="expanded-inputs-grid" style={{ marginTop: "8px" }}>
                            {/* Arriba */}
                            <div className="expanded-input-item">
                              <label>Grosor Sup. (mm)</label>
                              <input
                                type="number"
                                step="0.1"
                                min="0"
                                className="inspector-input"
                                value={selectedCapa.borderTopWidth !== undefined ? selectedCapa.borderTopWidth : 0}
                                onChange={(e) => handleUpdateCapaProp(selectedCapa.id, "borderTopWidth", Number(e.target.value))}
                              />
                            </div>
                            <div className="expanded-input-item">
                              <label>Color Superior</label>
                              <input
                                type="color"
                                className="color-picker-input"
                                style={{ width: "100%", height: "38px" }}
                                value={selectedCapa.borderTopColor || "#000000"}
                                onChange={(e) => handleUpdateCapaProp(selectedCapa.id, "borderTopColor", e.target.value)}
                              />
                            </div>
                            {/* Derecha */}
                            <div className="expanded-input-item">
                              <label>Grosor Der. (mm)</label>
                              <input
                                type="number"
                                step="0.1"
                                min="0"
                                className="inspector-input"
                                value={selectedCapa.borderRightWidth !== undefined ? selectedCapa.borderRightWidth : 0}
                                onChange={(e) => handleUpdateCapaProp(selectedCapa.id, "borderRightWidth", Number(e.target.value))}
                              />
                            </div>
                            <div className="expanded-input-item">
                              <label>Color Derecho</label>
                              <input
                                type="color"
                                className="color-picker-input"
                                style={{ width: "100%", height: "38px" }}
                                value={selectedCapa.borderRightColor || "#000000"}
                                onChange={(e) => handleUpdateCapaProp(selectedCapa.id, "borderRightColor", e.target.value)}
                              />
                            </div>
                            {/* Abajo */}
                            <div className="expanded-input-item">
                              <label>Grosor Inf. (mm)</label>
                              <input
                                type="number"
                                step="0.1"
                                min="0"
                                className="inspector-input"
                                value={selectedCapa.borderBottomWidth !== undefined ? selectedCapa.borderBottomWidth : 0}
                                onChange={(e) => handleUpdateCapaProp(selectedCapa.id, "borderBottomWidth", Number(e.target.value))}
                              />
                            </div>
                            <div className="expanded-input-item">
                              <label>Color Inferior</label>
                              <input
                                type="color"
                                className="color-picker-input"
                                style={{ width: "100%", height: "38px" }}
                                value={selectedCapa.borderBottomColor || "#000000"}
                                onChange={(e) => handleUpdateCapaProp(selectedCapa.id, "borderBottomColor", e.target.value)}
                              />
                            </div>
                            {/* Izquierda */}
                            <div className="expanded-input-item">
                              <label>Grosor Izq. (mm)</label>
                              <input
                                type="number"
                                step="0.1"
                                min="0"
                                className="inspector-input"
                                value={selectedCapa.borderLeftWidth !== undefined ? selectedCapa.borderLeftWidth : 0}
                                onChange={(e) => handleUpdateCapaProp(selectedCapa.id, "borderLeftWidth", Number(e.target.value))}
                              />
                            </div>
                            <div className="expanded-input-item">
                              <label>Color Izquierdo</label>
                              <input
                                type="color"
                                className="color-picker-input"
                                style={{ width: "100%", height: "38px" }}
                                value={selectedCapa.borderLeftColor || "#000000"}
                                onChange={(e) => handleUpdateCapaProp(selectedCapa.id, "borderLeftColor", e.target.value)}
                              />
                            </div>
                          </div>
                        )}

                        {/* Sección de Radios de Esquinas */}
                        <div className="section-header-row" onClick={() => setExpandRadii(!expandRadii)} style={{ marginTop: "12px", borderTop: "1px solid var(--border-color)", paddingTop: "12px" }}>
                          <h4 className="inspector-group-title" style={{ cursor: "pointer", margin: 0 }}>Redondear Esquinas</h4>
                          <span className={`expand-toggle-icon ${expandRadii ? "expanded" : ""}`}>▶</span>
                        </div>

                        {!expandRadii ? (
                          <div className="inspector-section" style={{ marginTop: "8px" }}>
                            <label className="inspector-label">Radio General (mm)</label>
                            <input
                              type="number"
                              step="0.5"
                              min="0"
                              className="inspector-input"
                              value={selectedCapa.borderTopLeftRadius !== undefined ? selectedCapa.borderTopLeftRadius : 0}
                              onChange={(e) => handleUpdateBorderRadiusGeneral(selectedCapa.id, Number(e.target.value))}
                            />
                          </div>
                        ) : (
                          <div className="expanded-inputs-grid" style={{ marginTop: "8px" }}>
                            <div className="expanded-input-item">
                              <label>Sup. Izquierda (mm)</label>
                              <input
                                type="number"
                                step="0.5"
                                min="0"
                                className="inspector-input"
                                value={selectedCapa.borderTopLeftRadius !== undefined ? selectedCapa.borderTopLeftRadius : 0}
                                onChange={(e) => handleUpdateCapaProp(selectedCapa.id, "borderTopLeftRadius", Number(e.target.value))}
                              />
                            </div>
                            <div className="expanded-input-item">
                              <label>Sup. Derecha (mm)</label>
                              <input
                                type="number"
                                step="0.5"
                                min="0"
                                className="inspector-input"
                                value={selectedCapa.borderTopRightRadius !== undefined ? selectedCapa.borderTopRightRadius : 0}
                                onChange={(e) => handleUpdateCapaProp(selectedCapa.id, "borderTopRightRadius", Number(e.target.value))}
                              />
                            </div>
                            <div className="expanded-input-item">
                              <label>Inf. Derecha (mm)</label>
                              <input
                                type="number"
                                step="0.5"
                                min="0"
                                className="inspector-input"
                                value={selectedCapa.borderBottomRightRadius !== undefined ? selectedCapa.borderBottomRightRadius : 0}
                                onChange={(e) => handleUpdateCapaProp(selectedCapa.id, "borderBottomRightRadius", Number(e.target.value))}
                              />
                            </div>
                            <div className="expanded-input-item">
                              <label>Inf. Izquierda (mm)</label>
                              <input
                                type="number"
                                step="0.5"
                                min="0"
                                className="inspector-input"
                                value={selectedCapa.borderBottomLeftRadius !== undefined ? selectedCapa.borderBottomLeftRadius : 0}
                                onChange={(e) => handleUpdateCapaProp(selectedCapa.id, "borderBottomLeftRadius", Number(e.target.value))}
                              />
                            </div>
                          </div>
                        )}

                        {/* Color de Fondo */}
                        <div className="inspector-section" style={{ borderTop: "1px solid var(--border-color)", paddingTop: "12px", marginTop: "12px" }}>
                          <label className="inspector-label" style={{ margin: 0 }}>Color de Fondo de la Capa</label>
                          <div style={{ display: "flex", gap: "8px", alignItems: "center", marginTop: "8px" }}>
                            <input
                              type="checkbox"
                              id="has-bg-color-checkbox"
                              checked={!!selectedCapa.backgroundColor}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  handleUpdateCapaProp(selectedCapa.id, "backgroundColor", "#ffffff");
                                } else {
                                  handleUpdateCapaProp(selectedCapa.id, "backgroundColor", "");
                                }
                              }}
                            />
                            <label htmlFor="has-bg-color-checkbox" style={{ fontSize: "13px", cursor: "pointer", userSelect: "none" }}>Activar Fondo</label>
                            {!!selectedCapa.backgroundColor && (
                              <input
                                type="color"
                                className="color-picker-input"
                                style={{ width: "60px", height: "38px", marginLeft: "auto" }}
                                value={selectedCapa.backgroundColor}
                                onChange={(e) => handleUpdateCapaProp(selectedCapa.id, "backgroundColor", e.target.value)}
                              />
                            )}
                          </div>
                        </div>

                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="inspector-guide">
                  {(!plantillaActiva || !plantillaActiva.capas || plantillaActiva.capas.length === 0)
                    ? (activeTab === "frontal"
                      ? "Nada que editar"
                      : "El reverso no posee propiedades editables para esta carta.")
                    : "Selecciona una capa de la lista o haz clic directamente sobre la carta para editar sus valores."}
                </div>
              )}
            </div>

            {/* Botón Galería de la Plantilla */}
            {plantillaActiva && (
              <div className="inspector-footer-gallery" style={{ display: "flex", gap: "8px" }}>
                <button
                  type="button"
                  className="btn-gallery-manager-trigger"
                  onClick={() => setShowGalleryManager(true)}
                  style={{ flex: 1 }}
                >
                  🖼️ Galería
                </button>
                <button
                  type="button"
                  className="btn-gallery-manager-trigger"
                  onClick={() => setShowTemplateFonts(true)}
                  style={{ flex: 1 }}
                >
                  🔤 Fuentes
                </button>
              </div>
            )}
          </aside>

        </div>
      </div>

      {/* Popup / Overlay para añadir elementos */}
      {showAddElementPopup && (
        <div className="add-element-popup-backdrop" onClick={() => setShowAddElementPopup(false)}>
          <div className="add-element-popup-container" onClick={(e) => e.stopPropagation()}>
            <h4 className="add-element-popup-title">Añadir Elemento</h4>
            
            <div className="add-element-options">
              <div
                className={`add-element-option ${selectedNewType === "text" ? "selected" : ""}`}
                onClick={() => setSelectedNewType("text")}
              >
                <span className="add-element-option-icon">📝</span>
                <span className="add-element-option-label">Texto</span>
              </div>
              <div
                className={`add-element-option ${selectedNewType === "image" ? "selected" : ""}`}
                onClick={() => setSelectedNewType("image")}
              >
                <span className="add-element-option-icon">🖼️</span>
                <span className="add-element-option-label">Imagen</span>
              </div>
              <div
                className={`add-element-option ${selectedNewType === "image-switch" ? "selected" : ""}`}
                onClick={() => setSelectedNewType("image-switch")}
              >
                <span className="add-element-option-icon">🔄</span>
                <span className="add-element-option-label">Imagen Switch</span>
              </div>
              <div
                className={`add-element-option ${selectedNewType === "container" ? "selected" : ""}`}
                onClick={() => setSelectedNewType("container")}
              >
                <span className="add-element-option-icon">📦</span>
                <span className="add-element-option-label">Contenedor</span>
              </div>
              <div
                className={`add-element-option ${selectedNewType === "block" ? "selected" : ""}`}
                onClick={() => setSelectedNewType("block")}
              >
                <span className="add-element-option-icon">⬜</span>
                <span className="add-element-option-label">Bloque Vacío</span>
              </div>
            </div>

            <div className="add-element-popup-actions">
              <button
                type="button"
                className="btn-secondary"
                style={{ padding: "6px 12px", fontSize: "12px" }}
                onClick={() => setShowAddElementPopup(false)}
              >
                Cancelar
              </button>
              <button
                type="button"
                className="btn-primary"
                style={{ padding: "6px 12px", fontSize: "12px" }}
                onClick={handleAddElement}
              >
                Añadir
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Gestor de la Galería de la Plantilla */}
      {showGalleryManager && plantillaActiva && (
        <div className="gallery-popup-backdrop" onClick={() => setShowGalleryManager(false)}>
          <div className="gallery-popup-container" onClick={(e) => e.stopPropagation()}>
            <div className="gallery-popup-title-bar">
              <h4 className="gallery-popup-title">Galería de la Plantilla</h4>
              <button
                type="button"
                className="btn-close-modal"
                style={{
                  background: "transparent",
                  border: "none",
                  color: "var(--text-secondary)",
                  cursor: "pointer",
                  fontSize: "16px"
                }}
                onClick={() => setShowGalleryManager(false)}
              >
                ✕
              </button>
            </div>
            <p className="gallery-popup-subtitle">
              Recursos locales de la plantilla: "{plantillaActiva.nombre || "Sin Nombre"}"
            </p>

            <div
              className="gallery-manager-dropzone"
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                if (e.dataTransfer.files) {
                  handleUploadGalleryFiles(e.dataTransfer.files);
                }
              }}
            >
              <input
                type="file"
                multiple
                accept="image/*"
                id="gallery-file-upload"
                style={{ display: "none" }}
                onChange={(e) => {
                  if (e.target.files) {
                    handleUploadGalleryFiles(e.target.files);
                  }
                }}
              />
              <label htmlFor="gallery-file-upload" className="gallery-dropzone-label">
                <span style={{ fontSize: "20px", marginBottom: "4px" }}>📤</span>
                <span>Arrastra imágenes aquí o haz clic para subir</span>
                <span className="gallery-dropzone-subtext">Formatos permitidos: PNG, JPG, JPEG, WEBP, SVG</span>
              </label>
            </div>

            <div className="gallery-assets-grid">
              {plantillaActiva.assets && plantillaActiva.assets.length > 0 ? (
                plantillaActiva.assets.map((asset: any) => (
                  <div key={asset.id} className="gallery-asset-item" title={asset.nombre}>
                    <button
                      type="button"
                      className="gallery-asset-delete-btn"
                      onClick={() => handleDeleteGalleryAsset(asset.id)}
                      title="Eliminar recurso de la galería"
                    >
                      ✕
                    </button>
                    <div className="gallery-asset-thumb-container">
                      <img src={asset.src} alt={asset.nombre} className="gallery-asset-thumb" />
                    </div>
                    <div className="gallery-asset-name">{asset.nombre}</div>
                  </div>
                ))
              ) : (
                <div style={{
                  gridColumn: "1 / -1",
                  padding: "40px 20px",
                  textAlign: "center",
                  color: "var(--text-secondary)",
                  fontSize: "12px"
                }}>
                  No hay imágenes en la galería de esta plantilla. Arrastra archivos arriba para empezar.
                </div>
              )}
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "8px" }}>
              <button
                type="button"
                className="btn-primary"
                style={{ padding: "6px 16px", fontSize: "12px" }}
                onClick={() => setShowGalleryManager(false)}
              >
                Listo
              </button>
            </div>
          </div>
        </div>
      )}

      {showTemplateFonts && plantillaActiva && (
        <div className="gallery-popup-backdrop" onClick={() => setShowTemplateFonts(false)}>
          <div className="gallery-popup-container" onClick={(e) => e.stopPropagation()}>
            <div className="gallery-popup-title-bar">
              <h4 className="gallery-popup-title">Tipografías de la Plantilla</h4>
              <button
                type="button"
                className="btn-close-modal"
                style={{
                  background: "transparent",
                  border: "none",
                  color: "var(--text-secondary)",
                  cursor: "pointer",
                  fontSize: "16px"
                }}
                onClick={() => setShowTemplateFonts(false)}
              >
                ✕
              </button>
            </div>
            <p className="gallery-popup-subtitle">
              Tipografías personalizadas exclusivas de esta plantilla
            </p>

            <div
              className="gallery-manager-dropzone"
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                if (e.dataTransfer.files) {
                  handleUploadTemplateFonts(e.dataTransfer.files);
                }
              }}
            >
              <input
                type="file"
                multiple
                accept=".ttf,.otf,.woff,.woff2"
                id="template-fonts-file-upload"
                style={{ display: "none" }}
                onChange={(e) => {
                  if (e.target.files) {
                    handleUploadTemplateFonts(e.target.files);
                  }
                }}
              />
              <label htmlFor="template-fonts-file-upload" className="gallery-dropzone-label">
                <span style={{ fontSize: "20px", marginBottom: "4px" }}>📤</span>
                <span>Arrastra tipografías aquí o haz clic para subir</span>
                <span className="gallery-dropzone-subtext">Formatos permitidos: TTF, OTF, WOFF, WOFF2</span>
              </label>
            </div>

            <div className="gallery-assets-grid">
              {plantillaActiva.customFonts && plantillaActiva.customFonts.length > 0 ? (
                (plantillaActiva.customFonts as any[]).map((font) => (
                  <div key={font.id} className="gallery-asset-item" title={font.filename}>
                    <button
                      type="button"
                      className="gallery-asset-delete-btn"
                      onClick={() => handleDeleteTemplateFont(font.id)}
                      title="Eliminar tipografía de la plantilla"
                    >
                      ✕
                    </button>
                    <div className="gallery-asset-thumb-container" style={{ display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: "var(--bg-secondary)", height: "80px", fontSize: "28px", color: "var(--text-primary)" }}>
                      <span style={{ fontFamily: `'${font.nombre}'` }}>Aa</span>
                    </div>
                    <div className="gallery-asset-name" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "4px", padding: "4px 8px" }}>
                      <span className="truncate" style={{ flex: 1, textAlign: "left" }} title={font.nombre}>{font.nombre}</span>
                      <button
                        type="button"
                        style={{ background: "none", border: "none", cursor: "pointer", fontSize: "10px", padding: 0 }}
                        onClick={() => handleRenameTemplateFont(font.id)}
                        title="Renombrar Familia"
                      >
                        ✏️
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <div style={{
                  gridColumn: "1 / -1",
                  padding: "40px 20px",
                  textAlign: "center",
                  color: "var(--text-secondary)",
                  fontSize: "12px"
                }}>
                  No hay tipografías en la galería de esta plantilla. Arrastra archivos arriba para empezar.
                </div>
              )}
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "8px" }}>
              <button
                type="button"
                className="btn-primary"
                style={{ padding: "6px 16px", fontSize: "12px" }}
                onClick={() => setShowTemplateFonts(false)}
              >
                Listo
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Configuración de Campos Editables (SRS-036) */}
      {showExposedConfigModal && plantillaActiva && (() => {
        const getHierarchicalLayers = (capas: any[]) => {
          const result: { capa: any; level: number }[] = [];
          const visited = new Set<string>();
          const visit = (parentId: string | null, level: number) => {
            const children = capas.filter(c => c.parentCapaId === parentId);
            for (const child of children) {
              if (visited.has(child.id)) continue;
              visited.add(child.id);
              result.push({ capa: child, level });
              visit(child.id, level + 1);
            }
          };
          visit(null, 0);
          capas.forEach(c => {
            if (!visited.has(c.id)) {
              result.push({ capa: c, level: 0 });
            }
          });
          return result;
        };

        const isAncestorCollapsed = (capa: any, capas: any[]): boolean => {
          let parentId = capa.parentCapaId;
          while (parentId) {
            if (collapsedConfigContainerIds.includes(parentId)) return true;
            const parent = capas.find(c => c.id === parentId);
            parentId = parent ? parent.parentCapaId : null;
          }
          return false;
        };

        const ordenarPropiedadesExpuestas = (propiedades: ExposedProperty[], capasOrdenadas: any[]) => {
          return [...propiedades].sort((a, b) => {
            const idxA = capasOrdenadas.findIndex(c => c.id === a.layerId);
            const idxB = capasOrdenadas.findIndex(c => c.id === b.layerId);
            if (idxA !== idxB) return idxA - idxB;
            return a.property.localeCompare(b.property);
          });
        };

        const handleCloseExposedConfig = () => {
          const originalExposed = plantillaActiva.exposedProperties || [];
          const hasChanges = JSON.stringify(originalExposed) !== JSON.stringify(tempExposedProperties);
          if (hasChanges) {
            if (!window.confirm("¿Seguro que deseas salir sin guardar? Se perderán todos tus cambios.")) {
              return;
            }
          }
          setShowExposedConfigModal(false);
        };

        const hierarchicalLayers = getHierarchicalLayers(plantillaActiva.capas || []);
        const capasOrdenadasMap = hierarchicalLayers.map(hl => hl.capa);

        return (
          <div className="exposed-config-backdrop" style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100vw",
            height: "100vh",
            backgroundColor: "rgba(0, 0, 0, 0.75)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 3000,
          }}>
            <div className="exposed-config-container" style={{
              backgroundColor: "var(--bg-card)",
              border: "1px solid var(--border-color)",
              borderRadius: "12px",
              width: "1000px",
              maxWidth: "95vw",
              height: "750px",
              maxHeight: "85vh",
              display: "flex",
              flexDirection: "column",
              boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.3)",
              overflow: "hidden",
            }} onClick={(e) => e.stopPropagation()}>
              
              {/* Cabecera */}
              <header style={{
                padding: "16px 24px",
                borderBottom: "1px solid var(--border-color)",
                display: "flex",
                alignItems: "center",
              }}>
                <h3 style={{ margin: 0, fontSize: "16px", fontWeight: "600", color: "var(--text-primary)" }}>
                  Configurar Campos Editables (Modo Maquetador)
                </h3>
                <button
                  type="button"
                  style={{
                    background: "transparent",
                    border: "none",
                    color: "var(--text-secondary)",
                    cursor: "pointer",
                    fontSize: "16px",
                    marginLeft: "auto"
                  }}
                  onClick={handleCloseExposedConfig}
                >
                  ✕
                </button>
              </header>

              {/* Dos Columnas */}
              <div style={{ height: "560px", display: "grid", gridTemplateColumns: "1fr 1fr", overflow: "hidden" }}>
                
                <div style={{ padding: "16px", borderRight: "1px solid var(--border-color)", display: "flex", flexDirection: "column", overflow: "hidden", height: "100%", boxSizing: "border-box" }}>
                  <span style={{ fontSize: "12px", fontWeight: "600", color: "var(--text-secondary)", marginBottom: "8px", textTransform: "uppercase" }}>
                    Propiedades Disponibles
                  </span>
                  <div className="exposed-scrollable-list" style={{ height: "520px", overflowY: "auto", display: "flex", flexDirection: "column", gap: "8px" }}>
                    {(() => {
                    const getPropertiesForCapa = (capa: any) => {
                      const list = [
                        { property: "xMm", label: "Posición X" },
                        { property: "yMm", label: "Posición Y" },
                        { property: "anchoMm", label: "Ancho" },
                        { property: "altoMm", label: "Alto" },
                        { property: "borderTopWidth", label: "Grosor Borde" },
                        { property: "borderTopColor", label: "Color Borde" },
                        { property: "backgroundColor", label: "Color Fondo" },
                        { property: "borderTopLeftRadius", label: "Radio Esquinas" },
                      ];
                      if (capa.tipo === "text") {
                        list.push(
                          { property: "contenidoRaw", label: "Contenido Texto" },
                          { property: "fontFamily", label: "Tipografía" },
                          { property: "fontSizePt", label: "Tamaño Fuente" },
                          { property: "color", label: "Color Texto" },
                          { property: "alineacion", label: "Alineación Texto" },
                          { property: "paddingTopMm", label: "Padding Texto" }
                        );
                      } else if (capa.tipo === "image" || capa.tipo === "image-switch") {
                        list.push(
                          { property: "src", label: "Recurso Imagen" },
                          { property: "modoAjuste", label: "Ajuste Imagen" }
                        );
                      } else if (capa.tipo === "container") {
                        list.push(
                          { property: "layout", label: "Tipo Layout" }
                        );
                      } else if (capa.tipo === "background") {
                        list.push(
                          { property: "colorFill", label: "Color Relleno" }
                        );
                      }
                      return list;
                    };

                    return hierarchicalLayers.map((hl: any) => {
                      const capa = hl.capa;
                      if (isAncestorCollapsed(capa, plantillaActiva.capas || [])) {
                        return null;
                      }

                      const isExpanded = expandedConfigLayerIds.includes(capa.id);
                      const availableProps = getPropertiesForCapa(capa);
                      const capaEmoji = capa.tipo === "text" ? "📝" : (capa.tipo === "image" || capa.tipo === "image-switch") ? "🖼️" : capa.tipo === "container" ? "📦" : "⬜";

                      const isCollapsed = collapsedConfigContainerIds.includes(capa.id);

                      return (
                        <div key={capa.id} style={{
                          border: "1px solid var(--border-color)",
                          borderRadius: "6px",
                          overflow: "hidden",
                          marginBottom: "4px",
                          backgroundColor: "var(--bg-app)",
                          flexShrink: 0,
                          marginLeft: `${hl.level * 16}px`
                        }}>
                          {/* Cabecera Colapsable de Capa */}
                          <div
                            style={{
                              padding: "8px 12px",
                              backgroundColor: "var(--bg-card)",
                              cursor: "pointer",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "space-between",
                              userSelect: "none"
                            }}
                            onClick={() => {
                              setExpandedConfigLayerIds(prev => 
                                prev.includes(capa.id) 
                                  ? prev.filter(id => id !== capa.id) 
                                  : [...prev, capa.id]
                              );
                            }}
                          >
                            <span style={{ fontSize: "13px", fontWeight: "600", color: "var(--text-primary)", display: "flex", alignItems: "center" }}>
                              {capa.tipo === "container" && (
                                <span
                                  style={{ marginRight: "6px", cursor: "pointer", fontSize: "11px", color: "var(--text-secondary)" }}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setCollapsedConfigContainerIds(prev =>
                                      prev.includes(capa.id) ? prev.filter(id => id !== capa.id) : [...prev, capa.id]
                                    );
                                  }}
                                >
                                  {isCollapsed ? "►" : "▼"}
                                </span>
                              )}
                              {capaEmoji} {capa.nombre || `${capa.tipo} (${capa.id})`}
                            </span>
                            <span style={{ fontSize: "11px", color: "var(--text-secondary)" }}>
                              {isExpanded ? "propiedades ▲" : "propiedades ▶"}
                            </span>
                          </div>

                          {/* Cuerpo con Propiedades */}
                          {isExpanded && (
                            <div style={{ padding: "8px", display: "flex", flexDirection: "column", gap: "6px", borderTop: "1px solid var(--border-color)", backgroundColor: "var(--bg-app)" }}>
                              {availableProps.map((p) => {
                                const isAlreadyExposed = tempExposedProperties.some(
                                  item => item.layerId === capa.id && item.property === p.property
                                );
                                return (
                                  <div
                                    key={p.property}
                                    style={{
                                      padding: "6px 8px",
                                      backgroundColor: "var(--bg-card)",
                                      border: "1px solid var(--border-color)",
                                      borderRadius: "4px",
                                      display: "flex",
                                      alignItems: "center",
                                      justifyContent: "space-between",
                                      opacity: isAlreadyExposed ? 0.5 : 1,
                                    }}
                                  >
                                    <span style={{ fontSize: "12px", color: "var(--text-primary)" }}>
                                      {p.label} <span style={{ fontSize: "10px", color: "var(--text-secondary)", opacity: 0.8 }}>({p.property})</span>
                                    </span>
                                    {!isAlreadyExposed && (
                                      <button
                                        type="button"
                                        style={{
                                          padding: "2px 6px",
                                          fontSize: "10px",
                                          backgroundColor: "var(--accent-primary)",
                                          color: "#fff",
                                          border: "none",
                                          borderRadius: "3px",
                                          cursor: "pointer",
                                        }}
                                        onClick={() => {
                                          setTempExposedProperties(prev => {
                                            const next = [
                                              ...prev,
                                              {
                                                layerId: capa.id,
                                                property: p.property,
                                                label: `${capa.nombre || capa.tipo} - ${p.label}`,
                                              }
                                            ];
                                            return ordenarPropiedadesExpuestas(next, capasOrdenadasMap);
                                          });
                                        }}
                                      >
                                        + Añadir
                                      </button>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    });
                  })()}
                </div>
              </div>

              <div style={{ padding: "16px", display: "flex", flexDirection: "column", overflow: "hidden", height: "100%", boxSizing: "border-box" }}>
                <span style={{ fontSize: "12px", fontWeight: "600", color: "var(--text-secondary)", marginBottom: "8px", textTransform: "uppercase" }}>
                  Campos Expuestos / Orden de Edición
                </span>
                <div className="exposed-scrollable-list" style={{ height: "520px", overflowY: "auto", display: "flex", flexDirection: "column", gap: "8px" }}>
                  {tempExposedProperties.length === 0 ? (
                    <div style={{ textAlign: "center", padding: "32px", fontSize: "12.5px", color: "var(--text-secondary)", fontStyle: "italic" }}>
                      No hay campos seleccionados. Añade uno de la izquierda.
                    </div>
                  ) : (
                    tempExposedProperties.map((prop, idx) => {
                      const capa = (plantillaActiva.capas || []).find((c: any) => c.id === prop.layerId);
                      return (
                        <div
                          key={`${prop.layerId}-${prop.property}`}
                          style={{
                            padding: "8px 12px",
                            backgroundColor: "var(--bg-app)",
                            border: "1px solid var(--border-color)",
                            borderRadius: "6px",
                            display: "flex",
                            flexDirection: "column",
                            gap: "6px",
                          }}
                        >
                          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                            <span style={{ fontSize: "11px", color: "var(--text-secondary)" }}>
                              Capa: {capa?.tipo || "Desconocida"} ({prop.property})
                            </span>
                            <div style={{ display: "flex", gap: "4px" }}>
                              <button
                                type="button"
                                style={{ padding: "2px 6px", fontSize: "10px", cursor: "pointer", border: "1px solid var(--border-color)", borderRadius: "3px", backgroundColor: "var(--bg-card)", color: "var(--text-primary)" }}
                                disabled={idx === 0}
                                onClick={() => {
                                  setTempExposedProperties(prev => {
                                    const next = [...prev];
                                    const temp = next[idx];
                                    next[idx] = next[idx - 1];
                                    next[idx - 1] = temp;
                                    return next;
                                  });
                                }}
                              >
                                ▲
                              </button>
                              <button
                                type="button"
                                style={{ padding: "2px 6px", fontSize: "10px", cursor: "pointer", border: "1px solid var(--border-color)", borderRadius: "3px", backgroundColor: "var(--bg-card)", color: "var(--text-primary)" }}
                                disabled={idx === tempExposedProperties.length - 1}
                                onClick={() => {
                                  setTempExposedProperties(prev => {
                                    const next = [...prev];
                                    const temp = next[idx];
                                    next[idx] = next[idx + 1];
                                    next[idx + 1] = temp;
                                    return next;
                                  });
                                }}
                              >
                                ▼
                              </button>
                              <button
                                type="button"
                                style={{ padding: "2px 6px", fontSize: "10px", cursor: "pointer", border: "1px solid var(--border-color)", borderRadius: "3px", backgroundColor: "rgba(239,68,68,0.1)", color: "var(--text-danger)" }}
                                onClick={() => {
                                  setTempExposedProperties(prev => prev.filter((_, i) => i !== idx));
                                }}
                              >
                                ✕
                              </button>
                            </div>
                          </div>
                          
                          <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
                            <span style={{ fontSize: "12px", color: "var(--text-primary)" }}>Etiqueta:</span>
                            <input
                              type="text"
                              value={prop.label}
                              style={{
                                flex: 1,
                                padding: "4px 8px",
                                fontSize: "12px",
                                backgroundColor: "var(--bg-card)",
                                border: "1px solid var(--border-color)",
                                borderRadius: "4px",
                                color: "var(--text-primary)"
                              }}
                              onChange={(e) => {
                                const newLabel = e.target.value;
                                setTempExposedProperties(prev => prev.map((item, i) => i === idx ? { ...item, label: newLabel } : item));
                              }}
                            />
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

            </div>

            {/* Footer */}
            <footer style={{
              padding: "16px 24px",
              borderTop: "1px solid var(--border-color)",
              display: "flex",
              justifyContent: "flex-end",
              gap: "12px",
              backgroundColor: "var(--bg-card)"
            }}>
              <button
                type="button"
                className="btn-secundario"
                style={{ padding: "8px 16px", fontSize: "13px" }}
                onClick={handleCloseExposedConfig}
              >
                Cancelar
              </button>
              <button
                type="button"
                className="btn-primary"
                style={{ padding: "8px 16px", fontSize: "13px" }}
                onClick={() => {
                  if (activeTab === "frontal") {
                    setTempPlantilla((prev: any) => ({
                      ...prev,
                      exposedProperties: tempExposedProperties,
                    }));
                  } else {
                    setTempPlantillaTrasera((prev: any) => ({
                      ...prev,
                      exposedProperties: tempExposedProperties,
                    }));
                  }
                  setShowExposedConfigModal(false);
                }}
              >
                Aceptar
              </button>
            </footer>

          </div>
        </div>
      )})()}

      {/* Modal: Selector de Imagen desde Galería */}
      {showGallerySelector && plantillaActiva && (
        <div className="gallery-popup-backdrop" onClick={() => { setShowGallerySelector(false); setActiveSelectorTarget(null); }}>
          <div className="gallery-popup-container" onClick={(e) => e.stopPropagation()}>
            <div className="gallery-popup-title-bar">
              <h4 className="gallery-popup-title">Seleccionar de la Galería</h4>
              <button
                type="button"
                className="btn-close-modal"
                style={{
                  background: "transparent",
                  border: "none",
                  color: "var(--text-secondary)",
                  cursor: "pointer",
                  fontSize: "16px"
                }}
                onClick={() => { setShowGallerySelector(false); setActiveSelectorTarget(null); }}
              >
                ✕
              </button>
            </div>

            {/* Pestañas (Tabs) para Galería de Proyecto vs Plantilla */}
            <div style={{ display: "flex", borderBottom: "1px solid var(--border-color)", marginBottom: "12px", gap: "16px" }}>
              <button
                type="button"
                style={{
                  padding: "8px 4px",
                  background: "none",
                  border: "none",
                  borderBottom: selectorTab === "project" ? "2px solid var(--accent-primary)" : "2px solid transparent",
                  color: selectorTab === "project" ? "var(--text-primary)" : "var(--text-secondary)",
                  fontWeight: selectorTab === "project" ? "bold" : "normal",
                  cursor: "pointer",
                  fontSize: "13px"
                }}
                onClick={() => setSelectorTab("project")}
              >
                Imágenes del Proyecto
              </button>
              <button
                type="button"
                style={{
                  padding: "8px 4px",
                  background: "none",
                  border: "none",
                  borderBottom: selectorTab === "template" ? "2px solid var(--accent-primary)" : "2px solid transparent",
                  color: selectorTab === "template" ? "var(--text-primary)" : "var(--text-secondary)",
                  fontWeight: selectorTab === "template" ? "bold" : "normal",
                  cursor: "pointer",
                  fontSize: "13px"
                }}
                onClick={() => setSelectorTab("template")}
              >
                Imágenes de la Plantilla
              </button>
            </div>

            <p className="gallery-popup-subtitle">
              Elige una imagen para asignar a la capa ({selectorTab === "project" ? "Galería del Proyecto" : "Galería de la Plantilla"})
            </p>

            <div className="gallery-assets-grid" style={{ maxHeight: "350px" }}>
              {selectorTab === "project" ? (
                projectAssets && projectAssets.length > 0 ? (
                  projectAssets.map((asset: any) => (
                    <div
                      key={asset.id}
                      className="gallery-asset-item"
                      onClick={() => handleSelectGalleryAsset(asset.src)}
                      title={`Seleccionar ${asset.nombre}`}
                    >
                      <div className="gallery-asset-thumb-container">
                        <img src={asset.src} alt={asset.nombre} className="gallery-asset-thumb" />
                      </div>
                      <div className="gallery-asset-name">{asset.nombre}</div>
                    </div>
                  ))
                ) : (
                  <div style={{
                    gridColumn: "1 / -1",
                    padding: "40px 20px",
                    textAlign: "center",
                    color: "var(--text-secondary)",
                    fontSize: "12px"
                  }}>
                    La galería del proyecto está vacía. Añade imágenes desde el menú superior "Galería del Proyecto".
                  </div>
                )
              ) : (
                plantillaActiva.assets && plantillaActiva.assets.length > 0 ? (
                  plantillaActiva.assets.map((asset: any) => (
                    <div
                      key={asset.id}
                      className="gallery-asset-item"
                      onClick={() => handleSelectGalleryAsset(asset.src)}
                      title={`Seleccionar ${asset.nombre}`}
                    >
                      <div className="gallery-asset-thumb-container">
                        <img src={asset.src} alt={asset.nombre} className="gallery-asset-thumb" />
                      </div>
                      <div className="gallery-asset-name">{asset.nombre}</div>
                    </div>
                  ))
                ) : (
                  <div style={{
                    gridColumn: "1 / -1",
                    padding: "40px 20px",
                    textAlign: "center",
                    color: "var(--text-secondary)",
                    fontSize: "12px"
                  }}>
                    La galería de esta plantilla está vacía. Añade imágenes primero desde el gestor de galería.
                  </div>
                )
              )}
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "8px" }}>
              <button
                type="button"
                className="btn-secondary"
                style={{ padding: "6px 16px", fontSize: "12px" }}
                onClick={() => { setShowGallerySelector(false); setActiveSelectorTarget(null); }}
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Seleccionar Recursos para Capa Switch */}
      {showSwitchResourcesPopup && plantillaActiva && tempSwitchCapaId && (
        <div className="gallery-popup-backdrop" onClick={() => { setShowSwitchResourcesPopup(false); setTempSwitchCapaId(null); }}>
          <div className="gallery-popup-container" onClick={(e) => e.stopPropagation()}>
            <div className="gallery-popup-title-bar">
              <h4 className="gallery-popup-title">Seleccionar recursos para el Switch</h4>
              <button
                type="button"
                className="btn-close-modal"
                style={{
                  background: "transparent",
                  border: "none",
                  color: "var(--text-secondary)",
                  cursor: "pointer",
                  fontSize: "16px"
                }}
                onClick={() => { setShowSwitchResourcesPopup(false); setTempSwitchCapaId(null); }}
              >
                ✕
              </button>
            </div>

            {/* Pestañas (Tabs) para Switch Selector */}
            <div style={{ display: "flex", borderBottom: "1px solid var(--border-color)", marginBottom: "12px", gap: "16px" }}>
              <button
                type="button"
                style={{
                  padding: "8px 4px",
                  background: "none",
                  border: "none",
                  borderBottom: switchSelectorTab === "project" ? "2px solid var(--accent-primary)" : "2px solid transparent",
                  color: switchSelectorTab === "project" ? "var(--text-primary)" : "var(--text-secondary)",
                  fontWeight: switchSelectorTab === "project" ? "bold" : "normal",
                  cursor: "pointer",
                  fontSize: "13px"
                }}
                onClick={() => setSwitchSelectorTab("project")}
              >
                Imágenes del Proyecto
              </button>
              <button
                type="button"
                style={{
                  padding: "8px 4px",
                  background: "none",
                  border: "none",
                  borderBottom: switchSelectorTab === "template" ? "2px solid var(--accent-primary)" : "2px solid transparent",
                  color: switchSelectorTab === "template" ? "var(--text-primary)" : "var(--text-secondary)",
                  fontWeight: switchSelectorTab === "template" ? "bold" : "normal",
                  cursor: "pointer",
                  fontSize: "13px"
                }}
                onClick={() => setSwitchSelectorTab("template")}
              >
                Imágenes de la Plantilla
              </button>
            </div>

            <p className="gallery-popup-subtitle">
              Selecciona las imágenes de la galería que estarán disponibles en esta capa.
            </p>

            <div className="gallery-assets-grid" style={{ maxHeight: "300px" }}>
              {switchSelectorTab === "project" ? (
                projectAssets && projectAssets.length > 0 ? (
                  projectAssets.map((asset: any) => {
                    const isChecked = tempSelectedOptionIds.includes(asset.id);
                    return (
                      <div
                        key={asset.id}
                        className={`gallery-asset-item ${isChecked ? "selected" : ""}`}
                        onClick={() => {
                          setTempSelectedOptionIds((prev) => {
                            if (prev.includes(asset.id)) {
                              return prev.filter((id) => id !== asset.id);
                            } else {
                              return [...prev, asset.id];
                            }
                          });
                        }}
                        title={asset.nombre}
                        style={{ cursor: "pointer", position: "relative" }}
                      >
                        <div className="gallery-asset-thumb-container" style={{ position: "relative" }}>
                          <img src={asset.src} alt={asset.nombre} className="gallery-asset-thumb" />
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => {}}
                            style={{
                              position: "absolute",
                              top: "6px",
                              right: "6px",
                              width: "16px",
                              height: "16px",
                              cursor: "pointer",
                              accentColor: "var(--accent-primary)"
                            }}
                          />
                        </div>
                        <div className="gallery-asset-name">{asset.nombre}</div>
                      </div>
                    );
                  })
                ) : (
                  <div style={{
                    gridColumn: "1 / -1",
                    padding: "40px 20px",
                    textAlign: "center",
                    color: "var(--text-secondary)",
                    fontSize: "12px"
                  }}>
                    La galería del proyecto está vacía. Añade imágenes desde el menú superior "Galería del Proyecto".
                  </div>
                )
              ) : (
                plantillaActiva.assets && plantillaActiva.assets.length > 0 ? (
                  plantillaActiva.assets.map((asset: any) => {
                    const isChecked = tempSelectedOptionIds.includes(asset.id);
                    return (
                      <div
                        key={asset.id}
                        className={`gallery-asset-item ${isChecked ? "selected" : ""}`}
                        onClick={() => {
                          setTempSelectedOptionIds((prev) => {
                            if (prev.includes(asset.id)) {
                              return prev.filter((id) => id !== asset.id);
                            } else {
                              return [...prev, asset.id];
                            }
                          });
                        }}
                        title={asset.nombre}
                        style={{ cursor: "pointer", position: "relative" }}
                      >
                        <div className="gallery-asset-thumb-container" style={{ position: "relative" }}>
                          <img src={asset.src} alt={asset.nombre} className="gallery-asset-thumb" />
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => {}}
                            style={{
                              position: "absolute",
                              top: "6px",
                              right: "6px",
                              width: "16px",
                              height: "16px",
                              cursor: "pointer",
                              accentColor: "var(--accent-primary)"
                            }}
                          />
                        </div>
                        <div className="gallery-asset-name">{asset.nombre}</div>
                      </div>
                    );
                  })
                ) : (
                  <div style={{
                    gridColumn: "1 / -1",
                    padding: "40px 20px",
                    textAlign: "center",
                    color: "var(--text-secondary)",
                    fontSize: "12px"
                  }}>
                    La galería de esta plantilla está vacía. Añade imágenes primero desde el gestor de galería.
                  </div>
                )
              )}
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "12px", gap: "8px" }}>
              <button
                type="button"
                className="btn-secondary"
                style={{ padding: "6px 16px", fontSize: "12px" }}
                onClick={() => { setShowSwitchResourcesPopup(false); setTempSwitchCapaId(null); }}
              >
                Cancelar
              </button>
              <button
                type="button"
                className="btn-primary"
                style={{ padding: "6px 16px", fontSize: "12px" }}
                onClick={() => {
                  // Guardar las opciones seleccionadas en la propiedad options de la capa
                  const targetCapa = plantillaActiva.capas.find((c: any) => c.id === tempSwitchCapaId);
                  const allAssets = [...(projectAssets || []), ...(plantillaActiva.assets || [])];
                  const nextOptions = allAssets
                    .filter((asset: any) => tempSelectedOptionIds.includes(asset.id))
                    .map((asset: any) => ({
                      id: asset.id,
                      nombre: asset.nombre,
                      src: asset.src
                    }));

                  // Si no hay opción seleccionada por defecto, o la que había ya no existe, elegimos la primera o undefined
                  let selectedOptionId = targetCapa?.selectedOptionId;
                  if (!nextOptions.some((opt: any) => opt.id === selectedOptionId)) {
                    selectedOptionId = nextOptions[0]?.id;
                  }

                  // Actualizar capa options
                  handleUpdateCapaProp(tempSwitchCapaId, "options", nextOptions);
                  if (selectedOptionId) {
                    handleUpdateCapaProp(tempSwitchCapaId, "selectedOptionId", selectedOptionId);
                    // También actualizamos la imagen por defecto `src` de la plantilla
                    const defaultSrc = nextOptions.find((opt: any) => opt.id === selectedOptionId)?.src || "";
                    handleUpdateCapaProp(tempSwitchCapaId, "src", defaultSrc);
                  } else {
                    handleUpdateCapaProp(tempSwitchCapaId, "selectedOptionId", undefined);
                    handleUpdateCapaProp(tempSwitchCapaId, "src", "");
                  }

                  setShowSwitchResourcesPopup(false);
                  setTempSwitchCapaId(null);
                }}
              >
                Guardar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
