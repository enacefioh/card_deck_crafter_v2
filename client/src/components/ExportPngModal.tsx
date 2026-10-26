import React, { useState, useMemo } from "react";
import type { DocumentoCDC2 } from "shared";
import { parseCustomCardRanges } from "../utils/pngExportUtils";
import "./ExportPngModal.css";

export type PngDocScope = "documento_activo" | "todos_documentos";
export type PngCardScope = "todas" | "seleccion" | "personalizado";
export type PngFacesScope = "ambas" | "anversos" | "reversos";

export interface PngExportOptions {
  docScope: PngDocScope;
  cardScope: PngCardScope;
  facesScope: PngFacesScope;
  customCardRangeText?: string;
  selectedCardIndices?: number[];
  selectedCardIds?: string[];
}

export interface ExportPngModalProps {
  documentos: DocumentoCDC2[];
  activeDocumentoId: string;
  selectedCardIds: string[];
  isExporting: boolean;
  onExport: (options: PngExportOptions) => void;
  onClose: () => void;
}

export const ExportPngModal: React.FC<ExportPngModalProps> = ({
  documentos,
  activeDocumentoId,
  selectedCardIds,
  isExporting,
  onExport,
  onClose,
}) => {
  const [docScope, setDocScope] = useState<PngDocScope>("documento_activo");
  const [cardScope, setCardScope] = useState<PngCardScope>("todas");
  const [facesScope, setFacesScope] = useState<PngFacesScope>("ambas");
  const [customCardRangeText, setCustomCardRangeText] = useState<string>("");

  const activeDoc = useMemo(() => {
    return documentos.find((d) => d.id === activeDocumentoId) || documentos[0];
  }, [documentos, activeDocumentoId]);

  const totalCartasActivo = activeDoc?.cards?.length || 0;
  const totalCartasProyecto = useMemo(() => {
    return documentos.reduce((acc, d) => acc + (d.cards?.length || 0), 0);
  }, [documentos]);

  const tieneReversosActivo = activeDoc?.modoTraseras === "comun" || activeDoc?.modoTraseras === "individual";
  const tieneReversosProyecto = useMemo(() => {
    return documentos.some((d) => d.modoTraseras === "comun" || d.modoTraseras === "individual");
  }, [documentos]);

  const hasSelection = selectedCardIds.length > 0;

  // Validación de rango personalizado de cartas
  const customRangeValidation = useMemo(() => {
    if (docScope !== "documento_activo" || cardScope !== "personalizado") return null;
    return parseCustomCardRanges(customCardRangeText, totalCartasActivo);
  }, [docScope, cardScope, customCardRangeText, totalCartasActivo]);

  // Si se cambia a todos_documentos o el documento no tiene reversos, ajustar facesScope
  const canUseReversos = docScope === "documento_activo" ? tieneReversosActivo : tieneReversosProyecto;

  // Resumen dinámico del resultado esperado
  const summary = useMemo(() => {
    let cartasContadas = 0;
    let descripcionCartas = "";
    let esValido = true;
    let errorMsg = "";

    if (docScope === "todos_documentos") {
      cartasContadas = totalCartasProyecto;
      descripcionCartas = `${cartasContadas} cartas en ${documentos.length} documento(s)`;
    } else {
      if (cardScope === "todas") {
        cartasContadas = totalCartasActivo;
        descripcionCartas = `todas las ${totalCartasActivo} cartas de "${activeDoc?.nombre}"`;
      } else if (cardScope === "seleccion") {
        if (!hasSelection) {
          esValido = false;
          errorMsg = "No hay ninguna carta seleccionada en la mesa de trabajo.";
        }
        cartasContadas = selectedCardIds.length;
        descripcionCartas = `${selectedCardIds.length} carta(s) seleccionada(s) de "${activeDoc?.nombre}"`;
      } else if (cardScope === "personalizado") {
        if (!customRangeValidation) {
          esValido = false;
        } else if (!customRangeValidation.valid) {
          esValido = false;
          errorMsg = customRangeValidation.error || "Rango de cartas no válido.";
        } else {
          cartasContadas = customRangeValidation.cardIndices.length;
          descripcionCartas = `${cartasContadas} cartas (${customRangeValidation.cardRangesString}) de "${activeDoc?.nombre}"`;
        }
      }
    }

    if (!esValido) {
      return { valido: false, texto: errorMsg, totalArchivos: 0 };
    }

    if (cartasContadas === 0) {
      return { valido: false, texto: "No se seleccionó ninguna carta para exportar.", totalArchivos: 0 };
    }

    let multiplicadorCaras = 1;
    let textoCaras = "solo anversos";
    if (facesScope === "ambas") {
      multiplicadorCaras = canUseReversos ? 2 : 1;
      textoCaras = canUseReversos ? "anverso y reverso" : "solo anverso (no hay reversos activos)";
    } else if (facesScope === "reversos") {
      multiplicadorCaras = 1;
      textoCaras = "solo reversos";
    }

    const totalArchivosEstimados = cartasContadas * multiplicadorCaras;

    return {
      valido: true,
      texto: `Se generarán ${totalArchivosEstimados} imágenes PNG a 300 DPI (${descripcionCartas}, ${textoCaras}) empaquetadas en un archivo .zip.`,
      totalArchivos: totalArchivosEstimados,
    };
  }, [
    docScope,
    cardScope,
    facesScope,
    totalCartasProyecto,
    totalCartasActivo,
    documentos.length,
    activeDoc?.nombre,
    hasSelection,
    selectedCardIds.length,
    customRangeValidation,
    canUseReversos,
  ]);

  const canSubmit = summary.valido && !isExporting;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;

    onExport({
      docScope,
      cardScope: docScope === "documento_activo" ? cardScope : "todas",
      facesScope,
      customCardRangeText: cardScope === "personalizado" ? customCardRangeText : undefined,
      selectedCardIndices: customRangeValidation?.valid ? customRangeValidation.cardIndices : undefined,
      selectedCardIds: cardScope === "seleccion" ? selectedCardIds : undefined,
    });
  };

  return (
    <div className="export-png-modal-backdrop" onClick={onClose}>
      <div className="export-png-modal-container" onClick={(e) => e.stopPropagation()}>
        <header className="export-png-modal-header">
          <h3 className="export-png-modal-title">
            <span>🖼️</span> Opciones de Exportación PNG
          </h3>
          <button
            type="button"
            className="export-png-modal-close-btn"
            onClick={onClose}
            disabled={isExporting}
            aria-label="Cerrar modal"
          >
            ✕
          </button>
        </header>

        <form onSubmit={handleSubmit}>
          <div className="export-png-modal-body">
            {/* Nivel 1: Selector de Alcance de Documentos */}
            <div className="export-png-section">
              <div className="export-png-section-title">Alcance de Documentos</div>
              <div className="export-png-segmented-row" role="radiogroup" aria-label="Alcance de Documentos">
                <label
                  className={`export-png-segmented-item ${docScope === "documento_activo" ? "active" : ""}`}
                >
                  <input
                    type="radio"
                    name="png-doc-scope"
                    value="documento_activo"
                    checked={docScope === "documento_activo"}
                    onChange={() => setDocScope("documento_activo")}
                    disabled={isExporting}
                  />
                  <span>📄 Solo "{activeDoc?.nombre || "Documento Actual"}"</span>
                </label>
                <label
                  className={`export-png-segmented-item ${docScope === "todos_documentos" ? "active" : ""}`}
                >
                  <input
                    type="radio"
                    name="png-doc-scope"
                    value="todos_documentos"
                    checked={docScope === "todos_documentos"}
                    onChange={() => setDocScope("todos_documentos")}
                    disabled={isExporting}
                  />
                  <span>📚 Todos los Documentos ({documentos.length})</span>
                </label>
              </div>
            </div>

            {/* Nivel 2: Selector de Cartas (Solo si documento_activo) */}
            {docScope === "documento_activo" && (
              <div className="export-png-section">
                <div className="export-png-section-title">Cartas a Incluir</div>
                <div className="export-png-options-list" role="radiogroup" aria-label="Cartas a Incluir">
                  {/* Todas las cartas */}
                  <label className={`export-png-option-label ${cardScope === "todas" ? "active" : ""}`}>
                    <div className="export-png-option-row">
                      <input
                        type="radio"
                        name="png-card-scope"
                        value="todas"
                        className="export-png-radio"
                        checked={cardScope === "todas"}
                        onChange={() => setCardScope("todas")}
                        disabled={isExporting}
                      />
                      <span className="export-png-option-title">Todas las cartas del documento</span>
                      <span className="export-png-option-badge">{totalCartasActivo} cartas</span>
                    </div>
                  </label>

                  {/* Cartas seleccionadas */}
                  <label
                    className={`export-png-option-label ${cardScope === "seleccion" ? "active" : ""} ${
                      !hasSelection ? "disabled" : ""
                    }`}
                    title={!hasSelection ? "No hay cartas seleccionadas en el lienzo" : undefined}
                  >
                    <div className="export-png-option-row">
                      <input
                        type="radio"
                        name="png-card-scope"
                        value="seleccion"
                        className="export-png-radio"
                        checked={cardScope === "seleccion"}
                        onChange={() => setCardScope("seleccion")}
                        disabled={!hasSelection || isExporting}
                      />
                      <span className="export-png-option-title">Cartas seleccionadas en la mesa</span>
                      <span className="export-png-option-badge">
                        {hasSelection ? `${selectedCardIds.length} carta(s)` : "Sin selección"}
                      </span>
                    </div>
                  </label>

                  {/* Rango personalizado */}
                  <label
                    className={`export-png-option-label ${cardScope === "personalizado" ? "active" : ""}`}
                  >
                    <div className="export-png-option-row">
                      <input
                        type="radio"
                        name="png-card-scope"
                        value="personalizado"
                        className="export-png-radio"
                        checked={cardScope === "personalizado"}
                        onChange={() => setCardScope("personalizado")}
                        disabled={isExporting}
                      />
                      <span className="export-png-option-title">Rango personalizado (Índices 1 a N)</span>
                    </div>

                    {cardScope === "personalizado" && (
                      <div className="export-png-custom-input-box" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="text"
                          className={`export-png-custom-input ${
                            customRangeValidation && !customRangeValidation.valid ? "invalid" : ""
                          }`}
                          placeholder={`ej. 1-5, 8, 10-${totalCartasActivo}`}
                          value={customCardRangeText}
                          onChange={(e) => setCustomCardRangeText(e.target.value)}
                          disabled={isExporting}
                          autoFocus
                        />
                        <div
                          className={`export-png-validation-msg ${
                            customRangeValidation && !customRangeValidation.valid ? "error" : "info"
                          }`}
                        >
                          {customRangeValidation && !customRangeValidation.valid
                            ? customRangeValidation.error
                            : `Rango válido: de 1 a ${totalCartasActivo}. Usa comas y guiones.`}
                        </div>
                      </div>
                    )}
                  </label>
                </div>
              </div>
            )}

            {/* Filtro de Caras */}
            <div className="export-png-section">
              <div className="export-png-section-title">Caras a Renderizar</div>
              <div className="export-png-segmented-row" role="radiogroup" aria-label="Caras a Renderizar">
                <label className={`export-png-segmented-item ${facesScope === "ambas" ? "active" : ""}`}>
                  <input
                    type="radio"
                    name="png-faces-scope"
                    value="ambas"
                    checked={facesScope === "ambas"}
                    onChange={() => setFacesScope("ambas")}
                    disabled={isExporting}
                  />
                  <span>🔄 Ambas Caras</span>
                </label>
                <label className={`export-png-segmented-item ${facesScope === "anversos" ? "active" : ""}`}>
                  <input
                    type="radio"
                    name="png-faces-scope"
                    value="anversos"
                    checked={facesScope === "anversos"}
                    onChange={() => setFacesScope("anversos")}
                    disabled={isExporting}
                  />
                  <span>🃏 Solo Anversos</span>
                </label>
                <label
                  className={`export-png-segmented-item ${facesScope === "reversos" ? "active" : ""} ${
                    !canUseReversos ? "disabled" : ""
                  }`}
                  title={!canUseReversos ? "El documento no tiene reversos configurados" : undefined}
                >
                  <input
                    type="radio"
                    name="png-faces-scope"
                    value="reversos"
                    checked={facesScope === "reversos"}
                    onChange={() => setFacesScope("reversos")}
                    disabled={!canUseReversos || isExporting}
                  />
                  <span>🔙 Solo Reversos</span>
                </label>
              </div>
            </div>

            {/* Caja de Resumen Dinámico */}
            <div className="export-png-summary-box">
              <div className="export-png-summary-title">
                <span>📋</span> Resumen de exportación
              </div>
              <div className="export-png-summary-detail">{summary.texto}</div>
            </div>
          </div>

          <footer className="export-png-modal-footer">
            <button
              type="button"
              className="export-png-btn-cancel"
              onClick={onClose}
              disabled={isExporting}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="export-png-btn-submit"
              disabled={!canSubmit}
            >
              <span>📥</span> Exportar PNGs (.zip)
            </button>
          </footer>
        </form>
      </div>
    </div>
  );
};
