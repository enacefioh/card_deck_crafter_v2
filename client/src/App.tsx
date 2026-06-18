import React, { useState, useMemo, useRef, useEffect } from "react";
import { calcularDistribucion } from "shared";
import type { CanvasConfig, CardConfig, Carta } from "shared";
import JSZip from "jszip";
import MenuBar from "./MenuBar";
import { validarYParsearProyecto, moverCartas, duplicarCartas } from "./utils/projectUtils";
import DetailModal from "./DetailModal";
import "./App.css";

// Formato de preajustes de cartas
const PREAJUSTES_CARTAS = {
  standard: { nombre: "Estándar vertical (63.5 x 88.9 mm)", ancho: 63.5, alto: 88.9 },
  mini: { nombre: "Mini vertical (44.4 x 63.5 mm)", ancho: 44.4, alto: 63.5 },
  tarot: { nombre: "Tarot vertical (70.0 x 120.0 mm)", ancho: 70.0, alto: 120.0 },
  custom: { nombre: "Personalizado", ancho: 63.5, alto: 88.9 },
};

// Formato de preajustes de lienzos
const PREAJUSTES_HOJAS = {
  A4: { ancho: 210, alto: 297 },
  A3: { ancho: 297, alto: 420 },
  custom: { ancho: 210, alto: 297 },
};

export default function App() {
  // --- Refs para Enfoque y Triggers ---
  const sectionLienzoRef = useRef<HTMLDivElement>(null);
  const sectionCartaRef = useRef<HTMLDivElement>(null);
  const fileInputProyectoRef = useRef<HTMLInputElement>(null);
  const fileInputImagenesRef = useRef<HTMLInputElement>(null);

  // --- Estados de Configuración ---
  const [canvasType, setCanvasType] = useState<"A4" | "A3" | "Custom">("A4");
  const [canvasConfig, setCanvasConfig] = useState<CanvasConfig>({
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

  const [cardPreset, setCardPreset] = useState<keyof typeof PREAJUSTES_CARTAS>("standard");
  const [cardConfig, setCardConfig] = useState<CardConfig>({
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

  const [generarReversos, setGenerarReversos] = useState<boolean>(false);
  const [imagenTraseraComun, setImagenTraseraComun] = useState<string | null>(null);
  const [cartas, setCartas] = useState<Carta[]>([]);
  const [selectedCardIds, setSelectedCardIds] = useState<string[]>([]);
  const [inspectingCardId, setInspectingCardId] = useState<string | null>(null);
  const fileInputReversoLoteRef = useRef<HTMLInputElement>(null);
  const [zoomFactor, setZoomFactor] = useState<number>(2.5); // px por mm

  // --- Manejador de Lienzo reactivo ---
  const handleCanvasPresetChange = (tipo: "A4" | "A3" | "Custom") => {
    setCanvasType(tipo);
    if (tipo !== "Custom") {
      const preset = PREAJUSTES_HOJAS[tipo];
      setCanvasConfig((prev) => ({
        ...prev,
        tipo,
        anchoMm: prev.orientacion === "vertical" ? preset.ancho : preset.alto,
        altoMm: prev.orientacion === "vertical" ? preset.alto : preset.ancho,
      }));
    }
  };

  const handleOrientationChange = (orientacion: "vertical" | "horizontal") => {
    setCanvasConfig((prev) => {
      // Invertir dimensiones actuales
      const preset = prev.tipo !== "Custom" ? PREAJUSTES_HOJAS[prev.tipo as "A4" | "A3"] : null;
      let nuevoAncho = prev.altoMm;
      let nuevoAlto = prev.anchoMm;

      if (preset) {
        nuevoAncho = orientacion === "vertical" ? preset.ancho : preset.alto;
        nuevoAlto = orientacion === "vertical" ? preset.alto : preset.ancho;
      }

      return {
        ...prev,
        orientacion,
        anchoMm: nuevoAncho,
        altoMm: nuevoAlto,
      };
    });
  };

  const handleCardPresetChange = (presetKey: keyof typeof PREAJUSTES_CARTAS) => {
    setCardPreset(presetKey);
    if (presetKey !== "custom") {
      const preset = PREAJUSTES_CARTAS[presetKey];
      setCardConfig((prev) => ({
        ...prev,
        anchoMm: preset.ancho,
        altoMm: preset.alto,
      }));
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
    const imagenMap = new Map<string, string>(); // blobUrl -> assetPath

    const addBlobToZip = async (blobUrl: string, baseName: string): Promise<string> => {
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

    const processedCards = [];
    for (const card of cartas) {
      const imagenFrontalPath = await addBlobToZip(card.imagenFrontal, "frontal");
      let imagenTraseraPath = null;
      if (card.imagenTrasera) {
        imagenTraseraPath = await addBlobToZip(card.imagenTrasera, "trasera");
      }
      processedCards.push({
        id: card.id,
        nombre: card.nombre,
        imagenFrontal: imagenFrontalPath,
        imagenTrasera: imagenTraseraPath,
        cantidad: card.cantidad,
      });
    }

    let commonBackPath = null;
    if (imagenTraseraComun) {
      commonBackPath = await addBlobToZip(imagenTraseraComun, "trasera_comun");
    }

    const proyecto = {
      version: "2.0.0",
      meta: {
        nombre: "Exportación CDC2",
        fechaCreacion: new Date().toISOString(),
        fechaModificacion: new Date().toISOString(),
      },
      canvasConfig,
      cardConfig,
      modoTraseras: generarReversos ? (imagenTraseraComun ? "comun" : "individual") : "ninguno",
      imagenTraseraComun: commonBackPath,
      cards: processedCards,
    };

    zip.file("project.json", JSON.stringify(proyecto, null, 2));
    return await zip.generateAsync({ type: "blob" });
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
      link.download = `baraja_${Date.now()}.pdf`;
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
      link.download = `proyecto_cdc2_${Date.now()}.cdc2`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(downloadUrl);
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
        URL.revokeObjectURL(c.imagenFrontal);
        if (c.imagenTrasera) URL.revokeObjectURL(c.imagenTrasera);
      });
      if (imagenTraseraComun) {
        URL.revokeObjectURL(imagenTraseraComun);
      }

      const cacheBlobUrls = new Map<string, string>();

      const resolverAssetBlob = async (assetPath: string | null): Promise<string | null> => {
        if (!assetPath) return null;
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

      const nuevasCartas: Carta[] = [];
      for (const card of proyecto.cards) {
        const frontalUrl = await resolverAssetBlob(card.imagenFrontal);
        if (!frontalUrl) continue;

        const traseraUrl = await resolverAssetBlob(card.imagenTrasera);

        nuevasCartas.push({
          id: card.id || `${Date.now()}-${Math.random()}`,
          nombre: card.nombre,
          imagenFrontal: frontalUrl,
          imagenTrasera: traseraUrl,
          cantidad: card.cantidad || 1,
        });
      }

      const nuevaTraseraComunUrl = await resolverAssetBlob(proyecto.imagenTraseraComun);

      setCanvasConfig(proyecto.canvasConfig);
      setCardConfig(proyecto.cardConfig);
      setImagenTraseraComun(nuevaTraseraComunUrl);
      setGenerarReversos(proyecto.modoTraseras !== "ninguno");
      setCartas(nuevasCartas);

      setCanvasType(proyecto.canvasConfig.tipo || "Custom");
      setCardPreset("custom");

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

  // --- Nuevo Proyecto (Reset) ---
  const handleNuevoProyecto = () => {
    if (window.confirm("¿Seguro que deseas empezar un nuevo proyecto? Se borrarán todos los cambios no guardados.")) {
      cartas.forEach((c) => {
        URL.revokeObjectURL(c.imagenFrontal);
        if (c.imagenTrasera) URL.revokeObjectURL(c.imagenTrasera);
      });
      if (imagenTraseraComun) {
        URL.revokeObjectURL(imagenTraseraComun);
      }

      setCartas([]);
      setImagenTraseraComun(null);
      setGenerarReversos(false);
      setCanvasType("A4");
      setCanvasConfig({
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
      setCardConfig({
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
    }
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
        if (selectedCardIds.length > 0) {
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
  }, [cartas, selectedCardIds, puedeMoverArriba, puedeMoverAbajo]);

  return (
    <div className="app-layout">
      <MenuBar
        onNuevoProyecto={handleNuevoProyecto}
        onCargarProyectoClick={() => fileInputProyectoRef.current?.click()}
        onGuardarProyecto={handleGuardarProyecto}
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
      />
      <div className="app-container">
      {/* --- PANEL DE CONTROL LATERAL --- */}
      <aside className="sidebar">
        <div className="sidebar-content">
          {/* Ajustes del Lienzo (Lienzo / Canvas) */}
          <section className="config-group" ref={sectionLienzoRef}>
            <h3 className="config-group-title">Ajustes de Página</h3>
            
            <div className="input-field">
              <label>Tamaño de Hoja</label>
              <select value={canvasType} onChange={(e) => handleCanvasPresetChange(e.target.value as any)}>
                <option value="A4">DINA4 (210 x 297 mm)</option>
                <option value="A3">DINA3 (297 x 420 mm)</option>
                <option value="Custom">Personalizado</option>
              </select>
            </div>

            {canvasType === "Custom" && (
              <div className="input-row">
                <div className="input-field">
                  <label>Ancho (mm)</label>
                  <input
                    type="number"
                    value={canvasConfig.anchoMm}
                    onChange={(e) => setCanvasConfig((prev) => ({ ...prev, anchoMm: Number(e.target.value) }))}
                  />
                </div>
                <div className="input-field">
                  <label>Alto (mm)</label>
                  <input
                    type="number"
                    value={canvasConfig.altoMm}
                    onChange={(e) => setCanvasConfig((prev) => ({ ...prev, altoMm: Number(e.target.value) }))}
                  />
                </div>
              </div>
            )}

            <div className="input-field">
              <label>Orientación</label>
              <select
                value={canvasConfig.orientacion}
                onChange={(e) => handleOrientationChange(e.target.value as any)}
              >
                <option value="vertical">Vertical</option>
                <option value="horizontal">Horizontal</option>
              </select>
            </div>

            <div className="input-row">
              <div className="input-field">
                <label>Margen L/R (mm)</label>
                <input
                  type="number"
                  value={canvasConfig.margenLeftMm}
                  onChange={(e) =>
                    setCanvasConfig((prev) => ({
                      ...prev,
                      margenLeftMm: Number(e.target.value),
                      margenRightMm: Number(e.target.value),
                    }))
                  }
                />
              </div>
              <div className="input-field">
                <label>Margen T/B (mm)</label>
                <input
                  type="number"
                  value={canvasConfig.margenTopMm}
                  onChange={(e) =>
                    setCanvasConfig((prev) => ({
                      ...prev,
                      margenTopMm: Number(e.target.value),
                      margenBottomMm: Number(e.target.value),
                    }))
                  }
                />
              </div>
            </div>
          </section>

          {/* Ajustes de las Cartas */}
          <section className="config-group" ref={sectionCartaRef}>
            <h3 className="config-group-title">Dimensiones de Carta</h3>

            <div className="input-field">
              <label>Tipo de Carta</label>
              <select value={cardPreset} onChange={(e) => handleCardPresetChange(e.target.value as any)}>
                <option value="standard">Poker/Standard (63.5 x 88.9 mm)</option>
                <option value="mini">Mini Chimera (44.4 x 63.5 mm)</option>
                <option value="tarot">Tarot (70.0 x 120.0 mm)</option>
                <option value="custom">Personalizado</option>
              </select>
            </div>

            {cardPreset === "custom" && (
              <div className="input-row">
                <div className="input-field">
                  <label>Ancho (mm)</label>
                  <input
                    type="number"
                    value={cardConfig.anchoMm}
                    onChange={(e) => setCardConfig((prev) => ({ ...prev, anchoMm: Number(e.target.value) }))}
                  />
                </div>
                <div className="input-field">
                  <label>Alto (mm)</label>
                  <input
                    type="number"
                    value={cardConfig.altoMm}
                    onChange={(e) => setCardConfig((prev) => ({ ...prev, altoMm: Number(e.target.value) }))}
                  />
                </div>
              </div>
            )}

            <div className="input-row">
              <div className="input-field">
                <label>Espacio X (mm)</label>
                <input
                  type="number"
                  value={cardConfig.espaciadoXMm}
                  onChange={(e) => setCardConfig((prev) => ({ ...prev, espaciadoXMm: Number(e.target.value) }))}
                />
              </div>
              <div className="input-field">
                <label>Espacio Y (mm)</label>
                <input
                  type="number"
                  value={cardConfig.espaciadoYMm}
                  onChange={(e) => setCardConfig((prev) => ({ ...prev, espaciadoYMm: Number(e.target.value) }))}
                />
              </div>
            </div>

            <div className="input-row">
              <div className="input-field">
                <label>Sangrado (Bleed - mm)</label>
                <input
                  type="number"
                  value={cardConfig.sangradoMm}
                  onChange={(e) => setCardConfig((prev) => ({ ...prev, sangradoMm: Number(e.target.value) }))}
                />
              </div>
              <div className="input-field">
                <label>Borde Corte (mm)</label>
                <div style={{ display: "flex", gap: "6px" }}>
                  <input
                    type="number"
                    style={{ flex: 1 }}
                    value={cardConfig.bordeCorteMm}
                    onChange={(e) => setCardConfig((prev) => ({ ...prev, bordeCorteMm: Number(e.target.value) }))}
                  />
                  {cardConfig.bordeCorteMm > 0 && (
                    <input
                      type="color"
                      value={cardConfig.bordeCorteColor}
                      onChange={(e) => setCardConfig((prev) => ({ ...prev, bordeCorteColor: e.target.value }))}
                      style={{ width: "36px", height: "36px", padding: 0, border: "1px solid var(--border-color)", borderRadius: "4px", cursor: "pointer", background: "none" }}
                      title="Color del borde de corte"
                    />
                  )}
                </div>
              </div>
            </div>

            <div className="input-field" style={{ marginTop: "10px" }}>
              <label>Ajuste de Ilustración</label>
              <select
                value={cardConfig.modoAjuste || "cover"}
                onChange={(e) => setCardConfig((prev) => ({ ...prev, modoAjuste: e.target.value as any }))}
              >
                <option value="cover">Recortar para rellenar (Cover)</option>
                <option value="contain">Ajustar sin recortar (Contain)</option>
              </select>
            </div>

            {cardConfig.bordeCorteMm > 0 && (
              <label className="checkbox-field" style={{ marginTop: "8px" }}>
                <input
                  type="checkbox"
                  checked={cardConfig.reducirArteAlBorde || false}
                  onChange={(e) => setCardConfig((prev) => ({ ...prev, reducirArteAlBorde: e.target.checked }))}
                />
                <span className="checkbox-label">Ajustar imagen al borde (No solapar)</span>
              </label>
            )}
          </section>

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

          {/* Importador de Imágenes */}
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
                          Reverso: {selectedCarta.imagenTrasera ? "Individual 👤" : "Por Defecto 👥"}
                        </span>
                        
                        <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                          <label style={{ margin: 0, cursor: "pointer", fontSize: "11px", backgroundColor: "var(--bg-main)", border: "1px solid var(--border-color)", padding: "4px 12px", borderRadius: "6px", flex: 1, textAlign: "center" }}>
                            Subir Reverso
                            <input
                              type="file"
                              accept="image/*"
                              style={{ display: "none" }}
                              onChange={(e) => handleTraseraIndividualUpload(selectedCarta.id, e)}
                            />
                          </label>
                          
                          {selectedCarta.imagenTrasera && (
                            <button
                              className="btn-icon btn-danger"
                              style={{ width: "28px", height: "28px", padding: 0, margin: 0, display: "flex", alignItems: "center", justifyContent: "center", borderRadius: "6px" }}
                              onClick={() => eliminarTraseraIndividual(selectedCarta.id)}
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
                    <div style={{ borderTop: "1px solid rgba(255,255,255,0.05)", paddingTop: "12px" }}>
                      <button
                        className="btn-primary"
                        onClick={() => fileInputReversoLoteRef.current?.click()}
                      >
                        Asignar Reverso en Lote
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
                          style={{
                            left: `${slot.xMm * zoomFactor}px`,
                            top: `${slot.yMm * zoomFactor}px`,
                            width: `${slot.anchoMm * zoomFactor}px`,
                            height: `${slot.altoMm * zoomFactor}px`,
                          }}
                        >
                          {/* Renderizar Imagen con Sangrado */}
                          {(() => {
                            const borderMm = slot.bordeCorteMm;
                            const noOverlap = cardConfig.reducirArteAlBorde && borderMm > 0;
                            
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
                            style={{
                              left: `${slot.xMm * zoomFactor}px`,
                              top: `${slot.yMm * zoomFactor}px`,
                              width: `${slot.anchoMm * zoomFactor}px`,
                              height: `${slot.altoMm * zoomFactor}px`,
                            }}
                          >
                            {/* Renderizar Imagen con Sangrado */}
                            {(() => {
                              const borderMm = slot.bordeCorteMm;
                              const noOverlap = cardConfig.reducirArteAlBorde && borderMm > 0;
                              
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
      {inspectingCardId && cartas.find((c) => c.id === inspectingCardId) && (
        <DetailModal
          carta={cartas.find((c) => c.id === inspectingCardId)!}
          generarReversos={generarReversos}
          imagenTraseraComun={imagenTraseraComun}
          canvasConfig={canvasConfig}
          cardConfig={cardConfig}
          onClose={() => setInspectingCardId(null)}
        />
      )}
    </div>
    </div>
  );
}
