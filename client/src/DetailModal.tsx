import { useEffect } from "react";
import "./DetailModal.css";
import type { CanvasConfig, CardConfig, Carta } from "shared";

interface DetailModalProps {
  carta: Carta;
  generarReversos: boolean;
  imagenTraseraComun: string | null;
  canvasConfig: CanvasConfig;
  cardConfig: CardConfig;
  onClose: () => void;
}

export default function DetailModal({
  carta,
  generarReversos,
  imagenTraseraComun,
  canvasConfig,
  cardConfig,
  onClose,
}: DetailModalProps) {
  // Cerrar al presionar Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose]);

  // Imagen trasera a usar: individual si existe, si no, la común
  const traseraUrl = carta.imagenTrasera || imagenTraseraComun;

  return (
    <div className="detail-modal-backdrop" onClick={onClose}>
      <div className="detail-modal-container" onClick={(e) => e.stopPropagation()}>
        <header className="detail-modal-header">
          <h2>Ficha de Carta: {carta.nombre}</h2>
          <button className="detail-modal-close" onClick={onClose} title="Cerrar modal">
            ✕
          </button>
        </header>

        <div className="detail-modal-body">
          <div className="previews-container">
            <div className="preview-box">
              <span className="preview-label">Cara Frontal</span>
              <div
                className="preview-image"
                style={{
                  backgroundImage: `url(${carta.imagenFrontal})`,
                  width: `${cardConfig.anchoMm * 2.5}px`,
                  height: `${cardConfig.altoMm * 2.5}px`,
                  border: `${cardConfig.bordeCorteMm > 0 ? cardConfig.bordeCorteMm * 2.5 : 1}px solid ${cardConfig.bordeCorteColor || "#000"}`,
                }}
              />
            </div>

            {generarReversos && (
              <div className="preview-box">
                <span className="preview-label">Cara Trasera</span>
                {traseraUrl ? (
                  <div
                    className="preview-image"
                    style={{
                      backgroundImage: `url(${traseraUrl})`,
                      width: `${cardConfig.anchoMm * 2.5}px`,
                      height: `${cardConfig.altoMm * 2.5}px`,
                      border: `${cardConfig.bordeCorteMm > 0 ? cardConfig.bordeCorteMm * 2.5 : 1}px solid ${cardConfig.bordeCorteColor || "#000"}`,
                    }}
                  />
                ) : (
                  <div
                    className="preview-image placeholder-back"
                    style={{
                      width: `${cardConfig.anchoMm * 2.5}px`,
                      height: `${cardConfig.altoMm * 2.5}px`,
                    }}
                  >
                    <span>Sin reverso configurado</span>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="metadata-container">
            <h3>Ficha Técnica e Impresión</h3>
            <div className="metadata-grid">
              <div className="metadata-item">
                <span className="metadata-label">Dimensiones de Carta:</span>
                <span className="metadata-value">
                  {cardConfig.anchoMm} x {cardConfig.altoMm} mm
                </span>
              </div>
              <div className="metadata-item">
                <span className="metadata-label">Sangrado (Bleed):</span>
                <span className="metadata-value">{cardConfig.sangradoMm} mm</span>
              </div>
              <div className="metadata-item">
                <span className="metadata-label">Borde de Corte:</span>
                <span className="metadata-value">
                  {cardConfig.bordeCorteMm} mm (Color:{" "}
                  <code style={{ color: cardConfig.bordeCorteColor }}>
                    {cardConfig.bordeCorteColor}
                  </code>
                  )
                </span>
              </div>
              <div className="metadata-item">
                <span className="metadata-label">Ajuste de Ilustración:</span>
                <span className="metadata-value" style={{ textTransform: "capitalize" }}>
                  {cardConfig.modoAjuste}
                </span>
              </div>
              <div className="metadata-item">
                <span className="metadata-label">Tamaño de Hoja de Impresión:</span>
                <span className="metadata-value">
                  {canvasConfig.tipo === "Custom"
                    ? `${canvasConfig.anchoMm} x ${canvasConfig.altoMm} mm (Personalizado)`
                    : `${canvasConfig.tipo} (${canvasConfig.anchoMm} x ${canvasConfig.altoMm} mm)`}
                </span>
              </div>
              <div className="metadata-item">
                <span className="metadata-label">Cantidad en Baraja:</span>
                <span className="metadata-value highlight">{carta.cantidad} copias</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
