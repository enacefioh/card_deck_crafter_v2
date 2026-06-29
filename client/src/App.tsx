import React, { useState, useMemo, useRef, useEffect } from "react";
import { calcularDistribucion } from "shared";
import type { CanvasConfig, CardConfig, Carta, DocumentoCDC2 } from "shared";
import JSZip from "jszip";
import MenuBar from "./MenuBar";
import { validarYParsearProyecto, moverCartas, duplicarCartas, insertarCartaDesdePlantilla, validarYParsearPlantilla } from "./utils/projectUtils";
import DetailModal from "./DetailModal";
import EditCardModal from "./EditCardModal";
import "./App.css";

// Formato de preajustes de cartas
const PREAJUSTES_CARTAS = {
  standard: { nombre: "Estándar vertical (63.5 x 88.9 mm)", ancho: 63.5, alto: 88.9 },
  standard_horizontal: { nombre: "Estándar horizontal (88.9 x 63.5 mm)", ancho: 88.9, alto: 63.5 },
  mini: { nombre: "Mini vertical (44.4 x 63.5 mm)", ancho: 44.4, alto: 63.5 },
  mini_horizontal: { nombre: "Mini horizontal (63.5 x 44.4 mm)", ancho: 63.5, alto: 44.4 },
  tarot: { nombre: "Tarot vertical (70.0 x 120.0 mm)", ancho: 70.0, alto: 120.0 },
  tarot_horizontal: { nombre: "Tarot horizontal (120.0 x 70.0 mm)", ancho: 120.0, alto: 70.0 },
  custom: { nombre: "Personalizado", ancho: 63.5, alto: 88.9 },
};

// Formato de preajustes de lienzos
const PREAJUSTES_HOJAS = {
  A4: { ancho: 210, alto: 297 },
  A3: { ancho: 297, alto: 420 },
  custom: { ancho: 210, alto: 297 },
};

function renderizarTextoCapa(capa: any, valoresCampos?: Record<string, string>): string {
  if (valoresCampos && valoresCampos[capa.nombre] !== undefined) {
    return valoresCampos[capa.nombre];
  }
  return capa.contenidoRaw || "";
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

export default function App() {
  // --- Refs para Enfoque y Triggers ---
  const sectionLienzoRef = useRef<HTMLDivElement>(null);
  const sectionCartaRef = useRef<HTMLDivElement>(null);
  const fileInputProyectoRef = useRef<HTMLInputElement>(null);
  const fileInputImagenesRef = useRef<HTMLInputElement>(null);
  const fileInputTemplateRef = useRef<HTMLInputElement>(null);

  // --- Estados de Configuración ---
  const [documentos, setDocumentos] = useState<DocumentoCDC2[]>([
    {
      id: "doc_default",
      nombre: "Documento 1",
      canvasConfig: {
        tipo: "A4",
        anchoMm: 210,
        altoMm: 297,
        orientacion: "vertical",
        margenTopMm: 8,
        margenBottomMm: 8,
        margenLeftMm: 8,
        margenRightMm: 8,
        lineasCorteContinuas: true,
        marcasCorteEsquinas: true,
      },
      cardConfig: {
        anchoMm: 63.5,
        altoMm: 88.9,
        espaciadoXMm: 0,
        espaciadoYMm: 0,
        sangradoMm: 0,
        bordeCorteMm: 0,
        bordeCorteColor: "#000000",
        modoAjuste: "contain",
        reducirArteAlBorde: false,
      },
      modoTraseras: "ninguno",
      imagenTraseraComun: null,
      cards: []
    }
  ]);
  const [activeDocumentoId, setActiveDocumentoId] = useState<string>("doc_default");

  const activeDocumento = documentos.find(d => d.id === activeDocumentoId) || documentos[0];

  const canvasConfig = activeDocumento.canvasConfig;
  const cardConfig = activeDocumento.cardConfig;
  const cartas = activeDocumento.cards;
  const imagenTraseraComun = activeDocumento.imagenTraseraComun;
  const generarReversos = activeDocumento.modoTraseras !== "ninguno";

  const [canvasType, setCanvasType] = useState<"A4" | "A3" | "Custom">("A4");
  const [cardPreset, setCardPreset] = useState<keyof typeof PREAJUSTES_CARTAS>("standard");

  const setCanvasConfigInternal = (newVal: CanvasConfig | ((prev: CanvasConfig) => CanvasConfig)) => {
    setDocumentos(prev => prev.map(d => {
      if (d.id === activeDocumentoId) {
        return {
          ...d,
          canvasConfig: typeof newVal === "function" ? newVal(d.canvasConfig) : newVal
        };
      }
      return d;
    }));
  };

  const setCardConfigInternal = (newVal: CardConfig | ((prev: CardConfig) => CardConfig)) => {
    setDocumentos(prev => prev.map(d => {
      if (d.id === activeDocumentoId) {
        return {
          ...d,
          cardConfig: typeof newVal === "function" ? newVal(d.cardConfig) : newVal
        };
      }
      return d;
    }));
  };

  const setImagenTraseraComunInternal = (newVal: string | null | ((prev: string | null) => string | null)) => {
    setDocumentos(prev => prev.map(d => {
      if (d.id === activeDocumentoId) {
        return {
          ...d,
          imagenTraseraComun: typeof newVal === "function" ? newVal(d.imagenTraseraComun) : newVal
        };
      }
      return d;
    }));
  };

  const setGenerarReversosInternal = (newVal: boolean | ((prev: boolean) => boolean)) => {
    setDocumentos(prev => prev.map(d => {
      if (d.id === activeDocumentoId) {
        const booleanVal = typeof newVal === "function" ? newVal(d.modoTraseras !== "ninguno") : newVal;
        return {
          ...d,
          modoTraseras: booleanVal ? "comun" : "ninguno"
        };
      }
      return d;
    }));
  };

  const setCartasInternal = (newVal: Carta[] | ((prev: Carta[]) => Carta[])) => {
    setDocumentos(prev => prev.map(d => {
      if (d.id === activeDocumentoId) {
        return {
          ...d,
          cards: typeof newVal === "function" ? newVal(d.cards) : newVal
        };
      }
      return d;
    }));
  };
  const [selectedCardIds, setSelectedCardIds] = useState<string[]>([]);
  const [inspectingCardId, setInspectingCardId] = useState<string | null>(null);
  const fileInputReversoLoteRef = useRef<HTMLInputElement>(null);
  const [zoomFactor, setZoomFactor] = useState<number>(2.5); // px por mm
  const [showDocConfig, setShowDocConfig] = useState<boolean>(false);
  const [tempDocNombre, setTempDocNombre] = useState<string>("Página Nueva");

  const handleSetActiveDocumentoId = (id: string) => {
    setActiveDocumentoId(id);
    setSelectedCardIds([]);
    setInspectingCardId(null);
  };

  const handleTriggerAddDocumento = () => {
    setTempDocNombre(`Página ${documentos.length + 1}`);
    setTempCanvasType("A4");
    setTempCanvasConfig({
      tipo: "A4",
      anchoMm: 210,
      altoMm: 297,
      orientacion: "vertical",
      margenTopMm: 8,
      margenBottomMm: 8,
      margenLeftMm: 8,
      margenRightMm: 8,
      lineasCorteContinuas: true,
      marcasCorteEsquinas: true,
    });
    setTempCardPreset("standard");
    setTempCardConfig({
      anchoMm: 63.5,
      altoMm: 88.9,
      espaciadoXMm: 0,
      espaciadoYMm: 0,
      sangradoMm: 0,
      bordeCorteMm: 0,
      bordeCorteColor: "#000000",
      modoAjuste: "contain",
      reducirArteAlBorde: false,
    });
    setShowDocConfig(true);
  };

  const handleCreateDocumento = () => {
    const newDocId = `doc_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const newDoc: DocumentoCDC2 = {
      id: newDocId,
      nombre: tempDocNombre.trim() || `Página ${documentos.length + 1}`,
      canvasConfig: { ...tempCanvasConfig },
      cardConfig: { ...tempCardConfig },
      modoTraseras: "ninguno",
      imagenTraseraComun: null,
      cards: []
    };
    setDocumentos(prev => [...prev, newDoc]);
    setActiveDocumentoId(newDocId);
    setShowDocConfig(false);
    setIsDirty(true);
  };

  const handleDeleteDocumento = (id: string) => {
    if (documentos.length <= 1) return;
    const index = documentos.findIndex(d => d.id === id);
    const updated = documentos.filter(d => d.id !== id);
    setDocumentos(updated);
    if (activeDocumentoId === id) {
      const nextActiveIndex = Math.max(0, index - 1);
      setActiveDocumentoId(updated[nextActiveIndex].id);
    }
    setIsDirty(true);
  };

  const handleRenameDocumento = (id: string, nuevoNombre: string) => {
    setDocumentos(prev => prev.map(d => {
      if (d.id === id) {
        return { ...d, nombre: nuevoNombre };
      }
      return d;
    }));
    setIsDirty(true);
  };

  // --- Estados de Plantillas y Módulos (SRS-006) ---
  const [activeTemplates, setActiveTemplates] = useState<any[]>([]);
  const [templatesMap, setTemplatesMap] = useState<Record<string, any>>({});
  const [importedTemplates, setImportedTemplates] = useState<any[]>([]);
  const [showTemplateModal, setShowTemplateModal] = useState<boolean>(false);
  const [editingCardId, setEditingCardId] = useState<string | null>(null);
  const [templateModalMode, setTemplateModalMode] = useState<"addCard" | "assignBack">("addCard");

  // --- Estados de la Galería Multimedia del Proyecto (SRS-014) ---
  const [projectAssets, setProjectAssetsInternal] = useState<any[]>([]);
  const [showProjectGallery, setShowProjectGallery] = useState<boolean>(false);

  // --- Estados del Setup y Configuración del Proyecto (SRS-022) ---
  const [nombreProyecto, setNombreProyectoInternal] = useState<string>("Mi Baraja");
  const [projectCreated, setProjectCreated] = useState<boolean>(false);
  const [showProjectConfig, setShowProjectConfig] = useState<boolean>(false);

  // --- Estado de cambios sin guardar (IsDirty) ---
  const [isDirty, setIsDirty] = useState<boolean>(false);

  // Wrappers para marcar como modificado (isDirty = true) al realizar acciones desde la UI
  const setNombreProyecto = (value: React.SetStateAction<string>) => {
    setNombreProyectoInternal(value);
    setIsDirty(true);
  };
  const setProjectAssets = (value: React.SetStateAction<any[]>) => {
    setProjectAssetsInternal(value);
    setIsDirty(true);
  };

  // --- Estados de Tipografías del Proyecto (SRS-026) ---
  const [projectFonts, setProjectFontsInternal] = useState<any[]>([]);
  const [showProjectFonts, setShowProjectFonts] = useState<boolean>(false);

  const setProjectFonts = (value: React.SetStateAction<any[]>) => {
    setProjectFontsInternal(value);
    setIsDirty(true);
  };

  const setCanvasConfig = (value: React.SetStateAction<CanvasConfig>) => {
    setCanvasConfigInternal(value);
    setIsDirty(true);
  };

  const setCardConfig = (value: React.SetStateAction<CardConfig>) => {
    setCardConfigInternal(value);
    setIsDirty(true);
  };

  const setGenerarReversos = (value: React.SetStateAction<boolean>) => {
    setGenerarReversosInternal(value);
    setIsDirty(true);
  };

  const setImagenTraseraComun = (value: React.SetStateAction<string | null>) => {
    setImagenTraseraComunInternal(value);
    setIsDirty(true);
  };

  const setCartas = (value: React.SetStateAction<Carta[]>) => {
    setCartasInternal(value);
    setIsDirty(true);
  };

  // --- Estados y Handlers Temporales para Configuración (SRS-022) ---
  const [tempNombreProyecto, setTempNombreProyecto] = useState<string>("Mi Baraja");
  const [tempCanvasType, setTempCanvasType] = useState<any>("A4");
  const [tempCanvasConfig, setTempCanvasConfig] = useState<CanvasConfig>({
    tipo: "A4",
    anchoMm: 210,
    altoMm: 297,
    orientacion: "vertical",
    margenTopMm: 8,
    margenBottomMm: 8,
    margenLeftMm: 8,
    margenRightMm: 8,
    lineasCorteContinuas: true,
    marcasCorteEsquinas: true,
  });
  const [tempCardPreset, setTempCardPreset] = useState<any>("standard");
  const [tempCardConfig, setTempCardConfig] = useState<CardConfig>({
    anchoMm: 63.5,
    altoMm: 88.9,
    espaciadoXMm: 0,
    espaciadoYMm: 0,
    sangradoMm: 0,
    bordeCorteMm: 0,
    bordeCorteColor: "#000000",
    modoAjuste: "contain",
    reducirArteAlBorde: false,
  });

  useEffect(() => {
    if (showProjectConfig) {
      setTempNombreProyecto(nombreProyecto);
      setTempCanvasType(canvasType);
      setTempCanvasConfig({ ...canvasConfig });
      setTempCardPreset(cardPreset);
      setTempCardConfig({ ...cardConfig });
    }
  }, [showProjectConfig, nombreProyecto, canvasConfig, cardConfig, canvasType, cardPreset]);

  const handleTempCanvasPresetChange = (presetKey: any) => {
    setTempCanvasType(presetKey);
    if (presetKey !== "custom") {
      const preset = PREAJUSTES_HOJAS[presetKey as keyof typeof PREAJUSTES_HOJAS];
      setTempCanvasConfig((prev) => ({
        ...prev,
        anchoMm: tempCanvasConfig.orientacion === "vertical" ? preset.ancho : preset.alto,
        altoMm: tempCanvasConfig.orientacion === "vertical" ? preset.alto : preset.ancho,
      }));
    }
  };

  const handleTempOrientationChange = (orientacion: "vertical" | "horizontal") => {
    setTempCanvasConfig((prev) => {
      const w = prev.anchoMm;
      const h = prev.altoMm;
      const shouldSwap = (orientacion === "vertical" && w > h) || (orientacion === "horizontal" && w < h);
      return {
        ...prev,
        orientacion,
        anchoMm: shouldSwap ? h : w,
        altoMm: shouldSwap ? w : h,
      };
    });
  };

  const handleTempCardPresetChange = (presetKey: any) => {
    setTempCardPreset(presetKey);
    if (presetKey !== "custom") {
      const preset = PREAJUSTES_CARTAS[presetKey as keyof typeof PREAJUSTES_CARTAS];
      setTempCardConfig((prev) => ({
        ...prev,
        anchoMm: preset.ancho,
        altoMm: preset.alto,
      }));
    }
  };

  const handleApplyProjectConfig = () => {
    if (!tempNombreProyecto.trim()) {
      alert("Por favor, introduce un nombre para el proyecto.");
      return;
    }
    setNombreProyecto(tempNombreProyecto.trim());
    setCanvasType(tempCanvasType);
    setCanvasConfig(tempCanvasConfig);
    setCardPreset(tempCardPreset);
    setCardConfig(tempCardConfig);
    setProjectCreated(true);
    setShowProjectConfig(false);
  };

  // Alerta de confirmación al salir/recargar la página
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirty) {
        const msg = "Hay cambios sin guardar en tu proyecto. ¿Seguro que deseas salir?";
        e.preventDefault();
        e.returnValue = msg;
        return msg;
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [isDirty]);

  // --- Carga de Plantillas al inicio ---
  useEffect(() => {
    async function loadDefaultTemplates() {
      try {
        const res = await fetch("/modules/default/module.json");
        if (!res.ok) throw new Error("No se pudo cargar el archivo module.json del módulo default");
        const moduleData = await res.json();
        
        const loadedTemplates: any[] = [];
        const loadedTemplatesMap: Record<string, any> = {};

        for (const tRef of moduleData.plantillas || []) {
          try {
            const tRes = await fetch(`/modules/default/${tRef.archivo}`);
            if (!tRes.ok) throw new Error(`No se pudo cargar la plantilla: ${tRef.id}`);
            const tData = await tRes.json();
            loadedTemplates.push(tData);
            loadedTemplatesMap[tRef.id] = tData;
          } catch (err) {
            console.error("Error cargando plantilla:", err);
          }
        }

        setActiveTemplates(loadedTemplates);
        setTemplatesMap((prev) => ({
          ...loadedTemplatesMap,
          ...prev,
        }));
      } catch (err) {
        console.error("Error al inicializar el módulo por defecto:", err);
      }
    }
    loadDefaultTemplates();
  }, []);

  // --- Funciones para la Galería del Proyecto (SRS-014) ---
  const handleUploadProjectAssets = (files: FileList) => {
    const nuevos: any[] = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (file.type.startsWith("image/")) {
        const id = `proj_asset_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
        nuevos.push({
          id,
          nombre: file.name,
          src: URL.createObjectURL(file),
        });
      }
    }
    if (nuevos.length > 0) {
      setProjectAssets((prev) => [...prev, ...nuevos]);
    }
  };

  const handleDeleteProjectAsset = (id: string) => {
    if (window.confirm("¿Seguro que deseas eliminar esta imagen de la galería del proyecto? Las cartas que la usen podrían dejar de mostrarla.")) {
      setProjectAssets((prev) => prev.filter((asset) => asset.id !== id));
    }
  };

  const handleRenameProjectAsset = (id: string) => {
    const asset = projectAssets.find((a) => a.id === id);
    if (!asset) return;
    const nuevoNombre = window.prompt("Introduce el nuevo nombre para la imagen:", asset.nombre);
    if (nuevoNombre && nuevoNombre.trim() !== "") {
      setProjectAssets((prev) =>
        prev.map((a) => (a.id === id ? { ...a, nombre: nuevoNombre.trim() } : a))
      );
    }
  };

  // --- Funciones para las Tipografías del Proyecto (SRS-026) ---
  const handleUploadProjectFonts = (files: FileList) => {
    const validExtensions = [".ttf", ".otf", ".woff", ".woff2"];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const ext = file.name.substring(file.name.lastIndexOf(".")).toLowerCase();
      if (!validExtensions.includes(ext)) {
        alert(`El archivo "${file.name}" no es una tipografía soportada (.ttf, .otf, .woff, .woff2).`);
        continue;
      }
      
      const familyName = file.name
        .substring(0, file.name.lastIndexOf("."))
        .replace(/[^a-zA-Z0-9_-]/g, "");

      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        const base64Data = result.split(",")[1];
        
        const fontSrc = URL.createObjectURL(file);
        
        const newFont = {
          id: `proj_font_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
          nombre: familyName,
          filename: file.name,
          type: file.type || `font/${ext.replace(".", "")}`,
          data: base64Data,
          src: fontSrc
        };
        
        setProjectFonts((prev) => [...prev, newFont]);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDeleteProjectFont = (id: string) => {
    const font = projectFonts.find((f) => f.id === id);
    if (!font) return;
    if (window.confirm(`¿Estás seguro de que deseas eliminar la tipografía "${font.nombre}"?`)) {
      if (font.src) {
        URL.revokeObjectURL(font.src);
      }
      setProjectFonts((prev) => prev.filter((f) => f.id !== id));
    }
  };

  const handleRenameProjectFont = (id: string) => {
    const font = projectFonts.find((f) => f.id === id);
    if (!font) return;
    const nuevoNombre = window.prompt("Introduce el nuevo nombre de la familia de fuentes (sin espacios ni caracteres especiales):", font.nombre);
    if (nuevoNombre) {
      const sanitized = nuevoNombre.replace(/[^a-zA-Z0-9_-]/g, "").trim();
      if (!sanitized) return;
      setProjectFonts((prev) => prev.map((f) => f.id === id ? { ...f, nombre: sanitized } : f));
    }
  };

  // --- Importación de Imágenes (Mapeado a URLs locales) ---
  const handleImageImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const files = Array.from(e.target.files);
    procesarArchivos(files);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (!e.dataTransfer.files) return;
    const files = Array.from(e.dataTransfer.files).filter(file => file.type.startsWith("image/"));
    procesarArchivos(files);
  };

  const procesarArchivos = (files: File[]) => {
    if (files.length === 0) return;
    const nuevasCartas: Carta[] = files.map((file) => ({
      id: `${Date.now()}-${Math.random()}`,
      nombre: file.name.split(".").slice(0, -1).join("."),
      imagenFrontal: URL.createObjectURL(file),
      imagenTrasera: null,
      cantidad: 1,
    }));
    setCartas((prev) => [...prev, ...nuevasCartas]);
  };

  const procesarTraseraComun = (file: File) => {
    setImagenTraseraComun(URL.createObjectURL(file));
  };

  const procesarTraseraBloque = (files: File[]) => {
    setCartas((prev) => {
      return prev.map((carta, index) => {
        if (index < files.length) {
          return {
            ...carta,
            imagenTrasera: URL.createObjectURL(files[index]),
          };
        }
        return carta;
      });
    });
  };

  const handleTraseraComunUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      procesarTraseraComun(e.target.files[0]);
    }
  };

  const handleTraseraIndividualUpload = (id: string, e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const url = URL.createObjectURL(e.target.files[0]);
      setCartas((prev) =>
        prev.map((c) => (c.id === id ? { ...c, imagenTrasera: url } : c))
      );
    }
  };

  const handleTraseraImportBloque = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const files = Array.from(e.target.files).filter(file => file.type.startsWith("image/"));
    if (files.length === 0) return;
    procesarTraseraBloque(files);
  };

  // --- Manejadores Drag & Drop para Traseras (SRS-004) ---
  const [dragOverComun, setDragOverComun] = useState<boolean>(false);
  const [dragOverBloque, setDragOverBloque] = useState<boolean>(false);

  const handleDragOverComun = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOverComun(true);
  };

  const handleDragLeaveComun = () => {
    setDragOverComun(false);
  };

  const handleDropComun = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOverComun(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      if (file.type.startsWith("image/")) {
        procesarTraseraComun(file);
      }
    }
  };

  const handleDragOverBloque = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOverBloque(true);
  };

  const handleDragLeaveBloque = () => {
    setDragOverBloque(false);
  };

  const handleDropBloque = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOverBloque(false);
    if (e.dataTransfer.files) {
      const files = Array.from(e.dataTransfer.files).filter(file => file.type.startsWith("image/"));
      if (files.length > 0) {
        procesarTraseraBloque(files);
      }
    }
  };

  const eliminarTraseraIndividual = (id: string) => {
    setCartas((prev) =>
      prev.map((c) => (c.id === id ? { ...c, imagenTrasera: null } : c))
    );
  };

  const modificarCantidad = (id: string, delta: number) => {
    setCartas((prev) =>
      prev.map((c) =>
        c.id === id ? { ...c, cantidad: Math.max(1, c.cantidad + delta) } : c
      )
    );
  };

  const eliminarCarta = (id: string) => {
    if (window.confirm("¿Estás seguro de que deseas eliminar esta carta?")) {
      setCartas((prev) => prev.filter((c) => c.id !== id));
      setSelectedCardIds((prev) => prev.filter((x) => x !== id));
    }
  };

  // --- Generar ZIP del Proyecto (CDC2) ---
  const generarProyectoZip = async (): Promise<Blob> => {
    const zip = new JSZip();
    const assetsFolder = zip.folder("assets")!;
    const projectAssetsFolder = zip.folder("project_assets")!;
    const imagenMap = new Map<string, string>(); // blobUrl -> assetPath
    const projectAssetMap = new Map<string, string>(); // blobUrl -> projectAssetPath
    const processedProjectAssets = [];

    // Procesar recursos de la galería del proyecto
    for (const asset of projectAssets) {
      if (asset.src && (asset.src.startsWith("blob:") || asset.src.startsWith("data:"))) {
        try {
          const res = await fetch(asset.src);
          const blob = await res.blob();
          
          let extension = "png";
          if (blob.type === "image/jpeg") extension = "jpg";
          else if (blob.type === "image/webp") extension = "webp";
          else if (blob.type === "image/gif") extension = "gif";
          
          const filename = `${asset.id}.${extension}`;
          projectAssetsFolder.file(filename, blob);
          
          const assetPath = `project_asset://${filename}`;
          projectAssetMap.set(asset.src, assetPath);
          processedProjectAssets.push({
            id: asset.id,
            nombre: asset.nombre,
            src: assetPath,
          });
        } catch (err) {
          console.error("Error al procesar recurso de la galería del proyecto:", asset, err);
        }
      } else if (asset.src && asset.src.startsWith("project_asset://")) {
        projectAssetMap.set(asset.src, asset.src);
        processedProjectAssets.push(asset);
      }
    }

    const addBlobToZip = async (blobUrl: string, baseName: string): Promise<string> => {
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
              if (nextOverride.src && nextOverride.src.startsWith("blob:")) {
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
              if (nextOverride.src && nextOverride.src.startsWith("blob:")) {
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
              if ((capa.tipo === "image" || capa.tipo === "image-switch") && capa.src && capa.src.startsWith("blob:")) {
                capa.src = await addBlobToZip(capa.src, `card_${card.id}_template_image_${i}`);
              }
              if (capa.tipo === "image-switch" && capa.options) {
                for (let o = 0; o < capa.options.length; o++) {
                  const opt = capa.options[o];
                  if (opt.src && opt.src.startsWith("blob:")) {
                    opt.src = await addBlobToZip(opt.src, `card_${card.id}_template_image_switch_option_${i}_${o}`);
                  }
                }
              }
            }
          }
          if (clonedPlantilla.assets) {
            for (let i = 0; i < clonedPlantilla.assets.length; i++) {
              const asset = clonedPlantilla.assets[i];
              if (asset.src && asset.src.startsWith("blob:")) {
                asset.src = await addBlobToZip(asset.src, `card_${card.id}_template_asset_${i}`);
              }
            }
          }
          processedPlantilla = clonedPlantilla;
        }

        let processedPlantillaTrasera = undefined;
        if (card.plantillaTrasera) {
          const clonedPlantillaTrasera = JSON.parse(JSON.stringify(card.plantillaTrasera));
          if (clonedPlantillaTrasera.capas) {
            for (let i = 0; i < clonedPlantillaTrasera.capas.length; i++) {
              const capa = clonedPlantillaTrasera.capas[i];
              if ((capa.tipo === "image" || capa.tipo === "image-switch") && capa.src && capa.src.startsWith("blob:")) {
                capa.src = await addBlobToZip(capa.src, `card_${card.id}_back_template_image_${i}`);
              }
              if (capa.tipo === "image-switch" && capa.options) {
                for (let o = 0; o < clonedPlantillaTrasera.capas[i].options.length; o++) {
                  const opt = clonedPlantillaTrasera.capas[i].options[o];
                  if (opt.src && opt.src.startsWith("blob:")) {
                    opt.src = await addBlobToZip(opt.src, `card_${card.id}_back_template_image_switch_option_${i}_${o}`);
                  }
                }
              }
            }
          }
          if (clonedPlantillaTrasera.assets) {
            for (let i = 0; i < clonedPlantillaTrasera.assets.length; i++) {
              const asset = clonedPlantillaTrasera.assets[i];
              if (asset.src && asset.src.startsWith("blob:")) {
                asset.src = await addBlobToZip(asset.src, `card_${card.id}_back_template_asset_${i}`);
              }
            }
          }
          processedPlantillaTrasera = clonedPlantillaTrasera;
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
          if ((capa.tipo === "image" || capa.tipo === "image-switch") && capa.src && capa.src.startsWith("blob:")) {
            capa.src = await addBlobToZip(capa.src, `template_${template.id}_image_${i}`);
          }
          if (capa.tipo === "image-switch" && capa.options) {
            for (let o = 0; o < capa.options.length; o++) {
              const opt = capa.options[o];
              if (opt.src && opt.src.startsWith("blob:")) {
                opt.src = await addBlobToZip(opt.src, `template_${template.id}_image_switch_option_${i}_${o}`);
              }
            }
          }
        }
      }
      if (clonedTemplate.assets) {
        for (let i = 0; i < clonedTemplate.assets.length; i++) {
          const asset = clonedTemplate.assets[i];
          if (asset.src && asset.src.startsWith("blob:")) {
            asset.src = await addBlobToZip(asset.src, `template_${template.id}_asset_${i}`);
          }
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
          if ((capa.tipo === "image" || capa.tipo === "image-switch") && capa.src && capa.src.startsWith("blob:")) {
            capa.src = await addBlobToZip(capa.src, `template_${id}_image_${i}`);
          }
          if (capa.tipo === "image-switch" && capa.options) {
            for (let o = 0; o < clonedTemplate.capas[i].options.length; o++) {
              const opt = clonedTemplate.capas[i].options[o];
              if (opt.src && opt.src.startsWith("blob:")) {
                opt.src = await addBlobToZip(opt.src, `template_${id}_image_switch_option_${i}_${o}`);
              }
            }
          }
        }
      }
      if (clonedTemplate.assets) {
        for (let i = 0; i < clonedTemplate.assets.length; i++) {
          const asset = clonedTemplate.assets[i];
          if (asset.src && asset.src.startsWith("blob:")) {
            asset.src = await addBlobToZip(asset.src, `template_${id}_asset_${i}`);
          }
        }
      }
      processedTemplatesMap[id] = clonedTemplate;
    }

    const proyecto = {
      version: "2.1.0" as const,
      meta: {
        nombre: nombreProyecto,
        fechaCreacion: new Date().toISOString(),
        fechaModificacion: new Date().toISOString(),
      },
      documentos: processedDocumentos,
      activeDocumentoId,
      templates: processedTemplatesMap,
      assets: processedProjectAssets,
      customFonts: projectFonts.map((f: any) => ({
        id: f.id,
        nombre: f.nombre,
        filename: f.filename,
        type: f.type,
        data: f.data
      }))
    };

    zip.file("project.json", JSON.stringify(proyecto, null, 2));
    return await zip.generateAsync({ type: "blob" });
  };

  const getExportFileName = (extension: string): string => {
    const cleanName = nombreProyecto
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "");
    const finalName = cleanName || "proyecto_cdc2";
    return `${finalName}_${Date.now()}.${extension}`;
  };

  // --- Exportación a PDF vía Servidor Local ---
  const [exportandoPdf, setExportandoPdf] = useState<boolean>(false);

  const handleExportarPdf = async () => {
    if (cartas.length === 0) return;
    
    try {
      setExportandoPdf(true);
      const zipContentBlob = await generarProyectoZip();

      const formData = new FormData();
      formData.append("archivoProyecto", zipContentBlob, "proyecto.cdc2");

      const response = await fetch("/api/exportar/pdf", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || "Error en el servidor al generar el PDF.");
      }

      const pdfBlob = await response.blob();
      const downloadUrl = URL.createObjectURL(pdfBlob);
      const link = document.createElement("a");
      link.href = downloadUrl;
      link.download = getExportFileName("pdf");
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(downloadUrl);

    } catch (error: any) {
      alert(`Error al generar el PDF: ${error.message || error}`);
    } finally {
      setExportandoPdf(false);
    }
  };

  // --- Guardar Proyecto Localmente (.cdc2) ---
  const handleGuardarProyecto = async () => {
    if (cartas.length === 0) return;
    try {
      const zipContentBlob = await generarProyectoZip();
      const downloadUrl = URL.createObjectURL(zipContentBlob);
      const link = document.createElement("a");
      link.href = downloadUrl;
      link.download = getExportFileName("cdc2");
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(downloadUrl);
      setIsDirty(false);
    } catch (error: any) {
      alert(`Error al guardar el proyecto: ${error.message || error}`);
    }
  };

  // --- Cargar Proyecto Local (.cdc2) ---
  const handleCargarProyecto = async (file: File) => {
    try {
      const zip = await JSZip.loadAsync(file);
      
      const projectFile = zip.file("project.json");
      if (!projectFile) {
        throw new Error("El archivo no contiene un project.json válido.");
      }
      
      const projectJsonText = await projectFile.async("text");
      const proyecto = validarYParsearProyecto(projectJsonText);

      // Limpiar URLs de objeto anteriores
      cartas.forEach((c) => {
        if (c.imagenFrontal) URL.revokeObjectURL(c.imagenFrontal);
        if (c.imagenTrasera) URL.revokeObjectURL(c.imagenTrasera);
      });
      if (imagenTraseraComun) {
        URL.revokeObjectURL(imagenTraseraComun);
      }
      projectFonts.forEach((f) => {
        if (f.src) URL.revokeObjectURL(f.src);
      });
      setProjectFontsInternal([]);

      const cacheBlobUrls = new Map<string, string>();
      const matchesAssetScheme = (src: string | null | undefined): boolean => {
        if (!src) return false;
        return src.startsWith("asset://") || src.startsWith("project_asset://");
      };

      const resolverAssetBlob = async (assetPath: string | null): Promise<string | null> => {
        if (!assetPath) return null;
        if (cacheBlobUrls.has(assetPath)) {
          return cacheBlobUrls.get(assetPath)!;
        }

        if (assetPath.startsWith("project_asset://")) {
          const filename = assetPath.replace("project_asset://", "");
          const zipImgFile = zip.file(`project_assets/${filename}`);
          if (!zipImgFile) {
            console.error(`No se encontró el project asset ${filename} en el ZIP`);
            return null;
          }
          const blob = await zipImgFile.async("blob");
          const objectUrl = URL.createObjectURL(blob);
          cacheBlobUrls.set(assetPath, objectUrl);
          return objectUrl;
        }

        const filename = assetPath.replace("asset://", "");
        const zipImgFile = zip.file(`assets/${filename}`);
        if (!zipImgFile) {
          console.error(`No se encontró el asset ${filename} en el ZIP`);
          return null;
        }

        const blob = await zipImgFile.async("blob");
        const objectUrl = URL.createObjectURL(blob);
        cacheBlobUrls.set(assetPath, objectUrl);
        return objectUrl;
      };

      // Cargar todos los documentos
      for (const doc of proyecto.documentos) {
        const nuevasCartas: Carta[] = [];
        for (const card of doc.cards) {
          let frontalUrl: string | undefined = undefined;
          if (card.imagenFrontal) {
            const res = await resolverAssetBlob(card.imagenFrontal);
            if (res) frontalUrl = res;
          }

          if (!frontalUrl && !card.plantillaId) {
            continue;
          }

          const traseraUrl = await resolverAssetBlob(card.imagenTrasera);

          // Resolver overrides
          const processedOverrides: Record<string, any> = {};
          if (card.capasOverrides) {
            for (const [capaId, overrideVal] of Object.entries(card.capasOverrides)) {
              if (overrideVal && typeof overrideVal === "object") {
                const nextOverride: any = { ...overrideVal };
                if (nextOverride.src && matchesAssetScheme(nextOverride.src)) {
                  const url = await resolverAssetBlob(nextOverride.src);
                  if (url) nextOverride.src = url;
                }
                processedOverrides[capaId] = nextOverride;
              }
            }
          }

          const processedOverridesTrasera: Record<string, any> = {};
          if (card.capasOverridesTrasera) {
            for (const [capaId, overrideVal] of Object.entries(card.capasOverridesTrasera)) {
              if (overrideVal && typeof overrideVal === "object") {
                const nextOverride: any = { ...overrideVal };
                if (nextOverride.src && matchesAssetScheme(nextOverride.src)) {
                  const url = await resolverAssetBlob(nextOverride.src);
                  if (url) nextOverride.src = url;
                }
                processedOverridesTrasera[capaId] = nextOverride;
              }
            }
          }

          let processedPlantilla = undefined;
          if (card.plantilla) {
            const clonedPlantilla = JSON.parse(JSON.stringify(card.plantilla));
            if (clonedPlantilla.capas) {
              for (const capa of clonedPlantilla.capas) {
                if ((capa.tipo === "image" || capa.tipo === "image-switch") && capa.src && matchesAssetScheme(capa.src)) {
                  const url = await resolverAssetBlob(capa.src);
                  if (url) capa.src = url;
                }
                if (capa.tipo === "image-switch" && capa.options) {
                  for (const opt of capa.options) {
                    if (opt.src && matchesAssetScheme(opt.src)) {
                      const url = await resolverAssetBlob(opt.src);
                      if (url) opt.src = url;
                    }
                  }
                }
              }
            }
            if (clonedPlantilla.assets) {
              for (const asset of clonedPlantilla.assets) {
                if (asset.src && matchesAssetScheme(asset.src)) {
                  const url = await resolverAssetBlob(asset.src);
                  if (url) asset.src = url;
                }
              }
            }
            processedPlantilla = clonedPlantilla;
          }

          let processedPlantillaTrasera = undefined;
          if (card.plantillaTrasera) {
            const clonedPlantillaTrasera = JSON.parse(JSON.stringify(card.plantillaTrasera));
            if (clonedPlantillaTrasera.capas) {
              for (const capa of clonedPlantillaTrasera.capas) {
                if ((capa.tipo === "image" || capa.tipo === "image-switch") && capa.src && matchesAssetScheme(capa.src)) {
                  const url = await resolverAssetBlob(capa.src);
                  if (url) capa.src = url;
                }
                if (capa.tipo === "image-switch" && capa.options) {
                  for (const opt of capa.options) {
                    if (opt.src && matchesAssetScheme(opt.src)) {
                      const url = await resolverAssetBlob(opt.src);
                      if (url) opt.src = url;
                    }
                  }
                }
              }
            }
            if (clonedPlantillaTrasera.assets) {
              for (const asset of clonedPlantillaTrasera.assets) {
                if (asset.src && matchesAssetScheme(asset.src)) {
                  const url = await resolverAssetBlob(asset.src);
                  if (url) asset.src = url;
                }
              }
            }
            processedPlantillaTrasera = clonedPlantillaTrasera;
          }

          nuevasCartas.push({
            id: card.id || `${Date.now()}-${Math.random()}`,
            nombre: card.nombre,
            imagenFrontal: frontalUrl,
            imagenTrasera: traseraUrl,
            cantidad: card.cantidad || 1,
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
        doc.cards = nuevasCartas;
        doc.imagenTraseraComun = await resolverAssetBlob(doc.imagenTraseraComun);
      }

      // Cargar plantillas del proyecto (desde carpeta templates/ o fallback proyecto.templates)
      const newImported: any[] = [];
      const loadedTemplatesMap: Record<string, any> = {};

      const templateFiles = zip.filter((path) => path.startsWith("templates/") && path.endsWith(".json"));
      if (templateFiles.length > 0) {
        for (const tFile of templateFiles) {
          try {
            const content = await tFile.async("text");
            const tData = JSON.parse(content);
            if (tData.id && tData.nombre) {
              // Resolver assets de la plantilla
              if (tData.capas) {
                for (const capa of tData.capas) {
                  if ((capa.tipo === "image" || capa.tipo === "image-switch") && capa.src && matchesAssetScheme(capa.src)) {
                    const url = await resolverAssetBlob(capa.src);
                    if (url) capa.src = url;
                  }
                  if (capa.tipo === "image-switch" && capa.options) {
                    for (const opt of capa.options) {
                      if (opt.src && matchesAssetScheme(opt.src)) {
                        const url = await resolverAssetBlob(opt.src);
                        if (url) opt.src = url;
                      }
                    }
                  }
                }
              }
              if (tData.assets) {
                for (const asset of tData.assets) {
                  if (asset.src && matchesAssetScheme(asset.src)) {
                    const url = await resolverAssetBlob(asset.src);
                    if (url) asset.src = url;
                  }
                }
              }
              newImported.push(tData);
              loadedTemplatesMap[tData.id] = tData;
            }
          } catch (err) {
            console.error("Error al cargar plantilla desde ZIP:", err);
          }
        }
      } else if (proyecto.templates) {
        // Compatibilidad hacia atrás
        for (const [id, template] of Object.entries(proyecto.templates)) {
          const tData = JSON.parse(JSON.stringify(template));
          if (id !== "simple" && id !== "vacia" && tData.id && tData.nombre) {
            // Resolver assets de la plantilla
            if (tData.capas) {
              for (const capa of tData.capas) {
                if ((capa.tipo === "image" || capa.tipo === "image-switch") && capa.src && matchesAssetScheme(capa.src)) {
                  const url = await resolverAssetBlob(capa.src);
                  if (url) capa.src = url;
                }
                if (capa.tipo === "image-switch" && capa.options) {
                  for (const opt of capa.options) {
                    if (opt.src && matchesAssetScheme(opt.src)) {
                      const url = await resolverAssetBlob(opt.src);
                      if (url) opt.src = url;
                    }
                  }
                }
              }
            }
            if (tData.assets) {
              for (const asset of tData.assets) {
                if (asset.src && matchesAssetScheme(asset.src)) {
                  const url = await resolverAssetBlob(asset.src);
                  if (url) asset.src = url;
                }
              }
            }
            newImported.push(tData);
            loadedTemplatesMap[id] = tData;
          }
        }
      }

      // Cargar los recursos globales de la galería del proyecto (SRS-014)
      const nuevosProjectAssets: any[] = [];
      if (proyecto.assets) {
        for (const asset of proyecto.assets) {
          if (asset.src) {
            const url = await resolverAssetBlob(asset.src);
            if (url) {
              nuevosProjectAssets.push({
                id: asset.id,
                nombre: asset.nombre,
                src: url
              });
            }
          }
        }
      }
      setProjectAssetsInternal(nuevosProjectAssets);

      // Cargar tipografías del proyecto (SRS-026)
      const nuevosProjectFonts: any[] = [];
      if (proyecto.customFonts) {
        for (const font of proyecto.customFonts) {
          if (font.data) {
            try {
              const byteCharacters = atob(font.data);
              const byteNumbers = new Array(byteCharacters.length);
              for (let i = 0; i < byteCharacters.length; i++) {
                byteNumbers[i] = byteCharacters.charCodeAt(i);
              }
              const byteArray = new Uint8Array(byteNumbers);
              const blob = new Blob([byteArray], { type: font.type });
              const fontSrc = URL.createObjectURL(blob);
              
              nuevosProjectFonts.push({
                id: font.id,
                nombre: font.nombre,
                filename: font.filename,
                type: font.type,
                data: font.data,
                src: fontSrc
              });
            } catch (err) {
              console.error("Error al cargar tipografía de proyecto:", font.nombre, err);
            }
          }
        }
      }
      setProjectFontsInternal(nuevosProjectFonts);

      // Decodificar tipografías en plantillas de cartas
      const decodeTemplateFonts = (t: any) => {
        if (!t || !t.customFonts) return;
        for (const font of t.customFonts) {
          if (font.data && !font.src) {
            try {
              const byteCharacters = atob(font.data);
              const byteNumbers = new Array(byteCharacters.length);
              for (let i = 0; i < byteCharacters.length; i++) {
                byteNumbers[i] = byteCharacters.charCodeAt(i);
              }
              const byteArray = new Uint8Array(byteNumbers);
              const blob = new Blob([byteArray], { type: font.type });
              font.src = URL.createObjectURL(blob);
            } catch (err) {
              console.error("Error al cargar tipografía de plantilla:", font.nombre, err);
            }
          }
        }
      };

      for (const doc of proyecto.documentos) {
        for (const card of doc.cards) {
          if (card.plantilla) decodeTemplateFonts(card.plantilla);
          if (card.plantillaTrasera) decodeTemplateFonts(card.plantillaTrasera);
        }
      }

      for (const tId of Object.keys(loadedTemplatesMap)) {
        decodeTemplateFonts(loadedTemplatesMap[tId]);
      }

      setTemplatesMap((prev) => ({
        ...prev,
        ...loadedTemplatesMap,
      }));
      setImportedTemplates(newImported);

      setDocumentos(proyecto.documentos);
      setActiveDocumentoId(proyecto.activeDocumentoId);

      if (proyecto.meta && proyecto.meta.nombre) {
        setNombreProyectoInternal(proyecto.meta.nombre);
      } else {
        setNombreProyectoInternal("Proyecto Importado");
      }
      setProjectCreated(true);

      const activeDoc = proyecto.documentos.find((d: any) => d.id === proyecto.activeDocumentoId) || proyecto.documentos[0];
      setCanvasType(activeDoc.canvasConfig.tipo || "Custom");
      setCardPreset("custom");

      setIsDirty(false);
      alert("Proyecto cargado correctamente.");
    } catch (err: any) {
      alert(`Error al cargar el proyecto: ${err.message || err}`);
    }
  };

  const handleCargarProyectoFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleCargarProyecto(e.target.files[0]);
    }
    e.target.value = "";
  };

  const handleCargarPlantillaFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    try {
      const zip = await JSZip.loadAsync(file);
      const templateFile = zip.file("template.json");
      if (!templateFile) {
        throw new Error("El archivo no contiene un template.json válido.");
      }
      const templateJsonText = await templateFile.async("text");
      const templateData = validarYParsearPlantilla(templateJsonText);

      // Resolver assets de la plantilla
      const cacheBlobUrls = new Map<string, string>();
      const resolverAssetBlob = async (assetPath: string | null): Promise<string | null> => {
        if (!assetPath) return null;
        if (!assetPath.startsWith("asset://")) return assetPath;
        if (cacheBlobUrls.has(assetPath)) {
          return cacheBlobUrls.get(assetPath)!;
        }
        const filename = assetPath.replace("asset://", "");
        const zipImgFile = zip.file(`assets/${filename}`);
        if (!zipImgFile) {
          console.error(`No se encontró el asset ${filename} en el ZIP`);
          return null;
        }
        const blob = await zipImgFile.async("blob");
        const objectUrl = URL.createObjectURL(blob);
        cacheBlobUrls.set(assetPath, objectUrl);
        return objectUrl;
      };

      if (templateData.capas) {
        for (let i = 0; i < templateData.capas.length; i++) {
          const capa = templateData.capas[i];
          if ((capa.tipo === "image" || capa.tipo === "image-switch") && capa.src && capa.src.startsWith("asset://")) {
            const objectUrl = await resolverAssetBlob(capa.src);
            if (objectUrl) {
              capa.src = objectUrl;
            }
          }
          if (capa.tipo === "image-switch" && capa.options) {
            for (let o = 0; o < capa.options.length; o++) {
              const opt = capa.options[o];
              if (opt.src && opt.src.startsWith("asset://")) {
                const objectUrl = await resolverAssetBlob(opt.src);
                if (objectUrl) {
                  opt.src = objectUrl;
                }
              }
            }
          }
        }
      }

      if (templateData.assets) {
        for (let i = 0; i < templateData.assets.length; i++) {
          const asset = templateData.assets[i];
          if (asset.src && asset.src.startsWith("asset://")) {
            const objectUrl = await resolverAssetBlob(asset.src);
            if (objectUrl) {
              asset.src = objectUrl;
            }
          }
        }
      }

      setTemplatesMap((prev) => ({
        ...prev,
        [templateData.id]: templateData,
      }));

      setImportedTemplates((prev) => {
        const index = prev.findIndex((t) => t.id === templateData.id);
        if (index !== -1) {
          const updated = [...prev];
          updated[index] = templateData;
          return updated;
        }
        return [...prev, templateData];
      });

      alert(`Plantilla "${templateData.nombre}" importada con éxito.`);
    } catch (err: any) {
      alert(`Error al importar plantilla: ${err.message || err}`);
    } finally {
      e.target.value = "";
    }
  };

  // --- Añadir Carta desde Plantilla (SRS-006) y Asignar Reverso ---
  const handleSelectTemplate = (plantilla: any) => {
    let templateInstance = JSON.parse(JSON.stringify(plantilla));
    if (templateInstance.id === "vacia") {
      templateInstance.anchoMm = cardConfig.anchoMm;
      templateInstance.altoMm = cardConfig.altoMm;
      if (templateInstance.capas) {
        templateInstance.capas = templateInstance.capas.map((capa: any) => {
          if (capa.tipo === "background" || capa.id === "background") {
            return {
              ...capa,
              anchoMm: cardConfig.anchoMm,
              altoMm: cardConfig.altoMm,
            };
          }
          return capa;
        });
      }
    }

    if (templateModalMode === "addCard") {
      const overrides: Record<string, any> = {};
      if (templateInstance.capas) {
        templateInstance.capas.forEach((capa: any) => {
          if (capa.tipo === "text") {
            overrides[capa.id] = {
              color: capa.color || "#000000",
              alineacion: capa.alineacion || "left",
              contenidoRaw: capa.contenidoRaw || "",
              fontFamily: capa.fontFamily || "sans-serif",
              fontSizePt: capa.fontSizePt || 12,
            };
          }
        });
      }

      const nuevaCarta: Carta = {
        id: `carta_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        nombre: templateInstance.nombre,
        cantidad: 1,
        imagenTrasera: null,
        plantillaId: templateInstance.id,
        valoresCampos: {},
        capasOverrides: overrides,
        plantilla: templateInstance,
      };

      if (templateInstance.capas) {
        templateInstance.capas.forEach((capa: any) => {
          if (capa.tipo === "text") {
            nuevaCarta.valoresCampos![capa.nombre] = capa.contenidoRaw || "";
          }
        });
      }

      setCartas((prev) => insertarCartaDesdePlantilla(prev, nuevaCarta, selectedCardIds));
      setSelectedCardIds([nuevaCarta.id]);
    } else if (templateModalMode === "assignBack") {
      const overridesTrasera: Record<string, any> = {};
      if (templateInstance.capas) {
        templateInstance.capas.forEach((capa: any) => {
          if (capa.tipo === "text") {
            overridesTrasera[capa.id] = {
              color: capa.color || "#000000",
              alineacion: capa.alineacion || "left",
              contenidoRaw: capa.contenidoRaw || "",
              fontFamily: capa.fontFamily || "sans-serif",
              fontSizePt: capa.fontSizePt || 12,
            };
          }
        });
      }

      setCartas((prev) =>
        prev.map((c) => {
          if (selectedCardIds.includes(c.id)) {
            const valoresCamposTrasera: Record<string, string> = {};
            if (templateInstance.capas) {
              templateInstance.capas.forEach((capa: any) => {
                if (capa.tipo === "text") {
                  valoresCamposTrasera[capa.nombre] = capa.contenidoRaw || "";
                }
              });
            }
            return {
              ...c,
              plantillaTraseraId: templateInstance.id,
              valoresCamposTrasera,
              capasOverridesTrasera: overridesTrasera,
              imagenTrasera: null,
              plantillaTrasera: templateInstance,
            };
          }
          return c;
        })
      );
    }
    setShowTemplateModal(false);
  };

  const abrirModalPlantillaParaTrasera = () => {
    setTemplateModalMode("assignBack");
    setShowTemplateModal(true);
  };

  const quitarPlantillaTrasera = (id: string) => {
    setCartas((prev) =>
      prev.map((c) =>
        c.id === id
          ? {
              ...c,
              plantillaTraseraId: undefined,
              valoresCamposTrasera: undefined,
              capasOverridesTrasera: undefined,
            }
          : c
      )
    );
  };

  const quitarPlantillaTraseraLote = () => {
    if (selectedCardIds.length === 0) return;
    setCartas((prev) =>
      prev.map((c) =>
        selectedCardIds.includes(c.id)
          ? {
              ...c,
              plantillaTraseraId: undefined,
              valoresCamposTrasera: undefined,
              capasOverridesTrasera: undefined,
            }
          : c
      )
    );
  };

  // Cerrar modal de plantilla al presionar Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && showTemplateModal) {
        setShowTemplateModal(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [showTemplateModal]);

  // --- Nuevo Proyecto (Reset) ---
  const handleNuevoProyecto = () => {
    if (window.confirm("¿Seguro que deseas empezar un nuevo proyecto? Se borrarán todos los cambios no guardados.")) {
      cartas.forEach((c) => {
        if (c.imagenFrontal) URL.revokeObjectURL(c.imagenFrontal);
        if (c.imagenTrasera) URL.revokeObjectURL(c.imagenTrasera);
      });
      if (imagenTraseraComun) {
        URL.revokeObjectURL(imagenTraseraComun);
      }

      setCartasInternal([]);
      setTemplatesMap({});
      setImagenTraseraComunInternal(null);
      setGenerarReversosInternal(false);
      setCanvasType("A4");
      setCanvasConfigInternal({
        tipo: "A4",
        anchoMm: 210,
        altoMm: 297,
        orientacion: "vertical",
        margenTopMm: 8,
        margenBottomMm: 8,
        margenLeftMm: 8,
        margenRightMm: 8,
        lineasCorteContinuas: true,
        marcasCorteEsquinas: true,
      });
      setCardPreset("standard");
      setCardConfigInternal({
        anchoMm: 63.5,
        altoMm: 88.9,
        espaciadoXMm: 0,
        espaciadoYMm: 0,
        sangradoMm: 0,
        bordeCorteMm: 0,
        bordeCorteColor: "#000000",
        modoAjuste: "contain",
        reducirArteAlBorde: false,
      });
      setNombreProyectoInternal("Mi Baraja");
      setProjectCreated(false);
      setIsDirty(false);
    }
  };

  const handleSaveCardEdits = (
    valoresCampos: Record<string, string>,
    capasOverrides: Record<string, any>,
    valoresCamposTrasera?: Record<string, string>,
    capasOverridesTrasera?: Record<string, any>,
    plantillaActualizada?: any,
    plantillaTraseraActualizada?: any
  ) => {
    if (!editingCardId) return;

    const targetCard = cartas.find((c) => c.id === editingCardId);
    if (!targetCard) return;

    let deletedFrontLayerIds: string[] = [];
    let deletedFrontFieldKeys: string[] = [];

    if (plantillaActualizada) {
      const originalPlantilla = targetCard.plantilla;
      if (originalPlantilla) {
        const newLayerIds = new Set(plantillaActualizada.capas.map((c: any) => c.id));
        const newFieldKeys = new Set(plantillaActualizada.camposConfig?.map((f: any) => f.clave) || []);
        
        deletedFrontLayerIds = originalPlantilla.capas
          .map((c: any) => c.id)
          .filter((id: string) => !newLayerIds.has(id));
          
        deletedFrontFieldKeys = (originalPlantilla.camposConfig || [])
          .map((f: any) => f.clave)
          .filter((clave: string) => !newFieldKeys.has(clave));
      }
    }

    let deletedBackLayerIds: string[] = [];
    let deletedBackFieldKeys: string[] = [];

    if (plantillaTraseraActualizada) {
      const originalPlantillaTrasera = targetCard.plantillaTrasera;
      if (originalPlantillaTrasera) {
        const newLayerIds = new Set(plantillaTraseraActualizada.capas.map((c: any) => c.id));
        const newFieldKeys = new Set(plantillaTraseraActualizada.camposConfig?.map((f: any) => f.clave) || []);
        
        deletedBackLayerIds = originalPlantillaTrasera.capas
          .map((c: any) => c.id)
          .filter((id: string) => !newLayerIds.has(id));
          
        deletedBackFieldKeys = (originalPlantillaTrasera.camposConfig || [])
          .map((f: any) => f.clave)
          .filter((clave: string) => !newFieldKeys.has(clave));
      }
    }

    setCartas((prev) =>
      prev.map((c) => {
        if (c.id !== editingCardId) {
          return c;
        }

        // Limpiar overrides frontales
        const nextOverrides = { ...capasOverrides };
        deletedFrontLayerIds.forEach((id) => {
          delete nextOverrides[id];
        });

        // Limpiar valores frontales
        const nextValores = { ...valoresCampos };
        deletedFrontFieldKeys.forEach((key) => {
          delete nextValores[key];
        });

        // Limpiar overrides traseros
        const nextOverridesTrasera = capasOverridesTrasera ? { ...capasOverridesTrasera } : {};
        deletedBackLayerIds.forEach((id) => {
          delete nextOverridesTrasera[id];
        });

        // Limpiar valores traseros
        const nextValoresTrasera = valoresCamposTrasera ? { ...valoresCamposTrasera } : {};
        deletedBackFieldKeys.forEach((key) => {
          delete nextValoresTrasera[key];
        });

        const nuevoNombre = nextValores.titulo || nextValores.nombre;
        return {
          ...c,
          nombre: nuevoNombre || c.nombre,
          valoresCampos: nextValores,
          capasOverrides: nextOverrides,
          valoresCamposTrasera: nextValoresTrasera,
          capasOverridesTrasera: nextOverridesTrasera,
          plantilla: plantillaActualizada || c.plantilla,
          plantillaTrasera: plantillaTraseraActualizada || c.plantillaTrasera,
        };
      })
    );
    setEditingCardId(null);
  };

  const focusLienzoConfig = () => {
    sectionLienzoRef.current?.scrollIntoView({ behavior: "smooth" });
    sectionLienzoRef.current?.classList.add("config-group-glow");
    setTimeout(() => {
      sectionLienzoRef.current?.classList.remove("config-group-glow");
    }, 1500);
  };

  const focusCartaConfig = () => {
    sectionCartaRef.current?.scrollIntoView({ behavior: "smooth" });
    sectionCartaRef.current?.classList.add("config-group-glow");
    setTimeout(() => {
      sectionCartaRef.current?.classList.remove("config-group-glow");
    }, 1500);
  };

  // --- Computar Distribución de Páginas ---
  const { paginasFrontales, paginasTraseras } = useMemo(() => {
    return calcularDistribucion(
      canvasConfig,
      cardConfig,
      cartas,
      generarReversos ? "individual" : "ninguno",
      imagenTraseraComun
    );
  }, [canvasConfig, cardConfig, cartas, generarReversos, imagenTraseraComun]);

  // --- Calcular Líneas de Corte Continuas sin Duplicados ---
  const lineasCorte = useMemo(() => {
    const horizLines = new Set<number>();
    const vertLines = new Set<number>();

    if (paginasFrontales.length > 0 && canvasConfig.lineasCorteContinuas) {
      const slots = paginasFrontales[0].slots; // Las coordenadas son idénticas en todas las páginas
      for (const slot of slots) {
        // Horizontales (borde superior e inferior de cada carta)
        horizLines.add(slot.yMm);
        horizLines.add(slot.yMm + slot.altoMm);

        // Verticales (borde izquierdo y derecho de cada carta)
        vertLines.add(slot.xMm);
        vertLines.add(slot.xMm + slot.anchoMm);
      }
    }

    return {
      horizontales: Array.from(horizLines),
      verticales: Array.from(vertLines),
    };
  }, [paginasFrontales, canvasConfig.lineasCorteContinuas]);

  // --- Lógica de Selección y Acciones Avanzadas ---
  const handleUpdateCartaNombre = (id: string, nuevoNombre: string) => {
    setCartas((prev) =>
      prev.map((c) => (c.id === id ? { ...c, nombre: nuevoNombre } : c))
    );
  };

  const handleWorkspaceClick = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (
      target.classList.contains("workspace") ||
      target.classList.contains("virtual-page-container") ||
      target.classList.contains("page-wrapper") ||
      target.classList.contains("virtual-page")
    ) {
      handleDeselectAll();
    }
  };

  const handleSelectAll = () => {
    setSelectedCardIds(cartas.map((c) => c.id));
  };

  const handleDeselectAll = () => {
    setSelectedCardIds([]);
  };

  const handleInvertSelection = () => {
    setSelectedCardIds((prev) => {
      const allIds = cartas.map((c) => c.id);
      return allIds.filter((id) => !prev.includes(id));
    });
  };

  const handleToggleSelectCard = (id: string, isMulti: boolean) => {
    setSelectedCardIds((prev) => {
      if (isMulti) {
        if (prev.includes(id)) {
          return prev.filter((x) => x !== id);
        } else {
          return [...prev, id];
        }
      } else {
        return [id];
      }
    });
  };


  const handleEliminarSeleccion = () => {
    if (selectedCardIds.length === 0) return;
    const mensaje = selectedCardIds.length === 1
      ? "¿Estás seguro de que deseas eliminar la carta seleccionada?"
      : `¿Estás seguro de que deseas eliminar las ${selectedCardIds.length} cartas seleccionadas?`;
    
    if (window.confirm(mensaje)) {
      setCartas((prev) => prev.filter((c) => !selectedCardIds.includes(c.id)));
      setSelectedCardIds([]);
    }
  };

  const handleDuplicarSeleccion = () => {
    setCartas((prev) => duplicarCartas(prev, selectedCardIds));
  };

  const handleMoverSeleccion = (direccion: "arriba" | "abajo") => {
    setCartas((prev) => moverCartas(prev, selectedCardIds, direccion));
  };

  const handleReversoLoteUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    setCartas((prev) =>
      prev.map((c) =>
        selectedCardIds.includes(c.id) ? { ...c, imagenTrasera: url } : c
      )
    );
    e.target.value = "";
  };

  const indicesSeleccionados = useMemo(() => {
    return selectedCardIds
      .map((id) => cartas.findIndex((c) => c.id === id))
      .filter((idx) => idx !== -1)
      .sort((a, b) => a - b);
  }, [selectedCardIds, cartas]);

  const esSeleccionContigua = useMemo(() => {
    if (indicesSeleccionados.length === 0) return false;
    return indicesSeleccionados[indicesSeleccionados.length - 1] - indicesSeleccionados[0] + 1 === indicesSeleccionados.length;
  }, [indicesSeleccionados]);

  const puedeMoverArriba = useMemo(() => {
    return esSeleccionContigua && indicesSeleccionados[0] > 0;
  }, [esSeleccionContigua, indicesSeleccionados]);

  const puedeMoverAbajo = useMemo(() => {
    return esSeleccionContigua && indicesSeleccionados[indicesSeleccionados.length - 1] < cartas.length - 1;
  }, [esSeleccionContigua, indicesSeleccionados, cartas.length]);

  // --- Atajos de Teclado Globales ---
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeEl = document.activeElement;
      if (activeEl) {
        const tagName = activeEl.tagName.toLowerCase();
        if (
          tagName === "input" ||
          tagName === "textarea" ||
          tagName === "select" ||
          activeEl.getAttribute("contenteditable") === "true"
        ) {
          return;
        }
      }

      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      const ctrlKey = isMac ? e.metaKey : e.ctrlKey;

      if (ctrlKey && e.key.toLowerCase() === "a") {
        e.preventDefault();
        handleSelectAll();
      } else if (e.key === "Escape") {
        e.preventDefault();
        handleDeselectAll();
      } else if (ctrlKey && e.key.toLowerCase() === "i") {
        e.preventDefault();
        handleInvertSelection();
      } else if (ctrlKey && e.key.toLowerCase() === "d") {
        e.preventDefault();
        handleDuplicarSeleccion();
      } else if (e.key === "Delete" || e.key === "Backspace") {
        if (editingCardId === null && selectedCardIds.length > 0) {
          e.preventDefault();
          handleEliminarSeleccion();
        }
      } else if (e.altKey && e.key === "ArrowUp") {
        if (puedeMoverArriba) {
          e.preventDefault();
          handleMoverSeleccion("arriba");
        }
      } else if (e.altKey && e.key === "ArrowDown") {
        if (puedeMoverAbajo) {
          e.preventDefault();
          handleMoverSeleccion("abajo");
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [cartas, selectedCardIds, puedeMoverArriba, puedeMoverAbajo, editingCardId]);

  return (
    <div className="app-layout">
      <style>
        {projectFonts.map((font: any) => `
          @font-face {
            font-family: '${font.nombre}';
            src: url('${font.src}');
          }
        `).join("\n")}
      </style>
      <MenuBar
        onNuevoProyecto={handleNuevoProyecto}
        onCargarProyectoClick={() => fileInputProyectoRef.current?.click()}
        onImportarPlantillaClick={() => fileInputTemplateRef.current?.click()}
        onGuardarProyecto={handleGuardarProyecto}
        onShowProjectGallery={() => setShowProjectGallery(true)}
        onShowProjectFonts={() => setShowProjectFonts(true)}
        onShowProjectConfig={() => setShowProjectConfig(true)}
        onImportarImagenesClick={() => fileInputImagenesRef.current?.click()}
        onExportarPdf={handleExportarPdf}
        exportandoPdf={exportandoPdf}
        cartasCount={cartas.length}
        paginasCount={paginasFrontales.length}
        zoomFactor={zoomFactor}
        setZoomFactor={setZoomFactor}
        lineasCorteContinuas={canvasConfig.lineasCorteContinuas}
        setLineasCorteContinuas={(val) => {
          setCanvasConfig((prev) => ({
            ...prev,
            lineasCorteContinuas: typeof val === "function" ? val(prev.lineasCorteContinuas) : val
          }));
        }}
        marcasCorteEsquinas={canvasConfig.marcasCorteEsquinas}
        setMarcasCorteEsquinas={(val) => {
          setCanvasConfig((prev) => ({
            ...prev,
            marcasCorteEsquinas: typeof val === "function" ? val(prev.marcasCorteEsquinas) : val
          }));
        }}
        onFocusLienzoConfig={focusLienzoConfig}
        onFocusCartaConfig={focusCartaConfig}
        selectedCount={selectedCardIds.length}
        puedeMoverArriba={puedeMoverArriba}
        puedeMoverAbajo={puedeMoverAbajo}
        onSelectAll={handleSelectAll}
        onDeselectAll={handleDeselectAll}
        onInvertSelection={handleInvertSelection}
        onDuplicarSeleccion={handleDuplicarSeleccion}
        onEliminarSeleccion={handleEliminarSeleccion}
        onMoverSeleccionArriba={() => handleMoverSeleccion("arriba")}
        onMoverSeleccionAbajo={() => handleMoverSeleccion("abajo")}
        onAddCardFromTemplate={() => setShowTemplateModal(true)}
        onEditCardSelected={() => {
          if (selectedCardIds.length === 1) {
            setEditingCardId(selectedCardIds[0]);
          }
        }}
        documentos={documentos}
        activeDocumentoId={activeDocumentoId}
        onSetActiveDocumentoId={handleSetActiveDocumentoId}
        onAddDocumento={handleTriggerAddDocumento}
        onDeleteDocumento={handleDeleteDocumento}
        onRenameDocumento={handleRenameDocumento}
      />
      <div className="app-container">
      {/* --- PANEL DE CONTROL LATERAL --- */}
      <aside className="sidebar">
        <div className="sidebar-content">
          {/* Opciones de Reverso */}
          <section className="config-group">
            <h3 className="config-group-title">Caras Traseras</h3>

            <label className="checkbox-field">
              <input
                type="checkbox"
                checked={generarReversos}
                onChange={(e) => setGenerarReversos(e.target.checked)}
              />
              <span className="checkbox-label">Generar Reversos (Doble Cara)</span>
            </label>

            {generarReversos && (
              <>
                <div className="input-field" style={{ marginTop: "8px" }}>
                  <label>Trasera Común (Por Defecto)</label>
                  <label
                    className={`sidebar-dropzone ${dragOverComun ? "drag-active" : ""}`}
                    onDragOver={handleDragOverComun}
                    onDragLeave={handleDragLeaveComun}
                    onDrop={handleDropComun}
                  >
                    <span className="sidebar-dropzone-icon">📥</span>
                    <p className="sidebar-dropzone-text">Soltar o hacer clic</p>
                    <input type="file" accept="image/*" onChange={handleTraseraComunUpload} style={{ display: "none" }} />
                  </label>
                  {imagenTraseraComun && (
                    <div style={{ display: "flex", alignItems: "center", gap: "10px", marginTop: "8px" }}>
                      <div className="card-thumb" style={{ backgroundImage: `url(${imagenTraseraComun})`, width: "32px", height: "42px", margin: 0 }} />
                      <span style={{ fontSize: "11px", color: "var(--text-secondary)" }}>Común cargada</span>
                      <button
                        className="btn-icon btn-danger"
                        style={{ width: "16px", height: "16px", fontSize: "9px", marginLeft: "auto" }}
                        onClick={() => setImagenTraseraComun(null)}
                        title="Eliminar trasera común"
                      >
                        ✕
                      </button>
                    </div>
                  )}
                </div>

                {cartas.length > 0 && (
                  <div className="input-field" style={{ marginTop: "12px" }}>
                    <label>Importar Traseras en Lote</label>
                    <label
                      className={`sidebar-dropzone ${dragOverBloque ? "drag-active" : ""}`}
                      onDragOver={handleDragOverBloque}
                      onDragLeave={handleDragLeaveBloque}
                      onDrop={handleDropBloque}
                    >
                      <span className="sidebar-dropzone-icon">🔄</span>
                      <p className="sidebar-dropzone-text">Soltar lote o hacer clic</p>
                      <input type="file" multiple accept="image/*" onChange={handleTraseraImportBloque} style={{ display: "none" }} />
                    </label>
                  </div>
                )}
              </>
            )}
          </section>

          {/* Líneas de Guías y Corte */}
          <section className="config-group">
            <h3 className="config-group-title">Líneas y Guillotinado</h3>

            <label className="checkbox-field">
              <input
                type="checkbox"
                checked={canvasConfig.lineasCorteContinuas}
                onChange={(e) => setCanvasConfig((prev) => ({ ...prev, lineasCorteContinuas: e.target.checked }))}
              />
              <span className="checkbox-label">Líneas de corte continuas (borde a borde)</span>
            </label>

            <label className="checkbox-field">
              <input
                type="checkbox"
                checked={canvasConfig.marcasCorteEsquinas}
                onChange={(e) => setCanvasConfig((prev) => ({ ...prev, marcasCorteEsquinas: e.target.checked }))}
              />
              <span className="checkbox-label">Marcas de corte en esquinas</span>
            </label>
          </section>

          <section className="config-group">
            <h3 className="config-group-title">Importar Cartas</h3>
            <label
              className="dropzone"
              onDragOver={handleDragOver}
              onDrop={handleDrop}
            >
              <span className="dropzone-icon">📥</span>
              <p className="dropzone-text">Arrastra o haz clic para añadir caras frontales</p>
              <input ref={fileInputImagenesRef} type="file" multiple accept="image/*" onChange={handleImageImport} style={{ display: "none" }} />
            </label>
            <button
              className="btn-secondary"
              style={{ marginTop: "12px", width: "100%", padding: "10px", borderRadius: "8px", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}
              onClick={() => setShowTemplateModal(true)}
            >
              <span>✨</span> Añadir Carta desde Plantilla
            </button>
          </section>

          {/* Editor de Propiedades Contextual */}
          {cartas.length > 0 && (
            <section className="config-group">
              <h3 className="config-group-title">Propiedades de Selección</h3>
              {selectedCardIds.length === 0 ? (
                <div style={{ textAlign: "center", padding: "16px", color: "var(--text-secondary)", fontSize: "13px" }}>
                  Haz clic en cualquier carta de las páginas para editar sus propiedades.
                </div>
              ) : selectedCardIds.length === 1 ? (() => {
                const selectedCarta = cartas.find((c) => c.id === selectedCardIds[0]);
                if (!selectedCarta) return null;
                return (
                  <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                    <div className="input-field">
                      <label>Nombre de la Carta</label>
                      <input
                        type="text"
                        value={selectedCarta.nombre}
                        onChange={(e) => handleUpdateCartaNombre(selectedCarta.id, e.target.value)}
                      />
                    </div>
                    
                    <div className="input-field">
                      <label>Cantidad en Baraja</label>
                      <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                        <button className="btn-icon" onClick={() => modificarCantidad(selectedCarta.id, -1)}>-</button>
                        <span className="quantity-badge" style={{ flex: 1 }}>{selectedCarta.cantidad}</span>
                        <button className="btn-icon" onClick={() => modificarCantidad(selectedCarta.id, 1)}>+</button>
                      </div>
                    </div>

                    {generarReversos && (
                      <div style={{ borderTop: "1px solid rgba(255,255,255,0.05)", paddingTop: "12px" }}>
                        <span style={{ fontSize: "11px", color: "var(--text-secondary)", display: "block", marginBottom: "6px" }}>
                          Reverso: {selectedCarta.plantillaTraseraId 
                            ? `Plantilla (${templatesMap[selectedCarta.plantillaTraseraId]?.nombre || selectedCarta.plantillaTraseraId}) 📄` 
                            : selectedCarta.imagenTrasera 
                            ? "Individual 👤" 
                            : "Por Defecto 👥"}
                        </span>
                        
                        <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", alignItems: "center" }}>
                          {!selectedCarta.plantillaTraseraId && (
                            <label style={{ margin: 0, cursor: "pointer", fontSize: "11px", backgroundColor: "var(--bg-main)", border: "1px solid var(--border-color)", padding: "4px 12px", borderRadius: "6px", flex: 1, textAlign: "center" }}>
                              Subir Reverso
                              <input
                                type="file"
                                accept="image/*"
                                style={{ display: "none" }}
                                onChange={(e) => handleTraseraIndividualUpload(selectedCarta.id, e)}
                              />
                            </label>
                          )}
                          
                          <button
                            type="button"
                            className="btn-secondary"
                            style={{ margin: 0, fontSize: "11px", padding: "4px 12px", borderRadius: "6px", flex: 1, textAlign: "center" }}
                            onClick={() => abrirModalPlantillaParaTrasera()}
                          >
                            {selectedCarta.plantillaTraseraId ? "Cambiar Plantilla" : "Usar Plantilla"}
                          </button>
                          
                          {(selectedCarta.imagenTrasera || selectedCarta.plantillaTraseraId) && (
                            <button
                              className="btn-icon btn-danger"
                              style={{ width: "28px", height: "28px", padding: 0, margin: 0, display: "flex", alignItems: "center", justifyContent: "center", borderRadius: "6px" }}
                              onClick={() => {
                                if (selectedCarta.plantillaTraseraId) {
                                  quitarPlantillaTrasera(selectedCarta.id);
                                } else {
                                  eliminarTraseraIndividual(selectedCarta.id);
                                }
                              }}
                              title="Volver a reverso común"
                            >
                              ✕
                            </button>
                          )}
                        </div>
                      </div>
                    )}

                    <button
                      className="btn-primary btn-danger"
                      style={{ marginTop: "12px" }}
                      onClick={() => eliminarCarta(selectedCarta.id)}
                    >
                      Eliminar Carta
                    </button>
                  </div>
                );
              })() : (
                <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                  <div style={{ fontSize: "13px", fontWeight: "600", color: "var(--accent-primary)" }}>
                    {selectedCardIds.length} cartas seleccionadas
                  </div>
                  
                  {generarReversos && (
                    <div style={{ borderTop: "1px solid rgba(255,255,255,0.05)", paddingTop: "12px", display: "flex", flexDirection: "column", gap: "8px" }}>
                      <button
                        className="btn-primary"
                        onClick={() => fileInputReversoLoteRef.current?.click()}
                      >
                        Asignar Reverso Imagen en Lote
                      </button>
                      <button
                        className="btn-secondary"
                        onClick={() => abrirModalPlantillaParaTrasera()}
                      >
                        Asignar Reverso Plantilla en Lote
                      </button>
                      <button
                        className="btn-secondary btn-danger"
                        onClick={() => quitarPlantillaTraseraLote()}
                      >
                        Quitar Reverso Plantilla en Lote
                      </button>
                      <input
                        type="file"
                        ref={fileInputReversoLoteRef}
                        style={{ display: "none" }}
                        accept="image/*"
                        onChange={handleReversoLoteUpload}
                      />
                    </div>
                  )}

                  <button
                    className="btn-primary btn-danger"
                    style={{ marginTop: "12px" }}
                    onClick={handleEliminarSeleccion}
                  >
                    Eliminar Selección
                  </button>
                </div>
              )}
            </section>
          )}
        </div>
      </aside>

      {/* --- VISOR DEL WORKSPACE (LIENZO) --- */}
      <main className="workspace" onClick={handleWorkspaceClick}>
        {/* Barra de Herramientas de Visualización */}
        <div className="workspace-toolbar">
          {/* BARRA DE ACCIONES DE SELECCIÓN CON ICONOS */}
          {cartas.length > 0 && (
            <div className="card-selection-toolbar" style={{ margin: 0, border: "none", backgroundColor: "transparent", padding: 0 }}>
              <button
                type="button"
                className="toolbar-btn"
                onClick={handleSelectAll}
                title="Seleccionar todas las cartas"
              >
                ☑️
              </button>
              <button
                type="button"
                className="toolbar-btn"
                onClick={handleDeselectAll}
                disabled={selectedCardIds.length === 0}
                title="Deseleccionar todas"
              >
                ⬜
              </button>
              <button
                type="button"
                className="toolbar-btn"
                onClick={handleInvertSelection}
                title="Invertir selección"
              >
                🔄
              </button>

              <span className="toolbar-separator" />

              <button
                type="button"
                className="toolbar-btn"
                onClick={() => {
                  if (selectedCardIds.length === 1) {
                    setInspectingCardId(selectedCardIds[0]);
                  }
                }}
                disabled={selectedCardIds.length !== 1}
                title="Ver detalle de la carta seleccionada"
              >
                👁️
              </button>
              <button
                type="button"
                className="toolbar-btn"
                onClick={() => {
                  if (selectedCardIds.length === 1) {
                    setEditingCardId(selectedCardIds[0]);
                  }
                }}
                disabled={selectedCardIds.length !== 1}
                title="Editar carta seleccionada"
              >
                ✏️
              </button>
              <button
                type="button"
                className="toolbar-btn"
                onClick={handleDuplicarSeleccion}
                disabled={selectedCardIds.length === 0}
                title="Duplicar cartas seleccionadas"
              >
                📋
              </button>
              <button
                type="button"
                className="toolbar-btn btn-danger"
                onClick={handleEliminarSeleccion}
                disabled={selectedCardIds.length === 0}
                title="Eliminar cartas seleccionadas"
              >
                🗑️
              </button>

              <span className="toolbar-separator" />

              <button
                type="button"
                className="toolbar-btn"
                onClick={() => handleMoverSeleccion("arriba")}
                disabled={!puedeMoverArriba}
                title="Mover selección arriba"
              >
                ⬆️
              </button>
              <button
                type="button"
                className="toolbar-btn"
                onClick={() => handleMoverSeleccion("abajo")}
                disabled={!puedeMoverAbajo}
                title="Mover selección abajo"
              >
                ⬇️
              </button>
            </div>
          )}

          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginLeft: "auto" }}>
            <label style={{ margin: 0, fontSize: "11px" }}>Zoom del Lienzo</label>
            <input
              type="range"
              min="1.0"
              max="4.5"
              step="0.1"
              value={zoomFactor}
              onChange={(e) => setZoomFactor(Number(e.target.value))}
              style={{ width: "120px", margin: 0 }}
            />
            <span style={{ fontSize: "12px", fontFamily: "monospace" }}>{zoomFactor.toFixed(1)}x</span>
          </div>
        </div>

        {/* El Canvas de Impresión Virtual */}
        {cartas.length === 0 ? (
          <div style={{ margin: "auto", textAlign: "center", opacity: 0.5 }}>
            <span style={{ fontSize: "64px" }}>🎴</span>
            <h2 style={{ marginTop: "16px", fontWeight: "normal" }}>Importa imágenes para previsualizar el lienzo</h2>
            <p style={{ fontSize: "14px" }}>Añade tus cartas en el panel de la izquierda</p>
          </div>
        ) : (
          <div className="virtual-page-container">
            {paginasFrontales.map((paginaFrontal, pIndex) => {
              const paginaTrasera = paginasTraseras[pIndex];

              return (
                <React.Fragment key={`page-pair-${pIndex}`}>
                  {/* PÁGINA FRONTAL */}
                  <div className="page-wrapper">
                    <span className="page-title">Página {pIndex + 1} — Frente (Frontal)</span>
                    <div
                      className="virtual-page"
                      style={{
                        width: `${canvasConfig.anchoMm * zoomFactor}px`,
                        height: `${canvasConfig.altoMm * zoomFactor}px`,
                      }}
                    >
                      {/* Slots de Cartas Frontales */}
                      {paginaFrontal.slots.map((slot, sIndex) => (
                        <div
                          key={`slot-f-${pIndex}-${sIndex}`}
                          className={`card-slot ${selectedCardIds.includes(slot.cartaId) ? "selected" : ""}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            const isMulti = e.ctrlKey || e.metaKey || e.shiftKey;
                            handleToggleSelectCard(slot.cartaId, isMulti);
                          }}
                          onDoubleClick={(e) => {
                            e.stopPropagation();
                            setEditingCardId(slot.cartaId);
                          }}
                          style={{
                            left: `${slot.xMm * zoomFactor}px`,
                            top: `${slot.yMm * zoomFactor}px`,
                            width: `${slot.anchoMm * zoomFactor}px`,
                            height: `${slot.altoMm * zoomFactor}px`,
                          }}
                        >
                          {(() => {
                            const cardData = cartas.find((c) => c.id === slot.cartaId);
                            if (!cardData) return null;
                            const plantilla = cardData.plantilla || (cardData.plantillaId ? templatesMap[cardData.plantillaId] : null);
                            if (plantilla) {
                              const borderMm = slot.bordeCorteMm;
                              const noOverlap = borderMm > 0;
                              const scaleX = noOverlap ? (slot.anchoMm - 2 * borderMm) / slot.anchoMm : 1;
                              const scaleY = noOverlap ? (slot.altoMm - 2 * borderMm) / slot.altoMm : 1;
                              return (
                                <div
                                  className="card-template-render"
                                  style={{
                                    position: "absolute",
                                    left: noOverlap ? `${borderMm * zoomFactor}px` : 0,
                                    top: noOverlap ? `${borderMm * zoomFactor}px` : 0,
                                    width: `${slot.anchoMm * zoomFactor}px`,
                                    height: `${slot.altoMm * zoomFactor}px`,
                                    overflow: "hidden",
                                    backgroundColor: "#ffffff",
                                    transform: noOverlap ? `scale(${scaleX}, ${scaleY})` : "none",
                                    transformOrigin: "top left",
                                  }}
                                >
                                  {(() => {
                                    const renderCapaRecursiva = (parentId: string | null): React.ReactNode => {
                                      const layers = plantilla.capas || [];
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

                                        const style: React.CSSProperties = {
                                          position: isParentFlex ? "relative" : "absolute",
                                          left: isParentFlex 
                                            ? (isParentVertical ? `${capa.xMm * zoomFactor}px` : undefined)
                                            : `${capa.xMm * zoomFactor}px`,
                                          top: isParentFlex 
                                            ? (isParentHorizontal ? `${capa.yMm * zoomFactor}px` : undefined)
                                            : `${capa.yMm * zoomFactor}px`,
                                          width: `${capa.anchoMm * zoomFactor}px`,
                                          height: `${capa.altoMm * zoomFactor}px`,
                                          pointerEvents: "none",
                                          boxSizing: "border-box",
                                          flexShrink: 0,
                                        };

                                        if (capa.tipo === "background") {
                                          const colorFill = cardData.capasOverrides?.[capa.id]?.colorFill || capa.colorFill || "#ffffff";
                                          return (
                                            <div
                                              key={capa.id}
                                              style={{
                                                ...style,
                                                backgroundColor: colorFill,
                                              }}
                                            />
                                          );
                                        }

                                        if (capa.tipo === "container") {
                                          const overrides = cardData.capasOverrides?.[capa.id];
                                          const resolvedCapa = overrides ? { ...capa, ...overrides } : capa;

                                          // Bordes y Esquinas (SRS-024)
                                          const borderTopPx = (resolvedCapa.borderTopWidth || 0) * zoomFactor;
                                          const borderRightPx = (resolvedCapa.borderRightWidth || 0) * zoomFactor;
                                          const borderBottomPx = (resolvedCapa.borderBottomWidth || 0) * zoomFactor;
                                          const borderLeftPx = (resolvedCapa.borderLeftWidth || 0) * zoomFactor;

                                          const radiusTopLeftPx = (resolvedCapa.borderTopLeftRadius || 0) * zoomFactor;
                                          const radiusTopRightPx = (resolvedCapa.borderTopRightRadius || 0) * zoomFactor;
                                          const radiusBottomRightPx = (resolvedCapa.borderBottomRightRadius || 0) * zoomFactor;
                                          const radiusBottomLeftPx = (resolvedCapa.borderBottomLeftRadius || 0) * zoomFactor;

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
                                          } : {

                                          };

                                          return (
                                            <div
                                              key={capa.id}
                                              style={{
                                                ...style,
                                                ...borderCornersStyle,
                                                ...flexStyle,
                                                backgroundColor: resolvedCapa.backgroundColor || "transparent",
                                                overflow: "hidden",
                                              }}
                                            >
                                              {renderCapaRecursiva(capa.id)}
                                            </div>
                                          );
                                        }

                                        if (capa.tipo === "text") {
                                          const overrides = cardData.capasOverrides?.[capa.id];
                                          const resolvedCapa = overrides ? { ...capa, ...overrides } : capa;
                                          const textoInterp = renderizarTextoCapa(resolvedCapa, cardData.valoresCampos);
                                          const htmlText = parseMarkdownToHtml(textoInterp);
                                          const fontSizePx = (resolvedCapa.fontSizePt || 12) * 0.352778 * zoomFactor;

                                          // Bordes y Esquinas (SRS-024)
                                          const borderTopPx = (resolvedCapa.borderTopWidth || 0) * zoomFactor;
                                          const borderRightPx = (resolvedCapa.borderRightWidth || 0) * zoomFactor;
                                          const borderBottomPx = (resolvedCapa.borderBottomWidth || 0) * zoomFactor;
                                          const borderLeftPx = (resolvedCapa.borderLeftWidth || 0) * zoomFactor;

                                          const radiusTopLeftPx = (resolvedCapa.borderTopLeftRadius || 0) * zoomFactor;
                                          const radiusTopRightPx = (resolvedCapa.borderTopRightRadius || 0) * zoomFactor;
                                          const radiusBottomRightPx = (resolvedCapa.borderBottomRightRadius || 0) * zoomFactor;
                                          const radiusBottomLeftPx = (resolvedCapa.borderBottomLeftRadius || 0) * zoomFactor;

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
                                                ...style,
                                                ...borderCornersStyle,
                                                fontFamily: resolvedCapa.fontFamily || "sans-serif",
                                                fontSize: `${fontSizePx}px`,
                                                color: resolvedCapa.color || "#000000",
                                                backgroundColor: resolvedCapa.backgroundColor || "transparent",
                                                textAlign: (resolvedCapa.alineacion === "center" ? "center" : resolvedCapa.alineacion === "right" ? "right" : "left") as any,
                                                fontWeight: resolvedCapa.bold ? "bold" : "normal",
                                                fontStyle: resolvedCapa.italic ? "italic" : "normal",
                                                textDecoration: resolvedCapa.underline ? "underline" : "none",
                                                whiteSpace: "pre-wrap",
                                                wordBreak: "break-word",
                                                lineHeight: 1.2,
                                              }}
                                              dangerouslySetInnerHTML={{ __html: htmlText }}
                                            />
                                          );
                                        }

                                        if (capa.tipo === "block") {
                                          const overrides = cardData.capasOverrides?.[capa.id];
                                          const resolvedCapa = overrides ? { ...capa, ...overrides } : capa;

                                          // Bordes y Esquinas (SRS-024)
                                          const borderTopPx = (resolvedCapa.borderTopWidth || 0) * zoomFactor;
                                          const borderRightPx = (resolvedCapa.borderRightWidth || 0) * zoomFactor;
                                          const borderBottomPx = (resolvedCapa.borderBottomWidth || 0) * zoomFactor;
                                          const borderLeftPx = (resolvedCapa.borderLeftWidth || 0) * zoomFactor;

                                          const radiusTopLeftPx = (resolvedCapa.borderTopLeftRadius || 0) * zoomFactor;
                                          const radiusTopRightPx = (resolvedCapa.borderTopRightRadius || 0) * zoomFactor;
                                          const radiusBottomRightPx = (resolvedCapa.borderBottomRightRadius || 0) * zoomFactor;
                                          const radiusBottomLeftPx = (resolvedCapa.borderBottomLeftRadius || 0) * zoomFactor;

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
                                                ...style,
                                                ...borderCornersStyle,
                                                backgroundColor: resolvedCapa.backgroundColor || "transparent",
                                              }}
                                            />
                                          );
                                        }

                                        if (capa.tipo === "image" || capa.tipo === "image-switch") {
                                          const overrides = cardData.capasOverrides?.[capa.id];
                                          const resolvedCapa = overrides ? { ...capa, ...overrides } : capa;
                                          const src = resolvedCapa.src;

                                          // Bordes y Esquinas (SRS-024)
                                          const borderTopPx = (resolvedCapa.borderTopWidth || 0) * zoomFactor;
                                          const borderRightPx = (resolvedCapa.borderRightWidth || 0) * zoomFactor;
                                          const borderBottomPx = (resolvedCapa.borderBottomWidth || 0) * zoomFactor;
                                          const borderLeftPx = (resolvedCapa.borderLeftWidth || 0) * zoomFactor;

                                          const radiusTopLeftPx = (resolvedCapa.borderTopLeftRadius || 0) * zoomFactor;
                                          const radiusTopRightPx = (resolvedCapa.borderTopRightRadius || 0) * zoomFactor;
                                          const radiusBottomRightPx = (resolvedCapa.borderBottomRightRadius || 0) * zoomFactor;
                                          const radiusBottomLeftPx = (resolvedCapa.borderBottomLeftRadius || 0) * zoomFactor;

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
                                                ...style,
                                                ...borderCornersStyle,
                                                display: "flex",
                                                alignItems: "center",
                                                justifyContent: "center",
                                                backgroundColor: resolvedCapa.backgroundColor || "transparent",
                                              }}
                                            >
                                              {src && (
                                                <img
                                                  src={src}
                                                  alt={capa.nombre}
                                                  style={{
                                                    width: "100%",
                                                    height: "100%",
                                                    objectFit: resolvedCapa.modoAjuste === "stretch" ? "fill" : (resolvedCapa.modoAjuste || "cover") as any,
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
                                  })()}
                                </div>
                              );
                            } else {
                              const borderMm = slot.bordeCorteMm;
                              const noOverlap = borderMm > 0;
                              
                              const imgLeft = noOverlap ? (borderMm - slot.sangradoMm) : -slot.sangradoMm;
                              const imgTop = noOverlap ? (borderMm - slot.sangradoMm) : -slot.sangradoMm;
                              const imgWidth = noOverlap ? (slot.anchoMm - 2 * borderMm + 2 * slot.sangradoMm) : (slot.anchoMm + 2 * slot.sangradoMm);
                              const imgHeight = noOverlap ? (slot.altoMm - 2 * borderMm + 2 * slot.sangradoMm) : (slot.altoMm + 2 * slot.sangradoMm);
                              const fitMode = cardConfig.modoAjuste || "cover";

                              return (
                                <div
                                  className="card-image-render"
                                  style={{
                                    left: `${imgLeft * zoomFactor}px`,
                                    top: `${imgTop * zoomFactor}px`,
                                    width: `${imgWidth * zoomFactor}px`,
                                    height: `${imgHeight * zoomFactor}px`,
                                    backgroundImage: slot.imagenSrc ? `url(${slot.imagenSrc})` : "none",
                                    backgroundSize: fitMode,
                                    backgroundRepeat: "no-repeat",
                                    backgroundPosition: "center",
                                  }}
                                >
                                  {!slot.imagenSrc && "Ilustración"}
                                </div>
                              );
                            }
                          })()}

                          {/* Borde interior de color fijo si aplica */}
                          {slot.bordeCorteMm > 0 && (
                            <div
                              className="card-border-cut"
                              style={{
                                borderWidth: `${slot.bordeCorteMm * zoomFactor}px`,
                                borderColor: slot.bordeCorteColor,
                                borderStyle: "solid",
                              }}
                            />
                          )}

                          {/* Marcas de Corte de Esquina si aplica */}
                          {canvasConfig.marcasCorteEsquinas && (
                            <>
                              <div className="corner-cut-mark top-left" style={{ left: 0, top: 0 }} />
                              <div className="corner-cut-mark top-right" style={{ right: 0, top: 0 }} />
                              <div className="corner-cut-mark bottom-left" style={{ left: 0, bottom: 0 }} />
                              <div className="corner-cut-mark bottom-right" style={{ right: 0, bottom: 0 }} />
                            </>
                          )}
                        </div>
                      ))}

                      {/* Líneas de Corte Continuas */}
                      {canvasConfig.lineasCorteContinuas && (
                        <>
                          {lineasCorte.horizontales.map((yMmVal, yIndex) => (
                            <div
                              key={`hl-${yIndex}`}
                              className="page-cut-line horizontal"
                              style={{
                                top: `${yMmVal * zoomFactor}px`,
                                borderTop: "1px dashed rgba(100, 116, 139, 0.4)",
                              }}
                            />
                          ))}
                          {lineasCorte.verticales.map((xMmVal, xIndex) => (
                            <div
                              key={`vl-${xIndex}`}
                              className="page-cut-line vertical"
                              style={{
                                left: `${xMmVal * zoomFactor}px`,
                                borderLeft: "1px dashed rgba(100, 116, 139, 0.4)",
                              }}
                            />
                          ))}
                        </>
                      )}
                    </div>
                  </div>

                  {/* PÁGINA TRASERA (Reverso correspondiente, si está habilitado) */}
                  {generarReversos && paginaTrasera && (
                    <div className="page-wrapper">
                      <span className="page-title">Página {pIndex + 1} — Reverso (Trasera)</span>
                      <div
                        className="virtual-page"
                        style={{
                          width: `${canvasConfig.anchoMm * zoomFactor}px`,
                          height: `${canvasConfig.altoMm * zoomFactor}px`,
                        }}
                      >
                        {/* Slots de Cartas Traseras (Espejadas) */}
                        {paginaTrasera.slots.map((slot, sIndex) => (
                          <div
                            key={`slot-t-${pIndex}-${sIndex}`}
                            className={`card-slot ${selectedCardIds.includes(slot.cartaId) ? "selected" : ""}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              const isMulti = e.ctrlKey || e.metaKey || e.shiftKey;
                              handleToggleSelectCard(slot.cartaId, isMulti);
                            }}
                            onDoubleClick={(e) => {
                              e.stopPropagation();
                              setEditingCardId(slot.cartaId);
                            }}
                            style={{
                              left: `${slot.xMm * zoomFactor}px`,
                              top: `${slot.yMm * zoomFactor}px`,
                              width: `${slot.anchoMm * zoomFactor}px`,
                              height: `${slot.altoMm * zoomFactor}px`,
                            }}
                          >
                             {/* Renderizar Imagen con Sangrado */}
                             {(() => {
                               const cardData = cartas.find((c) => c.id === slot.cartaId);
                               if (!cardData) return null;
                               const plantilla = cardData.plantillaTrasera || (cardData.plantillaTraseraId ? templatesMap[cardData.plantillaTraseraId] : null);
                               if (plantilla) {
                                 const borderMm = slot.bordeCorteMm;
                                 const noOverlap = borderMm > 0;
                                 const scaleX = noOverlap ? (slot.anchoMm - 2 * borderMm) / slot.anchoMm : 1;
                                 const scaleY = noOverlap ? (slot.altoMm - 2 * borderMm) / slot.altoMm : 1;
                                 return (
                                   <div
                                     className="card-template-render"
                                     style={{
                                       position: "absolute",
                                       left: noOverlap ? `${borderMm * zoomFactor}px` : 0,
                                       top: noOverlap ? `${borderMm * zoomFactor}px` : 0,
                                       width: `${slot.anchoMm * zoomFactor}px`,
                                       height: `${slot.altoMm * zoomFactor}px`,
                                       overflow: "hidden",
                                       backgroundColor: "#ffffff",
                                       transform: noOverlap ? `scale(${scaleX}, ${scaleY})` : "none",
                                       transformOrigin: "top left",
                                     }}
                                   >
                                      {(() => {
                                        const renderCapaRecursiva = (parentId: string | null): React.ReactNode => {
                                          const layers = plantilla.capas || [];
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

                                            const style: React.CSSProperties = {
                                              position: isParentFlex ? "relative" : "absolute",
                                              left: isParentFlex 
                                                ? (isParentVertical ? `${capa.xMm * zoomFactor}px` : undefined)
                                                : `${capa.xMm * zoomFactor}px`,
                                              top: isParentFlex 
                                                ? (isParentHorizontal ? `${capa.yMm * zoomFactor}px` : undefined)
                                                : `${capa.yMm * zoomFactor}px`,
                                              width: `${capa.anchoMm * zoomFactor}px`,
                                              height: `${capa.altoMm * zoomFactor}px`,
                                              pointerEvents: "none",
                                              boxSizing: "border-box",
                                              flexShrink: 0,
                                            };

                                            if (capa.tipo === "background") {
                                              const colorFill = cardData.capasOverridesTrasera?.[capa.id]?.colorFill || capa.colorFill || "#ffffff";
                                              return (
                                                <div
                                                  key={capa.id}
                                                  style={{
                                                    ...style,
                                                    backgroundColor: colorFill,
                                                  }}
                                                />
                                              );
                                            }

                                            if (capa.tipo === "container") {
                                              const overrides = cardData.capasOverridesTrasera?.[capa.id];
                                              const resolvedCapa = overrides ? { ...capa, ...overrides } : capa;

                                              // Bordes y Esquinas (SRS-024)
                                              const borderTopPx = (resolvedCapa.borderTopWidth || 0) * zoomFactor;
                                              const borderRightPx = (resolvedCapa.borderRightWidth || 0) * zoomFactor;
                                              const borderBottomPx = (resolvedCapa.borderBottomWidth || 0) * zoomFactor;
                                              const borderLeftPx = (resolvedCapa.borderLeftWidth || 0) * zoomFactor;

                                              const radiusTopLeftPx = (resolvedCapa.borderTopLeftRadius || 0) * zoomFactor;
                                              const radiusTopRightPx = (resolvedCapa.borderTopRightRadius || 0) * zoomFactor;
                                              const radiusBottomRightPx = (resolvedCapa.borderBottomRightRadius || 0) * zoomFactor;
                                              const radiusBottomLeftPx = (resolvedCapa.borderBottomLeftRadius || 0) * zoomFactor;

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
                                                    ...style,
                                                    ...borderCornersStyle,
                                                    ...flexStyle,
                                                    backgroundColor: resolvedCapa.backgroundColor || "transparent",
                                                    overflow: "hidden",
                                                  }}
                                                >
                                                  {renderCapaRecursiva(capa.id)}
                                                </div>
                                              );
                                            }

                                            if (capa.tipo === "block") {
                                              const overrides = cardData.capasOverridesTrasera?.[capa.id];
                                              const resolvedCapa = overrides ? { ...capa, ...overrides } : capa;

                                              // Bordes y Esquinas (SRS-024)
                                              const borderTopPx = (resolvedCapa.borderTopWidth || 0) * zoomFactor;
                                              const borderRightPx = (resolvedCapa.borderRightWidth || 0) * zoomFactor;
                                              const borderBottomPx = (resolvedCapa.borderBottomWidth || 0) * zoomFactor;
                                              const borderLeftPx = (resolvedCapa.borderLeftWidth || 0) * zoomFactor;

                                              const radiusTopLeftPx = (resolvedCapa.borderTopLeftRadius || 0) * zoomFactor;
                                              const radiusTopRightPx = (resolvedCapa.borderTopRightRadius || 0) * zoomFactor;
                                              const radiusBottomRightPx = (resolvedCapa.borderBottomRightRadius || 0) * zoomFactor;
                                              const radiusBottomLeftPx = (resolvedCapa.borderBottomLeftRadius || 0) * zoomFactor;

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
                                                    ...style,
                                                    ...borderCornersStyle,
                                                    backgroundColor: resolvedCapa.backgroundColor || "transparent",
                                                  }}
                                                />
                                              );
                                            }

                                            if (capa.tipo === "image" || capa.tipo === "image-switch") {
                                              const overrides = cardData.capasOverridesTrasera?.[capa.id];
                                              const resolvedCapa = overrides ? { ...capa, ...overrides } : capa;
                                              const src = resolvedCapa.src;

                                              // Bordes y Esquinas (SRS-024)
                                              const borderTopPx = (resolvedCapa.borderTopWidth || 0) * zoomFactor;
                                              const borderRightPx = (resolvedCapa.borderRightWidth || 0) * zoomFactor;
                                              const borderBottomPx = (resolvedCapa.borderBottomWidth || 0) * zoomFactor;
                                              const borderLeftPx = (resolvedCapa.borderLeftWidth || 0) * zoomFactor;

                                              const radiusTopLeftPx = (resolvedCapa.borderTopLeftRadius || 0) * zoomFactor;
                                              const radiusTopRightPx = (resolvedCapa.borderTopRightRadius || 0) * zoomFactor;
                                              const radiusBottomRightPx = (resolvedCapa.borderBottomRightRadius || 0) * zoomFactor;
                                              const radiusBottomLeftPx = (resolvedCapa.borderBottomLeftRadius || 0) * zoomFactor;

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
                                                    ...style,
                                                    ...borderCornersStyle,
                                                    display: "flex",
                                                    alignItems: "center",
                                                    justifyContent: "center",
                                                    backgroundColor: resolvedCapa.backgroundColor || "transparent",
                                                  }}
                                                >
                                                  {src && (
                                                    <img
                                                      src={src}
                                                      alt={capa.nombre}
                                                      style={{
                                                        width: "100%",
                                                        height: "100%",
                                                        objectFit: resolvedCapa.modoAjuste === "stretch" ? "fill" : (resolvedCapa.modoAjuste || "cover") as any,
                                                        borderRadius: "inherit",
                                                      }}
                                                    />
                                                  )}
                                                </div>
                                              );
                                            }

                                            if (capa.tipo === "text") {
                                              const overrides = cardData.capasOverridesTrasera?.[capa.id];
                                              const resolvedCapa = overrides ? { ...capa, ...overrides } : capa;
                                              const textoInterp = renderizarTextoCapa(resolvedCapa, cardData.valoresCamposTrasera);
                                              const htmlText = parseMarkdownToHtml(textoInterp);
                                              const fontSizePx = (resolvedCapa.fontSizePt || 12) * 0.352778 * zoomFactor;

                                              // Bordes y Esquinas (SRS-024)
                                              const borderTopPx = (resolvedCapa.borderTopWidth || 0) * zoomFactor;
                                              const borderRightPx = (resolvedCapa.borderRightWidth || 0) * zoomFactor;
                                              const borderBottomPx = (resolvedCapa.borderBottomWidth || 0) * zoomFactor;
                                              const borderLeftPx = (resolvedCapa.borderLeftWidth || 0) * zoomFactor;

                                              const radiusTopLeftPx = (resolvedCapa.borderTopLeftRadius || 0) * zoomFactor;
                                              const radiusTopRightPx = (resolvedCapa.borderTopRightRadius || 0) * zoomFactor;
                                              const radiusBottomRightPx = (resolvedCapa.borderBottomRightRadius || 0) * zoomFactor;
                                              const radiusBottomLeftPx = (resolvedCapa.borderBottomLeftRadius || 0) * zoomFactor;

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
                                                    ...style,
                                                    ...borderCornersStyle,
                                                    fontFamily: resolvedCapa.fontFamily || "sans-serif",
                                                    fontSize: `${fontSizePx}px`,
                                                    color: resolvedCapa.color || "#000000",
                                                    backgroundColor: resolvedCapa.backgroundColor || "transparent",
                                                    textAlign: (resolvedCapa.alineacion === "center" ? "center" : resolvedCapa.alineacion === "right" ? "right" : "left") as any,
                                                    fontWeight: resolvedCapa.bold ? "bold" : "normal",
                                                    fontStyle: resolvedCapa.italic ? "italic" : "normal",
                                                    textDecoration: resolvedCapa.underline ? "underline" : "none",
                                                    whiteSpace: "pre-wrap",
                                                    wordBreak: "break-word",
                                                    lineHeight: 1.2,
                                                  }}
                                                  dangerouslySetInnerHTML={{ __html: htmlText }}
                                                />
                                              );
                                            }

                                            return null;
                                          });
                                        };
                                        return renderCapaRecursiva(null);
                                      })()}
                                   </div>
                                 );
                               } else {
                                  const borderMm = slot.bordeCorteMm;
                                  const noOverlap = borderMm > 0;
                                 
                                 const imgLeft = noOverlap ? (borderMm - slot.sangradoMm) : -slot.sangradoMm;
                                 const imgTop = noOverlap ? (borderMm - slot.sangradoMm) : -slot.sangradoMm;
                                 const imgWidth = noOverlap ? (slot.anchoMm - 2 * borderMm + 2 * slot.sangradoMm) : (slot.anchoMm + 2 * slot.sangradoMm);
                                 const imgHeight = noOverlap ? (slot.altoMm - 2 * borderMm + 2 * slot.sangradoMm) : (slot.altoMm + 2 * slot.sangradoMm);
                                 const fitMode = cardConfig.modoAjuste || "cover";

                                 return (
                                   <div
                                     className="card-image-render"
                                     style={{
                                       left: `${imgLeft * zoomFactor}px`,
                                       top: `${imgTop * zoomFactor}px`,
                                       width: `${imgWidth * zoomFactor}px`,
                                       height: `${imgHeight * zoomFactor}px`,
                                       backgroundImage: slot.imagenSrc ? `url(${slot.imagenSrc})` : "none",
                                       backgroundSize: fitMode,
                                       backgroundRepeat: "no-repeat",
                                       backgroundPosition: "center",
                                     }}
                                   >
                                     {!slot.imagenSrc && "Reverso"}
                                   </div>
                                 );
                               }
                             })()}

                            {/* Borde interior de color fijo si aplica */}
                            {slot.bordeCorteMm > 0 && (
                              <div
                                className="card-border-cut"
                                style={{
                                  borderWidth: `${slot.bordeCorteMm * zoomFactor}px`,
                                  borderColor: slot.bordeCorteColor,
                                  borderStyle: "solid",
                                }}
                              />
                            )}

                            {/* Marcas de Corte de Esquina si aplica */}
                            {canvasConfig.marcasCorteEsquinas && (
                              <>
                                <div className="corner-cut-mark top-left" style={{ left: 0, top: 0 }} />
                                <div className="corner-cut-mark top-right" style={{ right: 0, top: 0 }} />
                                <div className="corner-cut-mark bottom-left" style={{ left: 0, bottom: 0 }} />
                                <div className="corner-cut-mark bottom-right" style={{ right: 0, bottom: 0 }} />
                              </>
                            )}
                          </div>
                        ))}

                        {/* Líneas de Corte Continuas */}
                        {canvasConfig.lineasCorteContinuas && (
                          <>
                            {lineasCorte.horizontales.map((yMmVal, yIndex) => (
                              <div
                                key={`hl-t-${yIndex}`}
                                className="page-cut-line horizontal"
                                style={{
                                  top: `${yMmVal * zoomFactor}px`,
                                  borderTop: "1px dashed rgba(100, 116, 139, 0.4)",
                                }}
                              />
                            ))}
                            {lineasCorte.verticales.map((xMmVal, xIndex) => (
                              <div
                                key={`vl-t-${xIndex}`}
                                className="page-cut-line vertical"
                                style={{
                                  left: `${xMmVal * zoomFactor}px`,
                                  borderLeft: "1px dashed rgba(100, 116, 139, 0.4)",
                                }}
                              />
                            ))}
                          </>
                        )}
                      </div>
                    </div>
                  )}
                </React.Fragment>
              );
            })}
          </div>
        )}
      </main>
      <input
        ref={fileInputProyectoRef}
        type="file"
        accept=".cdc2"
        onChange={handleCargarProyectoFileChange}
        style={{ display: "none" }}
      />
      <input
        ref={fileInputTemplateRef}
        type="file"
        accept=".cdc2t"
        onChange={handleCargarPlantillaFileChange}
        style={{ display: "none" }}
      />
      {inspectingCardId && cartas.find((c) => c.id === inspectingCardId) && (
        <DetailModal
          carta={cartas.find((c) => c.id === inspectingCardId)!}
          generarReversos={generarReversos}
          imagenTraseraComun={imagenTraseraComun}
          canvasConfig={canvasConfig}
          cardConfig={cardConfig}
          onClose={() => setInspectingCardId(null)}
          templatesMap={templatesMap}
        />
      )}
      {editingCardId && cartas.find((c) => c.id === editingCardId) && (
        <EditCardModal
          carta={cartas.find((c) => c.id === editingCardId)!}
          cardConfig={cardConfig}
          templatesMap={templatesMap}
          generarReversos={generarReversos}
          imagenTraseraComun={imagenTraseraComun}
          onSave={handleSaveCardEdits}
          onClose={() => setEditingCardId(null)}
          initialZoom={zoomFactor}
          onAssignBackTemplate={() => abrirModalPlantillaParaTrasera()}
          onExportTemplate={(plantilla) => {
            setTemplatesMap((prev) => ({
              ...prev,
              [plantilla.id]: plantilla,
            }));
            setImportedTemplates((prev) => {
              const index = prev.findIndex((t) => t.id === plantilla.id);
              if (index !== -1) {
                const updated = [...prev];
                updated[index] = plantilla;
                return updated;
              }
              return [...prev, plantilla];
            });
          }}
          projectAssets={projectAssets}
          projectFonts={projectFonts}
        />
      )}
      {showTemplateModal && (
        <div className="template-modal-backdrop" onClick={() => setShowTemplateModal(false)}>
          <div className="template-modal-container" onClick={(e) => e.stopPropagation()}>
            <header className="template-modal-header">
              <h2>{templateModalMode === "addCard" ? "Añadir Carta desde Plantilla" : "Asignar Reverso desde Plantilla"}</h2>
              <button className="template-modal-close" onClick={() => setShowTemplateModal(false)} title="Cerrar modal">
                ✕
              </button>
            </header>
            <div className="template-modal-body">
              <p className="template-modal-info">Selecciona una de las plantillas disponibles:</p>
              
              <div className="template-modal-group-title">Plantillas por Defecto</div>
              {activeTemplates.length === 0 ? (
                <div className="template-modal-empty">
                  No hay plantillas por defecto cargadas.
                </div>
              ) : (
                <div className="template-list">
                  {activeTemplates.map((plantilla) => {
                    const widthMm = plantilla.id === "vacia" ? cardConfig.anchoMm : plantilla.anchoMm;
                    const heightMm = plantilla.id === "vacia" ? cardConfig.altoMm : plantilla.altoMm;
                    const isMismatch = Math.abs(widthMm - cardConfig.anchoMm) > 0.1 || Math.abs(heightMm - cardConfig.altoMm) > 0.1;
                    return (
                      <div
                        key={plantilla.id}
                        className="template-card-item"
                        onClick={() => handleSelectTemplate(plantilla)}
                        style={isMismatch ? { color: "var(--text-secondary)" } : undefined}
                      >
                        {isMismatch ? (
                          <div
                            className="template-icon"
                            style={{ color: "#d97706", fontSize: "16px", cursor: "help" }}
                            title={`El tamaño de la plantilla (${widthMm}x${heightMm}mm) no coincide con las dimensiones de las cartas configuradas en el proyecto (${cardConfig.anchoMm}x${cardConfig.altoMm}mm)`}
                          >
                            ⚠️
                          </div>
                        ) : (
                          <div className="template-icon">📄</div>
                        )}
                        <div className="template-details">
                          <span className="template-name" style={isMismatch ? { color: "var(--text-secondary)" } : undefined}>{plantilla.nombre}</span>
                          <span className="template-desc" style={isMismatch ? { color: "var(--text-secondary)" } : undefined}>
                            {widthMm} x {heightMm} mm ({plantilla.capas?.length || 0} capas)
                          </span>
                        </div>
                        <button className="btn-add-template">Seleccionar</button>
                      </div>
                    );
                  })}
                </div>
              )}

              <div className="template-modal-group-title" style={{ marginTop: "16px" }}>Plantillas Importadas</div>
              {importedTemplates.length === 0 ? (
                <div className="template-modal-empty">
                  No hay plantillas importadas en esta sesión.
                </div>
              ) : (
                <div className="template-list">
                  {importedTemplates.map((plantilla) => {
                    const isMismatch = Math.abs(plantilla.anchoMm - cardConfig.anchoMm) > 0.1 || Math.abs(plantilla.altoMm - cardConfig.altoMm) > 0.1;
                    return (
                      <div
                        key={plantilla.id}
                        className="template-card-item"
                        onClick={() => handleSelectTemplate(plantilla)}
                        style={isMismatch ? { color: "var(--text-secondary)" } : undefined}
                      >
                        {isMismatch ? (
                          <div
                            className="template-icon"
                            style={{ color: "#d97706", fontSize: "16px", cursor: "help" }}
                            title={`El tamaño de la plantilla (${plantilla.anchoMm}x${plantilla.altoMm}mm) no coincide con las dimensiones de las cartas configuradas en el proyecto (${cardConfig.anchoMm}x${cardConfig.altoMm}mm)`}
                          >
                            ⚠️
                          </div>
                        ) : (
                          <div className="template-icon">📦</div>
                        )}
                        <div className="template-details">
                          <span className="template-name" style={isMismatch ? { color: "var(--text-secondary)" } : undefined}>{plantilla.nombre}</span>
                          <span className="template-desc" style={isMismatch ? { color: "var(--text-secondary)" } : undefined}>
                            {plantilla.anchoMm} x {plantilla.altoMm} mm ({plantilla.capas?.length || 0} capas)
                          </span>
                        </div>
                        <button className="btn-add-template">Seleccionar</button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
            <footer className="template-modal-footer">
              <button className="btn-secondary" onClick={() => setShowTemplateModal(false)}>
                Cancelar
              </button>
            </footer>
          </div>
        </div>
      )}
      {showProjectGallery && (
        <div className="gallery-popup-backdrop" onClick={() => setShowProjectGallery(false)}>
          <div className="gallery-popup-container" onClick={(e) => e.stopPropagation()}>
            <div className="gallery-popup-title-bar">
              <h4 className="gallery-popup-title">Galería del Proyecto</h4>
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
                onClick={() => setShowProjectGallery(false)}
              >
                ✕
              </button>
            </div>
            <p className="gallery-popup-subtitle">
              Recursos de imagen compartidos en todo el proyecto
            </p>

            <div
              className="gallery-manager-dropzone"
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                if (e.dataTransfer.files) {
                  handleUploadProjectAssets(e.dataTransfer.files);
                }
              }}
            >
              <input
                type="file"
                multiple
                accept="image/*"
                id="project-gallery-file-upload"
                style={{ display: "none" }}
                onChange={(e) => {
                  if (e.target.files) {
                    handleUploadProjectAssets(e.target.files);
                  }
                }}
              />
              <label htmlFor="project-gallery-file-upload" className="gallery-dropzone-label">
                <span style={{ fontSize: "20px", marginBottom: "4px" }}>📤</span>
                <span>Arrastra imágenes aquí o haz clic para subir</span>
                <span className="gallery-dropzone-subtext">Formatos permitidos: PNG, JPG, JPEG, WEBP, SVG</span>
              </label>
            </div>

            <div className="gallery-assets-grid">
              {projectAssets && projectAssets.length > 0 ? (
                projectAssets.map((asset: any) => (
                  <div key={asset.id} className="gallery-asset-item" title={asset.nombre}>
                    <button
                      type="button"
                      className="gallery-asset-delete-btn"
                      onClick={() => handleDeleteProjectAsset(asset.id)}
                      title="Eliminar recurso de la galería"
                    >
                      ✕
                    </button>
                    <div className="gallery-asset-thumb-container">
                      <img src={asset.src} alt={asset.nombre} className="gallery-asset-thumb" />
                    </div>
                    <div className="gallery-asset-name" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "4px", padding: "4px 8px" }}>
                      <span className="truncate" style={{ flex: 1, textAlign: "left" }} title={asset.nombre}>{asset.nombre}</span>
                      <button
                        type="button"
                        style={{ background: "none", border: "none", cursor: "pointer", fontSize: "10px", padding: 0 }}
                        onClick={() => handleRenameProjectAsset(asset.id)}
                        title="Renombrar"
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
                  No hay imágenes en la galería del proyecto. Arrastra archivos arriba para empezar.
                </div>
              )}
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "8px" }}>
              <button
                type="button"
                className="btn-primary"
                style={{ padding: "6px 16px", fontSize: "12px" }}
                onClick={() => setShowProjectGallery(false)}
              >
                Listo
              </button>
            </div>
          </div>
        </div>
      )}

      {showProjectFonts && (
        <div className="gallery-popup-backdrop" onClick={() => setShowProjectFonts(false)}>
          <div className="gallery-popup-container" onClick={(e) => e.stopPropagation()}>
            <div className="gallery-popup-title-bar">
              <h4 className="gallery-popup-title">Tipografías del Proyecto</h4>
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
                onClick={() => setShowProjectFonts(false)}
              >
                ✕
              </button>
            </div>
            <p className="gallery-popup-subtitle">
              Tipografías personalizadas compartidas en todo el proyecto
            </p>

            <div
              className="gallery-manager-dropzone"
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                if (e.dataTransfer.files) {
                  handleUploadProjectFonts(e.dataTransfer.files);
                }
              }}
            >
              <input
                type="file"
                multiple
                accept=".ttf,.otf,.woff,.woff2"
                id="project-fonts-file-upload"
                style={{ display: "none" }}
                onChange={(e) => {
                  if (e.target.files) {
                    handleUploadProjectFonts(e.target.files);
                  }
                }}
              />
              <label htmlFor="project-fonts-file-upload" className="gallery-dropzone-label">
                <span style={{ fontSize: "20px", marginBottom: "4px" }}>📤</span>
                <span>Arrastra tipografías aquí o haz clic para subir</span>
                <span className="gallery-dropzone-subtext">Formatos permitidos: TTF, OTF, WOFF, WOFF2</span>
              </label>
            </div>

            <div className="gallery-assets-grid">
              {projectFonts && projectFonts.length > 0 ? (
                projectFonts.map((font: any) => (
                  <div key={font.id} className="gallery-asset-item" title={font.filename}>
                    <button
                      type="button"
                      className="gallery-asset-delete-btn"
                      onClick={() => handleDeleteProjectFont(font.id)}
                      title="Eliminar tipografía del proyecto"
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
                        onClick={() => handleRenameProjectFont(font.id)}
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
                  No hay tipografías en la galería del proyecto. Arrastra archivos arriba para empezar.
                </div>
              )}
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "8px" }}>
              <button
                type="button"
                className="btn-primary"
                style={{ padding: "6px 16px", fontSize: "12px" }}
                onClick={() => setShowProjectFonts(false)}
              >
                Listo
              </button>
            </div>
          </div>
        </div>
      )}

      {showDocConfig && (
        <div className="template-modal-backdrop" style={{ zIndex: 4000 }}>
          <div className="template-modal-container" style={{ maxWidth: "700px", padding: "24px" }} onClick={(e) => e.stopPropagation()}>
            <header className="template-modal-header" style={{ marginBottom: "16px" }}>
              <h2 style={{ margin: 0, fontSize: "20px" }}>Añadir Nuevo Documento al Proyecto</h2>
            </header>
            
            <div className="template-modal-body" style={{ maxHeight: "70vh", overflowY: "auto", paddingRight: "8px" }}>
              <div className="config-section-title" style={{ fontWeight: "bold", fontSize: "14px", marginBottom: "12px", borderBottom: "1px solid var(--border-color)", paddingBottom: "6px" }}>
                Datos del Documento
              </div>
              <div className="input-field" style={{ marginBottom: "16px" }}>
                <label style={{ fontWeight: 500, display: "block", marginBottom: "4px" }}>Nombre del Documento</label>
                <input
                  type="text"
                  value={tempDocNombre}
                  onChange={(e) => setTempDocNombre(e.target.value)}
                  placeholder="ej. Cartas Horizontales"
                  style={{ width: "100%", padding: "8px", borderRadius: "4px", border: "1px solid var(--border-color)", boxSizing: "border-box" }}
                  required
                />
              </div>

              <div className="config-section-title" style={{ fontWeight: "bold", fontSize: "14px", margin: "16px 0 12px 0", borderBottom: "1px solid var(--border-color)", paddingBottom: "6px" }}>
                Ajustes de Página
              </div>
              <div className="input-row" style={{ display: "flex", gap: "12px", marginBottom: "12px" }}>
                <div className="input-field" style={{ flex: 1 }}>
                  <label>Tamaño de Hoja</label>
                  <select value={tempCanvasType} onChange={(e) => handleTempCanvasPresetChange(e.target.value)}>
                    <option value="A4">DINA4 (210 x 297 mm)</option>
                    <option value="A3">DINA3 (297 x 420 mm)</option>
                    <option value="custom">Personalizado</option>
                  </select>
                </div>
                <div className="input-field" style={{ flex: 1 }}>
                  <label>Orientación</label>
                  <select
                    value={tempCanvasConfig.orientacion}
                    onChange={(e) => handleTempOrientationChange(e.target.value as any)}
                  >
                    <option value="vertical">Vertical</option>
                    <option value="horizontal">Horizontal</option>
                  </select>
                </div>
              </div>

              {tempCanvasType === "custom" && (
                <div className="input-row" style={{ display: "flex", gap: "12px", marginBottom: "12px" }}>
                  <div className="input-field" style={{ flex: 1 }}>
                    <label>Ancho (mm)</label>
                    <input
                      type="number"
                      value={tempCanvasConfig.anchoMm}
                      onChange={(e) => setTempCanvasConfig((prev) => ({ ...prev, anchoMm: Number(e.target.value) }))}
                    />
                  </div>
                  <div className="input-field" style={{ flex: 1 }}>
                    <label>Alto (mm)</label>
                    <input
                      type="number"
                      value={tempCanvasConfig.altoMm}
                      onChange={(e) => setTempCanvasConfig((prev) => ({ ...prev, altoMm: Number(e.target.value) }))}
                    />
                  </div>
                </div>
              )}

              <div className="input-row" style={{ display: "flex", gap: "12px", marginBottom: "12px" }}>
                <div className="input-field" style={{ flex: 1 }}>
                  <label>Margen L/R (mm)</label>
                  <input
                    type="number"
                    value={tempCanvasConfig.margenLeftMm}
                    onChange={(e) =>
                      setTempCanvasConfig((prev) => ({
                        ...prev,
                        margenLeftMm: Number(e.target.value),
                        margenRightMm: Number(e.target.value),
                      }))
                    }
                  />
                </div>
                <div className="input-field" style={{ flex: 1 }}>
                  <label>Margen T/B (mm)</label>
                  <input
                    type="number"
                    value={tempCanvasConfig.margenTopMm}
                    onChange={(e) =>
                      setTempCanvasConfig((prev) => ({
                        ...prev,
                        margenTopMm: Number(e.target.value),
                        margenBottomMm: Number(e.target.value),
                      }))
                    }
                  />
                </div>
              </div>

              <div className="config-section-title" style={{ fontWeight: "bold", fontSize: "14px", margin: "20px 0 12px 0", borderBottom: "1px solid var(--border-color)", paddingBottom: "6px" }}>
                Dimensiones de Carta
              </div>
              <div className="input-row" style={{ display: "flex", gap: "12px", marginBottom: "12px" }}>
                <div className="input-field" style={{ flex: 1 }}>
                  <label>Tipo de Carta</label>
                  <select value={tempCardPreset} onChange={(e) => handleTempCardPresetChange(e.target.value)}>
                    <option value="standard">Poker/Standard vertical (63.5 x 88.9 mm)</option>
                    <option value="standard_horizontal">Poker/Standard horizontal (88.9 x 63.5 mm)</option>
                    <option value="mini">Mini vertical (44.4 x 63.5 mm)</option>
                    <option value="mini_horizontal">Mini horizontal (63.5 x 44.4 mm)</option>
                    <option value="tarot">Tarot vertical (70.0 x 120.0 mm)</option>
                    <option value="tarot_horizontal">Tarot horizontal (120.0 x 70.0 mm)</option>
                    <option value="custom">Personalizado</option>
                  </select>
                </div>
                {tempCardPreset === "custom" && (
                  <div className="input-field" style={{ flex: 1 }}>
                    <div className="input-row" style={{ display: "flex", gap: "12px" }}>
                      <div className="input-field" style={{ flex: 1 }}>
                        <label>Ancho (mm)</label>
                        <input
                          type="number"
                          value={tempCardConfig.anchoMm}
                          onChange={(e) => setTempCardConfig((prev) => ({ ...prev, anchoMm: Number(e.target.value) }))}
                        />
                      </div>
                      <div className="input-field" style={{ flex: 1 }}>
                        <label>Alto (mm)</label>
                        <input
                          type="number"
                          value={tempCardConfig.altoMm}
                          onChange={(e) => setTempCardConfig((prev) => ({ ...prev, altoMm: Number(e.target.value) }))}
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="input-row" style={{ display: "flex", gap: "12px", marginBottom: "12px" }}>
                <div className="input-field" style={{ flex: 1 }}>
                  <label>Espacio X (mm)</label>
                  <input
                    type="number"
                    value={tempCardConfig.espaciadoXMm}
                    onChange={(e) => setTempCardConfig((prev) => ({ ...prev, espaciadoXMm: Number(e.target.value) }))}
                  />
                </div>
                <div className="input-field" style={{ flex: 1 }}>
                  <label>Espacio Y (mm)</label>
                  <input
                    type="number"
                    value={tempCardConfig.espaciadoYMm}
                    onChange={(e) => setTempCardConfig((prev) => ({ ...prev, espaciadoYMm: Number(e.target.value) }))}
                  />
                </div>
              </div>

              <div className="input-row" style={{ display: "flex", gap: "12px", marginBottom: "12px" }}>
                <div className="input-field" style={{ flex: 1 }}>
                  <label>Sangrado (Bleed - mm)</label>
                  <input
                    type="number"
                    value={tempCardConfig.sangradoMm}
                    onChange={(e) => setTempCardConfig((prev) => ({ ...prev, sangradoMm: Number(e.target.value) }))}
                  />
                </div>
                <div className="input-field" style={{ flex: 1 }}>
                  <label>Borde Corte (mm)</label>
                  <div style={{ display: "flex", gap: "6px" }}>
                    <input
                      type="number"
                      style={{ flex: 1 }}
                      value={tempCardConfig.bordeCorteMm}
                      onChange={(e) => setTempCardConfig((prev) => ({ ...prev, bordeCorteMm: Number(e.target.value) }))}
                    />
                    {tempCardConfig.bordeCorteMm > 0 && (
                      <input
                        type="color"
                        value={tempCardConfig.bordeCorteColor}
                        onChange={(e) => setTempCardConfig((prev) => ({ ...prev, bordeCorteColor: e.target.value }))}
                        style={{ width: "36px", height: "36px", padding: 0, border: "1px solid var(--border-color)", borderRadius: "4px", cursor: "pointer", background: "none" }}
                        title="Color del borde de corte"
                      />
                    )}
                  </div>
                </div>
              </div>

              <div className="input-field" style={{ marginBottom: "12px" }}>
                <label>Ajuste de Ilustración</label>
                <select
                  value={tempCardConfig.modoAjuste || "cover"}
                  onChange={(e) => setTempCardConfig((prev) => ({ ...prev, modoAjuste: e.target.value as any }))}
                >
                  <option value="cover">Recortar para rellenar (Cover)</option>
                  <option value="contain">Ajustar sin recortar (Contain)</option>
                </select>
              </div>
            </div>

            <footer className="template-modal-footer" style={{ display: "flex", gap: "12px", justifyContent: "flex-end", marginTop: "20px" }}>
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setShowDocConfig(false)}
              >
                Cancelar
              </button>
              <button
                type="button"
                className="btn-primary"
                onClick={handleCreateDocumento}
              >
                ✨ Crear Nuevo Documento en el Proyecto
              </button>
            </footer>
          </div>
        </div>
      )}

      {!projectCreated && (
        <div className="template-modal-backdrop" style={{ zIndex: 4000 }}>
          <div className="template-modal-container" style={{ maxWidth: "700px", padding: "24px" }} onClick={(e) => e.stopPropagation()}>
            <header className="template-modal-header" style={{ marginBottom: "16px" }}>
              <h2 style={{ margin: 0, fontSize: "20px" }}>Crear o Cargar Proyecto</h2>
            </header>
            
            <div className="template-modal-body" style={{ maxHeight: "70vh", overflowY: "auto", paddingRight: "8px" }}>
              <div className="config-section-title" style={{ fontWeight: "bold", fontSize: "14px", marginBottom: "12px", borderBottom: "1px solid var(--border-color)", paddingBottom: "6px" }}>
                Datos del Proyecto
              </div>
              <div className="input-field" style={{ marginBottom: "16px" }}>
                <label style={{ fontWeight: 500, display: "block", marginBottom: "4px" }}>Nombre del Proyecto</label>
                <input
                  type="text"
                  value={tempNombreProyecto}
                  onChange={(e) => setTempNombreProyecto(e.target.value)}
                  placeholder="ej. Mi Juego de Cartas"
                  style={{ width: "100%", padding: "8px", borderRadius: "4px", border: "1px solid var(--border-color)", boxSizing: "border-box" }}
                  required
                />
              </div>

              <div className="config-section-title" style={{ fontWeight: "bold", fontSize: "14px", margin: "16px 0 12px 0", borderBottom: "1px solid var(--border-color)", paddingBottom: "6px" }}>
                Ajustes de Página
              </div>
              <div className="input-row" style={{ display: "flex", gap: "12px", marginBottom: "12px" }}>
                <div className="input-field" style={{ flex: 1 }}>
                  <label>Tamaño de Hoja</label>
                  <select value={tempCanvasType} onChange={(e) => handleTempCanvasPresetChange(e.target.value)}>
                    <option value="A4">DINA4 (210 x 297 mm)</option>
                    <option value="A3">DINA3 (297 x 420 mm)</option>
                    <option value="custom">Personalizado</option>
                  </select>
                </div>
                <div className="input-field" style={{ flex: 1 }}>
                  <label>Orientación</label>
                  <select
                    value={tempCanvasConfig.orientacion}
                    onChange={(e) => handleTempOrientationChange(e.target.value as any)}
                  >
                    <option value="vertical">Vertical</option>
                    <option value="horizontal">Horizontal</option>
                  </select>
                </div>
              </div>

              {tempCanvasType === "custom" && (
                <div className="input-row" style={{ display: "flex", gap: "12px", marginBottom: "12px" }}>
                  <div className="input-field" style={{ flex: 1 }}>
                    <label>Ancho (mm)</label>
                    <input
                      type="number"
                      value={tempCanvasConfig.anchoMm}
                      onChange={(e) => setTempCanvasConfig((prev) => ({ ...prev, anchoMm: Number(e.target.value) }))}
                    />
                  </div>
                  <div className="input-field" style={{ flex: 1 }}>
                    <label>Alto (mm)</label>
                    <input
                      type="number"
                      value={tempCanvasConfig.altoMm}
                      onChange={(e) => setTempCanvasConfig((prev) => ({ ...prev, altoMm: Number(e.target.value) }))}
                    />
                  </div>
                </div>
              )}

              <div className="input-row" style={{ display: "flex", gap: "12px", marginBottom: "12px" }}>
                <div className="input-field" style={{ flex: 1 }}>
                  <label>Margen L/R (mm)</label>
                  <input
                    type="number"
                    value={tempCanvasConfig.margenLeftMm}
                    onChange={(e) =>
                      setTempCanvasConfig((prev) => ({
                        ...prev,
                        margenLeftMm: Number(e.target.value),
                        margenRightMm: Number(e.target.value),
                      }))
                    }
                  />
                </div>
                <div className="input-field" style={{ flex: 1 }}>
                  <label>Margen T/B (mm)</label>
                  <input
                    type="number"
                    value={tempCanvasConfig.margenTopMm}
                    onChange={(e) =>
                      setTempCanvasConfig((prev) => ({
                        ...prev,
                        margenTopMm: Number(e.target.value),
                        margenBottomMm: Number(e.target.value),
                      }))
                    }
                  />
                </div>
              </div>

              <div className="config-section-title" style={{ fontWeight: "bold", fontSize: "14px", margin: "20px 0 12px 0", borderBottom: "1px solid var(--border-color)", paddingBottom: "6px" }}>
                Dimensiones de Carta
              </div>
              <div className="input-row" style={{ display: "flex", gap: "12px", marginBottom: "12px" }}>
                <div className="input-field" style={{ flex: 1 }}>
                  <label>Tipo de Carta</label>
                  <select value={tempCardPreset} onChange={(e) => handleTempCardPresetChange(e.target.value)}>
                    <option value="standard">Poker/Standard vertical (63.5 x 88.9 mm)</option>
                    <option value="standard_horizontal">Poker/Standard horizontal (88.9 x 63.5 mm)</option>
                    <option value="mini">Mini vertical (44.4 x 63.5 mm)</option>
                    <option value="mini_horizontal">Mini horizontal (63.5 x 44.4 mm)</option>
                    <option value="tarot">Tarot vertical (70.0 x 120.0 mm)</option>
                    <option value="tarot_horizontal">Tarot horizontal (120.0 x 70.0 mm)</option>
                    <option value="custom">Personalizado</option>
                  </select>
                </div>
                {tempCardPreset === "custom" && (
                  <div className="input-field" style={{ flex: 1 }}>
                    <div className="input-row" style={{ display: "flex", gap: "12px" }}>
                      <div className="input-field" style={{ flex: 1 }}>
                        <label>Ancho (mm)</label>
                        <input
                          type="number"
                          value={tempCardConfig.anchoMm}
                          onChange={(e) => setTempCardConfig((prev) => ({ ...prev, anchoMm: Number(e.target.value) }))}
                        />
                      </div>
                      <div className="input-field" style={{ flex: 1 }}>
                        <label>Alto (mm)</label>
                        <input
                          type="number"
                          value={tempCardConfig.altoMm}
                          onChange={(e) => setTempCardConfig((prev) => ({ ...prev, altoMm: Number(e.target.value) }))}
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="input-row" style={{ display: "flex", gap: "12px", marginBottom: "12px" }}>
                <div className="input-field" style={{ flex: 1 }}>
                  <label>Espacio X (mm)</label>
                  <input
                    type="number"
                    value={tempCardConfig.espaciadoXMm}
                    onChange={(e) => setTempCardConfig((prev) => ({ ...prev, espaciadoXMm: Number(e.target.value) }))}
                  />
                </div>
                <div className="input-field" style={{ flex: 1 }}>
                  <label>Espacio Y (mm)</label>
                  <input
                    type="number"
                    value={tempCardConfig.espaciadoYMm}
                    onChange={(e) => setTempCardConfig((prev) => ({ ...prev, espaciadoYMm: Number(e.target.value) }))}
                  />
                </div>
              </div>

              <div className="input-row" style={{ display: "flex", gap: "12px", marginBottom: "12px" }}>
                <div className="input-field" style={{ flex: 1 }}>
                  <label>Sangrado (Bleed - mm)</label>
                  <input
                    type="number"
                    value={tempCardConfig.sangradoMm}
                    onChange={(e) => setTempCardConfig((prev) => ({ ...prev, sangradoMm: Number(e.target.value) }))}
                  />
                </div>
                <div className="input-field" style={{ flex: 1 }}>
                  <label>Borde Corte (mm)</label>
                  <div style={{ display: "flex", gap: "6px" }}>
                    <input
                      type="number"
                      style={{ flex: 1 }}
                      value={tempCardConfig.bordeCorteMm}
                      onChange={(e) => setTempCardConfig((prev) => ({ ...prev, bordeCorteMm: Number(e.target.value) }))}
                    />
                    {tempCardConfig.bordeCorteMm > 0 && (
                      <input
                        type="color"
                        value={tempCardConfig.bordeCorteColor}
                        onChange={(e) => setTempCardConfig((prev) => ({ ...prev, bordeCorteColor: e.target.value }))}
                        style={{ width: "36px", height: "36px", padding: 0, border: "1px solid var(--border-color)", borderRadius: "4px", cursor: "pointer", background: "none" }}
                        title="Color del borde de corte"
                      />
                    )}
                  </div>
                </div>
              </div>

              <div className="input-field" style={{ marginBottom: "12px" }}>
                <label>Ajuste de Ilustración</label>
                <select
                  value={tempCardConfig.modoAjuste || "cover"}
                  onChange={(e) => setTempCardConfig((prev) => ({ ...prev, modoAjuste: e.target.value as any }))}
                >
                  <option value="cover">Recortar para rellenar (Cover)</option>
                  <option value="contain">Ajustar sin recortar (Contain)</option>
                </select>
              </div>
            </div>

            <footer className="template-modal-footer" style={{ display: "flex", gap: "12px", justifyContent: "flex-end", marginTop: "20px" }}>
              <button
                type="button"
                className="btn-secondary"
                onClick={() => fileInputProyectoRef.current?.click()}
                style={{ display: "flex", alignItems: "center", gap: "6px" }}
              >
                📂 Abrir Proyecto Existente (.cdc2)
              </button>
              <button
                type="button"
                className="btn-primary"
                onClick={handleApplyProjectConfig}
              >
                ✨ Crear Nuevo Proyecto
              </button>
            </footer>
          </div>
        </div>
      )}

      {showProjectConfig && (
        <div className="template-modal-backdrop" style={{ zIndex: 3000 }} onClick={() => setShowProjectConfig(false)}>
          <div className="template-modal-container" style={{ maxWidth: "700px", padding: "24px" }} onClick={(e) => e.stopPropagation()}>
            <header className="template-modal-header" style={{ marginBottom: "16px" }}>
              <h2 style={{ margin: 0, fontSize: "20px" }}>Configuración del Proyecto</h2>
              <button className="template-modal-close" onClick={() => setShowProjectConfig(false)} title="Cerrar modal">
                ✕
              </button>
            </header>
            
            <div className="template-modal-body" style={{ maxHeight: "70vh", overflowY: "auto", paddingRight: "8px" }}>
              <div className="config-section-title" style={{ fontWeight: "bold", fontSize: "14px", marginBottom: "12px", borderBottom: "1px solid var(--border-color)", paddingBottom: "6px" }}>
                Datos del Proyecto
              </div>
              <div className="input-field" style={{ marginBottom: "16px" }}>
                <label style={{ fontWeight: 500, display: "block", marginBottom: "4px" }}>Nombre del Proyecto</label>
                <input
                  type="text"
                  value={tempNombreProyecto}
                  onChange={(e) => setTempNombreProyecto(e.target.value)}
                  placeholder="ej. Mi Juego de Cartas"
                  style={{ width: "100%", padding: "8px", borderRadius: "4px", border: "1px solid var(--border-color)", boxSizing: "border-box" }}
                  required
                />
              </div>

              <div className="config-section-title" style={{ fontWeight: "bold", fontSize: "14px", margin: "16px 0 12px 0", borderBottom: "1px solid var(--border-color)", paddingBottom: "6px" }}>
                Ajustes de Página
              </div>
              <div className="input-row" style={{ display: "flex", gap: "12px", marginBottom: "12px" }}>
                <div className="input-field" style={{ flex: 1 }}>
                  <label>Tamaño de Hoja</label>
                  <select value={tempCanvasType} onChange={(e) => handleTempCanvasPresetChange(e.target.value)}>
                    <option value="A4">DINA4 (210 x 297 mm)</option>
                    <option value="A3">DINA3 (297 x 420 mm)</option>
                    <option value="custom">Personalizado</option>
                  </select>
                </div>
                <div className="input-field" style={{ flex: 1 }}>
                  <label>Orientación</label>
                  <select
                    value={tempCanvasConfig.orientacion}
                    onChange={(e) => handleTempOrientationChange(e.target.value as any)}
                  >
                    <option value="vertical">Vertical</option>
                    <option value="horizontal">Horizontal</option>
                  </select>
                </div>
              </div>

              {tempCanvasType === "custom" && (
                <div className="input-row" style={{ display: "flex", gap: "12px", marginBottom: "12px" }}>
                  <div className="input-field" style={{ flex: 1 }}>
                    <label>Ancho (mm)</label>
                    <input
                      type="number"
                      value={tempCanvasConfig.anchoMm}
                      onChange={(e) => setTempCanvasConfig((prev) => ({ ...prev, anchoMm: Number(e.target.value) }))}
                    />
                  </div>
                  <div className="input-field" style={{ flex: 1 }}>
                    <label>Alto (mm)</label>
                    <input
                      type="number"
                      value={tempCanvasConfig.altoMm}
                      onChange={(e) => setTempCanvasConfig((prev) => ({ ...prev, altoMm: Number(e.target.value) }))}
                    />
                  </div>
                </div>
              )}

              <div className="input-row" style={{ display: "flex", gap: "12px", marginBottom: "12px" }}>
                <div className="input-field" style={{ flex: 1 }}>
                  <label>Margen L/R (mm)</label>
                  <input
                    type="number"
                    value={tempCanvasConfig.margenLeftMm}
                    onChange={(e) =>
                      setTempCanvasConfig((prev) => ({
                        ...prev,
                        margenLeftMm: Number(e.target.value),
                        margenRightMm: Number(e.target.value),
                      }))
                    }
                  />
                </div>
                <div className="input-field" style={{ flex: 1 }}>
                  <label>Margen T/B (mm)</label>
                  <input
                    type="number"
                    value={tempCanvasConfig.margenTopMm}
                    onChange={(e) =>
                      setTempCanvasConfig((prev) => ({
                        ...prev,
                        margenTopMm: Number(e.target.value),
                        margenBottomMm: Number(e.target.value),
                      }))
                    }
                  />
                </div>
              </div>

              <div className="config-section-title" style={{ fontWeight: "bold", fontSize: "14px", margin: "20px 0 12px 0", borderBottom: "1px solid var(--border-color)", paddingBottom: "6px" }}>
                Dimensiones de Carta
              </div>
              <div className="input-row" style={{ display: "flex", gap: "12px", marginBottom: "12px" }}>
                <div className="input-field" style={{ flex: 1 }}>
                  <label>Tipo de Carta</label>
                  <select value={tempCardPreset} onChange={(e) => handleTempCardPresetChange(e.target.value)}>
                    <option value="standard">Poker/Standard vertical (63.5 x 88.9 mm)</option>
                    <option value="standard_horizontal">Poker/Standard horizontal (88.9 x 63.5 mm)</option>
                    <option value="mini">Mini vertical (44.4 x 63.5 mm)</option>
                    <option value="mini_horizontal">Mini horizontal (63.5 x 44.4 mm)</option>
                    <option value="tarot">Tarot vertical (70.0 x 120.0 mm)</option>
                    <option value="tarot_horizontal">Tarot horizontal (120.0 x 70.0 mm)</option>
                    <option value="custom">Personalizado</option>
                  </select>
                </div>
                {tempCardPreset === "custom" && (
                  <div className="input-field" style={{ flex: 1 }}>
                    <div className="input-row" style={{ display: "flex", gap: "12px" }}>
                      <div className="input-field" style={{ flex: 1 }}>
                        <label>Ancho (mm)</label>
                        <input
                          type="number"
                          value={tempCardConfig.anchoMm}
                          onChange={(e) => setTempCardConfig((prev) => ({ ...prev, anchoMm: Number(e.target.value) }))}
                        />
                      </div>
                      <div className="input-field" style={{ flex: 1 }}>
                        <label>Alto (mm)</label>
                        <input
                          type="number"
                          value={tempCardConfig.altoMm}
                          onChange={(e) => setTempCardConfig((prev) => ({ ...prev, altoMm: Number(e.target.value) }))}
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="input-row" style={{ display: "flex", gap: "12px", marginBottom: "12px" }}>
                <div className="input-field" style={{ flex: 1 }}>
                  <label>Espacio X (mm)</label>
                  <input
                    type="number"
                    value={tempCardConfig.espaciadoXMm}
                    onChange={(e) => setTempCardConfig((prev) => ({ ...prev, espaciadoXMm: Number(e.target.value) }))}
                  />
                </div>
                <div className="input-field" style={{ flex: 1 }}>
                  <label>Espacio Y (mm)</label>
                  <input
                    type="number"
                    value={tempCardConfig.espaciadoYMm}
                    onChange={(e) => setTempCardConfig((prev) => ({ ...prev, espaciadoYMm: Number(e.target.value) }))}
                  />
                </div>
              </div>

              <div className="input-row" style={{ display: "flex", gap: "12px", marginBottom: "12px" }}>
                <div className="input-field" style={{ flex: 1 }}>
                  <label>Sangrado (Bleed - mm)</label>
                  <input
                    type="number"
                    value={tempCardConfig.sangradoMm}
                    onChange={(e) => setTempCardConfig((prev) => ({ ...prev, sangradoMm: Number(e.target.value) }))}
                  />
                </div>
                <div className="input-field" style={{ flex: 1 }}>
                  <label>Borde Corte (mm)</label>
                  <div style={{ display: "flex", gap: "6px" }}>
                    <input
                      type="number"
                      style={{ flex: 1 }}
                      value={tempCardConfig.bordeCorteMm}
                      onChange={(e) => setTempCardConfig((prev) => ({ ...prev, bordeCorteMm: Number(e.target.value) }))}
                    />
                    {tempCardConfig.bordeCorteMm > 0 && (
                      <input
                        type="color"
                        value={tempCardConfig.bordeCorteColor}
                        onChange={(e) => setTempCardConfig((prev) => ({ ...prev, bordeCorteColor: e.target.value }))}
                        style={{ width: "36px", height: "36px", padding: 0, border: "1px solid var(--border-color)", borderRadius: "4px", cursor: "pointer", background: "none" }}
                        title="Color del borde de corte"
                      />
                    )}
                  </div>
                </div>
              </div>

              <div className="input-field" style={{ marginBottom: "12px" }}>
                <label>Ajuste de Ilustración</label>
                <select
                  value={tempCardConfig.modoAjuste || "cover"}
                  onChange={(e) => setTempCardConfig((prev) => ({ ...prev, modoAjuste: e.target.value as any }))}
                >
                  <option value="cover">Recortar para rellenar (Cover)</option>
                  <option value="contain">Ajustar sin recortar (Contain)</option>
                </select>
              </div>
            </div>

            <footer className="template-modal-footer" style={{ display: "flex", gap: "12px", justifyContent: "flex-end", marginTop: "20px" }}>
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setShowProjectConfig(false)}
              >
                Cancelar
              </button>
              <button
                type="button"
                className="btn-primary"
                onClick={handleApplyProjectConfig}
              >
                Guardar Configuración
              </button>
            </footer>
          </div>
        </div>
      )}
    </div>
    </div>
  );
}
