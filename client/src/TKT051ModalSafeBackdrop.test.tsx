// @vitest-environment happy-dom
import { describe, it, expect, vi, afterEach } from "vitest";
import React, { useRef } from "react";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { useSafeBackdrop, createSafeBackdropProps } from "./utils/modalUtils";
import { SaveCloudModal } from "./components/SaveCloudModal";

describe("TKT-051: Cierre Involuntario de Modales al Arrastrar el Cursor hacia el Backdrop", () => {
  afterEach(() => {
    cleanup();
  });
  // Componente de prueba para useSafeBackdrop
  const TestModalHook: React.FC<{ onClose: () => void }> = ({ onClose }) => {
    const backdropProps = useSafeBackdrop(onClose);
    return (
      <div data-testid="backdrop" {...backdropProps}>
        <div data-testid="container">
          <input data-testid="text-input" defaultValue="Texto de prueba para seleccionar" />
        </div>
      </div>
    );
  };

  // Componente de prueba para createSafeBackdropProps
  const TestModalHelper: React.FC<{ onClose: () => void }> = ({ onClose }) => {
    const isMouseDownRef = useRef(false);
    const backdropProps = createSafeBackdropProps(isMouseDownRef, onClose);
    return (
      <div data-testid="backdrop" {...backdropProps}>
        <div data-testid="container">
          <input data-testid="text-input" defaultValue="Texto de prueba para seleccionar" />
        </div>
      </div>
    );
  };

  describe("useSafeBackdrop hook", () => {
    it("NO cierra el modal si mousedown ocurre dentro del input y mouseup en el backdrop", () => {
      const onClose = vi.fn();
      render(<TestModalHook onClose={onClose} />);

      const backdrop = screen.getByTestId("backdrop");
      const input = screen.getByTestId("text-input");

      // Simula el usuario arrastrando para seleccionar texto en el input y soltando fuera
      fireEvent.mouseDown(input);
      fireEvent.mouseUp(backdrop);

      expect(onClose).not.toHaveBeenCalled();
    });

    it("NO cierra el modal si mousedown ocurre en el backdrop y mouseup dentro del contenedor", () => {
      const onClose = vi.fn();
      render(<TestModalHook onClose={onClose} />);

      const backdrop = screen.getByTestId("backdrop");
      const input = screen.getByTestId("text-input");

      fireEvent.mouseDown(backdrop);
      fireEvent.mouseUp(input);

      expect(onClose).not.toHaveBeenCalled();
    });

    it("SÍ cierra el modal cuando mousedown y mouseup ocurren directamente en el backdrop", () => {
      const onClose = vi.fn();
      render(<TestModalHook onClose={onClose} />);

      const backdrop = screen.getByTestId("backdrop");

      // Clic directo y completo sobre el backdrop
      fireEvent.mouseDown(backdrop);
      fireEvent.mouseUp(backdrop);

      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it("restablece el estado de mousedown tras una selección arrastrada permitiendo clics posteriores", () => {
      const onClose = vi.fn();
      render(<TestModalHook onClose={onClose} />);

      const backdrop = screen.getByTestId("backdrop");
      const input = screen.getByTestId("text-input");

      // Arrastre desde input a backdrop -> no cierra
      fireEvent.mouseDown(input);
      fireEvent.mouseUp(backdrop);
      expect(onClose).not.toHaveBeenCalled();

      // Clic posterior deliberado en backdrop -> sí cierra
      fireEvent.mouseDown(backdrop);
      fireEvent.mouseUp(backdrop);
      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });

  describe("createSafeBackdropProps helper", () => {
    it("NO cierra el modal si mousedown se origina en el contenido interno y mouseup en el backdrop", () => {
      const onClose = vi.fn();
      render(<TestModalHelper onClose={onClose} />);

      const backdrop = screen.getByTestId("backdrop");
      const input = screen.getByTestId("text-input");

      fireEvent.mouseDown(input);
      fireEvent.mouseUp(backdrop);

      expect(onClose).not.toHaveBeenCalled();
    });

    it("SÍ cierra el modal si ambos eventos mousedown y mouseup ocurren sobre el backdrop", () => {
      const onClose = vi.fn();
      render(<TestModalHelper onClose={onClose} />);

      const backdrop = screen.getByTestId("backdrop");

      fireEvent.mouseDown(backdrop);
      fireEvent.mouseUp(backdrop);

      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });

  describe("SaveCloudModal integración real", () => {
    it("no cierra SaveCloudModal al seleccionar el nombre del proyecto y soltar el ratón en el backdrop", () => {
      const onClose = vi.fn();
      render(
        <SaveCloudModal
          isOpen={true}
          onClose={onClose}
          initialName="Mi Baraja Épica"
          cardCount={12}
          documentCount={1}
          storageInfo={{
            quotaMb: 100,
            quotaBytes: 100 * 1024 * 1024,
            usedBytes: 10 * 1024 * 1024,
            usedMb: 10,
            availableBytes: 90 * 1024 * 1024,
            availableMb: 90,
            percentUsed: 10
          }}
          isSaving={false}
          onConfirmSave={vi.fn()}
          onExportLocal={vi.fn()}
        />
      );

      // Obtener el campo de texto del nombre
      const nameInput = screen.getByDisplayValue("Mi Baraja Épica");
      // El backdrop es el contenedor principal con position: fixed
      const backdrop = nameInput.closest("div[style*='position: fixed']")!;
      expect(backdrop).toBeTruthy();

      // Mousedown dentro del input y mouseup en el backdrop (arrastrar para seleccionar)
      fireEvent.mouseDown(nameInput);
      fireEvent.mouseUp(backdrop);

      expect(onClose).not.toHaveBeenCalled();

      // Clic genuino en el backdrop fuera del contenedor modal
      fireEvent.mouseDown(backdrop);
      fireEvent.mouseUp(backdrop);

      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });
});
