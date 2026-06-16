import React, { useState, useMemo } from "react";
import { calcularDistribucion } from "./core/layoutEngine";
import type { CanvasConfig, CardConfig, Carta } from "./core/layoutEngine";
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
    sangradoMm: 2,
    bordeCorteMm: 0,
    bordeCorteColor: "#000000",
  });

  const [generarReversos, setGenerarReversos] = useState<boolean>(false);
  const [imagenTraseraComun, setImagenTraseraComun] = useState<string | null>(null);
  const [cartas, setCartas] = useState<Carta[]>([]);
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

  const handleTraseraComunUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setImagenTraseraComun(URL.createObjectURL(e.target.files[0]));
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
    setCartas((prev) => prev.filter((c) => c.id !== id));
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

  return (
    <div className="app-container">
      {/* --- PANEL DE CONTROL LATERAL --- */}
      <aside className="sidebar">
        <header className="sidebar-header">
          <h1>Card Deck Crafter v2</h1>
          <p>Motor de Maquetación y Lienzo Dinámico</p>
        </header>

        <div className="sidebar-content">
          {/* Ajustes del Lienzo (Lienzo / Canvas) */}
          <section className="config-group">
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
          <section className="config-group">
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
                <input
                  type="number"
                  value={cardConfig.bordeCorteMm}
                  onChange={(e) => setCardConfig((prev) => ({ ...prev, bordeCorteMm: Number(e.target.value) }))}
                />
              </div>
            </div>
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
              <div className="input-field" style={{ marginTop: "8px" }}>
                <label>Trasera Común (Por Defecto)</label>
                <input type="file" accept="image/*" onChange={handleTraseraComunUpload} />
                {imagenTraseraComun && (
                  <div style={{ display: "flex", alignItems: "center", gap: "10px", marginTop: "8px" }}>
                    <div className="card-thumb" style={{ backgroundImage: `url(${imagenTraseraComun})`, width: "32px", height: "42px", margin: 0 }} />
                    <span style={{ fontSize: "11px", color: "var(--text-secondary)" }}>Imagen común cargada</span>
                  </div>
                )}
              </div>
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
              <input type="file" multiple accept="image/*" onChange={handleImageImport} style={{ display: "none" }} />
            </label>

            {generarReversos && cartas.length > 0 && (
              <div style={{ marginTop: "10px" }}>
                <label className="btn-primary" style={{ display: "block", cursor: "pointer", fontSize: "12px", padding: "8px", textTransform: "none", letterSpacing: 0, boxShadow: "none" }}>
                  🔄 Importar Traseras en Bloque
                  <input type="file" multiple accept="image/*" onChange={handleTraseraImportBloque} style={{ display: "none" }} />
                </label>
              </div>
            )}

            {cartas.length > 0 && (
              <div className="card-list">
                {cartas.map((carta) => (
                  <div key={carta.id} className="card-item">
                    <div className="card-thumb" style={{ backgroundImage: `url(${carta.imagenFrontal})` }} />
                    <div className="card-info">
                      <div className="card-name">{carta.nombre}</div>
                      
                      {generarReversos && (
                        <div style={{ marginTop: "4px", borderTop: "1px solid rgba(255,255,255,0.05)", paddingTop: "4px" }}>
                          <span style={{ fontSize: "10px", color: "var(--text-secondary)", display: "block", marginBottom: "2px" }}>
                            Reverso: {carta.imagenTrasera ? "Individual 👤" : "Por Defecto 👥"}
                          </span>
                          
                          <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
                            <label style={{ margin: 0, cursor: "pointer", fontSize: "9px", backgroundColor: "var(--bg-main)", border: "1px solid var(--border-color)", padding: "2px 6px", borderRadius: "3px" }}>
                              Subir
                              <input
                                type="file"
                                accept="image/*"
                                style={{ display: "none" }}
                                onChange={(e) => handleTraseraIndividualUpload(carta.id, e)}
                              />
                            </label>
                            
                            {carta.imagenTrasera && (
                              <button
                                className="btn-icon btn-danger"
                                style={{ width: "16px", height: "16px", fontSize: "9px" }}
                                onClick={() => eliminarTraseraIndividual(carta.id)}
                                title="Volver a reverso común"
                              >
                                ✕
                              </button>
                            )}
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="card-controls">
                      <button className="btn-icon" onClick={() => modificarCantidad(carta.id, -1)}>-</button>
                      <span className="quantity-badge">{carta.cantidad}</span>
                      <button className="btn-icon" onClick={() => modificarCantidad(carta.id, 1)}>+</button>
                      <button className="btn-icon btn-danger" onClick={() => eliminarCarta(carta.id)}>✕</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </aside>

      {/* --- VISOR DEL WORKSPACE (LIENZO) --- */}
      <main className="workspace">
        {/* Barra de Herramientas de Visualización */}
        <div className="workspace-toolbar">
          <div className="toolbar-info">
            Hojas: {paginasFrontales.length} {generarReversos ? `(Frontal) + ${paginasTraseras.length} (Reverso)` : ""}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
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
                          className="card-slot"
                          style={{
                            left: `${slot.xMm * zoomFactor}px`,
                            top: `${slot.yMm * zoomFactor}px`,
                            width: `${slot.anchoMm * zoomFactor}px`,
                            height: `${slot.altoMm * zoomFactor}px`,
                          }}
                        >
                          {/* Renderizar Imagen con Sangrado */}
                          <div
                            className="card-image-render"
                            style={{
                              left: `${-slot.sangradoMm * zoomFactor}px`,
                              top: `${-slot.sangradoMm * zoomFactor}px`,
                              width: `${(slot.anchoMm + 2 * slot.sangradoMm) * zoomFactor}px`,
                              height: `${(slot.altoMm + 2 * slot.sangradoMm) * zoomFactor}px`,
                              backgroundImage: slot.imagenSrc ? `url(${slot.imagenSrc})` : "none",
                            }}
                          >
                            {!slot.imagenSrc && "Ilustración"}
                          </div>

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
                            className="card-slot"
                            style={{
                              left: `${slot.xMm * zoomFactor}px`,
                              top: `${slot.yMm * zoomFactor}px`,
                              width: `${slot.anchoMm * zoomFactor}px`,
                              height: `${slot.altoMm * zoomFactor}px`,
                            }}
                          >
                            {/* Renderizar Imagen con Sangrado */}
                            <div
                              className="card-image-render"
                              style={{
                                left: `${-slot.sangradoMm * zoomFactor}px`,
                                top: `${-slot.sangradoMm * zoomFactor}px`,
                                width: `${(slot.anchoMm + 2 * slot.sangradoMm) * zoomFactor}px`,
                                height: `${(slot.altoMm + 2 * slot.sangradoMm) * zoomFactor}px`,
                                backgroundImage: slot.imagenSrc ? `url(${slot.imagenSrc})` : "none",
                              }}
                            >
                              {!slot.imagenSrc && "Reverso"}
                            </div>

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
    </div>
  );
}
