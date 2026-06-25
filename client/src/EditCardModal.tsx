import React, { useState, useEffect } from "react";
import type { CardConfig, Carta } from "shared";
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
}

function renderizarTextoCapa(capa: any, valoresCampos?: Record<string, string>): string {
  let texto = capa.contenidoRaw || "";
  if (valoresCampos) {
    Object.entries(valoresCampos).forEach(([key, val]) => {
      texto = texto.replace(new RegExp(`\\{\\{\\s*${key}\\s*\\}\\}`, "g"), val);
    });
  }
  return texto;
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
  
  // Pestañas del Inspector de Propiedades: "contenido" (valores de la carta) vs "diseño" (estilos de plantilla)
  const [inspectorTab, setInspectorTab] = useState<"contenido" | "diseño">("contenido");

  // Popup de añadir elementos
  const [showAddElementPopup, setShowAddElementPopup] = useState<boolean>(false);
  const [selectedNewType, setSelectedNewType] = useState<"single" | "multi" | "image" | "image-switch">("single");
  const [showSwitchResourcesPopup, setShowSwitchResourcesPopup] = useState<boolean>(false);
  const [tempSwitchCapaId, setTempSwitchCapaId] = useState<string | null>(null);
  const [tempSelectedOptionIds, setTempSelectedOptionIds] = useState<string[]>([]);

  // Estado del menú desplegable de opciones de plantilla
  const [showDropdown, setShowDropdown] = useState<boolean>(false);

  // Estados para Galería de la Plantilla (SRS-020)
  const [showGalleryManager, setShowGalleryManager] = useState<boolean>(false);
  const [showGallerySelector, setShowGallerySelector] = useState<boolean>(false);
  const [activeSelectorTarget, setActiveSelectorTarget] = useState<{ type: "override" | "default"; capaId: string } | null>(null);

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
  const setTempValoresActivos = activeTab === "frontal" ? setTempValoresCampos : setTempValoresCamposTrasera;
  const tempCapasOverridesActivos = activeTab === "frontal" ? tempCapasOverrides : tempCapasOverridesTrasera;
  const setTempCapasOverridesActivos = activeTab === "frontal" ? setTempCapasOverrides : setTempCapasOverridesTrasera;

  // Escala para la edición interactiva en el modal (inicializada con zoomFactor)
  const [scale] = useState<number>(() => initialZoom || 3.5);

  // --- Comprobar si hay cambios sin guardar ---
  const hasChanges = () => {
    // Estructuras de plantillas
    const originalPlantilla = carta.plantillaId ? templatesMap[carta.plantillaId] : null;
    const originalPlantillaTrasera = carta.plantillaTraseraId ? templatesMap[carta.plantillaTraseraId] : null;
    
    if (JSON.stringify(tempPlantilla) !== JSON.stringify(originalPlantilla)) return true;
    if (JSON.stringify(tempPlantillaTrasera) !== JSON.stringify(originalPlantillaTrasera)) return true;

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

  // --- Escucha de la tecla Escape ---
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        handleCancel();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [tempValoresCampos, tempCapasOverrides, tempValoresCamposTrasera, tempCapasOverridesTrasera, tempPlantilla, tempPlantillaTrasera]);

  // --- Escucha de la tecla Tabulador para navegar entre capas ---
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Tab") {
        const capas = plantillaActiva?.capas || [];
        if (capas.length === 0) return;

        // Prevenir la navegación de foco nativa que saca al usuario del panel
        e.preventDefault();

        const currentIndex = capas.findIndex((c: any) => c.id === selectedLayerId);

        if (e.shiftKey) {
          // Shift + Tab: seleccionar capa anterior
          let prevIndex = currentIndex - 1;
          if (prevIndex < 0) {
            prevIndex = capas.length - 1;
          }
          setSelectedLayerId(capas[prevIndex].id);
        } else {
          // Tab: seleccionar capa siguiente
          let nextIndex = currentIndex + 1;
          if (nextIndex >= capas.length || currentIndex === -1) {
            nextIndex = 0;
          }
          setSelectedLayerId(capas[nextIndex].id);
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [selectedLayerId, plantillaActiva]);

  // --- Foco automático en el input del inspector al cambiar de capa ---
  useEffect(() => {
    if (!selectedLayerId) return;

    const focusTimer = setTimeout(() => {
      const input = document.querySelector<HTMLInputElement | HTMLTextAreaElement>(
        ".inspector-textarea, .inspector-input, .color-picker-input, .color-hex-input"
      );
      if (input) {
        input.focus();
        if (input instanceof HTMLInputElement && input.type !== "color") {
          input.select();
        } else if (input instanceof HTMLTextAreaElement) {
          input.select();
        }
      }
    }, 50);

    return () => clearTimeout(focusTimer);
  }, [selectedLayerId, inspectorTab]);

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

  // --- Añadir Elemento ---
  const handleAddElement = () => {
    if (!plantillaActiva) return;

    const isMultiline = selectedNewType === "multi";
    const isImage = selectedNewType === "image";
    const isImageSwitch = selectedNewType === "image-switch";
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
    } else {
      const newNombre = isMultiline ? "Texto Multilínea" : "Texto de una Línea";
      newLayer = {
        id: newId,
        nombre: newNombre,
        visible: true,
        tipo: "text" as const,
        xMm: Math.round((cardConfig.anchoMm * 0.05) * 10) / 10,
        yMm: Math.round((cardConfig.altoMm * 0.45) * 10) / 10,
        anchoMm: Math.round((cardConfig.anchoMm * 0.9) * 10) / 10,
        altoMm: isMultiline ? Math.round((cardConfig.altoMm * 0.3) * 10) / 10 : 8,
        fontFamily: "sans-serif",
        fontSizePt: isMultiline ? 10 : 12,
        color: "#000000",
        alineacion: "center" as const,
        bold: false,
        italic: false,
        contenidoRaw: `{{${newClave}}}`
      };
    }

    const newCampo = !isImage && !isImageSwitch ? {
      clave: newClave,
      nombreLegible: isMultiline ? "Texto Multilínea" : "Texto de una Línea",
      tipo: "text" as const,
      valorDefecto: isMultiline ? "Texto multilínea de ejemplo..." : "Texto de ejemplo..."
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
    setInspectorTab(isImage || isImageSwitch ? "contenido" : "diseño");
    setShowAddElementPopup(false);
  };

  // --- Guardar y Exportar Plantilla ---
  const ejecutarExportacion = async (guardarEnProyecto: boolean, descargarArchivo: boolean) => {
    if (!plantillaActiva) return;

    const name = window.prompt("Nombre de la plantilla:", plantillaActiva.nombre || "Mi Plantilla");
    if (!name) return;

    const valoresActivos = activeTab === "frontal" ? tempValoresCampos : tempValoresCamposTrasera;
    const updatedTemplate = prepararPlantillaParaExportacion(plantillaActiva, name, valoresActivos);

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

    // Obtener dimensiones de la carta
    const anchoCarta = plantillaActiva.anchoMm || cardConfig.anchoMm || 63.5;
    const altoCarta = plantillaActiva.altoMm || cardConfig.altoMm || 88.9;

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

  // --- Duplicar Capa Seleccionada (SRS-016) ---
  const handleDuplicateCapa = (capaId: string) => {
    if (!plantillaActiva) return;
    const index = plantillaActiva.capas?.findIndex((c: any) => c.id === capaId);
    if (index === -1) return;
    const capa = plantillaActiva.capas[index];
    if (capa.tipo === "background") return;

    const newId = `layer_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const newNombre = `${capa.nombre || (capa.tipo === "image" ? "Imagen" : capa.tipo === "image-switch" ? "Imagen Switch" : "Texto")} (Copia)`;
    
    const duplicatedCapa = {
      ...capa,
      id: newId,
      nombre: newNombre,
      options: capa.tipo === "image-switch" && capa.options ? capa.options.map((opt: any) => ({ ...opt })) : undefined,
    };

    let newClave: string | null = null;
    let oldClave: string | null = null;
    let copiedCampoConfig: any = null;
    let initialVal = "";

    if (capa.tipo === "text") {
      const match = capa.contenidoRaw?.match(/\{\{\s*(\w+)\s*\}\}/);
      oldClave = match ? match[1] : null;
      if (oldClave) {
        newClave = `campo_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`;
        duplicatedCapa.contenidoRaw = `{{${newClave}}}`;
        
        // Buscar configuración de campo original
        const origCampo = plantillaActiva.camposConfig?.find((f: any) => f.clave === oldClave);
        if (origCampo) {
          copiedCampoConfig = {
            ...origCampo,
            clave: newClave,
            nombreLegible: `${origCampo.nombreLegible || oldClave} (Copia)`
          };
          initialVal = (activeTab === "frontal" ? tempValoresCampos[oldClave] : tempValoresCamposTrasera[oldClave]) || origCampo.valorDefecto || "";
        } else {
          copiedCampoConfig = {
            clave: newClave,
            nombreLegible: `${newClave} (Copia)`,
            tipo: "text",
            valorDefecto: ""
          };
          initialVal = (activeTab === "frontal" ? tempValoresCampos[oldClave] : tempValoresCamposTrasera[oldClave]) || "";
        }
      }
    }

    const updater = (prev: any) => {
      const nextCapas = [...prev.capas];
      nextCapas.splice(index + 1, 0, duplicatedCapa);
      
      let nextCamposConfig = [...(prev.camposConfig || [])];
      if (copiedCampoConfig) {
        nextCamposConfig.push(copiedCampoConfig);
      }

      return {
        ...prev,
        capas: nextCapas,
        camposConfig: nextCamposConfig
      };
    };

    if (activeTab === "frontal") {
      setTempPlantilla(updater);
      if (newClave) {
        setTempValoresCampos((prev: any) => ({
          ...prev,
          [newClave!]: initialVal
        }));
      }
    } else {
      setTempPlantillaTrasera(updater);
      if (newClave) {
        setTempValoresCamposTrasera((prev: any) => ({
          ...prev,
          [newClave!]: initialVal
        }));
      }
    }

    setSelectedLayerId(newId);
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
        const match = capa.contenidoRaw?.match(/\{\{\s*(\w+)\s*\}\}/);
        const clave = match ? match[1] : null;
        if (clave) {
          const isClaveUsed = nextCapas.some((c: any) => 
            c.tipo === "text" && c.contenidoRaw?.includes(`{{${clave}}}`)
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
          setTempValoresCampos(nextValores);
        }
        delete next._deletedClave;
        return next;
      });
    }

    setSelectedLayerId(null);
  };

  // --- Modificar Clave de Capa (Sincronizada con camposConfig y valores de carta) ---
  const handleUpdateCapaClave = (capaId: string, oldClave: string | null, newClave: string) => {
    const sanitizedClave = newClave.replace(/[^a-zA-Z0-9_]/g, "").trim();
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

  // --- Obtener el campo de variables asociado a la capa de texto ---
  const getFieldKeyForCapa = (capa: any): string | null => {
    if (!capa || capa.tipo !== "text" || !capa.contenidoRaw) return null;
    const match = capa.contenidoRaw.match(/\{\{\s*(\w+)\s*\}\}/);
    return match ? match[1] : null;
  };

  const fieldKey = selectedCapa ? getFieldKeyForCapa(selectedCapa) : null;
  const campoConfig = fieldKey
    ? plantillaActiva?.camposConfig?.find((f: any) => f.clave === fieldKey)
    : null;

  // Reverso a renderizar cuando no es dinámico
  const traseraUrl = carta.imagenTrasera || imagenTraseraComun;

  return (
    <div className="edit-modal-backdrop" onClick={handleCancel}>
      <div className="edit-modal-container" onClick={(e) => e.stopPropagation()}>
        
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
                <div className="hierarchy-list">
                  {plantillaActiva.capas.map((capa: any) => {
                    let title = capa.nombre;
                    let subtitle = "";

                    if (capa.tipo === "background") {
                      title = capa.nombre;
                      subtitle = "Fondo";
                    } else if (capa.tipo === "text") {
                      const key = getFieldKeyForCapa(capa);
                      if (key) {
                        const fieldConfig = plantillaActiva.camposConfig?.find((f: any) => f.clave === key);
                        title = fieldConfig?.nombreLegible || key;
                      }
                      subtitle = capa.altoMm > 15 ? "Texto multilínea" : "Texto de una línea";
                    } else if (capa.tipo === "image" || capa.tipo === "image-switch") {
                      title = capa.nombre || (capa.tipo === "image" ? "Imagen" : "Imagen Switch");
                      subtitle = capa.tipo === "image" ? "Capa de Imagen" : "Imagen Switch";
                    }

                    return (
                      <div
                        key={capa.id}
                        className={`hierarchy-item ${selectedLayerId === capa.id ? "selected" : ""} ${
                          hoveredLayerId === capa.id ? "hovered" : ""
                        }`}
                        onClick={() => setSelectedLayerId(capa.id)}
                        onMouseEnter={() => setHoveredLayerId(capa.id)}
                        onMouseLeave={() => setHoveredLayerId(null)}
                      >
                        <span className="hierarchy-icon">
                          {capa.tipo === "background" ? "🎨" : (capa.tipo === "image" || capa.tipo === "image-switch") ? "🖼️" : "📝"}
                        </span>
                        <div className="hierarchy-text-container" style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                          <span className="hierarchy-label" style={{ fontWeight: 600, fontSize: "13px" }}>{title}</span>
                          <span className="hierarchy-subtitle">{subtitle}</span>
                        </div>
                      </div>
                    );
                  })}
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
                    setSelectedNewType("single");
                    setShowAddElementPopup(true);
                  }}
                >
                  <span>➕</span> Añadir Elemento
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
                          ejecutarExportacion(true, true);
                        }}
                      >
                        <span>📥</span> Guardar y Exportar (.cdc2t)
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setShowDropdown(false);
                          ejecutarExportacion(false, true);
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
            <div className="column-title">Previsualización</div>
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
                  plantillaActiva.capas.map((capa: any) => {
                    const isSelected = selectedLayerId === capa.id;
                    const isHovered = hoveredLayerId === capa.id;

                    const layerStyle: React.CSSProperties = {
                      position: "absolute",
                      left: `${capa.xMm * scale}px`,
                      top: `${capa.yMm * scale}px`,
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
                          onClick={() => setSelectedLayerId(capa.id)}
                          onMouseEnter={() => setHoveredLayerId(capa.id)}
                          onMouseLeave={() => setHoveredLayerId(null)}
                        />
                      );
                    }

                    if (capa.tipo === "text") {
                      const textoInterp = renderizarTextoCapa(capa, tempValoresActivos);
                      const fontSizePx = (capa.fontSizePt || 12) * 0.352778 * scale;
                      return (
                        <div
                          key={capa.id}
                          style={{
                            ...layerStyle,
                            fontFamily: capa.fontFamily || "sans-serif",
                            fontSize: `${fontSizePx}px`,
                            color: capa.color || "#000000",
                            textAlign: (capa.alineacion === "center"
                              ? "center"
                              : capa.alineacion === "right"
                              ? "right"
                              : "justify" === capa.alineacion
                              ? "justify"
                              : "left") as any,
                            fontWeight: capa.bold ? "bold" : "normal",
                            fontStyle: capa.italic ? "italic" : "normal",
                            whiteSpace: "pre-wrap",
                            wordBreak: "break-word",
                            lineHeight: 1.2,
                            padding: "2px",
                            userSelect: "none",
                          }}
                          onClick={() => setSelectedLayerId(capa.id)}
                          onMouseEnter={() => setHoveredLayerId(capa.id)}
                          onMouseLeave={() => setHoveredLayerId(null)}
                        >
                          {textoInterp}
                        </div>
                      );
                    }

                    if (capa.tipo === "image" || capa.tipo === "image-switch") {
                      const src = tempCapasOverridesActivos[capa.id]?.src !== undefined
                        ? tempCapasOverridesActivos[capa.id]?.src
                        : capa.src;
                      
                      const showPlaceholder = !src;

                      return (
                        <div
                          key={capa.id}
                          style={{
                            ...layerStyle,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            overflow: "hidden",
                            backgroundColor: showPlaceholder ? "#e2e8f0" : "transparent",
                            border: showPlaceholder ? "1px dashed #cbd5e1" : "none",
                          }}
                          onClick={() => setSelectedLayerId(capa.id)}
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
                                objectFit: capa.modoAjuste === "stretch" ? "fill" : (capa.modoAjuste || "cover") as any,
                                pointerEvents: "none",
                              }}
                            />
                          )}
                        </div>
                      );
                    }

                    return null;
                  })
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
                      {selectedCapa.tipo === "background" ? "🎨" : (selectedCapa.tipo === "image" || selectedCapa.tipo === "image-switch") ? "🖼️" : "📝"}
                    </span>
                    <h3>{selectedCapa.nombre}</h3>
                  </div>
                  <hr className="inspector-separator" />

                  {/* Sub-pestañas si es capa de texto o imagen */}
                  {(selectedCapa.tipo === "text" || selectedCapa.tipo === "image" || selectedCapa.tipo === "image-switch") && (
                    <div className="inspector-tabs">
                      <button
                        type="button"
                        className={`inspector-tab-btn ${inspectorTab === "contenido" ? "active" : ""}`}
                        onClick={() => setInspectorTab("contenido")}
                      >
                        Contenido
                      </button>
                      <button
                        type="button"
                        className={`inspector-tab-btn ${inspectorTab === "diseño" ? "active" : ""}`}
                        onClick={() => setInspectorTab("diseño")}
                      >
                        Diseño
                      </button>
                    </div>
                  )}

                  {/* CONTENIDO TAB */}
                  {inspectorTab === "contenido" || (selectedCapa.tipo !== "text" && selectedCapa.tipo !== "image" && selectedCapa.tipo !== "image-switch") ? (
                    <>
                      {/* Controles para capas de Fondo */}
                      {selectedCapa.tipo === "background" && (
                        <div className="inspector-section">
                          <label className="inspector-label">Color de Relleno</label>
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
                      )}

                      {/* Controles para capas de Texto */}
                      {selectedCapa.tipo === "text" && (
                        <div className="inspector-section">
                          {fieldKey ? (
                            <>
                              <label className="inspector-label">
                                {campoConfig?.nombreLegible || fieldKey} (Valor Dinámico)
                              </label>
                              {selectedCapa.altoMm > 15 ? (
                                <textarea
                                  className="inspector-textarea"
                                  value={tempValoresActivos[fieldKey] || ""}
                                  rows={6}
                                  onChange={(e) => {
                                    setTempValoresActivos((prev) => ({
                                      ...prev,
                                      [fieldKey]: e.target.value,
                                    }));
                                  }}
                                />
                              ) : (
                                <input
                                  type="text"
                                  className="inspector-input"
                                  value={tempValoresActivos[fieldKey] || ""}
                                  onChange={(e) => {
                                    setTempValoresActivos((prev) => ({
                                      ...prev,
                                      [fieldKey]: e.target.value,
                                    }));
                                  }}
                                />
                              )}
                            </>
                          ) : (
                            <div className="inspector-notice">
                              Esta capa de texto utiliza un contenido estático sin variables editables.
                            </div>
                          )}
                        </div>
                      )}

                      {/* Controles para capas de Imagen en Contenido (Override por Carta) */}
                      {selectedCapa.tipo === "image" && (
                        <div className="inspector-section">
                          <label className="inspector-label">Imagen de esta Carta (Anulación)</label>
                          
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
                      )}

                      {/* Controles para capas de Imagen Switch en Contenido */}
                      {selectedCapa.tipo === "image-switch" && (
                        <div className="inspector-section">
                          <label className="inspector-label">Imagen Switch (Anulación)</label>
                          
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
                              Elige las imágenes para este switch en la pestaña de <strong>Diseño</strong>.
                            </div>
                          ) : (
                            <>
                              {/* Vista previa de imagen activa */}
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

                              {/* Carrusel horizontal de opciones */}
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

                                {/* Botón + para subir archivo personalizado desde el PC */}
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
                                            selectedOptionId: undefined // custom image override
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
                      )}
                    </>
                  ) : (
                    /* DISEÑO TAB */
                    <div className="inspector-panel" style={{ gap: "12px" }}>
                      {selectedCapa.tipo === "text" && (
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
                      )}

                      {selectedCapa.tipo === "image" && (
                        <>
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
                          <div className="inspector-section">
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

                          <div className="inspector-section">
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
                        </>
                      )}

                      {selectedCapa.tipo === "image-switch" && (
                        <>
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

                          <div className="inspector-section">
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

                          <div className="inspector-section">
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
                        </>
                      )}

                      <div className="inspector-section" style={{ marginBottom: "8px" }}>
                        <label className="inspector-label">Alineación y Utilidades</label>
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

                      {selectedCapa.tipo === "text" && (
                        <>
                          <div className="inspector-section">
                            <label className="inspector-label">Tipografía (Familia)</label>
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
                            </select>
                          </div>

                          <div className="layout-form-grid">
                            <div className="inspector-section">
                              <label className="inspector-label">Tamaño Fuente (pt)</label>
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
                              <label className="inspector-label">Color de Texto</label>
                              <input
                                type="color"
                                className="color-picker-input"
                                style={{ width: "100%", height: "38px" }}
                                value={selectedCapa.color || "#000000"}
                                onChange={(e) => handleUpdateCapaProp(selectedCapa.id, "color", e.target.value)}
                              />
                            </div>
                          </div>

                          <div className="inspector-section">
                            <label className="inspector-label">Estilos y Alineación</label>
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
                        </>
                      )}
                    </div>
                  )}
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
              <div className="inspector-footer-gallery">
                <button
                  type="button"
                  className="btn-gallery-manager-trigger"
                  onClick={() => setShowGalleryManager(true)}
                >
                  🖼️ Galería de la Plantilla
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
                className={`add-element-option ${selectedNewType === "single" ? "selected" : ""}`}
                onClick={() => setSelectedNewType("single")}
              >
                <span className="add-element-option-icon">📝</span>
                <span className="add-element-option-label">Texto de una línea</span>
              </div>
              <div
                className={`add-element-option ${selectedNewType === "multi" ? "selected" : ""}`}
                onClick={() => setSelectedNewType("multi")}
              >
                <span className="add-element-option-icon">📄</span>
                <span className="add-element-option-label">Texto multilínea</span>
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
            <p className="gallery-popup-subtitle">
              Elige una imagen para asignar a la capa
            </p>

            <div className="gallery-assets-grid" style={{ maxHeight: "350px" }}>
              {plantillaActiva.assets && plantillaActiva.assets.length > 0 ? (
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
            <p className="gallery-popup-subtitle">
              Selecciona las imágenes de la galería que estarán disponibles en esta capa.
            </p>

            <div className="gallery-assets-grid" style={{ maxHeight: "300px" }}>
              {plantillaActiva.assets && plantillaActiva.assets.length > 0 ? (
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
                          onChange={() => {}} // handled by parent click
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
                  const nextOptions = (plantillaActiva.assets || [])
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
