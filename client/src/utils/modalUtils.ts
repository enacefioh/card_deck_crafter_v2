import React, { useRef } from "react";

/**
 * Hook para gestionar el cierre seguro de un modal al interactuar con el backdrop.
 * Previene el cierre accidental cuando el usuario selecciona texto dentro del modal
 * y suelta el botón del ratón fuera (mouseup sobre el backdrop).
 *
 * El cierre sólo se ejecuta si TANTO mousedown COMO mouseup ocurrieron
 * directamente sobre el elemento backdrop (e.target === e.currentTarget).
 */
export function useSafeBackdrop(onClose?: () => void) {
  const isMouseDownOnBackdropRef = useRef(false);

  const onMouseDown = (e: React.MouseEvent) => {
    isMouseDownOnBackdropRef.current = e.target === e.currentTarget;
  };

  const onMouseUp = (e: React.MouseEvent) => {
    if (isMouseDownOnBackdropRef.current && e.target === e.currentTarget) {
      onClose?.();
    }
    isMouseDownOnBackdropRef.current = false;
  };

  return { onMouseDown, onMouseUp };
}

/**
 * Generador de props para componentes que albergan múltiples modales (ej. App.tsx o AdminPanel.tsx).
 * Usa un ref compartido para rastrear si el mousedown ocurrió en el backdrop.
 */
export function createSafeBackdropProps(
  isMouseDownRef: React.MutableRefObject<boolean>,
  onClose?: () => void
) {
  return {
    onMouseDown: (e: React.MouseEvent) => {
      isMouseDownRef.current = e.target === e.currentTarget;
    },
    onMouseUp: (e: React.MouseEvent) => {
      if (isMouseDownRef.current && e.target === e.currentTarget) {
        onClose?.();
      }
      isMouseDownRef.current = false;
    },
  };
}
