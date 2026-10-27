import React, { useEffect, useRef } from "react";
import "./CardContextMenu.css";

export interface CardContextMenuProps {
  x: number;
  y: number;
  selectedCount: number;
  puedeMoverArriba: boolean;
  puedeMoverAbajo: boolean;
  onVerDetalles: () => void;
  onDuplicar: () => void;
  onMoverArriba: () => void;
  onMoverAbajo: () => void;
  onEliminar: () => void;
  onClose: () => void;
}

export const CardContextMenu: React.FC<CardContextMenuProps> = ({
  x,
  y,
  selectedCount,
  puedeMoverArriba,
  puedeMoverAbajo,
  onVerDetalles,
  onDuplicar,
  onMoverArriba,
  onMoverAbajo,
  onEliminar,
  onClose,
}) => {
  const menuRef = useRef<HTMLDivElement>(null);

  // Ajuste de límites contra bordes del viewport
  const menuWidth = 220;
  const menuHeight = 210;
  const windowWidth = typeof window !== "undefined" ? window.innerWidth : 1200;
  const windowHeight = typeof window !== "undefined" ? window.innerHeight : 800;

  const adjustedX = Math.max(8, Math.min(x, windowWidth - menuWidth - 8));
  const adjustedY = Math.max(8, Math.min(y, windowHeight - menuHeight - 8));

  useEffect(() => {
    const handleMouseDown = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    const handleScroll = () => {
      onClose();
    };

    document.addEventListener("mousedown", handleMouseDown);
    document.addEventListener("keydown", handleKeyDown);
    window.addEventListener("scroll", handleScroll, true);

    return () => {
      document.removeEventListener("mousedown", handleMouseDown);
      document.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("scroll", handleScroll, true);
    };
  }, [onClose]);

  const handleAction = (action: () => void) => {
    action();
    onClose();
  };

  return (
    <div
      ref={menuRef}
      className="card-context-menu"
      style={{ left: `${adjustedX}px`, top: `${adjustedY}px` }}
      role="menu"
      aria-label="Menú contextual de carta"
      onContextMenu={(e) => e.preventDefault()}
    >
      <button
        type="button"
        className="menu-item"
        onClick={() => handleAction(onVerDetalles)}
        disabled={selectedCount !== 1}
        title={selectedCount === 1 ? "Ver detalles de la carta seleccionada" : "Selecciona una única carta para ver detalles"}
      >
        <span className="menu-item-icon">🔍</span>
        <span>Ver Detalles</span>
      </button>

      <div className="menu-separator" />

      <button
        type="button"
        className="menu-item"
        onClick={() => handleAction(onDuplicar)}
        disabled={selectedCount === 0}
      >
        <span className="menu-item-icon">👥</span>
        <span>Duplicar</span>
        <span className="menu-item-shortcut">Ctrl+D</span>
      </button>

      <button
        type="button"
        className="menu-item"
        onClick={() => handleAction(onMoverArriba)}
        disabled={!puedeMoverArriba}
      >
        <span className="menu-item-icon">⬆️</span>
        <span>Mover Arriba</span>
        <span className="menu-item-shortcut">Alt+↑</span>
      </button>

      <button
        type="button"
        className="menu-item"
        onClick={() => handleAction(onMoverAbajo)}
        disabled={!puedeMoverAbajo}
      >
        <span className="menu-item-icon">⬇️</span>
        <span>Mover Abajo</span>
        <span className="menu-item-shortcut">Alt+↓</span>
      </button>

      <div className="menu-separator" />

      <button
        type="button"
        className="menu-item menu-item-danger"
        style={{ color: "var(--text-danger)" }}
        onClick={() => handleAction(onEliminar)}
        disabled={selectedCount === 0}
      >
        <span className="menu-item-icon">🗑️</span>
        <span>Eliminar</span>
        <span className="menu-item-shortcut">Supr</span>
      </button>
    </div>
  );
};

export default CardContextMenu;
