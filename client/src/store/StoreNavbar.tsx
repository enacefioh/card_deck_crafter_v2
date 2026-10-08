import React from "react";

interface StoreNavbarProps {
  onGoToEditor: () => void;
  searchQuery?: string;
  onSearchChange?: (q: string) => void;
  showSearchBar?: boolean;
}

export const StoreNavbar: React.FC<StoreNavbarProps> = ({
  onGoToEditor,
  searchQuery = "",
  onSearchChange,
  showSearchBar = false
}) => {
  return (
    <header
      style={{
        height: "56px",
        backgroundColor: "#16161d",
        borderBottom: "1px solid #282834",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0 28px",
        position: "sticky",
        top: 0,
        zIndex: 100,
        boxShadow: "0 2px 8px rgba(0,0,0,0.3)"
      }}
    >
      {/* Brand / Logo */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "10px",
          cursor: "pointer",
          userSelect: "none"
        }}
        onClick={() => {
          if (window.location.search) {
            window.history.pushState({}, "", "/store");
            window.dispatchEvent(new PopStateEvent("popstate"));
          }
        }}
      >
        <span style={{ fontSize: "24px" }}>🏪</span>
        <div>
          <span style={{ fontSize: "15px", fontWeight: "700", color: "#fff", letterSpacing: "0.2px" }}>
            Card Deck Crafter
          </span>
          <span
            style={{
              marginLeft: "8px",
              fontSize: "11px",
              fontWeight: "600",
              backgroundColor: "rgba(244, 63, 94, 0.2)",
              color: "#fb7185",
              border: "1px solid rgba(244, 63, 94, 0.4)",
              padding: "2px 7px",
              borderRadius: "4px"
            }}
          >
            Tienda Comunitaria
          </span>
        </div>
      </div>

      {/* Buscador central si está activo */}
      {showSearchBar && onSearchChange && (
        <div style={{ flex: 1, maxWidth: "420px", margin: "0 24px", position: "relative" }}>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="🔍 Buscar por nombre, descripción o autor..."
            style={{
              width: "100%",
              padding: "8px 14px",
              borderRadius: "20px",
              border: "1px solid #38384a",
              backgroundColor: "#20202a",
              color: "#fff",
              fontSize: "13px",
              outline: "none",
              boxSizing: "border-box"
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
                fontSize: "12px"
              }}
            >
              ✕
            </button>
          )}
        </div>
      )}

      {/* Botón de retorno al Editor */}
      <button
        type="button"
        onClick={onGoToEditor}
        style={{
          display: "flex",
          alignItems: "center",
          gap: "8px",
          backgroundColor: "#2b2b36",
          color: "#e2e8f0",
          border: "1px solid #3f3f4e",
          borderRadius: "6px",
          padding: "7px 14px",
          fontSize: "13px",
          fontWeight: "600",
          cursor: "pointer",
          transition: "all 0.15s"
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = "#353544";
          e.currentTarget.style.color = "#fff";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = "#2b2b36";
          e.currentTarget.style.color = "#e2e8f0";
        }}
      >
        <span>🎴</span> Ir al Editor de Cartas
      </button>
    </header>
  );
};
