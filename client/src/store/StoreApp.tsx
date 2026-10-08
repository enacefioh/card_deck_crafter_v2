import React, { useState, useEffect } from "react";
import type { StoreTemplateCard, StoreTemplateDetail as StoreTemplateDetailType, StorePreviewCard } from "shared";
import { fetchStoreTemplates, fetchStoreTemplateDetail } from "../services/storeService";
import { StoreNavbar } from "./StoreNavbar";
import { StoreCatalog } from "./StoreCatalog";
import { StoreTemplateDetail } from "./StoreTemplateDetail";

interface StoreAppProps {
  onNavigateToEditor?: () => void;
  onOpenTemplateInEditor?: (templateId: string) => void;
}

export const StoreApp: React.FC<StoreAppProps> = ({
  onNavigateToEditor,
  onOpenTemplateInEditor
}) => {
  const [templates, setTemplates] = useState<StoreTemplateCard[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>("");

  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      return params.get("template");
    }
    return null;
  });

  const [templateDetail, setTemplateDetail] = useState<StoreTemplateDetailType | null>(null);
  const [detailLoading, setDetailLoading] = useState<boolean>(false);
  const [previewCard, setPreviewCard] = useState<StorePreviewCard | null>(null);

  // Carga del catálogo
  const loadCatalog = async (query?: string) => {
    try {
      setLoading(true);
      const data = await fetchStoreTemplates(query);
      setTemplates(data);
    } catch (err) {
      console.error("Error al cargar catálogo de la tienda:", err);
    } finally {
      setLoading(false);
    }
  };

  // Carga del detalle
  const loadDetail = async (id: string) => {
    try {
      setDetailLoading(true);
      const data = await fetchStoreTemplateDetail(id);
      setTemplateDetail(data);
    } catch (err) {
      console.error("Error al cargar detalle de la plantilla:", err);
      setTemplateDetail(null);
    } finally {
      setDetailLoading(false);
    }
  };

  // Efecto inicial y escucha de cambios en la búsqueda
  useEffect(() => {
    const timer = setTimeout(() => {
      loadCatalog(searchQuery);
    }, 250);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Cargar detalle si hay un template seleccionado en la URL
  useEffect(() => {
    if (selectedTemplateId) {
      loadDetail(selectedTemplateId);
    } else {
      setTemplateDetail(null);
    }
  }, [selectedTemplateId]);

  // Manejo de historial popstate (flechas adelante/atrás del navegador)
  useEffect(() => {
    const handlePopState = () => {
      const params = new URLSearchParams(window.location.search);
      setSelectedTemplateId(params.get("template"));
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  const handleSelectTemplate = (templateId: string) => {
    setSelectedTemplateId(templateId);
    window.history.pushState({}, "", `/store?template=${encodeURIComponent(templateId)}`);
  };

  const handleBackToCatalog = () => {
    setSelectedTemplateId(null);
    setTemplateDetail(null);
    window.history.pushState({}, "", "/store");
  };

  const handleOpenInEditor = (templateId: string) => {
    if (onOpenTemplateInEditor) {
      onOpenTemplateInEditor(templateId);
    } else {
      window.location.href = `/?openPublicTemplate=${encodeURIComponent(templateId)}`;
    }
  };

  const handleGoToEditor = () => {
    if (onNavigateToEditor) {
      onNavigateToEditor();
    } else {
      window.location.href = "/";
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        backgroundColor: "#0e0e14",
        color: "#f1f5f9",
        display: "flex",
        flexDirection: "column",
        fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
      }}
    >
      <StoreNavbar
        onGoToEditor={handleGoToEditor}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        showSearchBar={!selectedTemplateId}
      />

      <main style={{ flex: 1 }}>
        {selectedTemplateId ? (
          detailLoading ? (
            <div style={{ padding: "80px 24px", textAlign: "center", color: "#64748b" }}>
              Cargando ficha de la plantilla...
            </div>
          ) : templateDetail ? (
            <StoreTemplateDetail
              template={templateDetail}
              onBack={handleBackToCatalog}
              onOpenInEditor={handleOpenInEditor}
              onPreviewCard={(card) => setPreviewCard(card)}
            />
          ) : (
            <div style={{ padding: "80px 24px", textAlign: "center", color: "#ef4444" }}>
              No se pudo encontrar la plantilla solicitada.{" "}
              <button
                type="button"
                onClick={handleBackToCatalog}
                style={{
                  background: "none",
                  border: "none",
                  color: "#38bdf8",
                  textDecoration: "underline",
                  cursor: "pointer",
                  fontSize: "14px"
                }}
              >
                Volver al catálogo
              </button>
            </div>
          )
        ) : (
          <StoreCatalog
            templates={templates}
            loading={loading}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            onSelectTemplate={handleSelectTemplate}
            onOpenInEditor={handleOpenInEditor}
          />
        )}
      </main>

      {/* Visor Modal Grande de Carta / Lightbox */}
      {previewCard && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(0, 0, 0, 0.85)",
            backdropFilter: "blur(6px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
            padding: "20px"
          }}
          onClick={() => setPreviewCard(null)}
        >
          <div
            style={{
              backgroundColor: "#181822",
              border: "1px solid #333348",
              borderRadius: "14px",
              padding: "24px",
              maxWidth: "520px",
              width: "100%",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "16px",
              boxShadow: "0 20px 50px rgba(0,0,0,0.6)"
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ width: "100%", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <h3 style={{ margin: 0, fontSize: "16px", color: "#fff", fontWeight: "700" }}>
                  {previewCard.nombre || "Diseño de Carta"}
                </h3>
                <span style={{ fontSize: "12px", color: "#94a3b8" }}>
                  Dimensiones: {previewCard.anchoMm} × {previewCard.altoMm} mm
                </span>
              </div>
              <button
                type="button"
                onClick={() => setPreviewCard(null)}
                style={{
                  background: "none",
                  border: "none",
                  color: "#94a3b8",
                  fontSize: "20px",
                  cursor: "pointer",
                  padding: "4px"
                }}
              >
                ✕
              </button>
            </div>

            {previewCard.miniatura ? (
              <img
                src={previewCard.miniatura}
                alt={previewCard.nombre}
                style={{
                  maxHeight: "65vh",
                  maxWidth: "100%",
                  objectFit: "contain",
                  borderRadius: "8px",
                  boxShadow: "0 8px 24px rgba(0,0,0,0.5)"
                }}
              />
            ) : (
              <div
                style={{
                  height: "300px",
                  width: "200px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: "#0d0d12",
                  borderRadius: "8px",
                  fontSize: "48px"
                }}
              >
                🎴
              </div>
            )}
          </div>
        </div>
      )}

      {/* Footer sencillo */}
      <footer
        style={{
          borderTop: "1px solid #1f1f2b",
          padding: "20px 24px",
          textAlign: "center",
          fontSize: "12px",
          color: "#64748b"
        }}
      >
        Card Deck Crafter v2 — Tienda Comunitaria de Plantillas de Cartas
      </footer>
    </div>
  );
};
