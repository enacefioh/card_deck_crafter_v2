import React, { useState } from "react";
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

  const [activeApiTab, setActiveApiTab] = useState<"schema" | "render">("schema");
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const origin = typeof window !== "undefined" && window.location?.origin
    ? window.location.origin
    : "http://localhost:3000";

  const schemaUrl = `${origin}/api/v1/templates/${template.id}/schema`;
  const renderUrl = `${origin}/api/v1/cards/render`;
  const sampleDesignId = previewCards.length > 0 && previewCards[0].id ? previewCards[0].id : "template_design_id";

  const schemaCurl = `curl -X GET "${schemaUrl}"`;

  const renderPayload = JSON.stringify(
    {
      templateId: template.id,
      cardDesignId: sampleDesignId,
      fields: {
        titulo: "Ejemplo de Carta",
        descripcion: "Generada programáticamente vía API REST"
      },
      images: {
        ilustracion: "https://images.unsplash.com/photo-1579783902614-a3fb3927b675?w=500"
      }
    },
    null,
    2
  );

  const renderCurl = `curl -X POST "${renderUrl}" \\
  -H "Content-Type: application/json" \\
  -d '${renderPayload.replace(/'/g, "'\\''")}' \\
  --output carta.png`;

  const handleCopy = (text: string, key: string) => {
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(text).catch(() => {});
    }
    setCopiedKey(key);
    setTimeout(() => {
      setCopiedKey((prev) => (prev === key ? null : prev));
    }, 2000);
  };

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

      {/* Sección: Integración con Agentes de IA / API REST (SRS-077) */}
      <div
        data-testid="api-integration-section"
        style={{
          backgroundColor: "#1a1a24",
          border: "1px solid #282836",
          borderRadius: "14px",
          padding: "28px 32px",
          marginTop: "28px"
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "12px", marginBottom: "8px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <span style={{ fontSize: "22px" }}>🔌</span>
            <h2 style={{ margin: 0, fontSize: "18px", fontWeight: "700", color: "#fff" }}>
              Integración con Agentes de IA / API REST
            </h2>
            <span
              style={{
                fontSize: "11px",
                fontWeight: "700",
                textTransform: "uppercase",
                backgroundColor: "rgba(99, 102, 241, 0.2)",
                color: "#a5b4fc",
                border: "1px solid rgba(99, 102, 241, 0.35)",
                padding: "2px 8px",
                borderRadius: "12px",
                letterSpacing: "0.5px"
              }}
            >
              API v1
            </span>
          </div>

          <button
            type="button"
            data-testid="open-dev-docs-btn"
            onClick={() => {
              if (typeof window !== "undefined") {
                window.history.pushState({}, "", "/developers");
                window.dispatchEvent(new PopStateEvent("popstate"));
              }
            }}
            style={{
              backgroundColor: "#20202e",
              color: "#38bdf8",
              border: "1px solid #33334d",
              borderRadius: "6px",
              padding: "6px 12px",
              fontSize: "12px",
              fontWeight: "600",
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              transition: "all 0.15s"
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = "#272738";
              e.currentTarget.style.color = "#fff";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = "#20202e";
              e.currentTarget.style.color = "#38bdf8";
            }}
          >
            <span>📖</span> Ver Guía Completa de la API & Ejemplos
          </button>
        </div>

        <p style={{ margin: "0 0 20px 0", fontSize: "13px", color: "#94a3b8", lineHeight: "1.6" }}>
          Permite a agentes inteligentes (OpenAI, Claude, Gemini, scripts locales) inspeccionar este diseño y renderizar cartas automáticamente en imágenes PNG de 300 DPI con Chromium headless.
        </p>

        {/* Selector de pestañas */}
        <div style={{ display: "flex", gap: "10px", marginBottom: "20px", borderBottom: "1px solid #282836", paddingBottom: "12px" }}>
          <button
            type="button"
            data-testid="tab-schema"
            onClick={() => setActiveApiTab("schema")}
            style={{
              padding: "8px 16px",
              borderRadius: "8px",
              border: activeApiTab === "schema" ? "none" : "1px solid #2e2e42",
              backgroundColor: activeApiTab === "schema" ? "#6366f1" : "#20202d",
              color: activeApiTab === "schema" ? "#fff" : "#94a3b8",
              fontSize: "13px",
              fontWeight: "600",
              cursor: "pointer",
              transition: "all 0.15s"
            }}
          >
            📋 1. Obtener Esquema (GET)
          </button>
          <button
            type="button"
            data-testid="tab-render"
            onClick={() => setActiveApiTab("render")}
            style={{
              padding: "8px 16px",
              borderRadius: "8px",
              border: activeApiTab === "render" ? "none" : "1px solid #2e2e42",
              backgroundColor: activeApiTab === "render" ? "#6366f1" : "#20202d",
              color: activeApiTab === "render" ? "#fff" : "#94a3b8",
              fontSize: "13px",
              fontWeight: "600",
              cursor: "pointer",
              transition: "all 0.15s"
            }}
          >
            🎨 2. Renderizar Carta en PNG (POST)
          </button>
        </div>

        {/* Contenido Pestaña 1: Esquema */}
        {activeApiTab === "schema" && (
          <div data-testid="schema-panel" style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            <div>
              <div style={{ fontSize: "13px", fontWeight: "600", color: "#cbd5e1", marginBottom: "6px" }}>
                Endpoint de Inspección de Esquema:
              </div>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  backgroundColor: "#111118",
                  border: "1px solid #28283a",
                  borderRadius: "8px",
                  padding: "8px 12px",
                  gap: "10px",
                  overflowX: "auto"
                }}
              >
                <span
                  style={{
                    backgroundColor: "#065f46",
                    color: "#34d399",
                    fontSize: "11px",
                    fontWeight: "800",
                    padding: "3px 8px",
                    borderRadius: "4px"
                  }}
                >
                  GET
                </span>
                <code style={{ color: "#e2e8f0", fontSize: "13px", flex: 1, fontFamily: "monospace" }}>
                  {schemaUrl}
                </code>
                <button
                  type="button"
                  data-testid="copy-schema-url-btn"
                  onClick={() => handleCopy(schemaUrl, "schema-url")}
                  style={{
                    backgroundColor: copiedKey === "schema-url" ? "#10b981" : "#28283a",
                    color: "#fff",
                    border: "none",
                    borderRadius: "6px",
                    padding: "6px 12px",
                    fontSize: "12px",
                    fontWeight: "600",
                    cursor: "pointer",
                    transition: "background-color 0.15s",
                    flexShrink: 0
                  }}
                >
                  {copiedKey === "schema-url" ? "✓ ¡Copiado!" : "📋 Copiar URL"}
                </button>
              </div>
            </div>

            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                <span style={{ fontSize: "13px", fontWeight: "600", color: "#cbd5e1" }}>
                  Comando de Ejemplo (cURL):
                </span>
                <button
                  type="button"
                  data-testid="copy-schema-curl-btn"
                  onClick={() => handleCopy(schemaCurl, "schema-curl")}
                  style={{
                    backgroundColor: copiedKey === "schema-curl" ? "#10b981" : "#28283a",
                    color: "#fff",
                    border: "none",
                    borderRadius: "6px",
                    padding: "4px 10px",
                    fontSize: "11px",
                    fontWeight: "600",
                    cursor: "pointer",
                    transition: "background-color 0.15s"
                  }}
                >
                  {copiedKey === "schema-curl" ? "✓ ¡Copiado!" : "📋 Copiar cURL"}
                </button>
              </div>
              <pre
                style={{
                  margin: 0,
                  backgroundColor: "#111118",
                  border: "1px solid #28283a",
                  borderRadius: "8px",
                  padding: "14px",
                  color: "#38bdf8",
                  fontSize: "12px",
                  fontFamily: "monospace",
                  overflowX: "auto"
                }}
              >
                {schemaCurl}
              </pre>
            </div>
            <div style={{ fontSize: "12px", color: "#64748b", lineHeight: "1.5" }}>
              💡 Este endpoint devuelve un JSON con todos los diseños de carta incluidos, sus dimensiones (mm) y la definición de campos expuestos (texto, imágenes, números, etc.) que tu agente puede rellenar.
            </div>
          </div>
        )}

        {/* Contenido Pestaña 2: Renderizado */}
        {activeApiTab === "render" && (
          <div data-testid="render-panel" style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            <div>
              <div style={{ fontSize: "13px", fontWeight: "600", color: "#cbd5e1", marginBottom: "6px" }}>
                Endpoint de Renderizado PNG:
              </div>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  backgroundColor: "#111118",
                  border: "1px solid #28283a",
                  borderRadius: "8px",
                  padding: "8px 12px",
                  gap: "10px",
                  overflowX: "auto"
                }}
              >
                <span
                  style={{
                    backgroundColor: "#1e3a8a",
                    color: "#60a5fa",
                    fontSize: "11px",
                    fontWeight: "800",
                    padding: "3px 8px",
                    borderRadius: "4px"
                  }}
                >
                  POST
                </span>
                <code style={{ color: "#e2e8f0", fontSize: "13px", flex: 1, fontFamily: "monospace" }}>
                  {renderUrl}
                </code>
                <button
                  type="button"
                  data-testid="copy-render-url-btn"
                  onClick={() => handleCopy(renderUrl, "render-url")}
                  style={{
                    backgroundColor: copiedKey === "render-url" ? "#10b981" : "#28283a",
                    color: "#fff",
                    border: "none",
                    borderRadius: "6px",
                    padding: "6px 12px",
                    fontSize: "12px",
                    fontWeight: "600",
                    cursor: "pointer",
                    transition: "background-color 0.15s",
                    flexShrink: 0
                  }}
                >
                  {copiedKey === "render-url" ? "✓ ¡Copiado!" : "📋 Copiar URL"}
                </button>
              </div>
            </div>

            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                <span style={{ fontSize: "13px", fontWeight: "600", color: "#cbd5e1" }}>
                  Comando cURL de Ejemplo con Payload JSON:
                </span>
                <button
                  type="button"
                  data-testid="copy-render-curl-btn"
                  onClick={() => handleCopy(renderCurl, "render-curl")}
                  style={{
                    backgroundColor: copiedKey === "render-curl" ? "#10b981" : "#28283a",
                    color: "#fff",
                    border: "none",
                    borderRadius: "6px",
                    padding: "4px 10px",
                    fontSize: "11px",
                    fontWeight: "600",
                    cursor: "pointer",
                    transition: "background-color 0.15s"
                  }}
                >
                  {copiedKey === "render-curl" ? "✓ ¡Copiado!" : "📋 Copiar cURL"}
                </button>
              </div>
              <pre
                style={{
                  margin: 0,
                  backgroundColor: "#111118",
                  border: "1px solid #28283a",
                  borderRadius: "8px",
                  padding: "14px",
                  color: "#38bdf8",
                  fontSize: "12px",
                  fontFamily: "monospace",
                  overflowX: "auto",
                  whiteSpace: "pre-wrap"
                }}
              >
                {renderCurl}
              </pre>
            </div>
            <div style={{ fontSize: "12px", color: "#64748b", lineHeight: "1.5" }}>
              🖼️ El servidor procesará la carta cargando automáticamente las fuentes y símbolos de la plantilla comunitaria, descargando las imágenes de URLs o Base64 y devolviendo la imagen PNG a 300 DPI lista para imprimir.
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
