import React, { useState, useEffect, useCallback, useRef, useMemo } from "react";
import type { CardConfig, Carta, ExposedProperty, ChildTemplate } from "shared";
import { isVerticalLayout, isHorizontalLayout, isFlexLayout, getContainerFlexStyle, cloneLayerTreeWithNewIds, calculateAutoDimensionsForFreeContainer } from "shared";
import JSZip from "jszip";
import { actualizarClavePlantillaYValores, prepararPlantillaParaExportacion, parsearTextoConSimbolos, parseMarkdownToHtml } from "./utils/projectUtils";
import { generarMiniaturaPlantilla } from "./utils/thumbnailUtils";
import { useHistory } from "./hooks/useHistory";
import "./EditCardModal.css";

const PROPERTY_WEIGHTS: Record<string, number> = {
  visibility: 1,
  contenidoRaw: 2,
  src: 3,
  selectedOptionId: 4,
  modoAjuste: 5,
  xMm: 6,
  yMm: 7,
  anchoMm: 8,
  altoMm: 9,
};

export interface CardEditorHistoryState {
  tempPlantilla: any;
  tempPlantillaTrasera: any;
  tempValoresCampos: Record<string, string>;
  tempCapasOverrides: Record<string, any>;
  tempValoresCamposTrasera: Record<string, string>;
  tempCapasOverridesTrasera: Record<string, any>;
}

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
  fontFolders?: string[];
  projectColors?: any[];
  userAssets?: any[];
  onAddUserAsset?: (nombre: string, src: string) => void;
  projectSymbols?: any[];
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
  fontFolders = ["Por Defecto"],
  projectColors = [],
  userAssets = [],
  onAddUserAsset,
  projectSymbols = [],
}: EditCardModalProps) {
  // --- Estados de Edición de Carta con Historial Deshacer/Rehacer (SRS-090) ---
  const initialEditorHistoryState: CardEditorHistoryState = useMemo(() => {
    const pFront = carta.plantilla
      ? JSON.parse(JSON.stringify(carta.plantilla))
      : (carta.plantillaId && templatesMap[carta.plantillaId]
          ? JSON.parse(JSON.stringify(templatesMap[carta.plantillaId]))
          : null);

    const pBack = carta.plantillaTrasera
      ? JSON.parse(JSON.stringify(carta.plantillaTrasera))
      : (carta.plantillaTraseraId && templatesMap[carta.plantillaTraseraId]
          ? JSON.parse(JSON.stringify(templatesMap[carta.plantillaTraseraId]))
          : null);

    return {
      tempPlantilla: pFront,
      tempPlantillaTrasera: pBack,
      tempValoresCampos: { ...(carta.valoresCampos || {}) },
      tempCapasOverrides: { ...(carta.capasOverrides || {}) },
      tempValoresCamposTrasera: { ...(carta.valoresCamposTrasera || {}) },
      tempCapasOverridesTrasera: { ...(carta.capasOverridesTrasera || {}) },
    };
  }, []);

  const {
    state: editorState,
    set: setEditorState,
    undo,
    redo,
    canUndo,
    canRedo,
  } = useHistory<CardEditorHistoryState>(initialEditorHistoryState, { maxHistory: 30 });

  const {
    tempPlantilla,
    tempPlantillaTrasera,
    tempValoresCampos,
    tempCapasOverrides,
    tempValoresCamposTrasera,
    tempCapasOverridesTrasera,
  } = editorState;

  const [selectedLayerId, setSelectedLayerId] = useState<string | null>(null);
  const [hoveredLayerId, setHoveredLayerId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"frontal" | "trasera">("frontal");

  const setTempPlantilla = useCallback((updater: React.SetStateAction<any>, opts?: { skipHistory?: boolean }) => {
    setEditorState(prev => ({
      ...prev,
      tempPlantilla: typeof updater === "function" ? (updater as (p: any) => any)(prev.tempPlantilla) : updater
    }), opts);
  }, [setEditorState]);

  const setTempPlantillaTrasera = useCallback((updater: React.SetStateAction<any>, opts?: { skipHistory?: boolean }) => {
    setEditorState(prev => ({
      ...prev,
      tempPlantillaTrasera: typeof updater === "function" ? (updater as (p: any) => any)(prev.tempPlantillaTrasera) : updater
    }), opts);
  }, [setEditorState]);

  const setTempValoresCampos = useCallback((updater: React.SetStateAction<Record<string, any>>, opts?: { skipHistory?: boolean }) => {
    setEditorState(prev => ({
      ...prev,
      tempValoresCampos: typeof updater === "function" ? (updater as (p: Record<string, any>) => Record<string, any>)(prev.tempValoresCampos) : updater
    }), opts);
  }, [setEditorState]);

  const setTempCapasOverrides = useCallback((updater: React.SetStateAction<Record<string, any>>, opts?: { skipHistory?: boolean }) => {
    setEditorState(prev => ({
      ...prev,
      tempCapasOverrides: typeof updater === "function" ? (updater as (p: Record<string, any>) => Record<string, any>)(prev.tempCapasOverrides) : updater
    }), opts);
  }, [setEditorState]);

  const setTempValoresCamposTrasera = useCallback((updater: React.SetStateAction<Record<string, any>>, opts?: { skipHistory?: boolean }) => {
    setEditorState(prev => ({
      ...prev,
      tempValoresCamposTrasera: typeof updater === "function" ? (updater as (p: Record<string, any>) => Record<string, any>)(prev.tempValoresCamposTrasera) : updater
    }), opts);
  }, [setEditorState]);

  const setTempCapasOverridesTrasera = useCallback((updater: React.SetStateAction<Record<string, any>>, opts?: { skipHistory?: boolean }) => {
    setEditorState(prev => ({
      ...prev,
      tempCapasOverridesTrasera: typeof updater === "function" ? (updater as (p: Record<string, any>) => Record<string, any>)(prev.tempCapasOverridesTrasera) : updater
    }), opts);
  }, [setEditorState]);

  // Sesión de edición de texto (RF-4: Consolidación por Foco/Blur sin saturar historial)
  const isEditingTextSessionRef = useRef<boolean>(false);
  const textSessionTimeoutRef = useRef<any>(null);

  const startTextEditSession = useCallback(() => {
    isEditingTextSessionRef.current = false;
  }, []);

  const endTextEditSession = useCallback(() => {
    if (textSessionTimeoutRef.current) {
      clearTimeout(textSessionTimeoutRef.current);
      textSessionTimeoutRef.current = null;
    }
    isEditingTextSessionRef.current = false;
  }, []);

  const updateTextValue = useCallback((val: string, capaId: string) => {
    if (textSessionTimeoutRef.current) {
      clearTimeout(textSessionTimeoutRef.current);
    }

    const isFirstKeystroke = !isEditingTextSessionRef.current;
    if (isFirstKeystroke) {
      isEditingTextSessionRef.current = true;
    }

    const opts = isFirstKeystroke ? undefined : { skipHistory: true };

    setEditorState(prev => {
      const isFront = activeTab === "frontal";
      const targetPlantilla = isFront ? prev.tempPlantilla : prev.tempPlantillaTrasera;

      let updatedPlantilla = targetPlantilla;
      if (targetPlantilla && targetPlantilla.capas) {
        updatedPlantilla = {
          ...targetPlantilla,
          capas: targetPlantilla.capas.map((c: any) =>
            c.id === capaId ? { ...c, contenidoRaw: val } : c
          ),
        };
      }

      if (isFront) {
        return {
          ...prev,
          tempPlantilla: updatedPlantilla,
          tempValoresCampos: { ...prev.tempValoresCampos, [capaId]: val },
          tempCapasOverrides: {
            ...prev.tempCapasOverrides,
            [capaId]: {
              ...(prev.tempCapasOverrides[capaId] || {}),
              contenidoRaw: val,
            },
          },
        };
      } else {
        return {
          ...prev,
          tempPlantillaTrasera: updatedPlantilla,
          tempValoresCamposTrasera: { ...prev.tempValoresCamposTrasera, [capaId]: val },
          tempCapasOverridesTrasera: {
            ...prev.tempCapasOverridesTrasera,
            [capaId]: {
              ...(prev.tempCapasOverridesTrasera[capaId] || {}),
              contenidoRaw: val,
            },
          },
        };
      }
    }, opts);

    textSessionTimeoutRef.current = setTimeout(() => {
      isEditingTextSessionRef.current = false;
    }, 1000);
  }, [activeTab, setEditorState]);

  // Atajos de teclado en modal (Ctrl+Z: Deshacer, Ctrl+Y / Ctrl+Shift+Z: Rehacer) con aislamiento
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isZ = e.key === "z" || e.key === "Z";
      const isY = e.key === "y" || e.key === "Y";
      const isMod = e.ctrlKey || e.metaKey;

      if (!isMod) return;

      if (isZ && !e.shiftKey) {
        e.preventDefault();
        e.stopPropagation();
        undo();
      } else if ((isZ && e.shiftKey) || isY) {
        e.preventDefault();
        e.stopPropagation();
        redo();
      }
    };

    window.addEventListener("keydown", handleKeyDown, true);
    return () => {
      window.removeEventListener("keydown", handleKeyDown, true);
    };
  }, [undo, redo]);

  const [activeSymbolPopover, setActiveSymbolPopover] = useState<string | null>(null);

  const handleInsertSymbol = (tag: string, inputId: string, currentValue: string, onUpdate: (val: string) => void) => {
    endTextEditSession();
    const input = document.getElementById(inputId) as HTMLInputElement | HTMLTextAreaElement | null;
    if (input) {
      const start = input.selectionStart ?? currentValue.length;
      const end = input.selectionEnd ?? currentValue.length;
      const nextVal = currentValue.substring(0, start) + `{${tag}}` + currentValue.substring(end);
      onUpdate(nextVal);
      setTimeout(() => {
        input.focus();
        const newCursorPos = start + tag.length + 2;
        input.setSelectionRange(newCursorPos, newCursorPos);
      }, 50);
    } else {
      onUpdate(currentValue + `{${tag}}`);
    }
    setActiveSymbolPopover(null);
  };

  // Popup de añadir elementos
  const [showAddElementPopup, setShowAddElementPopup] = useState<boolean>(false);
  const [canvasEditMode, setCanvasEditMode] = useState<boolean>(false);
  const [selectedNewType, setSelectedNewType] = useState<"text" | "image" | "image-switch" | "container" | "block" | "list">("text");
  const [showSwitchResourcesPopup, setShowSwitchResourcesPopup] = useState<boolean>(false);
  const [tempSwitchCapaId, setTempSwitchCapaId] = useState<string | null>(null);

  const renderColorSelector = (
    label: string,
    value: string,
    onChange: (val: string) => void,
    isCompact?: boolean,
    exposedProperty?: string,
    exposedPropertyLabel?: string,
    cellFlex?: string | number,
    displayLabel?: string
  ) => {
    const matchingCustomColor = projectColors.find((c) => c.valor.toLowerCase() === (value || "").toLowerCase());
    const innerContent = (
      <div className="color-picker-group">
        {projectColors.length > 0 && (
          <select
            className="inspector-input"
            value={matchingCustomColor ? matchingCustomColor.valor : ""}
            onChange={(e) => {
              if (e.target.value) {
                onChange(e.target.value);
              }
            }}
            style={{ fontSize: "10.5px", height: "20px", padding: "0 2px", flex: 1, minWidth: "52px" }}
          >
            <option value="">-- Personalizado --</option>
            {projectColors.map((c) => (
              <option key={c.id} value={c.valor}>
                {c.nombre}
              </option>
            ))}
          </select>
        )}
        <input
          type="color"
          className="color-picker-input"
          style={{ width: "20px", height: "20px", padding: 0, flexShrink: 0 }}
          value={value || "#ffffff"}
          onChange={(e) => onChange(e.target.value)}
        />
        <input
          type="text"
          className="color-hex-input"
          style={{ height: "20px", fontSize: "10.5px", width: "54px", flexShrink: 0 }}
          value={value || "#ffffff"}
          onChange={(e) => {
            const val = e.target.value;
            if (/^#[0-9A-F]{6}$/i.test(val)) {
              onChange(val);
            }
          }}
          placeholder="#ffffff"
        />
      </div>
    );

    if (isCompact) {
      return (
        <div className="inspector-cell" style={cellFlex ? { flex: cellFlex, minWidth: 0 } : undefined}>
          {label && (
            <div className="inspector-field-label" title={label}>
              <label className="inspector-label">{displayLabel || label}</label>
              {exposedProperty && renderExposedEye(exposedProperty, exposedPropertyLabel || label, true)}
            </div>
          )}
          <div className="inspector-field-control">
            {innerContent}
          </div>
        </div>
      );
    }

    return (
      <div className="inspector-field-row">
        <div className="inspector-field-label" title={label}>
          <label className="inspector-label">{label}</label>
          {exposedProperty && renderExposedEye(exposedProperty, exposedPropertyLabel || label, true)}
        </div>
        <div className="inspector-field-control">
          {innerContent}
        </div>
      </div>
    );
  };
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
          if (c.tipo === "container" || c.tipo === "list") {
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

  // Estados para gestión de subplantillas de Lista (SRS-072)
  const [selectedChildForTemplate, setSelectedChildForTemplate] = useState<string>("");
  const [newTemplateName, setNewTemplateName] = useState<string>("");
  const [newTemplateTag, setNewTemplateTag] = useState<string>("");

  // Estados para Galería de la Plantilla (SRS-020)
  const [showGallerySelector, setShowGallerySelector] = useState<boolean>(false);
  const [activeSelectorTarget, setActiveSelectorTarget] = useState<{ type: "override" | "default"; capaId: string } | null>(null);

  // Estados para las pestañas de selección de recursos (SRS-014)
  const [selectorTab, setSelectorTab] = useState<"project" | "user">("project");
  const [switchSelectorTab, setSwitchSelectorTab] = useState<"project" | "user">("project");

  useEffect(() => {
    setCanvasEditMode(false);
  }, [selectedLayerId]);

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (showDropdown && !target.closest(".template-actions-group")) {
        setShowDropdown(false);
      }
      if (activeSymbolPopover && !target.closest(".symbols-helper-container")) {
        setActiveSymbolPopover(null);
      }
    };
    document.addEventListener("click", handleOutsideClick);
    return () => {
      document.removeEventListener("click", handleOutsideClick);
    };
  }, [showDropdown, activeSymbolPopover]);

  // Resolver estructuras activas según la pestaña activa
  const plantillaActiva = activeTab === "frontal" ? tempPlantilla : tempPlantillaTrasera;
  useEffect(() => {
    if (plantillaActiva) {
      setTempExposedProperties(plantillaActiva.exposedProperties || []);
    } else {
      setTempExposedProperties([]);
    }
  }, [plantillaActiva, activeTab]);
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
    let finalPlantilla = tempPlantilla;
    if (finalPlantilla && (!finalPlantilla.exposedProperties || finalPlantilla.exposedProperties.length === 0)) {
      const list: ExposedProperty[] = [];
      (finalPlantilla.capas || []).forEach((capa: any) => {
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
      finalPlantilla = { ...finalPlantilla, exposedProperties: list };
    }

    let finalPlantillaTrasera = tempPlantillaTrasera;
    if (finalPlantillaTrasera && (!finalPlantillaTrasera.exposedProperties || finalPlantillaTrasera.exposedProperties.length === 0)) {
      const list: ExposedProperty[] = [];
      (finalPlantillaTrasera.capas || []).forEach((capa: any) => {
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
      finalPlantillaTrasera = { ...finalPlantillaTrasera, exposedProperties: list };
    }

    onSave(
      tempValoresCampos,
      tempCapasOverrides,
      tempValoresCamposTrasera,
      tempCapasOverridesTrasera,
      finalPlantilla,
      finalPlantillaTrasera
    );
  };

  const handleOpenExposedConfigModal = () => {
    if (!plantillaActiva) return;
    
    // Recorrido DFS jerárquico de capas
    const getHierarchicalLayers = (capas: any[]) => {
      const result: any[] = [];
      const visited = new Set<string>();
      const visit = (parentId: string | null) => {
        const children = capas.filter(c => c.parentCapaId === parentId);
        for (const child of children) {
          if (visited.has(child.id)) continue;
          visited.add(child.id);
          result.push(child);
          visit(child.id);
        }
      };
      visit(null);
      capas.forEach(c => {
        if (!visited.has(c.id)) {
          result.push(c);
        }
      });
      return result;
    };

    const capasOrdenadas = getHierarchicalLayers(plantillaActiva.capas || []);

    const ordenarPropiedadesExpuestas = (propiedades: ExposedProperty[]) => {
      return [...propiedades].sort((a, b) => {
        const idxA = capasOrdenadas.findIndex(c => c.id === a.layerId);
        const idxB = capasOrdenadas.findIndex(c => c.id === b.layerId);
        if (idxA !== idxB) return idxA - idxB;
        
        const wA = PROPERTY_WEIGHTS[a.property] ?? 100;
        const wB = PROPERTY_WEIGHTS[b.property] ?? 100;
        if (wA !== wB) return wA - wB;
        return a.property.localeCompare(b.property);
      });
    };

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
    
    setTempExposedProperties(ordenarPropiedadesExpuestas(list));
    setShowExposedConfigModal(true);
  };

  // --- Añadir Elemento ---
  const handleAddElement = () => {
    if (!plantillaActiva) return;

    const isText = selectedNewType === "text";
    const isImage = selectedNewType === "image";
    const isImageSwitch = selectedNewType === "image-switch";
    const isContainer = selectedNewType === "container";
    const isList = selectedNewType === "list";
    const isBlock = selectedNewType === "block";
    const newId = `layer_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const newClave = `campo_${Date.now().toString().slice(-4)}`;

    // Resolver tamaño del padre (contenedor, lista o lienzo)
    const selectedCapa = selectedLayerId ? (plantillaActiva.capas || []).find((c: any) => c.id === selectedLayerId) : null;
    let parentId: string | null = null;
    if (selectedCapa) {
      if (selectedCapa.tipo === "container" || selectedCapa.tipo === "list") {
        parentId = selectedCapa.id;
      } else {
        parentId = selectedCapa.parentCapaId || null;
      }
    }

    const parentContainer = parentId ? (plantillaActiva.capas || []).find((c: any) => c.id === parentId) : null;
    const parentWidth = parentContainer ? parentContainer.anchoMm : cardConfig.anchoMm;
    const parentHeight = parentContainer ? parentContainer.altoMm : cardConfig.altoMm;

    let newLayer: any;
    if (isImage) {
      newLayer = {
        id: newId,
        nombre: "Nueva Imagen",
        visible: true,
        tipo: "image" as const,
        xMm: 0,
        yMm: 0,
        anchoMm: parentWidth,
        altoMm: parentHeight,
        src: "",
        modoAjuste: "contain" as const,
        tinteColor: null,
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
    } else if (isImageSwitch) {
      newLayer = {
        id: newId,
        nombre: "Nueva Imagen Switch",
        visible: true,
        tipo: "image-switch" as const,
        xMm: 0,
        yMm: 0,
        anchoMm: parentWidth,
        altoMm: parentHeight,
        src: "",
        options: [],
        selectedOptionId: undefined,
        modoAjuste: "contain" as const,
        tinteColor: null,
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
    } else if (isList) {
      newLayer = {
        id: newId,
        nombre: `lista_${Date.now().toString().slice(-4)}`,
        visible: true,
        tipo: "list" as const,
        xMm: Math.round((cardConfig.anchoMm * 0.1) * 10) / 10,
        yMm: Math.round((cardConfig.altoMm * 0.1) * 10) / 10,
        anchoMm: 50,
        altoMm: 50,
        parentCapaId: null,
        layout: "vertical" as const,
        childTemplates: [],
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
      // 12pt en mm: 12 * 25.4 / 72 = 4.23 mm
      // Para evitar que se recorte visualmente se establece el alto inicial al doble (8.46 mm)
      const fontSizePt = 12;
      const initialHeightMm = (Math.round((fontSizePt * 25.4 / 72) * 100) / 100) * 2;
      newLayer = {
        id: newId,
        nombre: newClave,
        visible: true,
        tipo: "text" as const,
        xMm: 0,
        yMm: 0,
        anchoMm: parentWidth,
        altoMm: initialHeightMm,
        fontFamily: "sans-serif",
        fontSizePt: fontSizePt,
        color: "#000000",
        alineacion: "center" as const,
        bold: false,
        italic: false,
        contenidoRaw: defaultText,
        multiline: false,
        lineHeight: 1.2,
        alineacionVertical: "top" as const,
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

      const selectedCapa = selectedLayerId ? updatedCapas.find((c) => c.id === selectedLayerId) : null;
      let parentId: string | null = null;

      if (selectedCapa) {
        if (selectedCapa.tipo === "container" || selectedCapa.tipo === "list") {
          parentId = selectedCapa.id;
        } else {
          parentId = selectedCapa.parentCapaId || null;
        }
      }

      const layerWithParent = { ...newLayer, parentCapaId: parentId };

      let insertIndex = -1;
      if (!selectedCapa) {
        // Sin selección: insertar después del último elemento en la raíz
        for (let i = updatedCapas.length - 1; i >= 0; i--) {
          if (!updatedCapas[i].parentCapaId) {
            insertIndex = i;
            break;
          }
        }
        if (insertIndex !== -1) {
          updatedCapas.splice(insertIndex + 1, 0, layerWithParent);
        } else {
          updatedCapas.push(layerWithParent);
        }
      } else if (selectedCapa.tipo === "container" || selectedCapa.tipo === "list") {
        // Contenedor seleccionado: dentro del contenedor al final de sus hijos
        let lastChildIndex = -1;
        for (let i = updatedCapas.length - 1; i >= 0; i--) {
          if (updatedCapas[i].parentCapaId === selectedCapa.id) {
            lastChildIndex = i;
            break;
          }
        }
        if (lastChildIndex !== -1) {
          updatedCapas.splice(lastChildIndex + 1, 0, layerWithParent);
        } else {
          // Si no tiene hijos, directamente después del contenedor mismo
          const containerIndex = updatedCapas.findIndex(c => c.id === selectedCapa.id);
          updatedCapas.splice(containerIndex + 1, 0, layerWithParent);
        }
      } else {
        // No es contenedor: insertar en el mismo padre, directamente después del seleccionado
        const selectedIndex = updatedCapas.findIndex(c => c.id === selectedCapa.id);
        updatedCapas.splice(selectedIndex + 1, 0, layerWithParent);
      }

      // Registrar variable si es de texto
      if (newCampo && !updatedCamposConfig.some((f) => f.clave === newClave)) {
        updatedCamposConfig.push(newCampo);
      }

      const nextExposed = [...(prev.exposedProperties || [])];
      if (isText) {
        nextExposed.push({
          layerId: newId,
          property: "contenidoRaw",
          label: `${newLayer.nombre} > Contenido Texto`
        });
      } else if (isImage || isImageSwitch) {
        nextExposed.push({
          layerId: newId,
          property: "src",
          label: `${newLayer.nombre} > Recurso Imagen`
        });
      } else if (isList) {
        nextExposed.push({
          layerId: newId,
          property: "items",
          label: `${newLayer.nombre} > Elementos Lista`
        });
      }

      return {
        ...prev,
        capas: updatedCapas,
        camposConfig: updatedCamposConfig,
        exposedProperties: nextExposed
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
    const overridesActivos = activeTab === "frontal" ? tempCapasOverrides : tempCapasOverridesTrasera;
    const updatedTemplate = prepararPlantillaParaExportacion(plantillaActiva, name, valoresActivos, idOverride, overridesActivos);

    // Generar miniatura JPEG Base64 de la plantilla (SRS-069)
    try {
      const miniatura = await generarMiniaturaPlantilla(
        updatedTemplate,
        plantillaActiva.anchoMm || cardConfig.anchoMm,
        plantillaActiva.altoMm || cardConfig.altoMm
      );
      if (miniatura) {
        updatedTemplate.miniatura = miniatura;
      }
    } catch (thumbErr) {
      console.warn("[thumbnail] No se pudo generar la miniatura:", thumbErr);
    }

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

        finalTemplate = {
          ...updatedTemplate,
          capas: zipCapas,
          assets: [],
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
  const handleUserAssetUpload = (file: File, callback: (src: string) => void) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      if (onAddUserAsset) {
        onAddUserAsset(file.name, base64);
      }
      callback(base64);
    };
    reader.readAsDataURL(file);
  };


  const handleSelectGalleryAsset = (assetSrc: string) => {
    if (!activeSelectorTarget) return;
    const { capaId } = activeSelectorTarget;
    handleUpdateCapaProp(capaId, "src", assetSrc);
    setTempCapasOverridesActivos((prev) => ({
      ...prev,
      [capaId]: {
        ...(prev[capaId] || {}),
        src: assetSrc,
      },
    }));
    setShowGallerySelector(false);
    setActiveSelectorTarget(null);
  };

  // --- Arrastrar y Redimensionar en el Lienzo (SRS-049 / SRS-090) ---
  const handleLayerCanvasMouseDown = (e: React.MouseEvent, capa: any, mode: "drag" | "resize") => {
    e.stopPropagation();
    e.preventDefault();

    const startX = e.clientX;
    const startY = e.clientY;
    const initialXMm = capa.xMm;
    const initialYMm = capa.yMm;
    const initialAnchoMm = capa.anchoMm;
    const initialAltoMm = capa.altoMm;
    let hasMoved = false;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const deltaX = moveEvent.clientX - startX;
      const deltaY = moveEvent.clientY - startY;
      
      const deltaXMm = deltaX / scale;
      const deltaYMm = deltaY / scale;

      const isFirstMove = !hasMoved;
      if (isFirstMove) {
        hasMoved = true;
      }
      const opts = isFirstMove ? undefined : { skipHistory: true };

      if (mode === "drag") {
        const nextX = Number((initialXMm + deltaXMm).toFixed(1));
        const nextY = Number((initialYMm + deltaYMm).toFixed(1));
        const updater = (prev: any) => ({
          ...prev,
          capas: prev.capas.map((c: any) => (c.id === capa.id ? { ...c, xMm: nextX, yMm: nextY } : c))
        });
        if (activeTab === "frontal") setTempPlantilla(updater, opts);
        else setTempPlantillaTrasera(updater, opts);
      } else if (mode === "resize") {
        const nextAncho = Math.max(2.0, Number((initialAnchoMm + deltaXMm).toFixed(1)));
        const nextAlto = Math.max(2.0, Number((initialAltoMm + deltaYMm).toFixed(1)));
        const updater = (prev: any) => ({
          ...prev,
          capas: prev.capas.map((c: any) => (c.id === capa.id ? { ...c, anchoMm: nextAncho, altoMm: nextAlto } : c))
        });
        if (activeTab === "frontal") setTempPlantilla(updater, opts);
        else setTempPlantillaTrasera(updater, opts);
      }
    };

    const handleMouseUp = () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
  };

  // --- Modificar Propiedad de Capa ---
  const handleUpdateCapaProp = (capaId: string, propKey: string, propVal: any, opts?: { skipHistory?: boolean }) => {
    const originalLayer = plantillaActiva?.capas?.find((c: any) => c.id === capaId);
    const oldNombre = originalLayer ? originalLayer.nombre : "";

    const updater = (prev: any) => {
      const updatedCapas = prev.capas.map((c: any) => {
        if (c.id === capaId) {
          let updatedObj = {
            ...c,
            [propKey]: propVal
          };
          return updatedObj;
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

      let nextExposed = prev.exposedProperties || [];
      if (propKey === "nombre") {
        nextExposed = nextExposed.map((p: any) => {
          if (p.layerId === capaId) {
            const oldPrefix = oldNombre ? `${oldNombre} >` : "";
            const newPrefix = `${propVal} >`;
            if (oldPrefix && p.label.startsWith(oldPrefix)) {
              return { ...p, label: p.label.replace(oldPrefix, newPrefix) };
            } else {
              const parts = p.label.split(" > ");
              if (parts.length > 1) {
                return { ...p, label: `${propVal} > ${parts.slice(1).join(" > ")}` };
              }
              return { ...p, label: `${propVal} > ${p.property}` };
            }
          }
          return p;
        });
      }

      return {
        ...prev,
        capas: updatedCapas,
        exposedProperties: nextExposed
      };
    };

    if (activeTab === "frontal") {
      setTempPlantilla(updater, opts);
      if (propKey === "nombre") {
        setTempExposedProperties((prev) => prev.map((p: any) => {
          if (p.layerId === capaId) {
            const oldPrefix = oldNombre ? `${oldNombre} >` : "";
            const newPrefix = `${propVal} >`;
            if (oldPrefix && p.label.startsWith(oldPrefix)) {
              return { ...p, label: p.label.replace(oldPrefix, newPrefix) };
            } else {
              const parts = p.label.split(" > ");
              if (parts.length > 1) {
                return { ...p, label: `${propVal} > ${parts.slice(1).join(" > ")}` };
              }
              return { ...p, label: `${propVal} > ${p.property}` };
            }
          }
          return p;
        }));
      }
    } else {
      setTempPlantillaTrasera(updater, opts);
      if (propKey === "nombre") {
        setTempExposedProperties((prev) => prev.map((p: any) => {
          if (p.layerId === capaId) {
            const oldPrefix = oldNombre ? `${oldNombre} >` : "";
            const newPrefix = `${propVal} >`;
            if (oldPrefix && p.label.startsWith(oldPrefix)) {
              return { ...p, label: p.label.replace(oldPrefix, newPrefix) };
            } else {
              const parts = p.label.split(" > ");
              if (parts.length > 1) {
                return { ...p, label: `${propVal} > ${parts.slice(1).join(" > ")}` };
              }
              return { ...p, label: `${propVal} > ${p.property}` };
            }
          }
          return p;
        }));
      }
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
      if (parentCapa && (parentCapa.tipo === "container" || parentCapa.tipo === "list")) {
        anchoCarta = parentCapa.anchoMm || 0;
        altoCarta = parentCapa.altoMm || 0;
      }
    } else {
      // Sumar el sangrado para las capas raíz del lienzo
      anchoCarta += 2 * (cardConfig.sangradoMm || 0);
      altoCarta += 2 * (cardConfig.sangradoMm || 0);
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

    const parentId = capa.parentCapaId || null;

    const updater = (prev: any) => {
      const nextCapas = [...prev.capas];
      
      const rebuildFlatLayers = (allLayers: any[], parentIdToSwap: string | null, targetId: string, dir: "up" | "down"): any[] => {
        const result: any[] = [];
        const traverse = (currentParentId: string | null) => {
          const children = allLayers.filter(c => (c.parentCapaId || null) === currentParentId);
          if (currentParentId === parentIdToSwap) {
            const idx = children.findIndex(c => c.id === targetId);
            if (idx !== -1) {
              if (dir === "up" && idx > 0) {
                if (children[idx - 1].tipo !== "background") {
                  const temp = children[idx];
                  children[idx] = children[idx - 1];
                  children[idx - 1] = temp;
                }
              } else if (dir === "down" && idx < children.length - 1) {
                const temp = children[idx];
                children[idx] = children[idx + 1];
                children[idx + 1] = temp;
              }
            }
          }
          for (const child of children) {
            result.push(child);
            traverse(child.id);
          }
        };
        traverse(null);
        
        for (const layer of allLayers) {
          if (!result.some(r => r.id === layer.id)) {
            result.push(layer);
          }
        }
        return result;
      };

      const updatedCapas = rebuildFlatLayers(nextCapas, parentId, capaId, direction);

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

      if (targetLayer.tipo === "container" || targetLayer.tipo === "list") {
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

      const nodeNewNombre = node.nombre || (node.tipo === "image" ? "Imagen" : node.tipo === "image-switch" ? "Imagen Switch" : node.tipo === "container" ? "Contenedor" : node.tipo === "list" ? "Lista" : node.tipo === "block" ? "Bloque" : "Texto");

      const dupNode = {
        ...node,
        id: nodeNewId,
        nombre: nodeNewNombre,
        parentCapaId: parentNewId,
        options: node.tipo === "image-switch" && node.options ? node.options.map((opt: any) => ({ ...opt })) : undefined,
      };

      if (node.tipo === "text") {
        const oldNombre = node.nombre || "texto";
        const newNombre = nodeNewNombre;

        const origCampo = plantillaActiva.camposConfig?.find((f: any) => f.clave === oldNombre);
        let copiedCampoConfig = null;
        
        const currentValFront = tempValoresCampos[node.id];
        const currentValBack = tempValoresCamposTrasera[node.id];
        const initialVal = (activeTab === "frontal" ? currentValFront : currentValBack) !== undefined
          ? (activeTab === "frontal" ? currentValFront : currentValBack)
          : (origCampo ? origCampo.valorDefecto : node.contenidoRaw || "");

        if (origCampo) {
          copiedCampoConfig = {
            ...origCampo,
            clave: newNombre,
            nombreLegible: newNombre
          };
        } else {
          copiedCampoConfig = {
            clave: newNombre,
            nombreLegible: newNombre,
            tipo: "text",
            valorDefecto: node.contenidoRaw || ""
          };
        }

        console.log("[CDC DUPLICATE] text layer cloned:", node.id, "->", nodeNewId, "initialVal:", initialVal);
        fieldsToDuplicate.push({ oldClave: node.id, newClave: nodeNewId, copiedCampoConfig, initialVal });
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

      const nextExposed = [...(prev.exposedProperties || [])];
      for (const item of overridesToDuplicate) {
        const relatedExposed = (prev.exposedProperties || []).filter((p: any) => p.layerId === item.oldId);
        for (const exp of relatedExposed) {
          const newLayer = duplicatedLayers.find((l) => l.id === item.newId);
          const newName = newLayer ? newLayer.nombre : "Copia";
          
          let newLabel = exp.label;
          const oldLayer = prev.capas.find((l: any) => l.id === item.oldId);
          if (oldLayer && oldLayer.nombre) {
            newLabel = exp.label.replace(new RegExp(`^${oldLayer.nombre} >`), `${newName} >`);
          }

          nextExposed.push({
            layerId: item.newId,
            property: exp.property,
            label: newLabel
          });
        }
      }

      return {
        ...prev,
        capas: nextCapas,
        camposConfig: nextCamposConfig,
        exposedProperties: nextExposed
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

    // Duplicar exposedProperties
    setTempExposedProperties((prev) => {
      const nextExposed = [...prev];
      for (const item of overridesToDuplicate) {
        const relatedExposed = prev.filter((p) => p.layerId === item.oldId);
        for (const exp of relatedExposed) {
          const newLayer = duplicatedLayers.find((l) => l.id === item.newId);
          const newName = newLayer ? newLayer.nombre : "Copia";
          
          let newLabel = exp.label;
          const oldLayer = plantillaActiva.capas.find((l: any) => l.id === item.oldId);
          if (oldLayer && oldLayer.nombre) {
            newLabel = exp.label.replace(new RegExp(`^${oldLayer.nombre} >`), `${newName} >`);
          }

          nextExposed.push({
            layerId: item.newId,
            property: exp.property,
            label: newLabel
          });
        }
      }
      return nextExposed;
    });

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

    // Obtener recursivamente todos los IDs descendientes
    const getDescendantIds = (parentId: string): string[] => {
      const ids: string[] = [];
      const children = plantillaActiva.capas?.filter((c: any) => c.parentCapaId === parentId) || [];
      for (const child of children) {
        ids.push(child.id);
        ids.push(...getDescendantIds(child.id));
      }
      return ids;
    };

    const idsToDelete = [capaId, ...getDescendantIds(capaId)];

    const updater = (prev: any) => {
      const nextCapas = prev.capas.filter((c: any) => !idsToDelete.includes(c.id));
      
      let nextCamposConfig = [...(prev.camposConfig || [])];
      for (const id of idsToDelete) {
        const deletedCapa = prev.capas.find((c: any) => c.id === id);
        if (deletedCapa && deletedCapa.tipo === "text") {
          const name = deletedCapa.nombre;
          if (name) {
            const isNameUsed = nextCapas.some((c: any) => c.tipo === "text" && c.nombre === name);
            if (!isNameUsed) {
              nextCamposConfig = nextCamposConfig.filter((f: any) => f.clave !== name);
            }
          }
        }
      }

      const nextExposed = (prev.exposedProperties || []).filter((p: any) => !idsToDelete.includes(p.layerId));

      return {
        ...prev,
        capas: nextCapas,
        camposConfig: nextCamposConfig,
        exposedProperties: nextExposed
      };
    };

    if (activeTab === "frontal") {
      setTempPlantilla(updater);
      setTempCapasOverrides((prev: any) => {
        const next = { ...prev };
        for (const id of idsToDelete) {
          delete next[id];
        }
        return next;
      });
      setTempValoresCampos((prev: any) => {
        const next = { ...prev };
        for (const id of idsToDelete) {
          delete next[id];
        }
        return next;
      });
    } else {
      setTempPlantillaTrasera(updater);
      setTempCapasOverridesTrasera((prev: any) => {
        const next = { ...prev };
        for (const id of idsToDelete) {
          delete next[id];
        }
        return next;
      });
      setTempValoresCamposTrasera((prev: any) => {
        const next = { ...prev };
        for (const id of idsToDelete) {
          delete next[id];
        }
        return next;
      });
    }
    if (!selectedLayerId || idsToDelete.includes(selectedLayerId)) {
      setSelectedLayerId(null);
    }
  };

  // --- Gestión de Subplantillas para Capas de tipo Lista (SRS-072) ---
  const handleSaveChildAsTemplate = (listCapaId: string) => {
    if (!plantillaActiva || !selectedChildForTemplate) return;
    const rootCapa = (plantillaActiva.capas || []).find((c: any) => c.id === selectedChildForTemplate);
    if (!rootCapa) return;

    const getDescendants = (parentId: string): any[] => {
      const descendants: any[] = [];
      const children = (plantillaActiva.capas || []).filter((c: any) => c.parentCapaId === parentId);
      for (const ch of children) {
        descendants.push(ch);
        descendants.push(...getDescendants(ch.id));
      }
      return descendants;
    };

    const descendantCapas = getDescendants(rootCapa.id);
    const allTreeIds = new Set([rootCapa.id, ...descendantCapas.map(d => d.id)]);
    const exposedProps = (tempExposedProperties || []).filter(ep => allTreeIds.has(ep.layerId));

    const newTmpl: ChildTemplate = {
      id: `tmpl_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      name: newTemplateName.trim() || rootCapa.nombre || "Subplantilla",
      tag: (newTemplateTag.trim() || (rootCapa.nombre || "item")).toLowerCase().replace(/\s+/g, "_"),
      rootCapa: JSON.parse(JSON.stringify(rootCapa)),
      descendantCapas: JSON.parse(JSON.stringify(descendantCapas)),
      exposedProperties: JSON.parse(JSON.stringify(exposedProps))
    };

    const targetList = (plantillaActiva.capas || []).find((c: any) => c.id === listCapaId);
    const currentTemplates = targetList?.childTemplates || [];
    handleUpdateCapaProp(listCapaId, "childTemplates", [...currentTemplates, newTmpl]);

    setSelectedChildForTemplate("");
    setNewTemplateName("");
    setNewTemplateTag("");
  };

  const handleUpdateChildTemplate = (listCapaId: string, tmplId: string, updates: Partial<ChildTemplate>) => {
    if (!plantillaActiva) return;
    const targetList = (plantillaActiva.capas || []).find((c: any) => c.id === listCapaId);
    if (!targetList) return;
    const currentTemplates = targetList.childTemplates || [];
    const updated = currentTemplates.map((t: ChildTemplate) =>
      t.id === tmplId ? { ...t, ...updates } : t
    );
    handleUpdateCapaProp(listCapaId, "childTemplates", updated);
  };

  const handleDeleteChildTemplate = (listCapaId: string, tmplId: string) => {
    if (!plantillaActiva) return;
    const targetList = (plantillaActiva.capas || []).find((c: any) => c.id === listCapaId);
    if (!targetList) return;
    const currentTemplates = targetList.childTemplates || [];
    const updated = currentTemplates.filter((t: ChildTemplate) => t.id !== tmplId);
    handleUpdateCapaProp(listCapaId, "childTemplates", updated);
  };

  const handleInstantiateChildTemplate = (listCapaId: string, tmpl: ChildTemplate) => {
    if (!plantillaActiva) return;
    const { newRoot, newDescendants, idMap } = cloneLayerTreeWithNewIds(
      tmpl.rootCapa,
      tmpl.descendantCapas || [],
      listCapaId
    );
    newRoot.originTemplateId = tmpl.id;

    const newExposedProps = (tmpl.exposedProperties || []).map((ep: any) => {
      const newLayerId = idMap.get(ep.layerId);
      if (!newLayerId) return null;
      return {
        ...ep,
        layerId: newLayerId
      };
    }).filter(Boolean);

    const updater = (prev: any) => {
      return {
        ...prev,
        capas: [...prev.capas, newRoot, ...newDescendants],
        exposedProperties: [...(prev.exposedProperties || []), ...newExposedProps]
      };
    };

    if (activeTab === "frontal") {
      setTempPlantilla(updater);
    } else {
      setTempPlantillaTrasera(updater);
    }
    setTempExposedProperties(prev => [...prev, ...newExposedProps]);
    setSelectedLayerId(newRoot.id);
  };

  // --- Modificar Clave de Capa (Sincronizada con camposConfig y valores de carta) ---
  const handleUpdateCapaClave = (capaId: string, oldClave: string | null, newClave: string) => {
    const sanitizedClave = newClave.replace(/[^a-zA-Z0-9_ ]/g, "").replace(/\s+/g, " ").trim();
    if (!sanitizedClave) return;

    const oldName = oldClave || "";

    const syncExposedList = (exposedList: any[]) => {
      if (!exposedList) return [];
      return exposedList.map((p: any) => {
        if (p.layerId === capaId) {
          const oldPrefix = oldName ? `${oldName} >` : "";
          const newPrefix = `${sanitizedClave} >`;
          if (oldPrefix && p.label.startsWith(oldPrefix)) {
            return { ...p, label: p.label.replace(oldPrefix, newPrefix) };
          } else {
            const parts = p.label.split(" > ");
            if (parts.length > 1) {
              return { ...p, label: `${sanitizedClave} > ${parts.slice(1).join(" > ")}` };
            }
            return { ...p, label: `${sanitizedClave} > ${p.property}` };
          }
        }
        return p;
      });
    };

    if (activeTab === "frontal") {
      const result = actualizarClavePlantillaYValores(
        tempPlantilla,
        tempValoresCampos,
        capaId,
        oldClave,
        sanitizedClave
      );
      
      const nextExposed = syncExposedList(result.plantilla.exposedProperties || []);
      result.plantilla.exposedProperties = nextExposed;

      setTempPlantilla(result.plantilla);
      setTempValoresCampos(result.valoresCampos);
      setTempExposedProperties(nextExposed);
    } else {
      const result = actualizarClavePlantillaYValores(
        tempPlantillaTrasera,
        tempValoresCamposTrasera,
        capaId,
        oldClave,
        sanitizedClave
      );

      const nextExposed = syncExposedList(result.plantilla.exposedProperties || []);
      result.plantilla.exposedProperties = nextExposed;

      setTempPlantillaTrasera(result.plantilla);
      setTempValoresCamposTrasera(result.valoresCampos);
      setTempExposedProperties(nextExposed);
    }
  };

  const togglePropertyExposed = (layerId: string, property: string, propertyLabel: string) => {
    if (!plantillaActiva) return;
    const currentExposed = plantillaActiva.exposedProperties || [];
    const isExposed = currentExposed.some((p: any) => p.layerId === layerId && p.property === property);

    let nextExposed = [];
    if (isExposed) {
      nextExposed = currentExposed.filter((p: any) => !(p.layerId === layerId && p.property === property));
    } else {
      const layer = plantillaActiva.capas?.find((c: any) => c.id === layerId);
      const layerName = layer ? layer.nombre : "Capa";
      nextExposed = [
        ...currentExposed,
        {
          layerId,
          property,
          label: `${layerName} > ${propertyLabel}`
        }
      ];
    }

    const updater = (prev: any) => {
      let updatedCapas = prev.capas;
      if (!isExposed && property.startsWith("border") && property.endsWith("Color")) {
        updatedCapas = (prev.capas || []).map((c: any) => {
          if (c.id === layerId && (c[property] === undefined || c[property] === "")) {
            return {
              ...c,
              [property]: c.borderTopColor || c.borderColor || "#000000"
            };
          }
          return c;
        });
      }
      return {
        ...prev,
        capas: updatedCapas,
        exposedProperties: nextExposed
      };
    };

    if (activeTab === "frontal") {
      setTempPlantilla(updater);
    } else {
      setTempPlantillaTrasera(updater);
    }
  };

  const [editingExposedDescProp, setEditingExposedDescProp] = useState<{ layerId: string; property: string; label: string } | null>(null);
  const [draftExposedDesc, setDraftExposedDesc] = useState<string>("");

  const updateExposedPropertyDescription = (layerId: string, property: string, description: string) => {
    if (!plantillaActiva) return;
    const currentExposed = plantillaActiva.exposedProperties || [];
    const nextExposed = currentExposed.map((p: any) =>
      p.layerId === layerId && p.property === property
        ? { ...p, description: description.trim() || undefined }
        : p
    );
    const updater = (prev: any) => ({
      ...prev,
      exposedProperties: nextExposed
    });
    if (activeTab === "frontal") {
      setTempPlantilla(updater);
    } else {
      setTempPlantillaTrasera(updater);
    }
  };

  const renderExposedEye = (property: string, propertyLabel: string, isCompact: boolean = false) => {
    if (!selectedCapa) return null;
    const currentExposed = plantillaActiva.exposedProperties || [];
    const exposedItem = currentExposed.find((p: any) => p.layerId === selectedCapa.id && p.property === property);
    const isExposed = !!exposedItem;
    const hasCustomDesc = !!(exposedItem?.description && exposedItem.description.trim());
    const isPopoverOpen = editingExposedDescProp?.layerId === selectedCapa.id && editingExposedDescProp?.property === property;

    return (
      <div
        style={{
          marginLeft: isCompact ? "2px" : "auto",
          display: "inline-flex",
          alignItems: "center",
          gap: "2px",
          position: "relative"
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            if (isExposed && isPopoverOpen) {
              setEditingExposedDescProp(null);
            }
            togglePropertyExposed(selectedCapa.id, property, propertyLabel);
          }}
          title={isExposed ? `Ocultar ${propertyLabel}` : `Exponer ${propertyLabel}`}
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            fontSize: isCompact ? "11px" : "14px",
            padding: isCompact ? "0 2px" : "2px 4px",
            opacity: isExposed ? 1 : 0.3,
            color: isExposed ? "var(--accent-primary)" : "inherit",
            transition: "opacity 0.2s ease, color 0.2s ease",
            display: "flex",
            alignItems: "center"
          }}
        >
          👁️
        </button>
        {isExposed && (
          <button
            type="button"
            className="exposed-desc-trigger-btn"
            onClick={(e) => {
              e.stopPropagation();
              if (isPopoverOpen) {
                setEditingExposedDescProp(null);
              } else {
                setDraftExposedDesc(exposedItem?.description || "");
                setEditingExposedDescProp({ layerId: selectedCapa.id, property, label: propertyLabel });
              }
            }}
            title={
              hasCustomDesc
                ? `Aclaración específica: ${exposedItem.description}`
                : `Añadir aclaración específica para ${propertyLabel}`
            }
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              fontSize: isCompact ? "10px" : "12px",
              padding: isCompact ? "0 2px" : "2px 4px",
              opacity: hasCustomDesc || isPopoverOpen ? 1 : 0.45,
              color: hasCustomDesc ? "var(--accent-primary)" : "inherit",
              display: "flex",
              alignItems: "center"
            }}
          >
            📝
          </button>
        )}
        {isExposed && isPopoverOpen && (
          <div
            className="exposed-desc-popover"
            onClick={(e) => e.stopPropagation()}
            style={{
              position: "absolute",
              right: 0,
              top: "100%",
              marginTop: "4px",
              zIndex: 500,
              width: "240px",
              backgroundColor: "var(--bg-card)",
              border: "1px solid var(--border-color)",
              borderRadius: "6px",
              padding: "10px",
              boxShadow: "0 6px 18px rgba(0,0,0,0.28)",
              display: "flex",
              flexDirection: "column",
              gap: "6px",
              textAlign: "left"
            }}
          >
            <div style={{ fontSize: "11px", fontWeight: 600, color: "var(--text-primary)" }}>
              Aclaración para {propertyLabel}
            </div>
            {selectedCapa.descripcion && (
              <div style={{ fontSize: "10px", color: "var(--text-secondary)", fontStyle: "italic", lineHeight: 1.3 }}>
                Base del elemento: &ldquo;{selectedCapa.descripcion}&rdquo;
              </div>
            )}
            <textarea
              className="exposed-desc-popover-textarea"
              rows={3}
              value={draftExposedDesc}
              onChange={(e) => setDraftExposedDesc(e.target.value)}
              placeholder={
                selectedCapa.descripcion
                  ? `Hereda: "${selectedCapa.descripcion}" (escribe aquí para personalizar esta propiedad)...`
                  : "Escribe una directriz o aclaración específica para esta propiedad..."
              }
              style={{
                width: "100%",
                fontSize: "11px",
                padding: "6px",
                backgroundColor: "var(--bg-app)",
                border: "1px solid var(--border-color)",
                borderRadius: "4px",
                color: "var(--text-primary)",
                resize: "vertical",
                fontFamily: "inherit",
                boxSizing: "border-box"
              }}
            />
            <div style={{ display: "flex", justifyContent: "flex-end", gap: "6px" }}>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setEditingExposedDescProp(null);
                }}
                style={{
                  padding: "3px 8px",
                  fontSize: "11px",
                  borderRadius: "4px",
                  border: "1px solid var(--border-color)",
                  backgroundColor: "var(--bg-app)",
                  color: "var(--text-secondary)",
                  cursor: "pointer"
                }}
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  updateExposedPropertyDescription(selectedCapa.id, property, draftExposedDesc);
                  setEditingExposedDescProp(null);
                }}
                style={{
                  padding: "3px 10px",
                  fontSize: "11px",
                  borderRadius: "4px",
                  border: "none",
                  backgroundColor: "var(--accent-primary)",
                  color: "#fff",
                  fontWeight: 600,
                  cursor: "pointer"
                }}
              >
                Aceptar
              </button>
            </div>
          </div>
        )}
      </div>
    );
  };

  // --- Obtener la capa actualmente seleccionada ---
  const selectedCapa = plantillaActiva?.capas?.find((c: any) => c.id === selectedLayerId);

  const handleUpdateCapaMultipleProps = (capaId: string, propsObj: Record<string, any>) => {
    const updater = (prev: any) => ({
      ...prev,
      capas: (prev.capas || []).map((c: any) => (c.id === capaId ? { ...c, ...propsObj } : c)),
    });
    if (activeTab === "frontal") {
      setTempPlantilla(updater);
    } else {
      setTempPlantillaTrasera(updater);
    }
    setTempCapasOverridesActivos((prev) => {
      if (!prev[capaId]) return prev;
      return {
        ...prev,
        [capaId]: {
          ...prev[capaId],
          ...propsObj,
        },
      };
    });
  };

  const handleUpdateBorderWidthGeneral = (capaId: string, val: number) => {
    handleUpdateCapaMultipleProps(capaId, {
      borderTopWidth: val,
      borderRightWidth: val,
      borderBottomWidth: val,
      borderLeftWidth: val,
    });
  };

  const handleUpdatePaddingGeneral = (capaId: string, val: number) => {
    handleUpdateCapaMultipleProps(capaId, {
      paddingTopMm: val,
      paddingRightMm: val,
      paddingBottomMm: val,
      paddingLeftMm: val,
    });
  };

  const handleUpdateBorderColorGeneral = (capaId: string, color: string) => {
    handleUpdateCapaMultipleProps(capaId, {
      borderTopColor: color,
      borderRightColor: color,
      borderBottomColor: color,
      borderLeftColor: color,
    });
  };

  const handleUpdateBorderRadiusGeneral = (capaId: string, radius: number) => {
    handleUpdateCapaMultipleProps(capaId, {
      borderTopLeftRadius: radius,
      borderTopRightRadius: radius,
      borderBottomRightRadius: radius,
      borderBottomLeftRadius: radius,
    });
  };

  const fieldKey = selectedCapa && selectedCapa.tipo === "text" ? selectedCapa.nombre : null;

  // Reverso a renderizar cuando no es dinámico
  const traseraUrl = carta.imagenTrasera || imagenTraseraComun;

  return (
    <div className="edit-modal-backdrop">
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
                        if (capa.layout === "vertical") subtitle = "Contenedor Vertical";
                        else if (capa.layout === "vertical-center") subtitle = "Contenedor Vertical Centrado";
                        else if (capa.layout === "vertical-reverse") subtitle = "Contenedor Vertical Inverso";
                        else if (capa.layout === "horizontal") subtitle = "Contenedor Horizontal";
                        else if (capa.layout === "horizontal-center") subtitle = "Contenedor Horizontal Centrado";
                        else if (capa.layout === "horizontal-reverse") subtitle = "Contenedor Horizontal Inverso";
                        else subtitle = "Contenedor Libre";
                      } else if (capa.tipo === "list") {
                        title = capa.nombre;
                        const tCount = capa.childTemplates?.length || 0;
                        subtitle = `Lista (${tCount} ${tCount === 1 ? "subplantilla" : "subplantillas"})`;
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
                        ? ((capa.tipo === "container" || capa.tipo === "list") ? "drag-over-container" : "drag-over")
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
                          {(capa.tipo === "container" || capa.tipo === "list") ? (
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
                            {capa.tipo === "background" ? "🎨" : (capa.tipo === "image" || capa.tipo === "image-switch") ? "🖼️" : capa.tipo === "container" ? "📦" : capa.tipo === "list" ? "📋" : capa.tipo === "block" ? "⬜" : "📝"}
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
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                {/* Botones de Deshacer y Rehacer (SRS-090) */}
                <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                  <button
                    type="button"
                    className="modal-history-btn"
                    onClick={undo}
                    disabled={!canUndo}
                    title="Deshacer (Ctrl+Z)"
                    aria-label="Deshacer"
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      width: "26px",
                      height: "22px",
                      padding: 0,
                      backgroundColor: canUndo ? "#272730" : "rgba(39, 39, 48, 0.4)",
                      border: "1px solid #3f3f4e",
                      borderRadius: "4px",
                      color: canUndo ? "#e2e8f0" : "#64748b",
                      cursor: canUndo ? "pointer" : "not-allowed",
                      fontSize: "13px",
                      lineHeight: 1,
                      transition: "all 0.15s ease",
                    }}
                  >
                    ↶
                  </button>
                  <button
                    type="button"
                    className="modal-history-btn"
                    onClick={redo}
                    disabled={!canRedo}
                    title="Rehacer (Ctrl+Y o Ctrl+Shift+Z)"
                    aria-label="Rehacer"
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      width: "26px",
                      height: "22px",
                      padding: 0,
                      backgroundColor: canRedo ? "#272730" : "rgba(39, 39, 48, 0.4)",
                      border: "1px solid #3f3f4e",
                      borderRadius: "4px",
                      color: canRedo ? "#e2e8f0" : "#64748b",
                      cursor: canRedo ? "pointer" : "not-allowed",
                      fontSize: "13px",
                      lineHeight: 1,
                      transition: "all 0.15s ease",
                    }}
                  >
                    ↷
                  </button>
                </div>

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
            </div>
            <div className="column-content preview-canvas-wrapper">
              <div
                className="edit-card-preview-frame"
                style={{
                  width: `${(cardConfig.anchoMm + 2 * (cardConfig.sangradoMm || 0)) * scale}px`,
                  height: `${(cardConfig.altoMm + 2 * (cardConfig.sangradoMm || 0)) * scale}px`,
                  border: "1px solid #cbd5e1",
                  position: "relative",
                  overflow: "hidden",
                  boxShadow: "0 10px 25px rgba(0, 0, 0, 0.4)",
                  backgroundColor: "#ffffff",
                }}
              >

                {plantillaActiva && plantillaActiva.capas && plantillaActiva.capas.length > 0 ? (
                  (() => {
                    const isSelfOrAncestor = (layerId: string, targetId: string | null, layers: any[]): boolean => {
                      if (!targetId) return false;
                      let curr: string | null = targetId;
                      while (curr) {
                        if (curr === layerId) return true;
                        const lObj = layers.find((x: any) => x.id === curr);
                        curr = lObj?.parentCapaId || null;
                      }
                      return false;
                    };

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
                        const isParentFlex = parentCapa && isFlexLayout(parentCapa.layout);
                        const isParentVertical = parentCapa && isVerticalLayout(parentCapa.layout);
                        const isParentHorizontal = parentCapa && isHorizontalLayout(parentCapa.layout);

                        const overrides = tempCapasOverridesActivos[capa.id];
                        const resolvedCapa = overrides ? { ...capa, ...overrides } : capa;

                        const isSelected = selectedLayerId === capa.id;
                        const isHovered = !canvasEditMode && hoveredLayerId === capa.id;

                        const activeVisibility = resolvedCapa.visibility || "visible";
                        const isHidden = activeVisibility === "hidden";
                        const isCollapsed = activeVisibility === "collapsed";
                        const isEditActive = isSelected && canvasEditMode;
                        const isZeroRotationActive = canvasEditMode && isSelfOrAncestor(capa.id, selectedLayerId, layers);

                        const isFreeContainer = (capa.tipo === "container" || capa.tipo === "list") && !isFlexLayout(resolvedCapa.layout);
                        const autoDims = isFreeContainer ? calculateAutoDimensionsForFreeContainer(resolvedCapa, layers, tempCapasOverridesActivos) : null;
                        const renderedWidth = resolvedCapa.anchoMm === "auto"
                          ? (autoDims ? `${autoDims.autoWidthMm * scale}px` : "fit-content")
                          : `${resolvedCapa.anchoMm * scale}px`;
                        const renderedHeight = resolvedCapa.altoMm === "auto"
                          ? (autoDims ? `${autoDims.autoHeightMm * scale}px` : "fit-content")
                          : `${resolvedCapa.altoMm * scale}px`;

                        const layerStyle: React.CSSProperties = {
                          position: isParentFlex ? "relative" : "absolute",
                          left: isParentFlex 
                            ? (isParentVertical ? `${resolvedCapa.xMm * scale}px` : undefined)
                            : `${resolvedCapa.xMm * scale}px`,
                          top: isParentFlex 
                            ? (isParentHorizontal ? `${resolvedCapa.yMm * scale}px` : undefined)
                            : `${resolvedCapa.yMm * scale}px`,
                          width: renderedWidth,
                          height: renderedHeight,
                          cursor: isEditActive ? "move" : (canvasEditMode ? "default" : "pointer"),
                          pointerEvents: (canvasEditMode && !isEditActive) ? "none" : "auto",
                          boxSizing: "border-box",
                          transition: "outline 0.1s ease",
                          outline: isEditActive
                            ? "2px dashed var(--accent-primary)"
                            : isSelected
                            ? "2px solid var(--accent-primary)"
                            : isHovered
                            ? "2px dashed var(--accent-primary-half, rgba(139, 92, 246, 0.5))"
                            : "none",
                          outlineOffset: "-1px",
                          zIndex: isSelected ? 10 : isHovered ? 9 : 1,
                          flexShrink: 0,
                          visibility: (isHidden && !isSelected) ? "hidden" : undefined,
                          display: (isCollapsed && !isSelected) ? "none" : undefined,
                          opacity: (isSelected && (isHidden || isCollapsed)) ? 0.4 : undefined,
                          transform: (!isZeroRotationActive && resolvedCapa.rotacion) ? `rotate(${resolvedCapa.rotacion}deg)` : undefined,
                          transformOrigin: (!isZeroRotationActive && resolvedCapa.rotacion) ? "center center" : undefined,
                        };

                        if (capa.tipo === "background") {
                          const colorFill = tempCapasOverridesActivos[capa.id]?.colorFill || capa.colorFill || "#ffffff";
                          return (
                            <div
                              key={capa.id}
                              style={{
                                ...layerStyle,
                                position: "absolute",
                                left: 0,
                                top: 0,
                                width: "100%",
                                height: "100%",
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
                                overflow: isEditActive ? "visible" : "hidden",
                              }}
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedLayerId(capa.id);
                              }}
                              onMouseDown={isEditActive ? (e) => handleLayerCanvasMouseDown(e, capa, "drag") : undefined}
                              onMouseEnter={() => setHoveredLayerId(capa.id)}
                              onMouseLeave={() => setHoveredLayerId(null)}
                            >
                              {isEditActive && (
                                <div
                                  className="canvas-resize-handle"
                                  onMouseDown={(e) => handleLayerCanvasMouseDown(e, capa, "resize")}
                                />
                              )}
                            </div>
                          );
                        }

                        if (capa.tipo === "container" || capa.tipo === "list") {
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

                          const isFlex = isFlexLayout(resolvedCapa.layout);
                          const flexStyle: React.CSSProperties = isFlex ? (getContainerFlexStyle(resolvedCapa.layout) || {}) : {};

                          return (
                            <div
                              key={capa.id}
                              style={{
                                ...layerStyle,
                                ...borderCornersStyle,
                                ...flexStyle,
                                display: (isCollapsed && !isSelected) ? "none" : (isFlex ? "flex" : undefined),
                                backgroundColor: resolvedCapa.backgroundColor || "transparent",
                                overflow: isEditActive ? "visible" : "hidden",
                              }}
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedLayerId(capa.id);
                              }}
                              onMouseDown={isEditActive ? (e) => handleLayerCanvasMouseDown(e, capa, "drag") : undefined}
                              onMouseEnter={() => setHoveredLayerId(capa.id)}
                              onMouseLeave={() => setHoveredLayerId(null)}
                            >
                              {renderCapaRecursiva(capa.id)}
                              {isEditActive && (
                                <div
                                  className="canvas-resize-handle"
                                  onMouseDown={(e) => handleLayerCanvasMouseDown(e, capa, "resize")}
                                />
                              )}
                            </div>
                          );
                        }

                        if (capa.tipo === "text") {
                          const overrides = tempCapasOverridesActivos[capa.id];
                          const resolvedCapa = overrides ? { ...capa, ...overrides } : capa;
                          const textoInterp = renderizarTextoCapa(resolvedCapa, tempValoresActivos, plantillaActiva?.capas);
                          const htmlText = parsearTextoConSimbolos(parseMarkdownToHtml(textoInterp), projectSymbols);
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
                                display: "flex",
                                flexDirection: "column",
                                justifyContent: (tempCapasOverridesActivos[capa.id]?.alineacionVertical || resolvedCapa.alineacionVertical) === "bottom" ? "flex-end" : (tempCapasOverridesActivos[capa.id]?.alineacionVertical || resolvedCapa.alineacionVertical) === "center" ? "center" : "flex-start",
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
                                WebkitTextStrokeWidth: (resolvedCapa.textOutlineWidth || 0) > 0 ? `${(resolvedCapa.textOutlineWidth || 0) * scale}px` : undefined,
                                WebkitTextStrokeColor: (resolvedCapa.textOutlineWidth || 0) > 0 ? (resolvedCapa.textOutlineColor || "#000000") : undefined,
                                paintOrder: (resolvedCapa.textOutlineWidth || 0) > 0 ? ("stroke fill" as any) : undefined,
                                whiteSpace: "pre-wrap",
                                wordBreak: "break-word",
                                lineHeight: (typeof resolvedCapa.lineHeight === "number" && resolvedCapa.lineHeight > 0 ? resolvedCapa.lineHeight : 1.2),
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
                              onMouseDown={isEditActive ? (e) => handleLayerCanvasMouseDown(e, capa, "drag") : undefined}
                              onMouseEnter={() => setHoveredLayerId(capa.id)}
                              onMouseLeave={() => setHoveredLayerId(null)}
                            >
                              <div dangerouslySetInnerHTML={{ __html: htmlText }} style={{ width: "100%" }} />
                              {isEditActive && (
                                <div
                                  className="canvas-resize-handle"
                                  onMouseDown={(e) => handleLayerCanvasMouseDown(e, capa, "resize")}
                                />
                              )}
                            </div>
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
                                overflow: isEditActive ? "visible" : "hidden",
                              }}
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedLayerId(capa.id);
                              }}
                              onMouseDown={isEditActive ? (e) => handleLayerCanvasMouseDown(e, capa, "drag") : undefined}
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
                              {isEditActive && (
                                <div
                                  className="canvas-resize-handle"
                                  onMouseDown={(e) => handleLayerCanvasMouseDown(e, capa, "resize")}
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
                      {selectedCapa.tipo === "background" ? "🎨" : (selectedCapa.tipo === "image" || selectedCapa.tipo === "image-switch") ? "🖼️" : selectedCapa.tipo === "container" ? "📦" : selectedCapa.tipo === "list" ? "📋" : selectedCapa.tipo === "block" ? "⬜" : "📝"}
                    </span>
                    <input
                      type="text"
                      className="inspector-header-input"
                      value={selectedCapa.nombre || ""}
                      title="Nombre de la Capa (Variable / Clave)"
                      onChange={(e) => {
                        if (selectedCapa.tipo === "text") {
                          handleUpdateCapaClave(selectedCapa.id, fieldKey, e.target.value);
                        } else {
                          handleUpdateCapaProp(selectedCapa.id, "nombre", e.target.value);
                        }
                      }}
                      style={{
                        fontSize: "12px",
                        fontWeight: "600",
                        border: "none",
                        borderBottom: "1px dashed var(--border-color)",
                        backgroundColor: "transparent",
                        color: "var(--text-primary)",
                        width: "100%",
                        padding: "0px 4px",
                        outline: "none"
                      }}
                    />
                  </div>
                  {/* SRS-082: Descripción semántica del elemento */}
                  <div className="inspector-layer-description" style={{ marginTop: "1px", marginBottom: "1px" }}>
                    <textarea
                      className="inspector-description-textarea"
                      rows={1}
                      value={selectedCapa.descripcion || ""}
                      placeholder="Directrices e indicaciones de este elemento para IA y maquetadores..."
                      title="Descripción semántica del elemento (se enviará en la API para guiar a agentes de IA y maquetadores)"
                      onChange={(e) => handleUpdateCapaProp(selectedCapa.id, "descripcion", e.target.value || undefined)}
                      style={{
                        width: "100%",
                        fontSize: "10.5px",
                        padding: "2px 6px",
                        backgroundColor: "var(--bg-app)",
                        border: "1px solid var(--border-color)",
                        borderRadius: "3px",
                        color: "var(--text-primary)",
                        resize: "vertical",
                        fontFamily: "inherit",
                        boxSizing: "border-box",
                        lineHeight: 1.25
                      }}
                    />
                  </div>
                  <hr className="inspector-separator" />

                  {/* Formulario Unificado de Propiedades en Tabla Densa (SRS-035 + SRS-083) */}
                  <div className="inspector-properties-form">
                    {/* Alineación y Posición (Común para text, image, image-switch, container, list, block) */}
                    {(selectedCapa.tipo === "text" || selectedCapa.tipo === "image" || selectedCapa.tipo === "image-switch" || selectedCapa.tipo === "container" || selectedCapa.tipo === "list" || selectedCapa.tipo === "block") && (
                      <div className="inspector-group-section">
                        <div className="inspector-group-header">
                          <h4 className="inspector-group-title">Posición y Dimensiones</h4>
                          {renderExposedEye("canvasEditMode", "Edición en Lienzo")}
                        </div>

                        <div className="inspector-table">
                          {/* Fila 1: Alineación Rápida + Botón Editar en Lienzo en la misma línea */}
                          <div className="inspector-field-row inspector-section">
                            <div className="inspector-cell" style={{ flex: 1, minWidth: 0 }}>
                              <div className="inspector-field-label" title="Alineación Rápida">
                                <label className="inspector-label">Alineación Rápida</label>
                              </div>
                              <div className="inspector-field-control">
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
                            </div>
                            <div className="inspector-cell" style={{ flex: "0 0 auto", marginLeft: "auto" }}>
                              <div className="inspector-field-control">
                                <button
                                  type="button"
                                  className="btn-sec"
                                  style={{
                                    height: "20px",
                                    padding: "1px 8px",
                                    fontSize: "10.5px",
                                    fontWeight: 600,
                                    borderRadius: "3px",
                                    border: "1px solid var(--border-color)",
                                    backgroundColor: canvasEditMode ? "var(--accent-primary)" : "var(--bg-app)",
                                    color: canvasEditMode ? "white" : "var(--text-primary)",
                                    cursor: "pointer",
                                    transition: "all 0.15s ease",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    gap: "3px",
                                    whiteSpace: "nowrap"
                                  }}
                                  onClick={() => setCanvasEditMode(!canvasEditMode)}
                                >
                                  {canvasEditMode ? "⏹️ Salir Lienzo" : "🖱️ Editar en Lienzo"}
                                </button>
                              </div>
                            </div>
                          </div>

                          {/* Fila 2: X, Y, W, H en una sola fila de 4 celdas con etiqueta a la izquierda */}
                          <div className="layout-form-grid-compact">
                            <div className="inspector-section-compact" title="Posición X (mm)">
                              <div style={{ display: "flex", alignItems: "center", gap: "1px", flexShrink: 0 }}>
                                <label className="inspector-label-compact" style={{ margin: 0 }}>X</label>
                                {renderExposedEye("xMm", "Posición X", true)}
                              </div>
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
                              <div style={{ display: "flex", alignItems: "center", gap: "1px", flexShrink: 0 }}>
                                <label className="inspector-label-compact" style={{ margin: 0 }}>Y</label>
                                {renderExposedEye("yMm", "Posición Y", true)}
                              </div>
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
                              <div style={{ display: "flex", alignItems: "center", gap: "1px", flexShrink: 0 }}>
                                <label className="inspector-label-compact" style={{ margin: 0 }}>W</label>
                                {renderExposedEye("anchoMm", "Ancho", true)}
                              </div>
                              <input
                                type={selectedCapa.anchoMm === "auto" ? "text" : "number"}
                                step="0.5"
                                className="inspector-input"
                                value={selectedCapa.anchoMm === "auto" ? "-" : (selectedCapa.anchoMm !== undefined ? selectedCapa.anchoMm : 20)}
                                onChange={(e) => {
                                  if (selectedCapa.anchoMm !== "auto") {
                                    handleUpdateCapaProp(selectedCapa.id, "anchoMm", Number(Number(e.target.value).toFixed(1)));
                                  }
                                }}
                                disabled={selectedCapa.tipo === "background" || selectedCapa.anchoMm === "auto"}
                              />
                            </div>
                            <div className="inspector-section-compact" title="Alto (mm)">
                              <div style={{ display: "flex", alignItems: "center", gap: "1px", flexShrink: 0 }}>
                                <label className="inspector-label-compact" style={{ margin: 0 }}>H</label>
                                {renderExposedEye("altoMm", "Alto", true)}
                              </div>
                              <input
                                type={selectedCapa.altoMm === "auto" ? "text" : "number"}
                                step="0.5"
                                className="inspector-input"
                                value={selectedCapa.altoMm === "auto" ? "-" : (selectedCapa.altoMm !== undefined ? selectedCapa.altoMm : 20)}
                                onChange={(e) => {
                                  if (selectedCapa.altoMm !== "auto") {
                                    handleUpdateCapaProp(selectedCapa.id, "altoMm", Number(Number(e.target.value).toFixed(1)));
                                  }
                                }}
                                disabled={selectedCapa.tipo === "background" || selectedCapa.altoMm === "auto"}
                              />
                            </div>
                          </div>

                          {/* Fila 3: Autoajuste (TKT-053 / SRS-050) + Padding compacto si es texto */}
                          {selectedCapa.tipo !== "background" && (
                            <div className="inspector-field-row">
                              <div className="inspector-cell">
                                <div className="inspector-field-label" title="Dimensiones Automáticas">
                                  <label className="inspector-label">Autoajuste</label>
                                </div>
                                <div className="inspector-field-control" style={{ gap: "8px" }}>
                                  <label style={{ display: "flex", alignItems: "center", gap: "3px", fontSize: "10.5px", color: "var(--text-secondary)", cursor: "pointer", userSelect: "none", whiteSpace: "nowrap" }}>
                                    <input
                                      type="checkbox"
                                      checked={selectedCapa.anchoMm === "auto"}
                                      onChange={(e) => {
                                        if (e.target.checked) {
                                          handleUpdateCapaProp(selectedCapa.id, "anchoMm", "auto");
                                        } else {
                                          handleUpdateCapaProp(selectedCapa.id, "anchoMm", 40);
                                        }
                                      }}
                                      style={{ width: "auto", margin: 0 }}
                                    />
                                    Ancho Auto
                                  </label>
                                  <label style={{ display: "flex", alignItems: "center", gap: "3px", fontSize: "10.5px", color: "var(--text-secondary)", cursor: "pointer", userSelect: "none", whiteSpace: "nowrap" }}>
                                    <input
                                      type="checkbox"
                                      checked={selectedCapa.altoMm === "auto"}
                                      onChange={(e) => {
                                        if (e.target.checked) {
                                          handleUpdateCapaProp(selectedCapa.id, "altoMm", "auto");
                                        } else {
                                          handleUpdateCapaProp(selectedCapa.id, "altoMm", 20);
                                        }
                                      }}
                                      style={{ width: "auto", margin: 0 }}
                                    />
                                    Alto Auto
                                  </label>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Padding del Texto en 1 sola línea (Solo text) */}
                    {selectedCapa.tipo === "text" && (
                      <div className="inspector-group-section">
                        <div className="inspector-table">
                          <div className="inspector-field-row inspector-section">
                            <div
                              className="inspector-cell"
                              onClick={() => setExpandPadding(!expandPadding)}
                              style={{ cursor: "pointer", flex: expandPadding ? 1 : 1.1 }}
                            >
                              <div className="inspector-field-label" title="Padding del Texto">
                                <h4 className="inspector-group-title" style={{ cursor: "pointer", margin: 0 }}>Padding del Texto</h4>
                                {renderExposedEye("paddingTopMm", "Padding Texto", true)}
                                <span className={`expand-toggle-icon ${expandPadding ? "expanded" : ""}`} style={{ marginLeft: "2px" }}>▶</span>
                              </div>
                            </div>
                            {!expandPadding && (
                              <div className="inspector-cell" style={{ flex: 0.9 }}>
                                <div className="inspector-field-label" title="Padding General (mm)">
                                  <label className="inspector-label">General (mm)</label>
                                </div>
                                <div className="inspector-field-control">
                                  <input
                                    type="number"
                                    step="0.5"
                                    min="0"
                                    className="inspector-input"
                                    value={selectedCapa.paddingTopMm !== undefined ? selectedCapa.paddingTopMm : 0}
                                    onChange={(e) => handleUpdatePaddingGeneral(selectedCapa.id, Number(e.target.value))}
                                  />
                                </div>
                              </div>
                            )}
                          </div>
                          {expandPadding && (
                            <div className="expanded-inputs-grid">
                              <div className="expanded-input-item">
                                <label>Sup.</label>
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
                                <label>Der.</label>
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
                                <label>Inf.</label>
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
                                <label>Izq.</label>
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
                      </div>
                    )}

                    {/* Visibilidad en 1 sola fila de 2 columnas (SRS-039 + SRS-083) */}
                    <div className="inspector-group-section">
                      <div className="inspector-group-header">
                        <h4 className="inspector-group-title">Visibilidad</h4>
                        {renderExposedEye("visibility", "Visibilidad")}
                      </div>

                      <div className="inspector-table">
                        <div className="inspector-field-row inspector-section">
                          <div className="inspector-cell">
                            <div className="inspector-field-label" title="Visibilidad de esta Carta (Anulación)">
                              <label className="inspector-label">Carta</label>
                            </div>
                            <div className="inspector-field-control">
                              <select
                                className="inspector-input"
                                value={tempCapasOverridesActivos[selectedCapa.id]?.visibility || ""}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setTempCapasOverridesActivos((prev) => ({
                                    ...prev,
                                    [selectedCapa.id]: {
                                      ...(prev[selectedCapa.id] || {}),
                                      visibility: val === "" ? undefined : val as any,
                                    },
                                  }));
                                }}
                              >
                                <option value="">(Heredar: {selectedCapa.visibility || "visible"})</option>
                                <option value="visible">Visible</option>
                                <option value="hidden">Invisible (espacio)</option>
                                <option value="collapsed">Eliminado</option>
                              </select>
                            </div>
                          </div>

                          <div className="inspector-cell">
                            <div className="inspector-field-label" title="Visibilidad por Defecto (Plantilla Base)">
                              <label className="inspector-label">Plantilla</label>
                            </div>
                            <div className="inspector-field-control">
                              <select
                                className="inspector-input"
                                value={selectedCapa.visibility || "visible"}
                                onChange={(e) => handleUpdateCapaProp(selectedCapa.id, "visibility", e.target.value)}
                              >
                                <option value="visible">Visible</option>
                                <option value="hidden">Invisible (espacio)</option>
                                <option value="collapsed">Eliminado</option>
                              </select>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Capa de Fondo (Background) */}
                    {selectedCapa.tipo === "background" && (
                      <div className="inspector-group-section">
                        <div className="inspector-group-header">
                          <h4 className="inspector-group-title">Apariencia del Fondo</h4>
                          {renderExposedEye("colorFill", "Color Relleno")}
                        </div>
                        <div className="inspector-table">
                          {renderColorSelector(
                            "Color de Relleno (Carta)",
                            tempCapasOverridesActivos[selectedCapa.id]?.colorFill || selectedCapa.colorFill || "#ffffff",
                            (val) => {
                              setTempCapasOverridesActivos((prev) => ({
                                ...prev,
                                [selectedCapa.id]: {
                                  ...(prev[selectedCapa.id] || {}),
                                  colorFill: val,
                                },
                              }));
                            }
                          )}
                        </div>
                      </div>
                    )}

                    {/* Capa de Texto (SRS-070: Unificado + SRS-083: Tabla Densa) */}
                    {selectedCapa.tipo === "text" && (
                      <div className="inspector-group-section">
                        <div className="inspector-group-header">
                          <h4 className="inspector-group-title">Texto y Tipografía</h4>
                          <div style={{ display: "flex", alignItems: "center", gap: "6px", marginLeft: "auto" }}>
                            <span
                              style={{ cursor: "help", fontSize: "11px" }}
                              title="Formato disponible: **negrita**, *cursiva*, __subrayado__ y ++texto grande (+25%)++, +++muy grande (+56%)+++."
                            >
                              ℹ️
                            </span>
                            <div className="symbols-helper-container">
                              <span
                                className="symbols-helper-trigger"
                                title="Insertar símbolo"
                                onClick={() => setActiveSymbolPopover(activeSymbolPopover === "text" ? null : "text")}
                              >
                                🖼️
                              </span>
                              {activeSymbolPopover === "text" && (
                                <div className="symbols-helper-popover">
                                  {projectSymbols.length === 0 ? (
                                    <div className="symbols-helper-empty">No hay símbolos en el proyecto</div>
                                  ) : (
                                    projectSymbols.map((sym: any) => (
                                      <button
                                        key={sym.id}
                                        type="button"
                                        className="symbols-helper-item"
                                        onClick={() => {
                                          const currentVal = tempValoresActivos[selectedCapa.id] !== undefined ? tempValoresActivos[selectedCapa.id] : (selectedCapa.contenidoRaw || "");
                                          const inputId = selectedCapa.multiline !== false ? ("editcard-text-textarea-" + selectedCapa.id) : ("editcard-text-input-" + selectedCapa.id);
                                          handleInsertSymbol(sym.tag, inputId, currentVal, (newVal) => {
                                            updateTextValue(newVal, selectedCapa.id);
                                          });
                                        }}
                                      >
                                        <img src={sym.src} alt={sym.tag} />
                                        <span className="symbols-helper-tag">{`{${sym.tag}}`}</span>
                                      </button>
                                    ))
                                  )}
                                </div>
                              )}
                            </div>
                            <label htmlFor={`capa-multiline-${selectedCapa.id}`} style={{ display: "flex", alignItems: "center", gap: "3px", fontSize: "10.5px", color: "var(--text-secondary)", cursor: "pointer", margin: 0 }}>
                              <input
                                type="checkbox"
                                id={`capa-multiline-${selectedCapa.id}`}
                                checked={selectedCapa.multiline !== false}
                                onChange={(e) => handleUpdateCapaProp(selectedCapa.id, "multiline", e.target.checked)}
                                style={{ width: "auto", margin: 0, cursor: "pointer" }}
                              />
                              Multilínea
                            </label>
                            {renderExposedEye("contenidoRaw", "Contenido Texto")}
                          </div>
                        </div>

                        <div className="inspector-table">
                          {/* Contenido de Texto */}
                          <div className="inspector-field-row inspector-section" style={{ padding: "3px 4px" }}>
                            <div className="inspector-field-label" title={selectedCapa.nombre || "Texto"}>
                              <label className="inspector-label">{selectedCapa.nombre || "Texto"}</label>
                            </div>
                            <div className="inspector-field-control">
                              {selectedCapa.multiline !== false ? (
                                <textarea
                                  id={"editcard-text-textarea-" + selectedCapa.id}
                                  className="inspector-textarea"
                                  value={tempValoresActivos[selectedCapa.id] !== undefined ? tempValoresActivos[selectedCapa.id] : (selectedCapa.contenidoRaw || "")}
                                  rows={2}
                                  onFocus={startTextEditSession}
                                  onBlur={endTextEditSession}
                                  onChange={(e) => updateTextValue(e.target.value, selectedCapa.id)}
                                />
                              ) : (
                                <input
                                  id={"editcard-text-input-" + selectedCapa.id}
                                  type="text"
                                  className="inspector-input"
                                  value={tempValoresActivos[selectedCapa.id] !== undefined ? tempValoresActivos[selectedCapa.id] : (selectedCapa.contenidoRaw || "")}
                                  onFocus={startTextEditSession}
                                  onBlur={endTextEditSession}
                                  onChange={(e) => updateTextValue(e.target.value, selectedCapa.id)}
                                />
                              )}
                            </div>
                          </div>

                          {/* Fila 1 Tabla Tipografía: Tipografía + Tamaño Fuente (pt) */}
                          <div className="inspector-field-row inspector-section">
                            <div className="inspector-cell" style={{ flex: 1.1, minWidth: 0 }}>
                              <div className="inspector-field-label" title="Tipografía">
                                <label className="inspector-label">Tipografía</label>
                                {renderExposedEye("fontFamily", "Tipografía", true)}
                              </div>
                              <div className="inspector-field-control">
                                <select
                                  className="inspector-input"
                                  value={tempCapasOverridesActivos[selectedCapa.id]?.fontFamily || selectedCapa.fontFamily || "sans-serif"}
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    handleUpdateCapaProp(selectedCapa.id, "fontFamily", val);
                                    setTempCapasOverridesActivos((prev) => ({
                                      ...prev,
                                      [selectedCapa.id]: {
                                        ...(prev[selectedCapa.id] || {}),
                                        fontFamily: val,
                                      },
                                    }));
                                  }}
                                >
                                  <optgroup label="Tipografías del Sistema">
                                    <option value="sans-serif">Inter (Sans Serif)</option>
                                    <option value="Outfit">Outfit</option>
                                    <option value="Arial">Arial</option>
                                    <option value="Times New Roman">Times New Roman</option>
                                    <option value="Courier New">Courier New (Monospace)</option>
                                  </optgroup>
                                  {fontFolders.map((folder) => {
                                    const fontsInFolder = (projectFonts || []).filter((f: any) => (f.folder || "Por Defecto") === folder);
                                    if (fontsInFolder.length === 0) return null;
                                    return (
                                      <optgroup key={folder} label={`Tipografías del Proyecto: ${folder}`}>
                                        {fontsInFolder.map((f: any) => (
                                          <option key={f.id} value={f.nombre}>{f.nombre}</option>
                                        ))}
                                      </optgroup>
                                    );
                                  })}
                                </select>
                              </div>
                            </div>

                            <div className="inspector-cell" style={{ flex: 0.9, minWidth: "125px" }}>
                              <div className="inspector-field-label" title="Tamaño Fuente (pt)">
                                <label className="inspector-label">Tamaño (pt)</label>
                                {renderExposedEye("fontSizePt", "Tamaño Fuente", true)}
                              </div>
                              <div className="inspector-field-control">
                                <input
                                  type="number"
                                  step="1"
                                  min="4"
                                  className="inspector-input"
                                  style={{ minWidth: "48px", width: "100%", padding: "1px 4px" }}
                                  value={tempCapasOverridesActivos[selectedCapa.id]?.fontSizePt || selectedCapa.fontSizePt || 12}
                                  onChange={(e) => {
                                    const val = Number(e.target.value);
                                    handleUpdateCapaProp(selectedCapa.id, "fontSizePt", val);
                                    setTempCapasOverridesActivos((prev) => ({
                                      ...prev,
                                      [selectedCapa.id]: {
                                        ...(prev[selectedCapa.id] || {}),
                                        fontSizePt: val,
                                      },
                                    }));
                                  }}
                                />
                              </div>
                            </div>
                          </div>

                          {/* Fila 2 Tabla Tipografía: Estilos (B/I/U) + Alineación */}
                          <div className="inspector-field-row inspector-section">
                            <div className="inspector-cell" style={{ flex: 1 }}>
                              <div className="inspector-field-label" title="Estilos de Texto">
                                <label className="inspector-label">Estilos</label>
                              </div>
                              <div className="inspector-field-control">
                                <div className="style-toggle-buttons">
                                  {(() => {
                                    const activeBold = tempCapasOverridesActivos[selectedCapa.id]?.bold !== undefined ? tempCapasOverridesActivos[selectedCapa.id].bold : !!selectedCapa.bold;
                                    const activeItalic = tempCapasOverridesActivos[selectedCapa.id]?.italic !== undefined ? tempCapasOverridesActivos[selectedCapa.id].italic : !!selectedCapa.italic;
                                    const activeUnderline = tempCapasOverridesActivos[selectedCapa.id]?.underline !== undefined ? tempCapasOverridesActivos[selectedCapa.id].underline : !!selectedCapa.underline;
                                    return (
                                      <>
                                        <button
                                          type="button"
                                          title="Negrita (B)"
                                          className={`style-btn ${activeBold ? "active" : ""}`}
                                          onClick={() => {
                                            const nextVal = !activeBold;
                                            handleUpdateCapaProp(selectedCapa.id, "bold", nextVal);
                                            setTempCapasOverridesActivos((prev) => ({
                                              ...prev,
                                              [selectedCapa.id]: {
                                                ...(prev[selectedCapa.id] || {}),
                                                bold: nextVal,
                                              },
                                            }));
                                          }}
                                        >
                                          <b>B</b>
                                        </button>
                                        <button
                                          type="button"
                                          title="Cursiva (I)"
                                          className={`style-btn ${activeItalic ? "active" : ""}`}
                                          onClick={() => {
                                            const nextVal = !activeItalic;
                                            handleUpdateCapaProp(selectedCapa.id, "italic", nextVal);
                                            setTempCapasOverridesActivos((prev) => ({
                                              ...prev,
                                              [selectedCapa.id]: {
                                                ...(prev[selectedCapa.id] || {}),
                                                italic: nextVal,
                                              },
                                            }));
                                          }}
                                        >
                                          <i>I</i>
                                        </button>
                                        <button
                                          type="button"
                                          title="Subrayado (U)"
                                          className={`style-btn ${activeUnderline ? "active" : ""}`}
                                          onClick={() => {
                                            const nextVal = !activeUnderline;
                                            handleUpdateCapaProp(selectedCapa.id, "underline", nextVal);
                                            setTempCapasOverridesActivos((prev) => ({
                                              ...prev,
                                              [selectedCapa.id]: {
                                                ...(prev[selectedCapa.id] || {}),
                                                underline: nextVal,
                                              },
                                            }));
                                          }}
                                        >
                                          <u>U</u>
                                        </button>
                                      </>
                                    );
                                  })()}
                                </div>
                              </div>
                            </div>

                            <div className="inspector-cell" style={{ flex: 1 }}>
                              <div className="inspector-field-label" title="Alineación">
                                <label className="inspector-label">Alineación</label>
                                {renderExposedEye("alineacion", "Alineación Texto", true)}
                              </div>
                              <div className="inspector-field-control">
                                <div className="alignment-group">
                                  {(["left", "center", "right", "justify"] as const).map((align) => {
                                    const activeAlign = tempCapasOverridesActivos[selectedCapa.id]?.alineacion || selectedCapa.alineacion || "left";
                                    return (
                                      <button
                                        key={align}
                                        type="button"
                                        className={`align-btn ${activeAlign === align ? "active" : ""}`}
                                        onClick={() => {
                                          handleUpdateCapaProp(selectedCapa.id, "alineacion", align);
                                          setTempCapasOverridesActivos((prev) => ({
                                            ...prev,
                                            [selectedCapa.id]: {
                                              ...(prev[selectedCapa.id] || {}),
                                              alineacion: align,
                                            },
                                          }));
                                        }}
                                        title={align === "left" ? "Alinear Izquierda" : align === "center" ? "Alinear Centro" : align === "right" ? "Alinear Derecha" : "Justificado"}
                                      >
                                        {align === "left" ? "⬅️" : align === "center" ? "↔️" : align === "right" ? "➡️" : "↕️"}
                                      </button>
                                    );
                                  })}
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Fila 3 Tabla Tipografía: Color de Texto + Contorno (Outline) */}
                          <div className="inspector-field-row inspector-section">
                            {renderColorSelector(
                              "Color de Texto",
                              tempCapasOverridesActivos[selectedCapa.id]?.color || selectedCapa.color || "#000000",
                              (val) => {
                                handleUpdateCapaProp(selectedCapa.id, "color", val);
                                setTempCapasOverridesActivos((prev) => ({
                                  ...prev,
                                  [selectedCapa.id]: {
                                    ...(prev[selectedCapa.id] || {}),
                                    color: val,
                                  },
                                }));
                              },
                              true,
                              "color",
                              "Color Texto",
                              1.1,
                              "Color"
                            )}

                            <div className="inspector-cell" style={{ flex: 0.9, minWidth: 0 }}>
                              <div className="inspector-field-label" title="Contorno de Texto (Outline)">
                                <label className="inspector-label">Contorno</label>
                                {renderExposedEye("textOutlineWidth", "Grosor Contorno", true)}
                              </div>
                              <div className="inspector-field-control" style={{ gap: "2px" }}>
                                <input
                                  type="number"
                                  min="0"
                                  step="0.5"
                                  title="Grosor (px)"
                                  className="inspector-input"
                                  style={{ width: "34px", flexShrink: 0, padding: "1px 2px" }}
                                  value={tempCapasOverridesActivos[selectedCapa.id]?.textOutlineWidth ?? selectedCapa.textOutlineWidth ?? 0}
                                  onChange={(e) => {
                                    const val = Math.max(0, parseFloat(e.target.value) || 0);
                                    handleUpdateCapaProp(selectedCapa.id, "textOutlineWidth", val);
                                    setTempCapasOverridesActivos((prev) => ({
                                      ...prev,
                                      [selectedCapa.id]: {
                                        ...(prev[selectedCapa.id] || {}),
                                        textOutlineWidth: val,
                                      },
                                    }));
                                  }}
                                />
                                <input
                                  type="color"
                                  title="Color Contorno"
                                  className="color-picker-input"
                                  style={{ width: "20px", height: "20px", padding: 0, flexShrink: 0 }}
                                  value={tempCapasOverridesActivos[selectedCapa.id]?.textOutlineColor || selectedCapa.textOutlineColor || "#000000"}
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    handleUpdateCapaProp(selectedCapa.id, "textOutlineColor", val);
                                    setTempCapasOverridesActivos((prev) => ({
                                      ...prev,
                                      [selectedCapa.id]: {
                                        ...(prev[selectedCapa.id] || {}),
                                        textOutlineColor: val,
                                      },
                                    }));
                                  }}
                                />
                                <input
                                  type="text"
                                  title="Color Contorno (HEX)"
                                  className="color-hex-input"
                                  style={{ flex: 1, height: "20px", fontSize: "10.5px", minWidth: "48px", padding: "1px 3px" }}
                                  value={tempCapasOverridesActivos[selectedCapa.id]?.textOutlineColor || selectedCapa.textOutlineColor || "#000000"}
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    handleUpdateCapaProp(selectedCapa.id, "textOutlineColor", val);
                                    setTempCapasOverridesActivos((prev) => ({
                                      ...prev,
                                      [selectedCapa.id]: {
                                        ...(prev[selectedCapa.id] || {}),
                                        textOutlineColor: val,
                                      },
                                    }));
                                  }}
                                />
                              </div>
                            </div>
                          </div>

                          {/* Fila 4 Tabla Tipografía: Interlineado + Alineación Vertical (SRS-085 & SRS-086) */}
                          <div className="inspector-field-row inspector-section">
                            <div className="inspector-cell" style={{ flex: 1, minWidth: 0 }}>
                              <div className="inspector-field-label" title="Interlineado (multiplicador relativo al tamaño de fuente, por defecto 1.2)">
                                <label className="inspector-label">Interlineado</label>
                                {renderExposedEye("lineHeight", "Interlineado", true)}
                              </div>
                              <div className="inspector-field-control">
                                <input
                                  type="number"
                                  min="0.5"
                                  max="3"
                                  step="0.05"
                                  placeholder="1.2"
                                  title="Interlineado (multiplicador e.g. 1.2)"
                                  className="inspector-input"
                                  value={tempCapasOverridesActivos[selectedCapa.id]?.lineHeight ?? selectedCapa.lineHeight ?? 1.2}
                                  onChange={(e) => {
                                    const val = parseFloat(e.target.value);
                                    const finalVal = isNaN(val) ? 1.2 : val;
                                    handleUpdateCapaProp(selectedCapa.id, "lineHeight", finalVal);
                                    setTempCapasOverridesActivos((prev) => ({
                                      ...prev,
                                      [selectedCapa.id]: {
                                        ...(prev[selectedCapa.id] || {}),
                                        lineHeight: finalVal,
                                      },
                                    }));
                                  }}
                                />
                              </div>
                            </div>

                            <div className="inspector-cell" style={{ flex: 1, minWidth: 0 }}>
                              <div className="inspector-field-label" title="Alineación Vertical">
                                <label className="inspector-label">Alineación V.</label>
                                {renderExposedEye("alineacionVertical", "Alineación Vertical", true)}
                              </div>
                              <div className="inspector-field-control">
                                <div className="alignment-group">
                                  {(["top", "center", "bottom"] as const).map((valign) => {
                                    const activeValign = tempCapasOverridesActivos[selectedCapa.id]?.alineacionVertical || selectedCapa.alineacionVertical || "top";
                                    return (
                                      <button
                                        key={valign}
                                        type="button"
                                        className={`align-btn ${activeValign === valign ? "active" : ""}`}
                                        onClick={() => {
                                          handleUpdateCapaProp(selectedCapa.id, "alineacionVertical", valign);
                                          setTempCapasOverridesActivos((prev) => ({
                                            ...prev,
                                            [selectedCapa.id]: {
                                              ...(prev[selectedCapa.id] || {}),
                                              alineacionVertical: valign,
                                            },
                                          }));
                                        }}
                                        title={valign === "top" ? "Alinear Arriba" : valign === "center" ? "Alinear Centro Vertical" : "Alinear Abajo"}
                                      >
                                        {valign === "top" ? "⬆️" : valign === "center" ? "↕️" : "⬇️"}
                                      </button>
                                    );
                                  })}
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Capas de Imagen (SRS-070: Unificado + SRS-083: Tabulado) */}
                    {selectedCapa.tipo === "image" && (
                      <div className="inspector-group-section">
                        <div className="inspector-group-header">
                          <h4 className="inspector-group-title">Recurso de Imagen</h4>
                          {renderExposedEye("src", "Recurso Imagen")}
                        </div>
                        <div className="inspector-table">
                          <div className="inspector-section" style={{ padding: "4px" }}>
                            {(() => {
                              const activeSrc = tempCapasOverridesActivos[selectedCapa.id]?.src || selectedCapa.src;
                              if (activeSrc) {
                                return (
                                  <div className="image-override-preview-container" style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                                    <img
                                      src={activeSrc}
                                      alt="Vista previa de imagen"
                                      className="inspector-image-preview"
                                      style={{
                                        width: "64px",
                                        height: "48px",
                                        objectFit: "contain",
                                        borderRadius: "3px",
                                        backgroundColor: "#f1f5f9",
                                        border: "1px solid #cbd5e1",
                                        flexShrink: 0
                                      }}
                                    />
                                    <button
                                      type="button"
                                      className="btn-danger-sec"
                                      style={{ flex: 1, height: "22px", padding: "2px 8px", fontSize: "11px" }}
                                      onClick={() => {
                                        handleUpdateCapaProp(selectedCapa.id, "src", "");
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
                                      Quitar Imagen
                                    </button>
                                  </div>
                                );
                              }

                              return (
                                <div className="image-upload-dropzone" style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                                  <input
                                    type="file"
                                    accept="image/*"
                                    id={`file-image-${selectedCapa.id}`}
                                    style={{ display: "none" }}
                                    onChange={(e) => {
                                      if (e.target.files && e.target.files[0]) {
                                        const file = e.target.files[0];
                                        if (!file.type.startsWith("image/")) {
                                          alert("Por favor, selecciona un archivo de imagen válido.");
                                          return;
                                        }
                                        handleUserAssetUpload(file, (base64) => {
                                          handleUpdateCapaProp(selectedCapa.id, "src", base64);
                                          setTempCapasOverridesActivos((prev) => ({
                                            ...prev,
                                            [selectedCapa.id]: {
                                              ...(prev[selectedCapa.id] || {}),
                                              src: base64,
                                            },
                                          }));
                                        });
                                      }
                                    }}
                                  />
                                  <label
                                    htmlFor={`file-image-${selectedCapa.id}`}
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
                                        handleUserAssetUpload(file, (base64) => {
                                          handleUpdateCapaProp(selectedCapa.id, "src", base64);
                                          setTempCapasOverridesActivos((prev) => ({
                                            ...prev,
                                            [selectedCapa.id]: {
                                              ...(prev[selectedCapa.id] || {}),
                                              src: base64,
                                            },
                                          }));
                                        });
                                      }
                                    }}
                                    style={{
                                      flex: 1,
                                      display: "flex",
                                      flexDirection: "row",
                                      alignItems: "center",
                                      justifyContent: "center",
                                      gap: "4px",
                                      padding: "3px 6px",
                                      height: "22px",
                                      border: "1px dashed #cbd5e1",
                                      borderRadius: "3px",
                                      cursor: "pointer",
                                      backgroundColor: "var(--bg-app)",
                                      textAlign: "center",
                                      boxSizing: "border-box"
                                    }}
                                  >
                                    <span style={{ fontSize: "12px" }}>📤</span>
                                    <span style={{ fontSize: "10.5px", fontWeight: 500, whiteSpace: "nowrap" }}>
                                      Subir imagen
                                    </span>
                                  </label>

                                  <button
                                    type="button"
                                    className="btn-secundario-galeria"
                                    style={{ flex: 1, marginTop: 0, height: "22px" }}
                                    onClick={() => {
                                      setActiveSelectorTarget({ type: "override", capaId: selectedCapa.id });
                                      setShowGallerySelector(true);
                                    }}
                                  >
                                    📂 Cargar desde Galería
                                  </button>
                                </div>
                              );
                            })()}
                          </div>

                          <div className="inspector-field-row inspector-section">
                            <div className="inspector-field-label" title="Modo de Ajuste">
                              <label className="inspector-label">Modo de Ajuste</label>
                              {renderExposedEye("modoAjuste", "Modo de Ajuste", true)}
                            </div>
                            <div className="inspector-field-control">
                              <select
                                className="inspector-input"
                                value={tempCapasOverridesActivos[selectedCapa.id]?.modoAjuste || selectedCapa.modoAjuste || "cover"}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  handleUpdateCapaProp(selectedCapa.id, "modoAjuste", val);
                                  setTempCapasOverridesActivos((prev) => ({
                                    ...prev,
                                    [selectedCapa.id]: {
                                      ...(prev[selectedCapa.id] || {}),
                                      modoAjuste: val,
                                    },
                                  }));
                                }}
                              >
                                <option value="cover">Cover (Rellenar)</option>
                                <option value="contain">Contain (Contener)</option>
                                <option value="stretch">Stretch (Estirar)</option>
                              </select>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Capas de Imagen Switch */}
                    {selectedCapa.tipo === "image-switch" && (
                      <>
                        {/* Sección 1: Selección de Imagen Switch (Carta) */}
                        <div className="inspector-group-section">
                          <div className="inspector-group-header">
                            <h4 className="inspector-group-title">Selección de Imagen (Carta)</h4>
                            {renderExposedEye("src", "Recurso Imagen")}
                          </div>
                          <div className="inspector-section">
                            {!selectedCapa.options || selectedCapa.options.length === 0 ? (
                              <div className="switch-no-options-notice" style={{
                                padding: "4px 8px",
                                backgroundColor: "var(--bg-app)",
                                border: "1px dashed var(--border-color)",
                                borderRadius: "4px",
                                textAlign: "center",
                                fontSize: "10.5px",
                                color: "var(--text-secondary)",
                                lineHeight: "1.25"
                              }}>
                                ℹ️ Configura los recursos del switch en la definición de la plantilla.
                              </div>
                            ) : (
                              <>
                                <div className="image-override-preview-container" style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "4px" }}>
                                  <img
                                    src={tempCapasOverridesActivos[selectedCapa.id]?.src || selectedCapa.src || ""}
                                    alt="Vista previa activa"
                                    className="inspector-image-preview"
                                    style={{
                                      width: "56px",
                                      height: "44px",
                                      objectFit: "contain",
                                      borderRadius: "4px",
                                      backgroundColor: "#f1f5f9",
                                      border: "1px solid #cbd5e1",
                                    }}
                                  />
                                  {tempCapasOverridesActivos[selectedCapa.id]?.src && (
                                    <button
                                      type="button"
                                      className="btn-danger-sec"
                                      style={{ flex: 1, height: "22px", padding: "2px 8px", fontSize: "11px" }}
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
                                          handleUserAssetUpload(file, (base64) => {
                                            setTempCapasOverridesActivos((prev) => ({
                                              ...prev,
                                              [selectedCapa.id]: {
                                                src: base64,
                                                selectedOptionId: undefined
                                              }
                                            }));
                                          });
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
                        <div className="inspector-group-section">
                          <div className="inspector-group-header">
                            <h4 className="inspector-group-title">Definición de Plantilla</h4>
                          </div>

                          <div className="inspector-table">
                            <div className="inspector-field-row inspector-section">
                              <div className="inspector-cell">
                                <div className="inspector-field-label" title="Nombre de Variable / Capa">
                                  <label className="inspector-label">Nombre</label>
                                </div>
                                <div className="inspector-field-control">
                                  <input
                                    type="text"
                                    className="inspector-input"
                                    value={selectedCapa.nombre || ""}
                                    placeholder="ej. Icono Switch"
                                    onChange={(e) => handleUpdateCapaProp(selectedCapa.id, "nombre", e.target.value)}
                                  />
                                </div>
                              </div>
                              <div className="inspector-cell">
                                <div className="inspector-field-label" title="Modo de Ajuste">
                                  <label className="inspector-label">Modo de Ajuste</label>
                                </div>
                                <div className="inspector-field-control">
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
                            </div>

                            <div className="inspector-field-row inspector-section">
                              <div className="inspector-field-label" title="Recursos Asignados al Switch">
                                <label className="inspector-label">Recursos Switch</label>
                              </div>
                              <div className="inspector-field-control">
                                <button
                                  type="button"
                                  className="btn-secundario-galeria"
                                  style={{ width: "100%", marginTop: 0 }}
                                  onClick={() => {
                                    const targetCapa = plantillaActiva.capas.find((c: any) => c.id === selectedCapa.id);
                                    setTempSwitchCapaId(selectedCapa.id);
                                    setTempSelectedOptionIds(targetCapa?.options?.map((opt: any) => opt.id) || []);
                                    setShowSwitchResourcesPopup(true);
                                  }}
                                >
                                  ⚙️ Seleccionar recursos ({selectedCapa.options?.length || 0} imágenes asignadas)
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      </>
                    )}

                    {/* Capas de Contenedor */}
                    {selectedCapa.tipo === "container" && (
                      <div className="inspector-group-section">
                        <div className="inspector-group-header">
                          <h4 className="inspector-group-title">Definición de Plantilla (Contenedor)</h4>
                        </div>

                        <div className="inspector-table">
                          <div className="inspector-field-row inspector-section">
                            <div className="inspector-cell">
                              <div className="inspector-field-label" title="Tipo de Layout">
                                <label className="inspector-label">Tipo de Layout</label>
                              </div>
                              <div className="inspector-field-control">
                                <select
                                  className="inspector-input"
                                  value={selectedCapa.layout || "none"}
                                  onChange={(e) => handleUpdateCapaProp(selectedCapa.id, "layout", e.target.value)}
                                >
                                  <option value="none">Libre (FrameLayout)</option>
                                  <option value="vertical">Lineal Vertical</option>
                                  <option value="vertical-center">Lineal Vertical Centrado</option>
                                  <option value="vertical-reverse">Lineal Vertical Inverso (Abajo a Arriba)</option>
                                  <option value="horizontal">Lineal Horizontal</option>
                                  <option value="horizontal-center">Lineal Horizontal Centrado</option>
                                  <option value="horizontal-reverse">Lineal Horizontal Inverso (Derecha a Izquierda)</option>
                                </select>
                              </div>
                            </div>

                            <div className="inspector-cell">
                              <div className="inspector-field-label" title="Contenedor Padre">
                                <label className="inspector-label">Contenedor Padre</label>
                              </div>
                              <div className="inspector-field-control">
                                <select
                                  className="inspector-input"
                                  value={selectedCapa.parentCapaId || ""}
                                  onChange={(e) => handleUpdateCapaProp(selectedCapa.id, "parentCapaId", e.target.value === "" ? null : e.target.value)}
                                >
                                  <option value="">(Raíz)</option>
                                  {(plantillaActiva.capas || [])
                                    .filter((c: any) => (c.tipo === "container" || c.tipo === "list") && c.id !== selectedCapa.id && !isDescendant(c.id, selectedCapa.id))
                                    .map((c: any) => (
                                      <option key={c.id} value={c.id}>
                                        {c.nombre || `${c.tipo === "list" ? "Lista" : "Contenedor"} ${c.id}`}
                                      </option>
                                    ))}
                                </select>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Capas de Lista (SRS-072 + SRS-083) */}
                    {selectedCapa.tipo === "list" && (
                      <div className="inspector-group-section">
                        <div className="inspector-group-header">
                          <h4 className="inspector-group-title">Definición de Lista</h4>
                          {renderExposedEye("items", "Elementos Lista")}
                        </div>

                        <div className="inspector-table">
                          <div className="inspector-field-row inspector-section">
                            <div className="inspector-cell">
                              <div className="inspector-field-label" title="Tipo de Layout">
                                <label className="inspector-label">Tipo de Layout</label>
                              </div>
                              <div className="inspector-field-control">
                                <select
                                  className="inspector-input"
                                  value={selectedCapa.layout || "vertical"}
                                  onChange={(e) => handleUpdateCapaProp(selectedCapa.id, "layout", e.target.value)}
                                >
                                  <option value="vertical">Lineal Vertical</option>
                                  <option value="vertical-center">Lineal Vertical Centrado</option>
                                  <option value="vertical-reverse">Lineal Vertical Inverso (Abajo a Arriba)</option>
                                  <option value="horizontal">Lineal Horizontal</option>
                                  <option value="horizontal-center">Lineal Horizontal Centrado</option>
                                  <option value="horizontal-reverse">Lineal Horizontal Inverso (Derecha a Izquierda)</option>
                                </select>
                              </div>
                            </div>

                            <div className="inspector-cell">
                              <div className="inspector-field-label" title="Contenedor Padre">
                                <label className="inspector-label">Contenedor Padre</label>
                              </div>
                              <div className="inspector-field-control">
                                <select
                                  className="inspector-input"
                                  value={selectedCapa.parentCapaId || ""}
                                  onChange={(e) => handleUpdateCapaProp(selectedCapa.id, "parentCapaId", e.target.value === "" ? null : e.target.value)}
                                >
                                  <option value="">(Raíz)</option>
                                  {(plantillaActiva.capas || [])
                                    .filter((c: any) => (c.tipo === "container" || c.tipo === "list") && c.id !== selectedCapa.id && !isDescendant(c.id, selectedCapa.id))
                                    .map((c: any) => (
                                      <option key={c.id} value={c.id}>
                                        {c.nombre || `${c.tipo === "list" ? "Lista" : "Contenedor"} ${c.id}`}
                                      </option>
                                    ))}
                                </select>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Subplantillas Disponibles (Child Blueprints) */}
                        <div style={{ marginTop: "3px", borderTop: "1px dashed var(--border-color)", paddingTop: "4px" }}>
                          <label className="inspector-label" style={{ fontWeight: 600 }}>📦 Subplantillas Disponibles ({((selectedCapa.childTemplates || []).length)})</label>

                          {((selectedCapa.childTemplates || []).length === 0) ? (
                            <div style={{ fontSize: "10.5px", color: "var(--text-secondary)", fontStyle: "italic", padding: "2px 0" }}>
                              No hay subplantillas registradas en esta lista.
                            </div>
                          ) : (
                            <div style={{ display: "flex", flexDirection: "column", gap: "3px", marginBottom: "4px" }}>
                              {(selectedCapa.childTemplates || []).map((tmpl: ChildTemplate) => (
                                <div key={tmpl.id} style={{ display: "flex", alignItems: "center", gap: "4px", background: "var(--bg-secondary)", padding: "2px 5px", borderRadius: "3px", border: "1px solid var(--border-color)" }}>
                                  <span style={{ fontSize: "11px" }}>📋</span>
                                  <div style={{ flex: 1, display: "flex", flexDirection: "row", gap: "4px" }}>
                                    <input
                                      type="text"
                                      className="inspector-input"
                                      style={{ fontSize: "10.5px", padding: "1px 4px", height: "19px", flex: 2 }}
                                      value={tmpl.name}
                                      title="Nombre de la subplantilla"
                                      onChange={(e) => handleUpdateChildTemplate(selectedCapa.id, tmpl.id, { name: e.target.value })}
                                    />
                                    <input
                                      type="text"
                                      className="inspector-input"
                                      style={{ fontSize: "10px", padding: "1px 4px", height: "19px", color: "var(--text-secondary)", flex: 1 }}
                                      value={tmpl.tag}
                                      title="Tag identificativo"
                                      placeholder="tag"
                                      onChange={(e) => handleUpdateChildTemplate(selectedCapa.id, tmpl.id, { tag: e.target.value })}
                                    />
                                  </div>
                                  <button
                                    type="button"
                                    className="btn-danger"
                                    style={{ padding: "1px 4px", fontSize: "10px" }}
                                    title="Eliminar Subplantilla"
                                    onClick={() => {
                                      if (window.confirm(`¿Eliminar la subplantilla "${tmpl.name}"?`)) {
                                        handleDeleteChildTemplate(selectedCapa.id, tmpl.id);
                                      }
                                    }}
                                  >
                                    🗑️
                                  </button>
                                </div>
                              ))}
                            </div>
                          )}

                          {/* Guardar hijo existente como subplantilla */}
                          <div style={{ background: "var(--bg-tertiary, #2a2a2a)", padding: "4px 6px", borderRadius: "4px", border: "1px solid var(--border-color)", marginTop: "3px" }}>
                            <div style={{ fontSize: "10.5px", fontWeight: 600, marginBottom: "3px" }}>➕ Guardar hijo existente como Subplantilla:</div>
                            {(() => {
                              const directChildren = (plantillaActiva.capas || []).filter((c: any) => c.parentCapaId === selectedCapa.id);
                              if (directChildren.length === 0) {
                                return (
                                  <div style={{ fontSize: "10px", color: "var(--text-secondary)", fontStyle: "italic" }}>
                                    Añade elementos dentro de esta lista en el árbol de capas para poder guardarlos como subplantilla.
                                  </div>
                                );
                              }
                              return (
                                <div style={{ display: "flex", flexDirection: "column", gap: "3px" }}>
                                  <select
                                    className="inspector-input"
                                    value={selectedChildForTemplate}
                                    onChange={(e) => {
                                      setSelectedChildForTemplate(e.target.value);
                                      const found = directChildren.find((c: any) => c.id === e.target.value);
                                      if (found) {
                                        setNewTemplateName(found.nombre || "Subplantilla");
                                        setNewTemplateTag((found.nombre || "item").toLowerCase().replace(/\s+/g, "_"));
                                      }
                                    }}
                                  >
                                    <option value="">-- Seleccionar elemento hijo --</option>
                                    {directChildren.map((child: any) => (
                                      <option key={child.id} value={child.id}>
                                        {child.nombre || `${child.tipo} ${child.id}`} ({child.tipo})
                                      </option>
                                    ))}
                                  </select>
                                  {selectedChildForTemplate && (
                                    <div style={{ display: "flex", gap: "6px", alignItems: "center", width: "100%", boxSizing: "border-box" }}>
                                      <input
                                        type="text"
                                        className="inspector-input"
                                        placeholder="Nombre (ej. Ataque)"
                                        value={newTemplateName}
                                        onChange={(e) => setNewTemplateName(e.target.value)}
                                        style={{ flex: 1.2, minWidth: 0, height: "24px" }}
                                      />
                                      <input
                                        type="text"
                                        className="inspector-input"
                                        placeholder="Tag (ej. ataque)"
                                        value={newTemplateTag}
                                        onChange={(e) => setNewTemplateTag(e.target.value)}
                                        style={{ flex: 0.8, minWidth: 0, height: "24px" }}
                                      />
                                      <button
                                        type="button"
                                        className="btn-primary"
                                        style={{
                                          width: "auto",
                                          flex: "0 0 auto",
                                          padding: "0 14px",
                                          fontSize: "11px",
                                          height: "24px",
                                          whiteSpace: "nowrap",
                                          borderRadius: "4px",
                                          margin: 0,
                                          display: "inline-flex",
                                          alignItems: "center",
                                          justifyContent: "center",
                                          cursor: "pointer"
                                        }}
                                        onClick={() => handleSaveChildAsTemplate(selectedCapa.id)}
                                      >
                                        Registrar
                                      </button>
                                    </div>
                                  )}
                                </div>
                              );
                            })()}
                          </div>

                          {/* Instanciar en la Plantilla */}
                          {(selectedCapa.childTemplates || []).length > 0 && (
                            <div style={{ marginTop: "4px" }}>
                              <div style={{ fontSize: "10.5px", fontWeight: 600, marginBottom: "3px" }}>Insertar instancia en plantilla:</div>
                              <div style={{ display: "flex", flexWrap: "wrap", gap: "4px" }}>
                                {(selectedCapa.childTemplates || []).map((tmpl: ChildTemplate) => (
                                  <button
                                    key={tmpl.id}
                                    type="button"
                                    className="btn-secondary"
                                    style={{
                                      padding: "2px 6px",
                                      fontSize: "10.5px",
                                      display: "flex",
                                      alignItems: "center",
                                      gap: "3px",
                                      backgroundColor: "rgba(147, 51, 234, 0.2)",
                                      color: "#e9d5ff",
                                      borderRadius: "3px",
                                      border: "1px solid rgba(168, 85, 247, 0.5)",
                                      cursor: "pointer",
                                      fontWeight: 600
                                    }}
                                    onClick={() => handleInstantiateChildTemplate(selectedCapa.id, tmpl)}
                                  >
                                    ➕ {tmpl.name}
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Elementos Actuales en la Lista */}
                          {(() => {
                            const directChildren = (plantillaActiva.capas || []).filter((c: any) => c.parentCapaId === selectedCapa.id);
                            if (directChildren.length === 0) return null;
                            return (
                              <div style={{ marginTop: "4px", borderTop: "1px dashed var(--border-color)", paddingTop: "4px" }}>
                                <div style={{ fontSize: "10.5px", fontWeight: 600, marginBottom: "3px" }}>Elementos en esta lista ({directChildren.length}):</div>
                                <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                                  {directChildren.map((child: any, idx: number) => (
                                    <div key={child.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "var(--bg-secondary)", padding: "2px 5px", borderRadius: "3px", fontSize: "10.5px" }}>
                                      <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "180px" }}>
                                        {idx + 1}. {child.nombre || child.id}
                                      </span>
                                      <div style={{ display: "flex", gap: "2px" }}>
                                        <button
                                          type="button"
                                          className="btn-secondary"
                                          style={{ padding: "1px 4px", fontSize: "10px", color: "#e2e8f0" }}
                                          disabled={idx === 0}
                                          title="Mover arriba"
                                          onClick={() => handleMoveCapa(child.id, "up")}
                                        >
                                          🔼
                                        </button>
                                        <button
                                          type="button"
                                          className="btn-secondary"
                                          style={{ padding: "1px 4px", fontSize: "10px", color: "#e2e8f0" }}
                                          disabled={idx === directChildren.length - 1}
                                          title="Mover abajo"
                                          onClick={() => handleMoveCapa(child.id, "down")}
                                        >
                                          🔽
                                        </button>
                                        <button
                                          type="button"
                                          className="btn-secondary"
                                          style={{ padding: "1px 4px", fontSize: "10px", color: "#e2e8f0" }}
                                          title="Duplicar elemento"
                                          onClick={() => handleDuplicateCapa(child.id)}
                                        >
                                          📋
                                        </button>
                                        <button
                                          type="button"
                                          className="btn-danger"
                                          style={{ padding: "1px 4px", fontSize: "10px" }}
                                          title="Eliminar elemento"
                                          onClick={() => handleDeleteCapa(child.id)}
                                        >
                                          🗑️
                                        </button>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            );
                          })()}
                        </div>
                      </div>
                    )}

                    {/* Capas de Bloque */}
                    {selectedCapa.tipo === "block" && (
                      <div className="inspector-group-section">
                        <div className="inspector-group-header">
                          <h4 className="inspector-group-title">Definición de Plantilla (Bloque)</h4>
                        </div>

                        <div className="inspector-table">
                          <div className="inspector-field-row inspector-section">
                            <div className="inspector-field-label" title="Nombre del Bloque">
                              <label className="inspector-label">Nombre del Bloque</label>
                            </div>
                            <div className="inspector-field-control">
                              <input
                                type="text"
                                className="inspector-input"
                                value={selectedCapa.nombre || ""}
                                placeholder="ej. Bloque de Fondo"
                                onChange={(e) => handleUpdateCapaProp(selectedCapa.id, "nombre", e.target.value)}
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Bordes, Esquinas, Fondo y Rotación en Tabla Densa (text, image, image-switch, container, list, block) */}
                    {(selectedCapa.tipo === "text" || selectedCapa.tipo === "image" || selectedCapa.tipo === "image-switch" || selectedCapa.tipo === "container" || selectedCapa.tipo === "list" || selectedCapa.tipo === "block") && (
                      <div className="inspector-group-section">
                        <div className="inspector-table">
                          {/* Fila 1: Bordes de la Capa (Grosor + Color en la misma línea cuando está colapsado) */}
                          <div className="inspector-field-row inspector-section">
                            <div
                              className="inspector-cell"
                              onClick={() => setExpandBorders(!expandBorders)}
                              style={{ cursor: "pointer", flex: expandBorders ? 1 : "0 0 62px" }}
                            >
                              <div className="inspector-field-label" title="Bordes">
                                <h4 className="inspector-group-title" style={{ cursor: "pointer", margin: 0 }}>Bordes</h4>
                                <span className={`expand-toggle-icon ${expandBorders ? "expanded" : ""}`} style={{ marginLeft: "2px" }}>▶</span>
                              </div>
                            </div>

                            {!expandBorders && (
                              <>
                                <div className="inspector-cell" style={{ flex: 0.9 }}>
                                  <div className="inspector-field-label" title="Grosor General (mm)">
                                    <label className="inspector-label">Grosor</label>
                                    {renderExposedEye("borderTopWidth", "Grosor Borde", true)}
                                  </div>
                                  <div className="inspector-field-control">
                                    <input
                                      type="number"
                                      step="0.1"
                                      min="0"
                                      className="inspector-input"
                                      style={{ width: "100%", minWidth: "46px" }}
                                      value={selectedCapa.borderTopWidth !== undefined ? selectedCapa.borderTopWidth : 0}
                                      onChange={(e) => handleUpdateBorderWidthGeneral(selectedCapa.id, Number(e.target.value))}
                                    />
                                  </div>
                                </div>
                                {renderColorSelector(
                                  "Color",
                                  selectedCapa.borderTopColor || "#000000",
                                  (val) => handleUpdateBorderColorGeneral(selectedCapa.id, val),
                                  true,
                                  "borderTopColor",
                                  "Color Borde",
                                  1.15
                                )}
                              </>
                            )}
                          </div>

                          {expandBorders && (
                            <div className="inspector-expanded-borders" style={{ display: "flex", flexDirection: "column", width: "100%", gap: "2px", padding: "4px 0", borderBottom: "1px solid rgba(255, 255, 255, 0.05)" }}>
                              {/* Arriba / Superior */}
                              <div className="inspector-field-row" style={{ padding: "2px 4px", borderBottom: "1px dashed rgba(255, 255, 255, 0.04)" }}>
                                <div className="inspector-cell" style={{ flex: "0 0 58px" }}>
                                  <span style={{ fontSize: "11px", fontWeight: 600, color: "var(--text-secondary)" }}>Superior</span>
                                </div>
                                <div className="inspector-cell" style={{ flex: 0.75 }}>
                                  <div className="inspector-field-label" title="Grosor Superior (mm)">
                                    <label className="inspector-label">Grosor</label>
                                    {renderExposedEye("borderTopWidth", "Grosor Borde Sup", true)}
                                  </div>
                                  <div className="inspector-field-control">
                                    <input
                                      type="number"
                                      step="0.1"
                                      min="0"
                                      className="inspector-input"
                                      value={selectedCapa.borderTopWidth !== undefined ? selectedCapa.borderTopWidth : 0}
                                      onChange={(e) => handleUpdateCapaProp(selectedCapa.id, "borderTopWidth", Number(e.target.value))}
                                    />
                                  </div>
                                </div>
                                {renderColorSelector(
                                  "Color",
                                  selectedCapa.borderTopColor || "#000000",
                                  (val) => handleUpdateCapaProp(selectedCapa.id, "borderTopColor", val),
                                  true,
                                  "borderTopColor",
                                  "Color Borde Sup",
                                  1.1
                                )}
                              </div>

                              {/* Derecha */}
                              <div className="inspector-field-row" style={{ padding: "2px 4px", borderBottom: "1px dashed rgba(255, 255, 255, 0.04)" }}>
                                <div className="inspector-cell" style={{ flex: "0 0 58px" }}>
                                  <span style={{ fontSize: "11px", fontWeight: 600, color: "var(--text-secondary)" }}>Derecho</span>
                                </div>
                                <div className="inspector-cell" style={{ flex: 0.75 }}>
                                  <div className="inspector-field-label" title="Grosor Derecho (mm)">
                                    <label className="inspector-label">Grosor</label>
                                    {renderExposedEye("borderRightWidth", "Grosor Borde Der", true)}
                                  </div>
                                  <div className="inspector-field-control">
                                    <input
                                      type="number"
                                      step="0.1"
                                      min="0"
                                      className="inspector-input"
                                      value={selectedCapa.borderRightWidth !== undefined ? selectedCapa.borderRightWidth : 0}
                                      onChange={(e) => handleUpdateCapaProp(selectedCapa.id, "borderRightWidth", Number(e.target.value))}
                                    />
                                  </div>
                                </div>
                                {renderColorSelector(
                                  "Color",
                                  selectedCapa.borderRightColor || "#000000",
                                  (val) => handleUpdateCapaProp(selectedCapa.id, "borderRightColor", val),
                                  true,
                                  "borderRightColor",
                                  "Color Borde Der",
                                  1.1
                                )}
                              </div>

                              {/* Abajo / Inferior */}
                              <div className="inspector-field-row" style={{ padding: "2px 4px", borderBottom: "1px dashed rgba(255, 255, 255, 0.04)" }}>
                                <div className="inspector-cell" style={{ flex: "0 0 58px" }}>
                                  <span style={{ fontSize: "11px", fontWeight: 600, color: "var(--text-secondary)" }}>Inferior</span>
                                </div>
                                <div className="inspector-cell" style={{ flex: 0.75 }}>
                                  <div className="inspector-field-label" title="Grosor Inferior (mm)">
                                    <label className="inspector-label">Grosor</label>
                                    {renderExposedEye("borderBottomWidth", "Grosor Borde Inf", true)}
                                  </div>
                                  <div className="inspector-field-control">
                                    <input
                                      type="number"
                                      step="0.1"
                                      min="0"
                                      className="inspector-input"
                                      value={selectedCapa.borderBottomWidth !== undefined ? selectedCapa.borderBottomWidth : 0}
                                      onChange={(e) => handleUpdateCapaProp(selectedCapa.id, "borderBottomWidth", Number(e.target.value))}
                                    />
                                  </div>
                                </div>
                                {renderColorSelector(
                                  "Color",
                                  selectedCapa.borderBottomColor || "#000000",
                                  (val) => handleUpdateCapaProp(selectedCapa.id, "borderBottomColor", val),
                                  true,
                                  "borderBottomColor",
                                  "Color Borde Inf",
                                  1.1
                                )}
                              </div>

                              {/* Izquierda */}
                              <div className="inspector-field-row" style={{ padding: "2px 4px" }}>
                                <div className="inspector-cell" style={{ flex: "0 0 58px" }}>
                                  <span style={{ fontSize: "11px", fontWeight: 600, color: "var(--text-secondary)" }}>Izquierdo</span>
                                </div>
                                <div className="inspector-cell" style={{ flex: 0.75 }}>
                                  <div className="inspector-field-label" title="Grosor Izquierdo (mm)">
                                    <label className="inspector-label">Grosor</label>
                                    {renderExposedEye("borderLeftWidth", "Grosor Borde Izq", true)}
                                  </div>
                                  <div className="inspector-field-control">
                                    <input
                                      type="number"
                                      step="0.1"
                                      min="0"
                                      className="inspector-input"
                                      value={selectedCapa.borderLeftWidth !== undefined ? selectedCapa.borderLeftWidth : 0}
                                      onChange={(e) => handleUpdateCapaProp(selectedCapa.id, "borderLeftWidth", Number(e.target.value))}
                                    />
                                  </div>
                                </div>
                                {renderColorSelector(
                                  "Color",
                                  selectedCapa.borderLeftColor || "#000000",
                                  (val) => handleUpdateCapaProp(selectedCapa.id, "borderLeftColor", val),
                                  true,
                                  "borderLeftColor",
                                  "Color Borde Izq",
                                  1.1
                                )}
                              </div>
                            </div>
                          )}

                          {/* Fila 2: Redondear Esquinas en 1 sola línea cuando está colapsado */}
                          <div className="inspector-field-row inspector-section">
                            <div
                              className="inspector-cell"
                              onClick={() => setExpandRadii(!expandRadii)}
                              style={{ cursor: "pointer", flex: expandRadii ? 1 : 1.1 }}
                            >
                              <div className="inspector-field-label" title="Redondear Esquinas">
                                <h4 className="inspector-group-title" style={{ cursor: "pointer", margin: 0 }}>Redondear Esquinas</h4>
                                {renderExposedEye("borderTopLeftRadius", "Radio Esquina", true)}
                                <span className={`expand-toggle-icon ${expandRadii ? "expanded" : ""}`} style={{ marginLeft: "2px" }}>▶</span>
                              </div>
                            </div>

                            {!expandRadii && (
                              <div className="inspector-cell" style={{ flex: 0.9 }}>
                                <div className="inspector-field-label" title="Radio General (mm)">
                                  <label className="inspector-label">Radio (mm)</label>
                                </div>
                                <div className="inspector-field-control">
                                  <input
                                    type="number"
                                    step="0.5"
                                    min="0"
                                    className="inspector-input"
                                    value={selectedCapa.borderTopLeftRadius !== undefined ? selectedCapa.borderTopLeftRadius : 0}
                                    onChange={(e) => handleUpdateBorderRadiusGeneral(selectedCapa.id, Number(e.target.value))}
                                  />
                                </div>
                              </div>
                            )}
                          </div>

                          {expandRadii && (
                            <div className="expanded-inputs-grid">
                              <div className="expanded-input-item">
                                <label>Sup.Izq</label>
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
                                <label>Sup.Der</label>
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
                                <label>Inf.Der</label>
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
                                <label>Inf.Izq</label>
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

                          {/* Fila 3: Color de Fondo + Rotación (º) en la misma fila */}
                          <div className="inspector-field-row inspector-section">
                            <div className="inspector-cell" style={{ flex: 1.05 }}>
                              <div className="inspector-field-label" title="Color de Fondo de la Capa">
                                <label className="inspector-label">Fondo</label>
                                {renderExposedEye("backgroundColor", "Color Fondo", true)}
                              </div>
                              <div className="inspector-field-control" style={{ gap: "4px" }}>
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
                                  style={{ width: "auto", margin: 0, cursor: "pointer" }}
                                />
                                {!selectedCapa.backgroundColor ? (
                                  <label htmlFor="has-bg-color-checkbox" style={{ fontSize: "10.5px", cursor: "pointer", userSelect: "none", whiteSpace: "nowrap", color: "var(--text-secondary)" }}>Activar</label>
                                ) : (
                                  <div className="color-picker-group" style={{ flex: 1, minWidth: 0 }}>
                                    <input
                                      type="color"
                                      className="color-picker-input"
                                      style={{ width: "20px", height: "20px", padding: 0, flexShrink: 0 }}
                                      value={selectedCapa.backgroundColor.startsWith("#") ? selectedCapa.backgroundColor : "#ffffff"}
                                      onChange={(e) => handleUpdateCapaProp(selectedCapa.id, "backgroundColor", e.target.value)}
                                    />
                                    <input
                                      type="text"
                                      className="color-hex-input"
                                      style={{ flex: 1, minWidth: "46px" }}
                                      value={selectedCapa.backgroundColor}
                                      onChange={(e) => handleUpdateCapaProp(selectedCapa.id, "backgroundColor", e.target.value)}
                                    />
                                  </div>
                                )}
                              </div>
                            </div>

                            <div className="inspector-cell" style={{ flex: 1.15 }}>
                              <div className="inspector-field-label" title="Rotación (º)">
                                <label className="inspector-label">Rotación (º)</label>
                                {renderExposedEye("rotacion", "Rotación (º)", true)}
                              </div>
                              <div className="inspector-field-control" style={{ gap: "3px" }}>
                                <input
                                  type="number"
                                  min="-180"
                                  max="180"
                                  step="1"
                                  className="inspector-input"
                                  style={{ width: "44px", flexShrink: 0, padding: "1px 3px" }}
                                  value={selectedCapa.rotacion !== undefined ? selectedCapa.rotacion : 0}
                                  onChange={(e) => {
                                    let val = Number(e.target.value);
                                    if (isNaN(val)) val = 0;
                                    if (val < -180) val = -180;
                                    if (val > 180) val = 180;
                                    handleUpdateCapaProp(selectedCapa.id, "rotacion", val);
                                  }}
                                />
                                <input
                                  type="range"
                                  min="-180"
                                  max="180"
                                  step="1"
                                  style={{ flex: 1, cursor: "pointer", height: "14px", minWidth: "40px" }}
                                  value={selectedCapa.rotacion !== undefined ? selectedCapa.rotacion : 0}
                                  onChange={(e) => {
                                    handleUpdateCapaProp(selectedCapa.id, "rotacion", Number(e.target.value));
                                  }}
                                />
                              </div>
                            </div>
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
                className={`add-element-option ${selectedNewType === "list" ? "selected" : ""}`}
                onClick={() => setSelectedNewType("list")}
              >
                <span className="add-element-option-icon">📋</span>
                <span className="add-element-option-label">Lista</span>
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
            
            const wA = PROPERTY_WEIGHTS[a.property] ?? 100;
            const wB = PROPERTY_WEIGHTS[b.property] ?? 100;
            if (wA !== wB) return wA - wB;
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
                        { property: "visibility", label: "Visibilidad" },
                        { property: "xMm", label: "Posición X" },
                        { property: "yMm", label: "Posición Y" },
                        { property: "anchoMm", label: "Ancho" },
                        { property: "altoMm", label: "Alto" },
                        { property: "borderTopWidth", label: "Grosor Borde (o Sup)" },
                        { property: "borderTopColor", label: "Color Borde (o Sup)" },
                        { property: "borderRightWidth", label: "Grosor Borde Der" },
                        { property: "borderRightColor", label: "Color Borde Der" },
                        { property: "borderBottomWidth", label: "Grosor Borde Inf" },
                        { property: "borderBottomColor", label: "Color Borde Inf" },
                        { property: "borderLeftWidth", label: "Grosor Borde Izq" },
                        { property: "borderLeftColor", label: "Color Borde Izq" },
                        { property: "backgroundColor", label: "Color Fondo" },
                        { property: "borderTopLeftRadius", label: "Radio Esquinas" },
                        { property: "rotacion", label: "Rotación (º)" },
                      ];
                      if (capa.tipo !== "background") {
                        list.push({ property: "canvasEditMode", label: "Posición y Dimensiones (Lienzo)" });
                      }
                      if (capa.tipo === "text") {
                        list.push(
                          { property: "contenidoRaw", label: "Contenido Texto" },
                          { property: "fontFamily", label: "Tipografía" },
                          { property: "fontSizePt", label: "Tamaño Fuente" },
                          { property: "color", label: "Color Texto" },
                          { property: "alineacion", label: "Alineación Texto" },
                          { property: "textOutlineWidth", label: "Grosor Contorno Texto" },
                          { property: "textOutlineColor", label: "Color Contorno Texto" },
                          { property: "lineHeight", label: "Interlineado" },
                          { property: "alineacionVertical", label: "Alineación Vertical" },
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
                      } else if (capa.tipo === "list") {
                        list.push(
                          { property: "items", label: "Elementos de la Lista" },
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
                      const capaEmoji = capa.tipo === "text" ? "📝" : (capa.tipo === "image" || capa.tipo === "image-switch") ? "🖼️" : capa.tipo === "container" ? "📦" : capa.tipo === "list" ? "📋" : "⬜";

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
                              {(capa.tipo === "container" || capa.tipo === "list") && (
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
                          <div style={{ display: "flex", flexDirection: "column", gap: "3px" }}>
                            <span style={{ fontSize: "11px", color: "var(--text-secondary)" }}>
                              Aclaración específica (opcional{capa?.descripcion ? ` — hereda: "${capa.descripcion}"` : ""}):
                            </span>
                            <textarea
                              rows={2}
                              value={prop.description || ""}
                              placeholder={
                                capa?.descripcion
                                  ? `Hereda de capa: "${capa.descripcion}"`
                                  : "Aclaración o directriz específica para IA..."
                              }
                              style={{
                                width: "100%",
                                padding: "4px 8px",
                                fontSize: "11.5px",
                                backgroundColor: "var(--bg-card)",
                                border: "1px solid var(--border-color)",
                                borderRadius: "4px",
                                color: "var(--text-primary)",
                                resize: "vertical",
                                fontFamily: "inherit",
                                boxSizing: "border-box"
                              }}
                              onChange={(e) => {
                                const newDesc = e.target.value;
                                setTempExposedProperties(prev =>
                                  prev.map((item, i) =>
                                    i === idx ? { ...item, description: newDesc.trim() ? newDesc : undefined } : item
                                  )
                                );
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

            {/* Pestañas (Tabs) para Galería de Proyecto vs Usuario */}
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
                  borderBottom: selectorTab === "user" ? "2px solid var(--accent-primary)" : "2px solid transparent",
                  color: selectorTab === "user" ? "var(--text-primary)" : "var(--text-secondary)",
                  fontWeight: selectorTab === "user" ? "bold" : "normal",
                  cursor: "pointer",
                  fontSize: "13px"
                }}
                onClick={() => setSelectorTab("user")}
              >
                Galería de Usuario (Subidas PC)
              </button>
            </div>

            <p className="gallery-popup-subtitle">
              Elige una imagen para asignar a la capa ({selectorTab === "project" ? "Galería del Proyecto" : "Galería de Usuario"})
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
                userAssets && userAssets.length > 0 ? (
                  userAssets.map((asset: any) => (
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
                    No has subido imágenes locales aún. Se guardarán aquí automáticamente al subirlas desde tu PC.
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
                  borderBottom: switchSelectorTab === "user" ? "2px solid var(--accent-primary)" : "2px solid transparent",
                  color: switchSelectorTab === "user" ? "var(--text-primary)" : "var(--text-secondary)",
                  fontWeight: switchSelectorTab === "user" ? "bold" : "normal",
                  cursor: "pointer",
                  fontSize: "13px"
                }}
                onClick={() => setSwitchSelectorTab("user")}
              >
                Galería de Usuario (Subidas PC)
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
                userAssets && userAssets.length > 0 ? (
                  userAssets.map((asset: any) => {
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
                    No has subido imágenes locales aún. Se guardarán aquí automáticamente al subirlas desde tu PC.
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
                  const allAssets = [...(projectAssets || []), ...(userAssets || [])];
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
