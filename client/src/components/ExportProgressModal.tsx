import React from "react";
import { useSafeBackdrop } from "../utils/modalUtils";
import type { ExportProgressInfo } from "../services/clientPngExportService";

interface ExportProgressModalProps {
  isOpen: boolean;
  progress: ExportProgressInfo | null;
  onCancel: () => void;
}

export const ExportProgressModal: React.FC<ExportProgressModalProps> = ({
  isOpen,
  progress,
  onCancel,
}) => {
  const backdropProps = useSafeBackdrop(onCancel);
  if (!isOpen) return null;

  const pct = Math.max(0, Math.min(100, progress?.porcentaje ?? 0));

  return (
    <div
      {...backdropProps}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 99999,
        backgroundColor: "rgba(0, 0, 0, 0.75)",
        backdropFilter: "blur(4px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center"
      }}
    >
      <div
        className="modal-container"
        style={{
          width: "440px",
          maxWidth: "92vw",
          padding: "24px",
          borderRadius: "12px",
          backgroundColor: "#1e293b",
          border: "1px solid rgba(255, 255, 255, 0.12)",
          boxShadow: "0 20px 40px rgba(0, 0, 0, 0.6)",
          color: "#f8fafc",
          display: "flex",
          flexDirection: "column",
          gap: "16px"
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <span style={{ fontSize: "24px" }}>🖼️</span>
            <div>
              <h3 style={{ margin: 0, fontSize: "16px", fontWeight: "600", color: "#f8fafc" }}>
                Exportando Imágenes PNG
              </h3>
              <span style={{ fontSize: "12px", color: "#94a3b8" }}>
                Renderizado de alta resolución (300 DPI)
              </span>
            </div>
          </div>
          <span
            style={{
              fontFamily: "monospace",
              fontSize: "16px",
              fontWeight: "bold",
              color: "#38bdf8"
            }}
          >
            {pct}%
          </span>
        </div>

        {/* Barra de progreso */}
        <div
          style={{
            width: "100%",
            height: "12px",
            backgroundColor: "#0f172a",
            borderRadius: "6px",
            overflow: "hidden",
            border: "1px solid rgba(255, 255, 255, 0.08)",
            position: "relative"
          }}
        >
          <div
            style={{
              width: `${pct}%`,
              height: "100%",
              backgroundColor: "#0ea5e9",
              background: "linear-gradient(90deg, #0284c7 0%, #38bdf8 100%)",
              transition: "width 0.2s ease-out",
              borderRadius: "6px"
            }}
          />
        </div>

        {/* Mensaje descriptivo y contador */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            fontSize: "12px",
            color: "#94a3b8"
          }}
        >
          <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "260px" }}>
            {progress?.mensaje || "Iniciando renderizado..."}
          </span>
          {progress?.totalCartas ? (
            <span style={{ fontFamily: "monospace", color: "#cbd5e1" }}>
              {progress.cartaActual} / {progress.totalCartas}
            </span>
          ) : null}
        </div>

        {/* Botón cancelar */}
        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "8px" }}>
          <button
            type="button"
            onClick={onCancel}
            style={{
              padding: "6px 16px",
              borderRadius: "6px",
              backgroundColor: "rgba(239, 68, 68, 0.15)",
              border: "1px solid rgba(239, 68, 68, 0.35)",
              color: "#f87171",
              fontSize: "13px",
              fontWeight: "500",
              cursor: "pointer",
              transition: "all 0.15s ease"
            }}
          >
            Cancelar Exportación
          </button>
        </div>
      </div>
    </div>
  );
};
