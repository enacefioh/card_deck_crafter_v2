import React, { useState, useEffect } from "react";
import type { UserStorageInfo } from "shared";

interface SaveCloudModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialName: string;
  cardCount: number;
  documentCount: number;
  storageInfo: UserStorageInfo | null;
  isSaving: boolean;
  estimatedSizeBytes?: number;
  onConfirmSave: (params: { name: string; description: string }) => Promise<void>;
  onExportLocal: () => void;
}

export const SaveCloudModal: React.FC<SaveCloudModalProps> = ({
  isOpen,
  onClose,
  initialName,
  cardCount,
  documentCount,
  storageInfo,
  isSaving,
  estimatedSizeBytes,
  onConfirmSave,
  onExportLocal
}) => {
  const [name, setName] = useState(initialName || "Proyecto CDC2");
  const [description, setDescription] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setName(initialName || "Proyecto CDC2");
      setDescription("");
      setErrorMessage(null);
    }
  }, [isOpen, initialName]);

  if (!isOpen) return null;

  const estimatedMb = estimatedSizeBytes ? (estimatedSizeBytes / (1024 * 1024)).toFixed(2) : "0.50";
  const hasInsufficientSpace =
    storageInfo && estimatedSizeBytes && estimatedSizeBytes > storageInfo.availableBytes;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setErrorMessage("Por favor introduce un nombre para el proyecto.");
      return;
    }
    setErrorMessage(null);
    try {
      await onConfirmSave({ name: name.trim(), description: description.trim() });
    } catch (err: any) {
      setErrorMessage(err.message || "Error al guardar el proyecto en la nube.");
    }
  };

  const percent = storageInfo ? storageInfo.percentUsed : 0;
  const barColor = percent >= 95 ? "#ef4444" : percent >= 80 ? "#f59e0b" : "#38bdf8";

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(0, 0, 0, 0.7)",
        backdropFilter: "blur(4px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 9999
      }}
      onClick={() => !isSaving && onClose()}
    >
      <div
        style={{
          backgroundColor: "#1e1e24",
          border: "1px solid #333340",
          borderRadius: "12px",
          padding: "24px 28px",
          width: "100%",
          maxWidth: "480px",
          boxShadow: "0 20px 40px rgba(0, 0, 0, 0.6)",
          color: "#e2e8f0"
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "16px" }}>
          <span style={{ fontSize: "28px" }}>☁️</span>
          <div>
            <h3 style={{ margin: 0, fontSize: "18px", color: "#fff" }}>Guardar Proyecto en la Nube</h3>
            <span style={{ fontSize: "12px", color: "#94a3b8" }}>
              Guarda tus barajas de forma privada para acceder desde cualquier equipo
            </span>
          </div>
        </div>

        {errorMessage && (
          <div
            style={{
              padding: "10px 14px",
              backgroundColor: "rgba(239, 68, 68, 0.15)",
              border: "1px solid rgba(239, 68, 68, 0.3)",
              borderRadius: "6px",
              color: "#f87171",
              fontSize: "13px",
              marginBottom: "16px"
            }}
          >
            {errorMessage}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {/* Nombre del proyecto */}
          <div style={{ marginBottom: "14px" }}>
            <label style={{ display: "block", fontSize: "13px", fontWeight: "600", marginBottom: "6px" }}>
              Nombre del Proyecto *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={isSaving}
              required
              placeholder="Ej. Cartas de Hechizos v1"
              style={{
                width: "100%",
                padding: "9px 12px",
                borderRadius: "6px",
                border: "1px solid #3f3f4e",
                backgroundColor: "#141418",
                color: "#fff",
                fontSize: "14px",
                boxSizing: "border-box"
              }}
            />
          </div>

          {/* Descripción corta opcional */}
          <div style={{ marginBottom: "16px" }}>
            <label style={{ display: "block", fontSize: "13px", fontWeight: "600", marginBottom: "6px" }}>
              Descripción corta <span style={{ fontSize: "11px", color: "#94a3b8", fontWeight: "normal" }}>(opcional)</span>
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={isSaving}
              rows={2}
              placeholder="Breves notas sobre esta baraja o cambios..."
              style={{
                width: "100%",
                padding: "8px 12px",
                borderRadius: "6px",
                border: "1px solid #3f3f4e",
                backgroundColor: "#141418",
                color: "#fff",
                fontSize: "13px",
                resize: "none",
                boxSizing: "border-box"
              }}
            />
          </div>

          {/* Resumen de contenido */}
          <div
            style={{
              display: "flex",
              gap: "8px",
              marginBottom: "16px",
              flexWrap: "wrap"
            }}
          >
            <span
              style={{
                padding: "4px 10px",
                backgroundColor: "#272733",
                borderRadius: "4px",
                fontSize: "12px",
                color: "#cbd5e1"
              }}
            >
              🃏 {cardCount} cartas
            </span>
            <span
              style={{
                padding: "4px 10px",
                backgroundColor: "#272733",
                borderRadius: "4px",
                fontSize: "12px",
                color: "#cbd5e1"
              }}
            >
              📄 {documentCount} {documentCount === 1 ? "página" : "páginas"}
            </span>
            <span
              style={{
                padding: "4px 10px",
                backgroundColor: "#272733",
                borderRadius: "4px",
                fontSize: "12px",
                color: "#38bdf8"
              }}
            >
              💾 ~{estimatedMb} MB
            </span>
          </div>

          {/* Estado de cuota de almacenamiento */}
          {storageInfo && (
            <div
              style={{
                backgroundColor: "#17171d",
                border: "1px solid #2a2a35",
                borderRadius: "8px",
                padding: "12px",
                marginBottom: "20px"
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", marginBottom: "6px" }}>
                <span style={{ color: "#94a3b8" }}>Uso de almacenamiento:</span>
                <span style={{ fontWeight: "600", color: "#fff" }}>
                  {storageInfo.usedMb} MB de {storageInfo.quotaMb} MB ({storageInfo.percentUsed}%)
                </span>
              </div>
              <div style={{ height: "6px", backgroundColor: "#2b2b38", borderRadius: "3px", overflow: "hidden" }}>
                <div
                  style={{
                    height: "100%",
                    width: `${Math.min(100, storageInfo.percentUsed)}%`,
                    backgroundColor: barColor,
                    transition: "width 0.3s ease"
                  }}
                />
              </div>
              <div style={{ fontSize: "11px", color: "#94a3b8", marginTop: "6px", textAlign: "right" }}>
                Disponibles: {storageInfo.availableMb} MB libres
              </div>
            </div>
          )}

          {/* Aviso de Cuota Insuficiente y opción de escape */}
          {hasInsufficientSpace && (
            <div
              style={{
                backgroundColor: "rgba(239, 68, 68, 0.15)",
                border: "1px solid rgba(239, 68, 68, 0.4)",
                borderRadius: "8px",
                padding: "14px",
                marginBottom: "20px"
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "#f87171", fontWeight: "600", fontSize: "13px" }}>
                <span>⚠️</span> Cuota de Almacenamiento Insuficiente
              </div>
              <p style={{ fontSize: "12px", color: "#fca5a5", margin: "6px 0 12px 0", lineHeight: "1.4" }}>
                Este proyecto requiere ~{estimatedMb} MB y solo dispones de {storageInfo?.availableMb} MB libres en tu cuota. Para no perder tu trabajo, puedes exportarlo directamente a tu ordenador:
              </p>
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onExportLocal();
                }}
                style={{
                  width: "100%",
                  padding: "9px 12px",
                  borderRadius: "6px",
                  border: "none",
                  backgroundColor: "#eab308",
                  color: "#000",
                  fontWeight: "700",
                  fontSize: "13px",
                  cursor: "pointer"
                }}
              >
                📥 Exportar a mi PC en su lugar (.cdc2)
              </button>
            </div>
          )}

          {/* Botones de acción */}
          <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
            <button
              type="button"
              disabled={isSaving}
              onClick={onClose}
              style={{
                padding: "9px 16px",
                borderRadius: "6px",
                border: "1px solid #3f3f4e",
                backgroundColor: "transparent",
                color: "#cbd5e1",
                fontSize: "13px",
                cursor: isSaving ? "not-allowed" : "pointer"
              }}
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSaving || !!hasInsufficientSpace}
              style={{
                padding: "9px 20px",
                borderRadius: "6px",
                border: "none",
                backgroundColor: isSaving || hasInsufficientSpace ? "#334155" : "#6366f1",
                color: "#fff",
                fontWeight: "600",
                fontSize: "13px",
                cursor: isSaving ? "wait" : hasInsufficientSpace ? "not-allowed" : "pointer",
                display: "flex",
                alignItems: "center",
                gap: "6px"
              }}
            >
              <span>{isSaving ? "⏳" : "☁️"}</span>
              {isSaving ? "Guardando en la nube..." : "Guardar en la Nube"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
