import React from "react";
import type { StoreTemplateCard } from "shared";

interface StoreCatalogProps {
  templates: StoreTemplateCard[];
  loading: boolean;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  onSelectTemplate: (templateId: string) => void;
  onOpenInEditor: (templateId: string) => void;
}

export const StoreCatalog: React.FC<StoreCatalogProps> = ({
  templates,
  loading,
  searchQuery,
  onSearchChange,
  onSelectTemplate,
  onOpenInEditor
}) => {
  return (
    <div style={{ maxWidth: "1280px", margin: "0 auto", padding: "32px 24px" }}>
      {/* Banner Hero */}
      <div
        style={{
          background: "linear-gradient(135deg, rgba(99, 102, 241, 0.15) 0%, rgba(244, 63, 94, 0.15) 100%)",
          border: "1px solid rgba(255, 255, 255, 0.08)",
          borderRadius: "14px",
          padding: "36px 32px",
          marginBottom: "32px",
          display: "flex",
          flexDirection: "column",
          gap: "12px"
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <span style={{ fontSize: "28px" }}>✨</span>
          <h1 style={{ margin: 0, fontSize: "26px", fontWeight: "800", color: "#fff", letterSpacing: "-0.5px" }}>
            Plantillas Comunitarias
          </h1>
        </div>
        <p style={{ margin: 0, fontSize: "14px", color: "#cbd5e1", maxWidth: "680px", lineHeight: "1.6" }}>
          Descubre, descarga y comienza a maquetar barajas completas creadas por otros diseñadores. 
          Puedes abrir cualquier plantilla en el editor con un solo clic o inspeccionar su ficha detallada.
        </p>

        {/* Buscador Integrado en Hero */}
        <div style={{ marginTop: "12px", maxWidth: "560px", position: "relative" }}>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="🔍 Buscar plantillas por nombre, temática, autor..."
            style={{
              width: "100%",
              padding: "11px 16px",
              borderRadius: "8px",
              border: "1px solid #47475c",
              backgroundColor: "#181822",
              color: "#fff",
              fontSize: "14px",
              outline: "none",
              boxSizing: "border-box",
              boxShadow: "0 4px 12px rgba(0,0,0,0.3)"
            }}
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => onSearchChange("")}
              style={{
                position: "absolute",
                right: "12px",
                top: "50%",
                transform: "translateY(-50%)",
                background: "none",
                border: "none",
                color: "#94a3b8",
                cursor: "pointer",
                fontSize: "13px"
              }}
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Barra de Estadísticas y Resultados */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
        <div style={{ fontSize: "14px", color: "#94a3b8", fontWeight: "600" }}>
          {loading ? (
            "Cargando plantillas..."
          ) : (
            <span>
              Mostrando <strong style={{ color: "#fff" }}>{templates.length}</strong> {templates.length === 1 ? "plantilla disponible" : "plantillas disponibles"}
              {searchQuery && <span> para "{searchQuery}"</span>}
            </span>
          )}
        </div>
      </div>

      {/* Grid de Plantillas */}
      {loading ? (
        <div
          style={{
            backgroundColor: "#1a1a24",
            border: "1px solid #282836",
            borderRadius: "12px",
            padding: "60px 20px",
            textAlign: "center",
            color: "#64748b",
            fontSize: "15px"
          }}
        >
          Cargando catálogo comunitario...
        </div>
      ) : templates.length === 0 ? (
        <div
          style={{
            backgroundColor: "#1a1a24",
            border: "1px solid #282836",
            borderRadius: "12px",
            padding: "60px 20px",
            textAlign: "center",
            color: "#64748b"
          }}
        >
          <div style={{ fontSize: "36px", marginBottom: "12px" }}>🔍</div>
          <div style={{ fontSize: "16px", color: "#e2e8f0", fontWeight: "600", marginBottom: "6px" }}>
            No se encontraron plantillas
          </div>
          <p style={{ margin: 0, fontSize: "13px", color: "#94a3b8" }}>
            {searchQuery
              ? `No hay resultados para "${searchQuery}". Prueba con otros términos de búsqueda.`
              : "Aún no hay plantillas públicas aprobadas en la tienda."}
          </p>
        </div>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(290px, 1fr))",
            gap: "22px"
          }}
        >
          {templates.map((tmpl) => {
            return (
              <div
                key={tmpl.id}
                onClick={() => onSelectTemplate(tmpl.id)}
                style={{
                  backgroundColor: "#1a1a24",
                  border: "1px solid #292938",
                  borderRadius: "12px",
                  overflow: "hidden",
                  display: "flex",
                  flexDirection: "column",
                  cursor: "pointer",
                  transition: "transform 0.18s, border-color 0.18s, box-shadow 0.18s",
                  boxShadow: "0 4px 12px rgba(0,0,0,0.2)"
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = "translateY(-4px)";
                  e.currentTarget.style.borderColor = "#6366f1";
                  e.currentTarget.style.boxShadow = "0 8px 24px rgba(99, 102, 241, 0.25)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = "translateY(0)";
                  e.currentTarget.style.borderColor = "#292938";
                  e.currentTarget.style.boxShadow = "0 4px 12px rgba(0,0,0,0.2)";
                }}
              >
                {/* Carátula / Vista Previa */}
                <div
                  style={{
                    height: "180px",
                    backgroundColor: "#121218",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    position: "relative",
                    overflow: "hidden",
                    borderBottom: "1px solid #262634"
                  }}
                >
                  {(() => {
                    const cardCover = tmpl.thumbnail || (tmpl.previewCards && tmpl.previewCards[0]?.miniatura);
                    return cardCover ? (
                      <img
                        src={cardCover}
                        alt={tmpl.name}
                        style={{
                          height: "155px",
                          width: "auto",
                          maxWidth: "85%",
                          objectFit: "contain",
                          borderRadius: "5px",
                          boxShadow: "0 6px 16px rgba(0,0,0,0.4)"
                        }}
                      />
                    ) : (
                      <div style={{ fontSize: "52px", opacity: 0.5 }}>🎴</div>
                    );
                  })()}

                  {/* Badge de autor flotante */}
                  <div
                    style={{
                      position: "absolute",
                      bottom: "10px",
                      left: "12px",
                      backgroundColor: "rgba(18, 18, 24, 0.85)",
                      backdropFilter: "blur(4px)",
                      padding: "3px 8px",
                      borderRadius: "6px",
                      fontSize: "11px",
                      fontWeight: "600",
                      color: "#a5b4fc",
                      border: "1px solid rgba(99, 102, 241, 0.3)"
                    }}
                  >
                    👤 @{tmpl.authorName || "anónimo"}
                  </div>
                </div>

                {/* Contenido de la tarjeta */}
                <div style={{ padding: "16px", display: "flex", flexDirection: "column", flex: 1, gap: "10px" }}>
                  <div>
                    <h3
                      style={{
                        margin: 0,
                        fontSize: "16px",
                        fontWeight: "700",
                        color: "#fff",
                        lineHeight: "1.3"
                      }}
                    >
                      {tmpl.name}
                    </h3>
                    <p
                      style={{
                        margin: "6px 0 0 0",
                        fontSize: "12px",
                        color: "#94a3b8",
                        lineHeight: "1.45",
                        display: "-webkit-box",
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: "vertical",
                        overflow: "hidden"
                      }}
                    >
                      {tmpl.description || "Sin descripción proporcionada."}
                    </p>
                  </div>

                  {/* Badges técnicos */}
                  <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", marginTop: "auto", paddingTop: "8px" }}>
                    {tmpl.dimensions && (
                      <span
                        style={{
                          fontSize: "10px",
                          fontWeight: "600",
                          backgroundColor: "#20202d",
                          color: "#38bdf8",
                          border: "1px solid #2e2e42",
                          padding: "2px 6px",
                          borderRadius: "4px"
                        }}
                      >
                        📐 {tmpl.dimensions.anchoMm}×{tmpl.dimensions.altoMm}mm
                      </span>
                    )}
                    <span
                      style={{
                        fontSize: "10px",
                        fontWeight: "600",
                        backgroundColor: "#20202d",
                        color: "#cbd5e1",
                        border: "1px solid #2e2e42",
                        padding: "2px 6px",
                        borderRadius: "4px"
                      }}
                    >
                      🎴 {tmpl.templateCount} {tmpl.templateCount === 1 ? "diseño" : "diseños"}
                    </span>
                    <span
                      style={{
                        fontSize: "10px",
                        fontWeight: "600",
                        backgroundColor: "#20202d",
                        color: "#94a3b8",
                        border: "1px solid #2e2e42",
                        padding: "2px 6px",
                        borderRadius: "4px"
                      }}
                    >
                      💾 {((tmpl.fileSizeBytes || 0) / (1024 * 1024)).toFixed(2)} MB
                    </span>
                  </div>

                  {/* Botones de acción */}
                  <div style={{ display: "flex", gap: "8px", marginTop: "6px", borderTop: "1px solid #262634", paddingTop: "12px" }}>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectTemplate(tmpl.id);
                      }}
                      style={{
                        flex: 1,
                        padding: "7px 10px",
                        backgroundColor: "#2b2b36",
                        color: "#e2e8f0",
                        border: "1px solid #3f3f4e",
                        borderRadius: "6px",
                        fontSize: "12px",
                        fontWeight: "600",
                        cursor: "pointer"
                      }}
                    >
                      Ver Ficha
                    </button>
                    <button
                      type="button"
                      title="Abrir directamente en Card Deck Crafter"
                      onClick={(e) => {
                        e.stopPropagation();
                        onOpenInEditor(tmpl.id);
                      }}
                      style={{
                        padding: "7px 12px",
                        backgroundColor: "#6366f1",
                        color: "#fff",
                        border: "none",
                        borderRadius: "6px",
                        fontSize: "12px",
                        fontWeight: "600",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        gap: "4px",
                        boxShadow: "0 2px 8px rgba(99, 102, 241, 0.3)"
                      }}
                    >
                      <span>🚀</span> Abrir
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
