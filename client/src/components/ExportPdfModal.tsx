import React, { useState, useMemo } from "react";
import { parseCustomPageRanges, getAnversosPageRanges, getReversosPageRanges } from "../utils/pdfExportUtils";
import "./ExportPdfModal.css";

export type PdfExportScopeType = "todas" | "anversos" | "reversos" | "seleccion" | "personalizado";

export interface PdfExportOptions {
  scopeType: PdfExportScopeType;
  customRangeText?: string;
  pageRangesResolved?: string;
  selectedCardIds?: string[];
  paginasSeleccionadas?: number[];
}

export interface ExportPdfModalProps {
  documentoNombre: string;
  totalCartas: number;
  totalPaginasEstimadas: number;
  tieneReversos: boolean;
  selectedCardIds: string[];
  cartasPorPagina?: number;
  isExporting: boolean;
  onExport: (options: PdfExportOptions) => Promise<void>;
  onClose: () => void;
}

export const ExportPdfModal: React.FC<ExportPdfModalProps> = ({
  documentoNombre,
  totalCartas,
  totalPaginasEstimadas,
  tieneReversos,
  selectedCardIds,
  cartasPorPagina = 9,
  isExporting,
  onExport,
  onClose,
}) => {
  const [scopeType, setScopeType] = useState<PdfExportScopeType>("todas");
  const [customRangeText, setCustomRangeText] = useState<string>("");

  const hasSelection = selectedCardIds.length > 0;
  const canUseReversos = tieneReversos && totalPaginasEstimadas >= 2;

  // Cálculo de páginas estimadas para selección de cartas
  const seleccionInfo = useMemo(() => {
    if (!hasSelection) return { hojas: 0, paginas: 0 };
    const numHojas = Math.max(1, Math.ceil(selectedCardIds.length / Math.max(1, cartasPorPagina)));
    const numPaginas = tieneReversos ? numHojas * 2 : numHojas;
    return { hojas: numHojas, paginas: numPaginas };
  }, [hasSelection, selectedCardIds.length, cartasPorPagina, tieneReversos]);

  // Validación y resolución dinámica del rango personalizado
  const customRangeValidation = useMemo(() => {
    if (scopeType !== "personalizado") return null;
    return parseCustomPageRanges(customRangeText, totalPaginasEstimadas);
  }, [scopeType, customRangeText, totalPaginasEstimadas]);

  // Resumen del alcance seleccionado
  const summary = useMemo(() => {
    if (scopeType === "todas") {
      return {
        valido: true,
        texto: `Se exportarán todas las páginas (${totalPaginasEstimadas} páginas en total).`,
        pageRanges: undefined,
        paginas: Array.from({ length: totalPaginasEstimadas }, (_, i) => i + 1),
      };
    }

    if (scopeType === "anversos") {
      const res = getAnversosPageRanges(totalPaginasEstimadas);
      return {
        valido: true,
        texto: `Se exportarán únicamente los anversos (${res.pages.length} páginas: ${res.pages.join(", ")}).`,
        pageRanges: res.pageRangesString,
        paginas: res.pages,
      };
    }

    if (scopeType === "reversos") {
      if (!canUseReversos) {
        return {
          valido: false,
          texto: "El documento actual no tiene caras traseras activas para exportar.",
          pageRanges: undefined,
          paginas: [],
        };
      }
      const res = getReversosPageRanges(totalPaginasEstimadas);
      return {
        valido: true,
        texto: `Se exportarán únicamente los reversos (${res.pages.length} páginas: ${res.pages.join(", ")}).`,
        pageRanges: res.pageRangesString,
        paginas: res.pages,
      };
    }

    if (scopeType === "seleccion") {
      if (!hasSelection) {
        return {
          valido: false,
          texto: "No hay ninguna carta seleccionada en la mesa de trabajo.",
          pageRanges: undefined,
          paginas: [],
        };
      }
      return {
        valido: true,
        texto: `Se compactarán ${selectedCardIds.length} cartas seleccionadas en ${seleccionInfo.hojas} pliego(s) contiguo(s) (${seleccionInfo.paginas} páginas ${tieneReversos ? "con reverso" : "solo anverso"}).`,
        pageRanges: undefined,
        paginas: Array.from({ length: seleccionInfo.paginas }, (_, i) => i + 1),
      };
    }

    if (scopeType === "personalizado") {
      if (!customRangeValidation) {
        return { valido: false, texto: "", pageRanges: undefined, paginas: [] };
      }
      if (!customRangeValidation.valid) {
        return {
          valido: false,
          texto: customRangeValidation.error || "Rango no válido.",
          pageRanges: undefined,
          paginas: [],
        };
      }
      return {
        valido: true,
        texto: `Se exportarán ${customRangeValidation.pages.length} páginas seleccionadas (${customRangeValidation.pages.join(", ")}).`,
        pageRanges: customRangeValidation.pageRangesString,
        paginas: customRangeValidation.pages,
      };
    }

    return { valido: false, texto: "", pageRanges: undefined, paginas: [] };
  }, [scopeType, totalPaginasEstimadas, canUseReversos, hasSelection, selectedCardIds.length, seleccionInfo, tieneReversos, customRangeValidation]);

  const canSubmit = summary.valido && !isExporting;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;

    onExport({
      scopeType,
      customRangeText: scopeType === "personalizado" ? customRangeText : undefined,
      pageRangesResolved: summary.pageRanges,
      selectedCardIds: scopeType === "seleccion" ? selectedCardIds : undefined,
      paginasSeleccionadas: summary.paginas,
    });
  };

  return (
    <div className="export-pdf-modal-backdrop" onClick={onClose}>
      <div className="export-pdf-modal-container" onClick={(e) => e.stopPropagation()}>
        <header className="export-pdf-modal-header">
          <h3 className="export-pdf-modal-title">
            <span>📥</span> Opciones de Exportación PDF
          </h3>
          <button
            type="button"
            className="export-pdf-modal-close-btn"
            onClick={onClose}
            disabled={isExporting}
            aria-label="Cerrar modal"
          >
            ✕
          </button>
        </header>

        <form onSubmit={handleSubmit}>
          <div className="export-pdf-modal-body">
            {/* Cabecera informativa del documento */}
            <div className="export-pdf-doc-badge">
              <div>
                <span>Documento: </span>
                <span className="export-pdf-doc-name">{documentoNombre}</span>
              </div>
              <span style={{ color: "var(--text-secondary)" }}>
                {totalCartas} carta(s) · {totalPaginasEstimadas} página(s) total
              </span>
            </div>

            {/* Listado de opciones de alcance */}
            <div className="export-pdf-options-list" role="radiogroup" aria-label="Alcance de páginas a exportar">
              {/* 1. Todas las páginas */}
              <label className={`export-pdf-option-label ${scopeType === "todas" ? "active" : ""}`}>
                <div className="export-pdf-option-row">
                  <input
                    type="radio"
                    name="pdf-scope"
                    value="todas"
                    className="export-pdf-radio"
                    checked={scopeType === "todas"}
                    onChange={() => setScopeType("todas")}
                    disabled={isExporting}
                  />
                  <span className="export-pdf-option-title">Todas las páginas</span>
                  <span className="export-pdf-option-badge">{totalPaginasEstimadas} pág.</span>
                </div>
              </label>

              {/* 2. Solo anversos */}
              <label className={`export-pdf-option-label ${scopeType === "anversos" ? "active" : ""}`}>
                <div className="export-pdf-option-row">
                  <input
                    type="radio"
                    name="pdf-scope"
                    value="anversos"
                    className="export-pdf-radio"
                    checked={scopeType === "anversos"}
                    onChange={() => setScopeType("anversos")}
                    disabled={isExporting}
                  />
                  <span className="export-pdf-option-title">Solo anversos (caras frontales)</span>
                  <span className="export-pdf-option-badge">
                    {Math.ceil(totalPaginasEstimadas / 2)} pág.
                  </span>
                </div>
              </label>

              {/* 3. Solo reversos */}
              <label
                className={`export-pdf-option-label ${scopeType === "reversos" ? "active" : ""} ${
                  !canUseReversos ? "disabled" : ""
                }`}
                title={!canUseReversos ? "El documento no tiene activadas caras traseras" : undefined}
              >
                <div className="export-pdf-option-row">
                  <input
                    type="radio"
                    name="pdf-scope"
                    value="reversos"
                    className="export-pdf-radio"
                    checked={scopeType === "reversos"}
                    onChange={() => setScopeType("reversos")}
                    disabled={!canUseReversos || isExporting}
                  />
                  <span className="export-pdf-option-title">Solo reversos (caras traseras)</span>
                  <span className="export-pdf-option-badge">
                    {canUseReversos ? `${Math.floor(totalPaginasEstimadas / 2)} pág.` : "No disponible"}
                  </span>
                </div>
              </label>

              {/* 4. Cartas seleccionadas */}
              <label
                className={`export-pdf-option-label ${scopeType === "seleccion" ? "active" : ""} ${
                  !hasSelection ? "disabled" : ""
                }`}
                title={!hasSelection ? "No hay cartas seleccionadas en el lienzo" : undefined}
              >
                <div className="export-pdf-option-row">
                  <input
                    type="radio"
                    name="pdf-scope"
                    value="seleccion"
                    className="export-pdf-radio"
                    checked={scopeType === "seleccion"}
                    onChange={() => setScopeType("seleccion")}
                    disabled={!hasSelection || isExporting}
                  />
                  <span className="export-pdf-option-title">Cartas seleccionadas</span>
                  <span className="export-pdf-option-badge">
                    {hasSelection ? `${selectedCardIds.length} carta(s)` : "Sin selección"}
                  </span>
                </div>
              </label>

              {/* 5. Personalizado */}
              <label className={`export-pdf-option-label ${scopeType === "personalizado" ? "active" : ""}`}>
                <div className="export-pdf-option-row">
                  <input
                    type="radio"
                    name="pdf-scope"
                    value="personalizado"
                    className="export-pdf-radio"
                    checked={scopeType === "personalizado"}
                    onChange={() => setScopeType("personalizado")}
                    disabled={isExporting}
                  />
                  <span className="export-pdf-option-title">Personalizado (Páginas físicas del PDF)</span>
                </div>

                {scopeType === "personalizado" && (
                  <div className="export-pdf-custom-input-box" onClick={(e) => e.stopPropagation()}>
                    <input
                      type="text"
                      className={`export-pdf-custom-input ${
                        customRangeValidation && !customRangeValidation.valid ? "invalid" : ""
                      }`}
                      placeholder={`ej. 1, 3, 5-${totalPaginasEstimadas}`}
                      value={customRangeText}
                      onChange={(e) => setCustomRangeText(e.target.value)}
                      disabled={isExporting}
                      autoFocus
                    />
                    <div
                      className={`export-pdf-validation-msg ${
                        customRangeValidation && !customRangeValidation.valid ? "error" : "info"
                      }`}
                    >
                      {customRangeValidation && !customRangeValidation.valid
                        ? customRangeValidation.error
                        : `Rango válido: de 1 a ${totalPaginasEstimadas}. Usa comas y guiones.`}
                    </div>
                  </div>
                )}
              </label>
            </div>

            {/* Caja de resumen dinámico */}
            <div className="export-pdf-summary-box">
              <div className="export-pdf-summary-title">
                <span>📋</span> Resumen de exportación
              </div>
              <div className="export-pdf-summary-detail">{summary.texto}</div>
            </div>
          </div>

          <footer className="export-pdf-modal-footer">
            <button
              type="button"
              className="export-pdf-btn-cancel"
              onClick={onClose}
              disabled={isExporting}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="export-pdf-btn-submit"
              disabled={!canSubmit}
            >
              {isExporting ? (
                <>
                  <span>⏳</span> Generando PDF...
                </>
              ) : (
                <>
                  <span>📥</span> Exportar PDF
                </>
              )}
            </button>
          </footer>
        </form>
      </div>
    </div>
  );
};
