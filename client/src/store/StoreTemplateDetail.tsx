import React from "react";
import type { StoreTemplateDetail as StoreTemplateDetailType, StorePreviewCard } from "shared";
import { getStoreTemplateDownloadUrl } from "../services/storeService";

interface StoreTemplateDetailProps {
  template: StoreTemplateDetailType;
  onBack: () => void;
  onOpenInEditor: (templateId: string) => void;
  onPreviewCard: (card: StorePreviewCard) => void;
}

export const StoreTemplateDetail: React.FC<StoreTemplateDetailProps> = ({
  template,
  onBack,
  onOpenInEditor,
  onPreviewCard
}) => {
  const downloadUrl = getStoreTemplateDownloadUrl(template.id);
  const previewCards = template.previewCards || [];

  return (
    <div style={{ maxWidth: "1080px", margin: "0 auto", padding: "28px 24px" }}>
      {/* Botón Volver */}
      <div style={{ marginBottom: "20px" }}>
        <button
          type="button"
          onClick={onBack}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "8px",
            background: "none",
            border: "none",
            color: "#94a3b8",
            fontSize: "14px",
            fontWeight: "600",
            cursor: "pointer",
            padding: "4px 8px",
            borderRadius: "4px",
            transition: "color 0.15s"
          }}
          onMouseEnter={(e) => (e.currentTarget.style.color = "#fff")}
          onMouseLeave={(e) => (e.currentTarget.style.color = "#94a3b8")}
        >
          <span>←</span> Volver al Catálogo
        </button>
      </div>

      {/* Cabecera Estilo App Store / Google Play */}
      <div
        style={{
          backgroundColor: "#1a1a24",
          border: "1px solid #282836",
          borderRadius: "14px",
          padding: "32px",
          display: "flex",
          gap: "28px",
          alignItems: "flex-start",
          marginBottom: "28px",
          boxShadow: "0 6px 20px rgba(0,0,0,0.3)",
          flexWrap: "wrap"
        }}
      >
        {/* Carátula / Icono grande de plantilla */}
        <div
          style={{
            width: "160px",
            height: "220px",
            backgroundColor: "#101016",
            borderRadius: "10px",
            border: "1px solid #333344",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            overflow: "hidden",
            boxShadow: "0 10px 24px rgba(0,0,0,0.4)",
            flexShrink: 0
          }}
        >
          {(() => {
            const coverImage = template.thumbnail || (previewCards.length > 0 && previewCards[0].miniatura);
            return coverImage ? (
              <img
                src={coverImage}
                alt={template.name}
                style={{
                  width: "auto",
                  height: "200px",
                  maxWidth: "90%",
                  objectFit: "contain",
                  borderRadius: "6px"
                }}
              />
            ) : (
              <div style={{ fontSize: "64px" }}>🎴</div>
            );
          })()}
        </div>

        {/* Metadatos y Acciones */}
        <div style={{ flex: 1, minWidth: "280px", display: "flex", flexDirection: "column", gap: "14px" }}>
          <div>
            <h1 style={{ margin: "0 0 6px 0", fontSize: "26px", fontWeight: "800", color: "#fff", letterSpacing: "-0.5px" }}>
              {template.name}
            </h1>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
              <span
                style={{
                  fontSize: "13px",
                  fontWeight: "600",
                  color: "#a5b4fc",
                  backgroundColor: "rgba(99, 102, 241, 0.15)",
                  padding: "3px 10px",
                  borderRadius: "20px",
                  border: "1px solid rgba(99, 102, 241, 0.3)"
                }}
              >
                👤 Creado por @{template.authorName || "anónimo"}
              </span>
              <span style={{ fontSize: "12px", color: "#64748b" }}>
                Actualizado el {new Date(template.updatedAt || template.createdAt).toLocaleDateString()}
              </span>
            </div>
          </div>

          {/* Badges de especificaciones */}
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
            {template.dimensions && (
              <span
                style={{
                  fontSize: "12px",
                  fontWeight: "600",
                  backgroundColor: "#20202d",
                  color: "#38bdf8",
                  border: "1px solid #2e2e42",
                  padding: "4px 10px",
                  borderRadius: "6px"
                }}
              >
                📐 Formato: {template.dimensions.anchoMm} × {template.dimensions.altoMm} mm
              </span>
            )}
            <span
              style={{
                fontSize: "12px",
                fontWeight: "600",
                backgroundColor: "#20202d",
                color: "#e2e8f0",
                border: "1px solid #2e2e42",
                padding: "4px 10px",
                borderRadius: "6px"
              }}
            >
              📄 {template.documentCount} {template.documentCount === 1 ? "documento" : "documentos"}
            </span>
            <span
              style={{
                fontSize: "12px",
                fontWeight: "600",
                backgroundColor: "#20202d",
                color: "#cbd5e1",
                border: "1px solid #2e2e42",
                padding: "4px 10px",
                borderRadius: "6px"
              }}
            >
              🎴 {template.templateCount} {template.templateCount === 1 ? "diseño de carta" : "diseños de carta"}
            </span>
            <span
              style={{
                fontSize: "12px",
                fontWeight: "600",
                backgroundColor: "#20202d",
                color: "#94a3b8",
                border: "1px solid #2e2e42",
                padding: "4px 10px",
                borderRadius: "6px"
              }}
            >
              💾 {((template.fileSizeBytes || 0) / (1024 * 1024)).toFixed(2)} MB
            </span>
          </div>

          {/* Botones de acción principales */}
          <div style={{ display: "flex", gap: "12px", marginTop: "10px", flexWrap: "wrap" }}>
            <button
              type="button"
              onClick={() => onOpenInEditor(template.id)}
              style={{
                padding: "12px 24px",
                backgroundColor: "#6366f1",
                color: "#fff",
                border: "none",
                borderRadius: "8px",
                fontSize: "14px",
                fontWeight: "700",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "8px",
                boxShadow: "0 4px 14px rgba(99, 102, 241, 0.4)",
                transition: "transform 0.15s, background-color 0.15s"
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = "#4f46e5";
                e.currentTarget.style.transform = "scale(1.02)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = "#6366f1";
                e.currentTarget.style.transform = "scale(1)";
              }}
            >
              <span>🚀</span> Abrir en Card Deck Crafter
            </button>

            <a
              href={downloadUrl}
              download
              style={{
                padding: "12px 20px",
                backgroundColor: "#22222e",
                color: "#cbd5e1",
                border: "1px solid #38384b",
                borderRadius: "8px",
                fontSize: "13px",
                fontWeight: "600",
                textDecoration: "none",
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
                transition: "all 0.15s"
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = "#2b2b3b";
                e.currentTarget.style.color = "#fff";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = "#22222e";
                e.currentTarget.style.color = "#cbd5e1";
              }}
            >
              <span>⬇️</span> Descargar archivo (.cdc2t)
            </a>
          </div>
        </div>
      </div>

      {/* Sección: Galería de Diseños / Capturas (Estilo App Store Screenshots) */}
      {previewCards.length > 0 && (
        <div
          style={{
            backgroundColor: "#1a1a24",
            border: "1px solid #282836",
            borderRadius: "14px",
            padding: "26px 30px",
            marginBottom: "28px"
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px", flexWrap: "wrap", gap: "8px" }}>
            <h2 style={{ margin: 0, fontSize: "17px", fontWeight: "700", color: "#fff" }}>
              🎴 Plantillas de Cartas Incluidas ({previewCards.length})
            </h2>
            <span style={{ fontSize: "12px", color: "#94a3b8" }}>
              Haz clic en cualquier plantilla para previsualizar en detalle
            </span>
          </div>

          <div
            style={{
              display: "flex",
              gap: "16px",
              overflowX: "auto",
              paddingBottom: "10px",
              scrollbarWidth: "thin"
            }}
          >
            {previewCards.map((card, idx) => (
              <div
                key={idx}
                onClick={() => onPreviewCard(card)}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  backgroundColor: "#13131a",
                  border: "1px solid #2b2b3c",
                  borderRadius: "8px",
                  padding: "10px",
                  minWidth: "120px",
                  maxWidth: "140px",
                  cursor: "pointer",
                  transition: "transform 0.15s, border-color 0.15s",
                  flexShrink: 0
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = "translateY(-3px)";
                  e.currentTarget.style.borderColor = "#6366f1";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = "translateY(0)";
                  e.currentTarget.style.borderColor = "#2b2b3c";
                }}
              >
                {card.miniatura ? (
                  <img
                    src={card.miniatura}
                    alt={card.nombre}
                    style={{
                      width: "100px",
                      height: "140px",
                      objectFit: "contain",
                      backgroundColor: "#0a0a0e",
                      borderRadius: "5px",
                      boxShadow: "0 4px 10px rgba(0,0,0,0.5)"
                    }}
                  />
                ) : (
                  <div
                    style={{
                      width: "100px",
                      height: "140px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      backgroundColor: "#0a0a0e",
                      borderRadius: "5px",
                      fontSize: "32px",
                      color: "#475569"
                    }}
                  >
                    🎴
                  </div>
                )}
                <span
                  style={{
                    fontSize: "12px",
                    fontWeight: "600",
                    color: "#f1f5f9",
                    marginTop: "8px",
                    textAlign: "center",
                    width: "100%",
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis"
                  }}
                  title={card.nombre}
                >
                  {card.nombre || "Diseño"}
                </span>
                <span style={{ fontSize: "10px", color: "#94a3b8", marginTop: "2px" }}>
                  {card.anchoMm}×{card.altoMm} mm
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Sección: Descripción y Notas del Creador */}
      <div
        style={{
          backgroundColor: "#1a1a24",
          border: "1px solid #282836",
          borderRadius: "14px",
          padding: "28px 32px"
        }}
      >
        <h2 style={{ margin: "0 0 16px 0", fontSize: "17px", fontWeight: "700", color: "#fff" }}>
          Descripción y Notas del Creador
        </h2>
        <div
          style={{
            fontSize: "14px",
            lineHeight: "1.7",
            color: "#cbd5e1",
            whiteSpace: "pre-line"
          }}
        >
          {template.description || "El autor no ha proporcionado una descripción detallada para esta plantilla."}
        </div>
      </div>
    </div>
  );
};
